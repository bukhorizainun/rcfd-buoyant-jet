"""Site section 17: carry both working points instead of one.

Mirrors the change made in the note. The vertical normal with the stability
test and the database-set strength land on the same number; reporting one and
dropping the other would claim a separation the ladder does not show.
"""
import io
import os

os.chdir(os.path.dirname(os.path.abspath(__file__)))
P = "parts/new_17_matched.html"
s = io.open(P, encoding="utf-8", errors="replace").read()

pairs = [
    # 17.3 closing paragraph
    ("<p>Its ladder peaks at $s = 0.5$ with an end-profile RMS of 0.36 K, level "
     "with the two best fixed-strength operators. It is taken as the working "
     "point, not because it wins on the numbers, which it does not do by any "
     "margin worth claiming, but because it carries one assumption fewer and "
     "because it is the same idea the rest of the study rests on: the "
     "recording, not a global constant, decides what the replay does.</p>",

     "<p>Its ladder peaks at $s = 0.5$ with an end-profile RMS of 0.36 K, level "
     "with the best fixed-strength operator.</p>\n"
     "\n"
     "<p>Two configurations are carried forward rather than one, because the "
     "numbers cannot separate them. The directional operator with the vertical "
     "normal and the stability test, at $s = 0.475$, is the plain minimum of "
     "the ladder at 0.34 K, and it is the simpler of the two to state: a fixed "
     "direction, a fixed strength, one test. The database-set strength reaches "
     "0.36 K, the same answer within the resolution of the metric, and it "
     "reaches it with the strength following the recorded diffusivity instead "
     "of a number chosen by hand. The fixed one is the smaller claim; the "
     "database-set one is the same idea the rest of the study rests on, that "
     "the recording rather than a global constant should decide what the "
     "replay does. Where a figure below shows a single field, it is the "
     "database-set strength, because that is the run whose frames were "
     "rendered.</p>"),

    ("<h3>17.4 &mdash; Where the working point stands</h3>",
     "<h3>17.4 &mdash; Where the working points stand</h3>"),
    ("<h3>17.4 — Where the working point stands</h3>",
     "<h3>17.4 — Where the working points stand</h3>\n"
     "\n"
     "<p>Both sit next to the plain replay under the declared boundary "
     "condition, which is where this study started. They agree on every number "
     "they share, by less than the difference either one has from the "
     "reference, so the choice between them is not made on the metrics. The "
     "last four rows are read from rendered frames, and those exist for the "
     "database-set strength only.</p>"),

    ('<tr><th></th><th class="num">CFD</th><th class="num">declared sink</th>'
     '<th class="num">working point</th></tr>',
     '<tr><th></th><th class="num">CFD</th><th class="num">declared sink</th>'
     '<th class="num">vertical normal<br>+ stability, $s=0.475$</th>'
     '<th class="num">local-diff strength<br>$s=0.50$</th></tr>'),

    ('<tr><td>End profile, RMS (K)</td><td class="num">—</td><td class="num">5.15</td><td class="num"><strong>0.36</strong></td></tr>',
     '<tr><td>End profile, RMS (K)</td><td class="num">—</td><td class="num">5.15</td><td class="num"><strong>0.34</strong></td><td class="num"><strong>0.36</strong></td></tr>'),
    ('<tr><td>&nbsp;&nbsp;bulk / front / top (K)</td><td class="num">—</td><td class="num">+2.28 / +1.91 / +7.83</td><td class="num">+0.20 / −0.18 / +0.17</td></tr>',
     '<tr><td>&nbsp;&nbsp;bulk / front / top (K)</td><td class="num">—</td><td class="num">+2.28 / +1.91 / +7.83</td><td class="num">+0.20 / −0.03 / +0.22</td><td class="num">+0.20 / −0.18 / +0.17</td></tr>'),
    ('<tr><td>Mean temperature, RMS (K)</td><td class="num">—</td><td class="num">4.11</td><td class="num"><strong>0.54</strong></td></tr>',
     '<tr><td>Mean temperature, RMS (K)</td><td class="num">—</td><td class="num">4.11</td><td class="num">0.55</td><td class="num"><strong>0.54</strong></td></tr>'),
    ('<tr><td>Heterogeneity, RMS (K)</td><td class="num">—</td><td class="num">2.42</td><td class="num"><strong>1.65</strong></td></tr>',
     '<tr><td>Heterogeneity, RMS (K)</td><td class="num">—</td><td class="num">2.42</td><td class="num">1.70</td><td class="num"><strong>1.65</strong></td></tr>'),
    ('<tr><td>Centre of gravity, RMS (mm)</td><td class="num">—</td><td class="num">0.09</td><td class="num"><strong>0.04</strong></td></tr>',
     '<tr><td>Centre of gravity, RMS (mm)</td><td class="num">—</td><td class="num">0.09</td><td class="num"><strong>0.04</strong></td><td class="num"><strong>0.04</strong></td></tr>'),
    ('<tr><td>Field distance (K)</td><td class="num">—</td><td class="num">3.51</td><td class="num"><strong>1.46</strong></td></tr>',
     '<tr><td>Field distance (K)</td><td class="num">—</td><td class="num">3.51</td><td class="num">n/m</td><td class="num"><strong>1.46</strong></td></tr>'),
    ('<tr><td>&nbsp;&nbsp;after 400 s</td><td class="num">—</td><td class="num">3.88</td><td class="num"><strong>0.60</strong></td></tr>',
     '<tr><td>&nbsp;&nbsp;after 400 s</td><td class="num">—</td><td class="num">3.88</td><td class="num">n/m</td><td class="num"><strong>0.60</strong></td></tr>'),
    ('<tr><td>Layering anomaly $A$</td><td class="num">0.0184</td><td class="num">0.0315</td><td class="num"><strong>0.0183</strong></td></tr>',
     '<tr><td>Layering anomaly $A$</td><td class="num">0.0184</td><td class="num">0.0315</td><td class="num">n/m</td><td class="num"><strong>0.0183</strong></td></tr>'),
    ('<tr><td>Front roughness $R$</td><td class="num">0.0051</td><td class="num">0.0067</td><td class="num"><strong>0.0051</strong></td></tr>',
     '<tr><td>Front roughness $R$</td><td class="num">0.0051</td><td class="num">0.0067</td><td class="num">n/m</td><td class="num"><strong>0.0051</strong></td></tr>'),
    ('<tr><td>Pattern renewal $\\tau_{50}$ (s)</td><td class="num">14.7</td><td class="num">19.5</td><td class="num">9.6</td></tr>',
     '<tr><td>Pattern renewal $\\tau_{50}$ (s)</td><td class="num">14.7</td><td class="num">19.5</td><td class="num">n/m</td><td class="num">9.6</td></tr>'),

    # figure captions that show the database-set run
    ("green is the plain replay under the declared coefficient, gold the working point,",
     "green is the plain replay under the declared coefficient, gold the database-set working point,"),
    ("Middle the sink matched and the operator off. Right the working point.",
     "Middle the sink matched and the operator off. Right the database-set working point."),
]

for a, b in pairs:
    if a not in s:
        print("  lewat:", a[:58])
        continue
    s = s.replace(a, b, 1)

io.open(P, "w", encoding="utf-8", errors="replace").write(s)
print("site: dua titik kerja")
