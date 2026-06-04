/* =====================================================================
 * simulation/streamlines.js — animated laminar streamlines (Feature #1).
 *
 * Integrates the shared analytic field (jet-field.js) from a band of inlet
 * seeds spread across the jet height AND the tank depth, so the streamlines
 * form a 3D set that reveals the flow direction, the buoyant curving and the
 * two recirculation vortices. A travelling brightness pulse along each line
 * shows the flow motion. Coloured by the selected scientific field with a
 * perceptual colormap (no rainbow). Smooth + steady → strictly laminar.
 * ===================================================================== */
import * as THREE from "three";
import { makeField } from "./jet-field.js";
import { CMAPS_GLSL } from "./colormaps.js";

const VERT = /* glsl */ `
attribute float aArc;    // 0..1 along the streamline
attribute float aTemp;   // field temperature 0..1
attribute float aSpeed;  // field velocity magnitude 0..1
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
  // scalar for the active mode: 0 temp, 1 velocity, 2 density(=1-T), 3 buoyancy(=T)
  float s = (uMode < 0.5) ? vT : (uMode < 1.5) ? vS : (uMode < 2.5) ? (1.0 - vT) : vT;
  vec3 col = cfdColor(uMode, s);
  // travelling brightness pulse along arc-length → direction + animation
  float wave = 0.4 + 0.6 * pow(0.5 + 0.5 * sin((vArc * 7.0 - uTime * 1.1) * 6.2831853), 2.0);
  gl_FragColor = vec4(col * wave, 0.9);
}`;

export function createStreamlines(opts = {}) {
  const tank = opts.tank || { w: 1.6, h: 1.6, d: 1.0 };
  let params = Object.assign({ velocity: 0.5, densityRatio: 0.5, deltaT: 0.5 }, opts.params || {});
  let nY = opts.nY || 5;     // seeds across the jet height
  let nZ = opts.nZ || 4;     // seeds across the depth (gives the 3D set)
  const steps = opts.steps || 150;

  const geo = new THREE.BufferGeometry();
  const material = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uMode: { value: 0 } },
    vertexShader: VERT, fragmentShader: FRAG,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const lines = new THREE.LineSegments(geo, material);
  lines.frustumCulled = false;

  function build() {
    const field = makeField(params, tank);
    const halfW = tank.w / 2, halfH = tank.h / 2, halfD = tank.d / 2;
    const ds = (tank.w / steps) * 1.5;
    const pos = [], arc = [], tmp = [], spd = [];

    for (let iz = 0; iz < nZ; iz++) {
      const z = nZ > 1 ? ((iz / (nZ - 1)) - 0.5) * tank.d * 0.7 : 0;
      for (let iy = 0; iy < nY; iy++) {
        const fy = nY > 1 ? (iy / (nY - 1)) - 0.5 : 0;
        let x = -halfW + 0.012 * tank.w;
        let y = fy * 0.16 * halfH;                     // thin laminar inlet band
        const pts = [];
        for (let k = 0; k < steps; k++) {
          pts.push([x, y, z]);
          const { vx, vy, speed } = field.velocity(x, y);
          if (speed < 1e-5) break;
          const inv = ds / (speed + 1e-6);
          x += vx * inv; y += vy * inv;
          if (x > halfW + 0.42 || y > halfH * 1.02 || y < -halfH * 1.02) { pts.push([x, y, z]); break; }
        }
        const M = pts.length;
        for (let k = 0; k < M - 1; k++) {
          for (const idx of [k, k + 1]) {
            const p = pts[idx];
            pos.push(p[0], p[1], p[2]);
            arc.push(idx / (M - 1));
            tmp.push(field.temperature(p[0], p[1]));
            spd.push(Math.min(1, field.velocity(p[0], p[1]).speed / 0.95));
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
    setParams(p) { Object.assign(params, p); build(); },
    setMode(m) { material.uniforms.uMode.value = m; },
    setDensity(level) {            // 0 sparse .. 2 dense
      nY = [3, 5, 8][level] || 5;
      nZ = [3, 4, 5][level] || 4;
      build();
    },
    dispose() { geo.dispose(); material.dispose(); },
  };
}
