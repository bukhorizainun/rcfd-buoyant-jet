"""Two clips for section 16: the same coefficient applied two ways, and the
wall-condition case against the replay that uses the coefficient as declared.

Both are drawn by Fluent in the same view and on the same colour scale, so the
comparison is field against field rather than number against number.
"""
import io
import os

os.chdir(os.path.dirname(os.path.abspath(__file__)))
P = "parts/new_16_sink_audit.html"
s = io.open(P, encoding="utf-8", errors="replace").read()

if "vid_cfd_volumetric_vs_wallbc" in s:
    raise SystemExit("klip sudah ada")

STYLE = ('style="max-width:1280px;width:100' + chr(37) +
         ';display:block;margin:0 auto;border-radius:6px;"')


def clip(src, caption):
    return ("<figure class=\"wide\">\n"
            "  <video controls muted playsinline preload=\"metadata\" " + STYLE + ">\n"
            "    <source src=\"assets/videos/" + src + "\" type=\"video/mp4\">\n"
            "  </video>\n"
            "  <figcaption>" + caption + "</figcaption>\n"
            "</figure>\n\n")


block = (
    "<p>The whole run, seen twice. Temperature on the left of each panel and "
    "pathlines on the right, the same view and the same 293 to 333 K scale the "
    "reference frames use.</p>\n"
    "\n"
    + clip("vid_cfd_volumetric_vs_wallbc.mp4",
           "The same coefficient, two ways of applying it: the volumetric source "
           "on the left, the convective wall condition on the right. While the "
           "inflow is hot the two are hard to tell apart. After it stops they "
           "separate steadily, and by the end the source has taken the upper layer "
           "to about 305 K while the condition leaves it near 320 K.")
    + clip("vid_wallbc_vs_replay_h100.mp4",
           "The wall-condition case on the left against the replay on the right, "
           "with the replay using the coefficient the case declares and no operator "
           "at all. The two end within 0.2 K of each other in mean temperature. "
           "The fields do not match: the replay's interface is smeared where the "
           "reference holds it sharp, which is the transport question this study "
           "is about, now separated from the accounting question.")
)

anchor = "<h3>16.6 &mdash; The same question over the whole run</h3>"
if anchor not in s:
    raise SystemExit("jangkar 16.6 tidak ketemu")

# the clips belong at the end of the full-run section, before the sign test
tail = "<h3>16.7 — The sign of the wall term</h3>"
if tail not in s:
    raise SystemExit("jangkar 16.7 tidak ketemu")
s = s.replace(tail, block + tail, 1)

io.open(P, "w", encoding="utf-8", errors="replace").write(s)
print("dua klip masuk site")
