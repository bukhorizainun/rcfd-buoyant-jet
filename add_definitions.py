"""Put the two labels on the site before the tables use them.

The note fixes what "declared sink" and "working point" mean at the head of the
matched-sink chapter. The site used both terms without ever saying so.
"""
import io
import os

os.chdir(os.path.dirname(os.path.abspath(__file__)))
P = "parts/new_17_matched.html"
s = io.open(P, encoding="utf-8", errors="replace").read()

if "Two labels are used from here on" in s:
    raise SystemExit("definisi sudah ada")

anchor = ("<p>Setting the sink alone, with no operator at all, already moves "
          "most of the distance.")
if anchor not in s:
    raise SystemExit("paragraf jangkar tidak ketemu")

block = (
    "<p>Two labels are used from here on, and it is worth fixing what they mean "
    "before the tables use them.</p>\n"
    "\n"
    "<p><em>Declared sink</em> is the replay run exactly as the case specifies: "
    "the wall coefficient set to the $h = 100$ W m<sup>&minus;2</sup>K<sup>&minus;1</sup> "
    "the case declares, with no operator. It is faithful to the written boundary "
    "condition, it removes 1930 J, and it is where the earlier sections were "
    "working. It is kept in every table as the column to improve on, because it "
    "shows what the replay does when it is told only what the case says.</p>\n"
    "\n"
    "<p><em>Working point</em> is the configuration this section arrives at: the "
    "coefficient raised so that the replay removes the heat the reference "
    "actually removes, plus the operator and strength that come out best on the "
    "ladder. The two differ in one quantity that was measured rather than "
    "chosen, the sink level, and in one that was tuned, the operator strength. "
    "Everything else, including the database and the schedule, is the same in "
    "both.</p>\n"
    "\n")

s = s.replace(anchor, block + anchor, 1)
io.open(P, "w", encoding="utf-8", errors="replace").write(s)
print("definisi declared sink / working point masuk site")
