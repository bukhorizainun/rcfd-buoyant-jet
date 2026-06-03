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

  /* ---- model: GLB if present, else procedural ---- */
  const root = new THREE.Group();
  scene.add(root);
  let plume = null; // procedural particle system, animated each frame

  const haveGLB = opts.glb ? await fileExists(opts.glb) : false;
  if (haveGLB) {
    try {
      const gltf = await new GLTFLoader().loadAsync(opts.glb);
      gltf.scene.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      frameObject(gltf.scene, root);
      root.add(gltf.scene);
      onMode("Loaded model · buoyant_jet.glb");
    } catch (e) {
      plume = buildProcedural(root);
      onMode("Procedural buoyant-jet visualisation");
    }
  } else {
    plume = buildProcedural(root);
    onMode("Procedural buoyant-jet visualisation · drop a GLB in assets/models to replace");
  }

  /* ---- resize + auto-fit (handles tall portrait canvases) ---- */
  const FIT_RADIUS = 1.65;              // bounding sphere of tank + plume
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

  // particle plume ----------------------------------------------------
  const N = 900;
  const positions = new Float32Array(N * 3);
  const colors = new Float32Array(N * 3);
  const life = new Float32Array(N);   // 0..1 "age" → cools + rises
  const vy = new Float32Array(N);     // buoyant vertical speed

  const cold = new THREE.Color(0x2b6cff);
  const warm = new THREE.Color(0xff4020);
  const mid = new THREE.Color(0xffc24d);

  function seed(i) {
    const o = i * 3;
    positions[o] = -TANK.w / 2 + Math.random() * 0.05;          // start at inlet
    positions[o + 1] = (Math.random() - 0.5) * 0.06;
    positions[o + 2] = (Math.random() - 0.5) * 0.12;
    life[i] = 0;
    vy[i] = 0.15 + Math.random() * 0.1;
  }
  for (let i = 0; i < N; i++) { seed(i); life[i] = Math.random(); }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const sprite = makeSprite();
  const mat = new THREE.PointsMaterial({
    size: 0.1, map: sprite, vertexColors: true, transparent: true,
    depthWrite: false, blending: THREE.AdditiveBlending, opacity: 1.0,
  });
  const points = new THREE.Points(geo, mat);
  root.add(points);

  const c = new THREE.Color();
  return {
    update(dt) {
      for (let i = 0; i < N; i++) {
        const o = i * 3;
        // horizontal jet momentum, decaying with age
        const jet = 0.9 * (1 - life[i]);
        positions[o] += jet * dt;
        // buoyancy lifts particles as they "warm/age"
        positions[o + 1] += vy[i] * dt * (0.4 + life[i]);
        // slight swirl into recirculation
        positions[o + 2] += Math.sin(life[i] * 6.28 + i) * 0.04 * dt;
        life[i] += dt * 0.35;

        // colour by temperature: warm → mid → cold as it ages/cools
        if (life[i] < 0.5) c.copy(warm).lerp(mid, life[i] / 0.5);
        else c.copy(mid).lerp(cold, (life[i] - 0.5) / 0.5);
        colors[o] = c.r; colors[o + 1] = c.g; colors[o + 2] = c.b;

        // recycle when out of the tank or fully cooled
        if (life[i] >= 1 || positions[o] > TANK.w / 2 || positions[o + 1] > TANK.h / 2) seed(i);
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
    },
  };
}

/* round soft particle sprite (canvas texture) */
function makeSprite() {
  const s = 64;
  const cv = document.createElement("canvas");
  cv.width = cv.height = s;
  const g = cv.getContext("2d");
  const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.35, "rgba(255,255,255,0.7)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
