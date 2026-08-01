"""Six clips, not five: the second working point now has rendered frames too.

The clip goes in after the vertical normal, so the strip reads as the ladder
does: plain, isotropic, gradient normal, vertical normal, + stability test,
+ local-diff strength.
"""
import io
import os

os.chdir(os.path.dirname(os.path.abspath(__file__)))
P = "parts/new_17_matched.html"
s = io.open(P, encoding="utf-8", errors="replace").read()

if "vid_nadb_cfd_vs_stabtest.mp4" in s:
    raise SystemExit("klip sudah ada")

STYLE = ('style="max-width:1280px;width:100' + chr(37) +
         ';display:block;margin:0 auto;border-radius:6px;"')

block = (
    "<figure class=\"wide\">\n"
    "  <video controls muted playsinline preload=\"metadata\" " + STYLE + ">\n"
    "    <source src=\"assets/videos/vid_nadb_cfd_vs_stabtest.mp4\" type=\"video/mp4\">\n"
    "  </video>\n"
    "  <figcaption><span class=\"label\">Figure 41.</span> The first working "
    "point: the vertical normal with the stability test, $s = 0.475$. Skipping "
    "the links that are already statically unstable keeps the step from working "
    "against the overturning the database carries, and the interface holds "
    "through the cooling phase without the faint banding the previous clip "
    "shows below the front.</figcaption>\n"
    "</figure>\n\n")

anchor = ("<figure class=\"wide\">\n"
          "  <video controls muted playsinline preload=\"metadata\" " + STYLE + ">\n"
          "    <source src=\"assets/videos/vid_nadb_cfd_vs_workingpoint.mp4\" "
          "type=\"video/mp4\">")
if anchor not in s:
    raise SystemExit("klip titik kerja tidak ketemu")

s = s.replace(anchor, block + anchor, 1)

# the last clip is now the second working point, and its number moves on one
s = s.replace("<span class=\"label\">Figure 41.</span> The whole run",
              "<span class=\"label\">Figure 42.</span> The whole run", 1)
s = s.replace("reference on the left and the working point on the right",
              "reference on the left and the second working point, the "
              "database-set strength, on the right", 1)

# the lead sentence counts the clips
s = s.replace("<p>The same run, seen five ways.", "<p>The same run, seen six ways.", 1)

# the two figures after the clips shift by one
s = s.replace("<span class=\"label\">Figure 42.</span> The same four quantities",
              "<span class=\"label\">Figure 43.</span> The same four quantities", 1)
s = s.replace("<span class=\"label\">Figure 43.</span> Replay minus reference at two instants",
              "<span class=\"label\">Figure 44.</span> Replay minus reference at two instants", 1)

io.open(P, "w", encoding="utf-8", errors="replace").write(s)
print("klip stability test masuk, penomoran digeser")
