"""Bring the page into line with the note: the wall term is h = 100 with a gain.

The boundary-condition trial and the raised coefficient are taken out of the
family thread. What is left is the diagnosis, which stands on its own and is
what the section was written for, and the gain, which is what the study uses.
The removed subsections stay in the archive copy under parts/archive/ so the
work is not lost.

Figure numbers are then renumbered in reading order, since three figures go.
"""
import io
import os
import re
import shutil

os.chdir(os.path.dirname(os.path.abspath(__file__)))

P16 = "parts/new_16_sink_audit.html"
P17 = "parts/new_17_matched.html"
ARCH = "parts/archive"
if not os.path.isdir(ARCH):
    os.mkdir(ARCH)
for p in (P16, P17):
    shutil.copy(p, os.path.join(ARCH, os.path.basename(p) + ".bak"))

s = io.open(P16, encoding="utf-8", errors="replace").read()


def cut(text, start_mark, end_mark, what):
    a = text.find(start_mark)
    b = text.find(end_mark)
    if a < 0 or b < 0 or b <= a:
        raise SystemExit("tidak ketemu: " + what)
    return text[:a] + text[b:]


# 16.4 and 16.5's wall-BC half, and the whole of 16.6
s = cut(s, "<h3>16.4 &mdash; The same coefficient as a boundary condition</h3>",
        "<h3>16.5 &mdash; How each one is implemented</h3>", "16.4")
s = cut(s, "<p>The convective wall condition. The profile is attached",
        "<h3>16.6 &mdash; The same question over the whole run</h3>", "wall BC code")
s = cut(s, "<h3>16.6 &mdash; The same question over the whole run</h3>",
        "<h3>16.7 &mdash; Keeping the declared coefficient</h3>", "16.6")

# renumber and retitle what is left
s = s.replace("<h3>16.5 &mdash; How each one is implemented</h3>",
              "<h3>16.4 &mdash; How the lid term is implemented</h3>")
s = s.replace("<h3>16.7 &mdash; Keeping the declared coefficient</h3>",
              "<h3>16.5 &mdash; A gain on the wall term</h3>")
s = s.replace("<h3>16.8 &mdash; The family on the shaped gain</h3>",
              "<h3>16.6 &mdash; The family on the shaped gain</h3>")
s = s.replace("<h3>16.9 — The sign of the wall term</h3>",
              "<h3>16.7 — The sign of the wall term</h3>")

# the paragraph that opened 16.5 introduced two routes; only one is left
s = s.replace(
    "<p>Both routes are a few lines, and they are worth putting side by side, "
    "because the whole of this section rests on the difference between them. "
    "Both need the same thing first: the height of the top of the tank. An "
    "on-demand function walks the cells once before the run and reduces the "
    "largest cell-centre height over the partitions, which on this mesh is "
    "$y_\\text{max} = 74.5$ mm.</p>",
    "<p>The lid term is a few lines, and they are worth reading, because the "
    "rest of this section rests on what they do. The one thing they need "
    "first is the height of the top of the tank. An on-demand function walks "
    "the cells once before the run and reduces the largest cell-centre height "
    "over the partitions, which on this mesh is $y_\\text{max} = 74.5$ mm.</p>")

# the gain is now introduced on its own terms, not as a way of hiding h = 435
s = s.replace(
    "<p>Raising $h$ from 100 to 435 closes the gap, and &sect;17 is built on "
    "it. It is worth asking whether the same can be done without discarding "
    "the number the case states, because a reader who sees $h = 435$ in the "
    "code cannot tell what was added or why.</p>\n\n<p>It can, and the "
    "arithmetic is trivial: keep $h$ at its declared value and write the "
    "correction as a factor of its own,</p>",
    "<p>The measurement above leaves one thing to do. The replay applies the "
    "coefficient the case carries and removes 1930 J; the reference removes "
    "6581 J. The coefficient is not what is wrong, so it is left where it is "
    "and the correction is written as a factor of its own,</p>")
s = s.replace(
    "<p>with $G = 4.35$. That reproduces the raised-coefficient run digit for "
    "digit, at every one of the 601 samples, which is the check that the two "
    "are the same thing written twice. Nothing is bought except honesty: the "
    "declared coefficient stays visible and the correction is named.</p>",
    "<p>with $G = 4.35$. The value is not fitted to the temperature the "
    "replay should reach: it is set so that the two sides remove the same "
    "heat, 6623 J against 6581 J. Writing it this way rather than folding it "
    "into $h$ keeps the coefficient the case carries visible in the code and "
    "gives the correction a name, so a reader can see what was added and can "
    "set it back to one.</p>")

s = s.replace("Declared coefficient alone", "$h = 100$, no gain, no operator")
s = s.replace("Raised coefficient, no operator", "Constant gain, no operator")
s = s.replace(
    "<p><span class=\"label\">Table.</span> The wall gain, with $h$ left at "
    "the declared 100 throughout.",
    "<p><span class=\"label\">Table.</span> The wall gain, with $h$ at 100 "
    "throughout.")
s = s.replace("the constant gain and the strength of &sect;17, still win",
              "the gain and the strength of &sect;17, still win")
s = s.replace("The ranking inside the family is the same as on the raised "
              "coefficient", "The ranking inside the family is the same as "
              "on the constant gain")

io.open(P16, "w", encoding="utf-8", errors="replace").write(s)

# ---- 17 -----------------------------------------------------------------
t = io.open(P17, encoding="utf-8", errors="replace").read()
t = t.replace("17 &mdash; The Operator Family on a Matched Sink",
              "17 &mdash; The Operator Family on the Gain")
t = t.replace("17 — The Operator Family on a Matched Sink",
              "17 — The Operator Family on the Gain")
t = t.replace("Declared sink is the replay run exactly as the case specifies",
              "Sink only is the replay run exactly as the case specifies")
t = t.replace("no operator, matched sink only", "no operator, gain only")
t = t.replace("tried on the matched sink and none of them helps",
              "tried with the gain in place and none of them helps")
t = t.replace("all on the matched sink and the same schedule",
              "all with the same gain and the same schedule")
t = t.replace("on the matched sink. The interface forms too low",
              "with the gain alone. The interface forms too low")
t = t.replace("One defect survives the matched sink",
              "One defect survives the gain")
t = t.replace("Heat-loss database, declared sink", "Heat-loss database, no gain")
t = t.replace("Adiabatic database, matched sink", "Adiabatic database, with the gain")
t = t.replace("Heat-loss database, matched sink", "Heat-loss database, with the gain")
t = t.replace("CFDdeclared sink", "CFDsink alone")
t = t.replace("<th>declared sink</th>", "<th>sink alone</th>")
t = t.replace("declared sink", "sink alone")
t = t.replace("the plain replay under the declared boundary condition",
              "the plain replay with no gain")
t = t.replace("the plain replay under the declared coefficient",
              "the plain replay with no gain")
t = t.replace("under the declared coefficient", "with no gain")
t = t.replace("Under the declared coefficient", "With no gain")
io.open(P17, "w", encoding="utf-8", errors="replace").write(t)

# ---- figure numbers, in reading order -----------------------------------
n = [19]


def bump(m):
    n[0] += 1
    return "Figure %d." % n[0]


for p in (P16, P17):
    u = io.open(p, encoding="utf-8", errors="replace").read()
    u = re.sub(r"Figure (\d+)\.", bump, u)
    io.open(p, "w", encoding="utf-8", errors="replace").write(u)
print("gambar dinomori ulang 20 ..", n[0])
