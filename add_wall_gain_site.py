"""Site section 16: the wall gain, so the declared coefficient can stay at 100
and the correction has a name of its own.
"""
import io
import os

os.chdir(os.path.dirname(os.path.abspath(__file__)))
P = "parts/new_16_sink_audit.html"
s = io.open(P, encoding="utf-8", errors="replace").read()

if "Keeping the declared coefficient" in s:
    raise SystemExit("sudah ada")

anchor = "<h3>16.7 — The sign of the wall term</h3>"
if anchor not in s:
    raise SystemExit("jangkar tidak ketemu")


def row(label, T, bulk, front, top, rms, bold=False):
    v = "<strong>%s</strong>" % rms if bold else rms
    return ("<tr><td>%s</td><td class=\"num\">%s</td><td class=\"num\">%s</td>"
            "<td class=\"num\">%s</td><td class=\"num\">%s</td>"
            "<td class=\"num\">%s</td></tr>\n" % (label, T, bulk, front, top, v))


block = (
    "<h3>16.7 &mdash; Keeping the declared coefficient</h3>\n"
    "\n"
    "<p>Raising $h$ from 100 to 435 closes the gap, and &sect;17 is built on it. "
    "It is worth asking whether the same can be done without discarding the number "
    "the case states, because a reader who sees $h = 435$ in the code cannot tell "
    "what was added or why.</p>\n"
    "\n"
    "<p>It can, and the arithmetic is trivial: keep $h$ at its declared value and "
    "write the correction as a factor of its own,</p>\n"
    "\n"
    "<p style=\"text-align:center\">$q_\\text{cell} = h\\,c_s^2\\,"
    "(T_\\text{cell} - T_\\text{amb})\\,G$</p>\n"
    "\n"
    "<p>with $G = 4.35$. That reproduces the raised-coefficient run digit for digit, "
    "at every one of the 601 samples, which is the check that the two are the same "
    "thing written twice. Nothing is bought except honesty: the declared coefficient "
    "stays visible and the correction is named.</p>\n"
    "\n"
    "<p>The interesting question is whether $G$ has to be a constant. The database "
    "stores, frame by frame and cell by cell, the mixing the CFD actually had, and "
    "the extra removal was shown above to be tied to the overturning the sink sets "
    "off. So the recording ought to know where the correction belongs. Writing</p>\n"
    "\n"
    "<p style=\"text-align:center\">$G = 1 + (G_0 - 1)\\,"
    "D_\\text{cell} / D_\\text{ref}$</p>\n"
    "\n"
    "<p>leaves one number, the level $G_0$, and takes the shape in space and time "
    "from the recording. That form can fail in a way the constant cannot, and the "
    "first version of it did: with $D_\\text{ref}$ taken as the largest recorded "
    "value anywhere in the field, the weight at the lid is small, because the largest "
    "values live in the jet. The correction is then nearly absent exactly where it is "
    "needed. Taking $D_\\text{ref}$ over the lid row instead asks the right question, "
    "which is how vigorously this piece of lid is being renewed compared with the "
    "rest of the lid.</p>\n"
    "\n"
    "<div class=\"table-wrap\">\n<table>\n<thead>\n"
    "<tr><th></th><th class=\"num\">$T$ end (K)</th><th class=\"num\">bulk</th>"
    "<th class=\"num\">front</th><th class=\"num\">top</th>"
    "<th class=\"num\">RMS (K)</th></tr>\n</thead>\n<tbody>\n"
    + row("Declared coefficient alone", "303.81", "+2.28", "+1.91", "+7.83", "5.15")
    + row("Constant gain, $G = 4.35$", "298.61", "+1.25", "&minus;1.19", "&minus;2.99", "2.26")
    + row("&nbsp;&nbsp;with the operator", "299.22", "+0.20", "&minus;0.03", "+0.22", "0.34", True)
    + row("Shaped, normalised over the field", "303.12", "+1.96", "+1.51", "+6.75", "4.44")
    + row("Shaped, normalised over the lid", "300.33", "+1.70", "&minus;0.13", "+0.37", "1.43", True)
    + row("&nbsp;&nbsp;level $G_0 = 6$", "299.13", "+1.48", "&minus;0.85", "&minus;2.16", "1.90")
    + row("&nbsp;&nbsp;level $G_0 = 9$", "297.51", "+1.15", "&minus;1.83", "&minus;5.52", "3.67")
    + row("&nbsp;&nbsp;level $G_0 = 12$", "296.40", "+0.90", "&minus;2.53", "&minus;7.80", "5.03")
    + row("Shaped + operator, $s = 0.20$", "300.64", "+1.13", "+0.36", "+2.16", "1.60")
    + row("&nbsp;&nbsp;$s = 0.30$", "300.82", "+0.87", "+0.71", "+3.08", "2.01")
    + row("&nbsp;&nbsp;$s = 0.40$", "301.01", "+0.64", "+1.09", "+3.91", "2.48")
    + row("&nbsp;&nbsp;$s = 0.475$", "301.14", "+0.47", "+1.39", "+4.44", "2.82")
    + "</tbody>\n</table>\n</div>\n"
    "\n"
    "<p><span class=\"label\">Table.</span> The wall gain, with $h$ left at the "
    "declared 100 throughout. The reference ends at 300.44 K. Both ladders are read "
    "as the strength ladder of &sect;17 is: the entry is the RMS departure of the end "
    "profile, and the zone columns show where it sits.</p>\n"
    "\n"
    "<p>Three things come out of it. <em>The shape earns its place.</em> At the same "
    "cost in fitted numbers, one, the shaped gain reaches 1.43 K where the constant "
    "reaches 2.26 K, and it ends 0.11 K from the reference without having been fitted "
    "to the end temperature at all.</p>\n"
    "\n"
    "<p><em>The level is already at its optimum.</em> Raising $G_0$ to 6, 9 and 12 "
    "makes it steadily worse, and the way it fails is instructive: the level only "
    "trades the bulk against the top. It cannot fix the bulk, because a wall term "
    "acts at the wall.</p>\n"
    "\n"
    "<p><em>The sharpening operator does not belong on top of it.</em> Its ladder is "
    "monotone in the wrong direction, 1.43 K rising to 2.82 K, because the operator "
    "moves heat from the bulk to the top: useful when the top is too cold, harmful "
    "once the surface is removing the right amount in the right places.</p>\n"
    "\n"
    "<p>So there are two defensible configurations at different cost. With one fitted "
    "number and the shape from the recording, the end profile is within 1.43 K. With "
    "two, the constant gain and the operator strength, it is within 0.34 K. The second "
    "is the working point of this study; the first is what the recording can do on its "
    "own, and it is the one that survives a reader asking which numbers came from the "
    "answer.</p>\n"
    "\n" + anchor)

s = s.replace(anchor, block, 1)
s = s.replace("<h3>16.7 — The sign of the wall term</h3>",
              "<h3>16.8 — The sign of the wall term</h3>", 1)
io.open(P, "w", encoding="utf-8", errors="replace").write(s)
print("wall gain masuk site")
