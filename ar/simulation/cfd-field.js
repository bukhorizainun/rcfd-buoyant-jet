/* =====================================================================
 * simulation/cfd-field.js — the REAL CFD velocity + temperature field.
 *
 * Loads data/cfd_field.json (exported from the Fluent solve
 * BouyantJet_END_CFD_RUN: u, v in m/s and T in K on a 64×64 grid sampled on
 * the symmetry plane of the 85,625-cell mesh) and exposes a sampler with the
 * SAME interface as the analytic model (jet-field.js makeField): velocity()
 * and temperature() in the viewer's centred tank coordinates. So the
 * streamlines, glyphs and slice can be driven by ACTUAL solver data — not a
 * model — flipping the velocity layer from "modelled" to "CFD data".
 * ===================================================================== */

export async function loadRealField(url, tank) {
  try {
    const res = await fetch(url, { cache: "no-cache" });
    if (!res.ok) return null;
    return makeRealField(await res.json(), tank);
  } catch (_) {
    return null;
  }
}

export function makeRealField(data, tank) {
  const { nx, ny, x0, x1, y0, y1, umax, Tlo, Thi } = data;
  const u = data.u, v = data.v, T = data.T;

  // viewer centred coords (x∈[-w/2,w/2]) → grid fractional indices
  function toGrid(vx, vy) {
    let fx = ((vx / tank.w) + 0.5) * (nx - 1);
    let fy = ((vy / tank.h) + 0.5) * (ny - 1);
    fx = fx < 0 ? 0 : fx > nx - 1.001 ? nx - 1.001 : fx;
    fy = fy < 0 ? 0 : fy > ny - 1.001 ? ny - 1.001 : fy;
    return [fx, fy];
  }
  function bil(arr, fx, fy) {
    const ix = fx | 0, iy = fy | 0, tx = fx - ix, ty = fy - iy;
    const a = arr[iy * nx + ix], b = arr[iy * nx + ix + 1];
    const c = arr[(iy + 1) * nx + ix], d = arr[(iy + 1) * nx + ix + 1];
    return a * (1 - tx) * (1 - ty) + b * tx * (1 - ty) + c * (1 - tx) * ty + d * tx * ty;
  }

  return {
    real: true,
    data,                       // raw grid, for building the GPU advection texture
    umax,                       // m/s, for velocity-magnitude normalisation
    velocity(x, y) {
      const g = toGrid(x, y);
      const vx = bil(u, g[0], g[1]), vy = bil(v, g[0], g[1]);
      return { vx, vy, speed: Math.hypot(vx, vy) };
    },
    temperature(x, y) {         // normalised 0..1 over [Tlo, Thi]
      const g = toGrid(x, y);
      const t = (bil(T, g[0], g[1]) - Tlo) / (Thi - Tlo);
      return t < 0 ? 0 : t > 1 ? 1 : t;
    },
  };
}
