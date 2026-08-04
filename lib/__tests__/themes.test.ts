// v1.3.0 theme registry + migration invariants.

import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DARK_THEMES, LEGACY_THEME_MAP, THEMES, THEME_LABELS } from "@/lib/themes";

describe("theme registry (v1.3.0)", () => {
  test("exactly three selectable themes: aqua, metro, classic", () => {
    expect([...THEMES]).toEqual(["aqua", "metro", "classic"]);
  });

  test("metro is the only dark-based theme", () => {
    expect(DARK_THEMES).toEqual(["metro"]);
  });

  test("every theme + system has bilingual labels, and Old version is labeled as such", () => {
    for (const key of [...THEMES, "system"] as const) {
      expect(THEME_LABELS[key].es.length).toBeGreaterThan(0);
      expect(THEME_LABELS[key].en.length).toBeGreaterThan(0);
    }
    expect(THEME_LABELS.classic.en).toBe("Old version");
    expect(THEME_LABELS.classic.es).toBe("Versión anterior");
  });

  test("legacy migration: light-like → aqua, dark-like → metro", () => {
    expect(LEGACY_THEME_MAP.light).toBe("aqua");
    expect(LEGACY_THEME_MAP.paper).toBe("aqua");
    expect(LEGACY_THEME_MAP.dark).toBe("metro");
    expect(LEGACY_THEME_MAP.night).toBe("metro");
    // No legacy name maps to something outside the registry.
    for (const mapped of Object.values(LEGACY_THEME_MAP)) {
      expect(THEMES).toContain(mapped);
    }
  });

  test("the pre-paint migration script mirrors LEGACY_THEME_MAP and keeps valid values", () => {
    const layout = readFileSync(join(process.cwd(), "app", "[lang]", "layout.tsx"), "utf-8");
    for (const [legacy, mapped] of Object.entries(LEGACY_THEME_MAP)) {
      expect(layout).toContain(`${legacy}:"${mapped}"`);
    }
    // Valid v1.3 values must survive the migration script untouched.
    for (const theme of [...THEMES, "system"]) {
      expect(layout).toContain(`"${theme}"`);
    }
  });

  test("providers map system preference onto aqua (light) and metro (dark)", () => {
    const providers = readFileSync(join(process.cwd(), "components", "Providers.tsx"), "utf-8");
    expect(providers).toMatch(/light:\s*"aqua"/);
    expect(providers).toMatch(/dark:\s*"metro"/);
    expect(providers).toContain('defaultTheme="system"');
    expect(providers).toContain("enableSystem");
  });

  test("globals.css defines token blocks for all three themes + classic dark variant", () => {
    const css = readFileSync(join(process.cwd(), "app", "globals.css"), "utf-8");
    expect(css).toContain('[data-theme="metro"]');
    expect(css).toContain('[data-theme="classic"]');
    expect(css).toMatch(/@media \(prefers-color-scheme: dark\)[\s\S]*?\[data-theme="classic"\]/);
    // Metro's signature rules.
    expect(css).toContain("border-radius: 0 !important");
    expect(css).toContain("#0078d7");
    // Aqua's signature glass recipe.
    expect(css).toContain("saturate(200%) blur(32px)");
    // No legacy theme blocks left behind.
    expect(css).not.toContain('[data-theme="night"]');
    expect(css).not.toContain('[data-theme="paper"]');
  });
});
