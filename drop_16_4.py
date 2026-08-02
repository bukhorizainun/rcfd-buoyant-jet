"""Drop 16.4: the same code already stands in 10.1.

Section 10.1 puts the CFD source term and its rCFD counterpart side by side,
which is what 16.4 was repeating. The subsections after it move up one, and the
one cross reference on the page moves with them.
"""
import io
import os
import shutil

os.chdir(os.path.dirname(os.path.abspath(__file__)))
P = "parts/new_16_sink_audit.html"
shutil.copy(P, "parts/archive/new_16_sink_audit.html.bak2")

s = io.open(P, encoding="utf-8", errors="replace").read()

a = s.find("<h3>16.4 &mdash; How the lid term is implemented</h3>")
b = s.find("<h3>16.5 &mdash; A gain on the wall term</h3>")
if a < 0 or b < 0 or b <= a:
    raise SystemExit("batas 16.4 tidak ketemu")
s = s[:a] + s[b:]

for old, new in [("<h3>16.5 &mdash; A gain on the wall term</h3>",
                  "<h3>16.4 &mdash; A gain on the wall term</h3>"),
                 ("<h3>16.6 &mdash; The family on the shaped gain</h3>",
                  "<h3>16.5 &mdash; The family on the shaped gain</h3>"),
                 ("<h3>16.7 — The sign of the wall term</h3>",
                  "<h3>16.6 — The sign of the wall term</h3>")]:
    if old not in s:
        raise SystemExit("judul tidak ketemu: " + old)
    s = s.replace(old, new, 1)

s = s.replace("The gain of &sect;16.5 puts the replay",
              "The gain of &sect;16.4 puts the replay")

io.open(P, "w", encoding="utf-8", errors="replace").write(s)
print("16.4 dihapus, sisanya naik satu")
