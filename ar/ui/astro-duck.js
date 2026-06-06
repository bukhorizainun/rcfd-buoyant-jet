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
      Welcome aboard — I'm your buoyant-jet co-pilot. Let's go chase some vortices.
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
  heatloss: "Now the gauntlet: add wall heat loss and my frozen replay catches only ~24% of the cooling.",
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
