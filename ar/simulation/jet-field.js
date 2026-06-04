/* =====================================================================
 * simulation/jet-field.js — analytic flow model of the laminar buoyant jet.
 *
 * NOT a solver. A smooth, steady velocity/temperature model that reproduces
 * the OBSERVED topology of the real case (the Fluent figure flowfield.jpg):
 * a horizontal jet through the mid-plane feeding TWO counter-rotating
 * recirculation vortices, with buoyancy lifting the warm fluid. It stays
 * laminar by construction (no noise / no chaotic terms) and is used to trace
 * streamlines, place velocity glyphs and colour the fields consistently.
 *
 * Coordinates are centred: x ∈ [-w/2, w/2] (inlet at -w/2), y ∈ [-h/2, h/2]
 * (jet along y = 0, +y up). params {velocity, densityRatio, deltaT} ∈ [0,1].
 * ===================================================================== */

export const T_RANGE = { lo: 293, hi: 333 };  // K, real case
export const U_MAX = 0.024;                    // m/s, ~ inlet 0.02 + core, for normalisation

export function makeField(params, tank) {
  const halfW = tank.w / 2, halfH = tank.h / 2;
  const cx = -halfW + 0.55 * tank.w;            // vortex-centre x
  const cy = 0.30 * halfH;                       // vortex-centre |y|

  function velocity(x, y) {
    const v = 0.25 + params.velocity * 0.9;      // jet momentum
    const buoy = (0.15 + params.densityRatio * 0.7) * (0.4 + params.deltaT * 0.6);
    const xn = (x + halfW) / tank.w;             // 0 at inlet → 1 at outlet
    // jet core along y = 0, decaying downstream
    const core = Math.exp(-(y * y) / (0.02 * halfH * halfH + 1e-6)) * Math.exp(-xn * 1.1);
    let vx = v * core;
    let vy = buoy * xn * (1 - Math.exp(-xn * 2.2)) * 0.6;  // buoyant rise, grows downstream
    // two counter-rotating vortices (entrainment)
    for (const s of [-1, 1]) {
      const rx = x - cx, ry = y - s * cy;
      const r2 = rx * rx + ry * ry + 0.012 * halfH * halfH;
      const strength = (0.05 + params.velocity * 0.10) * s * halfH;
      vx += -strength * ry / r2;
      vy += strength * rx / r2;
    }
    const speed = Math.hypot(vx, vy);
    return { vx, vy, speed };
  }

  // temperature in [0,1] over [293,333] K: stable stratification (warm top)
  // plus the hot jet core; ΔT sets the contrast.
  function temperature(x, y) {
    const height = (y + halfH) / tank.h;                 // 0 bottom .. 1 top
    const xn = (x + halfW) / tank.w;
    const core = Math.exp(-(y * y) / (0.02 * halfH * halfH + 1e-6)) * Math.exp(-xn * 1.0);
    return clamp01(height * (0.5 + 0.4 * params.deltaT) + core * 0.6 + 0.1 * params.deltaT);
  }

  return { velocity, temperature, cx, cy, halfW, halfH };
}

export const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
