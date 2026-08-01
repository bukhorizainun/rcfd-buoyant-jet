"""Close the gaps the removed sections left in the figure numbers.

Figures 1 to 16b are referred to by number inside the text, so they stay exactly
as they are. Everything after them is only ever named in its own caption, so the
tail can be renumbered to run on from the last kept figure without breaking a
single reference.
"""
import io
import os
import re

os.chdir(os.path.dirname(os.path.abspath(__file__)))

PROTECT = 16          # last figure whose number appears in running text
LABEL = re.compile(r'<span class="label">Figure (\d+)([a-z]?)\.</span>')

s = io.open("build_site.py", encoding="utf-8", errors="replace").read()
i = s.index("# the family thread")
paths = []
for line in s[i:].split("\n"):
    m = re.search(r'(S15|S) \+ "([^"]+)"', line)
    if m:
        p = ("parts/s15/" if m.group(1) == "S15" else "parts/") + m.group(2)
        if os.path.exists(p):
            paths.append(p)

# first pass: read the tail numbers in page order
seq = []
for p in paths:
    t = io.open(p, encoding="utf-8", errors="replace").read()
    for m in LABEL.finditer(t):
        if int(m.group(1)) > PROTECT and not m.group(2):
            seq.append((p, m.group(1)))

nxt = PROTECT + 1
mapping = {}
for _, n in seq:
    if n not in mapping:
        mapping[n] = nxt
        nxt += 1

# second pass: rewrite, guarding against a number that is also a value in text by
# touching the caption span only
for p in set(pp for pp, _ in seq):
    t = io.open(p, encoding="utf-8", errors="replace").read()

    def sub(m):
        if m.group(2) or int(m.group(1)) <= PROTECT:
            return m.group(0)
        return '<span class="label">Figure %d.</span>' % mapping[m.group(1)]

    io.open(p, "w", encoding="utf-8", errors="replace").write(LABEL.sub(sub, t))

print("pemetaan:", ", ".join("%s->%d" % (k, v) for k, v in mapping.items()))
