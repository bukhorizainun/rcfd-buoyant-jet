# Step 2 roadmap — Heat-Loss Analysis (handoff)

> **Purpose of this file.** The current poster system covers **Step 1
> (adiabatic)**: a closed, insulated tank where no heat escapes. **Step 2** adds
> **wall heat loss**. This document is a ready-to-execute plan so the next
> session can extend the app to Step 2 by mostly *filling in data*, not
> rewriting code. The architecture was built for exactly this.

---

## 1. What changes physically

| | Step 1 (now) | Step 2 (this roadmap) |
|---|---|---|
| Walls | Adiabatic (insulated) | Lose heat to surroundings |
| Energy | Conserved inside the tank | Sink term through the walls |
| Wall flux | — | `q_wall = h · (T_wall − T∞)` |
| Key metric | CoG_y and T_mean | **CoG_y becomes central** (heat loss depends on *where* warm fluid touches the wall) |
| rCFD database | Single recurrence database | Likely **multi-database** (several recorded regimes blended at replay) |
| Suggested f_sd | Best for CoG = 0.500 | **Start at 0.500**, confirm with a small sweep around {0.375, 0.500, 0.750} |

Energy balance gains a sink: `dE/dt = −∫ h (T_wall − T∞) dA`. The face-swap
operator stays mass/energy-consistent; the wall term is layered on top.

> Source of truth: the Step 1b progress report "Step 2 — Outlook", and the
> separate Step 2 project files. Verify `h`, `T∞`, and wall-flux numbers against
> the actual Fluent setup before publishing them (do not invent values).

---

## 2. How to extend the app (data-first, low-code)

The system is data-driven. Most of Step 2 is **editing JSON + dropping new
assets**. Code touches are small and isolated.

### 2.1 Assets (drop in when the Step 2 CFD is ready)
- `assets/videos/heatloss_cfd.mp4` — Step 2 CFD temperature field.
- `assets/videos/heatloss_rcfd.mp4` — Step 2 rCFD replay.
- `assets/images/heatloss_*.png` — wall-flux map, CoG comparison, cooling curve.

### 2.2 `data/poster_content.json`
- Add a `step` field (`"adiabatic"` / `"heatloss"`) so the UI can label the mode.
- Add Step 2 **dashboard metrics**: wall heat-transfer coefficient `h`, ambient
  `T∞`, total heat-loss rate, cooling time constant.
- Add a `timeline.heatloss` track (or a second timeline) for the cooling phase.
- Extend `comparison` with an **adiabatic ↔ heat-loss** pair.

### 2.3 `data/hotspots.json`
- Add a **"Heat Loss"** hotspot over the wall region: `topic: "heatloss"`, with
  Level-2 subs (`{ "Why CoG matters more?", "wall_flux" }`,
  `{ "Multi-database replay?", "multidatabase" }`).

### 2.4 `data/conversation_kb.json` (the assistant already knows the outline)
- The `step2` intent already explains the heat-loss direction. Add intents:
  `heatloss` (the flux law), `wall_flux`, `multidatabase`, `cooling_curve`.
  Keep the same shape: `short / physical / cfd / more{deeper,math,analogy} /
  followup / related`.

### 2.5 `ui/` (small, optional)
- **Step toggle** (Step 1 ↔ Step 2): a HUD switch like `btnResearch`. On
  change, emit `bus.emit("step:change", step)` and let panels re-read the
  relevant data block. Add to `core/state.js` a `STATE.step` field.
- `ui/comparison.js` already does a video wipe — reuse it for adiabatic vs
  heat-loss by pointing it at the new pair.
- `simulation/flow-sim.js` — add a 4th slider "wall heat loss" that cools edge
  particles (tint them blue near the walls) as a Step 2 intuition.

### 2.6 Poster + AR target
- When the **printed poster** is updated for Step 2, re-render `poster.jpg` and
  **re-compile `target.mind`** (see `tools/compile-target.html`). Tracking must
  match the printed sheet.

---

## 3. Suggested implementation order

1. Land the Step 2 CFD/rCFD results; copy real videos/figures into `assets/`.
2. Fill the new `conversation_kb.json` intents (heatloss, wall_flux,
   multidatabase, cooling_curve) — pure content.
3. Add the Heat-Loss hotspot + Step 2 dashboard metrics in JSON.
4. Add `STATE.step` + a Step toggle in the HUD; wire panels to re-read data.
5. Point `comparison` at the adiabatic↔heat-loss pair.
6. (Optional) flow-sim wall-cooling slider.
7. Re-render poster + re-compile `target.mind`; re-test on device; commit.

---

## 4. Guardrails (project conventions)

- **Verify ground truth.** Every physical number (h, T∞, heat-loss rate, Re)
  must come from the Fluent setup / report, not an estimate.
- **No AI attribution** in commits or the repo (author = the user only).
- Keep it **client-side and GitHub-Pages-compatible**; no backend.
- Keep answers tentative in tone where the science is still open
  (e.g. "we suggest", "may"), matching the progress-report style.
- Re-use modules; do not fork the AR core. New work = new data + small modules.
