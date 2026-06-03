/* =====================================================================
 * app.js — orchestrator (ES module)
 *
 * Conversational Scientific Poster System. Wires the modular features:
 *   core/        shared state, event bus, helpers, config
 *   ai/          offline conversation engine + memory + LLM hook
 *   ui/          chat, hotspots, research mode, insights, comparison,
 *                background, AR scene
 *   simulation/  flow-intuition pseudo-sim
 *   viewer3d.js  Three.js buoyant-jet viewer (lazy)
 *
 * Heavy libs (A-Frame/MindAR, Three.js) load on demand only.
 * ===================================================================== */
import { $, $$, el, esc, toast, fetchJSON, headOK } from "./core/utils.js";
import { STATE } from "./core/state.js";
import { PATHS } from "./core/config.js";
import bus from "./core/bus.js";

import * as conversation from "./ai/conversation.js";
import * as memory from "./ai/memory.js";

import { initChat } from "./ui/chat.js";
import { renderDemoHotspots, openPopup } from "./ui/hotspots.js";
import { toggleResearchMode } from "./ui/research-mode.js";
import { renderInsights } from "./ui/insights.js";
import { initComparison, pauseComparison } from "./ui/comparison.js";
import { startBackground } from "./ui/background.js";
import { startARScene, resetARScene } from "./ui/ar-scene.js";
import { createFlowSim } from "./simulation/flow-sim.js";

/* ---------- boot ---------- */
(function start() {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();

async function boot() {
  startBackground($("#bgCanvas"));
  setLoader(15, "Loading research content…");
  try {
    const [content, hotspots, kb] = await Promise.all([
      fetchJSON(PATHS.content), fetchJSON(PATHS.hotspots), fetchJSON(PATHS.kb),
    ]);
    STATE.content = content; STATE.hotspots = hotspots; STATE.kb = kb;
    conversation.init(kb);
  } catch (err) {
    setLoader(100, "");
    $("#loaderSub").textContent =
      "Could not load data files. Serve over http(s) (e.g. python -m http.server) or via GitHub Pages.";
    console.error(err);
    return;
  }

  setLoader(55, "Preparing interface…");
  hydrateStaticText();
  setLoader(80, "Checking AR target…");
  STATE.targetCompiled = await headOK(PATHS.target);
  setLoader(100, "Ready");
  setTimeout(showStart, 320);
}

function setLoader(pct, sub) {
  const bar = $("#loaderBar"); if (bar) bar.style.width = pct + "%";
  if (sub != null) $("#loaderSub").textContent = sub;
}

function hydrateStaticText() {
  const c = STATE.content;
  $("#startTitle").textContent = c.title;
  $("#startSub").textContent = c.subtitle;
  $("#startAuthor").textContent = `${c.author} · Supervisor: ${c.supervisor}`;
  $("#scanHintText").textContent = c.fallbackMessage || "Point your camera toward the scientific poster.";
  const b = c.detectionBanner || {};
  if (b.line1) $("#bannerL1").textContent = b.line1;
  if (b.line2) $("#bannerL2").textContent = b.line2;
  if (b.line3) $("#bannerL3").textContent = b.line3;
  $("#dashTitle").textContent = c.dashboard.title;
  $("#dashSub").textContent = c.dashboard.subtitle;
  $("#tlTitle").textContent = c.timeline.title;
  $("#tlSub").textContent = c.timeline.subtitle;
}

function showStart() {
  $("#loader").classList.add("hidden");
  $("#start").classList.remove("hidden");
  if (!STATE.targetCompiled) {
    $("#startHint").innerHTML =
      "Tip: the AR target (<code>target.mind</code>) isn't compiled yet, so AR can't lock onto the poster. " +
      "“Explore on screen” works right now — see the README to enable full AR.";
  }
  wireGlobalUI();
}

/* =====================================================================
 * GLOBAL UI WIRING
 * ===================================================================== */
function wireGlobalUI() {
  $("#btnLaunchAR").addEventListener("click", launchAR);
  $("#btnDemo").addEventListener("click", () => startDemo());
  $("#errDemo").addEventListener("click", () => { $("#errorScreen").classList.add("hidden"); startDemo(); });
  $("#btnExit").addEventListener("click", exitToStart);
  $("#btnResearch").addEventListener("click", () => {
    const on = toggleResearchMode();
    $("#btnResearch").classList.toggle("on", on);
    $("#btnResearch").setAttribute("aria-pressed", String(on));
  });

  $$("#dock .dock-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const which = btn.dataset.panel;
      if (which === "model3d") return openModel3D();
      togglePanel(which, btn);
    });
  });

  document.body.addEventListener("click", (e) => {
    const closer = e.target.closest("[data-close]");
    if (closer) closeOverlay(closer.dataset.close);
  });
  $("#popup").addEventListener("click", (e) => { if (e.target.id === "popup") closeOverlay("popup"); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeTopMost(); });
}

function enterStage(showInfo = true) {
  $("#start").classList.add("hidden");
  $("#hud").classList.remove("hidden");
  $("#dock").classList.remove("hidden");
  if (showInfo) showInfoLayer();
}

function exitToStart() {
  closeAllPanels(); closeOverlay("model3d"); closeOverlay("popup");
  resetARScene();
  STATE.arReady = false;
  $("#demoStage").classList.add("hidden");
  $("#scanHint").classList.add("hidden");
  $("#banner").classList.add("hidden");
  $("#hud").classList.add("hidden");
  $("#dock").classList.add("hidden");
  const info = $("#infoLayer"); if (info) info.remove();
  $("#start").classList.remove("hidden");
  STATE.mode = null;
}

/* Feature 2 — digital information layer */
function showInfoLayer() {
  const c = STATE.content;
  const old = $("#infoLayer"); if (old) old.remove();
  const areas = (c.researchAreas || []).map((a) => `<span class="chip">${esc(a)}</span>`).join("");
  const card = el("div", { id: "infoLayer" });
  card.innerHTML = `
    <div class="info-card">
      <div class="info-eyebrow">${esc(c.institution || "")}</div>
      <h2>${esc(c.title)}</h2>
      <p class="info-sub">${esc(c.subtitle)}</p>
      <p class="info-author">${esc(c.author)} · Supervisor: ${esc(c.supervisor)}</p>
      <div class="info-areas">${areas}</div>
      <button class="info-dismiss" type="button">Enter ›</button>
    </div>`;
  document.body.appendChild(card);
  requestAnimationFrame(() => card.classList.add("show"));
  const hide = () => card.classList.remove("show");
  card.querySelector(".info-dismiss").addEventListener("click", hide);
  card.addEventListener("click", (e) => { if (e.target.id === "infoLayer") hide(); });
  setTimeout(hide, 6500);
}

/* =====================================================================
 * MODES
 * ===================================================================== */
function startDemo() {
  STATE.mode = "demo";
  enterStage(true);
  $("#demoStage").classList.remove("hidden");
  renderDemoHotspots();
}

async function launchAR() {
  if (!window.isSecureContext && location.hostname !== "localhost") {
    return showError("Insecure connection",
      "The camera needs a secure (https) page. This works on GitHub Pages or localhost.");
  }
  if (!STATE.targetCompiled) {
    toast("AR target not compiled yet — opening on-screen demo. See README to enable AR.", 4200);
    return startDemo();
  }
  STATE.mode = "ar";
  enterStage(false);
  $("#scanHint").classList.remove("hidden");
  try {
    await startARScene({ onFirstFound: showInfoLayer, onError: () =>
      showError("Camera unavailable", "Could not start the camera. Grant camera permission, or continue on screen.") });
  } catch (err) {
    console.error(err);
    showError("Could not load AR engine", "Check your internet connection and try again.");
  }
}

/* =====================================================================
 * PANELS
 * ===================================================================== */
const PANELS = ["dashboard", "timeline", "ai", "flow", "insights", "comparison"];

function togglePanel(which, btn) {
  const id = "panel-" + which;
  const wasOpen = STATE.activePanel === which;
  closeAllPanels();
  if (wasOpen) return;
  document.getElementById(id).classList.remove("hidden");
  STATE.activePanel = which;
  if (btn) btn.classList.add("active");
  if (which === "dashboard") renderDashboard();
  if (which === "timeline") initTimeline();
  if (which === "ai") initChat();
  if (which === "flow") openFlowSim();
  if (which === "insights") renderInsights();
  if (which === "comparison") initComparison();
}

function closeAllPanels() {
  PANELS.forEach((w) => document.getElementById("panel-" + w).classList.add("hidden"));
  $$("#dock .dock-btn").forEach((b) => b.classList.remove("active"));
  const tv = $("#tlVideo"); if (tv) tv.pause();
  pauseComparison();
  if (flowSim) flowSim.stop();
  STATE.activePanel = null;
}

function closeOverlay(id) {
  if (id === "model3d") return closeModel3D();
  if (id === "popup") return $("#popup").classList.add("hidden");
  if (id && id.startsWith("panel-")) return closeAllPanels();
  const node = document.getElementById(id); if (node) node.classList.add("hidden");
}

function closeTopMost() {
  if (!$("#model3d").classList.contains("hidden")) return closeModel3D();
  if (!$("#popup").classList.contains("hidden")) return $("#popup").classList.add("hidden");
  if (STATE.activePanel) return closeAllPanels();
  const info = $("#infoLayer"); if (info && info.classList.contains("show")) info.classList.remove("show");
}

/* ---- Feature 6: dashboard ---- */
function renderDashboard() {
  const grid = $("#metrics");
  if (grid.childElementCount) return;
  grid.innerHTML = STATE.content.dashboard.metrics.map((m) => `
    <div class="metric">
      <div class="m-label">${esc(m.label)}</div>
      <div class="m-value">${esc(m.value)}</div>
      <div class="m-note">${esc(m.note || "")}</div>
    </div>`).join("");
}

/* ---- Feature 7 (timeline explorer) ---- */
let tlInited = false;
function initTimeline() {
  const tl = STATE.content.timeline;
  const v = $("#tlVideo"), slider = $("#tlSlider"), marksWrap = $("#tlMarks");
  const simMax = tl.duration || 600;
  if (!tlInited) {
    tlInited = true;
    v.src = tl.video; slider.max = String(simMax);
    marksWrap.innerHTML = "";
    (tl.marks || []).forEach((mk) => {
      const b = el("button", { type: "button", "data-t": mk.t }, esc(mk.label));
      b.addEventListener("click", () => { slider.value = mk.t; scrub(); });
      marksWrap.appendChild(b);
    });
    const scrub = () => {
      const t = Number(slider.value);
      if (v.duration && isFinite(v.duration)) v.currentTime = (t / simMax) * v.duration;
      updateTLReadout(t);
    };
    tlScrub = scrub;
    slider.addEventListener("input", scrub);
    v.addEventListener("loadedmetadata", scrub);
  }
  updateTLReadout(Number(slider.value));
}
let tlScrub = null;
function updateTLReadout(t) {
  const marks = STATE.content.timeline.marks || [];
  let cur = marks[0] || { caption: "" };
  for (const mk of marks) if (t >= mk.t) cur = mk;
  $("#tlTime").textContent = `t = ${t} s`;
  $("#tlCaption").textContent = cur.caption || "";
  $$("#tlMarks button").forEach((b) => b.classList.toggle("on", Number(b.dataset.t) <= t));
}

/* ---- Feature 3: flow-intuition pseudo-sim ---- */
let flowSim = null;
function openFlowSim() {
  if (!flowSim) {
    flowSim = createFlowSim($("#flowCanvas"));
    const wire = (id, key) => {
      const s = $(id);
      const apply = () => { const o = {}; o[key] = Number(s.value) / 100; flowSim.setParams(o);
        $(id + "Val").textContent = s.value + "%"; };
      s.addEventListener("input", apply); apply();
    };
    wire("#flowV", "velocity");
    wire("#flowRho", "densityRatio");
    wire("#flowDT", "deltaT");
  }
  flowSim.start();
}

/* =====================================================================
 * Feature 5 — 3D model viewer (lazy Three.js)
 * ===================================================================== */
async function openModel3D() {
  const modal = $("#model3d");
  modal.classList.remove("hidden");
  if (STATE.viewer3d) return;
  try {
    const mod = await import("./viewer3d.js");
    STATE.viewer3d = await mod.createViewer($("#model3dCanvas"), {
      glb: PATHS.glb, cfdVideo: PATHS.cfdVideo,
      onMode: (label) => { $("#model3dFoot").textContent = label; },
    });
  } catch (err) {
    console.error(err);
    $("#model3dFoot").textContent = "3D viewer failed to load (needs internet for Three.js).";
  }
}
function closeModel3D() {
  $("#model3d").classList.add("hidden");
  if (STATE.viewer3d && STATE.viewer3d.dispose) STATE.viewer3d.dispose();
  STATE.viewer3d = null;
  // keep the legend element; only clear the canvas the viewer appended
  const cv = $("#model3dCanvas canvas"); if (cv) cv.remove();
}

function showError(title, body) {
  $("#errTitle").textContent = title;
  $("#errBody").textContent = body;
  $("#errorScreen").classList.remove("hidden");
}
