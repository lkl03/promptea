// EN/ES dictionary parity: both locales expose exactly the same key tree, so
// a key added in one language can never silently fall back or crash in the
// other. Also checks the theme registry has labels for every theme.

import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { THEMES, THEME_LABELS } from "@/lib/themes";
import { PURPOSES } from "@/lib/domain";
import { purposeOptions } from "@/lib/purposes";

const dictDir = join(process.cwd(), "app", "[lang]", "dictionaries");

function loadDict(lang: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(dictDir, `${lang}.json`), "utf8"));
}

function flattenKeys(obj: unknown, prefix = ""): string[] {
  if (Array.isArray(obj)) return [prefix.slice(0, -1)];
  if (obj && typeof obj === "object") {
    return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) => flattenKeys(v, `${prefix}${k}.`));
  }
  return [prefix.slice(0, -1)];
}

describe("i18n parity", () => {
  const en = loadDict("en");
  const es = loadDict("es");

  test("en and es expose identical key trees", () => {
    const enKeys = flattenKeys(en).sort();
    const esKeys = flattenKeys(es).sort();
    const missingInEs = enKeys.filter((k) => !esKeys.includes(k));
    const missingInEn = esKeys.filter((k) => !enKeys.includes(k));
    expect(missingInEs, `keys missing in es.json: ${missingInEs.join(", ")}`).toEqual([]);
    expect(missingInEn, `keys missing in en.json: ${missingInEn.join(", ")}`).toEqual([]);
  });

  test("no empty strings in either dictionary", () => {
    for (const [lang, dict] of [["en", en], ["es", es]] as const) {
      const check = (obj: unknown, path: string) => {
        if (typeof obj === "string") {
          expect(obj.trim().length, `${lang}:${path} is empty`).toBeGreaterThan(0);
        } else if (Array.isArray(obj)) {
          obj.forEach((v, i) => check(v, `${path}[${i}]`));
        } else if (obj && typeof obj === "object") {
          for (const [k, v] of Object.entries(obj as Record<string, unknown>)) check(v, `${path}.${k}`);
        }
      };
      check(dict, lang);
    }
  });

  test("required sections exist", () => {
    for (const dict of [en, es]) {
      expect(dict).toHaveProperty("app");
      expect(dict).toHaveProperty("analyzer");
      expect(dict).toHaveProperty("results");
    }
  });

  test("every theme has labels in both languages", () => {
    for (const theme of [...THEMES, "system"] as const) {
      expect(THEME_LABELS[theme]?.es?.trim().length).toBeGreaterThan(0);
      expect(THEME_LABELS[theme]?.en?.trim().length).toBeGreaterThan(0);
    }
  });

  test("every purpose has UI labels in both languages", () => {
    for (const lang of ["es", "en"] as const) {
      const options = purposeOptions(lang);
      expect(options.map((o) => o.value)).toEqual([...PURPOSES]);
      for (const o of options) expect(o.label.trim().length).toBeGreaterThan(0);
    }
  });
});
