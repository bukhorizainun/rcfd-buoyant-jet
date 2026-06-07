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
import { renderHeatLab } from "./ui/heat-lab.js";
import { startBackground } from "./ui/background.js";
import { startARScene, resetARScene } from "./ui/ar-scene.js";
import * as astroDuck from "./ui/astro-duck.js";
import { FIELD_MODES, legendGradient, sampleCmap } from "./simulation/colormaps.js";
// flow-sim.js (and its Three.js dependency) is imported lazily in openFlowSim()

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
  astroDuck.mountWelcome();
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
    if (on) astroDuck.startTour(); else astroDuck.stopTour();
  });

  const btnPresent = $("#btnPresent");
  if (btnPresent) btnPresent.addEventListener("click", () => {
    const on = !btnPresent.classList.contains("on");
    btnPresent.classList.toggle("on", on);
    btnPresent.setAttribute("aria-pressed", String(on));
    if (on) astroDuck.startPresentation({
      openPanel: openPanelByName,
      closeAll: () => { closeAllPanels(); closeOverlay("model3d"); },
      onEnd: () => { btnPresent.classList.remove("on"); btnPresent.setAttribute("aria-pressed", "false"); },
    });
    else astroDuck.stopPresentation();
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

  // hidden easter egg: five taps on the assistant avatar
  const aiAva = document.querySelector(".ai-ava");
  if (aiAva) aiAva.addEventListener("click", () => astroDuck.nudgeEasterEgg());
}

/* Open a single panel by name (used by Presentation Mode), without toggling. */
function openPanelByName(name) {
  if (name === "model3d") return openModel3D();
  closeOverlay("model3d");
  closeAllPanels();
  const node = document.getElementById("panel-" + name);
  if (!node) return;
  node.classList.remove("hidden");
  STATE.activePanel = name;
  const btn = document.querySelector(`#dock .dock-btn[data-panel="${name}"]`);
  if (btn) btn.classList.add("active");
  if (name === "dashboard") renderDashboard();
  if (name === "timeline") initTimeline();
  if (name === "ai") initChat();
  if (name === "flow") openFlowSim();
  if (name === "insights") renderInsights();
  if (name === "comparison") initComparison();
  if (name === "heatloss") renderHeatLab();
}

function enterStage(showInfo = true) {
  $("#start").classList.add("hidden");
  $("#hud").classList.remove("hidden");
  $("#dock").classList.remove("hidden");
  if (showInfo) showInfoLayer();
}

function exitToStart() {
  closeAllPanels(); closeOverlay("model3d"); closeOverlay("popup");
  astroDuck.stopTour();
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
  enterStage(false);
  $("#demoStage").classList.remove("hidden");
  renderDemoHotspots();
  astroDuck.celebrate("Poster loaded — let's explore the flow physics.");
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
    await startARScene({ onFirstFound: () => astroDuck.celebrate(), onError: () =>
      showError("Camera unavailable", "Could not start the camera. Grant camera permission, or continue on screen.") });
  } catch (err) {
    console.error(err);
    showError("Could not load AR engine", "Check your internet connection and try again.");
  }
}

/* =====================================================================
 * PANELS
 * ===================================================================== */
const PANELS = ["dashboard", "timeline", "ai", "flow", "insights", "comparison", "heatloss"];

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
  if (which === "heatloss") renderHeatLab();
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
      astroDuck.timelineSeek(t);
    };
    tlScrub = scrub;
    slider.addEventListener("input", scrub);
    v.addEventListener("loadedmetadata", scrub);
  }
  updateTLReadout(Number(slider.value));
  astroDuck.mountTimelineCompanion();
  astroDuck.timelineSeek(Number(slider.value));
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
let flowSim = null, flowLoading = false;
async function openFlowSim() {
  if (!flowSim && !flowLoading) {
    flowLoading = true;
    const { createFlowSim } = await import("./simulation/flow-sim.js");
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
    flowLoading = false;
  }
  if (flowSim) flowSim.start();
}

/* =====================================================================
 * Feature 5 — 3D model viewer (lazy Three.js)
 * ===================================================================== */
async function openModel3D() {
  closeAllPanels();                 // avoid running the flow panel's WebGL behind the modal
  const modal = $("#model3d");
  modal.classList.remove("hidden");
  buildModel3DUI();
  if (STATE.viewer3d) return;
  try {
    const mod = await import("./viewer3d.js");
    STATE.viewer3d = await mod.createViewer($("#model3dCanvas"), {
      glb: PATHS.glb, cfdVideo: PATHS.cfdVideo,
      onMode: (label) => { $("#model3dFoot").textContent = label; },
    });
    if (STATE.viewer3d.setFieldMode) STATE.viewer3d.setFieldMode(m3dMode);
    // re-apply any toggle state to the freshly created viewer
    if (STATE.viewer3d.setSource) STATE.viewer3d.setSource(m3dSource);
    STATE.viewer3d.setGlyphs($("#m3dGlyphs").classList.contains("on"));
    STATE.viewer3d.setSlice($("#m3dSliceBtn").classList.contains("on"));
    STATE.viewer3d.setSliceHeight(Number($("#m3dSliceRange").value) / 100);
    updateSliceRead();
    const tOn = $("#m3dTimeBtn").classList.contains("on");
    if (STATE.viewer3d.setTimeScrub) STATE.viewer3d.setTimeScrub(tOn);
    if (tOn) applyTime();
  } catch (err) {
    console.error(err);
    $("#model3dFoot").textContent = "3D viewer failed to load (needs internet for Three.js).";
  }
}

/* ---- Feature 2: scientific field selector + legend + parameters ---- */
let m3dMode = 0, m3dSource = "model", m3dUIBuilt = false;
function buildModel3DUI() {
  if (m3dUIBuilt) return;
  m3dUIBuilt = true;
  const modes = $("#m3dModes");
  FIELD_MODES.forEach((m, i) => {
    const b = el("button", { class: "m3d-mode" + (i === 0 ? " on" : ""), type: "button", "data-mode": String(i) }, esc(m.label));
    b.addEventListener("click", () => setFieldMode(i));
    modes.appendChild(b);
  });

  // Field-source toggle: clean analytic Model (default) vs the real rCFD field
  $$("#m3dSource .m3d-segbtn").forEach((b) => {
    b.addEventListener("click", () => setSource(b.dataset.src));
  });

  $("#m3dParams").innerHTML = [
    ["Re", "≈ 100", "laminar"],
    ["ΔT", "40 K", "333→293 K"],
    ["U", "0.02 m/s", "5×5 mm inlet"],
    ["Ri", "≈ 1", "gβΔT·D/U²"],
  ].map((r) => `<div><span>${esc(r[0])}</span><b>${esc(r[1])}</b><small>${esc(r[2])}</small></div>`).join("");
  $("#m3dValid").innerHTML = "Validated · rCFD vs CFD <b>263&times;</b> faster · CoG RMSE <b>0.069 mm</b> · f_sd 0.500";
  applyLegend(0);

  // velocity-glyph + slice-plane toggles
  const gBtn = $("#m3dGlyphs"), sBtn = $("#m3dSliceBtn"), sWrap = $("#m3dSlice"), sRange = $("#m3dSliceRange");
  gBtn.addEventListener("click", () => {
    const on = !gBtn.classList.contains("on");
    gBtn.classList.toggle("on", on); gBtn.setAttribute("aria-pressed", String(on));
    if (STATE.viewer3d && STATE.viewer3d.setGlyphs) STATE.viewer3d.setGlyphs(on);
  });
  sBtn.addEventListener("click", () => {
    const on = !sBtn.classList.contains("on");
    sBtn.classList.toggle("on", on); sBtn.setAttribute("aria-pressed", String(on));
    sWrap.classList.toggle("hidden", !on);
    if (STATE.viewer3d && STATE.viewer3d.setSlice) STATE.viewer3d.setSlice(on);
    if (on) updateSliceRead();
  });
  sRange.addEventListener("input", () => {
    if (STATE.viewer3d && STATE.viewer3d.setSliceHeight) STATE.viewer3d.setSliceHeight(Number(sRange.value) / 100);
    updateSliceRead();
  });

  // time-scrub (replays the real temperature field over 0..600 s)
  const tBtn = $("#m3dTimeBtn"), tWrap = $("#m3dTime"), tRange = $("#m3dTimeRange");
  tBtn.addEventListener("click", () => {
    const on = !tBtn.classList.contains("on");
    tBtn.classList.toggle("on", on); tBtn.setAttribute("aria-pressed", String(on));
    tWrap.classList.toggle("hidden", !on);
    if (STATE.viewer3d && STATE.viewer3d.setTimeScrub) STATE.viewer3d.setTimeScrub(on);
    if (on) applyTime();
  });
  tRange.addEventListener("input", applyTime);

  // export a clean figure for the printed poster / paper
  $("#m3dExport").addEventListener("click", exportFigure);

  // Astro Duck scientific guide (points out structures per active field)
  const guideBtn = $("#m3dGuideBtn");
  if (guideBtn) guideBtn.addEventListener("click", () => {
    const on = !guideBtn.classList.contains("on");
    guideBtn.classList.toggle("on", on); guideBtn.setAttribute("aria-pressed", String(on));
    astroDuck.set3DGuide(on, FIELD_MODES[m3dMode].label);
  });
  astroDuck.recordMode(m3dMode);   // viewing the modal counts the default field
}
function updateSliceRead() {
  if (!STATE.viewer3d || !STATE.viewer3d.getSliceReadout) return;
  const r = STATE.viewer3d.getSliceReadout(); if (!r) return;
  $("#m3dSliceRead").innerHTML = `y = <b>${r.mm} mm</b><br>T&#772; ≈ <b>${r.T} K</b><br>|u| <b>${Math.round(r.v * 100)}%</b>`;
}
function setFieldMode(i) {
  m3dMode = i;
  $$("#m3dModes .m3d-mode").forEach((b) => b.classList.toggle("on", Number(b.dataset.mode) === i));
  if (STATE.viewer3d && STATE.viewer3d.setFieldMode) STATE.viewer3d.setFieldMode(i);
  applyLegend(i);
  astroDuck.recordMode(i);                       // achievement: all 3D fields
  astroDuck.update3DGuide(FIELD_MODES[i].label); // refresh guide line if shown
}
function setSource(src) {
  m3dSource = src === "real" ? "real" : "model";
  $$("#m3dSource .m3d-segbtn").forEach((b) => {
    const on = b.dataset.src === m3dSource;
    b.classList.toggle("on", on);
    b.setAttribute("aria-pressed", String(on));
  });
  if (STATE.viewer3d && STATE.viewer3d.setSource) STATE.viewer3d.setSource(m3dSource);
  applyLegend(m3dMode);   // keep the legend provenance honest (rCFD field ↔ analytic model)
}
function applyLegend(i) {
  const m = FIELD_MODES[i];
  $("#m3dCbar").style.background = legendGradient(m.cmap);
  $("#m3dTicks").innerHTML = (m.ticks || []).map((t) => `<span>${esc(t)}</span>`).join("");
  // in Model mode every layer comes from the analytic laminar field, so don't
  // keep claiming "rCFD field" — state the real provenance instead.
  const prov = m3dSource === "model" ? "model · analytic laminar" : m.prov;
  $("#m3dLegName").innerHTML = esc(m.label) + ` <em>· ${esc(prov)}</em>`;
}

function applyTime() {
  const v = Number($("#m3dTimeRange").value) / 100;
  $("#m3dTimeLabel").textContent = `t = ${Math.round(v * 600)} s`;
  if (STATE.viewer3d && STATE.viewer3d.setTime) STATE.viewer3d.setTime(v);
}

/* export a clean publication figure: the 3D render + a colorbar + caption */
function exportFigure() {
  if (!STATE.viewer3d || !STATE.viewer3d.snapshot) return;
  const url = STATE.viewer3d.snapshot();
  if (!url) return toast("Could not capture the view.");
  const img = new Image();
  img.onload = () => {
    const c = el("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight;
    const x = c.getContext("2d");
    x.fillStyle = "#05070f"; x.fillRect(0, 0, c.width, c.height);
    x.drawImage(img, 0, 0);
    drawColorbar(x, c.width, c.height, m3dMode);
    x.fillStyle = "#cdd7ee"; x.textAlign = "left";
    x.font = `600 ${Math.round(c.height * 0.026)}px monospace`;
    x.fillText(`Buoyant jet · rCFD · Re~100 laminar · ${FIELD_MODES[m3dMode].label}`, 18, c.height - 20);
    const a = el("a", { href: c.toDataURL("image/png"), download: `buoyant-jet-${FIELD_MODES[m3dMode].id}.png` });
    document.body.appendChild(a); a.click(); a.remove();
    toast("Figure saved");
  };
  img.src = url;
}
function drawColorbar(x, W, H, mode) {
  const m = FIELD_MODES[mode];
  const bw = Math.max(16, W * 0.016), bh = H * 0.42, bx = W - bw - 82, by = (H - bh) / 2;
  for (let i = 0; i < bh; i++) {
    const t = 1 - i / bh; const [r, g, b] = sampleCmap(m.cmap, t);
    x.fillStyle = `rgb(${r},${g},${b})`; x.fillRect(bx, by + i, bw, 1);
  }
  x.strokeStyle = "rgba(255,255,255,0.45)"; x.lineWidth = 1; x.strokeRect(bx, by, bw, bh);
  x.fillStyle = "#cdd7ee"; x.font = `${Math.round(H * 0.02)}px monospace`; x.textAlign = "left";
  (m.ticks || []).forEach((t, k) => {
    if (!t) return; const ty = by + (k / (m.ticks.length - 1)) * bh;
    x.fillText(t, bx + bw + 8, ty + 4);
  });
  x.save(); x.translate(bx - 10, by + bh / 2); x.rotate(-Math.PI / 2); x.textAlign = "center";
  x.fillText(m.label, 0, 0); x.restore();
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
