# Data-based Numerical Simulation of Buoyant Jet Flow — Step 1 Summary

Interactive web summary of Step 1 of the master's thesis at JKU Linz.

**Author:** Mochamad Bukhori Zainun (k12438440)
**Supervisor:** Prof. Stefan Pirker
**Department:** Particulate Flow Modelling, Johannes Kepler University Linz

## Contents

Step 1a (workflow setup on Windows 11) and Step 1b (a seven-point parameter sweep of the rCFD face-swap-diffusion knob $f_{sd}$) combined into a single interactive page with:

- A synchronised timeline scrubber that controls all eight animations at once (CFD reference + 7 rCFD cases).
- An interactive Plotly chart of $T_\text{mean}(t)$ and $CoG_y(t)$ for all cases — hover for exact values, click legend to toggle.
- An $f_{sd}$ picker that swaps one rCFD video against the CFD reference, with the matching error metrics card.
- Hover/click citation popovers and sortable error tables.
- Dark mode.

## Run locally

Just open `index.html` in a browser. No build step, no local web server required.

## Tech

Plain HTML + CSS + a small amount of vanilla JS. Math via KaTeX (CDN). Plot via Plotly.js (CDN). All time-series data is preloaded as a JS module (`assets/data/step1b_traces.js`) so it works under `file://`.

## License

Content © 2026 Mochamad Bukhori Zainun. Code under an MIT-style permissive licence for any future thesis reuse.
