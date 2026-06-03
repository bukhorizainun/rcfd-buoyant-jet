/* ai/memory.js — session-only memory (Feature 8).
 *
 * Tracks what the visitor has asked and explored so the assistant can deepen
 * its explanations automatically. Nothing is persisted; it lives for the tab.
 */
import bus from "../core/bus.js";

const mem = {
  questions: [],          // raw query strings, most recent last
  topics: {},             // intentId -> times engaged
  hotspots: {},           // hotspotId -> times opened
};

export function recordQuestion(query, intentId) {
  mem.questions.push({ q: query, intentId, t: Date.now() });
  if (intentId) mem.topics[intentId] = (mem.topics[intentId] || 0) + 1;
  bus.emit("memory:update", summary());
}

export function recordHotspot(id) {
  mem.hotspots[id] = (mem.hotspots[id] || 0) + 1;
  // a hotspot maps onto a topic of the same name where one exists
  mem.topics[id] = (mem.topics[id] || 0) + 1;
  bus.emit("memory:update", summary());
}

export function topicCount(id) { return mem.topics[id] || 0; }

/* Explanation depth escalates the more a topic is engaged. */
export function depthFor(id) {
  const n = topicCount(id);
  if (n >= 3) return "advanced";
  if (n === 2) return "intermediate";
  return "intro";
}

export function lastQuestions(n = 5) {
  return mem.questions.slice(-n).map((x) => x.q);
}

export function summary() {
  const topTopic = Object.entries(mem.topics).sort((a, b) => b[1] - a[1])[0];
  return {
    asked: mem.questions.length,
    exploredTopics: Object.keys(mem.topics).length,
    favourite: topTopic ? topTopic[0] : null,
    topics: { ...mem.topics },
  };
}
