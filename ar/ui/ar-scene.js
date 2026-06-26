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
let targetVisible = false;
let onFirstFoundCb = null;
let onErrorCb = null;
let arScene = null;
let arAnchor = null;
let tapWired = false;

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

/* A floating "LIVE CFD" monitor that hovers beside the poster, showing the full
 * CFD recording (tank + floor) for one case. o = { cx, cy, w, src, label, color }.
 * The 600x320 (15:8) clip keeps the same look as the printed simulation. */
function liveMonitor(anchor, o) {
  const w = o.w, vh = w / 1.875;            // video is 600x320 (15:8)
  const cx = o.cx, vidY = o.cy;
  const headY = vidY + vh / 2 + 0.028;      // header label above the video
  const cardTop = headY + 0.026, cardBot = vidY - vh / 2 - 0.014;
  const cardCy = (cardTop + cardBot) / 2, cardH = cardTop - cardBot;

  // glow border + dark card backdrop
  anchor.appendChild(el("a-plane", { width: String(w + 0.032), height: String(cardH + 0.022),
    position: `${cx} ${cardCy} 0.004`, material: `color: ${o.color}; opacity: 0.5; shader: flat` }));
  anchor.appendChild(el("a-plane", { width: String(w + 0.022), height: String(cardH + 0.012),
    position: `${cx} ${cardCy} 0.006`, material: "color: #060a16; opacity: 0.95; shader: flat" }));
  // header: a small live dot + the case label
  anchor.appendChild(el("a-circle", { radius: "0.008", position: `${cx - w / 2 + 0.02} ${headY} 0.012`,
    material: `color: ${o.color}; shader: flat` }));
  anchor.appendChild(el("a-text", { value: o.label, color: o.color, width: "0.95", align: "center",
    position: `${cx} ${headY} 0.012`, baseline: "center" }));
  // the live CFD recording
  anchor.appendChild(el("a-video", { src: o.src, width: String(w), height: String(vh),
    position: `${cx} ${vidY} 0.012` }));
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
  // the two full CFD recordings shown in the floating LIVE CFD monitors
  [["arAdiaVideo", PATHS.adiaLive], ["arHlVideo", PATHS.hlLive]].forEach(([id, src]) => {
    const v = el("video", { id, src, preload: "auto",
      loop: "", muted: "", autoplay: "", playsinline: "", "webkit-playsinline": "", crossorigin: "anonymous" });
    v.muted = true;
    assets.appendChild(v);
  });
  scene.appendChild(assets);

  // No A-Frame cursor/raycaster here: inside a MindAR scene its click events
  // are unreliable on phones. Taps are handled manually in enableTapToExplore().
  scene.appendChild(el("a-camera", {
    position: "0 0 0", "look-controls": "enabled: false",
  }));

  const anchor = el("a-entity", { "mindar-image-target": "targetIndex: 0", id: "arAnchor" });
  const top = aspect / 2;

  // anchored title chip — floats clear above the poster's own printed title
  const titleY = top + 0.085;
  anchor.appendChild(el("a-plane", { width: "0.74", height: "0.092", position: `0 ${titleY} 0.005`,
    material: "color: #05070f; opacity: 0.82; shader: flat" }));
  anchor.appendChild(el("a-text", { value: "Buoyant Jet Flow · rCFD", align: "center", color: "#36d1ff",
    width: "1.15", position: `0 ${titleY + 0.015} 0.01`, baseline: "center" }));
  anchor.appendChild(el("a-text", { value: "tap the glowing points · live CFD plays beside the poster",
    align: "center", color: "#cdd7ee", width: "0.9", position: `0 ${titleY - 0.024} 0.01`, baseline: "center" }));

  // Two floating "LIVE CFD" monitors beside the poster (full recording, tank +
  // floor) — the adiabatic CFD run and the wall-heat-loss CFD run. They hover
  // just off the right edge so they never cover the printed figures.
  liveMonitor(anchor, { cx: 0.68, cy: 0.11, w: 0.34,
    src: "#arAdiaVideo", label: "LIVE CFD · Adiabatic", color: "#36d1ff" });
  liveMonitor(anchor, { cx: 0.68, cy: -0.20, w: 0.34,
    src: "#arHlVideo", label: "LIVE CFD · Heat loss h=100", color: "#ff7849" });

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

    anchor.appendChild(hs);
  });

  anchor.addEventListener("targetFound", onTargetFound);
  anchor.addEventListener("targetLost", onTargetLost);
  scene.appendChild(anchor);
  stage.appendChild(scene);

  arScene = scene;
  arAnchor = anchor;
  enableTapToExplore();

  scene.addEventListener("arError", () => { if (onErrorCb) onErrorCb(); });
  scene.addEventListener("loaded", () => { STATE.arReady = true; });
}

/* Manual tap handling. A-Frame's built-in cursor/raycaster does not fire
 * reliably for entities anchored inside a MindAR image target on phones, and a
 * mesh raycast against (near-invisible) hotspot planes is fragile. Instead we
 * listen for taps on the window, project each hotspot's world position to the
 * screen, and open whichever glowing point is nearest the tap — this mirrors
 * exactly what the user sees, so it is robust to raycaster/material/matrix
 * quirks. Listeners are wired once and read the live scene via module refs. */
function enableTapToExplore() {
  if (tapWired) return;
  tapWired = true;
  let lastTouch = 0;

  window.addEventListener("touchend", (e) => {
    if (!e.changedTouches || !e.changedTouches.length) return;
    lastTouch = Date.now();
    const t = e.changedTouches[0];
    onArTap(t.clientX, t.clientY, e.target);
  }, { passive: true, capture: true });

  // Desktop / fallback; skip the synthetic click that follows a touch.
  window.addEventListener("click", (e) => {
    if (Date.now() - lastTouch < 700) return;
    onArTap(e.clientX, e.clientY, e.target);
  }, true);
}

function onArTap(clientX, clientY, target) {
  if (!targetVisible || !arScene || !arAnchor) return;
  if (STATE.activePanel) return;
  if (!$("#popup").classList.contains("hidden")) return;
  // Ignore taps on the app chrome so dock/HUD/panels keep their own behaviour.
  if (target && target.closest &&
      target.closest("#hud, #dock, .panel, .popup, #start, #infoLayer, #model3d, #errorScreen, button, a, input"))
    return;

  const THREE = window.AFRAME && window.AFRAME.THREE;
  const canvas = arScene.canvas || (arScene.renderer && arScene.renderer.domElement);
  const cam = arScene.camera;
  if (!THREE || !canvas || !cam) return;

  const rect = canvas.getBoundingClientRect();
  const px = clientX - rect.left, py = clientY - rect.top;
  cam.updateMatrixWorld();
  arAnchor.object3D.updateWorldMatrix(true, true);

  const v = new THREE.Vector3();
  let best = null, bestD = Infinity;
  arAnchor.querySelectorAll(".clickable").forEach((e) => {
    e.object3D.getWorldPosition(v);
    v.project(cam);             // -> normalised device coords
    if (v.z > 1) return;        // behind the camera
    const sx = (v.x * 0.5 + 0.5) * rect.width;
    const sy = (-v.y * 0.5 + 0.5) * rect.height;
    const d = Math.hypot(sx - px, sy - py);
    if (d < bestD) { bestD = d; best = e; }
  });

  if (!best || bestD > 0.22 * Math.min(rect.width, rect.height)) return;
  const id = best.dataset && best.dataset.id;
  const h = id && STATE.hotspots.hotspots.find((x) => x.id === id);
  if (h) openPopup(h);
}

function playLiveVideos() {
  ["arAdiaVideo", "arHlVideo"].forEach((id) => {
    const v = document.getElementById(id);
    if (v) { v.muted = true; v.play().catch(() => {}); }
  });
}

function onTargetFound() {
  targetVisible = true;
  $("#scanHint").classList.add("hidden");
  // mobile can defer autoplay until the clips are ready — retry a couple of times
  playLiveVideos();
  setTimeout(playLiveVideos, 250);
  setTimeout(playLiveVideos, 800);
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
  targetVisible = false;
  $("#scanHint").classList.remove("hidden");
  ["arAdiaVideo", "arHlVideo"].forEach((id) => {
    const v = document.getElementById(id);
    if (v) v.pause();
  });
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
  targetVisible = false;
  arScene = null;
  arAnchor = null;
  const stage = $("#arStage");
  if (stage) { stage.classList.add("hidden"); stage.innerHTML = ""; }
}
