// lib/__tests__/seo.analyzer.test.ts
//
// v1.8.6 — the copy around the prompt analyzer (lib/seo/content/analyzerContent.ts):
// the before → after scores printed on /landing/prompt-analyzer are the engine's
// own, the FAQPage claims match the visible FAQ, and the guide links point at a
// real guide.
import { describe, expect, it } from "vitest";
import { analyzePrompt } from "@/lib/engine";
import { ANALYZER_EXAMPLES, ANALYZER_PAGE_FAQ, GUIDE_ANALYZER_CTA, analyzerLandingFaq } from "@/lib/seo/content/analyzerContent";
import { getLanding } from "@/lib/seo/content/landings";
import { getGuide } from "@/lib/seo/content/guides";
import { landingMarkdown } from "@/lib/seo/markdown";
import { registryPageGraph } from "@/lib/seo/pageGraphs";
import { TARGETS } from "@/lib/domain";
import { TARGET_SHORT } from "@/lib/seo/facts";
import { LOCALES } from "@/lib/seo/site";

describe("analyzer examples", () => {
  for (const ex of ANALYZER_EXAMPLES) {
    for (const lang of LOCALES) {
      it(`${ex.id} (${lang}): the printed scores are what the analyzer returns`, () => {
        expect(analyzePrompt(ex.before[lang], ex.target, lang, ex.purpose).score).toBe(ex.score[lang].before);
        expect(analyzePrompt(ex.after[lang], ex.target, lang, ex.purpose).score).toBe(ex.score[lang].after);
        expect(ex.score[lang].after).toBeGreaterThan(ex.score[lang].before);
      });
    }
  }

  it("the English landing description quotes the English scores", () => {
    const page = getLanding("prompt-analyzer")!;
    for (const ex of ANALYZER_EXAMPLES.slice(0, 2)) {
      expect(page.description.en).toContain(`${ex.score.en.before} → ${ex.score.en.after}`);
    }
  });
});

describe("prompt-analyzer landing", () => {
  const page = getLanding("prompt-analyzer")!;

  it("carries the examples and a FAQ that names every supported family", () => {
    expect(page.examples).toBe(ANALYZER_EXAMPLES);
    const faq = page.faq!;
    expect(faq.length).toBeGreaterThanOrEqual(5);
    const families = faq.find((f) => /models/.test(f.q.en))!;
    for (const t of TARGETS) expect(families.a.en).toContain(TARGET_SHORT[t]);
  });

  it("emits a FAQPage only with the questions the page prints", () => {
    for (const lang of LOCALES) {
      const faq = page.faq!.map((x) => ({ q: x.q[lang], a: x.a[lang] }));
      const ld = JSON.stringify(registryPageGraph(lang, `/${lang}/landing/prompt-analyzer`, { aboutSoftware: true, faq }));
      expect(ld).toContain('"FAQPage"');
      for (const f of faq) expect(ld).toContain(JSON.stringify(f.q).slice(1, -1));
    }
    expect(JSON.stringify(registryPageGraph("en", "/en/landing/prompt-scoring", { aboutSoftware: true }))).not.toContain("FAQPage");
  });

  it("its markdown twin has the examples; the llms-full form links them", () => {
    const full = landingMarkdown(page, "en", "https://example.test/en/landing/prompt-analyzer", "2026-11-14");
    expect(full).toContain(ANALYZER_EXAMPLES[1].after.en.split("\n")[0]);
    expect(full).toContain("score 19/100");
    const compact = landingMarkdown(page, "en", "https://example.test/en/landing/prompt-analyzer", "2026-11-14", { compact: true });
    expect(compact).not.toContain(ANALYZER_EXAMPLES[1].after.en.split("\n")[0]);
    expect(compact).toContain("https://example.test/en/landing/prompt-analyzer.md");
  });
});

describe("analyzer page FAQ and guide links", () => {
  it("the analyzer page FAQ differs from the landing FAQ (no duplicate questions)", () => {
    const landingQs = new Set(analyzerLandingFaq("x").map((f) => f.q.en));
    for (const f of ANALYZER_PAGE_FAQ) expect(landingQs.has(f.q.en)).toBe(false);
  });

  it("every guide with an analyzer link exists and has the sentence in every language", () => {
    for (const [slug, text] of Object.entries(GUIDE_ANALYZER_CTA)) {
      expect(getGuide(slug), slug).toBeDefined();
      for (const lang of LOCALES) expect(text[lang].trim().length, `${slug} ${lang}`).toBeGreaterThan(20);
    }
  });
});
