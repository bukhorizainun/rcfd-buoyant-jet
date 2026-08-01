"""Strip the remaining transport rows and sentences from the family thread.

Table rows first, then the sentences that only exist to point at them, then the
pointers to sections that are no longer on the page.
"""
import io
import os
import re

os.chdir(os.path.dirname(os.path.abspath(__file__)))

# rows to delete, by a fragment of their label
ROW_KILL = {
    "parts/s15/10_15_10_letting_the_database_place_the_sha.html": [
        "prescribed roll, 20 mm/s",
        "roll at the convective scale",
        "step encroachment",
        "mixing profile 75 mm",
    ],
    "parts/s15/12_15_12_the_smallest_feature_the_replay_ca.html": [
        "step at the layer base",
        "profile-depth front",
    ],
    "parts/s15/08_15_8_where_the_cooling_actually_comes_fr.html": [
        "mixed layer", "entrainment at the layer base", "mixing profile 75 mm",
        "prescribed roll",
    ],
}

# sentence-level replacements
TEXT = [
    ("parts/s15/04_15_4_sharpening_on_the_recorded_cooling_.html",
     "Two ways of supplying it, a penetrative mixing profile and a prescribed "
     "circulation, are a study of their own and are kept together in §15.11. "
     "The wall-side account that explains why they work sits in",
     "Ways of supplying that transport are a study of their own and are not "
     "followed here. The wall-side account sits in"),

    ("parts/s15/06_15_6_the_pictures_against_the_numbers_ag.html",
     "Every replay in the table reaches its end state by some other route, whether "
     "smearing, sharpening, or a steady prescribed roll.",
     "Every replay in the table reaches its end state by some other route, by "
     "smearing or by sharpening."),

    ("parts/s15/12_15_12_the_smallest_feature_the_replay_ca.html",
     "and no arrangement of operators produced it: not the plume rule, not the "
     "anti-diffusion gated to the ceiling, not the two together. The profile-depth "
     "front settled at 2.90 mm, the floor to two decimal pl",
     "and no arrangement of operators produced it, including the anti-diffusion "
     "gated to the ceiling. The floor to two decimal pl"),
]


def kill_rows(path, keys):
    s = io.open(path, encoding="utf-8", errors="replace").read()
    n = 0
    for row in re.findall(r"<tr[^>]*><td>.*?</tr>\n?", s):
        label = re.sub(r"<[^>]+>", "", row)
        if any(k in label for k in keys):
            s = s.replace(row, "", 1)
            n += 1
    io.open(path, "w", encoding="utf-8", errors="replace").write(s)
    return n


for path, keys in ROW_KILL.items():
    if not os.path.exists(path):
        print("  hilang:", path)
        continue
    print("%-52s %d baris dibuang" % (os.path.basename(path)[:52], kill_rows(path, keys)))

for path, old, new in TEXT:
    s = io.open(path, encoding="utf-8", errors="replace").read()
    if old not in s:
        print("  kalimat tidak cocok di", os.path.basename(path)[:46])
        continue
    io.open(path, "w", encoding="utf-8", errors="replace").write(s.replace(old, new, 1))
    print("%-52s kalimat diperbaiki" % os.path.basename(path)[:52])
