/* =====================================================================
 * simulation/streamlines.js — animated laminar streamlines (Feature #1).
 *
 * Seeds a grid of points across the tank and integrates the flow BOTH ways
 * (forward + backward) — the standard CFD way to reveal recirculation — so
 * the two counter-rotating vortices and the jet read clearly. A travelling
 * brightness pulse animates the flow direction; colour follows the selected
 * field with a perceptual colormap (no rainbow).
 *
 * The field is either the REAL CFD solver field (cfd-field.js, passed in as
 * opts.field) or the analytic model (jet-field.js, slider-driven, used by the
 * Flow panel). Smooth + steady → strictly laminar either way.
 * ===================================================================== */
import * as THREE from "three";
import { makeField } from "./jet-field.js";
import { CMAPS_GLSL } from "./colormaps.js";

const VERT = /* glsl */ `
attribute float aArc; attribute float aTemp; attribute float aSpeed;
varying float vArc; varying float vT; varying float vS;
void main(){
  vArc = aArc; vT = aTemp; vS = aSpeed;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const FRAG = /* glsl */ `
precision highp float;
${CMAPS_GLSL}
varying float vArc; varying float vT; varying float vS;
uniform float uTime; uniform float uMode;
void main(){
  float s = (uMode < 0.5) ? vT : (uMode < 1.5) ? vS : (uMode < 2.5) ? (1.0 - vT) : vT;
  vec3 col = cfdColor(uMode, s);
  // a travelling brightness pulse rides the line so flow direction reads; the
  // floor is kept high so the lines themselves (the two vortices) stay bold.
  float wave = 0.55 + 0.45 * pow(0.5 + 0.5 * sin((vArc * 7.0 - uTime * 1.1) * 6.2831853), 2.0);
  // keep a cool structural underglow so the LINES stay visible even in the cold
  // (near-black) end of the colormap — otherwise the lower vortex disappears.
  col = col * (0.55 + 0.55 * wave) + vec3(0.07, 0.14, 0.24) * (0.5 + 0.5 * wave);
  gl_FragColor = vec4(col, 0.92);   // bold structure: the streamlines ARE the vortices
}`;

export function createStreamlines(opts = {}) {
  const tank = opts.tank || { w: 1.6, h: 1.6, d: 1.0 };
  let params = Object.assign({ velocity: 0.5, densityRatio: 0.5, deltaT: 0.5 }, opts.params || {});
  let field = opts.field || null;     // real CFD sampler, or null → model
  let nS = opts.seeds || 9;           // seed grid is nS × (nS-1) — denser = clearer vortices
  let nZ = opts.nZ || 2;
  const steps = opts.steps || 220;

  const geo = new THREE.BufferGeometry();
  const material = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uMode: { value: 0 } },
    vertexShader: VERT, fragmentShader: FRAG,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const lines = new THREE.LineSegments(geo, material);
  lines.frustumCulled = false;

  function trace(f, x0, y0, z, sgn, ds, hw, hh) {
    let x = x0, y = y0;
    const pts = [[x, y, z]];
    for (let k = 0; k < steps; k++) {
      const vel = f.velocity(x, y);
      if (vel.speed < 1e-7) break;
      const inv = (ds * sgn) / vel.speed;
      x += vel.vx * inv; y += vel.vy * inv;
      if (x < -hw || x > hw || y < -hh || y > hh) break;
      pts.push([x, y, z]);
    }
    return pts;
  }

  function build() {
    const f = field || makeField(params, tank);
    const norm = f.umax || 0.95;
    const hw = tank.w / 2, hh = tank.h / 2;
    const ds = tank.w / 170;
    const pos = [], arc = [], tmp = [], spd = [];

    for (let iz = 0; iz < nZ; iz++) {
      const z = nZ > 1 ? ((iz / (nZ - 1)) - 0.5) * tank.d * 0.4 : 0;
      for (let sy = 0; sy < nS - 1; sy++) {
        const y0 = ((sy + 0.5) / (nS - 1) - 0.5) * tank.h * 0.82;
        for (let sx = 0; sx < nS; sx++) {
          const x0 = ((sx + 0.5) / nS - 0.5) * tank.w * 0.82;
          const back = trace(f, x0, y0, z, -1, ds, hw, hh).reverse();
          const fwd = trace(f, x0, y0, z, 1, ds, hw, hh);
          const pts = back.concat(fwd.slice(1));
          const M = pts.length;
          if (M < 4) continue;
          for (let k = 0; k < M - 1; k++) {
            for (const idx of [k, k + 1]) {
              const p = pts[idx];
              pos.push(p[0], p[1], p[2]);
              arc.push(idx / (M - 1));
              tmp.push(f.temperature(p[0], p[1]));
              const vel = f.velocity(p[0], p[1]);
              spd.push(Math.min(1, vel.speed / norm));
            }
          }
        }
      }
    }

    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute("aArc", new THREE.Float32BufferAttribute(arc, 1));
    geo.setAttribute("aTemp", new THREE.Float32BufferAttribute(tmp, 1));
    geo.setAttribute("aSpeed", new THREE.Float32BufferAttribute(spd, 1));
    geo.computeBoundingSphere();
  }
  build();

  return {
    object: lines,
    update(dt) { material.uniforms.uTime.value += dt; },
    setField(f) { field = f; build(); },
    setParams(p) { Object.assign(params, p); if (!field) build(); },
    setMode(m) { material.uniforms.uMode.value = m; },
    setDensity(level) { nS = [4, 5, 7][level] || 5; build(); },
    dispose() { geo.dispose(); material.dispose(); },
  };
}
