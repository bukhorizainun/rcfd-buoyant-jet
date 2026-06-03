# TODO / Handoff — AR poster

Open tasks and the exact recipes to do them. Tick boxes as you go.
Live app: `https://bukhorizainun.github.io/rcfd-buoyant-jet-step1/ar/`

> ⚠️ **Golden rule.** Whenever the **printed poster image changes** (new QR, new
> figures, Step 2, anything), you MUST re-render `poster.jpg` **and re-compile
> `target.mind`** — the tracking file has to match the sheet that gets printed.
> See [§3 Poster-change workflow](#3-poster-change-workflow-do-this-every-time).

---

## 1. Add the "Scan for AR" QR to the poster  ⬅ next up

Decision (made with the user): **add a dedicated AR QR** and keep the existing
summary-site QR. The visitor flow is: scan AR QR → browser opens `/ar/` → tap
*Launch AR* → point camera back at the poster.

- [ ] **Edit `poster_thesis_v4.tex`** (parent folder, not the repo). The
      `qrcode` package is already loaded. Add a small box near the footer /
      "References & contact" with the AR URL + a 3-step instruction. Ready-made
      snippet:

  ```latex
  \begin{tcolorbox}[footcell, title={Interactive AR}]
  \centering
  \qrcode[height=3.0cm,padding]{https://bukhorizainun.github.io/rcfd-buoyant-jet-step1/ar/}\\[3pt]
  {\fontsize{9}{11}\selectfont\bfseries 1.\,Scan \quad 2.\,Tap “Launch AR” \quad 3.\,Point camera at this poster}\\[2pt]
  {\fontsize{8.5}{10}\selectfont\ttfamily .../rcfd-buoyant-jet-step1/ar/}
  \end{tcolorbox}
  ```
  (Place it so the layout stays balanced; the existing summary-site QR stays put.)

- [ ] **Rebuild + re-render + re-compile + commit** → follow [§3](#3-poster-change-workflow-do-this-every-time).
- [ ] Print the **new** PDF (not the old one) for the conference/defense.

---

## 2. Real-device AR test (independent of the QR)

- [ ] Open `/ar/` on a phone (Chrome Android / Safari iOS), *Launch AR*, scan
      the printed poster.
- [ ] Confirm the **title bar + 4 glowing hotspots + LIVE-CFD monitor** appear
      anchored on the poster (not just the video).
- [ ] If a hotspot sits off its poster section, tweak its `u,v` (0–1 from the
      poster top-left) in `data/hotspots.json`, commit. No re-compile needed for
      `u,v` changes — only poster-image changes need re-compile.

---

## 3. Poster-change workflow (do this EVERY time the poster image changes)

Tools confirmed working on this machine (MiKTeX `pdflatex`/`pdftoppm`, headed
Chromium for the compiler). Run from the parent folder
`D:\JKU\MASTER THESIS\backup\bouyant_jet_replay`.

1. **Rebuild the poster PDF** (twice, for TikZ):
   ```
   pdflatex -interaction=nonstopmode -halt-on-error poster_thesis_v4.tex
   pdflatex -interaction=nonstopmode -halt-on-error poster_thesis_v4.tex
   ```
2. **Re-render the marker** `summary_site/ar/assets/poster/poster.jpg` at
   ~1400 px wide (render at 150 dpi with `pdftoppm`, then downscale to 1400 px,
   JPEG quality ~88). Same long-side as the current marker.
3. **Re-compile `target.mind`** from the new `poster.jpg`:
   - Open `…/ar/tools/compile-target.html`, click **Use bundled poster.jpg**,
     **Compile**, then drop the downloaded file at
     `ar/assets/poster/target.mind`.
   - ⚠️ The MindAR compiler needs **WebGL/TensorFlow.js**, so it must run in a
     **real browser with a GPU** (a headless/SwiftShader context fails with
     "WebGL is not supported"). A phone or normal desktop browser works.
4. **Commit + push** `poster.jpg` + `target.mind` (author = user, **no AI
   attribution**):
   ```
   git -C summary_site add ar/assets/poster/poster.jpg ar/assets/poster/target.mind
   git -C summary_site commit -m "Update poster marker + recompiled AR target"
   git -C summary_site push origin main
   ```
5. Re-test on device (§2).

> Note: the poster `.tex`/`.pdf` live in the parent thesis folder, **outside**
> the `rcfd-buoyant-jet-step1` repo, so they are not committed there — only the
> rendered `poster.jpg` and `target.mind` are.

---

## 4. Step 2 — heat-loss extension

Full plan in [`STEP2_HEATLOSS.md`](./STEP2_HEATLOSS.md). It is mostly **data
fill-in** thanks to the modular architecture. Short checklist:

- [ ] Drop Step 2 CFD/rCFD videos + figures into `assets/`.
- [ ] Add KB intents `heatloss`, `wall_flux`, `multidatabase`, `cooling_curve`
      to `data/conversation_kb.json` (same layered shape).
- [ ] Add a **Heat-Loss hotspot** + Step 2 dashboard metrics (h, T∞, loss rate)
      in `data/poster_content.json` / `data/hotspots.json`.
- [ ] Add `STATE.step` + a **Step 1 ↔ Step 2 toggle** in the HUD; point
      `comparison` at the adiabatic↔heat-loss pair.
- [ ] (Optional) add a "wall heat loss" slider to `simulation/flow-sim.js`.
- [ ] If the poster is updated for Step 2 → run [§3](#3-poster-change-workflow-do-this-every-time).
- [ ] **Verify every physical number** (h, T∞, loss rate, Re) against the Fluent
      setup / report — never estimate.

---

## 5. Nice-to-have backlog (optional)

- [ ] Tune the Flow Intuition colour range so cool particles read blue/green
      (less white) — `simulation/flow-sim.js` temperature mapping.
- [ ] Add a real `assets/models/buoyant_jet.glb` (viewer auto-detects it and
      replaces the procedural plume).
- [ ] Wire a real LLM via `ai/llm-hooks.js` (`LLM.enabled = true` + a serverless
      proxy that keeps the API key off the client).

---

### Conventions (keep)
- No AI attribution in commits or repo (author = the user only).
- Client-side only; GitHub-Pages compatible; no backend.
- Verify ground-truth numbers from authoritative sources, don't guess.
- Re-use modules; new work = new data + small modules, don't fork the AR core.
