# Interactive 3D / AR Poster — Presentation Notes

*Data-based Numerical Simulation of Buoyant Jet Flow (rCFD) · Step 1*
Master's thesis · M. B. Zainun (k12438440) · Supervisor: Prof. S. Pirker · Particulate Flow Modelling, JKU Linz

These notes summarise **what the interactive 3D / AR viewer shows**, **what is real data vs. an interpretive model**, and **how to talk about it** at a poster session or conference. Read the "Data provenance" and "Anticipated questions" sections before you present — they let you answer the hard questions confidently.

---

## 1. The physical case (one sentence)

A **laminar** buoyant jet (**Re ≈ 100**) enters a closed water tank through a 5 × 5 mm inlet at **U = 0.02 m/s** and **333 K**; the surrounding water is **293 K** (**ΔT = 40 K**). The warm jet rises by buoyancy and builds a stable warm layer under the top wall, driven by **two counter-rotating recirculation vortices**. rCFD replays this 600 s temperature transport from one short CFD run.

> Key correction baked into the visuals: the flow is **laminar**, confirmed in Fluent. The viewer **deliberately avoids any turbulence / Kelvin–Helmholtz / smoke effects** — those would misrepresent Re ≈ 100.

---

## 2. What the 3D viewer shows (feature by feature)

Open it with the **3D** button in the dock. Talking points:

| Feature | What to say |
|---|---|
| **Glass tank + inlet/outlet pipes** | The real test-case geometry: a horizontal pipe through the tank at mid-height (inlet left, outlet right). Mass enters and **leaves** through the outlet. |
| **Particle plume (GPU)** | Parcels that **advect along the real velocity field** (integrated in the vertex shader) and are coloured by the real temperature — so they stream where the actual fluid goes, warm near the top, cool below. (In the slider-driven Flow panel the same engine runs the analytic jet-core/recirculation model instead.) |
| **Animated streamlines** | Flow direction and topology: the jet feeding the **two counter-rotating vortices**. The travelling bright pulse shows the flow moving. Smooth and steady = **laminar**. |
| **Field modes** (Temperature / Velocity / Density / Buoyancy) | Switch the scalar. Each uses a **perceptually-uniform** colormap (Inferno / Viridis / Magma / Plasma — *no rainbow*) with a legend. In **Velocity**, note the fast bright jet core vs. the slow dark recirculation. |
| **Velocity glyphs** (toggle) | Arrow field: direction + magnitude on a sparse grid, the way ParaView shows vectors. |
| **Slice plane** (toggle + slider) | A movable horizontal cross-section, like ParaView's Slice filter. The read-out gives the height (mm), the mean temperature (K) and the relative velocity at that level. |
| **Parameter plate + grid/axes** | Re, ΔT, U, Ri with a ground grid and an axis triad — a CFD-post-processing frame, not a game scene. |
| **Faint field backdrop** | The **real** CFD temperature contour (from the Fluent recording) sits on the back wall as the ground truth behind the interactive layer. |

The **Flow Intuition** panel (dock → Flow) is the same engine driven by three sliders (jet velocity, density ratio Δρ, temperature difference ΔT) with **Richardson/Froude coupling**: raise ΔT·Δρ and the plume bends up nearer the nozzle (buoyancy-dominated); raise velocity and it projects further horizontally (momentum-dominated).

In **AR** (scan the printed poster) a floating **CASE PARAMETERS** plate appears next to the poster.

---

## 3. Data provenance — *say this clearly if asked "is this real?"*

| Layer | Status |
|---|---|
| Temperature field | **Real CFD data** (Fluent solve; field coloring, slice and back-wall contour) |
| **Velocity field · streamlines · glyphs** | **Real simulation data** — extracted from the Fluent **rCFD result** `BouyantJet_END_rCFD_RUN` (85,625 cells), sampled on the symmetry plane to a 64×64 grid (`data/cfd_field.json`). This snapshot shows the clear recirculation *and* the warm stratification. Streamlines are grid-seeded and integrated forward+backward through it; glyphs and the slice sample it directly. |
| Geometry (tank, pipes, 5×5 mm inlet, 1 mm cells, 7.5 cm tank) | **Real** |
| Scalar parameters (Re ≈ 100, ΔT = 40 K, U = 0.02 m/s, 600 s) | **Real / verified in Fluent** |
| Particle plume | **Real CFD data** — the parcels advect along the real velocity field (sampled from the same texture) in the vertex shader, coloured by the real temperature |
| Density · Buoyancy fields | **Derived from the real temperature** via the Boussinesq approximation (ρ = ρ₀[1 − β(T − T₀)], f_b ∝ ρ₀ g β (T − T₀)) |
| Richardson number Ri ≈ 1 | **Computed** as g β ΔT D / U² with assumed β ≈ 2.1×10⁻⁴ K⁻¹ and L = D — *verify β / length scale against the Fluent setup before quoting a precise value* |

Every layer except the two derived fields is the real solve; the field-mode legend is tagged *CFD data / derived*.

---

## 4. The scientific result (the headline)

- rCFD reproduces the full 600 s buoyant-jet **temperature transport** from one short CFD run.
- **~263× faster** (compute-only; 120–701× across the sweep).
- Best **face-swap diffusion** strength **f_sd = 0.500** → thermal centre-of-gravity error **RMSE 0.069 mm** (the metric-dependent optimum; f_sd = 0.000 is best for mean temperature).
- The CoG optimum is **broad** (0.375–0.750), not knife-edge.

---

## 5. Anticipated questions + honest answers

- **"Is the flow turbulent?"** → No. Re ≈ 100, laminar, confirmed in Fluent. The visualisation avoids turbulence on purpose.
- **"Are these your real fields?"** → **Yes — every dynamic layer is the real Fluent simulation** (`BouyantJet_END_rCFD_RUN`, the rCFD replay result, 85,625 cells): streamlines are integrated through the real velocity field; glyphs, the slice and even the particle plume sample/advect it; **density / buoyancy** are derived from the real temperature (Boussinesq). Nothing here is faked.
- **"Why the rCFD snapshot and not the pure CFD end-state?"** → The pure-CFD end-state is strongly stratified, which *suppresses* the recirculation (mostly horizontal layers). The rCFD-replay snapshot is also warm but keeps the clear two-vortex circulation, and it is the actual output of your method — so it both reads better and is on-topic.
- **"How did you get the field into the browser?"** → Exported the cell-centre velocity (u, v) and temperature from the Fluent `.cas.h5/.dat.h5`, sampled the symmetry plane onto a 64×64 grid, and the viewer bilinearly interpolates it.
- **"What does rCFD actually buy you?"** → ~263× less compute for the same temperature transport, CoG RMSE 0.069 mm — so new cases (e.g. heat loss, Step 2) become minutes instead of hours.

---

## 6. Known limitations (own them — it reads as rigour)

- The field is a single representative snapshot (end of the reference run, warm-stratified: 293 K floor → 333 K ceiling) sampled on the symmetry plane; the case is quasi-2D so this captures the in-plane flow well. A separate warm-*inlet*-phase snapshot was not saved, but the time-scrub shows the warm build-up from the real recording.
- Density and buoyancy are derived from the real temperature (Boussinesq), not separate measurements.
- Ri ≈ 1 depends on the assumed β and length scale.
- The faint back-wall contour uses Fluent's default rainbow (it is the raw recording); the interactive layers use perceptual maps.

---

## 7. 30-second live demo script

1. Open **3D** → "This is the laminar buoyant jet. Inlet here, outlet there — flow goes *through* and recirculates."
2. Switch **Temperature → Velocity** → "Fast jet core, slow recirculation — the two vortices."
3. Toggle **Streamlines / Glyphs** → "Direction of the flow."
4. Toggle **Slice plane**, drag it up → "Cross-section at any height; warm layer builds near the top."
5. Point at the **parameter plate** → "Re ≈ 100, laminar; and rCFD does this 263× faster."

---

## 8. Improvements status

- ✅ **Velocity grounded in real data** — streamlines/glyphs/slice run on the exported Fluent field.
- ✅ **Particle plume advects the real velocity field** — the decorative layer is now data too.
- ✅ **Time evolution** — the Time toggle scrubs the real temperature field over 0–600 s.
- ✅ **Export-figure button** + ✅ **numeric colorbar ticks**.
- Remaining ideas for an international venue: (a) a 3D rCFD-vs-CFD deviation overlay across the f_sd sweep; (b) several time snapshots of the *velocity* field (only one is exported now); (c) WebXR hand-controller probing of the slice.

---

## 9. How it's built (data pipeline + module map)

**Data pipeline — from the solver to the browser**

1. **Source:** the Fluent files in `ansys_fluent/` (85,625 cells). The exported field is `BouyantJet_END_rCFD_RUN.dat.h5` (the rCFD replay result — clear vortices + warm) with the shared mesh `BouyantJet_END_CFD_RUN.cas.h5`. `.dat.h5` holds the per-cell fields `SV_U, SV_V, SV_W, SV_T`; `.cas.h5` holds the mesh (nodes + face→cell connectivity).
2. **Extract (Python + h5py, offline):** cell centroids are reconstructed from the `.cas.h5` faces/nodes (cell ≈ mean of its face centroids), then paired index-for-index with the `.dat.h5` velocity/temperature. The quasi-2D symmetry plane is binned to a **64×64 grid** and written to `ar/data/cfd_field.json` (~90 KB: `u, v` in m/s and `T` in K, plus `umax`, `Tlo/Thi`). *Why:* the raw `.h5` is 15 MB and unstructured; a small regular grid is all the browser needs and loads instantly on a phone.
3. **Load (browser):** `simulation/cfd-field.js` fetches that JSON and exposes a bilinear sampler in the viewer's coordinates — the same interface as the analytic model, so every consumer is field-agnostic.
4. **Consume:** the sampler drives the streamlines, glyphs and slice; the same grid is also packed into an **RGBA texture** that the particle plume's vertex shader advects through on the GPU.

**Module map — what, from where, why**

| File | What it does | Why |
|---|---|---|
| `simulation/cfd-field.js` | loads `cfd_field.json`, bilinear sampler (real field) | grounds the visuals in solver data |
| `simulation/jet-field.js` | analytic velocity+T model (jet + two vortices) | slider-driven *intuition* for the Flow panel (no real field there) |
| `simulation/streamlines.js` | grid-seeds + integrates the field forward & backward | the CFD way to reveal the two recirculation vortices |
| `simulation/glyphs.js` | InstancedMesh arrows sampling the field | direction + magnitude, ParaView-style |
| `simulation/slice.js` | movable cross-section textured from the field | inspect a horizontal cut, with a T/|u| read-out |
| `simulation/jet-gpu.js` | GPU particle plume; advects the **real velocity texture** when given one, else the model | the lively layer, now data-driven |
| `simulation/colormaps.js` | perceptual Inferno/Viridis/Magma/Plasma + legends | scientific colour, no rainbow |
| `viewer3d.js` | builds the scene, loads the field, wires field-mode / glyphs / slice / time / export | the 3D modal viewer |
| `data/cfd_field.json` | the exported real field | the single source of truth for the dynamic layers |

**Why these choices**

- *Real field, not a fit* — a reviewer's first question is "is this your data?"; grounding the velocity flips the honest answer to yes.
- *Symmetry-plane 64×64* — the case is quasi-2D and laminar, so an in-plane grid captures the physics with a tiny payload.
- *Perceptual colormaps* — rainbow maps distort gradients; Inferno/Viridis are the scientific-publishing standard.
- *Laminar by construction* — every layer is smooth/steady; no turbulence is injected, matching Re ≈ 100.
- *GPU advection in the vertex shader* — keeps the CPU idle for a steady 60 FPS on a phone in WebAR.
