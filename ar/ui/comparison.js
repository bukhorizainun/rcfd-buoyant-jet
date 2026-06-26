/* ui/comparison.js — Scenario comparison: CFD vs rCFD replay (Feature 7).
 * A draggable wipe between the two videos plus a metric read-out. Supports
 * several scenarios (adiabatic, wall heat loss) switched by the tab bar.
 */
import { $, $$, el, esc } from "../core/utils.js";
import { STATE } from "../core/state.js";

let built = false;
let scenarios = [];
let curScn = 0;
let setPos = () => {};

export function initComparison() {
  const c = STATE.content.comparison;
  if (!c) return;

  // accept the new multi-scenario shape and the old single-scenario one
  scenarios = (c.scenarios && c.scenarios.length)
    ? c.scenarios
    : [{ id: "default", label: "Compare", aspect: "15 / 8", subtitle: c.subtitle,
         left: c.left, right: c.right, metrics: c.metrics }];

  if (!built) {
    built = true;
    $("#cmpTitle").textContent = c.title;

    const tabs = $("#cmpScenarios");
    tabs.innerHTML = "";
    scenarios.forEach((s, i) => {
      const b = el("button", { class: "cmp-scn-b" + (i === 0 ? " on" : ""), type: "button",
        role: "tab", "data-i": String(i), "aria-selected": String(i === 0) }, esc(s.label));
      b.addEventListener("click", () => setScenario(i));
      tabs.appendChild(b);
    });
    tabs.style.display = scenarios.length > 1 ? "" : "none";

    setupWipe();
    setScenario(0);
  } else {
    applyScenario(scenarios[curScn]);
  }
  playComparison();
}

function setScenario(i) {
  curScn = i;
  $$("#cmpScenarios .cmp-scn-b").forEach((b, k) => {
    const on = k === i;
    b.classList.toggle("on", on);
    b.setAttribute("aria-selected", String(on));
  });
  applyScenario(scenarios[i]);
  playComparison();
}

function applyScenario(s) {
  const left = $("#cmpLeft"), right = $("#cmpRight");
  $("#cmpSub").textContent = s.subtitle || STATE.content.comparison.subtitle || "";
  $("#cmpMedia").style.aspectRatio = s.aspect || "15 / 8";
  left.src = s.left.video; right.src = s.right.video;
  left.muted = right.muted = true;
  left.load(); right.load();
  $("#cmpLeftLabel").textContent = s.left.label;
  $("#cmpRightLabel").textContent = s.right.label;
  $("#cmpMetrics").innerHTML = (s.metrics || []).map((m) => `
      <div class="cmp-metric">
        <span class="cmp-m-label">${esc(m.label)}</span>
        <span class="cmp-m-row"><b>${esc(m.cfd)}</b> → <b class="rcfd">${esc(m.rcfd)}</b></span>
        <span class="cmp-m-win">${esc(m.win)}</span>
      </div>`).join("");
  setPos(50);
}

function setupWipe() {
  const right = $("#cmpRight");
  setPos = (p) => {
    p = Math.max(0, Math.min(100, p));
    right.style.clipPath = `inset(0 0 0 ${p}%)`;
    $("#cmpDivider").style.left = p + "%";
  };
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

export function playComparison() {
  const left = $("#cmpLeft"), right = $("#cmpRight");
  [left, right].forEach((v) => { if (v) { v.muted = true; v.play().catch(() => {}); } });
}
export function pauseComparison() {
  [$("#cmpLeft"), $("#cmpRight")].forEach((v) => { if (v) v.pause(); });
}
