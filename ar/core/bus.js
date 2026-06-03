/* core/bus.js — tiny event bus so features stay decoupled (event-driven).
 *
 * Modules emit/observe named events instead of calling each other directly,
 * e.g. bus.emit("hotspot:open", hotspot) or bus.on("mode:research", fn).
 */
const listeners = new Map();

export function on(evt, fn) {
  if (!listeners.has(evt)) listeners.set(evt, new Set());
  listeners.get(evt).add(fn);
  return () => off(evt, fn);
}
export function off(evt, fn) {
  const set = listeners.get(evt);
  if (set) set.delete(fn);
}
export function emit(evt, payload) {
  const set = listeners.get(evt);
  if (set) for (const fn of set) { try { fn(payload); } catch (e) { console.error(e); } }
}

export default { on, off, emit };
