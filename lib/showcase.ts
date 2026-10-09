// lib/showcase.ts
//
// v1.7.0 — the hub's product showcase video. `available` is flipped to true
// only by scripts/showcase/render.mjs after it has rendered and verified every
// file below; until then the hub shows an honest "being generated" state
// instead of an empty player.

type PerLang = { es: string; en: string };

export const SHOWCASE: {
  available: boolean;
  version: string;
  width: number;
  height: number;
  durationSeconds: number;
  webm: PerLang;
  mp4: PerLang;
  poster: PerLang;
  captions: PerLang;
} = {
  available: true,
  version: "1.7.0",
  width: 1280,
  height: 720,
  durationSeconds: 81.4,
  webm: { es: "/showcase/promptea-showcase-es.webm", en: "/showcase/promptea-showcase-en.webm" },
  mp4: { es: "/showcase/promptea-showcase-es.mp4", en: "/showcase/promptea-showcase-en.mp4" },
  poster: { es: "/showcase/promptea-showcase-es.jpg", en: "/showcase/promptea-showcase-en.jpg" },
  captions: { es: "/showcase/promptea-showcase-es.vtt", en: "/showcase/promptea-showcase-en.vtt" },
};
