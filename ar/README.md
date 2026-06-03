# Interactive AR Scientific Poster — *Data-based Numerical Simulation of Buoyant Jet Flow*

A browser-only **WebAR** experience for the master's-thesis poster
*Data-based Numerical Simulation of Buoyant Jet Flow* (Step 1: CFD reference,
recurrence-CFD workflow, and a face-swap-diffusion parameter sweep).

Scan the printed poster with a phone → the camera locks onto it → CFD
animations, a 3D buoyant-jet model, a live parameter dashboard, a timeline
explorer, glowing hotspots and an **offline AI assistant** appear on top of it.
No backend, no build step, no framework — it deploys straight to GitHub Pages.

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
| 12| Future AI extension hook | see *Plugging in a real LLM* below |

---

## Project structure

```text
ar/
├── index.html              # app shell (loader, start, AR/demo stages, panels)
├── style.css               # dark "mission-control" theme
├── app.js                  # controller: modes, hotspots, panels, AI, dashboard, timeline
├── viewer3d.js             # ES module: Three.js 3D buoyant-jet viewer (lazy)
├── README.md               # this file
│
├── data/
│   ├── poster_content.json # title, author, dashboard metrics, timeline marks
│   ├── hotspots.json       # hotspot positions (u,v) + text + diagrams
│   └── faq.json            # offline AI knowledge base
│
├── assets/
│   ├── poster/
│   │   ├── poster.jpg      # marker image (rendered from poster_thesis_v4.pdf)
│   │   └── target.mind     # MindAR tracking file — YOU generate this (see below)
│   ├── videos/
│   │   ├── cfd_reference.mp4  # CFD temperature-field evolution (Feature 4 & 7)
│   │   └── rcfd_replay.mp4    # best-case rCFD replay (f_sd = 0.5)
│   ├── images/
│   │   ├── contour.png     # CFD vs rCFD temperature snapshots
│   │   ├── results.png     # CFD vs rCFD visual proof across time
│   │   ├── cost.png        # wall-clock comparison
│   │   ├── overlay.png     # f_sd sweep overlay
│   │   └── flowfield.jpg   # streamlines: jet + recirculation vortices
│   └── models/
│       └── README.md       # drop buoyant_jet.glb here (optional)
│
└── tools/
    └── compile-target.html # in-browser MindAR compiler → target.mind
```

> The data lives in `data/*.json`; the app is fully data-driven, so you can
> re-theme the poster for a different study by editing JSON only.

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

## Plugging in a real LLM later (Feature 12)

The assistant is intentionally isolated. `submitChat(q)` calls `searchFAQ(q)`
(local, offline). To upgrade to a cloud or local model **without changing the
UI**, swap that one call:

```js
// inside submitChat(q) in app.js
const answer = await askBackend(q);   // ← replace searchFAQ(q) with this

async function askBackend(q) {
  // OpenAI / Gemini / local LLM / RAG endpoint.
  // For RAG, embed data/faq.json + the progress report and retrieve top-k
  // chunks, then send them as context. Keep searchFAQ() as the offline
  // fallback when the network/key is unavailable.
  const res = await fetch(MY_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: q })
  });
  return (await res.json()).answer;
}
```

Because retrieval is decoupled from rendering, none of the AR/poster code
changes. The same `data/faq.json` doubles as a ready-made RAG corpus.

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
