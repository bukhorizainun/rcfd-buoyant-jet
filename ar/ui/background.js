/* ui/background.js — subtle fluid particle backdrop (Feature 9).
 * Cheap, capped, and paused when the tab is hidden so it never costs FPS.
 */
export function startBackground(canvas) {
  const ctx = canvas.getContext("2d");
  let W = 0, H = 0, raf = 0, running = true;
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  const N = 46;
  const pts = [];

  function resize() {
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  for (let i = 0; i < N; i++) {
    pts.push({
      x: Math.random(), y: Math.random(),
      vx: (Math.random() - 0.5) * 0.02, vy: (Math.random() - 0.5) * 0.02,
      r: 0.6 + Math.random() * 1.8, hue: Math.random() < 0.5 ? "54,209,255" : "124,77,255",
    });
  }
  const ro = new ResizeObserver(resize); ro.observe(canvas); resize();

  let t = 0;
  function frame() {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    t += 0.005;
    ctx.clearRect(0, 0, W, H);
    for (const p of pts) {
      // slow drift with a gentle flow-like sway
      p.x += p.vx + Math.sin(t + p.y * 6) * 0.0006;
      p.y += p.vy + Math.cos(t + p.x * 6) * 0.0006;
      if (p.x < -0.05) p.x = 1.05; if (p.x > 1.05) p.x = -0.05;
      if (p.y < -0.05) p.y = 1.05; if (p.y > 1.05) p.y = -0.05;
      const px = p.x * W, py = p.y * H;
      const g = ctx.createRadialGradient(px, py, 0, px, py, p.r * 14);
      g.addColorStop(0, `rgba(${p.hue},0.16)`);
      g.addColorStop(1, `rgba(${p.hue},0)`);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(px, py, p.r * 14, 0, 6.283); ctx.fill();
    }
  }
  raf = requestAnimationFrame(frame);
  document.addEventListener("visibilitychange", () => {
    running = !document.hidden;
    if (running) { raf = requestAnimationFrame(frame); }
  });

  return { stop() { running = false; cancelAnimationFrame(raf); ro.disconnect(); } };
}
