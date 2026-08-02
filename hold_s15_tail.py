"""Hold the last four subsections of section 15 out of the page.

Each is superseded rather than wrong, so none is deleted from disk; they move to
the list that is kept but not assembled, where seven other sections already sit.

  15.5 pictures against the numbers  the lesson is carried into 17; the runs it
                                     is built on are older than the ones there
  15.6 where the cooling comes from  16.1 measures the same term better and says
                                     where the two readings disagree
  15.7 database sets the sharpening  17.3 covers it with newer numbers
  15.8 smallest feature held         one idea, belongs in the glossary
"""
import io
import os

os.chdir(os.path.dirname(os.path.abspath(__file__)))
P = "build_site.py"
s = io.open(P, encoding="utf-8", errors="replace").read()

MOVED = [
    "06_15_6_the_pictures_against_the_numbers_ag.html",
    "08_15_8_where_the_cooling_actually_comes_fr.html",
    "10_15_10_letting_the_database_place_the_sha.html",
    "12_15_12_the_smallest_feature_the_replay_ca.html",
]

n = 0
for f in MOVED:
    line = '    S15 + "%s",\n' % f
    if line in s:
        s = s.replace(line, "", 1)
        n += 1

add = "".join('    S15 + "%s",\n' % f for f in MOVED)
if "OTHER_BODY = [\n" not in s:
    raise SystemExit("jangkar OTHER_BODY tidak ketemu")
s = s.replace("OTHER_BODY = [\n", "OTHER_BODY = [\n" + add, 1)

io.open(P, "w", encoding="utf-8", errors="replace").write(s)
print("dikeluarkan dari ORDER: %d dari %d" % (n, len(MOVED)))
