/* =====================================================================
 * simulation/glyphs.js — velocity glyphs (Feature #5).
 *
 * A sparse grid of arrow glyphs (InstancedMesh) sampling the shared
 * analytic field (jet-field.js): each arrow points along the local flow
 * direction, is scaled by velocity magnitude and coloured by the active
 * scientific field. Educational, not dense. Static (steady field) → rebuilt
 * only on parameter/mode change, so it is essentially free per frame.
 * ===================================================================== */
import * as THREE from "three";
import { makeField } from "./jet-field.js";
import { sampleCmap, FIELD_MODES } from "./colormaps.js";

export function createGlyphs(opts = {}) {
  const tank = opts.tank || { w: 1.6, h: 1.6, d: 1.0 };
  let params = Object.assign({ velocity: 0.5, densityRatio: 0.5, deltaT: 0.5 }, opts.params || {});
  let mode = 0;
  const nx = opts.nx || 9, ny = opts.ny || 7, nz = opts.nz || 2;

  const geo = new THREE.ConeGeometry(0.02, 0.085, 8);
  geo.translate(0, 0.0425, 0);            // base at origin, tip toward +Y
  const mat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.95 });
  const mesh = new THREE.InstancedMesh(geo, mat, nx * ny * nz);
  mesh.frustumCulled = false;
  mesh.visible = false;

  const dummy = new THREE.Object3D();
  const up = new THREE.Vector3(0, 1, 0);
  const q = new THREE.Quaternion();
  const dir = new THREE.Vector3();
  const col = new THREE.Color();

  function build() {
    const field = makeField(params, tank);
    const cmap = FIELD_MODES[mode].cmap;
    // sample + find max speed for magnitude scaling
    const pts = [];
    let vmax = 1e-6;
    for (let iz = 0; iz < nz; iz++) {
      const z = nz > 1 ? ((iz / (nz - 1)) - 0.5) * tank.d * 0.6 : 0;
      for (let iy = 0; iy < ny; iy++) {
        const y = ((iy + 0.5) / ny - 0.5) * tank.h * 0.92;
        for (let ix = 0; ix < nx; ix++) {
          const x = ((ix + 0.5) / nx - 0.5) * tank.w * 0.92;
          const v = field.velocity(x, y);
          vmax = Math.max(vmax, v.speed);
          pts.push({ x, y, z, v });
        }
      }
    }
    let i = 0;
    for (const p of pts) {
      const f = p.v.speed / vmax;
      dir.set(p.v.vx, p.v.vy, 1e-4).normalize();
      q.setFromUnitVectors(up, dir);
      dummy.position.set(p.x, p.y, p.z);
      dummy.quaternion.copy(q);
      dummy.scale.set(0.6 + 0.4 * f, 0.4 + 1.1 * f, 0.6 + 0.4 * f);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      const t = field.temperature(p.x, p.y);
      const sc = mode === 0 ? t : mode === 1 ? Math.min(1, f) : mode === 2 ? (1 - t) : t;
      const [r, g, b] = sampleCmap(cmap, sc);
      mesh.setColorAt(i, col.setRGB(r / 255, g / 255, b / 255));
      i++;
    }
    mesh.count = i;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }
  build();

  return {
    object: mesh,
    setParams(p) { Object.assign(params, p); build(); },
    setMode(m) { mode = m; build(); },
    setVisible(v) { mesh.visible = v; },
    dispose() { geo.dispose(); mat.dispose(); },
  };
}
