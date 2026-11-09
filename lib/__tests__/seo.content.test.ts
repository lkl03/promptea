// Depth and integrity of the hand-written SEO content (glossary, guides, model
// pages, landings). The minimums are not vanity: a glossary entry with one line
// and no FAQ is a thin page, and thin pages are what the v1.8.0 audit flagged.

import { describe, expect, it } from "vitest";

import { glossary } from "@/lib/seo/content/glossary";
import { guides } from "@/lib/seo/content/guides";
import { modelPages } from "@/lib/seo/content/models";
import { landings } from "@/lib/seo/content/landings";
import { TARGETS } from "@/lib/domain";
import { MODEL_REGISTRY } from "@/lib/models";
import { currentModels } from "@/lib/seo/facts";
import { isIsoDay } from "@/lib/seo/dates";
import { buildPrefillHref } from "@/lib/seo/prefill";
import { isPurpose, isTarget } from "@/lib/domain";
import { glossaryMarkdown, modelMarkdown } from "@/lib/seo/markdown";
import { absUrl } from "@/lib/seo/site";

const LOCALES = ["es", "en"] as const;
const words = (s: string) => s.split(/\s+/).filter(Boolean).length;
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

describe("glossary", () => {
  it("has the audited set of terms, unique and URL-safe", () => {
    const slugs = glossary.map((g) => g.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) expect(s).toMatch(SLUG);
    expect(slugs.length).toBeGreaterThanOrEqual(20);
    for (const s of ["chain-of-thought", "prompt-chaining", "structured-output", "tokens", "top-p", "retrieval-augmented-generation", "negative-prompting", "context-engineering"]) {
      expect(slugs, s).toContain(s);
    }
  });

  for (const term of glossary) {
    describe(term.slug, () => {
      for (const l of LOCALES) {
        it(`${l}: a precise definition, enough substance and a real FAQ`, () => {
          expect(term.title[l].trim().length).toBeGreaterThan(2);
          // the description is also the meta description
          expect(term.description[l].length).toBeGreaterThanOrEqual(60);
          expect(term.description[l].length).toBeLessThanOrEqual(240);
          expect(term.body[l].length).toBeGreaterThanOrEqual(4);
          expect(words(term.body[l].join(" "))).toBeGreaterThanOrEqual(100);
          expect(term.example.prompt[l].trim().length).toBeGreaterThan(40);
          expect(term.faq.length).toBeGreaterThanOrEqual(2);
          for (const f of term.faq) {
            expect(f.q[l].trim().endsWith("?"), f.q[l]).toBe(true);
            expect(words(f.a[l])).toBeGreaterThanOrEqual(12);
          }
        });
      }

      it("translations are parallel, not rewrites (same number of paragraphs)", () => {
        expect(term.body.es.length).toBe(term.body.en.length);
      });

      it("the example opens the analyzer with a valid purpose and target", () => {
        expect(isPurpose(term.example.purpose)).toBe(true);
        expect(isTarget(term.example.target)).toBe(true);
        for (const l of LOCALES) {
          const url = new URL(buildPrefillHref({ lang: l, prompt: term.example.prompt[l], purpose: term.example.purpose, target: term.example.target }), "https://x.test");
          expect(url.searchParams.get("prompt")).toBe(term.example.prompt[l]);
        }
      });

      it("has a valid editorial date", () => {
        if (term.updated) expect(isIsoDay(term.updated)).toBe(true);
      });

      it("related guides and terms exist and do not point at itself", () => {
        for (const g of term.relatedGuides ?? []) expect(guides.some((x) => x.slug === g), `guide ${g}`).toBe(true);
        for (const t of term.relatedTerms ?? []) {
          expect(glossary.some((x) => x.slug === t), `term ${t}`).toBe(true);
          expect(t).not.toBe(term.slug);
        }
        expect((term.relatedGuides ?? []).length).toBeGreaterThanOrEqual(2);
      });
    });
  }

  it("the markdown twin carries the definition, the FAQ and the related links", () => {
    const t = glossary.find((x) => x.slug === "retrieval-augmented-generation")!;
    const md = glossaryMarkdown(t, "en", absUrl("/en/glossary/retrieval-augmented-generation"), "2026-11-09");
    expect(md).toContain(t.faq[0].q.en);
    expect(md).toContain("## Related");
    expect(md).toContain(absUrl("/en/guides/context-engineering"));
  });
});

describe("guides", () => {
  const wordsOf = (g: (typeof guides)[number], l: "en" | "es") =>
    words(g.description[l]) +
    g.sections.reduce((a, s) => a + words(s.heading[l]) + words(s.bullets[l].join(" ")), 0) +
    g.templates.reduce((a, t) => a + words(t.prompt[l]), 0) +
    g.faq.reduce((a, f) => a + words(f.q[l]) + words(f.a[l]), 0);

  for (const g of guides) {
    it(`${g.slug}: complete, with before/after-level depth and a SERP-safe title and description`, () => {
      for (const l of LOCALES) {
        expect(wordsOf(g, l), `${l} words`).toBeGreaterThanOrEqual(300);
        expect(g.title[l].length, `${l} title`).toBeLessThanOrEqual(110);
        expect(g.description[l].length, `${l} description`).toBeGreaterThanOrEqual(60);
        expect(g.description[l].length, `${l} description`).toBeLessThanOrEqual(320);
        expect(g.sections.length).toBeGreaterThanOrEqual(2);
        expect(g.templates.length).toBeGreaterThanOrEqual(1);
        expect(g.faq.length).toBeGreaterThanOrEqual(2);
      }
      if (g.updated) expect(isIsoDay(g.updated)).toBe(true);
    });
  }

  it("the six guides the audit found thin now teach with a before → after example", () => {
    for (const slug of ["prompt-checklist", "json-output", "code-prompts-that-work", "marketing-prompts-without-hype", "chain-of-thought", "summarization-prompts"]) {
      const g = guides.find((x) => x.slug === slug)!;
      const text = g.sections.map((s) => `${s.heading.en} ${s.bullets.en.join(" ")}`).join(" ");
      expect(text, slug).toMatch(/Before:/);
      expect(text, slug).toMatch(/After:/);
      expect(g.updated, slug).toBe("2026-11-09");
    }
  });
});

describe("model pages", () => {
  it("there is one page for every AI family Promptea supports", () => {
    expect(modelPages.map((m) => m.slug).sort()).toEqual([...TARGETS].sort());
  });

  for (const m of modelPages) {
    it(`${m.slug}: bilingual, with templates and a FAQ`, () => {
      for (const l of LOCALES) {
        expect(m.title[l].length).toBeLessThanOrEqual(110);
        expect(m.description[l].length).toBeGreaterThanOrEqual(60);
        expect(m.description[l].length).toBeLessThanOrEqual(320);
        expect(m.bullets[l].length).toBeGreaterThanOrEqual(3);
        expect(m.faq.length).toBeGreaterThanOrEqual(1);
      }
      expect(m.bullets.es.length).toBe(m.bullets.en.length);
      expect(m.templates.length).toBeGreaterThanOrEqual(1);
      expect(currentModels(m.slug).length, "registry models listed on the page").toBeGreaterThan(0);
    });
  }

  describe("perplexity", () => {
    const p = modelPages.find((m) => m.slug === "perplexity")!;

    it("exists and its presets are exactly the ones the registry lists (nothing invented)", () => {
      expect(p).toBeDefined();
      const presets = MODEL_REGISTRY.filter((m) => m.target === "perplexity" && m.selectable).map((m) => m.apiModelId);
      expect([...presets].sort()).toEqual(["fast", "high", "low", "medium", "xhigh"]);
      const text = JSON.stringify(p);
      for (const preset of presets) expect(text, String(preset)).toContain(String(preset));
    });

    it("renders the registry's models with their verification date in its markdown twin", () => {
      const md = modelMarkdown(p, "en", absUrl("/en/models/perplexity"), "2026-11-09");
      expect(md).toContain("Perplexity Agent · low");
      expect(md).toMatch(/Verified: \d{4}-\d{2}-\d{2}/);
      expect(md).toContain("docs.perplexity.ai");
    });
  });
});

describe("landings", () => {
  it("every landing explains how it works in at least three paragraphs and mentions every supported family where it lists them", () => {
    for (const l of landings) {
      for (const lang of LOCALES) {
        expect(l.intro[lang].length, `${l.slug} ${lang}`).toBeGreaterThanOrEqual(3);
        expect(l.bullets[lang].length).toBeGreaterThanOrEqual(3);
      }
    }
    const optimizer = landings.find((l) => l.slug === "ai-prompt-optimizer")!;
    expect(optimizer.description.en).toMatch(/Perplexity/);
  });
});
