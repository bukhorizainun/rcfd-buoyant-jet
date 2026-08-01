"""Put the four family comparison clips into section 17, ahead of the working point."""
import io
import os

os.chdir(os.path.dirname(os.path.abspath(__file__)))
P = "parts/new_17_matched.html"

STYLE = ('style="max-width:1280px;width:100' + chr(37) +
         ';display:block;margin:0 auto;border-radius:6px;"')

CLIPS = [
    (37, "vid_nadb_cfd_vs_plain.mp4",
     "No operator at all, on the matched sink. The interface forms too low and "
     "too soft and keeps spreading for the whole run. This is what the "
     "sharpening has to work on."),
    (38, "vid_nadb_cfd_vs_isotropic.mp4",
     "The isotropic operator. Sharpening every face without a direction tears "
     "the layer below the interface into fingers that have no counterpart in "
     "the reference, which is the clearest sign that a direction is needed."),
    (39, "vid_nadb_cfd_vs_gradnormal.mp4",
     "The directional operator with the gradient normal. The front is held, but "
     "the direction comes from the data and the operator keeps reading the "
     "sideways ripples as fronts, so the layer below stays warmer than the "
     "reference."),
    (40, "vid_nadb_cfd_vs_vertnormal.mp4",
     "The directional operator with the vertical normal. Ignoring the sideways "
     "structure gives a cleaner interface at the right height; what is left is "
     "the build-up while the inflow is hot."),
]

LEAD = ("<p>The same run, seen five ways. The reference is on the left in every "
        "clip and the replay on the right, all on the matched sink and the same "
        "colour scale. Watch the interface: where it forms, whether it holds, "
        "and what the layer above does once the inflow stops.</p>\n\n")


def figure(num, src, caption):
    return ("<figure class=\"wide\">\n"
            "  <video controls muted playsinline preload=\"metadata\" " + STYLE + ">\n"
            "    <source src=\"assets/videos/" + src + "\" type=\"video/mp4\">\n"
            "  </video>\n"
            "  <figcaption><span class=\"label\">Figure " + str(num) + ".</span> "
            + caption + "</figcaption>\n"
            "</figure>\n\n")


def main():
    s = io.open(P, encoding="utf-8", errors="replace").read()
    if "vid_nadb_cfd_vs_plain.mp4" in s:
        raise SystemExit("klip sudah ada, tidak diulang")

    anchor = "<figure class=\"wide\">\n  <video controls muted playsinline preload=\"metadata\""
    i = s.index(anchor)
    block = LEAD + "".join(figure(n, f, c) for n, f, c in CLIPS)
    s = s[:i] + block + s[i:]
    s = s.replace("<span class=\"label\">Figure 37.</span> The whole run",
                  "<span class=\"label\">Figure 41.</span> The whole run")
    io.open(P, "w", encoding="utf-8", errors="replace").write(s)
    print("empat klip dipasang, video titik kerja jadi Figure 41")


if __name__ == "__main__":
    main()
