/* ui/research-mode.js — context-aware "Research Mode" (Feature 2).
 *
 * When on, every hotspot opens straight into an explainer and the UI puts
 * on a lab accent (body.research-mode). State lives in STATE.researchMode;
 * ui/hotspots.js reads it when a hotspot is opened.
 */
import { STATE } from "../core/state.js";
import bus from "../core/bus.js";
import { toast } from "../core/utils.js";

export function setResearchMode(on) {
  STATE.researchMode = !!on;
  document.body.classList.toggle("research-mode", STATE.researchMode);
  bus.emit("mode:research", STATE.researchMode);
  toast(
    STATE.researchMode
      ? "Research Mode on — hotspots are now guided explainer nodes"
      : "Research Mode off — hotspots show the quick summary",
    3200
  );
  return STATE.researchMode;
}

export function toggleResearchMode() { return setResearchMode(!STATE.researchMode); }
