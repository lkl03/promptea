// lib/themes.ts
//
// Central theme registry (v1.3.0). Adding a theme = one entry here + one
// token block in app/globals.css. Components never hardcode theme names.
//
// v1.7.0 lineup:
// - "aqua"  → light. Faithful port of pro-all-in-one's Aqua (macOS Liquid
//             Glass): layered radial background, saturate+blur glass
//             surfaces, Apple accent palette, SF-stack typography.
// - "metro" → dark. Faithful port of pro-all-in-one's Square (Windows 8
//             "Metro"): flat #1A1A1A tiles, azure #0078D7, Segoe UI light
//             type ramp, zero radii, zero shadows.
// - "glass" → (v1.7.0) Promptea's own glass material: translucent surfaces
//             over a mint wash, luminous edges, a soft specular highlight and
//             real depth, with the mascot green as accent. Follows the system
//             preference between a light and a dark material (CSS media
//             query), keeps Promptea's own typefaces, and degrades to opaque
//             surfaces where backdrop-filter is unavailable or the user asks
//             for reduced transparency. Pure CSS — see the v1.7.0 changelog
//             for why the WebGPU liquid-glass library was not adopted.
//
// "classic" ("Old version", v1.3.0–v1.6.x) was retired in v1.7.0. A stored
// "classic" preference migrates to "system" before first paint (see
// LEGACY_THEME_MAP and the inline script in app/[lang]/layout.tsx).

export const THEMES = ["aqua", "metro", "glass"] as const;
export type ThemeName = (typeof THEMES)[number];

/** Themes rendered on a dark base (drives color-scheme + Tailwind's dark variant). */
export const DARK_THEMES: ThemeName[] = ["metro"];

export const THEME_LABELS: Record<ThemeName | "system", { es: string; en: string }> = {
  system: { es: "Sistema", en: "System" },
  aqua: { es: "Aqua", en: "Aqua" },
  metro: { es: "Metro", en: "Metro" },
  glass: { es: "Glass", en: "Glass" },
};

/**
 * Persisted-theme migration (localStorage key "theme"), run before
 * next-themes boots. v1.2 light-like themes resolve to Aqua, dark-like to
 * Metro; v1.7.0 retires "classic", which falls back to the system preference
 * (it followed the system light/dark setting, so "system" is the closest
 * neutral equivalent). Anything unknown is dropped → system.
 */
export const LEGACY_THEME_MAP: Record<string, ThemeName | "system"> = {
  light: "aqua",
  paper: "aqua",
  dark: "metro",
  night: "metro",
  classic: "system",
};
