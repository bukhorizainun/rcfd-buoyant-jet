/* ===================================================================== *
 * ANNOTATION FEATURE START                                              *
 * --------------------------------------------------------------------- *
 *  Annotation Mode for the buoyant-jet Step 1 summary site.             *
 *                                                                       *
 *  A non-destructive, full-page freehand drawing overlay for use during *
 *  thesis discussions, supervisor meetings and presentations. It never  *
 *  modifies the page content -- it only paints on a transparent canvas  *
 *  that sits above the document and scrolls with it.                    *
 *                                                                       *
 *  Architecture (all in this one file, no build step):                  *
 *    1.  CONFIG / STATE   - tunables and runtime state                  *
 *    2.  DOM              - canvas overlay + collapsible toolbar (FAB)   *
 *    3.  CANVAS SIZING    - full-page, DPR-aware, redraw on resize       *
 *    4.  DRAWING          - pointer events (pen pressure / mouse /       *
 *                           touch), 2-finger pan-to-scroll, smoothing    *
 *    5.  HISTORY          - stroke model, undo / redo / clear            *
 *    6.  PERSISTENCE      - localStorage (per page path)                *
 *    7.  EXPORT           - PNG + PDF (libs lazy-loaded from CDN)        *
 *    8.  TOOLBAR WIRING   - buttons, colour, size, keyboard shortcut     *
 *                                                                       *
 *  Tools used: plain JS + Pointer Events + Canvas 2D. Export uses        *
 *  html2canvas + jsPDF, fetched on first use only.                      *
 *                                                                       *
 *  To remove the feature entirely: delete annotation.css + this file    *
 *  and the marked block in index.html. Stored drawings live under the   *
 *  localStorage keys prefixed "rcfd_annot".                             *
 * ===================================================================== */
(function () {
  'use strict';

  /* === 1. CONFIG / STATE ============================================= */

  var CDN = {
    html2canvas: 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js',
    jspdf:       'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js'
  };

  var PALETTE = ['#e8000b', '#00467f', '#1a8f3c', '#f5a300', '#1a1a1a', '#ffffff'];
  var SIZE_MIN = 1, SIZE_MAX = 24, SIZE_DEFAULT = 4;
  var DPR_CAP = 2;                 // cap backing-store scale for big pages
  var SAVE_DEBOUNCE = 400;         // ms

  var KEY_STROKES = 'rcfd_annot_v1::' + location.pathname;
  var KEY_MODE    = 'rcfd_annot_mode::' + location.pathname;

  var state = {
    on: false,                     // annotation mode active?
    tool: 'pen',                   // 'pen' | 'eraser'
    color: PALETTE[0],
    size: SIZE_DEFAULT,
    strokes: [],                   // committed strokes (the document model)
    redo: [],                      // undone strokes available to redo
    dpr: Math.min(window.devicePixelRatio || 1, DPR_CAP),
    docW: 0,
    docH: 0
  };

  // drawing-in-progress + multitouch bookkeeping
  var current = null;              // the stroke being drawn
  var pointers = new Map();        // active pointerId -> {x, y}
  var panning = false;
  var panLast = null;

  var canvas, ctx, root, fab, toolbar, busy;
  var elUndo, elRedo, elSizeVal;
  var saveTimer = null, resizeRAF = null;

  /* === small helpers ================================================= */

  function el(tag, attrs, html) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (k === 'class') n.className = attrs[k];
      else n.setAttribute(k, attrs[k]);
    }
    if (html != null) n.innerHTML = html;
    return n;
  }
  function round(v, d) { var f = Math.pow(10, d || 1); return Math.round(v * f) / f; }
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function cssVar(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name);
    return (v && v.trim()) || fallback;
  }

  /* === 2. DOM ======================================================== */

  // minimal inline icon set (stroke icons, inherit currentColor)
  var ICON = {
    pen:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>',
    close:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>',
    eraser: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20H7L3 16a2 2 0 0 1 0-3l9-9a2 2 0 0 1 3 0l5 5a2 2 0 0 1 0 3l-7 7"/><path d="M9 11l5 5"/></svg>',
    undo:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-15-6.7L3 13"/></svg>',
    redo:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 15-6.7L21 13"/></svg>',
    trash:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>',
    png:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>',
    pdf:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h1.5a1.5 1.5 0 0 1 0 3H8v-3zM8 16v2"/><path d="M14 13v5M14 13h1.6M14 15.4h1.2"/></svg>'
  };

  /* Tool-shaped mouse cursors. Each is an SVG data-URI with a white halo  */
  /* (so it stays visible on any background) and a hotspot at the actual   */
  /* drawing point. The pen carries a small dot tinted with the active     */
  /* colour, so the cursor previews what you are about to draw.            */
  function svgCursor(svg, hx, hy) {
    return 'url("data:image/svg+xml;charset=utf-8,' +
           encodeURIComponent(svg) + '") ' + hx + ' ' + hy + ', crosshair';
  }
  function penCursorSVG(color) {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">' +
      '<g fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M12 19l7-7 3 3-7 7-3-3z"/>' +
        '<path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>' +
        '<path d="M2 2l7.586 7.586"/></g>' +
      '<g fill="none" stroke="#1a1a1a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M12 19l7-7 3 3-7 7-3-3z"/>' +
        '<path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>' +
        '<path d="M2 2l7.586 7.586"/></g>' +
      '<circle cx="3" cy="3" r="2.6" fill="' + color + '" stroke="#ffffff" stroke-width="0.9"/>' +
    '</svg>';
  }
  var ERASER_CURSOR_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24">' +
      '<g stroke="#ffffff" stroke-width="4" fill="none" stroke-linejoin="round" stroke-linecap="round">' +
        '<path d="M20 20H7L3 16a2 2 0 0 1 0-3l9-9a2 2 0 0 1 3 0l5 5a2 2 0 0 1 0 3l-7 7"/>' +
        '<path d="M9 11l5 5"/></g>' +
      '<path d="M20 20H7L3 16a2 2 0 0 1 0-3l9-9a2 2 0 0 1 3 0l5 5a2 2 0 0 1 0 3l-7 7" ' +
        'fill="#ffe3ea" stroke="#1a1a1a" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>' +
      '<path d="M9 11l5 5" fill="none" stroke="#1a1a1a" stroke-width="2" stroke-linecap="round"/>' +
    '</svg>';
  function updateCursor() {
    if (!canvas) return;
    canvas.style.cursor = (state.tool === 'eraser')
      ? svgCursor(ERASER_CURSOR_SVG, 13, 13)   // hotspot at the eraser centre
      : svgCursor(penCursorSVG(state.color), 2, 2); // hotspot at the pen tip
  }

  function buildDOM() {
    /* --- full-page canvas --- */
    canvas = el('canvas', { id: 'annot-canvas' });
    ctx = canvas.getContext('2d');
    document.body.appendChild(canvas);

    /* --- toolbar root (FAB + panel) --- */
    root = el('div', { id: 'annot-root', class: 'annot-no-export' });

    toolbar = el('div', { id: 'annot-toolbar', role: 'group', 'aria-label': 'Annotation tools' });
    toolbar.appendChild(el('div', { class: 'annot-title' }, 'Annotation'));

    var grid = el('div', { class: 'annot-grid' });
    grid.appendChild(mkBtn('pen',    ICON.pen,    'Pen (P)'));
    grid.appendChild(mkBtn('eraser', ICON.eraser, 'Eraser (E)'));
    grid.appendChild(mkBtn('undo',   ICON.undo,   'Undo (Ctrl+Z)'));
    grid.appendChild(mkBtn('redo',   ICON.redo,   'Redo (Ctrl+Y)'));
    grid.appendChild(mkBtn('clear',  ICON.trash,  'Clear all'));
    grid.appendChild(mkBtn('png',    ICON.png,    'Save PNG'));
    grid.appendChild(mkBtn('pdf',    ICON.pdf,    'Export PDF'));
    toolbar.appendChild(grid);

    /* colour row: preset swatches + custom picker */
    var cRow = el('div', { class: 'annot-row' });
    cRow.appendChild(el('span', { class: 'annot-row-label' }, 'Color'));
    var sw = el('div', { class: 'annot-swatches' });
    PALETTE.forEach(function (c) {
      var b = el('button', { class: 'annot-swatch', type: 'button',
                             'data-color': c, 'aria-label': 'Colour ' + c });
      b.style.background = c;
      b.addEventListener('click', function () { setColor(c, true); });
      sw.appendChild(b);
    });
    cRow.appendChild(sw);
    var picker = el('input', { type: 'color', id: 'annot-color', value: PALETTE[0],
                               'aria-label': 'Custom colour' });
    picker.addEventListener('input', function () { setColor(picker.value, false); });
    cRow.appendChild(picker);
    toolbar.appendChild(cRow);

    /* size row */
    var sRow = el('div', { class: 'annot-row' });
    sRow.appendChild(el('span', { class: 'annot-row-label' }, 'Size'));
    var slider = el('input', { type: 'range', id: 'annot-size', min: SIZE_MIN,
                               max: SIZE_MAX, step: 1, value: SIZE_DEFAULT,
                               'aria-label': 'Pen size' });
    slider.addEventListener('input', function () {
      state.size = +slider.value; elSizeVal.textContent = slider.value + ' px';
    });
    sRow.appendChild(slider);
    elSizeVal = el('span', { class: 'annot-size-val' }, SIZE_DEFAULT + ' px');
    sRow.appendChild(elSizeVal);
    toolbar.appendChild(sRow);

    /* --- launcher --- */
    fab = el('button', { id: 'annot-fab', type: 'button', title: 'Annotation mode',
                         'aria-label': 'Toggle annotation mode' },
             '<span class="annot-ico-pen">' + ICON.pen + '</span>' +
             '<span class="annot-ico-close">' + ICON.close + '</span>');
    fab.addEventListener('click', function () { state.on ? deactivate() : activate(); });

    root.appendChild(toolbar);
    root.appendChild(fab);
    document.body.appendChild(root);

    /* --- busy overlay for exports --- */
    busy = el('div', { id: 'annot-busy', class: 'annot-no-export' },
              '<div class="annot-busy-card"><span class="annot-spinner"></span>' +
              '<span id="annot-busy-text">Working…</span></div>');
    document.body.appendChild(busy);

    elUndo = grid.querySelector('[data-act="undo"]');
    elRedo = grid.querySelector('[data-act="redo"]');
  }

  function mkBtn(act, icon, tip) {
    var b = el('button', { class: 'annot-btn', type: 'button',
                           'data-act': act, 'data-tip': tip, 'aria-label': tip }, icon);
    b.addEventListener('click', function () { onAction(act); });
    return b;
  }

  function onAction(act) {
    switch (act) {
      case 'pen':    setTool('pen');   break;
      case 'eraser': setTool('eraser'); break;
      case 'undo':   undo();   break;
      case 'redo':   redo();   break;
      case 'clear':  clearAll(); break;
      case 'png':    exportPNG(); break;
      case 'pdf':    exportPDF(); break;
    }
  }

  /* === 3. CANVAS SIZING ============================================== */

  function docSize() {
    var d = document.documentElement, b = document.body;
    return {
      w: Math.max(d.scrollWidth, b.scrollWidth, d.clientWidth),
      h: Math.max(d.scrollHeight, b.scrollHeight, d.clientHeight)
    };
  }

  // Resize the backing store to the full page and redraw the model.
  function resizeCanvas() {
    var s = docSize();
    state.docW = s.w; state.docH = s.h;
    state.dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
    canvas.style.width = s.w + 'px';
    canvas.style.height = s.h + 'px';
    canvas.width = Math.round(s.w * state.dpr);
    canvas.height = Math.round(s.h * state.dpr);
    redrawAll();
  }

  // Watch for page-height changes (images, Plotly, expanding sections…).
  function watchResize() {
    var schedule = function () {
      if (resizeRAF) return;
      resizeRAF = requestAnimationFrame(function () {
        resizeRAF = null;
        var s = docSize();
        if (Math.abs(s.w - state.docW) > 1 || Math.abs(s.h - state.docH) > 1) {
          resizeCanvas();
        }
      });
    };
    window.addEventListener('resize', schedule, { passive: true });
    if (window.ResizeObserver) {
      new ResizeObserver(schedule).observe(document.body);
    }
    // also re-check after late assets (videos / fonts) settle
    window.addEventListener('load', function () { setTimeout(resizeCanvas, 300); });
  }

  /* === 4. DRAWING ==================================================== */

  function widthFor(stroke, pressure) {
    // pressure ~0..1; mouse often reports 0 -> treat as medium
    var p = (pressure && pressure > 0) ? pressure : 0.5;
    var base = stroke.size * (stroke.tool === 'eraser' ? 1.6 : 1);
    return clamp(base * (0.55 + p), 0.4, SIZE_MAX * 2);
  }

  function applyStrokeStyle(stroke) {
    if (stroke.tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = stroke.color;
    }
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }

  // Draw one smoothed segment ending at points[i] (needs i>=1).
  function drawSegment(stroke, i) {
    var pts = stroke.points;
    var p1 = pts[i - 1], p2 = pts[i];
    var midPrev = (i >= 2)
      ? { x: (pts[i - 2].x + p1.x) / 2, y: (pts[i - 2].y + p1.y) / 2 }
      : { x: p1.x, y: p1.y };
    var midCur = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
    applyStrokeStyle(stroke);
    ctx.lineWidth = widthFor(stroke, p2.p);
    ctx.beginPath();
    ctx.moveTo(midPrev.x, midPrev.y);
    ctx.quadraticCurveTo(p1.x, p1.y, midCur.x, midCur.y);
    ctx.stroke();
  }

  function drawDot(stroke) {
    var p = stroke.points[0];
    applyStrokeStyle(stroke);
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(widthFor(stroke, p.p) / 2, 0.6), 0, Math.PI * 2);
    ctx.fillStyle = (stroke.tool === 'eraser') ? 'rgba(0,0,0,1)' : stroke.color;
    ctx.fill();
  }

  // Full redraw from the stroke model (after undo/redo/clear/resize).
  function redrawAll() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    for (var s = 0; s < state.strokes.length; s++) {
      var st = state.strokes[s];
      if (st.points.length === 1) { drawDot(st); continue; }
      for (var i = 1; i < st.points.length; i++) drawSegment(st, i);
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  /* --- pointer plumbing --- */

  function isDrawingPointer(e) {
    // pen + mouse always draw; touch draws only with a single finger
    return e.pointerType !== 'touch' || pointers.size === 1;
  }

  function onPointerDown(e) {
    if (!state.on) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // a second finger turns the gesture into a two-finger scroll/pan
    if (pointers.size === 2) {
      if (current) { current = null; redrawAll(); } // discard accidental stroke
      panning = true;
      panLast = avgPointer();
      return;
    }
    if (pointers.size > 2) return;

    if (!isDrawingPointer(e)) return;
    e.preventDefault();
    try { canvas.setPointerCapture(e.pointerId); } catch (err) {}

    current = { tool: state.tool, color: state.color, size: state.size, points: [] };
    pushPoint(e);
    drawDot(current);
  }

  function onPointerMove(e) {
    if (!state.on) return;
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (panning) {                              // two-finger scroll
      var now = avgPointer();
      if (panLast) window.scrollBy(panLast.x - now.x, panLast.y - now.y);
      panLast = avgPointer();                   // recompute after scroll
      e.preventDefault();
      return;
    }
    if (!current) return;
    e.preventDefault();

    // use coalesced events for high-fidelity pen input when available
    var evs = e.getCoalescedEvents ? e.getCoalescedEvents() : null;
    if (evs && evs.length) {
      for (var k = 0; k < evs.length; k++) { pushPoint(evs[k]); drawSegment(current, current.points.length - 1); }
    } else {
      pushPoint(e); drawSegment(current, current.points.length - 1);
    }
  }

  function onPointerUp(e) {
    pointers.delete(e.pointerId);
    try { canvas.releasePointerCapture(e.pointerId); } catch (err) {}

    if (panning) {
      if (pointers.size < 2) { panning = false; panLast = null; }
      return;
    }
    if (current) { commitStroke(current); current = null; }
  }

  function pushPoint(e) {
    if (!current) return;
    current.points.push({
      x: e.pageX, y: e.pageY,
      p: (typeof e.pressure === 'number') ? e.pressure : 0.5
    });
  }

  function avgPointer() {
    var sx = 0, sy = 0, n = 0;
    pointers.forEach(function (p) { sx += p.x; sy += p.y; n++; });
    return n ? { x: sx / n, y: sy / n } : { x: 0, y: 0 };
  }

  /* === 5. HISTORY (undo / redo / clear) ============================== */

  function commitStroke(stroke) {
    if (!stroke.points.length) return;
    state.strokes.push(stroke);
    state.redo.length = 0;        // a fresh stroke invalidates the redo stack
    syncHistoryButtons();
    scheduleSave();
  }

  function undo() {
    if (!state.strokes.length) return;
    state.redo.push(state.strokes.pop());
    redrawAll(); syncHistoryButtons(); scheduleSave();
  }
  function redo() {
    if (!state.redo.length) return;
    state.strokes.push(state.redo.pop());
    redrawAll(); syncHistoryButtons(); scheduleSave();
  }
  function clearAll() {
    if (!state.strokes.length && !state.redo.length) return;
    if (!window.confirm('Clear all annotations? The page content is not affected.')) return;
    state.strokes.length = 0;
    state.redo.length = 0;
    redrawAll(); syncHistoryButtons();
    try { localStorage.removeItem(KEY_STROKES); } catch (e) {}
  }

  function syncHistoryButtons() {
    if (elUndo) elUndo.disabled = state.strokes.length === 0;
    if (elRedo) elRedo.disabled = state.redo.length === 0;
  }

  /* === 6. PERSISTENCE ================================================ */

  function scheduleSave() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(save, SAVE_DEBOUNCE);
  }
  function save() {
    try {
      // round coordinates to keep the payload small
      var slim = state.strokes.map(function (s) {
        return {
          t: s.tool === 'eraser' ? 'e' : 'p',
          c: s.color, w: s.size,
          d: s.points.map(function (p) { return [round(p.x, 1), round(p.y, 1), round(p.p, 2)]; })
        };
      });
      localStorage.setItem(KEY_STROKES, JSON.stringify({ v: 1, s: slim }));
    } catch (e) { /* quota / disabled storage: ignore */ }
  }
  function load() {
    try {
      var raw = localStorage.getItem(KEY_STROKES);
      if (!raw) return;
      var obj = JSON.parse(raw);
      if (!obj || !obj.s) return;
      state.strokes = obj.s.map(function (s) {
        return {
          tool: s.t === 'e' ? 'eraser' : 'pen',
          color: s.c, size: s.w,
          points: s.d.map(function (a) { return { x: a[0], y: a[1], p: a[2] }; })
        };
      });
    } catch (e) { state.strokes = []; }
  }

  /* === 7. EXPORT (PNG / PDF) ========================================= */

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src; s.async = true;
      s.onload = resolve;
      s.onerror = function () { reject(new Error('Failed to load ' + src)); };
      document.head.appendChild(s);
    });
  }
  function ensureLib(which) {
    if (which === 'html2canvas' && window.html2canvas) return Promise.resolve();
    if (which === 'jspdf' && window.jspdf) return Promise.resolve();
    return loadScript(CDN[which]);
  }
  function showBusy(text) {
    document.getElementById('annot-busy-text').textContent = text || 'Working…';
    busy.classList.add('is-on');
  }
  function hideBusy() { busy.classList.remove('is-on'); }

  // Render the page + annotations into one canvas (full page).
  function buildComposite() {
    var scale = Math.min(window.devicePixelRatio || 1, 2);
    var wasOpen = root.classList.contains('is-open');
    if (wasOpen) root.classList.remove('is-open');   // keep the panel out of the shot

    var opts = {
      backgroundColor: cssVar('--bg', '#ffffff'),
      scale: scale,
      useCORS: true,
      logging: false,
      width: state.docW,
      height: state.docH,
      windowWidth: document.documentElement.clientWidth,
      scrollX: 0, scrollY: 0,
      ignoreElements: function (node) {
        return node.id === 'annot-canvas' || node.id === 'annot-root' ||
               node.id === 'annot-busy' ||
               (node.classList && node.classList.contains('annot-no-export'));
      }
    };

    return window.html2canvas(document.body, opts).then(function (pageCanvas) {
      if (wasOpen) root.classList.add('is-open');
      var out = document.createElement('canvas');
      out.width = pageCanvas.width;
      out.height = pageCanvas.height;
      var octx = out.getContext('2d');
      octx.drawImage(pageCanvas, 0, 0);
      // overlay the annotation layer, scaled to match the captured page
      octx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, out.width, out.height);
      return out;
    });
  }

  function stamp() {
    var d = new Date();
    var p = function (n) { return ('0' + n).slice(-2); };
    return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '_' +
           p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds());
  }

  function exportPNG() {
    showBusy('Rendering page…');
    ensureLib('html2canvas')
      .then(buildComposite)
      .then(function (out) {
        out.toBlob(function (blob) {
          hideBusy();
          var a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'rcfd_annotations_' + stamp() + '.png';
          document.body.appendChild(a); a.click(); a.remove();
          setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
        }, 'image/png');
      })
      .catch(function (err) {
        hideBusy();
        console.error('[annotation] PNG export failed:', err);
        alert('PNG export failed (could not load the renderer or capture the page).\n' +
              'Check your internet connection and try again.');
      });
  }

  function exportPDF() {
    showBusy('Building PDF…');
    Promise.all([ensureLib('html2canvas'), ensureLib('jspdf')])
      .then(buildComposite)
      .then(function (out) {
        var jsPDF = window.jspdf.jsPDF;
        var img = out.toDataURL('image/png');
        var pdf = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
        var pageW = pdf.internal.pageSize.getWidth();
        var pageH = pdf.internal.pageSize.getHeight();
        var imgW = pageW;
        var imgH = out.height * (pageW / out.width);

        if (imgH <= pageH) {
          pdf.addImage(img, 'PNG', 0, 0, imgW, imgH);
        } else {
          // slice one tall image across multiple A4 pages
          var heightLeft = imgH, position = 0;
          pdf.addImage(img, 'PNG', 0, position, imgW, imgH);
          heightLeft -= pageH;
          while (heightLeft > 0) {
            position -= pageH;
            pdf.addPage();
            pdf.addImage(img, 'PNG', 0, position, imgW, imgH);
            heightLeft -= pageH;
          }
        }
        hideBusy();
        pdf.save('rcfd_annotations_' + stamp() + '.pdf');
      })
      .catch(function (err) {
        hideBusy();
        console.error('[annotation] PDF export failed:', err);
        alert('PDF export failed (could not load the renderer).\n' +
              'You can still use "Save PNG". Check your connection and try again.');
      });
  }

  /* === 8. TOOLBAR WIRING ============================================= */

  function activate() {
    state.on = true;
    root.classList.add('is-open');
    document.body.classList.add('annot-active');
    setTool(state.tool);
    resizeCanvas();
    try { localStorage.setItem(KEY_MODE, '1'); } catch (e) {}
  }
  function deactivate() {
    state.on = false;
    root.classList.remove('is-open');
    document.body.classList.remove('annot-active');
    // finish any stroke / gesture cleanly
    if (current) { commitStroke(current); current = null; }
    pointers.clear(); panning = false; panLast = null;
    try { localStorage.setItem(KEY_MODE, '0'); } catch (e) {}
  }

  function setTool(tool) {
    state.tool = tool;
    document.body.classList.toggle('annot-eraser', tool === 'eraser');
    var btns = toolbar.querySelectorAll('[data-act="pen"],[data-act="eraser"]');
    btns.forEach(function (b) {
      b.classList.toggle('is-active', b.getAttribute('data-act') === tool);
    });
    updateCursor();
  }

  function setColor(c, fromSwatch) {
    state.color = c;
    if (state.tool === 'eraser') setTool('pen');   // picking a colour implies drawing
    var picker = document.getElementById('annot-color');
    if (picker && /^#[0-9a-fA-F]{6}$/.test(c)) picker.value = c;
    toolbar.querySelectorAll('.annot-swatch').forEach(function (b) {
      b.classList.toggle('is-active', b.getAttribute('data-color') === c);
    });
    if (!fromSwatch) {
      toolbar.querySelectorAll('.annot-swatch').forEach(function (b) { b.classList.remove('is-active'); });
    }
    updateCursor();   // refresh the pen cursor's colour dot
  }

  function onKey(e) {
    // Ctrl/Cmd+Shift+A toggles the whole feature from anywhere
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
      e.preventDefault(); state.on ? deactivate() : activate(); return;
    }
    if (!state.on) return;
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;

    if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z') && !e.shiftKey) { e.preventDefault(); undo(); }
    else if ((e.ctrlKey || e.metaKey) && ((e.key === 'y' || e.key === 'Y') || (e.shiftKey && (e.key === 'z' || e.key === 'Z')))) { e.preventDefault(); redo(); }
    else if (e.key === 'p' || e.key === 'P') setTool('pen');
    else if (e.key === 'e' || e.key === 'E') setTool('eraser');
    else if (e.key === 'Escape') deactivate();
  }

  /* === INIT ========================================================== */

  function init() {
    buildDOM();
    load();
    resizeCanvas();
    watchResize();
    syncHistoryButtons();
    setColor(state.color, true);

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    canvas.addEventListener('pointerleave', function (e) {
      // only finalise if the pointer truly left (not captured drawing)
      if (!current && !panning) pointers.delete(e.pointerId);
    });
    document.addEventListener('keydown', onKey);

    // restore previous mode state if it was ON
    try { if (localStorage.getItem(KEY_MODE) === '1') activate(); } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
/* ===================================================================== *
 * ANNOTATION FEATURE END                                                *
 * ===================================================================== */
