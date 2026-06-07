/* =====================================================================
 * simulation/jet-gpu.js — shared GPU buoyant-jet engine (Three.js + GLSL)
 *
 * One engine used by BOTH the 3D model viewer (viewer3d.js) and the Flow
 * Intuition panel (flow-sim.js). The parcels are rendered as short COMET
 * STREAKS — each particle is a 2-vertex line segment (tail → head) whose
 * endpoints are computed entirely in the vertex shader from a per-particle
 * seed + time + the physics uniforms. The CPU only updates uniforms (cheap,
 * good for mobile WebAR / 60 FPS). The trailing segment follows the flow, so
 * in the recirculation zones the streaks bend around the vortices and reveal
 * the circulation — not just a scatter of endpoint dots.
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
import { CMAPS_GLSL } from "./colormaps.js";

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
attribute float aKind;   // 1.0 = through-flow jet core (exits outlet), 0.0 = recirculation
attribute float aEnd;    // 0.0 = streak tail, 1.0 = streak head

uniform float uTime;
uniform float uVelocity;  // 0..1 jet velocity
uniform float uDensity;   // 0..1 density ratio (Δρ)
uniform float uDeltaT;    // 0..1 temperature difference (ΔT)
uniform float uPixelRatio;
uniform vec3  uTank;      // w,h,d
uniform float uTrail;     // comet-streak length, in phase units (head − tail)
uniform float uHasField;  // 1 = advect the REAL CFD velocity texture
uniform sampler2D uField; // RG = velocity (encoded 0..1), B = T(norm), A = speed(norm)
uniform float uFieldUmax; // m/s scale for decoding the velocity

varying float vTemp;
varying float vDensity;
varying float vSpeed;
varying float vEnd;       // 0 tail .. 1 head, for the comet fade
varying float vLife;      // per-parcel brightness/flicker (real path; 1.0 for model)

#define ADV_STEPS 52
${SNOISE}

/* Position of a parcel at a given phase (0..1 along its trajectory). The same
 * function gives the streak's head (phase) and tail (phase − uTrail), so the
 * segment lies along the real flow. temp/dens/spd come back through out-params. */
vec3 parcelPos(float phase, out float temp, out float dens, out float spd) {
  float halfW = uTank.x * 0.5;
  float halfH = uTank.y * 0.5;
  float halfD = uTank.z * 0.5;
  vec3 P;

  if (uHasField > 0.5) {
    // ===== advect along the REAL CFD velocity field (texture) =====
    // Integrate from the parcel's seed for phase·STEPS steps; head and tail use
    // different step counts, so the drawn segment trails along the pathline.
    float ph = phase;
    vec2 p = vec2((aSeed - 0.5) * uTank.x * 0.82, (aSeed2 - 0.5) * uTank.y * 0.82);
    float zc = (fract(aSeed * 13.0) - 0.5) * uTank.z * 0.6;
    float ds = uTank.x / float(ADV_STEPS) * 1.25;
    float Tn = 0.5; spd = 0.0;
    for (int i = 0; i < ADV_STEPS; i++) {
      if (float(i) > ph * float(ADV_STEPS)) break;
      vec2 uv = clamp(vec2(p.x / uTank.x + 0.5, p.y / uTank.y + 0.5), 0.003, 0.997);
      vec4 s = texture2D(uField, uv);
      vec2 vel = (s.rg * 2.0 - 1.0) * uFieldUmax;
      float sp = length(vel);
      Tn = s.b; spd = min(1.0, sp / max(uFieldUmax, 1e-5));
      if (sp < 1e-6) break;
      p += (vel / sp) * ds;
      if (abs(p.x) > halfW || abs(p.y) > halfH) break;
    }
    P = vec3(p, zc);
    temp = Tn;
    // fade in/out over the streak's life, AND fade where the real field barely
    // moves (the stratified dead zones) so the view shows FLOW — the jet + the
    // two vortices — instead of a static tangle of dashes sitting in still fluid.
    dens = smoothstep(0.0, 0.05, ph) * smoothstep(1.0, 0.88, ph);
    dens *= mix(0.08, 1.0, smoothstep(0.05, 0.34, spd));
    // (4) VOLUMETRIC weave: corkscrew gently through depth so orbiting the view
    // reveals a 3D structure instead of a flat symmetry-plane sheet.
    P.z += 0.12 * uTank.z * sin(ph * 6.2831853 + aSeed * 6.2831853);
    // (3) small time-varying organic wobble — a RENDER aesthetic only; the
    // large-scale circulation still comes from the data. Calmer in the slow
    // stratified zones (scaled by speed) so they don't shimmer.
    float wamp = (0.016 + 0.014 * spd) * uTank.y;
    vec3 wp = P * 3.0 + vec3(0.0, 0.0, uTime * 0.3);
    P += vec3(snoise(wp), snoise(wp + 19.1), snoise(wp + 43.7)) * wamp;
  } else {
    // ===== analytic laminar model (Flow panel, slider-driven) =====
    float Ri = (0.25 + uDensity * 0.9) * (0.30 + uDeltaT * 0.9) / (0.18 + uVelocity * 1.2);
    float buoy = clamp(Ri, 0.0, 1.6);
    if (aKind > 0.5) {
      // through-flow jet core: inlet → outlet
      float p = phase;
      float xext = uTank.x + 0.55;
      P.x = -halfW + p * xext;
      float bow = buoy * 0.12 * sin(p * 3.14159);
      P.y = (bow + (aSeed2 - 0.5) * 0.05) * halfH;
      P.z = (aSeed2 - 0.5) * uTank.z * 0.14;
      P.x = min(P.x, halfW + 0.5);
      P.y = clamp(P.y, -halfH * 0.99, halfH * 0.99);
      P.z = clamp(P.z, -halfD * 0.99, halfD * 0.99);
      temp = clamp((1.0 - p * 0.5) * (0.6 + 0.4 * uDeltaT) + 0.15, 0.0, 1.0);
      dens = smoothstep(0.0, 0.05, p) * smoothstep(1.0, 0.78, p);
      spd = 0.6 + 0.4 * (1.0 - p);
    } else {
      // entrained recirculation → one of the two vortices
      float ph = phase;
      float reach = mix(0.30, 0.94, uVelocity);
      float feedX = -halfW + reach * uTank.x;
      float pJet  = mix(0.20, 0.48, uVelocity);
      if (ph < pJet) {
        float u = ph / pJet;
        P.x = -halfW + u * (feedX + halfW);
        P.y = buoy * 0.14 * u * u * halfH;
        P.z = (aSeed2 - 0.5) * uTank.z * 0.10;
      } else {
        float u = (ph - pJet) / (1.0 - pJet);
        float s = aLane;
        float cyBase = (0.30 + 0.10 * uVelocity) * halfH;
        float cy = (s > 0.0) ? cyBase * (1.0 + 0.6 * buoy) : -cyBase * (1.0 - 0.4 * buoy);
        vec2  c = vec2(feedX, cy);
        float rad = (0.16 + 0.18 * aSeed2) * halfH;
        float ang = u * 6.2831853 * (s > 0.0 ? 1.0 : -1.0) + aSeed * 6.2831853;
        P.x = c.x + cos(ang) * rad * 1.2;
        P.y = c.y + sin(ang) * rad;
        P.y += buoy * 0.10 * halfH * u;
        P.z = (aSeed2 - 0.5) * uTank.z * 0.72;
      }
      float hN = clamp(P.y / halfH * 0.5 + 0.5, 0.0, 1.0);
      P.z *= (1.0 + 1.1 * hN);
      P.x = clamp(P.x, -halfW * 0.99, halfW * 0.99);
      P.y = clamp(P.y, -halfH * 0.99, halfH * 0.99);
      P.z = clamp(P.z, -halfD * 0.99, halfD * 0.99);
      float heightT = clamp(P.y / halfH * 0.5 + 0.5, 0.0, 1.0);
      float coreT = (ph < pJet) ? (1.0 - (ph / pJet) * 0.4) : 0.0;
      temp = clamp(mix(heightT, 1.0, coreT * 0.7) * (0.55 + 0.45 * uDeltaT) + 0.10 * uDeltaT, 0.0, 1.0);
      dens = smoothstep(0.0, 0.06, ph) * smoothstep(1.0, 0.85, ph);
      spd = (ph < pJet) ? (0.75 - 0.3 * (ph / pJet)) : (0.22 + 0.12 * aSeed2);
    }
    // small laminar wobble (model only — the real-field path stays true to data)
    float dStream = clamp((P.x + halfW) / uTank.x, 0.0, 1.0);
    float amp = (0.010 + 0.026 * dStream) * halfH;
    vec3 np = P * 2.2 + vec3(0.0, 0.0, uTime * 0.22);
    P += vec3(snoise(np), snoise(np + 17.3), snoise(np + 41.7)) * amp;
  }
  return P;
}

void main() {
  // base phase (head) per path; the tail trails uTrail behind, clamped at the
  // birth point so a wrapped parcel never draws a streak across the whole tank.
  float rate = 0.05 + uVelocity * 0.10;
  float basePhase;
  float life = 1.0;
  if (uHasField > 0.5) {
    // (1) DESYNC: each parcel gets its own advance rate + offset, so they no
    // longer march in lockstep (which reads as a conveyor belt / robotic).
    float pr = 0.085 + 0.085 * fract(aSeed * 7.31);
    basePhase = fract(uTime * pr + aSeed * 1.7 + aSeed2 * 0.31 + aLane * 0.13);
    // (2) per-parcel brightness variation + a slow flicker → the field looks
    // alive and uneven instead of a uniform mechanical sheet.
    life = (0.78 + 0.22 * sin(uTime * 1.7 + aSeed * 27.0)) * (0.82 + 0.36 * fract(aSeed * 3.7));
  } else if (aKind > 0.5) {
    basePhase = fract(uTime * rate * 1.7 + aSeed);
  } else {
    basePhase = fract(uTime * rate + aSeed);
  }
  // (2) vary the streak length per parcel on the real path → less uniform
  float tr = uTrail;
  if (uHasField > 0.5) tr *= (0.55 + 0.9 * fract(aSeed2 * 5.7));
  float phaseTail = max(0.0, basePhase - tr);
  float phase = mix(phaseTail, basePhase, aEnd);

  float temp, dens, spd;
  vec3 P = parcelPos(phase, temp, dens, spd);

  vTemp = temp;
  vDensity = dens;
  vSpeed = spd;
  vEnd = aEnd;
  vLife = life;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(P, 1.0);
}`;

const FRAG = /* glsl */ `
precision highp float;
${CMAPS_GLSL}
varying float vTemp;
varying float vDensity;
varying float vSpeed;
varying float vEnd;
varying float vLife;
uniform float uMode;
uniform float uAlpha;   // per-instance opacity (viewer dims its haze; Flow panel = 1)

void main(){
  // scalar for the active field: 0 temp, 1 velocity, 2 density(=1-T), 3 buoyancy(=T)
  float s = (uMode < 0.5) ? vTemp : (uMode < 1.5) ? vSpeed : (uMode < 2.5) ? (1.0 - vTemp) : vTemp;
  vec3 col = cfdColor(uMode, s);
  // comet fade: bright at the head (vEnd→1), fading out along the tail (vEnd→0)
  float streak = mix(0.10, 1.0, vEnd);
  float alpha = vDensity * 0.6 * uAlpha * streak * vLife;
  if (alpha < 0.003) discard;
  // brighter where the scalar is high (emissive feel under additive blending) +
  // a faint cool underglow so thin streaks stay visible in the cold colormap end
  gl_FragColor = vec4(col * (0.7 + 0.6 * s) + vec3(0.04, 0.09, 0.16) * streak, alpha);
}`;

let _dummyTex = null;
function dummyTexture() {
  if (!_dummyTex) {
    _dummyTex = new THREE.DataTexture(new Uint8Array([128, 128, 128, 255]), 1, 1, THREE.RGBAFormat);
    _dummyTex.needsUpdate = true;
  }
  return _dummyTex;
}

/* ---------------------------------------------------------------------
 * createJetField — build the GPU comet-streak plume. Each particle is one
 * 2-vertex line segment (tail → head). When opts.fieldTex (a velocity
 * texture) is given, the parcels advect along the REAL CFD field; otherwise
 * they follow the analytic laminar model (slider-driven).
 * Returns { object, update, setParams, setMode, setField, setAlpha, setTrail,
 *           setCount, maxCount, dispose }.
 * ------------------------------------------------------------------- */
export function createJetField(opts = {}) {
  const MAX = opts.count || 5200;       // particles (each = 2 vertices)
  const N = MAX * 2;                     // vertices
  const tank = opts.tank || { w: 1.6, h: 1.6, d: 1.0 };

  const seed = new Float32Array(N);
  const seed2 = new Float32Array(N);
  const lane = new Float32Array(N);
  const kind = new Float32Array(N);     // ~30% through-flow jet core, rest recirculate
  const end = new Float32Array(N);      // 0 = tail, 1 = head (alternating per pair)
  const pos = new Float32Array(N * 3);  // dummy (positions come from the shader)
  for (let i = 0; i < MAX; i++) {
    const s = Math.random(), s2 = Math.random();
    const ln = Math.random() < 0.5 ? -1 : 1;
    const kn = Math.random() < 0.3 ? 1 : 0;
    for (let e = 0; e < 2; e++) {
      const j = i * 2 + e;
      seed[j] = s; seed2[j] = s2; lane[j] = ln; kind[j] = kn; end[j] = e;
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
  geo.setAttribute("aSeed2", new THREE.BufferAttribute(seed2, 1));
  geo.setAttribute("aLane", new THREE.BufferAttribute(lane, 1));
  geo.setAttribute("aKind", new THREE.BufferAttribute(kind, 1));
  geo.setAttribute("aEnd", new THREE.BufferAttribute(end, 1));
  geo.setDrawRange(0, N);
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 4);

  const uniforms = {
    uTime: { value: Math.random() * 50 },
    uVelocity: { value: 0.5 },
    uDensity: { value: 0.5 },
    uDeltaT: { value: 0.5 },
    uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
    uTank: { value: new THREE.Vector3(tank.w, tank.h, tank.d) },
    uTrail: { value: opts.trail != null ? opts.trail : 0.08 },
    uMode: { value: 0 },   // 0 temp · 1 velocity · 2 density · 3 buoyancy
    uHasField: { value: opts.fieldTex ? 1 : 0 },
    uField: { value: opts.fieldTex || dummyTexture() },
    uFieldUmax: { value: opts.fieldUmax || 0.03 },
    uAlpha: { value: opts.alpha != null ? opts.alpha : 1.0 },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const streaks = new THREE.LineSegments(geo, material);
  streaks.frustumCulled = false;

  return {
    object: streaks,
    maxCount: MAX,
    update(dt) { uniforms.uTime.value += dt; },
    setParams(p) {
      if (p.velocity != null) uniforms.uVelocity.value = p.velocity;
      if (p.densityRatio != null) uniforms.uDensity.value = p.densityRatio;
      if (p.deltaT != null) uniforms.uDeltaT.value = p.deltaT;
    },
    setMode(m) { uniforms.uMode.value = m; },
    // swap the advection source live: a velocity texture (→ real-field path) or
    // null (→ analytic slider model). Used by the viewer's Real/Model toggle.
    setField(tex, umax) {
      uniforms.uHasField.value = tex ? 1 : 0;
      uniforms.uField.value = tex || dummyTexture();
      if (umax != null) uniforms.uFieldUmax.value = umax;
    },
    setAlpha(a) { uniforms.uAlpha.value = a; },
    setTrail(t) { uniforms.uTrail.value = t; },
    // n is in PARTICLES; the geometry holds 2 vertices per particle.
    setCount(n) {
      const c = Math.max(400, Math.min(MAX, n | 0));
      geo.setDrawRange(0, c * 2);
    },
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
