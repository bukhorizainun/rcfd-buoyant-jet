/* ui/insights.js — Research Insight Panel (Feature 6). */
import { $, esc } from "../core/utils.js";
import { STATE } from "../core/state.js";

const ICONS = {
  star: '<path d="M12 2l3 7 7 .5-5.5 4.5 2 7-6.5-4-6.5 4 2-7L2 9.5 9 9z"/>',
  wave: '<path d="M3 12c3 0 3-4 6-4s3 4 6 4 3-4 6-4"/><path d="M3 17c3 0 3-4 6-4s3 4 6 4 3-4 6-4"/>',
  grid: '<rect x="3" y="3" width="18" height="18" rx="1"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/>',
  ai: '<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/>',
};

let built = false;
export function renderInsights() {
  if (built) return;
  built = true;
  const ins = STATE.content.insights;
  if (!ins) return;
  $("#insTitle").textContent = ins.title;
  $("#insSub").textContent = ins.subtitle || "";
  $("#insGroups").innerHTML = ins.groups.map((g) => `
    <div class="ins-group">
      <h3><svg viewBox="0 0 24 24" class="ic">${ICONS[g.icon] || ICONS.star}</svg>${esc(g.heading)}</h3>
      <ul>${g.items.map((it) => `<li>${esc(it)}</li>`).join("")}</ul>
    </div>`).join("");
}
