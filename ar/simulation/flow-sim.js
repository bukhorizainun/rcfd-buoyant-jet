/* simulation/flow-sim.js — "Flow Intuition" panel (Feature 3).
 *
 * A small 3D Three.js scene driven by the shared GPU jet engine
 * (jet-gpu.js): visitors feel how the laminar buoyant jet responds to inlet
 * velocity, density ratio (Δρ) and temperature difference (ΔT). NOT a CFD
 * solver — a physics-shaped intuition (Richardson/Froude coupling) rendered
 * on the GPU. Same engine the 3D model viewer uses.
 *
 * Keeps the original interface: createFlowSim(canvas) ->
 *   { setParams, start, stop, dispose }
 */
import * as THREE from "three";
import { createJetField, makeLOD } from "./jet-gpu.js";

export function createFlowSim(canvas) {
  const TANK = { w: 1.7, h: 1.5, d: 1.0 };

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 100);
  camera.position.set(0.25, 0.35, 3.1);
  camera.lookAt(0, 0, 0);

  const root = new THREE.Group();
  scene.add(root);

  // faint tank outline + nozzle for spatial context
  root.add(new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(TANK.w, TANK.h, TANK.d)),
    new THREE.LineBasicMaterial({ color: 0x36d1ff, transparent: true, opacity: 0.4 })
  ));
  const nozzle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 0.4, 18),
    new THREE.MeshBasicMaterial({ color: 0x9fb8d6 })
  );
  nozzle.rotation.z = Math.PI / 2;
  nozzle.position.set(-TANK.w / 2 - 0.18, 0, 0);
  root.add(nozzle);

  const jet = createJetField({ tank: TANK, count: 4200, size: 24 });
  root.add(jet.object);
  const lod = makeLOD(jet, { target: 50, min: 1200 });

  function resize() {
    const r = canvas.getBoundingClientRect();
    const w = Math.max(1, r.width), h = Math.max(1, r.height);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  let raf = 0, running = false, last = 0;
  function frame(now) {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.05) || 0.016;
    last = now;
    root.rotation.y = 0.32 + Math.sin(now * 0.00012) * 0.32; // gentle sway, stays front-ish
    jet.update(dt);
    lod(dt);
    renderer.render(scene, camera);
  }

  return {
    setParams(p) { jet.setParams(p); },
    start() { if (!running) { running = true; last = performance.now(); raf = requestAnimationFrame(frame); } },
    stop() { running = false; cancelAnimationFrame(raf); },
    dispose() {
      this.stop();
      ro.disconnect();
      jet.dispose();
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
      });
      renderer.dispose();
    },
  };
}
