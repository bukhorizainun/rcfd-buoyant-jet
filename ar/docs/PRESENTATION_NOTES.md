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
| **Particle plume (GPU)** | The buoyant jet. ~30 % of particles are the **jet core** that runs straight to the outlet (momentum); the rest are **entrained** into the two recirculation vortices and rise. The plume **widens with height** (entrainment) while the core stays narrow — *jet core vs. mixing region*. |
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
| Temperature field | **Real CFD data** (Fluent solve; shown as the back-wall contour and the timestep montage) |
| Geometry (tank, pipes, 5×5 mm inlet, 1 mm cells, 7.5 cm tank) | **Real** |
| Scalar parameters (Re ≈ 100, ΔT = 40 K, U = 0.02 m/s, 600 s) | **Real / verified in Fluent** |
| Streamlines · velocity magnitude · glyphs | **Interpretive model** that reproduces the *observed* topology (jet + two vortices from the Fluent streamline figure) — not raw solver vectors |
| Density · Buoyancy fields | **Derived from temperature** via the Boussinesq approximation (ρ = ρ₀[1 − β(T − T₀)], f_b ∝ ρ₀ g β (T − T₀)) |
| Richardson number Ri ≈ 1 | **Computed** as g β ΔT D / U² with assumed β ≈ 2.1×10⁻⁴ K⁻¹ and L = D — *verify β / length scale against the Fluent setup before quoting a precise value* |

The honesty is built into the UI: every field-mode legend is tagged *CFD data / modelled / derived*.

---

## 4. The scientific result (the headline)

- rCFD reproduces the full 600 s buoyant-jet **temperature transport** from one short CFD run.
- **~263× faster** (compute-only; 120–701× across the sweep).
- Best **face-swap diffusion** strength **f_sd = 0.500** → thermal centre-of-gravity error **RMSE 0.069 mm** (the metric-dependent optimum; f_sd = 0.000 is best for mean temperature).
- The CoG optimum is **broad** (0.375–0.750), not knife-edge.

---

## 5. Anticipated questions + honest answers

- **"Is the flow turbulent?"** → No. Re ≈ 100, laminar, confirmed in Fluent. The visualisation avoids turbulence on purpose.
- **"Are these your real CFD fields?"** → The **temperature** field is real solver output (back-wall contour + the timestep montage on the poster). The interactive **streamlines / velocity / glyphs** are an interpretive model reproducing the observed topology for communication; **density / buoyancy** are derived from the temperature. I label each in the legend.
- **"Why a model and not the raw 3D field?"** → The case is essentially 2D (a vertical slice); the raw field is exported as the temperature contour. The 3D interactive layer is for intuition. Grounding the velocity field in exported Fluent data is the planned next step.
- **"What does rCFD actually buy you?"** → ~263× less compute for the same temperature transport, CoG RMSE 0.069 mm — so new cases (e.g. heat loss, Step 2) become minutes instead of hours.

---

## 6. Known limitations (own them — it reads as rigour)

- Velocity magnitude, streamlines and glyphs are **modelled**, not raw solver vectors.
- Slice read-out values are **representative** (model) except the height, which is geometric.
- Ri ≈ 1 depends on the assumed β and length scale.
- The field backdrop colormap is Fluent's default rainbow (it is the raw recording); the interactive layers use perceptual maps.

---

## 7. 30-second live demo script

1. Open **3D** → "This is the laminar buoyant jet. Inlet here, outlet there — flow goes *through* and recirculates."
2. Switch **Temperature → Velocity** → "Fast jet core, slow recirculation — the two vortices."
3. Toggle **Streamlines / Glyphs** → "Direction of the flow."
4. Toggle **Slice plane**, drag it up → "Cross-section at any height; warm layer builds near the top."
5. Point at the **parameter plate** → "Re ≈ 100, laminar; and rCFD does this 263× faster."

---

## 8. Suggested next improvements (for an international venue)

1. **Ground the velocity field in real data** — export the Fluent velocity field (even downsampled) and drive the streamlines/glyphs from it; flips the biggest caveat into a strength.
2. **Time evolution** — scrub the field through the 600 s (the real temperature video already exists) so the stratification *builds* live.
3. **Validation overlay** — show where rCFD deviates from CFD across the f_sd sweep (your actual result), in 3D.
4. **Export-figure button** — capture a clean still from the viewer for the printed poster / paper.
5. **Numeric colorbar ticks** with physical units on every mode.
