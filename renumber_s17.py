"""Section 17's figure numbers ran 34, 42, 43, 35, 36, 37... down the page.

Sections 1 to 16 end at Figure 33, so this renumbers section 17 in the order a
reader meets the figures. Nothing outside section 17 is touched, and no text in
the section refers to a figure by number, so the labels are the only change.
"""
import io
import os
import re

os.chdir(os.path.dirname(os.path.abspath(__file__)))
P = "parts/new_17_matched.html"
START = 34

s = io.open(P, encoding="utf-8", errors="replace").read()

inline = [m.group(0) for m in re.finditer(r"Figure\s+\d+", s)
          if "label\">" not in s[max(0, m.start() - 20):m.start()]]
if inline:
    raise SystemExit("ada rujukan nomor di teks, jangan dinomori ulang: %s" % inline)

seq = iter(range(START, START + 100))
out, seen = [], []


def bump(m):
    n = next(seq)
    seen.append((m.group(1), n))
    return "<span class=\"label\">Figure %d.</span>" % n


s = re.sub(r"<span class=\"label\">Figure (\d+)\.</span>", bump, s)
io.open(P, "w", encoding="utf-8", errors="replace").write(s)
print("section 17: " + ", ".join("%s->%d" % p for p in seen))
