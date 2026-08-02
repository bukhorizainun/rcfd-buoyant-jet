"""The wording the first pass could not reach, because of the markup around it.

Also drops the last mentions of a raised coefficient from the figure captions,
which is where they survived.
"""
import io
import os

os.chdir(os.path.dirname(os.path.abspath(__file__)))

P16 = "parts/new_16_sink_audit.html"
P17 = "parts/new_17_matched.html"

s = io.open(P16, encoding="utf-8", errors="replace").read()
s = s.replace(
    "The reference's own formula (dashed) and the replay under the declared "
    "coefficient sit together near 3.5 W, while the heat the reference "
    "actually loses (solid) runs about four times higher. Raising the "
    "replay's coefficient puts it on the measured curve. Right: the mean "
    "temperature that follows. Under the declared coefficient the replay "
    "tracks the <em>adiabatic</em> reference far more closely than the "
    "heat-loss one.",
    "The reference's own formula (dashed) and the replay with the wall term "
    "as the case writes it sit together near 3.5 W, while the heat the "
    "reference actually loses (solid) runs about four times higher. The gain "
    "of &sect;16.5 puts the replay on the measured curve. Right: the mean "
    "temperature that follows. Without the gain the replay tracks the "
    "<em>adiabatic</em> reference far more closely than the heat-loss one.")
io.open(P16, "w", encoding="utf-8", errors="replace").write(s)

t = io.open(P17, encoding="utf-8", errors="replace").read()
t = t.replace("17 &mdash; The Operator Family on a Matched Sink",
              "17 &mdash; The Operator Family on the Gain")
t = t.replace("The Operator Family on a Matched Sink",
              "The Operator Family on the Gain")
t = t.replace("<em>Declared sink</em> is the replay run exactly as the case "
              "specifies", "<em>Sink only</em> is the replay run exactly as "
              "the case specifies")
t = t.replace("all on the matched sink and the same colour scale",
              "all with the same gain and the same colour scale")
t = t.replace("on the matched sink", "with the gain")
t = t.replace("a matched sink", "the gain")
t = t.replace("the matched sink", "the gain")
t = t.replace("matched sink", "gain")
io.open(P17, "w", encoding="utf-8", errors="replace").write(t)
print("ok")
