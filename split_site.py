"""Split index.html into a head, one file per section, and a tail.

Same reason as the report: reordering a 4000-line page by hand invites silent
damage. Once the sections are files, the order lives in build_site.py and the
sections themselves are never touched when the order changes.

A section starts at the <section> wrapper that carries an <h2>, so the wrapper
tags stay with their content.
"""
import io
import os
import re

os.chdir(os.path.dirname(os.path.abspath(__file__)))
OUT = "parts"
os.makedirs(OUT, exist_ok=True)

lines = io.open("index.html", encoding="utf-8", errors="replace").read().splitlines(True)

# every line that opens a section, and the h2 that names it
starts = []
for i, ln in enumerate(lines):
    if "<h2" in ln:
        j = i
        while j > 0 and "<section" not in lines[j]:
            j -= 1
        title = re.sub(r"<[^>]*>", "", ln).strip()
        starts.append((j if "<section" in lines[j] else i, title))

# drop duplicates that can appear if two h2 share a wrapper
seen, clean = set(), []
for a, t in starts:
    if a in seen:
        continue
    seen.add(a)
    clean.append((a, t))
starts = clean


def slug(t):
    t = t.replace("&mdash;", " ").replace("&amp;", " ")
    t = re.sub(r"[^A-Za-z0-9]+", "_", t).strip("_").lower()
    return t[:44]


io.open(os.path.join(OUT, "00_head.html"), "w", encoding="utf-8",
        errors="replace").write("".join(lines[:starts[0][0]]))

names = []
for k, (a, title) in enumerate(starts):
    b = starts[k + 1][0] if k + 1 < len(starts) else len(lines)
    fn = "%02d_%s.html" % (k + 1, slug(title))
    io.open(os.path.join(OUT, fn), "w", encoding="utf-8",
            errors="replace").write("".join(lines[a:b]))
    names.append((fn, b - a, title))

for fn, n, title in names:
    print("%-52s %5d lines" % (fn, n))
print("\nhead: %d lines" % starts[0][0])
