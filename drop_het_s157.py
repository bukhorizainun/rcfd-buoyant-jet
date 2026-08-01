"""Section 15.7 still carries the heterogeneity as a column. It goes too, so the
heat-loss case is read on capture, front width and field distance only.
"""
import io
import os
import re

os.chdir(os.path.dirname(os.path.abspath(__file__)))
P = "parts/s15/10_15_10_letting_the_database_place_the_sha.html"
s = io.open(P, encoding="utf-8", errors="replace").read()

if r"$\delta T_\text{mean}$ (K)" not in s:
    raise SystemExit("kolom sudah tidak ada")

# the header cell, then the second numeric cell of every row of that table
s = s.replace('<th class="num">$\\delta T_\\text{mean}$ (K)</th>', "", 1)

head = s.index("<thead>")
tail = s.index("</tbody>", head)
block = s[head:tail]
rows = re.findall(r"<tr[^>]*><td>.*?</tr>", block)
for row in rows:
    cells = re.findall(r'<td class="num">.*?</td>', row)
    if len(cells) < 3:
        continue
    s = s.replace(row, row.replace(cells[1], "", 1), 1)

pairs = [
    ("The more the operator is held back, by the local diffusivity or by the "
     "gate, the closer the capture and the heterogeneity come to the plain "
     "replay and the wider the front grows; the more it is let go, the closer "
     "the front comes to the reference and the worse the other two get. No "
     "setting improves the heterogeneity below the plain replay's 9.30 K.",
     "The more the operator is held back, by the local diffusivity or by the "
     "gate, the closer the capture comes to the plain replay and the wider the "
     "front grows; the more it is let go, the closer the front comes to the "
     "reference and the more cooling it costs."),

    ("Judged on the two field numbers in the table above the order turns over: "
     "the gradient normal has both the thinner front, 4.97 against 5.07 mm, and "
     "the lower heterogeneity, 11.20 against 12.30 K.",
     "Judged on the front width in the table above the order turns over: the "
     "gradient normal carries the thinner front, 4.97 against 5.07 mm."),

    ("The gradient normal, which leads on front width and on heterogeneity, is "
     "last here.",
     "The gradient normal, which leads on front width, is last here."),
]
for a, b in pairs:
    if a not in s:
        print("  kalimat lewat:", a[:56])
        continue
    s = s.replace(a, b, 1)

io.open(P, "w", encoding="utf-8", errors="replace").write(s)
print("kolom heterogeneity dan kalimatnya dibuang dari 15.7")
