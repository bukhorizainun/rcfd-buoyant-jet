"""Site section 16: the sketch of the two lid terms, and the full-length run.

The 25 s trial is already on the page. This adds the drawing that makes the
difference legible, and the result of running the same thing to the end, which
is what moves the capture ratio from a third to two thirds.
"""
import io
import os

os.chdir(os.path.dirname(os.path.abspath(__file__)))
P = "parts/new_16_sink_audit.html"
s = io.open(P, encoding="utf-8", errors="replace").read()

if "fig_lid_term_sketch" in s:
    raise SystemExit("sudah ada")

# 1. the sketch, right after the paragraph that sets up the trial
anchor = ("<p>The enclosure is a single wall zone of 16&thinsp;700 faces, so the "
          "condition cannot simply be set on it &mdash; that would cool every wall. A "
          "profile hands $h$ to the 1125 faces at the lid and zero to the rest, which "
          "is the same 1125 cells the source acts on. The volumetric source is "
          "switched off in that build, and the case, the restart field, the window and "
          "the time step are unchanged.</p>\n")
if anchor not in s:
    raise SystemExit("paragraf jangkar tidak ketemu")

sketch = anchor + (
    "\n<figure class=\"wide\">\n"
    "  <img src=\"assets/figures/fig_lid_term_sketch.png\" alt=\"The lid term drawn "
    "two ways: as a source inside the top cell row, and as a convective condition on "
    "the lid faces\" loading=\"lazy\" decoding=\"async\">\n"
    "  <figcaption><span class=\"label\">Figure 16a.</span> The two ways of writing "
    "the same lid term. Left, as the case is run: the sink is a source inside every "
    "cell of the top row, driven by that cell's own temperature, and the lid itself "
    "carries no flux. Right, the trial: the heat leaves through the lid faces, so it "
    "has to conduct through half a cell first and the wall resistance adds to the film "
    "resistance. The coefficient, the ambient temperature and the 1125 places are the "
    "same in both.</figcaption>\n"
    "</figure>\n")
s = s.replace(anchor, sketch, 1)

# 2. the full run, after the paragraph that closes the 25 s trial
close = ("<p>So the extra removal follows the volumetric path and not the physical "
         "statement of the boundary condition. That is as far as this evidence "
         "reaches: it says where to look, not what the mechanism is. The window is "
         "short and starts from a field already cooled for 180 s, so the absolute "
         "watts would move over a full run and the ratio is what should be read. The "
         "number is reported as measured, and every comparison below is made against "
         "the heat the reference actually removes.</p>")
if close not in s:
    raise SystemExit("paragraf penutup 16.4 tidak ketemu")

full = close + (
    "\n\n<h3>16.5 &mdash; The same question over the whole run</h3>\n"
    "\n"
    "<p>A 25 s window is a narrow place to settle something this consequential, so "
    "the wall condition was run to the end: the same case, the same start field, 630 "
    "episodes of five steps at $\\Delta t = 0.2$ s, the same 30 inner iterations, the "
    "same 1125 lid faces. The only difference from the reference is where the lid term "
    "is applied.</p>\n"
    "\n"
    "<div class=\"table-wrap\">\n"
    "<table>\n"
    "<thead>\n"
    "<tr><th></th><th class=\"num\">$T$ at end (K)</th>"
    "<th class=\"num\">cooling depth (K)</th>"
    "<th class=\"num\">share of the CFD</th></tr>\n"
    "</thead>\n"
    "<tbody>\n"
    "<tr><td>CFD, adiabatic</td><td class=\"num\">309.17</td>"
    "<td class=\"num\">&mdash;</td><td class=\"num\">&mdash;</td></tr>\n"
    "<tr><td>CFD, lid as a volumetric source</td><td class=\"num\">298.98</td>"
    "<td class=\"num\">10.19</td><td class=\"num\">100&thinsp;%</td></tr>\n"
    "<tr><td>CFD, lid as a wall condition, same $h$</td><td class=\"num\">303.85</td>"
    "<td class=\"num\">5.32</td><td class=\"num\">100&thinsp;%</td></tr>\n"
    "<tr><td>Replay, adiabatic</td><td class=\"num\">307.62</td>"
    "<td class=\"num\">&mdash;</td><td class=\"num\">&mdash;</td></tr>\n"
    "<tr class=\"best\"><td>Replay, $h = 100$ as declared, no operator</td>"
    "<td class=\"num\">304.04</td><td class=\"num\">3.59</td>"
    "<td class=\"num\">35.2&thinsp;% / <strong>67.4&thinsp;%</strong></td></tr>\n"
    "<tr><td>Replay, working point</td><td class=\"num\">299.39</td>"
    "<td class=\"num\">8.24</td>"
    "<td class=\"num\">80.9&thinsp;% / 154.8&thinsp;%</td></tr>\n"
    "</tbody>\n"
    "</table>\n"
    "</div>\n"
    "\n"
    "<p><span class=\"label\">Table.</span> The cooling depth is measured against each "
    "method's own adiabatic run. The last column gives that depth as a share of the "
    "CFD's, against the volumetric reference and against the wall condition.</p>\n"
    "\n"
    "<figure class=\"wide\">\n"
    "  <img src=\"assets/figures/fig_wallbc_traces.png\" alt=\"Mean temperature for the "
    "two ways of applying the lid term, against the replay\" loading=\"lazy\" "
    "decoding=\"async\">\n"
    "  <figcaption><span class=\"label\">Figure 16b.</span> Left: the mean temperature "
    "of the tank. The wall condition (blue) lies between the adiabatic run and the "
    "reference this study has been scored against (red). Right: the cooling each one "
    "achieves, measured against its own adiabatic run.</figcaption>\n"
    "</figure>\n"
    "\n"
    "<p>The replay's own number does not move. Under the coefficient the case declares "
    "it cools 3.59 K below its adiabatic run, and it did so before any of this was "
    "measured. What moves is the denominator: 35.2&thinsp;% of the cooling against the "
    "reference as it is run, <strong>67.4&thinsp;%</strong> against the same case with "
    "its boundary condition applied as stated. Two thirds of the reference's cooling, "
    "with nothing fitted at all &mdash; no coefficient raised, no strength tuned, no "
    "schedule chosen.</p>\n"
    "\n"
    "<p>The other half of that statement belongs in the same paragraph. The working "
    "point of &sect;17 is tied to the reference as it is run. Against the "
    "wall-condition case it removes 155&thinsp;% of the cooling and ends 4.5 K too "
    "cold. The coefficient of 435 W m<sup>&minus;2</sup>K<sup>&minus;1</sup> was set to "
    "match a removal that the volumetric path produces and the stated condition does "
    "not, so if the reference is ever re-based on the stated condition, that number "
    "goes with it.</p>\n"
    "\n"
    "<p>What the run cannot settle is the field. The database was recorded from the "
    "CFD with the volumetric source, so the motion it carries belongs to the stronger "
    "cooling. Comparing fields rather than energy against the wall-condition case would "
    "need a database recorded from that case, which is a preparation run of about "
    "fourteen hours. Nothing on this page needs it; it is the natural next step if the "
    "reference is to be re-based.</p>")
s = s.replace(close, full, 1)

# the sign test moves down one number
s = s.replace("<h3>16.5 — The sign of the wall term</h3>",
              "<h3>16.6 — The sign of the wall term</h3>", 1)

io.open(P, "w", encoding="utf-8", errors="replace").write(s)
print("sketsa + run penuh masuk site section 16")
