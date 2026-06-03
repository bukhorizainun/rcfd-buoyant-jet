/* core/state.js — single shared application state object. */

export const STATE = {
  // content / data
  content: null,       // poster_content.json
  hotspots: null,      // hotspots.json
  kb: null,            // conversation_kb.json

  // runtime
  mode: null,          // "ar" | "demo"
  arReady: false,
  targetCompiled: false,
  activePanel: null,   // currently open dock panel
  researchMode: false, // Feature 2 — context-aware AI mode
  viewer3d: null,      // disposer for the Three.js scene
};
