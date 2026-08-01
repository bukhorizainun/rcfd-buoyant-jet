"""Section 14: keep the local-diffusion and sharpening result, drop the routes
that add transport.

Convective adjustment, the penetrative mixing profile and the prescribed roll
all answer a different question from the one this page follows. They stay in the
repository, they just no longer sit inside the family thread.
"""
import io
import os
import re

os.chdir(os.path.dirname(os.path.abspath(__file__)))
P = "parts/14_14_does_local_diffusion_help.html"
s = io.open(P, encoding="utf-8", errors="replace").read()

if "The counterpart: convective adjustment" not in s:
    raise SystemExit("bagian ini sudah dibersihkan")

# 1. the run of blocks from the convective-adjustment paragraph up to and
#    including the ladder figure, which charts the roll rungs
start = s.index("<p><strong>The counterpart: convective adjustment.</strong>")
end = s.index('<figure class="wide">\n  <img src="assets/figures/fig_negdiff_montage_ld_hl.png"')
cut = s[start:end]
s = s[:start] + s[end:]

# 2. the table rows for those same routes
rows_out = ["convective adjustment (one sweep)",
            "convective adjustment (ten sweeps)",
            "directional + adjustment (ten sweeps)",
            "penetrative mixing profile",
            "strong mixing profile",
            "prescribed roll, 5 mm/s",
            "prescribed roll, 20 mm/s",
            "prescribed roll, 40 mm/s",
            "prescribed roll, 50 mm/s"]
kept = []
for row in re.findall(r"<tr[^>]*><td>.*?</tr>\n?", s):
    label = re.sub(r"<[^>]+>", "", row)
    if any(k in label for k in rows_out):
        s = s.replace(row, "", 1)
    else:
        kept.append(label[:44])

# 3. the closing paragraph pointed at the adjustment as one of its two ends
old = ("the scalar side is now measured out on both ends of it: the diffusion "
       "model does not close it (§14), removing the diffusion makes it worse, "
       "and the convective adjustment buys back only its bounded share. All of "
       "it points at the same place")
new = ("the scalar side is now measured out on both ends of it: the diffusion "
       "model does not close it (§14), and removing the diffusion makes it "
       "worse. Both point at the same place")
if old in s:
    s = s.replace(old, new, 1)
else:
    print("  paragraf penutup tidak cocok, cek manual")

io.open(P, "w", encoding="utf-8", errors="replace").write(s)
print("dibuang %d karakter (CA + mixing profile + roll + ladder figure)" % len(cut))
print("baris tabel tersisa:")
for k in kept:
    print("   ", k)
