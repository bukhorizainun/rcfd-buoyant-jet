"""Section 15 now reads 15.1, 15.2, 15.3, 15.4, 15.6, 15.8, 15.10, 15.12.

The gaps are where the transport sections used to be. This closes them and
carries every cross-reference in the remaining text along with the change.
"""
import io
import os
import re

os.chdir(os.path.dirname(os.path.abspath(__file__)))

MAP = {"15.6": "15.5", "15.8": "15.6", "15.10": "15.7", "15.12": "15.8"}

s = io.open("build_site.py", encoding="utf-8", errors="replace").read()
i = s.index("# the family thread")
paths = []
for line in s[i:].split("\n"):
    m = re.search(r'(S15|S) \+ "([^"]+)"', line)
    if m:
        paths.append(("parts/s15/" if m.group(1) == "S15" else "parts/") + m.group(2))

total = 0
for p in paths:
    if not os.path.exists(p):
        continue
    t = io.open(p, encoding="utf-8", errors="replace").read()
    before = t
    # two passes through a placeholder so 15.8 -> 15.6 cannot collide with the
    # 15.8 that 15.10 has just become
    for old, new in MAP.items():
        t = re.sub(r"\b" + old.replace(".", r"\.") + r"\b", "@@" + new + "@@", t)
    t = t.replace("@@", "")
    if t != before:
        io.open(p, "w", encoding="utf-8", errors="replace").write(t)
        n = sum(len(re.findall(r"\b" + o.replace(".", r"\.") + r"\b", before))
                for o in MAP)
        total += n
        print("%-52s %d nomor diubah" % (os.path.basename(p)[:52], n))

print("total %d" % total)
