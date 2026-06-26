/* core/config.js — CDN URLs and asset paths in one place. */

export const CDN = {
  aframe: "https://aframe.io/releases/1.5.0/aframe.min.js",
  mindar: "https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-aframe.prod.js",
};

export const PATHS = {
  content: "data/poster_content.json",
  hotspots: "data/hotspots.json",
  kb: "data/conversation_kb.json",
  target: "assets/poster/target.mind",
  poster: "assets/poster/poster.jpg",
  cfdVideo: "assets/videos/cfd_reference.mp4",
  rcfdVideo: "assets/videos/rcfd_replay.mp4",
  // full CFD recordings (tank + floor) shown as floating "LIVE CFD" monitors
  adiaLive: "assets/videos/cfd_adia_live.mp4",     // adiabatic CFD run
  hlLive: "assets/videos/cfd_heatloss_h100.mp4",   // wall heat-loss CFD run (h=100)
  glb: "assets/models/buoyant_jet.glb",
};
