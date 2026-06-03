/* ui/ar-scene.js — MindAR + A-Frame image-tracking scene (Features 1, 2, 3, 4).
 * Lazy-loads the AR engine, builds the anchored content, and manages the
 * found/lost lifecycle. Hotspot taps reuse the shared popup.
 */
import { $, el, loadScript, toast } from "../core/utils.js";
import { STATE } from "../core/state.js";
import { CDN, PATHS } from "../core/config.js";
import { openPopup } from "./hotspots.js";

let bannerShown = false;
let infoShownOnce = false;
let onFirstFoundCb = null;
let onErrorCb = null;

/* Where a hotspot's label box + transparent tap target sit relative to the dot.
 * Lets neighbouring hotspots push their labels to different sides so the text
 * never overlaps. Returns local offsets: lab = [x, y, z], hit = [x, y, w, h]. */
function labelGeom(dir, labelW) {
  const W = Math.max(0.2, labelW);
  switch ((dir || "down").toLowerCase()) {
    case "up":    return { lab: [0, 0.08, 0.002],  hit: [0, 0.04, W, 0.17] };
    case "left":  return { lab: [-(W / 2 + 0.05), 0, 0.002], hit: [-(W / 2 + 0.02), 0, W + 0.1, 0.12] };
    case "right": return { lab: [ (W / 2 + 0.05), 0, 0.002], hit: [ (W / 2 + 0.02), 0, W + 0.1, 0.12] };
    case "down":
    default:      return { lab: [0, -0.08, 0.002], hit: [0, -0.04, W, 0.17] };
  }
}

export async function startARScene(opts = {}) {
  onFirstFoundCb = opts.onFirstFound || null;
  onErrorCb = opts.onError || null;
  await loadScript(CDN.aframe);
  await loadScript(CDN.mindar);
  buildARScene();
}

function buildARScene() {
  const stage = $("#arStage");
  stage.classList.remove("hidden");
  stage.setAttribute("aria-hidden", "false");

  const aspect = (STATE.hotspots.meta && STATE.hotspots.meta.posterAspect) || 0.707;

  const scene = el("a-scene", {
    "mindar-image": `imageTargetSrc: ${PATHS.target}; autoStart: true; uiLoading: no; uiError: no; uiScanning: no; maxTrack: 1; filterMinCF: 0.0001; filterBeta: 0.01`,
    "color-space": "sRGB",
    renderer: "colorManagement: true, physicallyCorrectLights: true, antialias: true",
    "vr-mode-ui": "enabled: false",
    "device-orientation-permission-ui": "enabled: false",
    embedded: "",
  });

  const assets = el("a-assets");
  const vid = el("video", { id: "arCfdVideo", src: PATHS.cfdVideo, preload: "auto",
    loop: "", muted: "", playsinline: "", "webkit-playsinline": "", crossorigin: "anonymous" });
  vid.muted = true;
  assets.appendChild(vid);
  scene.appendChild(assets);

  scene.appendChild(el("a-camera", {
    position: "0 0 0", "look-controls": "enabled: false",
    cursor: "fuse: false; rayOrigin: mouse", raycaster: "objects: .clickable",
  }));

  const anchor = el("a-entity", { "mindar-image-target": "targetIndex: 0", id: "arAnchor" });
  const top = aspect / 2;

  // anchored title chip — floats clear above the poster's own printed title
  const titleY = top + 0.085;
  anchor.appendChild(el("a-plane", { width: "0.74", height: "0.092", position: `0 ${titleY} 0.005`,
    material: "color: #05070f; opacity: 0.82; shader: flat" }));
  anchor.appendChild(el("a-text", { value: "Buoyant Jet Flow · rCFD", align: "center", color: "#36d1ff",
    width: "1.15", position: `0 ${titleY + 0.015} 0.01`, baseline: "center" }));
  anchor.appendChild(el("a-text", { value: "tap the glowing points to explore",
    align: "center", color: "#cdd7ee", width: "0.9", position: `0 ${titleY - 0.024} 0.01`, baseline: "center" }));

  // small "LIVE CFD" monitor top-right
  const vidW = 0.34, vidH = vidW * 0.5;
  const vx = 0.5 - vidW / 2 - 0.03, vy = top - vidH / 2 - 0.03;
  anchor.appendChild(el("a-plane", { width: String(vidW + 0.025), height: String(vidH + 0.06),
    position: `${vx} ${vy} 0.008`, material: "color: #0a1530; opacity: 0.7; shader: flat" }));
  anchor.appendChild(el("a-text", { value: "LIVE CFD", color: "#36d1ff", width: "0.9", align: "center",
    position: `${vx} ${vy + vidH / 2 + 0.018} 0.012` }));
  anchor.appendChild(el("a-video", { src: "#arCfdVideo", width: String(vidW), height: String(vidH),
    position: `${vx} ${vy} 0.012` }));

  // hotspots
  STATE.hotspots.hotspots.forEach((h) => {
    const x = (h.u - 0.5) * 1.0;
    const y = (0.5 - h.v) * aspect;
    const color = h.color || "#36d1ff";
    const labelW = Math.min(0.46, Math.max(0.18, 0.06 + 0.028 * (h.label || "").length));
    const g = labelGeom(h.labelDir, labelW);

    const hs = el("a-entity", { position: `${x} ${y} 0.02`, class: "clickable", "data-id": h.id });

    // generous, near-invisible tap target so the whole dot+label area is clickable
    // (a small dot is hard to hit on a phone). Sits just behind the visuals.
    hs.appendChild(el("a-plane", {
      width: String(g.hit[2]), height: String(g.hit[3]),
      position: `${g.hit[0]} ${g.hit[1]} -0.001`,
      material: "color: #000; opacity: 0.001; transparent: true; shader: flat; side: double",
    }));

    hs.appendChild(el("a-circle", { radius: "0.03",
      material: `color: ${color}; shader: flat; opacity: 0.95; side: double` }));
    hs.appendChild(el("a-circle", { radius: "0.013",
      material: "color: #ffffff; shader: flat; opacity: 0.95; side: double", position: "0 0 0.001" }));
    const ring = el("a-ring", { "radius-inner": "0.034", "radius-outer": "0.044",
      material: `color: ${color}; shader: flat; opacity: 0.85; side: double` });
    ring.setAttribute("animation__pulse",
      "property: scale; from: 1 1 1; to: 2 2 2; dir: alternate; loop: true; dur: 1100; easing: easeOutQuad");
    ring.setAttribute("animation__fade",
      "property: material.opacity; from: 0.85; to: 0; dir: alternate; loop: true; dur: 1100");
    hs.appendChild(ring);

    hs.appendChild(el("a-plane", { width: String(labelW), height: "0.05",
      position: `${g.lab[0]} ${g.lab[1]} 0`, material: "color: #05070f; opacity: 0.85; shader: flat" }));
    hs.appendChild(el("a-text", { value: h.label, align: "center", color: "#ffffff",
      width: "0.95", position: `${g.lab[0]} ${g.lab[1]} ${g.lab[2]}`, baseline: "center" }));

    hs.addEventListener("click", () => openPopup(h));
    anchor.appendChild(hs);
  });

  anchor.addEventListener("targetFound", onTargetFound);
  anchor.addEventListener("targetLost", onTargetLost);
  scene.appendChild(anchor);
  stage.appendChild(scene);

  scene.addEventListener("arError", () => { if (onErrorCb) onErrorCb(); });
  scene.addEventListener("loaded", () => { STATE.arReady = true; });
}

function onTargetFound() {
  $("#scanHint").classList.add("hidden");
  const v = document.getElementById("arCfdVideo");
  if (v) { v.muted = true; v.play().catch(() => {}); }
  showBanner();
  if (!infoShownOnce) {
    infoShownOnce = true;
    setTimeout(() => {
      if (onFirstFoundCb) onFirstFoundCb();
      toast("Tap the glowing points on the poster to explore", 3500);
    }, 2400);
  }
}
function onTargetLost() {
  $("#scanHint").classList.remove("hidden");
  const v = document.getElementById("arCfdVideo");
  if (v) v.pause();
}

function showBanner() {
  const b = $("#banner");
  if (bannerShown) return;
  bannerShown = true;
  b.classList.remove("hidden", "out");
  b.style.animation = "none"; void b.offsetWidth; b.style.animation = "";
  setTimeout(() => { b.classList.add("out"); setTimeout(() => b.classList.add("hidden"), 500); }, 2200);
}

export function resetARScene() {
  bannerShown = false;
  infoShownOnce = false;
  const stage = $("#arStage");
  if (stage) { stage.classList.add("hidden"); stage.innerHTML = ""; }
}
