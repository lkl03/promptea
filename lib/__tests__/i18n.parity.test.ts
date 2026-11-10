// Dictionary parity across every interface language (lib/domain.ts LANGS):
// all of them expose exactly the same key tree, with no empty values, the same
// `{placeholders}` and lists of the same length — so a key added in one
// language can never silently fall back or crash in another. Also checks the
// theme and purpose registries have labels for every language.

import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { THEMES, THEME_LABELS } from "@/lib/themes";
import { LANGS, PURPOSES, type Lang } from "@/lib/domain";
import { purposeOptions } from "@/lib/purposes";

const dictDir = join(process.cwd(), "app", "[lang]", "dictionaries");

function loadDict(lang: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(dictDir, `${lang}.json`), "utf8"));
}

/** Every leaf (strings, and each item of a list) keyed by its path. */
function leaves(obj: unknown, path = "", out = new Map<string, string>()): Map<string, string> {
  if (Array.isArray(obj)) obj.forEach((v, i) => leaves(v, `${path}[${i}]`, out));
  else if (obj && typeof obj === "object") for (const [k, v] of Object.entries(obj as Record<string, unknown>)) leaves(v, path ? `${path}.${k}` : k, out);
  else out.set(path, String(obj));
  return out;
}

const placeholders = (s: string) => (s.match(/\{[a-zA-Z0-9_]+\}/g) ?? []).sort().join(" ");

describe("i18n parity", () => {
  const dicts = Object.fromEntries(LANGS.map((l) => [l, loadDict(l)])) as Record<Lang, Record<string, unknown>>;
  const flat = Object.fromEntries(LANGS.map((l) => [l, leaves(dicts[l])])) as Record<Lang, Map<string, string>>;
  const reference: Lang = "en";

  test("there is one dictionary per language", () => {
    expect(Object.keys(dicts).sort()).toEqual([...LANGS].sort());
  });

  test.each(LANGS.filter((l) => l !== reference))("%s exposes the same key tree as en (lists of the same length included)", (lang) => {
    const a = [...flat[reference].keys()].sort();
    const b = [...flat[lang].keys()].sort();
    const missing = a.filter((k) => !flat[lang].has(k));
    const extra = b.filter((k) => !flat[reference].has(k));
    expect(missing, `keys missing in ${lang}.json: ${missing.join(", ")}`).toEqual([]);
    expect(extra, `keys only in ${lang}.json: ${extra.join(", ")}`).toEqual([]);
  });

  test.each(LANGS)("%s has no empty value", (lang) => {
    const empty = [...flat[lang]].filter(([, v]) => v.trim().length === 0).map(([k]) => k);
    expect(empty).toEqual([]);
  });

  test.each(LANGS.filter((l) => l !== reference))("%s uses the same {placeholders} as en in every string", (lang) => {
    const wrong: string[] = [];
    for (const [key, value] of flat[reference]) {
      const other = flat[lang].get(key);
      if (other !== undefined && placeholders(other) !== placeholders(value)) wrong.push(`${key}: en {${placeholders(value)}} vs ${lang} {${placeholders(other)}}`);
    }
    expect(wrong).toEqual([]);
  });

  test("required sections exist", () => {
    for (const lang of LANGS) {
      expect(dicts[lang]).toHaveProperty("app");
      expect(dicts[lang]).toHaveProperty("analyzer");
      expect(dicts[lang]).toHaveProperty("results");
    }
  });

  test("every theme has a label in every language", () => {
    for (const theme of [...THEMES, "system"] as const) {
      for (const lang of LANGS) expect(THEME_LABELS[theme]?.[lang]?.trim().length, `${theme}/${lang}`).toBeGreaterThan(0);
    }
  });

  test("every purpose has UI labels in every language", () => {
    for (const lang of LANGS) {
      const options = purposeOptions(lang);
      expect(options.map((o) => o.value)).toEqual([...PURPOSES]);
      for (const o of options) expect(o.label.trim().length).toBeGreaterThan(0);
    }
  });
});
