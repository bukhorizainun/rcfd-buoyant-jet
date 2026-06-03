/* ai/conversation.js — offline conversational engine (Feature 1 + 5 + 8).
 *
 * - keyword/semantic match over conversation_kb.json
 * - layered answers: short -> physical intuition -> CFD interpretation
 * - depth auto-escalates with session memory (intro/intermediate/advanced)
 * - "ask more" branches: deeper / math / analogy
 */
import * as memory from "./memory.js";

let KB = null;
const STOP = new Set(
  "a an the is are of to in on for and or what why how does do with this that it its as at be by from explain show me tell about".split(" ")
);

export function init(kb) { KB = kb; }
export function greeting() { return KB.greeting; }
export function fallback() { return KB.fallback; }
export function suggestions() { return KB.suggestions || []; }
export function followupLabels() { return KB.followupLabels || {}; }
export function intentById(id) { return (KB.intents || []).find((i) => i.id === id) || null; }

function tokenize(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9_\s.]/g, " ")
    .split(/\s+/).filter((t) => t && !STOP.has(t));
}

/* Lightweight retrieval: phrase + keyword + title token overlap. */
export function search(query) {
  if (!KB) return null;
  const qStr = " " + query.toLowerCase() + " ";
  const qTokens = tokenize(query);
  let best = null, bestScore = 0;

  for (const intent of KB.intents) {
    let score = 0;
    const kws = (intent.keywords || []).map((k) => k.toLowerCase());
    for (const k of kws) if (qStr.includes(k)) score += 3;            // phrase hit
    const kwTokens = new Set(kws.flatMap((k) => k.split(/\s+/)));
    const titleTokens = tokenize(intent.title);
    for (const t of qTokens) {
      if (kwTokens.has(t)) score += 2;
      else if ([...kwTokens].some((kt) => kt.includes(t) || t.includes(kt))) score += 1;
      if (titleTokens.includes(t)) score += 1;
    }
    if (score > bestScore) { bestScore = score; best = intent; }
  }
  return bestScore >= 2 ? best : null;
}

/* Build the layered answer blocks, depth-aware. */
export function buildBlocks(intent, depth) {
  const blocks = [
    { label: null, text: intent.short },
    { label: "Physical intuition", text: intent.physical },
    { label: "CFD interpretation", text: intent.cfd },
  ];
  // advanced readers get the deeper layer folded in automatically
  if (depth === "advanced" && intent.more && intent.more.deeper) {
    blocks.push({ label: "Going deeper", text: intent.more.deeper });
  }
  return blocks;
}

/* On-demand branch text for the "ask more" buttons. */
export function branch(intent, key) {
  if (!intent.more) return null;
  if (key === "cfd") return intent.cfd;
  return intent.more[key] || null;
}

function plan(intent, query) {
  memory.recordQuestion(query || intent.title, intent.id);
  const depth = memory.depthFor(intent.id);
  return {
    ok: true,
    intent,
    depth,
    title: intent.title,
    blocks: buildBlocks(intent, depth),
    followup: intent.followup || null,
    related: intent.related || [],
    source: "local-kb · " + intent.id + (depth !== "intro" ? " · " + depth : ""),
  };
}

/* Main responder used by the chat UI. Records memory and returns a render plan. */
export function respond(query) {
  const intent = search(query);
  if (!intent) { memory.recordQuestion(query, null); return { ok: false, text: KB.fallback }; }
  return plan(intent, query);
}

/* Direct responder for hotspot Level-2 questions and follow-up chips. */
export function respondById(id) {
  const intent = intentById(id);
  if (!intent) return { ok: false, text: KB.fallback };
  return plan(intent, intent.title);
}
