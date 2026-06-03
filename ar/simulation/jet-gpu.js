/* =====================================================================
 * simulation/jet-gpu.js — shared GPU buoyant-jet engine (Three.js + GLSL)
 *
 * One engine used by BOTH the 3D model viewer (viewer3d.js) and the Flow
 * Intuition panel (flow-sim.js). A THREE.Points cloud whose positions are
 * computed entirely in the vertex shader from a per-particle seed + time +
 * the three physics uniforms — so the CPU only updates uniforms (cheap, good
 * for mobile WebAR / 60 FPS).
 *
 * Physics, kept HONEST to the test case (laminar, Re ≈ 100 — NOT turbulent):
 *   • a smooth jet enters at the nozzle and is entrained into TWO counter-
 *     rotating recirculation vortices (the signature of this flow),
 *   • buoyancy (Richardson/Froude) bends the plume upward — stronger and
 *     closer to the nozzle when ΔT·Δρ is high,
 *   • momentum (jet velocity) projects the plume further horizontally,
 *   • 3D simplex noise adds a small, laminar organic wobble — it does NOT
 *     break the jet into turbulence.
 * Temperature (293–333 K) is drawn with a perceptual Inferno colormap;
 * density-based opacity + additive blending give a soft volumetric glow.
 * ===================================================================== */
import * as THREE from "three";

/* ---- GLSL: Ashima/Gustavson 3D simplex noise (snoise) ---------------- */
const SNOISE = /* glsl */ `
vec3 mod289(vec3 x){ return x - floor(x*(1.0/289.0))*289.0; }
vec4 mod289(vec4 x){ return x - floor(x*(1.0/289.0))*289.0; }
vec4 permute(vec4 x){ return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314*r; }
float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute( permute( permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
          + i.y + vec4(0.0, i1.y, i2.y, 1.0))
          + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}`;

const VERT = /* glsl */ `
attribute float aSeed;   // identity / phase offset
attribute float aSeed2;  // radius / depth / size variation
attribute float aLane;   // -1.0 lower vortex, +1.0 upper vortex

uniform float uTime;
uniform float uVelocity;  // 0..1 jet velocity
uniform float uDensity;   // 0..1 density ratio (Δρ)
uniform float uDeltaT;    // 0..1 temperature difference (ΔT)
uniform float uSize;
uniform float uPixelRatio;
uniform vec3  uTank;      // w,h,d

varying float vTemp;
varying float vDensity;

${SNOISE}

void main() {
  float halfW = uTank.x * 0.5;
  float halfH = uTank.y * 0.5;
  float halfD = uTank.z * 0.5;

  // looping lifetime phase (faster jet → faster turnover)
  float rate = 0.05 + uVelocity * 0.10;
  float ph = fract(uTime * rate + aSeed);

  // Richardson/Froude-style buoyancy vs momentum balance
  float Ri = (0.25 + uDensity * 0.9) * (0.30 + uDeltaT * 0.9) / (0.18 + uVelocity * 1.2);
  float buoy = clamp(Ri, 0.0, 1.6);

  // momentum reach: how far the jet penetrates before feeding the vortices
  float reach = mix(0.30, 0.94, uVelocity);
  float feedX = -halfW + reach * uTank.x;          // vortex-centre x
  float pJet  = mix(0.20, 0.48, uVelocity);        // straight-jet fraction

  vec3 P;
  if (ph < pJet) {
    // --- jet core: nozzle → vortex feed, slight buoyant rise downstream ---
    float u = ph / pJet;
    P.x = -halfW + u * (feedX + halfW);
    P.y = buoy * 0.14 * u * u * halfH;             // bends up sooner if buoyant
    P.z = (aSeed2 - 0.5) * uTank.z * 0.10;         // thin laminar core
  } else {
    // --- entrained into one of the two recirculation vortices ---
    float u = (ph - pJet) / (1.0 - pJet);
    float s = aLane;                                // -1 lower / +1 upper
    float cyBase = (0.30 + 0.10 * uVelocity) * halfH;
    float cy = (s > 0.0) ? cyBase * (1.0 + 0.6 * buoy) : -cyBase * (1.0 - 0.4 * buoy);
    vec2  c = vec2(feedX, cy);
    float rad = (0.16 + 0.18 * aSeed2) * halfH;
    float ang = u * 6.2831853 * (s > 0.0 ? 1.0 : -1.0) + aSeed * 6.2831853;
    P.x = c.x + cos(ang) * rad * 1.2;
    P.y = c.y + sin(ang) * rad;
    P.y += buoy * 0.10 * halfH * u;                // overall upward drift
    P.z = (aSeed2 - 0.5) * uTank.z * 0.72;         // fills depth → reads 3D
  }

  // keep inside the tank
  P.x = clamp(P.x, -halfW * 0.99, halfW * 0.99);
  P.y = clamp(P.y, -halfH * 0.99, halfH * 0.99);
  P.z = clamp(P.z, -halfD * 0.99, halfD * 0.99);

  // small laminar wobble (grows mildly downstream, capped — NOT turbulence)
  float dStream = clamp((P.x + halfW) / uTank.x, 0.0, 1.0);
  float amp = (0.010 + 0.028 * dStream) * halfH;
  vec3 np = P * 2.2 + vec3(0.0, 0.0, uTime * 0.22);
  vec3 wob = vec3(snoise(np), snoise(np + 17.3), snoise(np + 41.7));
  P += wob * amp;

  // temperature: stratification (height) + hot jet core; ΔT sets contrast
  float heightT = clamp(P.y / halfH * 0.5 + 0.5, 0.0, 1.0);
  float coreT = (ph < pJet) ? (1.0 - (ph / pJet) * 0.4) : 0.0;
  vTemp = clamp(mix(heightT, 1.0, coreT * 0.7) * (0.55 + 0.45 * uDeltaT) + 0.10 * uDeltaT, 0.0, 1.0);

  // density / life fade (fade in at birth, out at death)
  vDensity = smoothstep(0.0, 0.06, ph) * smoothstep(1.0, 0.85, ph);

  vec4 mv = modelViewMatrix * vec4(P, 1.0);
  gl_Position = projectionMatrix * mv;
  float sizeSeed = 0.7 + aSeed2 * 0.9;
  gl_PointSize = uSize * uPixelRatio * sizeSeed / max(0.1, -mv.z);
}`;

const FRAG = /* glsl */ `
precision highp float;
varying float vTemp;
varying float vDensity;

// perceptual Inferno colormap (polynomial fit, GPU-cheap, no texture)
vec3 inferno(float t){
  const vec3 c0 = vec3(0.0002189403691192265, 0.001651004631001012, -0.01948089843709184);
  const vec3 c1 = vec3(0.1065134194856116, 0.5639564367884091, 3.932712388889277);
  const vec3 c2 = vec3(11.60249308247187, -3.972853965665698, -15.9423941062914);
  const vec3 c3 = vec3(-41.70399613139459, 17.43639888205313, 44.35414519872813);
  const vec3 c4 = vec3(77.162935699427, -33.40235894210092, -81.80730925738993);
  const vec3 c5 = vec3(-71.31942824499214, 32.62606426397723, 73.20951985803202);
  const vec3 c6 = vec3(25.13112622477341, -12.24266895238567, -23.07032500287172);
  return c0+t*(c1+t*(c2+t*(c3+t*(c4+t*(c5+t*c6)))));
}

void main(){
  vec2 q = gl_PointCoord - 0.5;
  float r = dot(q, q) * 4.0;                 // 0 centre .. 1 edge
  float a = smoothstep(1.0, 0.0, r);
  a *= a;                                     // soft, diffuse edge
  vec3 col = inferno(clamp(vTemp, 0.0, 1.0));
  float alpha = a * vDensity * 0.6;
  if (alpha < 0.003) discard;
  // hotter fluid glows brighter (emissive feel under additive blending)
  gl_FragColor = vec4(col * (0.75 + 0.7 * vTemp), alpha);
}`;

/* ---------------------------------------------------------------------
 * createJetField — build the GPU particle plume.
 * Returns { object, update, setParams, setCount, maxCount, dispose }.
 * ------------------------------------------------------------------- */
export function createJetField(opts = {}) {
  const MAX = opts.count || 5200;
  const tank = opts.tank || { w: 1.6, h: 1.6, d: 1.0 };

  const seed = new Float32Array(MAX);
  const seed2 = new Float32Array(MAX);
  const lane = new Float32Array(MAX);
  const pos = new Float32Array(MAX * 3); // dummy (positions come from the shader)
  for (let i = 0; i < MAX; i++) {
    seed[i] = Math.random();
    seed2[i] = Math.random();
    lane[i] = Math.random() < 0.5 ? -1 : 1;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
  geo.setAttribute("aSeed2", new THREE.BufferAttribute(seed2, 1));
  geo.setAttribute("aLane", new THREE.BufferAttribute(lane, 1));
  geo.setDrawRange(0, MAX);
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 4);

  const uniforms = {
    uTime: { value: Math.random() * 50 },
    uVelocity: { value: 0.5 },
    uDensity: { value: 0.5 },
    uDeltaT: { value: 0.5 },
    uSize: { value: opts.size || 26 },
    uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
    uTank: { value: new THREE.Vector3(tank.w, tank.h, tank.d) },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geo, material);
  points.frustumCulled = false;

  return {
    object: points,
    maxCount: MAX,
    update(dt) { uniforms.uTime.value += dt; },
    setParams(p) {
      if (p.velocity != null) uniforms.uVelocity.value = p.velocity;
      if (p.densityRatio != null) uniforms.uDensity.value = p.densityRatio;
      if (p.deltaT != null) uniforms.uDeltaT.value = p.deltaT;
    },
    setCount(n) { geo.setDrawRange(0, Math.max(400, Math.min(MAX, n | 0))); },
    dispose() { geo.dispose(); material.dispose(); },
  };
}

/* Frame-rate governor: drops the particle count if the device can't keep up
 * (mobile LOD), and recovers it when there is headroom. Call it each frame. */
export function makeLOD(jet, opts = {}) {
  const target = opts.target || 50;   // below ~45 fps we shed particles
  const min = opts.min || 1400;
  let ema = 1 / 60, frames = 0, count = jet.maxCount;
  return function (dt) {
    ema = ema * 0.9 + Math.min(dt, 0.1) * 0.1;
    if (++frames < 30) return;
    frames = 0;
    const fps = 1 / ema;
    if (fps < target - 5 && count > min) {
      count = Math.max(min, (count * 0.85) | 0); jet.setCount(count);
    } else if (fps > target + 8 && count < jet.maxCount) {
      count = Math.min(jet.maxCount, (count * 1.12) | 0); jet.setCount(count);
    }
  };
}
