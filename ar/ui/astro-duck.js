/* ui/astro-duck.js — "Astro Duck", the holographic scientific guide.
 *
 * Astro Duck is the JKU Astros mascot reimagined as a PhD research assistant:
 * a semi-transparent, cyan-glowing holographic guide in the spirit of NASA
 * educational exhibits / MIT Museum installations — professional, not cartoonish.
 *
 * Four appearance points (the ones that matter for a thesis demo):
 *   1. Welcome      — floating duck + speech bubble on the start card.
 *   2. Detection    — brief celebration overlay when the poster is found / demo opens.
 *   3. Research tour — contextual narration as each hotspot opens in Research Mode.
 *   4. Ask the Duck  — avatar + status in the assistant panel (wired in index.html/chat.js).
 *
 * Pure DOM + CSS; no dependencies beyond core/utils. Every entry point is
 * idempotent and defensive so it never breaks the rest of the app.
 */
import { $, el } from "../core/utils.js";
import { STATE } from "../core/state.js";

/* ---- the holographic Astro Duck mark (inline SVG) ----
 * Cute-but-intellectual: plump proportions, a big bright eye and a faint blush
 * (charm) paired with round "scholar" glasses, an astro helmet + instrument
 * antenna, and a streamline motif (the academic signal). Rendered in cyan glass
 * so it reads as a high-tech research hologram, never a toy. */
export function duckSVG(extraClass = "") {
  return `
  <svg class="ad-svg ${extraClass}" viewBox="0 0 48 48" aria-hidden="true">
    <g class="ad-body">
      <rect x="28" y="22" width="7" height="13" rx="3.2" class="ad-pack"/>
      <ellipse cx="23.5" cy="30.5" rx="12.5" ry="9.2"/>
      <circle cx="18" cy="16.5" r="8"/>
      <path class="ad-visor" d="M10.2 17.5a8 8 0 0 1 15.6 0"/>
      <line x1="18" y1="8.6" x2="18" y2="5.2"/>
      <circle cx="18" cy="4.2" r="1.3" class="ad-anten"/>
      <path class="ad-beak" d="M25 15.6q5 .4 5.7 2.4q-.7 2-5.7 2.2z"/>
      <circle cx="16.4" cy="17.1" r="3" class="ad-glass"/>
      <circle cx="22.2" cy="16.7" r="2.3" class="ad-glass"/>
      <line x1="19.4" y1="16.9" x2="19.9" y2="16.8" class="ad-glass"/>
      <circle cx="16.4" cy="17.1" r="1.5" class="ad-eye"/>
      <circle cx="17.1" cy="16.5" r=".55" class="ad-eyehi"/>
      <circle cx="13.3" cy="19.6" r="1.4" class="ad-blush"/>
      <path class="ad-stream" d="M9 41.5c3 0 3-2.2 6-2.2s3 2.2 6 2.2 3-2.2 6-2.2 3 2.2 6 2.2"/>
    </g>
  </svg>`;
}

/* Jetpack particle layer (a few rising dots), reused by the floating variants. */
function particlesHTML() {
  return `<span class="ad-particles">${"<i></i>".repeat(4)}</span>`;
}

/* ============================== 1. WELCOME ============================== */
export function mountWelcome() {
  const card = document.querySelector("#start .start-card");
  if (!card || $("#adWelcome")) return;
  const node = el("div", { id: "adWelcome", class: "astro-duck ad-welcome" });
  node.innerHTML = `
    ${particlesHTML()}
    <div class="ad-figure">${duckSVG()}</div>
    <div class="ad-bubble">
      <b>Astro&nbsp;Duck</b>
      Hello guys — I'm your buoyant-jet co-pilot. Let's go chase some vortices.
    </div>`;
  card.appendChild(node);
  requestAnimationFrame(() => node.classList.add("show"));
}
export function unmountWelcome() {
  const n = $("#adWelcome"); if (n) n.remove();
}

/* ============================ 2. DETECTION ============================= */
let celebrateTimer = null;
export function celebrate(text = "Poster locked on. Time to explore the flow physics.") {
  let node = $("#adCelebrate");
  if (!node) {
    node = el("div", { id: "adCelebrate", class: "ad-celebrate" });
    node.innerHTML = `
      <div class="ad-scan"></div>
      <div class="astro-duck ad-hero">
        ${particlesHTML()}
        <div class="ad-figure">${duckSVG("ad-glow")}</div>
        <div class="ad-bubble ad-bubble-center"><b>Astro&nbsp;Duck</b><span class="ad-say"></span></div>
      </div>`;
    document.body.appendChild(node);
  }
  node.querySelector(".ad-say").textContent = text;
  node.classList.remove("hidden");
  // restart the entrance + scan animation
  node.classList.remove("show"); void node.offsetWidth; node.classList.add("show");
  clearTimeout(celebrateTimer);
  celebrateTimer = setTimeout(() => {
    node.classList.remove("show");
    setTimeout(() => node.classList.add("hidden"), 600);
  }, 3000);
}

/* ========================== 3. RESEARCH TOUR ========================== */
const TOUR = {
  _intro: "Start here — tap each glowing point and I'll do the narrating.",
  geometry: "First, the test case: a warm jet floating up by buoyancy in a sealed tank. A classic.",
  setup:    "A crisp 1 mm grid keeps my shift maps honest — and yes, the jet is laminar.",
  workflow: "Here's the trick: record the flow once, then replay it. No re-solving, no sweat.",
  mixing:   "One knob — f_sd. It puts back the mixing the shift forgets. Watch the trade-off.",
  results:  "~263× faster, and the best f_sd depends on what you measure. Rather elegant, no?",
  heatloss: "Now the gauntlet: turn wall heat loss up to h = 100 and my frozen replay catches only about a third of the cooling.",
};

function ensureGuide() {
  let g = $("#adGuide");
  if (!g) {
    g = el("div", { id: "adGuide", class: "astro-duck ad-guide" });
    g.innerHTML = `
      ${particlesHTML()}
      <div class="ad-figure">${duckSVG()}</div>
      <div class="ad-bubble"><b>Astro&nbsp;Duck</b><span class="ad-say"></span></div>`;
    document.body.appendChild(g);
  }
  return g;
}
export function startTour() {
  const g = ensureGuide();
  g.querySelector(".ad-say").textContent = TOUR._intro;
  g.classList.remove("hidden");
  requestAnimationFrame(() => g.classList.add("show"));
}
export function tourStep(hotspotId) {
  const g = $("#adGuide");
  if (!g || g.classList.contains("hidden")) return;
  const line = TOUR[hotspotId];
  if (!line) return;
  const say = g.querySelector(".ad-say");
  say.textContent = line;
  g.classList.remove("pop"); void g.offsetWidth; g.classList.add("pop");
}
export function stopTour() {
  const g = $("#adGuide");
  if (!g) return;
  g.classList.remove("show");
  setTimeout(() => g.classList.add("hidden"), 350);
}

/* ====================== 4. ASK-THE-DUCK PANEL ========================= */
/* Small avatar markup placed beside a chat answer (used by ui/chat.js). */
export function answerAvatar() {
  return `<span class="ad-mini" aria-hidden="true">${duckSVG()}</span>`;
}

/* small reusable "guide" node: a mini duck + a one-line bubble, used by the
 * timeline companion and the 3D viewer guide. */
function makeGuideNode(id, cls) {
  const n = el("div", { id, class: "astro-duck " + cls });
  n.innerHTML = `<div class="ad-figure ad-figure-sm">${duckSVG()}</div>
                 <div class="ad-bubble"><b>Astro&nbsp;Duck</b><span class="ad-say"></span></div>`;
  return n;
}
function setSay(node, text) {
  if (!node) return;
  const s = node.querySelector(".ad-say"); if (s) s.textContent = text;
  node.classList.remove("pop"); void node.offsetWidth; node.classList.add("pop");
}

/* ===================== 5. TIMELINE COMPANION ========================= */
/* Astro Duck rides above the timeline slider and calls out the key moments.
 * Wording is laminar-honest (this is a Re~100 case — no turbulent "coherent
 * structures"); milestones align with the real events (warm inlet off at 315 s). */
const TL_MILE = [
  { t: 120, say: "The warm plume is climbing — a stratified layer forms under the ceiling." },
  { t: 315, say: "Warm inlet switches off here — this is peak heat content." },
  { t: 450, say: "Cold inlet now flushes the tank; the warm layer slowly relaxes." },
  { t: 600, say: "End of the run — a slow, quasi-steady cool-down." },
];
let tlSeen = new Set();
export function mountTimelineCompanion() {
  const panel = $("#panel-timeline");
  if (!panel || $("#adTimeline")) return;
  const n = makeGuideNode("adTimeline", "ad-timeline");
  panel.appendChild(n);
  tlSeen = new Set();
  timelineSeek(Number(($("#tlSlider") || {}).value || 0));
}
export function timelineSeek(t) {
  const n = $("#adTimeline"), slider = $("#tlSlider");
  if (!n || !slider) return;
  const max = Number(slider.max) || 600;
  const frac = Math.max(0, Math.min(1, t / max));
  // offsetLeft/Top share the same coordinate space as the absolutely-positioned
  // companion (both resolve against the fixed #panel-timeline) — no padding skew.
  const x = slider.offsetLeft + frac * slider.offsetWidth;
  const y = slider.offsetTop;
  n.style.left = x + "px";
  n.style.top = y + "px";
  n.classList.add("show");
  // fire the nearest milestone once, when the playhead reaches it
  for (const m of TL_MILE) {
    if (t >= m.t - 6 && !tlSeen.has(m.t)) {
      tlSeen.add(m.t);
      setSay(n, m.say);
      n.classList.add("milestone");
      recordMilestone(m.t);
    }
  }
}

/* ====================== 6. 3D VIEWER GUIDE =========================== */
const M3D_LINES = {
  Temperature: "The warm core is the rising buoyant plume; cooler fluid settles below.",
  Velocity:    "Follow the loops — two steady counter-rotating recirculation vortices.",
  Density:     "Density is derived from temperature (Boussinesq): warmer means lighter.",
  Buoyancy:    "Buoyancy is the upward push on the warm fluid — the engine of the flow.",
};
export function set3DGuide(on, modeLabel) {
  const host = $("#model3dCanvas");
  if (!host) return;
  let n = $("#adModel3DGuide");
  if (on) {
    if (!n) { n = makeGuideNode("adModel3DGuide", "ad-m3d"); host.appendChild(n); }
    update3DGuide(modeLabel);
    requestAnimationFrame(() => n.classList.add("show"));
  } else if (n) {
    n.classList.remove("show");
  }
}
export function update3DGuide(modeLabel) {
  const n = $("#adModel3DGuide");
  if (!n) return;
  setSay(n, M3D_LINES[modeLabel] || "Drag to orbit; toggle fields, a slice plane and time.");
}

/* ====================== 7. ACHIEVEMENTS ============================== */
/* Quiet, tasteful "discoveries". Progress persists in localStorage so a badge
 * is announced only once per visitor. */
const AKEY = "astroduck_ach_v1";
function aLoad() { try { return JSON.parse(localStorage.getItem(AKEY)) || {}; } catch (e) { return {}; } }
function aSave(s) { try { localStorage.setItem(AKEY, JSON.stringify(s)); } catch (e) {} }
function aRecord(bucket, item, need, badge) {
  const s = aLoad();
  const arr = s[bucket] = s[bucket] || [];
  if (!arr.includes(item)) arr.push(item);
  s.awarded = s.awarded || [];
  if (arr.length >= need && !s.awarded.includes(badge.name)) {
    s.awarded.push(badge.name); aSave(s); announceBadge(badge);
  } else { aSave(s); }
}
export function recordHotspot(id) {
  const need = (STATE.hotspots && STATE.hotspots.hotspots) ? STATE.hotspots.hotspots.length : 6;
  aRecord("hotspots", id, need, { name: "CFD Explorer", desc: "Opened every hotspot on the poster." });
}
export function recordMilestone(t) {
  aRecord("milestones", t, TL_MILE.length, { name: "Flow Historian", desc: "Followed the flow through all its key moments." });
}
export function recordMode(i) {
  aRecord("modes", i, 4, { name: "Scientific Visualizer", desc: "Viewed every 3D scientific field." });
}
function announceBadge(badge) {
  let n = $("#adBadge");
  if (!n) {
    n = el("div", { id: "adBadge", class: "ad-badge" });
    n.innerHTML = `<div class="ad-badge-card">
        <div class="ad-figure ad-figure-sm">${duckSVG("ad-glow")}</div>
        <div class="ad-badge-txt"><small>Achievement unlocked</small>
          <b class="ad-badge-name"></b><span class="ad-badge-desc"></span></div>
      </div>`;
    document.body.appendChild(n);
  }
  n.querySelector(".ad-badge-name").textContent = badge.name;
  n.querySelector(".ad-badge-desc").textContent = badge.desc;
  n.classList.remove("hidden", "show"); void n.offsetWidth; n.classList.add("show");
  clearTimeout(announceBadge._t);
  announceBadge._t = setTimeout(() => {
    n.classList.remove("show");
    setTimeout(() => n.classList.add("hidden"), 500);
  }, 4200);
}

/* ====================== 9. PRESENTATION MODE ========================= */
/* A guided, conference-grade walk-through. Astro Duck presents the thesis in
 * five beats; `hooks` lets the app open the matching panel for each beat. */
const TALK = [
  { k: "Problem",       say: "The problem: full CFD of long, slow heat transport is wasteful — the flow repeats within ~30 s while the temperature evolves for 600 s." },
  { k: "Method",        say: "The method: recurrence CFD. Record the flow once as cell-to-cell shift maps, then replay them to transport heat — no Navier–Stokes during replay.", panel: "model3d" },
  { k: "Results",       say: "Results: rCFD reproduces the field ~263× faster; the mixing parameter f_sd = 0.5 best reproduces the thermal stratification.", panel: "comparison" },
  { k: "Contributions", say: "Contribution: a Windows/Fluent port, a characterised f_sd, and a wall-heat-loss stress test that quantifies the reuse limit — at h = 100 rCFD recovers only about a third of the cooling.", panel: "insights" },
  { k: "Future work",   say: "Future work: record a non-adiabatic (or multi-regime) database so the replay carries the cooling-driven overturning the frozen one misses.", panel: "dashboard" },
];
let talkStep = 0, talkHooks = null, talkTimer = null;
export function startPresentation(hooks) {
  talkHooks = hooks || {};
  talkStep = 0;
  let n = $("#adPresent");
  if (!n) {
    n = el("div", { id: "adPresent", class: "ad-present" });
    n.innerHTML = `
      <div class="ad-present-stage">
        <div class="astro-duck ad-presenter show">
          ${particlesHTML()}
          <div class="ad-figure">${duckSVG("ad-glow")}</div>
          <div class="ad-bubble ad-bubble-center">
            <b class="ad-talk-k">Astro Duck</b><span class="ad-say"></span></div>
        </div>
        <div class="ad-present-dots"></div>
        <div class="ad-present-ctl">
          <button type="button" class="ad-btn-ghost" data-ad="stop">Exit</button>
          <button type="button" class="ad-btn-primary" data-ad="next">Next ›</button>
        </div>
      </div>`;
    document.body.appendChild(n);
    n.querySelector('[data-ad="next"]').addEventListener("click", () => talkAdvance(1));
    n.querySelector('[data-ad="stop"]').addEventListener("click", stopPresentation);
    n.querySelector(".ad-present-dots").innerHTML =
      TALK.map((_, i) => `<i data-i="${i}"></i>`).join("");
  }
  n.classList.remove("hidden");
  requestAnimationFrame(() => n.classList.add("show"));
  talkRender();
}
function talkRender() {
  const n = $("#adPresent"); if (!n) return;
  const beat = TALK[talkStep];
  n.querySelector(".ad-talk-k").textContent = "Astro Duck · " + beat.k;
  setSay(n.querySelector(".ad-presenter"), beat.say);
  n.querySelectorAll(".ad-present-dots i").forEach((d, i) =>
    d.classList.toggle("on", i === talkStep));
  n.querySelector('[data-ad="next"]').textContent =
    talkStep >= TALK.length - 1 ? "Finish" : "Next ›";
  if (beat.panel && talkHooks.openPanel) talkHooks.openPanel(beat.panel);
  clearTimeout(talkTimer);
  talkTimer = setTimeout(() => talkAdvance(1), 11000);   // gentle auto-advance
}
function talkAdvance(d) {
  talkStep += d;
  if (talkStep >= TALK.length) return stopPresentation();
  if (talkStep < 0) talkStep = 0;
  talkRender();
}
export function stopPresentation() {
  clearTimeout(talkTimer);
  const n = $("#adPresent"); if (!n) return;
  n.classList.remove("show");
  setTimeout(() => n.classList.add("hidden"), 400);
  if (talkHooks && talkHooks.closeAll) talkHooks.closeAll();
}

/* ====================== 8. EASTER EGG (hidden) ======================= */
/* Deliberately hidden + opt-in (no random distraction): tapping the panel
 * avatar five times sends Astro Duck for a quick ride around a recirculation
 * vortex. Tasteful, brief, dismisses itself. */
let eggTaps = 0, eggTimer = null;
export function nudgeEasterEgg() {
  eggTaps++;
  clearTimeout(eggTimer);
  eggTimer = setTimeout(() => { eggTaps = 0; }, 1500);
  if (eggTaps >= 5) { eggTaps = 0; flourish(); }
}
function flourish() {
  let n = $("#adEgg");
  if (!n) {
    n = el("div", { id: "adEgg", class: "ad-egg" });
    n.innerHTML = `<div class="ad-egg-orbit"><div class="ad-figure ad-figure-sm">${duckSVG("ad-glow")}</div></div>
      <div class="ad-bubble ad-bubble-center ad-egg-say">Wheee — surfing a recirculation vortex. Back to science in 3, 2, 1…</div>`;
    document.body.appendChild(n);
  }
  n.classList.remove("hidden", "show"); void n.offsetWidth; n.classList.add("show");
  clearTimeout(flourish._t);
  flourish._t = setTimeout(() => {
    n.classList.remove("show");
    setTimeout(() => n.classList.add("hidden"), 500);
  }, 4200);
}
