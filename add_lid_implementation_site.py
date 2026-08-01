"""Site section 16: how each route is implemented, and the correction to the
claim that both act on the same 1125 places.
"""
import io
import os

os.chdir(os.path.dirname(os.path.abspath(__file__)))
P = "parts/new_16_sink_audit.html"
s = io.open(P, encoding="utf-8", errors="replace").read()

if "How each one is implemented" in s:
    raise SystemExit("sudah ada")

# --- the correction, where the claim is made ------------------------------
old = ("<p>The enclosure is a single wall zone of 16&thinsp;700 faces, so the "
       "condition cannot simply be set on it &mdash; that would cool every wall. A "
       "profile hands $h$ to the 1125 faces at the lid and zero to the rest, which "
       "is the same 1125 cells the source acts on. The volumetric source is "
       "switched off in that build, and the case, the restart field, the window and "
       "the time step are unchanged.</p>")
new = ("<p>The enclosure is a single wall zone of 16&thinsp;700 faces, so the "
       "condition cannot simply be set on it &mdash; that would cool every wall. A "
       "profile hands $h$ to the faces at the top of the tank and zero to the rest. "
       "The volumetric source is switched off in that build, and the case, the "
       "restart field, the window and the time step are unchanged.</p>\n"
       "\n"
       "<p>The two selections are not quite the same size, and it is worth saying so "
       "before the numbers are read. The source selects cells, and the top row is "
       "exactly 1125 of them. The profile selects wall faces by height, and the test "
       "it was first given, $y > y_\\text{max} - 0.5$ mm with $y_\\text{max} = 74.5$ "
       "mm the highest cell centre, also caught the topmost row of faces on the side "
       "walls, whose centres sit at 74.5 mm. That is 180 extra faces, 16&thinsp;% "
       "more area than the lid alone. The measurement below therefore reads high by "
       "up to that amount, which widens the gap it reports rather than narrowing it: "
       "4.5 W becomes about 3.9 W for the lid on its own, against 13.2 W for the "
       "volumetric path. The test has since been written as "
       "$y > y_\\text{max} + 0.2$ mm, which leaves the lid alone.</p>")
if old not in s:
    print("  koreksi tidak ketemu")
else:
    s = s.replace(old, new, 1)

# --- the implementation block, before the full-run section ----------------
anchor = "<h3>16.5 &mdash; The same question over the whole run</h3>"
if anchor not in s:
    raise SystemExit("jangkar 16.5 tidak ketemu")

CODE1 = """DEFINE_SOURCE(top_heat_loss, c, t, dS, eqn)
{
    C_CENTROID(x, c, t);
    cs = pow(C_VOLUME(c, t), 1.0/3.0);        /* cell edge length */

    if(Top_region_initialized &amp;&amp; (x[1] &gt; (Top_y_max - cs))){

        source  = -H_EXT * (C_T(c, t) - T_AMB) / cs;   /* (W/m3) */
        dS[eqn] = -H_EXT / cs;
        return source;
    }
    dS[eqn] = 0.0;
    return 0.0;
}"""

CODE2 = """DEFINE_PROFILE(lid_h_coeff, t, i_var)
{
    begin_f_loop(f, t){

        F_CENTROID(x, f, t);

        F_PROFILE(f, t, i_var) =
            (Top_region_initialized &amp;&amp; (x[1] &gt; (Top_y_max + 2.0e-4))) ? H_EXT : 0.0;

    }end_f_loop(f, t)
}"""

CODE3 = """/define/boundary-conditions/set/wall wall () thermal-bc yes convection q
/define/boundary-conditions/set/wall wall () convective-heat-transfer-coefficient
    yes yes "udf" "lid_h_coeff::libudf_cfd" q
/define/boundary-conditions/set/wall wall () tinf no 293 q"""

impl = (
    "<h3>16.5 &mdash; How each one is implemented</h3>\n"
    "\n"
    "<p>Both routes are a few lines, and they are worth putting side by side, "
    "because the whole of this section rests on the difference between them. Both "
    "need the same thing first: the height of the top of the tank. An on-demand "
    "function walks the cells once before the run and reduces the largest "
    "cell-centre height over the partitions, which on this mesh is "
    "$y_\\text{max} = 74.5$ mm.</p>\n"
    "\n"
    "<p>The volumetric source, as the reference case is run. Fluent calls it for "
    "every cell of the fluid zone:</p>\n"
    "\n<pre><code>" + CODE1 + "</code></pre>\n"
    "\n"
    "<p>The test $x_1 &gt; y_\\text{max} - c_s$ keeps the row whose centres are at "
    "74.5 mm and drops the next row down at 73.5 mm, so the source acts on exactly "
    "1125 cells. Dividing by $c_s$ turns the surface coefficient into a volumetric "
    "one: integrated over a cell of edge $c_s$ it is $h\\,c_s^2\\,(T-T_\\text{amb})$, "
    "the convective loss across the cell's top face. <code>dS</code> is the "
    "derivative Fluent uses to linearise the term, and setting it to zero changes "
    "the imbalance by 0.1 W, which is one of the controls above.</p>\n"
    "\n"
    "<p>The convective wall condition. The profile is attached to the wall zone from "
    "the journal, and Fluent calls it for every face of that zone:</p>\n"
    "\n<pre><code>" + CODE2 + "</code></pre>\n"
    "\n<pre><code>" + CODE3 + "</code></pre>\n"
    "\n"
    "<p>Faces that receive zero are adiabatic, so the floor, the side walls and the "
    "pipe walls carry no flux in either build. The threshold decides how much of the "
    "top is cooled: above $y_\\text{max}$ it is the lid, 1125 faces; below it, the "
    "topmost band of the side walls comes with it.</p>\n"
    "\n"
    "<p>The difference that matters is not the count. It is where the heat leaves "
    "from. The source takes it out of the cell, and nothing crosses the lid: the "
    "cell's own temperature sets the rate and there is no wall between the fluid and "
    "the ambient. The condition takes it out through the face, so the heat has to "
    "conduct through half a cell first and the wall resistance $\\Delta y / 2k$ adds "
    "to the film resistance $1/h$. On this mesh that second resistance is about eight "
    "per cent of the total, which is small; the factor of two the runs show is not "
    "accounted for by it, and that is the open part of the finding.</p>\n"
    "\n"
    "<h3>16.6 &mdash; The same question over the whole run</h3>")

s = s.replace(anchor, impl, 1)
s = s.replace("<h3>16.6 — The sign of the wall term</h3>",
              "<h3>16.7 — The sign of the wall term</h3>", 1)

io.open(P, "w", encoding="utf-8", errors="replace").write(s)
print("implementasi + koreksi masuk site")
