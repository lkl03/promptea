// lib/themes.ts
//
// Central theme registry. Adding a theme = one entry here + one token block
// in app/globals.css. Components never hardcode theme names.

export const THEMES = ["light", "dark", "night", "paper"] as const;
export type ThemeName = (typeof THEMES)[number];

/** Themes rendered on a dark base (drives Tailwind's dark variant too). */
export const DARK_THEMES: ThemeName[] = ["dark", "night"];

export const THEME_LABELS: Record<ThemeName | "system", { es: string; en: string }> = {
  system: { es: "Sistema", en: "System" },
  light: { es: "Día", en: "Day" },
  dark: { es: "Atardecer", en: "Dusk" },
  night: { es: "Noche", en: "Night" },
  paper: { es: "Papel", en: "Paper" },
};
