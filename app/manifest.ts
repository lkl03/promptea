// app/manifest.ts — v1.8.0. Web app manifest (installable / "add to home screen").
// Icons are derived from the mascot by scripts/brand/build-brand-assets.mjs.

import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Promptea",
    short_name: "Promptea",
    description: "Prompt analyzer & optimizer — Analizador y optimizador de prompts.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#eaf1fe",
    theme_color: "#eaf1fe",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/brand/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
