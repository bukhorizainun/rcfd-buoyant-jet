/* =====================================================================
 * AI-Assisted Buoyant Jet — Interactive AR Poster
 * Vanilla JS controller. No framework, no backend.
 *
 * Pipeline:
 *   loader → start screen → (AR via MindAR/A-Frame) OR (on-screen demo)
 *   → HUD + dock → panels (dashboard / timeline / AI) + hotspot popups
 *   → optional 3D model viewer (lazy Three.js module).
 *
 * Heavy AR libraries (A-Frame ~1MB, MindAR ~1MB) and the Three.js 3D
 * viewer are all loaded ON DEMAND so the first paint stays light.
 * ===================================================================== */
(function () {
  "use strict";

  /* ---------- configuration ---------- */
  const CDN = {
    aframe: "https://aframe.io/releases/1.5.0/aframe.min.js",
    mindar: "https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-aframe.prod.js",
  };
  const PATHS = {
    content: "data/poster_content.json",
    hotspots: "data/hotspots.json",
    faq: "data/faq.json",
    target: "assets/poster/target.mind",
    poster: "assets/poster/poster.jpg",
    cfdVideo: "assets/videos/cfd_reference.mp4",
    glb: "assets/models/buoyant_jet.glb",
  };

  /* ---------- tiny helpers ---------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const el = (tag, attrs = {}, html) => {
    const n = document.createElement(tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (html != null) n.innerHTML = html;
    return n;
  };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  let toastTimer;
  function toast(msg, ms = 2600) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), ms);
  }

  async function fetchJSON(path) {
    const res = await fetch(path, { cache: "no-cache" });
    if (!res.ok) throw new Error(`${path} → HTTP ${res.status}`);
    return res.json();
  }

  /* ---------- global state ---------- */
  const STATE = {
    content: null,
    hotspots: null,
    faq: null,
    mode: null,          // "ar" | "demo"
    arReady: false,
    activePanel: null,
    viewer3d: null,      // disposer for the Three.js scene
    targetCompiled: false,
  };

  /* =====================================================================
   * BOOT
   * ===================================================================== */
  window.addEventListener("DOMContentLoaded", boot);

  async function boot() {
    setLoader(15, "Loading research content…");
    try {
      const [content, hotspots, faq] = await Promise.all([
        fetchJSON(PATHS.content),
        fetchJSON(PATHS.hotspots),
        fetchJSON(PATHS.faq),
      ]);
      STATE.content = content;
      STATE.hotspots = hotspots;
      STATE.faq = faq;
    } catch (err) {
      // Almost always a file:// / CORS problem — the app must be served over http(s).
      setLoader(100, "");
      $("#loaderSub").textContent =
        "Could not load data files. Please open this page over http(s), e.g. `python -m http.server`, or via GitHub Pages.";
      console.error(err);
      return;
    }

    setLoader(55, "Preparing interface…");
    hydrateStaticText();

    // Is the AR target already compiled? (decides whether "Launch AR" can track)
    setLoader(75, "Checking AR target…");
    STATE.targetCompiled = await headOK(PATHS.target);

    setLoader(100, "Ready");
    setTimeout(showStart, 350);
  }

  function setLoader(pct, sub) {
    const bar = $("#loaderBar");
    if (bar) bar.style.width = pct + "%";
    if (sub != null) $("#loaderSub").textContent = sub;
  }

  async function headOK(path) {
    try {
      const r = await fetch(path, { method: "HEAD", cache: "no-cache" });
      return r.ok;
    } catch (_) { return false; }
  }

  /* Fill in title/author/etc. so the page reads correctly before any mode. */
  function hydrateStaticText() {
    const c = STATE.content;
    $("#startTitle").textContent = c.title;
    $("#startSub").textContent = c.subtitle;
    $("#startAuthor").textContent = `${c.author} · Supervisor: ${c.supervisor}`;
    $("#hudTitle").textContent = "Buoyant Jet Flow · rCFD";
    $("#scanHintText").textContent = c.fallbackMessage || "Point your camera toward the scientific poster.";
    // detection banner
    const b = c.detectionBanner || {};
    if (b.line1) $("#bannerL1").textContent = b.line1;
    if (b.line2) $("#bannerL2").textContent = b.line2;
    if (b.line3) $("#bannerL3").textContent = b.line3;
    // dashboard head
    $("#dashTitle").textContent = c.dashboard.title;
    $("#dashSub").textContent = c.dashboard.subtitle;
    // timeline head
    $("#tlTitle").textContent = c.timeline.title;
    $("#tlSub").textContent = c.timeline.subtitle;
  }

  function showStart() {
    $("#loader").classList.add("hidden");
    $("#start").classList.remove("hidden");
    if (!STATE.targetCompiled) {
      $("#startHint").innerHTML =
        "Tip: the AR target (<code>target.mind</code>) isn't compiled yet, so AR can't lock onto the poster. " +
        '“Explore on screen” works right now — see the README to enable full AR.';
    }
    wireGlobalUI();
  }

  /* =====================================================================
   * GLOBAL UI WIRING (start buttons, dock, close buttons, keyboard)
   * ===================================================================== */
  function wireGlobalUI() {
    $("#btnLaunchAR").addEventListener("click", () => startAR());
    $("#btnDemo").addEventListener("click", () => startDemo());
    $("#errDemo").addEventListener("click", () => { $("#errorScreen").classList.add("hidden"); startDemo(); });
    $("#btnExit").addEventListener("click", exitToStart);

    // dock
    $$("#dock .dock-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const which = btn.dataset.panel;
        if (which === "model3d") return openModel3D();
        togglePanel(which, btn);
      });
    });

    // any element with data-close closes that overlay
    document.body.addEventListener("click", (e) => {
      const closer = e.target.closest("[data-close]");
      if (closer) closeOverlay(closer.dataset.close);
    });

    // popup / model backdrop click
    $("#popup").addEventListener("click", (e) => { if (e.target.id === "popup") closeOverlay("popup"); });

    // keyboard
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeTopMost();
    });
  }

  function enterStage(showInfo = true) {
    $("#start").classList.add("hidden");
    $("#hud").classList.remove("hidden");
    $("#dock").classList.remove("hidden");
    // In AR we wait until the poster is actually found before revealing the
    // information layer; on screen we can show it right away.
    if (showInfo) showInfoLayer();   // Feature 2 — digital information layer
  }

  function exitToStart() {
    // tear everything down and return to the chooser
    closeAllPanels();
    closeOverlay("model3d");
    closeOverlay("popup");
    const stage = $("#arStage");
    stage.classList.add("hidden");
    stage.innerHTML = "";          // remove a-scene → stops camera
    STATE.arReady = false;
    $("#demoStage").classList.add("hidden");
    $("#scanHint").classList.add("hidden");
    $("#banner").classList.add("hidden");
    $("#hud").classList.add("hidden");
    $("#dock").classList.add("hidden");
    const info = $("#infoLayer"); if (info) info.remove();
    $("#start").classList.remove("hidden");
    STATE.mode = null;
  }

  /* =====================================================================
   * FEATURE 2 — DIGITAL INFORMATION LAYER (title / author / areas)
   * A dismissible card that fades in when a stage opens.
   * ===================================================================== */
  function showInfoLayer() {
    const c = STATE.content;
    const old = $("#infoLayer"); if (old) old.remove();
    const areas = (c.researchAreas || []).map((a) => `<span class="chip">${esc(a)}</span>`).join("");
    const card = el("div", { id: "infoLayer" });
    card.innerHTML = `
      <div class="info-card">
        <div class="info-eyebrow">${esc(c.institution || "")}</div>
        <h2>${esc(c.title)}</h2>
        <p class="info-sub">${esc(c.subtitle)}</p>
        <p class="info-author">${esc(c.author)} · Supervisor: ${esc(c.supervisor)}</p>
        <div class="info-areas">${areas}</div>
        <button class="info-dismiss" type="button">Enter ›</button>
      </div>`;
    document.body.appendChild(card);
    requestAnimationFrame(() => card.classList.add("show"));
    const hide = () => card.classList.remove("show");
    card.querySelector(".info-dismiss").addEventListener("click", hide);
    card.addEventListener("click", (e) => { if (e.target.id === "infoLayer") hide(); });
    setTimeout(hide, 6500);
  }

  /* =====================================================================
   * DEMO MODE — poster on screen, CSS-positioned hotspots
   * ===================================================================== */
  function startDemo() {
    STATE.mode = "demo";
    enterStage();
    const stage = $("#demoStage");
    stage.classList.remove("hidden");
    renderDemoHotspots();
  }

  function renderDemoHotspots() {
    const wrap = $("#demoHotspots");
    wrap.innerHTML = "";
    STATE.hotspots.hotspots.forEach((h) => {
      const dot = el("button", {
        class: "hotspot",
        style: `left:${h.u * 100}%; top:${h.v * 100}%; --c:${h.color || "#36d1ff"}`,
        "aria-label": h.label,
      }, `<span class="dot"></span><span class="tag">${esc(h.label)}</span>`);
      dot.addEventListener("click", () => openPopup(h));
      wrap.appendChild(dot);
    });
  }

  /* =====================================================================
   * AR MODE — MindAR image tracking inside A-Frame
   * ===================================================================== */
  async function startAR() {
    if (!isSecureContext && location.hostname !== "localhost") {
      return showError("Insecure connection",
        "The camera needs a secure (https) page. This works on GitHub Pages or localhost.");
    }
    if (!STATE.targetCompiled) {
      toast("AR target not compiled yet — opening on-screen demo. See README to enable AR.", 4200);
      return startDemo();
    }

    STATE.mode = "ar";
    enterStage(false);   // info layer is revealed on targetFound, not before
    $("#scanHint").classList.remove("hidden");

    try {
      setLoader(0, "");
      await loadScript(CDN.aframe);
      await loadScript(CDN.mindar);
    } catch (err) {
      console.error(err);
      return showError("Could not load AR engine", "Check your internet connection and try again.");
    }

    buildARScene();
  }

  /* Inject A-Frame scene with the MindAR image system + anchored content. */
  function buildARScene() {
    const c = STATE.content;
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

    // assets
    const assets = el("a-assets");
    const vid = el("video", { id: "arCfdVideo", src: PATHS.cfdVideo, preload: "auto",
      loop: "", muted: "", playsinline: "", "webkit-playsinline": "", crossorigin: "anonymous" });
    vid.muted = true; // attribute alone is not always honoured
    assets.appendChild(vid);
    scene.appendChild(assets);

    // camera with mouse/touch raycaster so anchored hotspots are tappable
    scene.appendChild(el("a-camera", {
      position: "0 0 0", "look-controls": "enabled: false",
      cursor: "fuse: false; rayOrigin: mouse", raycaster: "objects: .clickable",
    }));

    // the tracked-image anchor
    const anchor = el("a-entity", { "mindar-image-target": "targetIndex: 0", id: "arAnchor" });
    const top = aspect / 2;   // poster top edge in plane units

    // anchored title bar just above the poster's top edge (Feature 2)
    const titleY = top + 0.07;
    anchor.appendChild(el("a-plane", {
      width: "0.96", height: "0.11", position: `0 ${titleY} 0.005`,
      material: "color: #05070f; opacity: 0.78; shader: flat",
    }));
    anchor.appendChild(el("a-text", {
      value: "Buoyant Jet Flow - rCFD", align: "center", color: "#36d1ff",
      width: "1.7", position: `0 ${titleY + 0.018} 0.01`, "baseline": "center",
    }));
    anchor.appendChild(el("a-text", {
      value: "Interactive Scientific Poster - tap the glowing points",
      align: "center", color: "#cdd7ee", width: "1.25",
      position: `0 ${titleY - 0.028} 0.01`, "baseline": "center",
    }));

    // CFD video (Feature 4) — small "live monitor" in the top-right corner so
    // it never covers the poster content or the hotspots.
    const vidW = 0.34, vidH = vidW * 0.5;
    const vx = 0.5 - vidW / 2 - 0.03, vy = top - vidH / 2 - 0.03;
    anchor.appendChild(el("a-plane", {     // holographic cyan frame
      width: String(vidW + 0.025), height: String(vidH + 0.06),
      position: `${vx} ${vy} 0.008`,
      material: "color: #0a1530; opacity: 0.7; shader: flat",
    }));
    anchor.appendChild(el("a-text", {
      value: "LIVE CFD", color: "#36d1ff", width: "0.9", align: "center",
      position: `${vx} ${vy + vidH / 2 + 0.018} 0.012`,
    }));
    const videoPlane = el("a-video", {
      src: "#arCfdVideo", width: String(vidW), height: String(vidH),
      position: `${vx} ${vy} 0.012`,
    });
    anchor.appendChild(videoPlane);

    // hotspot entities (Feature 3) — bigger, pulsing, labelled, tappable
    STATE.hotspots.hotspots.forEach((h) => {
      const x = (h.u - 0.5) * 1.0;
      const y = (0.5 - h.v) * aspect;
      const color = h.color || "#36d1ff";
      const hs = el("a-entity", { position: `${x} ${y} 0.02`, class: "clickable", "data-id": h.id });
      // glowing core (a thin disc so the whole thing is an easy tap target)
      hs.appendChild(el("a-circle", { radius: "0.03",
        material: `color: ${color}; shader: flat; opacity: 0.95; side: double` }));
      hs.appendChild(el("a-circle", { radius: "0.013",
        material: "color: #ffffff; shader: flat; opacity: 0.95; side: double", position: "0 0 0.001" }));
      // pulsing ring
      const ring = el("a-ring", { "radius-inner": "0.034", "radius-outer": "0.044",
        material: `color: ${color}; shader: flat; opacity: 0.85; side: double` });
      ring.setAttribute("animation__pulse",
        "property: scale; from: 1 1 1; to: 2 2 2; dir: alternate; loop: true; dur: 1100; easing: easeOutQuad");
      ring.setAttribute("animation__fade",
        "property: material.opacity; from: 0.85; to: 0; dir: alternate; loop: true; dur: 1100");
      hs.appendChild(ring);
      // label chip below the dot
      hs.appendChild(el("a-plane", { width: "0.26", height: "0.05", position: "0 -0.075 0",
        material: `color: #05070f; opacity: 0.82; shader: flat` }));
      hs.appendChild(el("a-text", { value: h.label, align: "center", color: "#ffffff",
        width: "0.95", position: "0 -0.075 0.002", "baseline": "center" }));
      hs.addEventListener("click", () => openPopup(h));
      anchor.appendChild(hs);
    });

    // found / lost handlers
    anchor.addEventListener("targetFound", onTargetFound);
    anchor.addEventListener("targetLost", onTargetLost);

    scene.appendChild(anchor);
    stage.appendChild(scene);

    scene.addEventListener("arError", () =>
      showError("Camera unavailable", "Could not start the camera. Grant camera permission, or continue on screen."));
    scene.addEventListener("loaded", () => { STATE.arReady = true; });
  }

  let infoShownOnce = false;
  function onTargetFound() {
    $("#scanHint").classList.add("hidden");
    // play the anchored CFD video (autoplay/muted/loop)
    const v = document.getElementById("arCfdVideo");
    if (v) { v.muted = true; v.play().catch(() => {}); }
    showBanner();
    // reveal the title/author card the first time the poster is recognised
    if (!infoShownOnce) {
      infoShownOnce = true;
      setTimeout(() => { showInfoLayer(); toast("Tap the glowing points on the poster to explore", 3500); }, 2400);
    }
  }
  function onTargetLost() {
    $("#scanHint").classList.remove("hidden");
    const v = document.getElementById("arCfdVideo");
    if (v) v.pause();
  }

  /* Feature 1 — elegant detection banner */
  let bannerShown = false;
  function showBanner() {
    const b = $("#banner");
    if (bannerShown) return;
    bannerShown = true;
    b.classList.remove("hidden", "out");
    // restart animation
    b.style.animation = "none"; void b.offsetWidth; b.style.animation = "";
    setTimeout(() => {
      b.classList.add("out");
      setTimeout(() => b.classList.add("hidden"), 500);
    }, 2200);
  }

  /* Lazy <script> loader (sequential, dedup). */
  const _loaded = {};
  function loadScript(src) {
    if (_loaded[src]) return _loaded[src];
    _loaded[src] = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src; s.async = false;
      s.onload = resolve; s.onerror = () => reject(new Error("load fail: " + src));
      document.head.appendChild(s);
    });
    return _loaded[src];
  }

  function showError(title, body) {
    $("#errTitle").textContent = title;
    $("#errBody").textContent = body;
    $("#errorScreen").classList.remove("hidden");
  }

  /* =====================================================================
   * HOTSPOT POPUP (Feature 3) — shared by AR + demo
   * ===================================================================== */
  function openPopup(h) {
    $("#popupEyebrow").textContent = "Poster · " + (h.label || "Detail");
    $("#popupTitle").textContent = h.label || "";
    $("#popupBody").textContent = h.body || "";

    const media = $("#popupMedia");
    media.innerHTML = "";
    if (h.image) {
      media.appendChild(el("img", { src: h.image, alt: h.label, loading: "lazy" }));
    } else if (h.diagram && DIAGRAMS[h.diagram]) {
      media.innerHTML = DIAGRAMS[h.diagram](h.color || "#36d1ff");
    } else {
      media.classList.add("hidden");
    }
    if (h.image || (h.diagram && DIAGRAMS[h.diagram])) media.classList.remove("hidden");

    const stats = $("#popupStats");
    stats.innerHTML = (h.stats || []).map((s) =>
      `<div class="stat"><span class="k">${esc(s.k)}</span><span class="v">${esc(s.v)}</span></div>`).join("");

    $("#popup").classList.remove("hidden");
  }

  /* =====================================================================
   * INLINE SVG DIAGRAMS for hotspots that have no photo
   * (kept crisp + on-theme; real CFD figures are used where available)
   * ===================================================================== */
  const DIAGRAMS = {
    geometry(col) {
      return `<svg viewBox="0 0 320 200" role="img" aria-label="Tank geometry schematic">
        <defs><linearGradient id="g_water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#16407a"/><stop offset="1" stop-color="#0a1f44"/></linearGradient></defs>
        <rect x="70" y="30" width="180" height="140" rx="4" fill="url(#g_water)" stroke="${col}" stroke-width="2"/>
        <text x="160" y="22" fill="#9fb0d0" font-size="11" text-anchor="middle" font-family="JetBrains Mono">closed water tank · 293 K</text>
        <!-- jet inlet -->
        <rect x="40" y="93" width="30" height="14" fill="${col}"/>
        <path d="M70 100 H160" stroke="${col}" stroke-width="3" marker-end="url(#arr)"/>
        <defs><marker id="arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0 0 L6 3 L0 6 z" fill="${col}"/></marker></defs>
        <text x="42" y="125" fill="${col}" font-size="10" font-family="JetBrains Mono">jet 0.02 m/s</text>
        <!-- buoyant plume -->
        <path d="M150 100 q30 -40 60 -60" stroke="#ff6b6b" stroke-width="3" fill="none" opacity="0.8"/>
        <path d="M150 100 q40 -30 80 -50" stroke="#ffb02e" stroke-width="2" fill="none" opacity="0.7"/>
        <text x="232" y="46" fill="#ff8a8a" font-size="10" font-family="JetBrains Mono">warm rises</text>
        <!-- height dim -->
        <path d="M258 30 V170" stroke="#9fb0d0" stroke-width="1"/>
        <text x="264" y="105" fill="#9fb0d0" font-size="10" font-family="JetBrains Mono">7.5 cm</text>
      </svg>`;
    },
    mesh(col) {
      let cells = "";
      const x0 = 70, y0 = 40, w = 180, h = 120, n = 18, m = 12;
      const dx = w / n, dy = h / m;
      for (let i = 0; i <= n; i++) cells += `<line x1="${x0 + i * dx}" y1="${y0}" x2="${x0 + i * dx}" y2="${y0 + h}" stroke="${col}" stroke-width="0.5" opacity="0.5"/>`;
      for (let j = 0; j <= m; j++) cells += `<line x1="${x0}" y1="${y0 + j * dy}" x2="${x0 + w}" y2="${y0 + j * dy}" stroke="${col}" stroke-width="0.5" opacity="0.5"/>`;
      return `<svg viewBox="0 0 320 200" role="img" aria-label="Structured mesh schematic">
        <rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="#0a1f44" stroke="${col}" stroke-width="2"/>
        ${cells}
        <rect x="${x0 + 5 * dx}" y="${y0 + 5 * dy}" width="${dx}" height="${dy}" fill="${col}" opacity="0.9"/>
        <text x="160" y="28" fill="#9fb0d0" font-size="11" text-anchor="middle" font-family="JetBrains Mono">structured cubic cells</text>
        <text x="160" y="182" fill="${col}" font-size="11" text-anchor="middle" font-family="JetBrains Mono">1 mm per cell</text>
      </svg>`;
    },
    boundary(col) {
      return `<svg viewBox="0 0 320 200" role="img" aria-label="Boundary conditions schematic">
        <rect x="70" y="35" width="180" height="130" rx="4" fill="#0a1f44" stroke="#9fb0d0" stroke-width="2"/>
        <text x="160" y="26" fill="#9fb0d0" font-size="10" text-anchor="middle" font-family="JetBrains Mono">no-slip walls · laminar</text>
        <rect x="40" y="93" width="30" height="14" fill="${col}"/>
        <path d="M70 100 H150" stroke="${col}" stroke-width="3" marker-end="url(#arr2)"/>
        <defs><marker id="arr2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0 0 L6 3 L0 6 z" fill="${col}"/></marker></defs>
        <text x="20" y="126" fill="${col}" font-size="10" font-family="JetBrains Mono">U=0.02 m/s</text>
        <text x="20" y="138" fill="#ff8a8a" font-size="10" font-family="JetBrains Mono">T=333 K</text>
        <!-- outlet -->
        <path d="M250 130 H285" stroke="#9fb0d0" stroke-width="2" marker-end="url(#arr2)"/>
        <text x="252" y="152" fill="#9fb0d0" font-size="10" font-family="JetBrains Mono">outlet</text>
        <text x="160" y="180" fill="${col}" font-size="11" text-anchor="middle" font-family="JetBrains Mono">Re = U·D/ν ≈ 100</text>
      </svg>`;
    },
  };

  /* =====================================================================
   * PANELS — dock toggling + overlay management
   * ===================================================================== */
  function togglePanel(which, btn) {
    const id = "panel-" + which;
    const panel = document.getElementById(id);
    const isOpen = STATE.activePanel === which;
    closeAllPanels();
    if (!isOpen) {
      panel.classList.remove("hidden");
      STATE.activePanel = which;
      btn.classList.add("active");
      if (which === "dashboard") renderDashboard();
      if (which === "timeline") initTimeline();
      if (which === "ai") initChat();
    }
  }

  function closeAllPanels() {
    ["dashboard", "timeline", "ai"].forEach((w) => document.getElementById("panel-" + w).classList.add("hidden"));
    $$("#dock .dock-btn").forEach((b) => b.classList.remove("active"));
    // pause timeline video to save resources
    const tv = $("#tlVideo"); if (tv) tv.pause();
    STATE.activePanel = null;
  }

  function closeOverlay(id) {
    if (id === "model3d") return closeModel3D();
    if (id === "popup") return $("#popup").classList.add("hidden");
    if (id && id.startsWith("panel-")) { closeAllPanels(); return; }
    const node = document.getElementById(id); if (node) node.classList.add("hidden");
  }

  function closeTopMost() {
    if (!$("#model3d").classList.contains("hidden")) return closeModel3D();
    if (!$("#popup").classList.contains("hidden")) return $("#popup").classList.add("hidden");
    if (STATE.activePanel) return closeAllPanels();
    const info = $("#infoLayer"); if (info && info.classList.contains("show")) return info.classList.remove("show");
  }

  /* ---------- Feature 6 — dashboard ---------- */
  function renderDashboard() {
    const grid = $("#metrics");
    if (grid.childElementCount) return; // build once
    grid.innerHTML = STATE.content.dashboard.metrics.map((m) => `
      <div class="metric">
        <div class="m-label">${esc(m.label)}</div>
        <div class="m-value">${esc(m.value)}</div>
        <div class="m-note">${esc(m.note || "")}</div>
      </div>`).join("");
  }

  /* ---------- Feature 7 — timeline explorer ---------- */
  let tlInited = false;
  function initTimeline() {
    const tl = STATE.content.timeline;
    const v = $("#tlVideo");
    const slider = $("#tlSlider");
    const marksWrap = $("#tlMarks");
    const simMax = tl.duration || 600;

    if (!tlInited) {
      tlInited = true;
      v.src = tl.video;
      slider.max = String(simMax);

      // marks
      marksWrap.innerHTML = "";
      (tl.marks || []).forEach((mk) => {
        const b = el("button", { type: "button", "data-t": mk.t }, esc(mk.label));
        b.addEventListener("click", () => { slider.value = mk.t; onScrub(); });
        marksWrap.appendChild(b);
      });

      // map sim-time → video time
      const scrub = () => {
        const t = Number(slider.value);
        if (v.duration && isFinite(v.duration)) v.currentTime = (t / simMax) * v.duration;
        updateTLReadout(t);
      };
      window.__tlScrub = scrub; // exposed for mark buttons via onScrub
      slider.addEventListener("input", scrub);
      v.addEventListener("loadedmetadata", scrub);
      v.addEventListener("seeked", () => {});
    }
    updateTLReadout(Number(slider.value));
  }
  function onScrub() { if (window.__tlScrub) window.__tlScrub(); }

  function updateTLReadout(t) {
    const marks = STATE.content.timeline.marks || [];
    // nearest mark at or below t
    let cur = marks[0] || { label: `t = ${t} s`, caption: "" };
    for (const mk of marks) if (t >= mk.t) cur = mk;
    $("#tlTime").textContent = `t = ${t} s`;
    $("#tlCaption").textContent = cur.caption || "";
    $$("#tlMarks button").forEach((b) => b.classList.toggle("on", Number(b.dataset.t) <= t));
  }

  /* ---------- Feature 8 — offline AI assistant ---------- */
  const STOP = new Set("a an the is are of to in on for and or what why how does do with this that it its as at be by from".split(" "));
  let chatInited = false;

  function initChat() {
    if (chatInited) return;
    chatInited = true;
    const faq = STATE.faq;
    addMsg(faq.greeting || "Ask me about this research.", "bot");

    // suggestion chips
    const chips = $("#chatChips");
    (faq.suggestions || []).forEach((q) => {
      const c = el("button", { class: "chip", type: "button" }, esc(q));
      c.addEventListener("click", () => { $("#chatInput").value = q; submitChat(q); });
      chips.appendChild(c);
    });

    $("#chatForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const q = $("#chatInput").value.trim();
      if (q) submitChat(q);
    });
  }

  function submitChat(q) {
    addMsg(q, "user");
    $("#chatInput").value = "";
    // tiny delay so it feels responsive/conversational
    setTimeout(() => {
      const hit = searchFAQ(q);
      if (hit) addMsg(hit.answer, "bot", "source · " + hit.id);
      else addMsg(STATE.faq.fallback || "I don't have that yet.", "bot");
      const log = $("#chatLog"); log.scrollTop = log.scrollHeight;
    }, 260);
  }

  function addMsg(text, who, src) {
    const m = el("div", { class: "msg " + who });
    m.textContent = text;
    if (src) m.appendChild(el("span", { class: "src" }, esc(src)));
    const log = $("#chatLog");
    log.appendChild(m);
    log.scrollTop = log.scrollHeight;
  }

  /* Lightweight semantic-ish search: token overlap + keyword/phrase boosts. */
  function tokenize(s) {
    return String(s).toLowerCase().replace(/[^a-z0-9_\s.]/g, " ")
      .split(/\s+/).filter((t) => t && !STOP.has(t));
  }
  function searchFAQ(query) {
    const qTokens = tokenize(query);
    const qStr = " " + query.toLowerCase() + " ";
    let best = null, bestScore = 0;

    for (const e of STATE.faq.entries) {
      let score = 0;
      const kws = (e.keywords || []).map((k) => k.toLowerCase());
      // whole-keyword phrase appears in the query → strong signal
      for (const k of kws) if (qStr.includes(" " + k + " ") || qStr.includes(k)) score += 3;
      // token overlap with keywords
      const kwTokens = new Set(kws.flatMap((k) => k.split(/\s+/)));
      const qTokens2 = tokenize(e.question);
      for (const t of qTokens) {
        if (kwTokens.has(t)) score += 2;
        else if ([...kwTokens].some((kt) => kt.includes(t) || t.includes(kt))) score += 1;
        if (qTokens2.includes(t)) score += 1;
      }
      if (score > bestScore) { bestScore = score; best = e; }
    }
    return bestScore >= 2 ? best : null;
  }

  /* =====================================================================
   * FEATURE 5 — 3D MODEL VIEWER (lazy Three.js module)
   * ===================================================================== */
  async function openModel3D() {
    const modal = $("#model3d");
    modal.classList.remove("hidden");
    const host = $("#model3dCanvas");
    if (STATE.viewer3d) return; // already running
    try {
      const mod = await import("./viewer3d.js");
      STATE.viewer3d = await mod.createViewer(host, {
        glb: PATHS.glb,
        onMode: (label) => { $("#model3dFoot").textContent = label; },
      });
    } catch (err) {
      console.error(err);
      $("#model3dFoot").textContent = "3D viewer failed to load (needs internet for Three.js).";
    }
  }
  function closeModel3D() {
    $("#model3d").classList.add("hidden");
    if (STATE.viewer3d && STATE.viewer3d.dispose) STATE.viewer3d.dispose();
    STATE.viewer3d = null;
    $("#model3dCanvas").innerHTML = "";
  }

})();
