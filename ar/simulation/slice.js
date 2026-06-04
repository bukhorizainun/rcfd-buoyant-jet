/* =====================================================================
 * simulation/slice.js — interactive horizontal slice plane (Feature #4).
 *
 * A movable horizontal plane (like ParaView's Slice filter). It is textured
 * with the field sampled across the tank width at the slice height, using the
 * active scientific colormap, so the user can inspect the cross-sectional
 * distribution. getReadout() returns the height (mm, geometric) plus the mean
 * temperature and peak velocity along the slice for a numeric overlay.
 * ===================================================================== */
import * as THREE from "three";
import { makeField, T_RANGE } from "./jet-field.js";
import { sampleCmap, FIELD_MODES } from "./colormaps.js";

const TANK_HEIGHT_MM = 75;   // real tank height 7.5 cm

export function createSlice(opts = {}) {
  const tank = opts.tank || { w: 1.6, h: 1.6, d: 1.0 };
  let params = Object.assign({ velocity: 0.5, densityRatio: 0.5, deltaT: 0.5 }, opts.params || {});
  let mode = 0;
  let yFrac = 0.5;            // 0 bottom .. 1 top
  let realField = opts.field || null;     // real CFD sampler, or null → model

  const W = 128;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = 1;
  const ctx = canvas.getContext("2d");
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter;

  const group = new THREE.Group();
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(tank.w, tank.d),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false })
  );
  plane.rotation.x = -Math.PI / 2;     // horizontal
  group.add(plane);
  const border = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.PlaneGeometry(tank.w, tank.d)),
    new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 })
  );
  border.rotation.x = -Math.PI / 2;
  group.add(border);
  group.visible = false;

  let readout = { mm: 0, T: 0, v: 0 };

  function redraw() {
    const field = realField || makeField(params, tank);
    const norm = (realField && realField.umax) || 0.95;
    const cmap = FIELD_MODES[mode].cmap;
    const y = (yFrac - 0.5) * tank.h * 0.98;
    let Tsum = 0, vmax = 0;
    for (let i = 0; i < W; i++) {
      const x = ((i + 0.5) / W - 0.5) * tank.w;
      const t = field.temperature(x, y);
      const spd = field.velocity(x, y).speed;
      Tsum += t; vmax = Math.max(vmax, spd);
      const sc = mode === 0 ? t : mode === 1 ? Math.min(1, spd / 0.95) : mode === 2 ? (1 - t) : t;
      const [r, g, b] = sampleCmap(cmap, sc);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(i, 0, 1, 1);
    }
    tex.needsUpdate = true;
    group.position.y = y;
    readout = {
      mm: Math.round(yFrac * TANK_HEIGHT_MM),
      T: Math.round(T_RANGE.lo + (Tsum / W) * (T_RANGE.hi - T_RANGE.lo)),
      v: Math.min(1, vmax / norm),
    };
  }
  redraw();

  return {
    object: group,
    setParams(p) { Object.assign(params, p); if (!realField) redraw(); },
    setField(f) { realField = f; redraw(); },
    setMode(m) { mode = m; redraw(); },
    setHeight(f) { yFrac = Math.min(1, Math.max(0, f)); redraw(); },
    setVisible(v) { group.visible = v; },
    getReadout() { return readout; },
    dispose() {
      plane.geometry.dispose(); plane.material.dispose();
      border.geometry.dispose(); border.material.dispose(); tex.dispose();
    },
  };
}
