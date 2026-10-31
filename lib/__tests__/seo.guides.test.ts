// v1.7.2 — guide content integrity. Guides are hand-written bilingual data
// (lib/seo/content/guides.ts); these checks catch the mistakes that are easy
// to make when adding one: a duplicated slug, a section or template missing
// its Spanish/English half, an unknown purpose/target, or a template link
// that doesn't open the analyzer (`/{lang}` is the hub since v1.7.0).

import { describe, expect, test } from "vitest";
import { guides } from "@/lib/seo/content/guides";
import { buildPrefillHref } from "@/lib/seo/prefill";
import { isPurpose, isTarget } from "@/lib/domain";

const LOCALES = ["es", "en"] as const;

describe("guide content", () => {
  test("slugs are unique and URL-safe", () => {
    const slugs = guides.map((g) => g.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  test.each(guides.map((g) => [g.slug, g] as const))("%s is complete in both languages", (_slug, g) => {
    for (const l of LOCALES) {
      expect(g.title[l].trim()).not.toBe("");
      expect(g.description[l].trim()).not.toBe("");
      for (const s of g.sections) {
        expect(s.heading[l].trim()).not.toBe("");
        expect(s.bullets[l].length).toBeGreaterThan(0);
      }
      for (const t of g.templates) {
        expect(t.title[l].trim()).not.toBe("");
        expect(t.prompt[l].trim()).not.toBe("");
      }
      for (const f of g.faq) {
        expect(f.q[l].trim()).not.toBe("");
        expect(f.a[l].trim()).not.toBe("");
      }
    }
    // Same number of bullets per section in each language (translations, not rewrites).
    for (const s of g.sections) expect(s.bullets.es.length).toBe(s.bullets.en.length);
  });

  test("template links open the analyzer with the template prefilled", () => {
    for (const g of guides) {
      for (const t of g.templates) {
        expect(isPurpose(t.purpose)).toBe(true);
        expect(isTarget(t.target)).toBe(true);
        for (const lang of LOCALES) {
          const href = buildPrefillHref({ lang, prompt: t.prompt[lang], purpose: t.purpose, target: t.target });
          const url = new URL(href, "https://example.com");
          expect(url.pathname).toBe(`/${lang}/analyzer`);
          expect(url.searchParams.get("prompt")).toBe(t.prompt[lang]);
          expect(url.searchParams.get("purpose")).toBe(t.purpose);
          expect(url.searchParams.get("target")).toBe(t.target);
        }
      }
    }
  });
});
