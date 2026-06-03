# Conversational Scientific Poster System — *Data-based Numerical Simulation of Buoyant Jet Flow*

A browser-only WebAR + conversational research experience for the
master's-thesis poster *Data-based Numerical Simulation of Buoyant Jet Flow*
(Step 1: CFD reference, recurrence-CFD workflow, face-swap-diffusion sweep).

It is an interactive poster — it behaves like an AI research
companion embedded in the poster: visitors can talk to it, get layered
explanations (intuition → CFD → maths), explore "what-if" flow scenarios, and
dig into hierarchical hotspots. No backend, no build step, no framework; it
deploys straight to GitHub Pages and everything runs client-side.

Scan the printed poster → the camera locks on → CFD animations, a 3D
buoyant-jet model, a parameter dashboard, a timeline, glowing hotspots and the
offline conversational assistant appear on top of it.

> Author: **Mochamad Bukhori Zainun** (k12438440) · Supervisor: **Prof. Stefan Pirker**
> Department of Particulate Flow Modelling, JKU Linz.

This app lives in the `ar/` subfolder of the Step-1 summary site, so the
existing summary page is untouched. Once deployed it is reachable at:

```
https://bukhorizainun.github.io/rcfd-buoyant-jet-step1/ar/
```

---

## All content is real

Unlike a generic AR demo, every number here comes from the actual study, **not**
the boiler-plate prompt. The jet is **laminar** (Re ≈ 100), not turbulent:

| Quantity              | Value                                  |
|-----------------------|----------------------------------------|
| Reynolds number       | ≈ 100 (laminar; `Re = U·D/ν`)          |
| Temperature difference| 40 K (warm jet 333 K vs tank 293 K)    |
| Jet velocity          | 0.02 m/s through a 5 × 5 mm inlet      |
| Simulation time       | 600 s (warm inlet on until t = 315 s)  |
| Mesh cell size        | 1 mm structured cubic cells            |
| Best `f_sd` (CoG)     | 0.500                                  |

The figures and videos are the real CFD / rCFD results from the progress
report, copied into `assets/`.

---

## Features

| # | Feature | Where |
|---|---------|-------|
| 1 | Image tracking + elegant detection banner | `app.js` → `buildARScene`, `showBanner` |
| 2 | Digital information layer (title/author/areas) | `app.js` → `showInfoLayer`; `#infoLayer` CSS |
| 3 | Interactive glowing/pulsing hotspots + popups | `data/hotspots.json`, `openPopup`, `DIAGRAMS` |
| 4 | CFD video overlay with holographic frame | anchored `<a-video>` + `.holo` frame |
| 5 | 3D model (rotate/zoom/pan, lights, shadows) | `viewer3d.js` (lazy Three.js module) |
| 6 | Scientific dashboard | `data/poster_content.json` → `renderDashboard` |
| 7 | Timeline explorer (scrub CFD field in time) | `initTimeline` + `cfd_reference.mp4` |
| 8 | Offline AI assistant (local knowledge base) | `data/faq.json` + `searchFAQ` |
| 9 | Responsive design | `style.css` media queries |
| 10| Loading / permissions / fallback / errors | loader, `#scanHint`, `#errorScreen` |
| 11| Performance (lazy loading of AR + 3D libs) | `loadScript`, dynamic `import()` |
| 12| Future AI extension hook | `ai/llm-hooks.js` → `callLLM()` |

### Conversational upgrade

| Feature | What it does | Where |
|---------|--------------|-------|
| Conversational layer | Layered answers (short → physical intuition → CFD interpretation) | `ai/conversation.js`, `data/conversation_kb.json` |
| Context-aware Research Mode | Hotspots become AI explainer nodes; lab accent UI | `ui/research-mode.js` |
| Flow Intuition (pseudo-sim) | Velocity / density-ratio / ΔT sliders drive a visual flow abstraction | `simulation/flow-sim.js` |
| Hierarchical hotspots | Level-2 follow-up questions inside each hotspot | `data/hotspots.json` → `subs`, `ui/hotspots.js` |
| Ask-follow-up | "Deeper / Math intuition / Analogy" branches on every answer | `ui/chat.js`, KB `more` |
| Research Insight panel | Findings · physical interpretation · stability · AI contribution | `ui/insights.js` |
| Scenario comparison | Draggable CFD ↔ AI-rCFD video wipe + metric read-out | `ui/comparison.js` |
| Session memory | Tracks asked topics / hotspots and deepens explanations | `ai/memory.js` |
| Scientific UI | Glassmorphism, glow accents, fluid particle backdrop | `ui/background.js`, `style.css` |
| Modular, event-driven | `core/ ai/ ui/ simulation/` + a small event bus | `core/bus.js` |
| LLM hooks | One `getAnswer()` swap to go from offline KB to a real model | `ai/llm-hooks.js` |

---

## Project structure

```text
ar/
├── index.html              # app shell (loader, start, AR/demo, all panels)
├── app.js                  # orchestrator (ES module): boot, modes, panels, wiring
├── style.css               # dark "mission-control" theme
├── viewer3d.js             # Three.js 3D buoyant-jet viewer (lazy)
│
├── core/                   # shared plumbing
│   ├── config.js           #   CDN URLs + asset paths
│   ├── state.js            #   single shared STATE object
│   ├── bus.js              #   tiny event bus (event-driven)
│   └── utils.js            #   DOM/string/fetch/script helpers
│
├── ai/                     # the "brain"
│   ├── conversation.js     #   offline engine: retrieval + layered answers
│   ├── memory.js           #   session memory → auto-deepening
│   └── llm-hooks.js        #   getAnswer()/callLLM() — future real LLM
│
├── ui/                     # views
│   ├── chat.js             #   assistant panel + shared answer renderer
│   ├── hotspots.js         #   hotspots, hierarchical popup, SVG diagrams
│   ├── research-mode.js    #   context-aware Research Mode toggle
│   ├── insights.js         #   research insight panel
│   ├── comparison.js       #   CFD ↔ rCFD video wipe
│   ├── background.js       #   fluid particle backdrop
│   └── ar-scene.js         #   MindAR + A-Frame scene builder
│
├── simulation/
│   └── flow-sim.js         #   Flow Intuition pseudo-simulation (canvas)
│
├── data/
│   ├── poster_content.json # title, dashboard, timeline, insights, comparison
│   ├── hotspots.json       # hotspot (u,v) + text + diagrams + Level-2 subs
│   ├── conversation_kb.json# conversational knowledge base (intents/layers)
│   └── faq.json            # legacy flat FAQ (superseded by conversation_kb)
│
├── assets/                 # poster.jpg + target.mind, videos, figures, models/
├── tools/                  # in-browser MindAR target.mind compiler
└── docs/
    └── STEP2_HEATLOSS.md   # roadmap for Step 2 (wall heat loss)
```

> Data lives in `data/*.json`; the app is fully data-driven, so a new study can
> be skinned by editing JSON only. Logic is split into `core/ ai/ ui/
> simulation/` ES modules that talk through `core/bus.js`.

---

## Run it locally

The app uses `fetch()` and (for AR) the camera, so it must be served over
**http(s)** — opening `index.html` as a `file://` will not work.

```bash
# from inside the ar/ folder (or the repo root)
python -m http.server 8000
# then open http://localhost:8000/ar/   (or http://localhost:8000/ if you started inside ar/)
```

- **Explore on screen** works immediately on a laptop — poster shown on screen,
  all hotspots/panels/3D/AI interactive.
- **Launch AR** needs a camera + a compiled `target.mind` (see next section).
  `localhost` counts as a secure context, so AR works there too; on a phone use
  the GitHub Pages https URL.

---

## Generate `target.mind` (one time)

MindAR tracks the poster using a compiled feature file. Two ways:

**A — bundled tool (offline, local):**
1. Serve the site and open `…/ar/tools/compile-target.html`.
2. Click **Use bundled poster.jpg** (or drop your own poster image).
3. Click **Compile** → `target.mind` downloads.
4. Put it at `ar/assets/poster/target.mind`, reload, choose *Launch AR*.

**B — hosted tool:** <https://hiukim.github.io/mind-ar-js-doc/tools/compile> —
upload `poster.jpg`, download the `.mind`, drop it in the same place.

> If `target.mind` is missing the app detects this and falls back to the
> on-screen demo, so it never breaks.

---

## Use your own research assets

Everything is swappable without touching the JS:

| To change… | Do this |
|------------|---------|
| The poster / marker | replace `assets/poster/poster.jpg`, then re-compile `target.mind` |
| The CFD overlay video | replace `assets/videos/cfd_reference.mp4` |
| Hotspot text/positions | edit `data/hotspots.json` — `u,v` are 0–1 from the poster's top-left |
| Dashboard numbers | edit `data/poster_content.json → dashboard.metrics` |
| Timeline marks/captions | edit `data/poster_content.json → timeline.marks` |
| AI answers | edit `data/faq.json` (add `{id, question, keywords[], answer}`) |
| 3D model | drop `assets/models/buoyant_jet.glb` (see `assets/models/README.md`) |
| Title / author | edit `data/poster_content.json` top fields |

After editing a poster image, **re-run the compile step** so tracking matches.

---

## Deploy to GitHub Pages

This folder is part of the `rcfd-buoyant-jet-step1` repo, which already serves
GitHub Pages from `main`. Just commit and push:

```bash
git add ar
git commit -m "Add interactive WebAR scientific poster (ar/)"
git push
```

The AR app goes live at `https://<user>.github.io/rcfd-buoyant-jet-step1/ar/`.
Encode that URL into the QR code printed on the poster.

> Standalone instead? Copy the `ar/` folder into a fresh repo, enable Pages on
> `main`, and the app sits at the repo root.

---

## Component documentation

- **`index.html`** — semantic shell: loader, start chooser, AR stage (the
  `<a-scene>` is injected at runtime), on-screen demo stage, HUD, bottom dock,
  and all panels/modals. The Three.js *import map* lives here.
- **`app.js`** — single IIFE controller. Loads the three JSON files, hydrates
  text, then runs either **AR mode** (lazy-loads A-Frame + MindAR, builds the
  tracked scene) or **demo mode** (poster + CSS hotspots). Also owns the
  dashboard, timeline, AI chat, hotspot popups and the 3D-viewer lifecycle.
- **`viewer3d.js`** — ES module. Sets up a Three.js scene with OrbitControls
  (touch rotate/zoom/pan), key + rim lights, soft shadows, and either your
  `buoyant_jet.glb` or a procedural particle-plume buoyant jet.
- **`data/*.json`** — content. No code changes needed to re-skin the poster.
- **`tools/compile-target.html`** — runs MindAR's `Compiler` in-browser to
  produce `target.mind` locally (nothing is uploaded).

---

## How the conversational system works

1. **Knowledge base** — `data/conversation_kb.json` holds *intents*. Each intent
   has keywords, a layered answer (`short` → `physical` → `cfd`), an optional
   `more` block (`deeper` / `math` / `analogy`), a `followup` pointer and
   `related` topics.
2. **Retrieval** — `ai/conversation.js` tokenises the question and scores it
   against each intent's keywords + title (phrase hits weigh most). Above a
   threshold it returns that intent; otherwise a graceful fallback.
3. **Layered rendering** — `ui/chat.js` renders short → physical intuition →
   CFD interpretation, then shows "Ask more" buttons (deeper / math / analogy)
   and a follow-up chip that asks the next intent.
4. **Memory** — `ai/memory.js` counts how often each topic is engaged and
   **escalates the depth** automatically (intro → intermediate → advanced), so
   repeat questions get richer answers.
5. **Hotspots reuse the same engine** — Level-2 questions and Research Mode call
   `renderAnswer()` straight into the hotspot popup.

## Plugging in a real LLM later (Feature 12)

Everything routes through **one** function, so going online needs no UI change.
In `ai/llm-hooks.js`:

```js
export const LLM = { enabled: false, provider: null, endpoint: null };

export async function callLLM(question, context = {}) {
  const res = await fetch(LLM.endpoint, {           // your serverless proxy
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, context })      // context can carry KB chunks for RAG
  });
  return (await res.json()).answer;
}
```

Set `LLM.enabled = true` and `getAnswer()` will use the model, falling back to
the offline engine if the call fails. `data/conversation_kb.json` doubles as a
ready-made RAG corpus. Keep API keys on the proxy, never in the client.

---

## Performance

- A-Frame (~1 MB) and MindAR (~1 MB) load **only** when you tap *Launch AR*.
- Three.js loads **only** when you open the 3D panel (dynamic `import()`).
- The CFD video is muted + `playsinline` and pauses on `targetLost` / when the
  timeline panel closes, to save battery.
- Hotspot diagrams are inline SVG (no extra requests). Images use `loading="lazy"`.

---

## Browser support

Tested targets: Android Chrome, Samsung Internet, Safari iOS, tablets. AR needs
a secure context (https or localhost) and camera permission. Older browsers
without `WebGL`/`getUserMedia` automatically get the on-screen demo.

---

## Credits

CFD/rCFD study © Mochamad Bukhori Zainun, JKU Linz. Built on the open-source
[MindAR](https://github.com/hiukim/mind-ar-js), [A-Frame](https://aframe.io)
and [Three.js](https://threejs.org). rCFD method: Lichtenegger & Pirker,
*Chem. Eng. Sci.* (2016, 2018).
