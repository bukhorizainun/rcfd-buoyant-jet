"""The opening summary still ends on the ladder of transport routes and on a
capture of about a third. Both are out of date, and the transport routes are no
longer on the page. This rewrites the second half of it around what the page now
follows: the local-rule family, the sink audit, and where it lands.
"""
import io
import os

os.chdir(os.path.dirname(os.path.abspath(__file__)))
P = "parts/00_head.html"
s = io.open(P, encoding="utf-8", errors="replace").read()

old = ("Under heat loss the same step makes the replay worse, its natural "
       "counterpart &mdash; a convective adjustment that mixes the unstable cold "
       "film downward &mdash; buys only a bounded share back (31% to 39% of the "
       "CFD cooling), and a prescribed circulation roll breaks that bound (73% at "
       "20&nbsp;mm/s, saturating near 82% at the top of the CFD speed range). "
       "Together they pin the remaining gap on the missing overturning flow, whose "
       "clean home is the database (&sect;14.1). Rebuilding that database from the "
       "cooling flow itself &mdash; this time with the local-diffusivity field "
       "stored &mdash; lifts the plain replay to 35%; on it the sharpening family "
       "all sit below the plain replay (a stability guard, which skips the unstable "
       "cold film, recovers part of the loss but a sharpening step can be kept from "
       "hurting the cooling, not made to add it), while a transport term &mdash; a "
       "mixing profile or a prescribed roll &mdash; sits <em>above</em>, the roll "
       "reaching 81% and an end state within half a Kelvin of the CFD "
       "(&sect;15.3&ndash;15.5). What none of it reproduces is the plume-by-plume "
       "feedback of the real cooling, the texture that still tells replay and "
       "reference apart.")

new = ("Under heat loss the same step first appeared to make the replay worse, and "
       "the family looked as though it had met a limit at about a third of the "
       "cooling. It had not. The denominator of that ratio, the heat the reference "
       "CFD actually loses at the lid, had never been measured: it removes 6581&nbsp;J "
       "where the coefficient the case declares accounts for 1575&nbsp;J, so most of "
       "the gap was a boundary condition the two sides did not share rather than a "
       "transport failure (&sect;16). With both sides removing the same heat, and "
       "with the operator left running for the whole replay, the family reaches an "
       "end profile within 0.34&nbsp;K of the reference, a mean temperature within "
       "0.55&nbsp;K, and field structure that matches the CFD to the third decimal "
       "(&sect;17). Two settings tie at the top and both are reported. What is still "
       "open is smaller and better posed: the front builds too slowly while the tank "
       "fills, and the field pattern renews about 40% faster than the reference's.")

if old not in s:
    raise SystemExit("paragraf TL;DR lama tidak ketemu persis, cek manual")

s = s.replace(old, new, 1)

s = s.replace("how far the reused database holds up once the tank loses heat.",
              "how far the reused database holds up once the tank loses heat, and "
              "what the local-rule family does once the reference's own cooling is "
              "measured rather than assumed.", 1)

io.open(P, "w", encoding="utf-8", errors="replace").write(s)
print("TL;DR diperbarui ke hasil sekarang, tanpa roll / mixing profile / CA")
