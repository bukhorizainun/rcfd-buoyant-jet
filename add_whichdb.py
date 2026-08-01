"""Site section 17: the control that says why the database has to carry the cooling.

The obvious challenge to the matched sink is that the sink is a term the replay
applies for itself, so an adiabatic recording with a raised coefficient ought to
do the same job. It does not, and the six runs that show it belong on the page
next to the working points.
"""
import io
import os

os.chdir(os.path.dirname(os.path.abspath(__file__)))
P = "parts/new_17_matched.html"
s = io.open(P, encoding="utf-8", errors="replace").read()

if "Why the recording has to carry the cooling" in s:
    raise SystemExit("bagian ini sudah ada")

anchor = "<h3>17.5 &mdash; What is left</h3>"
if anchor not in s:
    anchor = "<h3>17.5 — What is left</h3>"
if anchor not in s:
    raise SystemExit("judul 17.5 tidak ketemu")

block = (
    "<h3>17.5 &mdash; Why the recording has to carry the cooling</h3>\n"
    "\n"
    "<p>The paragraph above invites a fair challenge. If the sink is what "
    "matters, and the sink is a term the replay applies for itself, then the "
    "adiabatic database ought to do just as well: record the flow once without "
    "heat loss, raise the coefficient, and let the term do the cooling. It would "
    "save building a database per boundary condition.</p>\n"
    "\n"
    "<p>It was run rather than argued about. The same six configurations on the "
    "adiabatic database, at the same coefficient, everything else unchanged.</p>\n"
    "\n"
    "<div class=\"table-wrap\">\n"
    "<table>\n"
    "<thead>\n"
    "<tr><th></th><th class=\"num\">$T$ at 599 s (K)</th>"
    "<th class=\"num\">profile RMS (K)</th>"
    "<th class=\"num\">$E_\\text{wall}$ (J)</th></tr>\n"
    "</thead>\n"
    "<tbody>\n"
    "<tr><td>Reference CFD</td><td class=\"num\">299.51</td>"
    "<td class=\"num\">&mdash;</td><td class=\"num\">6581</td></tr>\n"
    "<tr><td>Heat-loss database, declared sink</td><td class=\"num\">303.81</td>"
    "<td class=\"num\">5.15</td><td class=\"num\">1930</td></tr>\n"
    "<tr><td>Adiabatic database, matched sink</td><td class=\"num\">301.52</td>"
    "<td class=\"num\">4.71</td><td class=\"num\">4229</td></tr>\n"
    "<tr><td>Heat-loss database, matched sink</td><td class=\"num\">298.61</td>"
    "<td class=\"num\">2.26</td><td class=\"num\">6623</td></tr>\n"
    "<tr><td>&nbsp;&nbsp;+ working point</td><td class=\"num\">299.22</td>"
    "<td class=\"num\"><strong>0.34</strong></td><td class=\"num\">6881</td></tr>\n"
    "</tbody>\n"
    "</table>\n"
    "</div>\n"
    "\n"
    "<p>Raising the coefficient on the adiabatic recording moves the end profile "
    "from 5.15 to 4.71 K. Raising the same coefficient on the heat-loss recording "
    "moves it from 5.15 to 2.26 K. The coefficient is identical in both, so the "
    "difference is the motion the recording carries and nothing else.</p>\n"
    "\n"
    "<p>The reason is in the form of the sink. It removes "
    "$h A (T_\\text{cell} - T_\\text{amb})$, so it is driven by the temperature "
    "difference it has already created. On the adiabatic recording nothing "
    "carries the cooled fluid away from the lid: the top row cools, the "
    "difference collapses, and the term throttles itself. At a coefficient set "
    "to remove 6.6 kJ it manages 4.2 kJ. On the heat-loss recording the "
    "descending plumes keep taking the film down and bringing warm fluid up, so "
    "the same coefficient keeps finding a temperature difference to work on.</p>\n"
    "\n"
    "<p>The operators make it worse there, not better. On the adiabatic database "
    "they run from 7.27 to 11.74 K against 4.71 K with no operator at all, and "
    "the vertical normal drops the removal to 3375 J. Sharpening seals a film "
    "that nothing is carrying away.</p>\n"
    "\n"
    "<p>The practical reading is that the pairing is between a database and a "
    "cooling regime, not between a database and a single coefficient. Within the "
    "regime the recording came from, the coefficient is a free parameter, and the "
    "same heat-loss database serves the whole ladder from the declared value up "
    "to the matched one. Outside it, as the adiabatic case shows, no value of the "
    "coefficient recovers what the motion does not contain.</p>\n"
    "\n")

s = s.replace(anchor, block + "<h3>17.6 &mdash; What is left</h3>", 1)
io.open(P, "w", encoding="utf-8", errors="replace").write(s)
print("site: kontrol DB adiabatik masuk sebagai 17.5, 'what is left' jadi 17.6")
