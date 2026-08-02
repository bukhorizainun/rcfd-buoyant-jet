"""Close the figure numbering after four sections left the page.

Captions come in three shapes here: "Figure 12.", "Figure 9b.", and
"Figure 9c (interactive).". A family shares its number and differs by letter, so
the map is on the number alone and the letters ride along. References in the
running text are rewritten with the same map, and the run refuses to write
anything if a reference would be left pointing at a caption that no longer
exists.
"""
import io
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.chdir(os.path.dirname(os.path.abspath(__file__)))
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from build_site import ORDER  # noqa: E402

CAP = re.compile(r"(<figcaption>.{0,60}?Figure\s+)(\d+)([a-z]?)", re.S)
REF = re.compile(r"(?<![>\w])Figure\s+(\d+)([a-z]?)")

order = []
for p in ORDER:
    s = io.open(p, encoding="utf-8", errors="replace").read()
    for m in CAP.finditer(s):
        n = int(m.group(2))
        if n not in order:
            order.append(n)

mapping = {old: new for new, old in enumerate(order, 1)}
changed = ", ".join("%d->%d" % (a, b) for a, b in sorted(mapping.items()) if a != b)
print("peta:", changed or "tidak ada yang berubah")

missing = set()
for p in ORDER:
    s = io.open(p, encoding="utf-8", errors="replace").read()
    for m in REF.finditer(s):
        if int(m.group(1)) not in mapping:
            missing.add(int(m.group(1)))
if missing:
    raise SystemExit("acuan ke gambar yang sudah tidak ada: %s" % sorted(missing))

for p in ORDER:
    s = io.open(p, encoding="utf-8", errors="replace").read()
    o = s
    s = CAP.sub(lambda m: m.group(1) + str(mapping[int(m.group(2))]) + m.group(3), s)
    s = REF.sub(lambda m: "Figure %d%s" % (mapping[int(m.group(1))], m.group(2)), s)
    if s != o:
        io.open(p, "w", encoding="utf-8", errors="replace").write(s)
print("gambar:", len(order))
