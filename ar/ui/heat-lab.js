/* ui/heat-lab.js — Step 2 "Heat-Loss Lab"
 *
 * Brings the printed poster's Step-2 section to life with two things:
 *   1. The heat-loss MODEL — Newton's cooling law applied as a thin surface
 *      sink, and the convective overturning loop that the frozen rCFD replay
 *      cannot carry (the reason it under-cools).
 *   2. An interactive THERMAL LAB — pick a wall heat-transfer coefficient h
 *      and read the real measured rCFD cooling, energy removed and wall flux,
 *      with a schematic tank that cools and an infrared view.
 *
 * Every number is a real Step-2 value from the rCFD study (the h-sweep and the
 * CFD reference) — no placeholders. Pure DOM/SVG, no heavy dependencies.
 */

const T_INF       = 293;     // ambient room temperature (K)
const CFD_COOL_H8 = 1.45;    // CFD reference cooling at the physical h = 8 (K)
const COOL_MAX    = 4.45;    // rCFD cooling at h = 200 (top of sweep) — scaling

// rCFD wall-heat-loss sweep (measured). cool = ΔT_mean against the adiabatic
// baseline; energy = ∫Q_wall dt (J); qmax = peak wall heat-loss rate (W).
const CASES = [
  { h: 0,   label: "Adiabatic", cool: 0.00, tend: 307.49, energy: 0,    qmax: 0.00 },
  { h: 8,   label: "h = 8",     cool: 0.36, tend: 307.14, energy: 179,  qmax: 0.34, physical: true },
  { h: 50,  label: "h = 50",    cool: 1.85, tend: 305.64, energy: 966,  qmax: 1.94 },
  { h: 100, label: "h = 100",   cool: 3.03, tend: 304.46, energy: 1680, qmax: 3.57 },
  { h: 200, label: "h = 200",   cool: 4.45, tend: 303.04, energy: 2707, qmax: 6.33 },
];

let built = false, idx = 1, ir = false;

export function renderHeatLab() {
  const host = document.getElementById("heatLabBody");
  if (!host) return;
  if (!built) { host.innerHTML = template(); wire(host); built = true; }
  update();
}

/* --------------------------------------------------------------------- */
function template() {
  return `
  <!-- the model: Newton's cooling law as a surface sink -->
  <div class="hl-model">
    <div class="hl-model-eq">q&#775;<sub>wall</sub> = h &middot; (T<sub>top</sub> &minus; T<sub>&infin;</sub>)</div>
    <p class="hl-model-txt">Warm water at the free surface gives up heat to the room air. We add it as a
    gentle sink in the thin layer of cells just under the surface — the bottom and side walls barely conduct.</p>
    <div class="hl-chips">
      <span class="hl-chip">T<sub>&infin;</sub> = 293 K</span>
      <span class="hl-chip">h &asymp; 8 W/m&sup2;K</span>
      <span class="hl-chip">surface-only sink</span>
      <span class="hl-chip">booked in the balance</span>
    </div>
  </div>

  <!-- the mechanism: why the frozen replay under-cools -->
  <div class="hlab-mech">
    <figure class="hlab-mini">
      <svg viewBox="0 0 140 130" role="img" aria-label="Real CFD: an overturning loop keeps heat leaving">
        <defs>
          <marker id="hlHeadUp" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" fill="currentColor"/>
          </marker>
        </defs>
        <rect class="hlab-mtank" x="16" y="20" width="108" height="94" rx="6"/>
        <line class="hlab-msurf" x1="16" y1="21" x2="124" y2="21"/>
        <g class="hlab-mflux">
          <line class="hlab-marrow" x1="54" y1="20" x2="54" y2="7" marker-end="url(#hlHeadUp)"/>
          <line class="hlab-marrow d2" x1="86" y1="20" x2="86" y2="7" marker-end="url(#hlHeadUp)"/>
        </g>
        <path id="hlabLoop" class="hlab-loop hlab-loopflow" d="M 70 30 C 100 30 100 104 70 104 C 40 104 40 30 70 30 Z"/>
        <circle class="hlab-parcel" r="5" fill="#e0512a">
          <animateMotion dur="6s" repeatCount="indefinite"><mpath href="#hlabLoop"/></animateMotion>
          <animate attributeName="fill" dur="6s" repeatCount="indefinite" keyTimes="0;0.3;0.55;0.85;1" values="#e0512a;#2f6fb8;#2f6fb8;#e0512a;#e0512a"/>
        </circle>
        <circle class="hlab-parcel" r="4.2" fill="#2f6fb8">
          <animateMotion dur="6s" begin="-3s" repeatCount="indefinite"><mpath href="#hlabLoop"/></animateMotion>
          <animate attributeName="fill" dur="6s" begin="-3s" repeatCount="indefinite" keyTimes="0;0.3;0.55;0.85;1" values="#e0512a;#2f6fb8;#2f6fb8;#e0512a;#e0512a"/>
        </circle>
      </svg>
      <figcaption><b>Real CFD.</b> Warm rises, cools at the top, sinks — the overturning keeps feeding the surface, so the loss stays strong.</figcaption>
    </figure>
    <figure class="hlab-mini">
      <svg viewBox="0 0 140 130" role="img" aria-label="rCFD replay: the frozen flow stalls and cools in place">
        <rect class="hlab-mtank" x="16" y="20" width="108" height="94" rx="6"/>
        <line class="hlab-msurf" x1="16" y1="21" x2="124" y2="21"/>
        <g class="hlab-mflux">
          <line class="hlab-marrow weak" x1="62" y1="20" x2="62" y2="10" marker-end="url(#hlHeadUp)"/>
          <line class="hlab-marrow weak d2" x1="86" y1="20" x2="86" y2="10" marker-end="url(#hlHeadUp)"/>
        </g>
        <path class="hlab-loop faint" d="M 70 30 C 100 30 100 104 70 104 C 40 104 40 30 70 30 Z"/>
        <path id="hlabRise" d="M 70 104 C 54 74 52 46 64 34" fill="none" stroke="none"/>
        <circle class="hlab-stall" cx="64" cy="34" r="4" fill="#2f6fb8"/>
        <circle class="hlab-parcel" r="5" fill="#e0512a">
          <animateMotion dur="6s" repeatCount="indefinite" calcMode="linear" keyPoints="0;1;1" keyTimes="0;0.34;1"><mpath href="#hlabRise"/></animateMotion>
          <animate attributeName="fill" dur="6s" repeatCount="indefinite" keyTimes="0;0.32;0.6;1" values="#e0512a;#e0512a;#2f6fb8;#2f6fb8"/>
          <animate attributeName="opacity" dur="6s" repeatCount="indefinite" keyTimes="0;0.1;0.74;1" values="0;1;1;0"/>
        </circle>
      </svg>
      <figcaption><b>rCFD replay.</b> The reused adiabatic flow never had that loop, so the parcel stalls at the top and cools in place — the loss fades.</figcaption>
    </figure>
  </div>

  <!-- the interactive thermal lab -->
  <div class="hlab-bar">
    <span class="hlab-bar-lbl">heat-transfer coefficient h</span>
    <div class="hlab-h" id="hlabH" role="group" aria-label="Heat-transfer coefficient">
      ${CASES.map((c, i) => `<button class="hlab-hb${i === idx ? " on" : ""}" type="button" data-i="${i}">${c.label}</button>`).join("")}
    </div>
    <button class="hlab-ir" id="hlabIR" type="button" aria-pressed="false">Infrared view</button>
  </div>

  <div class="hlab-stage">
    <figure class="hlab-tank" id="hlabTank">
      <svg viewBox="0 0 240 196" role="img" aria-label="Tank cooling under wall heat loss">
        <rect class="hlab-water" x="36" y="30" width="168" height="150" rx="7"/>
        <rect class="hlab-cap"   id="hlabCap" x="36" y="30" width="168" height="0" rx="7"/>
        <line class="hlab-strat" x1="40" y1="78"  x2="200" y2="78"/>
        <line class="hlab-strat" x1="40" y1="118" x2="200" y2="118"/>
        <rect class="hlab-tankline" x="36" y="30" width="168" height="150" rx="7"/>
        <line class="hlab-surf" x1="36" y1="30" x2="204" y2="30"/>
        <g id="hlabFlux">
          <line class="hlab-arrow" x1="64"  y1="30" x2="64"  y2="8" marker-end="url(#hlHeadUp)"/>
          <line class="hlab-arrow" x1="96"  y1="30" x2="96"  y2="8" marker-end="url(#hlHeadUp)"/>
          <line class="hlab-arrow" x1="128" y1="30" x2="128" y2="8" marker-end="url(#hlHeadUp)"/>
          <line class="hlab-arrow" x1="160" y1="30" x2="160" y2="8" marker-end="url(#hlHeadUp)"/>
          <line class="hlab-arrow" x1="184" y1="30" x2="184" y2="8" marker-end="url(#hlHeadUp)"/>
        </g>
        <text class="hlab-tlabel cool" x="120" y="50" text-anchor="middle" id="hlabCapLbl">cool cap</text>
        <text class="hlab-tlabel warm" x="120" y="150" text-anchor="middle">warm core</text>
      </svg>
    </figure>

    <div class="hlab-read">
      <div class="hlab-g"><span class="lab">Cooling &Delta;T</span><span class="val" id="hlabCool">0.36</span><span class="unit">K vs adiabatic</span></div>
      <div class="hlab-g"><span class="lab">Energy removed</span><span class="val" id="hlabEnergy">179</span><span class="unit">J over the run</span></div>
      <div class="hlab-g"><span class="lab">Peak wall flux</span><span class="val" id="hlabQ">0.34</span><span class="unit">W</span></div>
      <div class="hlab-g"><span class="lab">T<sub>mean</sub> at end</span><span class="val" id="hlabTend">307.14</span><span class="unit">K</span></div>
    </div>
  </div>

  <p class="hlab-note" id="hlabNote"></p>

  <div class="hlab-key">
    <h4>The key Step-2 result</h4>
    <p>At the only physical value, <b>h = 8</b>, the reused <em>adiabatic</em> database recovers just
    <b>~24%</b> of the real cooling: rCFD <b>0.36 K</b> against the CFD reference <b>1.45 K</b>.
    The missing piece is the cooling-driven down-flow — a flow pattern the database never recorded,
    not a diffusion setting.</p>
  </div>`;
}

/* --------------------------------------------------------------------- */
function wire(host) {
  host.querySelectorAll("#hlabH .hlab-hb").forEach((b) => {
    b.addEventListener("click", () => { idx = Number(b.dataset.i); update(); });
  });
  const irBtn = host.querySelector("#hlabIR");
  irBtn.addEventListener("click", () => {
    ir = !ir;
    irBtn.classList.toggle("on", ir);
    irBtn.setAttribute("aria-pressed", String(ir));
    update();
  });
}

function setTxt(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }

function update() {
  const c = CASES[idx];
  const frac = c.cool / COOL_MAX;                 // 0..1 cooling intensity

  document.querySelectorAll("#hlabH .hlab-hb").forEach((b, i) => b.classList.toggle("on", i === idx));

  const fig = document.getElementById("hlabTank");
  if (fig) fig.classList.toggle("ir", ir);

  // cold cap deepens with the cooling
  const cap = document.getElementById("hlabCap");
  if (cap) {
    const capH = c.cool === 0 ? 0 : 10 + frac * 58;
    cap.setAttribute("height", capH.toFixed(1));
    cap.style.opacity = c.cool === 0 ? "0" : (0.4 + frac * 0.45).toFixed(2);
  }
  // surface flux arrows: more and stronger as h grows
  const nA = c.cool === 0 ? 0 : Math.min(5, Math.round(frac * 4) + 1);
  document.querySelectorAll("#hlabFlux .hlab-arrow").forEach((a, i) => { a.style.opacity = i < nA ? "" : "0"; });
  const capLbl = document.getElementById("hlabCapLbl");
  if (capLbl) capLbl.style.opacity = c.cool === 0 ? "0.25" : "1";

  // readout
  setTxt("hlabCool", c.cool.toFixed(2));
  setTxt("hlabEnergy", c.energy);
  setTxt("hlabQ", c.qmax.toFixed(2));
  setTxt("hlabTend", c.tend.toFixed(2));

  // contextual note
  const note = document.getElementById("hlabNote");
  if (note) {
    if (c.h === 0) {
      note.innerHTML = "Sealed tank — no wall loss. This is the Step-1 adiabatic baseline every case is measured against.";
    } else if (c.physical) {
      const pct = Math.round((c.cool / CFD_COOL_H8) * 100);
      note.innerHTML = `Physical value. rCFD cools <b>${c.cool.toFixed(2)} K</b>, but the CFD reference loses <b>${CFD_COOL_H8} K</b> — only about <b>${pct}%</b> recovered.`;
    } else {
      note.innerHTML = `A what-if, not physical. rCFD reaches the CFD's real cooling (1.45 K) only near <b>h &asymp; 40</b> — another view of the four-times shortfall.`;
    }
  }
}
