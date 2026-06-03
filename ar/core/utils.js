/* core/utils.js — shared DOM + string helpers (ES module). */

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export function el(tag, attrs = {}, html) {
  const n = document.createElement(tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (html != null) n.innerHTML = html;
  return n;
}

export const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

let toastTimer;
export function toast(msg, ms = 2600) {
  const t = $("#toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), ms);
}

export async function fetchJSON(path) {
  const res = await fetch(path, { cache: "no-cache" });
  if (!res.ok) throw new Error(`${path} -> HTTP ${res.status}`);
  return res.json();
}

export async function headOK(path) {
  try { const r = await fetch(path, { method: "HEAD", cache: "no-cache" }); return r.ok; }
  catch (_) { return false; }
}

/* sequential, de-duplicated <script> loader (for A-Frame / MindAR) */
const _loaded = {};
export function loadScript(src) {
  if (_loaded[src]) return _loaded[src];
  _loaded[src] = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src; s.async = false;
    s.onload = resolve; s.onerror = () => reject(new Error("load fail: " + src));
    document.head.appendChild(s);
  });
  return _loaded[src];
}
