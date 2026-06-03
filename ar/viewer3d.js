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

export async function createViewer(host, opts = {}) {
  const onMode = opts.onMode || (() => {});

  /* ---- renderer ---- */
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  host.appendChild(renderer.domElement);

  /* ---- scene + camera ---- */
  const scene = new THREE.Scene();
  scene.background = null; // CSS gradient shows through
  const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 100);
  camera.position.set(3.6, 2.3, 5.0);

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
  let plume = null;       // procedural particle system, animated each frame
  let fieldVideo = null;  // <video> driving the real-CFD field texture

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
    } catch (e) { /* fall through to the procedural / field scene */ }
  }
  if (!built) {
    if (opts.cfdVideo) {
      fieldVideo = buildFieldScene(root, opts.cfdVideo);
      onMode("Real CFD temperature field (2D solve) extruded into 3D");
    } else {
      plume = buildProcedural(root);
      onMode("Procedural buoyant-jet visualisation");
    }
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
    root.rotation.y += dt * 0.15;          // gentle auto-rotate
    if (plume) plume.update(dt);
    controls.update();
    renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(tick);

  /* ---- disposer ---- */
  return {
    dispose() {
      running = false;
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
 * Real CFD field in 3D: glass tank + inlet/outlet pipes (the test-case
 * geometry) + the ACTUAL 2D temperature field from cfd_reference.mp4,
 * cropped to the tank panel and mapped onto stacked planes so the 2D solve
 * reads as a 3D volume you can orbit. Returns the <video> element so the
 * caller can pause it on dispose.
 * ------------------------------------------------------------------- */
function buildFieldScene(root, videoUrl) {
  const TANK = { w: 1.6, h: 1.6, d: 1.0 };

  // faint glass tank so the field reads clearly through it
  const tankMat = new THREE.MeshStandardMaterial({
    color: 0x123a6e, transparent: true, opacity: 0.06, roughness: 0.2,
    metalness: 0, side: THREE.DoubleSide, depthWrite: false,
  });
  root.add(new THREE.Mesh(new THREE.BoxGeometry(TANK.w, TANK.h, TANK.d), tankMat));

  // glowing cyan edges
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

  // real CFD temperature field: crop the left (temperature) panel of the
  // Fluent recording via texture offset/repeat (THREE origin = bottom-left;
  // values measured from the video, see notes in the thesis AR docs).
  const video = document.createElement("video");
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

  // central crisp plane + faint ghost copies through the depth → volume feel
  const fw = TANK.w * 0.98, fh = TANK.h * 0.98;
  const slabs = [
    { z: 0.00, o: 1.00 },
    { z: 0.18, o: 0.45 }, { z: -0.18, o: 0.45 },
    { z: 0.38, o: 0.18 }, { z: -0.38, o: 0.18 },
  ];
  for (const s of slabs) {
    const mat = new THREE.MeshBasicMaterial({
      map: tex, transparent: s.o < 1, opacity: s.o,
      side: THREE.DoubleSide, depthWrite: s.o >= 1,
    });
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(fw, fh), mat);
    pl.position.z = s.z;
    root.add(pl);
  }

  return video;
}

/* ---------------------------------------------------------------------
 * Procedural buoyant jet: glass tank + inlet + temperature-coloured
 * particle plume that streams in horizontally and rises by buoyancy.
 * ------------------------------------------------------------------- */
function buildProcedural(root) {
  const TANK = { w: 1.8, h: 1.8, d: 1.0 };

  // glass tank — very faint faces so the plume reads clearly through them
  // (kept cheap on purpose: no transmission pass → better mobile FPS)
  const tankMat = new THREE.MeshStandardMaterial({
    color: 0x123a6e, transparent: true, opacity: 0.07, roughness: 0.2,
    metalness: 0, side: THREE.DoubleSide, depthWrite: false,
  });
  const tank = new THREE.Mesh(new THREE.BoxGeometry(TANK.w, TANK.h, TANK.d), tankMat);
  tank.position.y = 0;
  root.add(tank);

  // glowing cyan edges
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(TANK.w, TANK.h, TANK.d)),
    new THREE.LineBasicMaterial({ color: 0x36d1ff, transparent: true, opacity: 0.7 })
  );
  root.add(edges);

  // inlet pipe (left wall, mid-height)
  const inlet = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, 0.4, 20),
    new THREE.MeshStandardMaterial({ color: 0x36d1ff, emissive: 0x103040, metalness: 0.6, roughness: 0.3 })
  );
  inlet.rotation.z = Math.PI / 2;
  inlet.position.set(-TANK.w / 2 - 0.18, 0, 0);
  inlet.castShadow = true;
  root.add(inlet);

  // faint vertical temperature tint inside the tank: cold (blue) at the
  // bottom, warm (red) at the top — the stratification the jet builds.
  root.add(makeStratificationVolume(TANK));

  // particle plume ----------------------------------------------------
  // The jet enters at mid-height and rises by buoyancy. Particles are
  // coloured by HEIGHT through a CFD-style thermal map, so the warm fluid
  // reads red at the top and the cool fluid blue at the bottom — the same
  // convention as the CFD temperature snapshots on the poster. Particles
  // that reach the ceiling spread sideways and form the warm layer.
  const N = 950;
  const positions = new Float32Array(N * 3);
  const colors = new Float32Array(N * 3);
  const life = new Float32Array(N);   // 0..1 lifetime → recycled at 1
  const vy = new Float32Array(N);     // buoyant rise speed
  const capped = new Uint8Array(N);   // 1 once it joins the top warm layer
  const drift = new Float32Array(N);  // sideways speed while capped

  const topY = TANK.h / 2 - 0.10;

  function seed(i) {
    const o = i * 3;
    positions[o] = -TANK.w / 2 + Math.random() * 0.04;   // at the inlet
    positions[o + 1] = (Math.random() - 0.5) * 0.05;     // mid-height
    positions[o + 2] = (Math.random() - 0.5) * 0.10;
    life[i] = 0;
    vy[i] = 0.16 + Math.random() * 0.10;
    capped[i] = 0;
    drift[i] = (Math.random() - 0.5) * 0.35;
  }
  for (let i = 0; i < N; i++) { seed(i); life[i] = Math.random(); }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const sprite = makeSprite();
  const mat = new THREE.PointsMaterial({
    size: 0.085, map: sprite, vertexColors: true, transparent: true,
    depthWrite: false, blending: THREE.AdditiveBlending, opacity: 1.0,
  });
  const points = new THREE.Points(geo, mat);
  root.add(points);

  const c = [0, 0, 0];
  return {
    update(dt) {
      for (let i = 0; i < N; i++) {
        const o = i * 3;
        if (!capped[i]) {
          const jet = 0.85 * Math.max(0, 1 - life[i]);   // horizontal momentum decays
          positions[o] += jet * dt;
          positions[o + 1] += vy[i] * dt * (0.5 + life[i]);   // buoyant rise
          positions[o + 2] += Math.sin(life[i] * 6.28 + i) * 0.05 * dt;
          life[i] += dt * 0.28;
          if (positions[o + 1] >= topY) { positions[o + 1] = topY; capped[i] = 1; }
        } else {
          // spread along the ceiling → builds the warm stratified layer
          positions[o] += drift[i] * dt;
          positions[o + 1] += (topY - positions[o + 1]) * 3 * dt;
          life[i] += dt * 0.07;
          if (Math.abs(positions[o]) > TANK.w / 2 - 0.04) drift[i] *= -1;
        }
        // colour strictly by height → warm rises to the top
        thermalColor((positions[o + 1] + TANK.h / 2) / TANK.h, c);
        colors[o] = c[0]; colors[o + 1] = c[1]; colors[o + 2] = c[2];

        if (life[i] >= 1 || positions[o] > TANK.w / 2 + 0.05) seed(i);
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
    },
  };
}

/* CFD-style thermal colormap (cold blue → cyan → green → yellow → hot red). */
const THERMAL_STOPS = [
  [0.00, 0.10, 0.22, 0.62],
  [0.25, 0.00, 0.60, 0.90],
  [0.50, 0.12, 0.80, 0.36],
  [0.72, 1.00, 0.85, 0.12],
  [1.00, 0.92, 0.16, 0.12],
];
function thermalColor(t, out) {
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  for (let k = 0; k < THERMAL_STOPS.length - 1; k++) {
    const a = THERMAL_STOPS[k], b = THERMAL_STOPS[k + 1];
    if (t <= b[0]) {
      const f = (t - a[0]) / (b[0] - a[0]);
      out[0] = a[1] + (b[1] - a[1]) * f;
      out[1] = a[2] + (b[2] - a[2]) * f;
      out[2] = a[3] + (b[3] - a[3]) * f;
      return;
    }
  }
  out[0] = THERMAL_STOPS[4][1]; out[1] = THERMAL_STOPS[4][2]; out[2] = THERMAL_STOPS[4][3];
}

/* A thin stack of translucent slabs giving the tank a cold-bottom →
 * warm-top temperature gradient, so it never looks like an empty box. */
function makeStratificationVolume(TANK) {
  const group = new THREE.Group();
  const layers = 14;
  const c = [0, 0, 0];
  for (let j = 0; j < layers; j++) {
    const t = j / (layers - 1);
    thermalColor(t, c);
    const slab = new THREE.Mesh(
      new THREE.BoxGeometry(TANK.w * 0.985, TANK.h / layers, TANK.d * 0.985),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(c[0], c[1], c[2]),
        transparent: true, opacity: 0.06 + 0.06 * t,   // warmer layers a touch denser
        depthWrite: false, side: THREE.DoubleSide,
      })
    );
    slab.position.y = -TANK.h / 2 + (j + 0.5) * (TANK.h / layers);
    group.add(slab);
  }
  return group;
}

/* round soft particle sprite (canvas texture) */
function makeSprite() {
  const s = 64;
  const cv = document.createElement("canvas");
  cv.width = cv.height = s;
  const g = cv.getContext("2d");
  // soft, low-peak falloff so the per-particle colour (not a white-hot core)
  // dominates once many sprites overlap under additive blending
  const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  grad.addColorStop(0, "rgba(255,255,255,0.5)");
  grad.addColorStop(0.5, "rgba(255,255,255,0.22)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
