"""Replace the six stacked clips of section 17 with one synchronised grid.

Figures 27 to 32 each ran the full width and stood one under the other, so the
comparison they exist for could not be made without scrolling. The grid of
Figure 11e does it in one screen, and unlike 11e the reference sits inside the
grid rather than in another section.

Four panels, one row: the reference, the replay with the coefficient the case
carries, the working point of the earlier note, and the working point on the
recorded flux. A fifth is carried underneath for the more even of the two flux
settings.
"""
import io
import os
import re
import shutil

os.chdir(os.path.dirname(os.path.abspath(__file__)))
P = "parts/new_17_matched.html"
shutil.copy(P, "parts/archive/new_17_matched.html.bak3")
L = io.open(P, encoding="utf-8", errors="replace").read().split("\n")

start = None
end = None
for i, ln in enumerate(L):
    if "The same run, seen six ways" in ln:
        start = i
    if "Figure 32." in ln:
        end = i + 2          # the </figure> that closes it
if start is None or end is None:
    raise SystemExit("batas blok video tidak ketemu")

CELLS = [
    ("syncp_cfd", "CFD reference"),
    ("syncp_plain", "replay, $h = 100$ as the case carries it"),
    ("syncp_gain", "gain, vertical normal with the stability test, $s = 0.475$"),
    ("syncp_flux_s25",
     "recorded flux and gain 3.0, vertical normal with the stability test, $s = 0.25$"),
    ("syncp_flux_g35",
     "recorded flux and gain 3.5, vertical normal with the stability test, $s = 0.20$"),
]

cells = "\n".join(
    '      <div class="syncp-cell">\n'
    '        <video class="syncp-vid" muted playsinline preload="metadata">'
    '<source src="assets/videos/%s.mp4" type="video/mp4"></video>\n'
    '        <div class="syncp-lab">%s</div>\n'
    '      </div>' % (tag, lab) for tag, lab in CELLS)

block = """<p>The same run, five ways, in sync and on one colour scale. The reference is the first panel rather than a figure in another section, so the comparison needs no memory. Watch three things: the thin bright band under the lid, which is the cooled film and which the plain replay never builds; where the interface forms and whether it holds; and the first seconds, when the hot water arrives.</p>

<figure class="wide">
  <div class="syncp">
    <div class="syncp-grid">
%s
    </div>
  </div>
  <figcaption><span class="label">Figure 27.</span> The reference and four replays over the whole run, played together. The plain replay has no film under the lid and lets the cooling seep downward. The gain builds the film and reaches the right end temperature, but its interface is the softest of the three. The two on the recorded flux hold the interface and the film, and they pay for it where the jet enters: the rising plume is stepped there in a way the reference is not, which is the flux acting on an anomaly far larger than anything in the layer it was meant to move.</figcaption>
</figure>
""" % cells

L[start:end + 1] = block.split("\n")
io.open(P, "w", encoding="utf-8", errors="replace").write("\n".join(L))
print("blok video 27-32 diganti grid syncp, %d sel" % len(CELLS))
