/* simulation/flow-sim.js — "Flow Intuition" pseudo-simulation (Feature 3).
 *
 * NOT a CFD solver. It is a cheap 2D particle advection on a hand-built
 * velocity field (jet + two vortices + buoyancy) so visitors can *feel* how
 * the flow responds to inlet velocity, density ratio and temperature
 * difference. Colour encodes temperature; vortex strength and buoyant tilt
 * react to the sliders in real time.
 */

const COLORMAP = [
  [0.00, 26, 56, 160], [0.25, 0, 153, 230], [0.50, 31, 204, 92],
  [0.72, 255, 217, 31], [1.00, 235, 41, 32],
];
function thermal(t) {
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  for (let k = 0; k < COLORMAP.length - 1; k++) {
    const a = COLORMAP[k], b = COLORMAP[k + 1];
    if (t <= b[0]) {
      const f = (t - a[0]) / (b[0] - a[0]);
      return [a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f, a[3] + (b[3] - a[3]) * f];
    }
  }
  const z = COLORMAP[COLORMAP.length - 1];
  return [z[1], z[2], z[3]];
}

export function createFlowSim(canvas) {
  const ctx = canvas.getContext("2d");
  let W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);

  // tunable parameters (slider-driven)
  const P = { velocity: 0.5, densityRatio: 0.5, deltaT: 0.5 }; // all 0..1 normalised

  const NUM = 320;
  const ps = [];
  function spawn(p) {
    p.x = 0.04 + Math.random() * 0.02;          // at the inlet (left, mid-height)
    p.y = 0.5 + (Math.random() - 0.5) * 0.04;
    p.life = 0;
    p.seedT = 1;                                  // enters hot
  }
  for (let i = 0; i < NUM; i++) { const p = {}; spawn(p); p.life = Math.random(); ps.push(p); }

  // velocity field in normalised [0..1] coords
  function field(x, y) {
    const v = 0.25 + P.velocity * 0.9;            // jet strength
    const buoy = (0.15 + P.densityRatio * 0.7) * (0.4 + P.deltaT * 0.6); // upward pull
    // jet core along y=0.5, decaying downstream
    const jetY = 0.5;
    const dy = y - jetY;
    const core = Math.exp(-(dy * dy) / 0.01) * Math.exp(-x * 1.2);
    let vx = v * core;
    let vy = -buoy * x * 0.6;                      // rises as it travels in
    // two counter-rotating vortices centred downstream
    const cx = 0.42, sep = 0.20;
    for (const s of [-1, 1]) {
      const vxc = cx, vyc = jetY + s * sep;
      const rx = x - vxc, ry = y - vyc;
      const r2 = rx * rx + ry * ry + 0.004;
      const strength = (0.06 + P.velocity * 0.12) * s;
      vx += -strength * ry / r2 * 0.02;
      vy += strength * rx / r2 * 0.02;
    }
    return [vx, vy];
  }

  function resize() {
    const r = canvas.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  const ro = new ResizeObserver(resize); ro.observe(canvas); resize();

  let raf = 0, running = false, last = 0;
  function frame(now) {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.05) || 0.016; last = now;

    // fade previous frame for trails
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "rgba(5,8,16,0.22)";
    ctx.fillRect(0, 0, W, H);

    // faint tank + inlet
    ctx.strokeStyle = "rgba(54,209,255,0.35)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(W * 0.02, H * 0.06, W * 0.96, H * 0.88);
    ctx.fillStyle = "rgba(54,209,255,0.6)";
    ctx.fillRect(0, H * 0.5 - 4, W * 0.04, 8);

    ctx.globalCompositeOperation = "lighter";
    for (const p of ps) {
      const [vx, vy] = field(p.x, p.y);
      p.x += vx * dt * 1.1;
      p.y += vy * dt * 1.1;
      p.life += dt * 0.25;
      // temperature ~ how high it sits + how fresh it is (warm rises)
      const t = Math.max(0, Math.min(1, (1 - p.y) * 0.7 + (1 - p.life) * 0.3 * P.deltaT + 0.15));
      const [r, g, b] = thermal(t);
      const px = p.x * W, py = p.y * H;
      const rad = 1.8 + P.velocity * 1.1;
      const grd = ctx.createRadialGradient(px, py, 0, px, py, rad * 3);
      grd.addColorStop(0, `rgba(${r|0},${g|0},${b|0},0.42)`);
      grd.addColorStop(1, `rgba(${r|0},${g|0},${b|0},0)`);
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(px, py, rad * 3, 0, 6.283); ctx.fill();
      if (p.life >= 1 || p.x > 0.99 || p.y < 0.04 || p.y > 0.96) spawn(p);
    }
    ctx.globalCompositeOperation = "source-over";
  }

  return {
    setParams(next) { Object.assign(P, next); },
    start() { if (!running) { running = true; last = performance.now(); raf = requestAnimationFrame(frame); } },
    stop() { running = false; cancelAnimationFrame(raf); },
    dispose() { this.stop(); ro.disconnect(); },
  };
}
