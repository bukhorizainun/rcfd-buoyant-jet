/* ai/llm-hooks.js — future LLM integration point (Feature 11).
 *
 * The whole assistant talks to ONE function, getAnswer(). Today it routes to
 * the offline conversation engine. To go online later, set LLM.enabled = true
 * and implement callLLM(); nothing else in the UI has to change.
 */

export const LLM = {
  enabled: false,        // flip to true once a provider is wired up
  provider: null,        // "openai" | "gemini" | "local" | "rag"
  endpoint: null,        // your serverless proxy URL (keep API keys off the client)
};

/**
 * Placeholder for a real model call. Implement one of the branches and set
 * LLM.enabled = true. Keep secrets on a tiny proxy, not in this file.
 */
export async function callLLM(question, context = {}) {
  // Example shape (left disabled on purpose):
  //
  //   const res = await fetch(LLM.endpoint, {
  //     method: "POST",
  //     headers: { "Content-Type": "application/json" },
  //     body: JSON.stringify({ question, context })   // context can carry KB chunks for RAG
  //   });
  //   return (await res.json()).answer;
  //
  throw new Error("LLM not configured (see ai/llm-hooks.js)");
}

/**
 * Single entry point used by the UI. Tries the LLM when enabled, otherwise
 * falls back to the local engine. `localFn` is the offline responder.
 */
export async function getAnswer(question, localFn, context = {}) {
  if (LLM.enabled) {
    try { return { source: LLM.provider || "llm", text: await callLLM(question, context) }; }
    catch (e) { console.warn("LLM call failed, falling back to local KB:", e.message); }
  }
  return localFn(question);
}
