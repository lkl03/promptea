// Theme registry + migration invariants (v1.3.0, updated for v1.7.0 Glass).

import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DARK_THEMES, LEGACY_THEME_MAP, THEMES, THEME_LABELS } from "@/lib/themes";

/** Executes the real inline migration script against a fake localStorage. */
function runMigration(stored: string | null): string | null {
  const layout = readFileSync(join(process.cwd(), "app", "[lang]", "layout.tsx"), "utf-8");
  const script = /const THEME_MIGRATION_SCRIPT = `([^`]+)`;/.exec(layout)![1];
  const store = new Map<string, string>();
  if (stored !== null) store.set("theme", stored);
  const localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  };
  new Function("localStorage", script)(localStorage);
  return store.get("theme") ?? null;
}

describe("theme registry (v1.7.0)", () => {
  test("exactly three selectable themes: aqua, metro, glass — Old version is gone", () => {
    expect([...THEMES]).toEqual(["aqua", "metro", "glass"]);
    expect(THEMES as readonly string[]).not.toContain("classic");
  });

  test("metro is the only always-dark theme", () => {
    expect(DARK_THEMES).toEqual(["metro"]);
  });

  test("every theme + system has bilingual labels; Glass is labeled Glass; no Old version label", () => {
    for (const key of [...THEMES, "system"] as const) {
      expect(THEME_LABELS[key].es.length).toBeGreaterThan(0);
      expect(THEME_LABELS[key].en.length).toBeGreaterThan(0);
    }
    expect(THEME_LABELS.glass).toEqual({ es: "Glass", en: "Glass" });
    expect(JSON.stringify(THEME_LABELS)).not.toMatch(/Old version|Versión anterior/);
  });

  test("legacy migration map: light-like → aqua, dark-like → metro, retired classic → system", () => {
    expect(LEGACY_THEME_MAP.light).toBe("aqua");
    expect(LEGACY_THEME_MAP.paper).toBe("aqua");
    expect(LEGACY_THEME_MAP.dark).toBe("metro");
    expect(LEGACY_THEME_MAP.night).toBe("metro");
    expect(LEGACY_THEME_MAP.classic).toBe("system");
    for (const mapped of Object.values(LEGACY_THEME_MAP)) {
      expect([...THEMES, "system"]).toContain(mapped);
    }
  });

  test("the pre-paint migration script mirrors LEGACY_THEME_MAP", () => {
    const layout = readFileSync(join(process.cwd(), "app", "[lang]", "layout.tsx"), "utf-8");
    for (const [legacy, mapped] of Object.entries(LEGACY_THEME_MAP)) {
      expect(layout).toContain(`${legacy}:"${mapped}"`);
    }
  });

  test("executing the migration: a stored 'classic' preference becomes 'system'; valid picks survive; junk is dropped", () => {
    expect(runMigration("classic")).toBe("system");
    expect(runMigration("night")).toBe("metro");
    expect(runMigration("paper")).toBe("aqua");
    for (const theme of [...THEMES, "system"]) expect(runMigration(theme)).toBe(theme);
    expect(runMigration("sepia")).toBeNull();
    expect(runMigration(null)).toBeNull();
  });

  test("providers map system preference onto aqua (light) and metro (dark) and pass glass through", () => {
    const providers = readFileSync(join(process.cwd(), "components", "Providers.tsx"), "utf-8");
    expect(providers).toMatch(/light:\s*"aqua"/);
    expect(providers).toMatch(/dark:\s*"metro"/);
    expect(providers).toMatch(/glass:\s*"glass"/);
    expect(providers).not.toContain("classic");
    expect(providers).toContain('defaultTheme="system"');
    expect(providers).toContain("enableSystem");
  });

  test("globals.css: Glass tokens (light + dark), material recipe and fallbacks; no classic block", () => {
    const css = readFileSync(join(process.cwd(), "app", "globals.css"), "utf-8");
    expect(css).toContain('[data-theme="metro"]');
    expect(css).toContain('[data-theme="glass"]');
    expect(css).toMatch(/@media \(prefers-color-scheme: dark\)[\s\S]*?\[data-theme="glass"\]/);
    expect(css).toContain("--glass-edge");
    expect(css).toMatch(/@supports not \(\(backdrop-filter: blur\(1px\)\)/);
    expect(css).toContain("prefers-reduced-transparency: reduce");
    expect(css).not.toContain('[data-theme="classic"]');
    // Metro's signature rules.
    expect(css).toContain("border-radius: 0 !important");
    expect(css).toContain("#0078d7");
    // Aqua's signature glass recipe.
    expect(css).toContain("saturate(200%) blur(32px)");
    expect(css).not.toContain('[data-theme="night"]');
    expect(css).not.toContain('[data-theme="paper"]');
  });
});
