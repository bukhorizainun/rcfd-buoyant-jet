#!/usr/bin/env python3
# Generate assets/data/localdiff_traces.js (window.localDiffTraces)
# Step-1 adiabatic comparison: CFD ref vs the global face-swap f_sd sweep
# (0.375 / 0.5 / 0.75, from the §6 sweep) vs no-tuning local diffusion
# (600-frame field-based database). Resampled to the 0..600 step-5 grid.
import json, os

HERE  = os.path.dirname(os.path.abspath(__file__))
CMP   = os.path.abspath(os.path.join(HERE, "..", "..", "..", "..", "step2_heatloss", "post", "compare"))
SWEEP = os.path.abspath(os.path.join(HERE, "..", "..", "..", "post"))  # bouyant_jet_replay/post (§6 f_sd sweep)

def load_out(path):
    """Return dict time(int seconds) -> (T_mean[K], CoG_y[m]); last row wins on dup time."""
    d = {}
    with open(path) as f:
        for line in f:
            p = line.split()
            if len(p) < 3:
                continue
            try:
                t = float(p[0]); T = float(p[1]); cog = float(p[2])
            except ValueError:
                continue
            d[int(round(t))] = (T, cog)
    return d

def resample(d, grid):
    last = max(d)
    T, C = [], []
    for g in grid:
        key = g if g in d else min(last, g)
        while key not in d and key > 0:
            key -= 1
        Tv, Cv = d[key]
        T.append(round(Tv, 3))
        C.append(round(Cv * 1000.0, 2))  # m -> mm
    return T, C

grid = list(range(0, 601, 5))

# no-tuning local diffusion, field-based 600-frame DB
lT, lC = resample(load_out(os.path.join(CMP, "local600_adia.out")), grid)
# global face-swap, hand-tuned f_sd sweep from §6 (original DB)
g0375T, g0375C = resample(load_out(os.path.join(SWEEP, "rCFD_diff_0375", "rCFD_temperature.out")), grid)
g05T,   g05C   = resample(load_out(os.path.join(SWEEP, "rCFD_diff_05",   "rCFD_temperature.out")), grid)
g075T,  g075C  = resample(load_out(os.path.join(SWEEP, "rCFD_diff_075",  "rCFD_temperature.out")), grid)

# CFD adiabatic, reuse the already time-aligned arrays from step2_traces.js
with open(os.path.join(HERE, "step2_traces.js")) as f:
    js = f.read()
_m = js.index("window.step2Traces"); _b = js.index("{", _m); _e = js.rindex("}")
obj = json.loads(js[_b:_e + 1])
cfdT = obj["cfd_adia"]
cfdC = obj["cfd_adia_cog"]

out = {
    "t": [float(x) for x in grid],
    "cfd": cfdT, "cfd_cog": cfdC,
    "local": lT, "local_cog": lC,
    # "global" = the hand-tuned best, f_sd=0.5 (kept for back-compat with the plot)
    "global": g05T, "global_cog": g05C,
    "g0375": g0375T, "g0375_cog": g0375C,
    "g05": g05T, "g05_cog": g05C,
    "g075": g075T, "g075_cog": g075C,
    "end": {
        "cfd": cfdT[-1], "local": lT[-1],
        "g0375": g0375T[-1], "g05": g05T[-1], "g075": g075T[-1],
        "cfd_cog": cfdC[-1], "local_cog": lC[-1],
        "g0375_cog": g0375C[-1], "g05_cog": g05C[-1], "g075_cog": g075C[-1],
    },
}

dst = os.path.join(HERE, "localdiff_traces.js")
with open(dst, "w") as f:
    f.write("// Step-1 local-diffusion adiabatic traces - auto-generated from compare/*.out + the §6 f_sd sweep\n")
    f.write("// CFD ref vs global face-swap f_sd={0.375,0.5,0.75} (§6) vs no-tuning local diffusion (600f field-based).\n")
    f.write("window.localDiffTraces = " + json.dumps(out, separators=(",", ":")) + ";\n")

print("wrote", dst)
print("end T_mean -> CFD %.2f | local %.3f | g0375 %.3f | g05 %.3f | g075 %.3f"
      % (cfdT[-1], lT[-1], g0375T[-1], g05T[-1], g075T[-1]))
print("local end vs g05 end: %.3f K" % (lT[-1] - g05T[-1]))
