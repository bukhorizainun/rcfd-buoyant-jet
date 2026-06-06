/* =====================================================================
 * viewer3d.js — standalone 3D buoyant-jet viewer (Feature 5)
 *
 * ES module, lazy-loaded by app.js only when the 3D panel opens.
 * Touch gestures (OrbitControls): one finger = rotate, two fingers =
 * zoom + pan. Lighting + shadows + smooth rendering included.
 *
 * It first tries to load assets/models/buoyant_jet.glb. If that file is
 * absent (the default), it builds a procedural buoyant-jet scene: a glass
 * tank, an inlet, and a particle plume coloured by temperature that rises
 * under buoyancy — a faithful, dependency-free stand-in for a real GLB.
 * ===================================================================== */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { createJetField, makeLOD } from "./simulation/jet-gpu.js";
import { createStreamlines } from "./simulation/streamlines.js";
import { createGlyphs } from "./simulation/glyphs.js";
import { createSlice } from "./simulation/slice.js";
import { loadRealField } from "./simulation/cfd-field.js";

const FOOT = {
  real: "Streamlines · glyphs · slice · particles — all from the real rCFD field (Fluent replay, 85k cells)",
  model: "Analytic laminar model — clean two-vortex topology (model, not solver data)",
};

export async function createViewer(host, opts = {}) {
  const onMode = opts.onMode || (() => {});

  /* ---- renderer ---- */
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  host.appendChild(renderer.domElement);

  /* ---- scene + camera ---- */
  const scene = new THREE.Scene();
  scene.background = null; // CSS gradient shows through
  const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 100);
  // start nearly face-on to the symmetry (x-y) plane so the two recirculation
  // vortices read clearly; a small offset keeps a sense of depth
  camera.position.set(0.9, 0.5, 5.0);

  /* ---- controls (touch: rotate / zoom / pan) ---- */
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = true;
  controls.minDistance = 1.6;
  controls.maxDistance = 12;
  controls.target.set(0, 0.2, 0);

  /* ---- lighting ---- */
  scene.add(new THREE.AmbientLight(0x88aaff, 0.5));
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(3, 5, 2);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 0.5; key.shadow.camera.far = 20;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x36d1ff, 0.8);
  rim.position.set(-3, 1, -2);
  scene.add(rim);

  /* ---- ground (catches shadow) ---- */
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(6, 48),
    new THREE.ShadowMaterial({ opacity: 0.35 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.9;
  ground.receiveShadow = true;
  scene.add(ground);

  /* ---- model: GLB if present, else the real CFD field in 3D, else procedural ---- */
  const root = new THREE.Group();
  scene.add(root);
  let fieldVideo = null;  // <video> driving the real-CFD field backdrop
  let jet = null;         // shared GPU laminar-jet engine
  let streams = null;     // animated laminar streamlines
  let glyphs = null;      // velocity arrows (toggle)
  let slice = null;       // interactive cross-section plane (toggle)
  let backdropMat = null; // real-CFD field backdrop material (time-scrub)
  let lod = null;         // frame-rate governor for the jet
  let realField = null;   // real CFD sampler (Real/Model toggle)
  let fieldTex = null;    // its GPU advection texture (built once, reused on toggle)
  let source = "real";    // 'real' = rCFD data · 'model' = analytic laminar model

  const haveGLB = opts.glb ? await fileExists(opts.glb) : false;
  let built = false;
  if (haveGLB) {
    try {
      const gltf = await new GLTFLoader().loadAsync(opts.glb);
      gltf.scene.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      frameObject(gltf.scene, root);
      root.add(gltf.scene);
      onMode("Loaded model · buoyant_jet.glb");
      built = true;
    } catch (e) { /* fall through to the live scene */ }
  }
  if (!built) {
    // the REAL CFD velocity + temperature field (Fluent export), if available
    realField = await loadRealField("data/cfd_field.json", { w: 1.6, h: 1.6, d: 1.0 });
    const live = buildLiveScene(root, opts.cfdVideo || null, realField);
    fieldVideo = live.video;
    jet = live.jet;
    streams = live.streams;
    glyphs = live.glyphs;
    slice = live.slice;
    backdropMat = live.backdrop;
    fieldTex = live.fieldTex;
    lod = makeLOD(jet, { target: 52, min: 1600 });
    onMode(realField ? FOOT.real : FOOT.model);
  }

  /* ---- resize + auto-fit (handles tall portrait canvases) ---- */
  const FIT_RADIUS = 1.85;              // bounding sphere of tank + pipes + plume
  function fitCamera() {
    const vFOV = THREE.MathUtils.degToRad(camera.fov);
    const hFOV = 2 * Math.atan(Math.tan(vFOV / 2) * camera.aspect);
    const fov = Math.min(vFOV, hFOV);   // limiting axis (portrait → horizontal)
    const dist = (FIT_RADIUS / Math.sin(fov / 2)) * 1.12;
    const dir = camera.position.clone().sub(controls.target).normalize();
    camera.position.copy(dir.multiplyScalar(dist).add(controls.target));
  }
  function resize() {
    const w = host.clientWidth || 1, h = host.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    fitCamera();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  resize();

  /* ---- animation loop ---- */
  let raf, t0 = performance.now(), running = true;
  function tick(now) {
    if (!running) return;
    raf = requestAnimationFrame(tick);
    const dt = Math.min((now - t0) / 1000, 0.05); t0 = now;
    // No auto-rotate: the recirculation vortices live in the x-y symmetry plane,
    // so we keep facing it (drag to orbit). Spinning would turn them edge-on.
    if (jet) { jet.update(dt); lod(dt); }
    if (streams) streams.update(dt);
    controls.update();
    renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(tick);

  /* ---- public controls ---- */
  function setFieldMode(m) {
    if (jet) jet.setMode(m);
    if (streams) streams.setMode(m);
    if (glyphs) glyphs.setMode(m);
    if (slice) slice.setMode(m);
  }

  // Real/Model toggle: 'real' drives every dynamic layer from the rCFD field;
  // 'model' swaps in the analytic laminar model (clean two-vortex topology) by
  // passing null fields — the sub-modules already fall back to jet-field.js.
  function setSource(src) {
    source = src === "model" ? "model" : "real";
    const f = source === "real" ? realField : null;   // null → analytic model
    if (streams) streams.setField(f);
    if (glyphs) glyphs.setField(f);
    if (slice) slice.setField(f);
    if (jet) {
      jet.setField(f ? fieldTex : null, realField ? realField.umax : 0.03);
      jet.setAlpha(source === "real" ? 0.5 : 1.0);     // model particles are the hero
    }
    onMode(source === "real" && realField ? FOOT.real : FOOT.model);
  }

  /* ---- disposer ---- */
  return {
    setFieldMode,
    setSource,
    setGlyphs(on) { if (glyphs) glyphs.setVisible(on); },
    setSlice(on) { if (slice) slice.setVisible(on); },
    setSliceHeight(f) { if (slice) slice.setHeight(f); },
    getSliceReadout() { return slice ? slice.getReadout() : null; },
    hasTime() { return !!fieldVideo; },
    setTimeScrub(on) {
      if (fieldVideo) { if (on) fieldVideo.pause(); else fieldVideo.play().catch(() => {}); }
      if (backdropMat) backdropMat.opacity = on ? 0.95 : 0.32;
      if (jet) jet.object.visible = !on;        // foreground the REAL field while scrubbing
      if (streams) streams.object.visible = !on;
    },
    setTime(frac) {
      if (fieldVideo && fieldVideo.duration && isFinite(fieldVideo.duration))
        fieldVideo.currentTime = Math.min(0.999, Math.max(0, frac)) * fieldVideo.duration;
    },
    snapshot() {
      try { renderer.render(scene, camera); return renderer.domElement.toDataURL("image/png"); }
      catch (_) { return null; }
    },
    dispose() {
      running = false;
      if (jet) jet.dispose();
      if (streams) streams.dispose();
      if (glyphs) glyphs.dispose();
      if (slice) slice.dispose();
      if (fieldVideo) { try { fieldVideo.pause(); fieldVideo.removeAttribute("src"); fieldVideo.load(); } catch (_) {} }
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
      });
      renderer.dispose();
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    },
  };
}

/* --------------------------------------------------------------------- */
async function fileExists(url) {
  try { const r = await fetch(url, { method: "HEAD", cache: "no-cache" }); return r.ok; }
  catch (_) { return false; }
}

/* Fit an arbitrary GLB nicely into view. */
function frameObject(obj, root) {
  const box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const scale = 2 / (Math.max(size.x, size.y, size.z) || 1);
  obj.scale.setScalar(scale);
  obj.position.sub(center.multiplyScalar(scale));
}

/* ---------------------------------------------------------------------
 * Live scene: the test-case geometry (glass tank + inlet/outlet pipes), a
 * FAINT backdrop of the real CFD temperature field (cropped from
 * cfd_reference.mp4, kept as real data), and the shared GPU laminar-jet
 * engine as the dynamic, orbitable foreground. Returns { video, jet }.
 * ------------------------------------------------------------------- */
/* Encode the real CFD field (u, v, T) into an RGBA texture the plume's vertex
 * shader advects through: R,G = velocity (0..1, decoded with umax), B = T(norm),
 * A = speed(norm). */
function buildFieldTexture(d) {
  const { nx, ny, u, v, T, Tlo, Thi, umax } = d;
  const arr = new Uint8Array(nx * ny * 4);
  const b = (val) => (val < 0 ? 0 : val > 255 ? 255 : Math.round(val));
  for (let i = 0; i < nx * ny; i++) {
    arr[i * 4]     = b((u[i] / (2 * umax) + 0.5) * 255);
    arr[i * 4 + 1] = b((v[i] / (2 * umax) + 0.5) * 255);
    arr[i * 4 + 2] = b(((T[i] - Tlo) / (Thi - Tlo)) * 255);
    arr[i * 4 + 3] = b(Math.min(1, Math.hypot(u[i], v[i]) / umax) * 255);
  }
  const tex = new THREE.DataTexture(arr, nx, ny, THREE.RGBAFormat);
  tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

function buildLiveScene(root, videoUrl, realField) {
  const TANK = { w: 1.6, h: 1.6, d: 1.0 };

  // faint glass tank + glowing cyan edges
  root.add(new THREE.Mesh(new THREE.BoxGeometry(TANK.w, TANK.h, TANK.d),
    new THREE.MeshStandardMaterial({
      color: 0x123a6e, transparent: true, opacity: 0.05, roughness: 0.2,
      metalness: 0, side: THREE.DoubleSide, depthWrite: false,
    })));
  root.add(new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(TANK.w, TANK.h, TANK.d)),
    new THREE.LineBasicMaterial({ color: 0x36d1ff, transparent: true, opacity: 0.7 })
  ));

  // inlet (left) + outlet (right): a horizontal pipe through the tank at
  // mid-height, matching the real geometry in the CFD recording.
  const pipeMat = new THREE.MeshStandardMaterial({ color: 0xaebfd8, metalness: 0.6, roughness: 0.35 });
  for (const sx of [-1, 1]) {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.55, 24), pipeMat);
    pipe.rotation.z = Math.PI / 2;
    pipe.position.set(sx * (TANK.w / 2 + 0.22), 0, 0);
    pipe.castShadow = true;
    root.add(pipe);
  }

  // faint real-CFD temperature field on the back wall (real data backdrop):
  // crop the left (temperature) panel of the Fluent recording via texture
  // offset/repeat (THREE origin = bottom-left; values measured from the video).
  let video = null, backdropMat = null;
  if (videoUrl) {
    video = document.createElement("video");
    video.src = videoUrl;
    video.loop = true; video.muted = true; video.playsInline = true;
    video.setAttribute("webkit-playsinline", ""); video.setAttribute("playsinline", "");
    video.crossOrigin = "anonymous";
    video.play().catch(() => {});

    const tex = new THREE.VideoTexture(video);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.repeat.set(0.272, 0.506);
    tex.offset.set(0.197, 0.225);

    backdropMat = new THREE.MeshBasicMaterial({
      map: tex, transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide,
    });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(TANK.w * 0.98, TANK.h * 0.98), backdropMat);
    plane.position.z = -TANK.d * 0.5 + 0.02;     // sit on the back wall
    root.add(plane);
  }

  // the live GPU jet — parcels advect along the REAL velocity field when we
  // have it (so even the "decorative" layer is data-driven), else the model
  // build the advection texture once; the Real/Model toggle reuses it
  const fieldTex = realField ? buildFieldTexture(realField.data) : null;
  const jet = createJetField({
    tank: TANK, count: 5200, size: 22,
    // a soft haze BEHIND the streamlines (real field) — the bold streamlines are
    // what reveal the two vortices; the particles add life without the clutter
    // that was drowning the structure out.
    alpha: realField ? 0.5 : 1.0,
    fieldTex,
    fieldUmax: realField ? realField.umax : 0.03,
  });
  root.add(jet.object);

  // animated laminar streamlines (flow direction + the two vortices) — driven
  // by the REAL CFD field when available, otherwise the analytic model. A single
  // crisp plane on the symmetry plane (nZ:1) so the two counter-rotating vortices
  // read cleanly face-on instead of smearing across stacked depth slices.
  const streams = createStreamlines({ tank: TANK, field: realField, nZ: 1 });
  root.add(streams.object);

  // velocity glyphs + interactive slice plane (both off by default)
  const glyphs = createGlyphs({ tank: TANK, field: realField });
  root.add(glyphs.object);
  const slice = createSlice({ tank: TANK, field: realField });
  root.add(slice.object);

  // CFD-style reference frame: faint ground grid + axis triad
  const grid = new THREE.GridHelper(TANK.w * 2.4, 12, 0x2a4a6a, 0x14283e);
  grid.position.y = -TANK.h / 2 - 0.02;
  grid.material.transparent = true; grid.material.opacity = 0.45;
  root.add(grid);
  const axes = new THREE.AxesHelper(0.45);
  axes.position.set(-TANK.w / 2 - 0.12, -TANK.h / 2, -TANK.d / 2);
  root.add(axes);

  return { video, jet, streams, glyphs, slice, backdrop: backdropMat, fieldTex };
}

/* The buoyant-jet plume itself is the shared GPU engine in
 * simulation/jet-gpu.js (createJetField), used here and by the Flow
 * Intuition panel. The old CPU particle plume + thermal-slab helpers were
 * retired in favour of it. */
