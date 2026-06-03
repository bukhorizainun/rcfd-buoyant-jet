/* ui/chat.js — conversational assistant panel + the shared layered-answer
 * renderer reused by hotspot Level-2 explainers (Features 1, 5, 8).
 */
import { $, el, esc } from "../core/utils.js";
import * as conversation from "../ai/conversation.js";

let inited = false;

export function initChat() {
  if (inited) return;
  inited = true;

  addBubble($("#chatLog"), "bot", conversation.greeting());

  const chips = $("#chatChips");
  conversation.suggestions().forEach((q) => {
    const c = el("button", { class: "chip", type: "button" }, esc(q));
    c.addEventListener("click", () => ask(q));
    chips.appendChild(c);
  });

  $("#chatForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const q = $("#chatInput").value.trim();
    if (q) ask(q);
  });
}

/* Ask a free-text question in the chat panel. */
export function ask(query) {
  const log = $("#chatLog");
  addBubble(log, "user", query);
  $("#chatInput").value = "";
  const wrap = el("div", { class: "msg bot" });
  log.appendChild(wrap);
  setTimeout(() => { renderAnswer(wrap, { query }); log.scrollTop = log.scrollHeight; }, 240);
}

function addBubble(log, who, text) {
  const m = el("div", { class: "msg " + who });
  m.textContent = text;
  log.appendChild(m);
  log.scrollTop = log.scrollHeight;
}

/**
 * Render a layered answer into `container`.
 * opts: { query } (free text) | { intentId } (direct topic)
 * Wires the "ask more" branches and the follow-up chip.
 */
export function renderAnswer(container, opts = {}) {
  const plan = opts.intentId ? conversation.respondById(opts.intentId) : conversation.respond(opts.query || "");
  if (!plan.ok) { container.textContent = plan.text; return; }

  const labels = conversation.followupLabels();
  const intent = plan.intent;

  const blocksHtml = plan.blocks.map((b) =>
    b.label
      ? `<p class="ans-block"><span class="ans-label">${esc(b.label)}</span>${esc(b.text)}</p>`
      : `<p class="ans-lead">${esc(b.text)}</p>`
  ).join("");

  // which "ask more" branches exist for this intent
  const moreBtns = [];
  if (intent.more && intent.more.deeper && plan.depth !== "advanced")
    moreBtns.push(`<button class="ans-btn" data-more="deeper">${esc(labels.deeper || "Deeper")}</button>`);
  if (intent.more && intent.more.math)
    moreBtns.push(`<button class="ans-btn" data-more="math">${esc(labels.math || "Math intuition")}</button>`);
  if (intent.more && intent.more.analogy)
    moreBtns.push(`<button class="ans-btn" data-more="analogy">${esc(labels.analogy || "Real-world analogy")}</button>`);

  container.innerHTML =
    `<div class="answer">
       <div class="ans-title">${esc(plan.title)}</div>
       ${blocksHtml}
       <div class="ans-extra"></div>
       ${moreBtns.length ? `<div class="ans-more">${moreBtns.join("")}</div>` : ""}
       ${plan.followup ? `<button class="ans-followup" data-fid="${esc(plan.followup.id)}">${esc(plan.followup.text)} ›</button>` : ""}
       <div class="ans-src">${esc(plan.source)}</div>
     </div>`;

  const extra = container.querySelector(".ans-extra");
  container.querySelectorAll(".ans-btn[data-more]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.more;
      const text = conversation.branch(intent, key);
      if (!text) return;
      const lbl = key === "deeper" ? (labels.deeper || "Deeper")
        : key === "math" ? (labels.math || "Math") : (labels.analogy || "Analogy");
      extra.insertAdjacentHTML("beforeend",
        `<p class="ans-block"><span class="ans-label">${esc(lbl)}</span>${esc(text)}</p>`);
      btn.remove();
    });
  });

  const fu = container.querySelector(".ans-followup");
  if (fu) fu.addEventListener("click", () => {
    const next = el("div", { class: "msg bot followup-answer" });
    // append after the current bubble (in chat) or inside popup explainer
    const host = container.closest("#chatLog") || container.parentElement;
    host.appendChild(next);
    renderAnswer(next, { intentId: fu.dataset.fid });
    const log = $("#chatLog"); if (log) log.scrollTop = log.scrollHeight;
  });
}
