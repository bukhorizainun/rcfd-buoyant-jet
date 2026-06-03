/* ui/comparison.js — Scenario comparison: CFD vs AI-assisted rCFD (Feature 7).
 * A draggable wipe between the two videos plus a metric read-out.
 */
import { $, esc } from "../core/utils.js";
import { STATE } from "../core/state.js";

let built = false;

export function initComparison() {
  const c = STATE.content.comparison;
  if (!c) return;
  const left = $("#cmpLeft"), right = $("#cmpRight");

  if (!built) {
    built = true;
    $("#cmpTitle").textContent = c.title;
    $("#cmpSub").textContent = c.subtitle || "";
    left.src = c.left.video; right.src = c.right.video;
    left.muted = right.muted = true;
    $("#cmpLeftLabel").textContent = c.left.label;
    $("#cmpRightLabel").textContent = c.right.label;
    $("#cmpMetrics").innerHTML = c.metrics.map((m) => `
      <div class="cmp-metric">
        <span class="cmp-m-label">${esc(m.label)}</span>
        <span class="cmp-m-row"><b>${esc(m.cfd)}</b> → <b class="rcfd">${esc(m.rcfd)}</b></span>
        <span class="cmp-m-win">${esc(m.win)}</span>
      </div>`).join("");

    const setPos = (p) => {
      p = Math.max(0, Math.min(100, p));
      right.style.clipPath = `inset(0 0 0 ${p}%)`;
      $("#cmpDivider").style.left = p + "%";
    };
    setPos(50);

    // pointer-drag wipe over the media area
    const media = $("#cmpMedia");
    let dragging = false;
    const fromEvent = (e) => {
      const r = media.getBoundingClientRect();
      const x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
      setPos((x / r.width) * 100);
    };
    media.addEventListener("pointerdown", (e) => { dragging = true; fromEvent(e); });
    window.addEventListener("pointermove", (e) => { if (dragging) fromEvent(e); });
    window.addEventListener("pointerup", () => { dragging = false; });
  }
  playComparison();
}

export function playComparison() {
  const left = $("#cmpLeft"), right = $("#cmpRight");
  [left, right].forEach((v) => { if (v) { v.muted = true; v.play().catch(() => {}); } });
}
export function pauseComparison() {
  [$("#cmpLeft"), $("#cmpRight")].forEach((v) => { if (v) v.pause(); });
}
