"""Site: the family on the shaped gain, all four metrics, replacing the reading
that was drawn from one member and one column."""
import io
import os

os.chdir(os.path.dirname(os.path.abspath(__file__)))
P = "parts/new_16_sink_audit.html"
s = io.open(P, encoding="utf-8", errors="replace").read()

if "fig_wallgain_metrics" in s:
    raise SystemExit("sudah ada")

old = ("<p><em>The sharpening operator does not belong on top of it.</em> Its ladder is "
       "monotone in the wrong direction, 1.43 K rising to 2.82 K, because the operator "
       "moves heat from the bulk to the top: useful when the top is too cold, harmful "
       "once the surface is removing the right amount in the right places.</p>\n"
       "\n"
       "<p>So there are two defensible configurations at different cost. With one fitted "
       "number and the shape from the recording, the end profile is within 1.43 K. With "
       "two, the constant gain and the operator strength, it is within 0.34 K. The second "
       "is the working point of this study; the first is what the recording can do on its "
       "own, and it is the one that survives a reader asking which numbers came from the "
       "answer.</p>")


def row(label, a, b, c, d, bold=()):
    def f(v, k):
        return "<strong>%s</strong>" % v if k in bold else v
    return ("<tr><td>%s</td><td class=\"num\">%s</td><td class=\"num\">%s</td>"
            "<td class=\"num\">%s</td><td class=\"num\">%s</td></tr>\n"
            % (label, f(a, 0), f(b, 1), f(c, 2), f(d, 3)))


new = (
    "<h3>16.8 &mdash; The family on the shaped gain</h3>\n"
    "\n"
    "<p>The end profile alone would have closed this section with the wrong sentence. "
    "Read on that column, the sharpening operator makes the shaped gain steadily worse, "
    "1.43 K rising to 2.82 K, and the natural conclusion is that it does not belong "
    "there. The other three metrics say something different, and so does the rest of the "
    "family, which had not been tried on it. Each member is taken at the strength it "
    "settled on in &sect;17, so what is compared is the form of the operator and not its "
    "strength.</p>\n"
    "\n"
    "<div class=\"table-wrap\">\n<table>\n<thead>\n"
    "<tr><th></th><th class=\"num\">$T_\\text{mean}$ (K)</th>"
    "<th class=\"num\">$\\delta T$ (K)</th><th class=\"num\">CoG (mm)</th>"
    "<th class=\"num\">profile (K)</th></tr>\n</thead>\n<tbody>\n"
    + row("Raised coefficient, no operator", "1.10", "3.03", "0.084", "2.26")
    + row("&nbsp;&nbsp;+ vertical and stability, $s=0.475$", "0.55", "1.70", "0.045", "0.34",
          bold=(0, 1, 2, 3))
    + row("Shaped gain, no operator", "2.53", "2.38", "0.045", "1.43", bold=(2, 3))
    + row("&nbsp;&nbsp;+ isotropic, $s=0.3$", "3.97", "4.75", "0.218", "3.04")
    + row("&nbsp;&nbsp;+ gradient normal, $s=0.5$", "3.11", "2.63", "0.105", "3.21")
    + row("&nbsp;&nbsp;+ vertical normal, $s=0.5$", "2.30", "1.89", "0.095", "3.15")
    + row("&nbsp;&nbsp;+ vertical and stability, $s=0.475$", "2.05", "1.62", "0.098", "2.82")
    + row("&nbsp;&nbsp;+ vertical and stability, $s=0.20$", "2.31", "1.89", "0.051", "1.60")
    + row("&nbsp;&nbsp;+ adaptive strength, $s=0.7$", "2.03", "1.59", "0.099", "2.77")
    + row("&nbsp;&nbsp;+ database-set strength, $s=0.5$", "2.02", "1.57", "0.099", "2.77",
          bold=(0, 1))
    + "</tbody>\n</table>\n</div>\n"
    "\n"
    "<figure class=\"wide\">\n"
    "  <img src=\"assets/figures/fig_wallgain_metrics.png\" alt=\"The four monitored "
    "quantities for the wall gain, with and without an operator\" loading=\"lazy\" "
    "decoding=\"async\">\n"
    "  <figcaption><span class=\"label\">Figure 100.</span> The four monitored quantities "
    "for the wall gain. The shaped gain reaches the right end temperature by the wrong "
    "path: it runs warm through the whole filling phase and only catches up at the end. "
    "An operator on top of it pulls the traces towards the reference and pushes the end "
    "profile away.</figcaption>\n"
    "</figure>\n"
    "\n"
    "<p>What the table shows is a trade, not a loss. On the shaped gain an operator "
    "improves both histories, the mean temperature from 2.53 to 2.02 K and the "
    "heterogeneity from 2.38 to 1.57 K, and worsens both end quantities, the profile from "
    "1.43 to 2.77 K and the height of the heat from 0.045 to 0.099 mm. Which way that "
    "reads depends on the column, and saying it in one direction would be choosing the "
    "column after seeing the answer.</p>\n"
    "\n"
    "<p>Two further things fall out of it. <em>The ranking inside the family is the same "
    "as on the raised coefficient</em>: the database-set strength and the adaptive one "
    "lead, the vertical normal with its stability test is level with them, then the "
    "vertical normal alone, then the gradient normal, and the isotropic form is worst by "
    "a distance, with a centre of gravity five times further out than the rest. That the "
    "ordering survives a change in how the wall term is written is worth more than any "
    "single number in the table.</p>\n"
    "\n"
    "<p><em>The right strength on the shaped gain is a weaker one.</em> At $s = 0.20$ the "
    "vertical normal with the stability test gives 2.31 / 1.89 / 0.051 / 1.60, which keeps "
    "the end state almost intact while taking part of the gain in the histories. That "
    "makes sense: the shaped gain already does part of the sharpening's work through "
    "where it removes heat, so less is left for the operator.</p>\n"
    "\n"
    "<p>So three configurations are defensible, at three costs. One fitted number and no "
    "operator gives the best end state for that price. One fitted number and a weak "
    "operator gives the best balance. Two fitted numbers, the constant gain and the "
    "strength of &sect;17, still win every column outright, and that remains the working "
    "point of this study.</p>")

if old not in s:
    raise SystemExit("paragraf lama tidak ketemu")
s = s.replace(old, new, 1)
s = s.replace("<h3>16.8 — The sign of the wall term</h3>",
              "<h3>16.9 — The sign of the wall term</h3>", 1)
io.open(P, "w", encoding="utf-8", errors="replace").write(s)
print("keluarga di atas gain berbentuk masuk site")
