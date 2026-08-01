"""Site section 16: add the boundary-condition trial.

The volumetric source and a convective wall condition state the same physics.
Handing the same coefficient to the solver the other way removes 4.5 W where
the source path removes 13, which is the most direct evidence available that
the extra removal follows the implementation rather than the stated condition.
"""
import io
import os

os.chdir(os.path.dirname(os.path.abspath(__file__)))
P = "parts/new_16_sink_audit.html"
s = io.open(P, encoding="utf-8", errors="replace").read()

if "16.4 &mdash; The same coefficient" in s:
    raise SystemExit("bagian wall-BC sudah ada")

old = ("<p>The extra removal is therefore tied to the buoyancy-driven convection "
       "the sink sets off, and not to the sink's own value, its linearisation, "
       "the time step or the iteration count. That is as far as the present "
       "evidence reaches. The cause is left open, the number is reported as "
       "measured, and every comparison below is made against the heat the "
       "reference actually removes.</p>")

new = (
    "<p>The extra removal is therefore tied to the buoyancy-driven convection "
    "the sink sets off, and not to the sink's own value, its linearisation, the "
    "time step or the iteration count.</p>\n"
    "\n"
    "<h3>16.4 &mdash; The same coefficient as a boundary condition</h3>\n"
    "\n"
    "<p>There is one more way to ask the question, and it is the most direct. "
    "The lid term does not have to be a volumetric source at all. The same $h$ "
    "and the same ambient temperature can be handed to the solver as a "
    "convective wall boundary condition, which is how such a term is usually "
    "written. If the removal is a property of cooling the lid at "
    "$h = 100$ W m<sup>&minus;2</sup>K<sup>&minus;1</sup>, the two routes "
    "should agree.</p>\n"
    "\n"
    "<p>The enclosure is a single wall zone of 16&thinsp;700 faces, so the "
    "condition cannot simply be set on it &mdash; that would cool every wall. A "
    "profile hands $h$ to the 1125 faces at the lid and zero to the rest, which "
    "is the same 1125 cells the source acts on. The volumetric source is "
    "switched off in that build, and the case, the restart field, the window and "
    "the time step are unchanged.</p>\n"
    "\n"
    "<div class=\"table-wrap\">\n"
    "<table>\n"
    "<thead>\n"
    "<tr><th>Route</th><th class=\"num\">source (W)</th>"
    "<th class=\"num\">residual (W)</th><th class=\"num\">total (W)</th></tr>\n"
    "</thead>\n"
    "<tbody>\n"
    "<tr><td>Volumetric source, $h = 100$, as the case is run</td>"
    "<td class=\"num\">3.47</td><td class=\"num\">9.76</td>"
    "<td class=\"num\"><strong>13.2</strong></td></tr>\n"
    "<tr><td>Convective wall condition, same $h$, same faces</td>"
    "<td class=\"num\">0.00</td><td class=\"num\">4.48</td>"
    "<td class=\"num\"><strong>4.5</strong></td></tr>\n"
    "<tr><td>Null control, $h = 0$</td>"
    "<td class=\"num\">0.00</td><td class=\"num\">&minus;1.16</td>"
    "<td class=\"num\">&minus;1.2</td></tr>\n"
    "</tbody>\n"
    "</table>\n"
    "</div>\n"
    "\n"
    "<p><span class=\"label\">Table.</span> The lid term by three routes, over "
    "the same 20 s window inside the hot plateau, restarted from the same stored "
    "field. The budget carries no wall term, so in the boundary-condition build "
    "the residual <em>is</em> the wall flux.</p>\n"
    "\n"
    "<p>The wall condition removes 4.48 W, close to the 3.44 W the declared "
    "formula gives on the reference's own field. It reads a little above it for "
    "a plain reason: with no source cooling the top row, the fluid there stays "
    "warmer, so the same coefficient sees a larger temperature difference. What "
    "matters is the scale &mdash; about four and a half watts where the "
    "volumetric path removes about thirteen.</p>\n"
    "\n"
    "<p>So the extra removal follows the volumetric path and not the physical "
    "statement of the boundary condition. That is as far as this evidence "
    "reaches: it says where to look, not what the mechanism is. The window is "
    "short and starts from a field already cooled for 180 s, so the absolute "
    "watts would move over a full run and the ratio is what should be read. The "
    "number is reported as measured, and every comparison below is made against "
    "the heat the reference actually removes.</p>")

if old not in s:
    raise SystemExit("paragraf penutup 16.3 tidak ketemu")
s = s.replace(old, new, 1)

# the sign test moves down one number
s = s.replace("<h3>16.4 — The sign of the wall term</h3>",
              "<h3>16.5 — The sign of the wall term</h3>", 1)

io.open(P, "w", encoding="utf-8", errors="replace").write(s)
print("site: uji wall-BC masuk section 16")
