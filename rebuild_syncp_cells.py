"""Rewrite the cells of the synchronised grid, now that the whole family is in it.

Nine panels. The reference first, then the case as written, then the five
operator forms on the gain, then the two on the recorded flux. Every one of them
was built from frames that already existed, so none of it cost solver time.

The labels name the wall term as well as the operator, which the older figures
did not: they said "the directional operator with the vertical normal" while
every one of them was running on the gain.
"""
import io
import os
import re

os.chdir(os.path.dirname(os.path.abspath(__file__)))
P = "parts/new_17_matched.html"
s = io.open(P, encoding="utf-8", errors="replace").read()

CELLS = [
    ("syncp_cfd", "CFD reference"),
    ("syncp_plain", "$h=100$ as the case carries it"),
    ("syncp_gain_grad", "gain, gradient normal, $s=0.5$"),
    ("syncp_gain_vert", "gain, vertical normal"),
    ("syncp_gain", "gain, vertical normal + stability, $s=0.475$"),
    ("syncp_gain_ld", "gain, database-set strength"),
    ("syncp_flux_s25", "flux + gain 3.0, vertical normal + stability, $s=0.25$"),
    ("syncp_flux_g35", "flux + gain 3.5, vertical normal + stability, $s=0.20$"),
]

cells = "\n".join(
    '      <div class="syncp-cell">\n'
    '        <video class="syncp-vid" muted playsinline preload="metadata">'
    '<source src="assets/videos/%s.mp4" type="video/mp4"></video>\n'
    '        <div class="syncp-lab">%s</div>\n'
    '      </div>' % (tag, lab) for tag, lab in CELLS)

a = s.find('<div class="syncp-grid">')
b = s.find("</div>", s.find("</div>", a) + 6)
if a < 0:
    raise SystemExit("grid tidak ketemu")
# replace everything between the grid opener and its closing </div>
start = a + len('<div class="syncp-grid">')
end = s.find("\n    </div>", start)
if end < 0:
    raise SystemExit("penutup grid tidak ketemu")
s = s[:start] + "\n" + cells + s[end:]

io.open(P, "w", encoding="utf-8", errors="replace").write(s)
print("grid ditulis ulang, %d sel" % len(CELLS))
