/* ui/hotspots.js — hotspots, hierarchical popup, and Research-Mode explainers
 * (Features 3 + 4 + 2).
 */
import { $, el, esc } from "../core/utils.js";
import { STATE } from "../core/state.js";
import * as memory from "../ai/memory.js";
import { renderAnswer } from "./chat.js";
import * as astroDuck from "./astro-duck.js";

/* ---- on-screen demo hotspots (poster shown on the page) ---- */
export function renderDemoHotspots() {
  const wrap = $("#demoHotspots");
  wrap.innerHTML = "";
  STATE.hotspots.hotspots.forEach((h) => {
    const dot = el("button", {
      class: "hotspot" + (h.labelDir ? " lbl-" + h.labelDir : ""),
      style: `left:${h.u * 100}%; top:${h.v * 100}%; --c:${h.color || "#36d1ff"}`,
      "aria-label": h.label,
    }, `<span class="dot"></span><span class="tag">${esc(h.label)}</span>`);
    dot.addEventListener("click", () => openPopup(h));
    wrap.appendChild(dot);
  });
}

/* ---- hotspot popup: static info + Level-2 questions + explainer ---- */
export function openPopup(h) {
  memory.recordHotspot(h.id);
  const research = STATE.researchMode;
  if (research) astroDuck.tourStep(h.id);   // Astro Duck narrates the guided tour

  $("#popupEyebrow").textContent = research ? "Explainer · " + h.label : "Poster · " + h.label;
  $("#popupTitle").textContent = h.label || "";
  $("#popupBody").textContent = h.body || "";

  const media = $("#popupMedia");
  media.innerHTML = "";
  media.classList.add("hidden");
  if (h.image) {
    media.appendChild(el("img", { src: h.image, alt: h.label, loading: "lazy" }));
    media.classList.remove("hidden");
  } else if (h.diagram && DIAGRAMS[h.diagram]) {
    media.innerHTML = DIAGRAMS[h.diagram](h.color || "#36d1ff");
    media.classList.remove("hidden");
  }

  $("#popupStats").innerHTML = (h.stats || []).map((s) =>
    `<div class="stat"><span class="k">${esc(s.k)}</span><span class="v">${esc(s.v)}</span></div>`).join("");

  // Level-2 sub-questions (Feature 4)
  const subsWrap = $("#popupSubs");
  const explainer = $("#popupExplainer");
  explainer.innerHTML = "";
  subsWrap.innerHTML = "";
  (h.subs || []).forEach((s) => {
    const b = el("button", { class: "sub-q", type: "button" }, esc(s.label) + " ›");
    b.addEventListener("click", () => {
      subsWrap.querySelectorAll(".sub-q").forEach((x) => x.classList.remove("on"));
      b.classList.add("on");
      renderAnswer(explainer, { intentId: s.id });
      explainer.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
    subsWrap.appendChild(b);
  });
  $("#popupSubsLabel").textContent = (h.subs && h.subs.length) ? "Dig deeper" : "";

  // Research Mode: open straight into the explainer for the hotspot's topic
  const card = $("#popup .popup-card");
  card.classList.toggle("research", research);
  if (research && h.topic) renderAnswer(explainer, { intentId: h.topic });

  $("#popup").classList.remove("hidden");
}

/* ---- inline SVG schematics (geometry / mesh / boundary) ---- */
export const DIAGRAMS = {
  geometry(col) {
    return `<svg viewBox="0 0 320 200" role="img" aria-label="Tank geometry schematic">
      <defs><linearGradient id="g_water" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#16407a"/><stop offset="1" stop-color="#0a1f44"/></linearGradient>
        <marker id="arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
        <path d="M0 0 L6 3 L0 6 z" fill="${col}"/></marker></defs>
      <rect x="70" y="30" width="180" height="140" rx="4" fill="url(#g_water)" stroke="${col}" stroke-width="2"/>
      <text x="160" y="22" fill="#9fb0d0" font-size="11" text-anchor="middle" font-family="JetBrains Mono">closed water tank · 293 K</text>
      <rect x="40" y="93" width="30" height="14" fill="${col}"/>
      <path d="M70 100 H160" stroke="${col}" stroke-width="3" marker-end="url(#arr)"/>
      <text x="42" y="125" fill="${col}" font-size="10" font-family="JetBrains Mono">jet 0.02 m/s</text>
      <path d="M150 100 q30 -40 60 -60" stroke="#ff6b6b" stroke-width="3" fill="none" opacity="0.8"/>
      <path d="M150 100 q40 -30 80 -50" stroke="#ffb02e" stroke-width="2" fill="none" opacity="0.7"/>
      <text x="232" y="46" fill="#ff8a8a" font-size="10" font-family="JetBrains Mono">warm rises</text>
      <path d="M258 30 V170" stroke="#9fb0d0" stroke-width="1"/>
      <text x="264" y="105" fill="#9fb0d0" font-size="10" font-family="JetBrains Mono">7.5 cm</text>
    </svg>`;
  },
  mesh(col) {
    let cells = "";
    const x0 = 70, y0 = 40, w = 180, h = 120, n = 18, m = 12;
    const dx = w / n, dy = h / m;
    for (let i = 0; i <= n; i++) cells += `<line x1="${x0 + i * dx}" y1="${y0}" x2="${x0 + i * dx}" y2="${y0 + h}" stroke="${col}" stroke-width="0.5" opacity="0.5"/>`;
    for (let j = 0; j <= m; j++) cells += `<line x1="${x0}" y1="${y0 + j * dy}" x2="${x0 + w}" y2="${y0 + j * dy}" stroke="${col}" stroke-width="0.5" opacity="0.5"/>`;
    return `<svg viewBox="0 0 320 200" role="img" aria-label="Structured mesh schematic">
      <rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="#0a1f44" stroke="${col}" stroke-width="2"/>
      ${cells}
      <rect x="${x0 + 5 * dx}" y="${y0 + 5 * dy}" width="${dx}" height="${dy}" fill="${col}" opacity="0.9"/>
      <text x="160" y="28" fill="#9fb0d0" font-size="11" text-anchor="middle" font-family="JetBrains Mono">structured cubic cells</text>
      <text x="160" y="182" fill="${col}" font-size="11" text-anchor="middle" font-family="JetBrains Mono">1 mm per cell</text>
    </svg>`;
  },
  boundary(col) {
    return `<svg viewBox="0 0 320 200" role="img" aria-label="Boundary conditions: inlet and outlet pipes">
      <defs>
        <marker id="bcIn" markerWidth="9" markerHeight="9" refX="6" refY="3" orient="auto">
          <path d="M0 0 L6 3 L0 6 z" fill="${col}"/></marker>
        <marker id="bcOut" markerWidth="9" markerHeight="9" refX="6" refY="3" orient="auto">
          <path d="M0 0 L6 3 L0 6 z" fill="#9fb0d0"/></marker>
        <linearGradient id="bcPipe" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#c7d4ea"/><stop offset="0.5" stop-color="#7f93b4"/>
          <stop offset="1" stop-color="#54657f"/></linearGradient>
      </defs>

      <!-- closed tank -->
      <rect x="96" y="46" width="128" height="108" rx="3" fill="#0a1f44" stroke="#9fb0d0" stroke-width="2"/>
      <text x="160" y="38" fill="#9fb0d0" font-size="10" text-anchor="middle" font-family="JetBrains Mono">no-slip walls · laminar</text>

      <!-- inlet pipe (left, through the wall at mid-height) -->
      <rect x="18" y="93" width="82" height="16" rx="3" fill="url(#bcPipe)" stroke="#34425a" stroke-width="1"/>
      <line x1="20" y1="96.5" x2="98" y2="96.5" stroke="#eef4ff" stroke-width="1" opacity="0.65"/>
      <path d="M30 101 H88" stroke="${col}" stroke-width="3" marker-end="url(#bcIn)"/>
      <text x="14" y="84" fill="${col}" font-size="10" font-family="JetBrains Mono">inlet</text>
      <text x="12" y="130" fill="${col}" font-size="9.5" font-family="JetBrains Mono">U = 0.02 m/s</text>
      <text x="12" y="142" fill="#ff8a8a" font-size="9.5" font-family="JetBrains Mono">T = 333 K</text>

      <!-- warm jet through the tank -->
      <path d="M100 101 H220" stroke="${col}" stroke-width="2.5" opacity="0.5"/>

      <!-- outlet pipe (right, through the wall at mid-height) -->
      <rect x="220" y="93" width="82" height="16" rx="3" fill="url(#bcPipe)" stroke="#34425a" stroke-width="1"/>
      <line x1="222" y1="96.5" x2="300" y2="96.5" stroke="#eef4ff" stroke-width="1" opacity="0.65"/>
      <path d="M236 101 H296" stroke="#9fb0d0" stroke-width="3" marker-end="url(#bcOut)"/>
      <text x="306" y="84" fill="#9fb0d0" font-size="10" text-anchor="end" font-family="JetBrains Mono">outlet</text>
      <text x="306" y="130" fill="#9fb0d0" font-size="9.5" text-anchor="end" font-family="JetBrains Mono">pressure outlet</text>

      <text x="160" y="176" fill="${col}" font-size="11" text-anchor="middle" font-family="JetBrains Mono">Re = U·D/ν ≈ 100</text>
    </svg>`;
  },
};
