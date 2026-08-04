// lib/themes.ts
//
// Central theme registry (v1.3.0). Adding a theme = one entry here + one
// token block in app/globals.css. Components never hardcode theme names.
//
// v1.3.0 lineup:
// - "aqua"    → light. Faithful port of pro-all-in-one's Aqua (macOS Liquid
//               Glass): layered radial background, saturate+blur glass
//               surfaces, Apple accent palette, SF-stack typography.
// - "metro"   → dark. Faithful port of pro-all-in-one's Square (Windows 8
//               "Metro"): flat #1A1A1A tiles, azure #0078D7, Segoe UI light
//               type ramp, zero radii, zero shadows.
// - "classic" → the pre-1.3 look ("Old version"), kept as a gift for users
//               who prefer it. Follows the system preference between the old
//               Día (light) and Atardecer (dark) token sets via CSS media
//               query, and keeps the old self-hosted fonts.

export const THEMES = ["aqua", "metro", "classic"] as const;
export type ThemeName = (typeof THEMES)[number];

/** Themes rendered on a dark base (drives color-scheme + Tailwind's dark variant). */
export const DARK_THEMES: ThemeName[] = ["metro"];

export const THEME_LABELS: Record<ThemeName | "system", { es: string; en: string }> = {
  system: { es: "Sistema", en: "System" },
  aqua: { es: "Aqua", en: "Aqua" },
  metro: { es: "Metro", en: "Metro" },
  classic: { es: "Versión anterior", en: "Old version" },
};

/**
 * v1.2 → v1.3 persisted-theme migration (localStorage key "theme").
 * Old light-like themes resolve to Aqua, old dark-like themes to Metro;
 * anything unknown falls back to system. Runs before next-themes boots —
 * see the inline script in app/[lang]/layout.tsx.
 */
export const LEGACY_THEME_MAP: Record<string, ThemeName> = {
  light: "aqua",
  paper: "aqua",
  dark: "metro",
  night: "metro",
};
