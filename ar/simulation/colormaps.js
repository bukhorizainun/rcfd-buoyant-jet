/* =====================================================================
 * simulation/colormaps.js — perceptually-uniform scientific colormaps.
 *
 * Inferno / Viridis / Magma / Plasma polynomial fits (no rainbow), shared
 * between the GLSL shaders (CMAPS_GLSL) and the HTML legends (sampleCmap).
 * Field-mode mapping used across the 3D viewer:
 *   0 Temperature → Inferno   (real CFD data)
 *   1 Velocity    → Viridis   (modelled from observed topology)
 *   2 Density     → Magma     (derived from T, Boussinesq)
 *   3 Buoyancy    → Plasma    (derived from T excess)
 * ===================================================================== */

/* GLSL: cfdColor(mode, s) returns a perceptual colour for scalar s in [0,1]. */
export const CMAPS_GLSL = /* glsl */ `
vec3 cmInferno(float t){
  const vec3 c0=vec3(0.0002189403691192265,0.001651004631001012,-0.01948089843709184);
  const vec3 c1=vec3(0.1065134194856116,0.5639564367884091,3.932712388889277);
  const vec3 c2=vec3(11.60249308247187,-3.972853965665698,-15.9423941062914);
  const vec3 c3=vec3(-41.70399613139459,17.43639888205313,44.35414519872813);
  const vec3 c4=vec3(77.162935699427,-33.40235894210092,-81.80730925738993);
  const vec3 c5=vec3(-71.31942824499214,32.62606426397723,73.20951985803202);
  const vec3 c6=vec3(25.13112622477341,-12.24266895238567,-23.07032500287172);
  return c0+t*(c1+t*(c2+t*(c3+t*(c4+t*(c5+t*c6)))));
}
vec3 cmViridis(float t){
  const vec3 c0=vec3(0.2777273272234177,0.005407344544966578,0.3340998053353061);
  const vec3 c1=vec3(0.1050930431085774,1.404613529898575,1.384590162594685);
  const vec3 c2=vec3(-0.3308618287255563,0.214847559468213,0.09509516302823659);
  const vec3 c3=vec3(-4.634230498983486,-5.799100973351585,-19.33244095627987);
  const vec3 c4=vec3(6.228269936347081,14.17993336680509,56.69055260068105);
  const vec3 c5=vec3(4.776384997670288,-13.74514537774601,-65.35303263337234);
  const vec3 c6=vec3(-5.435455855934631,4.645852612178535,26.3124352495832);
  return c0+t*(c1+t*(c2+t*(c3+t*(c4+t*(c5+t*c6)))));
}
vec3 cmMagma(float t){
  const vec3 c0=vec3(-0.002136485053939582,-0.000749655052795221,-0.005386127855323933);
  const vec3 c1=vec3(0.2516605407371642,0.6775232436837668,2.494026599312351);
  const vec3 c2=vec3(8.353717279216625,-3.577719514958484,0.3144679030132573);
  const vec3 c3=vec3(-27.66873308576866,14.26473078096533,-13.64921318813922);
  const vec3 c4=vec3(52.17613981234068,-27.94360607168351,12.94416944238394);
  const vec3 c5=vec3(-50.76852536473588,29.04658282127291,4.23415299384598);
  const vec3 c6=vec3(18.65570506591883,-11.48977351997711,-5.601961508734096);
  return c0+t*(c1+t*(c2+t*(c3+t*(c4+t*(c5+t*c6)))));
}
vec3 cmPlasma(float t){
  const vec3 c0=vec3(0.05873234392399702,0.02333670892565664,0.5433401826748754);
  const vec3 c1=vec3(2.176514634195958,0.2383834171260182,0.7539604599784036);
  const vec3 c2=vec3(-2.689460476458034,-7.455851135738909,3.110799939717086);
  const vec3 c3=vec3(6.130348345893603,42.3461881477227,-28.51885465332158);
  const vec3 c4=vec3(-11.10743619062271,-82.66631109428045,60.13984767418263);
  const vec3 c5=vec3(10.02306557647065,71.41361770095349,-54.07218655560067);
  const vec3 c6=vec3(-3.658713842777788,-22.93153465461149,18.19190778539828);
  return c0+t*(c1+t*(c2+t*(c3+t*(c4+t*(c5+t*c6)))));
}
vec3 cfdColor(float mode, float s){
  s = clamp(s, 0.0, 1.0);
  if (mode < 0.5) return cmInferno(s);
  if (mode < 1.5) return cmViridis(s);
  if (mode < 2.5) return cmMagma(s);
  return cmPlasma(s);
}`;

/* JS mirror of the same polynomials, for building the HTML legends. */
const COEFFS = {
  inferno: [[0.000218940,0.001651004,-0.019480898],[0.106513419,0.563956436,3.932712388],[11.60249308,-3.972853965,-15.94239410],[-41.70399613,17.43639888,44.35414519],[77.16293569,-33.40235894,-81.80730925],[-71.31942824,32.62606426,73.20951985],[25.13112622,-12.24266895,-23.07032500]],
  viridis: [[0.277727327,0.005407344,0.334099805],[0.105093043,1.404613529,1.384590162],[-0.330861828,0.214847559,0.095095163],[-4.634230498,-5.799100973,-19.33244095],[6.228269936,14.17993336,56.69055260],[4.776384997,-13.74514537,-65.35303263],[-5.435455855,4.645852612,26.31243524]],
  magma:   [[-0.002136485,-0.000749655,-0.005386127],[0.251660540,0.677523243,2.494026599],[8.353717279,-3.577719514,0.314467903],[-27.66873308,14.26473078,-13.64921318],[52.17613981,-27.94360607,12.94416944],[-50.76852536,29.04658282,4.234152993],[18.65570506,-11.48977351,-5.601961508]],
  plasma:  [[0.058732343,0.023336708,0.543340182],[2.176514634,0.238383417,0.753960459],[-2.689460476,-7.455851135,3.110799939],[6.130348345,42.34618814,-28.51885465],[-11.10743619,-82.66631109,60.13984767],[10.02306557,71.41361770,-54.07218655],[-3.658713842,-22.93153465,18.19190778]],
};

export function sampleCmap(name, t) {
  const c = COEFFS[name] || COEFFS.inferno;
  t = Math.min(1, Math.max(0, t));
  const out = [0, 0, 0];
  for (let k = 0; k < 3; k++) {
    let v = c[6][k];
    for (let i = 5; i >= 0; i--) v = v * t + c[i][k];
    out[k] = Math.round(Math.min(1, Math.max(0, v)) * 255);
  }
  return out;
}

/* CSS linear-gradient string for a legend bar. */
export function legendGradient(name, stops = 12) {
  const parts = [];
  for (let i = 0; i <= stops; i++) {
    const t = i / stops;
    const [r, g, b] = sampleCmap(name, t);
    parts.push(`rgb(${r},${g},${b}) ${Math.round(t * 100)}%`);
  }
  return `linear-gradient(to top, ${parts.join(", ")})`;
}

/* The four scientific field modes, with honest data provenance + units.
 * `ticks` are colorbar labels from TOP (scalar = 1) to BOTTOM (scalar = 0). */
export const FIELD_MODES = [
  { id: "temperature", label: "Temperature", cmap: "inferno", prov: "CFD data",
    ticks: ["333 K", "323", "313", "303", "293 K"] },
  { id: "velocity",    label: "Velocity",    cmap: "viridis", prov: "CFD data",
    ticks: ["0.029", "0.022", "0.014", "0.007", "0 m/s"] },
  { id: "density",     label: "Density",     cmap: "magma",   prov: "derived · Boussinesq",
    ticks: ["dense", "", "", "", "light"] },
  { id: "buoyancy",    label: "Buoyancy",    cmap: "plasma",  prov: "derived from ΔT",
    ticks: ["max", "", "", "", "0"] },
];
