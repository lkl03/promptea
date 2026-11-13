import { LANG_NAME, contentLangFor } from "@/lib/domain";
import { describe, expect, it } from "vitest";

import { makeArticle, makeEdition, makeSnapshot } from "./seo.fixtures";
import { LLMS_FULL_ARTICLES_BYTES, LLMS_FULL_MAX_ARTICLES, LLMS_MAX_ARTICLES, LLMS_MAX_EDITIONS, buildLlmsFullTxt, buildLlmsTxt, demote, type LlmsInput } from "@/lib/seo/llms";
import {
  MARKDOWN_CONTENT_TYPE,
  articleMarkdown,
  benchmarksMarkdown,
  docMarkdown,
  glossaryMarkdown,
  guideMarkdown,
  landingMarkdown,
  modelMarkdown,
} from "@/lib/seo/markdown";
import { aboutDoc, homeAboutDoc, howItWorksDoc, methodologyDoc } from "@/lib/seo/content/sitePages";
import { guideLang, guides } from "@/lib/seo/content/guides";
import { glossary } from "@/lib/seo/content/glossary";
import { modelPages } from "@/lib/seo/content/models";
import { landings } from "@/lib/seo/content/landings";
import { staticSeoUrls, withoutEmptySectionIndexes } from "@/lib/seo/registry";
import { LOCALES, absUrl, type Locale } from "@/lib/seo/site";

const empty = (lang: Locale): LlmsInput => ({ lang, articles: [], editions: [], benchmarks: null });

/** "null/undefined" is real prose in the code guides (plain or URL-encoded inside prefilled links). */
const withoutKnownProse = (s: string) => s.replace(/null(\/|%2F)undefined/g, "");

const links = (md: string) => [...md.matchAll(/\]\((https?:\/\/[^)\s]+)\)/g)].map((m) => m[1]);

describe("llms.txt", () => {
  for (const lang of LOCALES) {
    describe(lang, () => {
      const txt = buildLlmsTxt(empty(lang));

      it("follows the llms.txt shape: H1, blockquote summary, H2 sections of links", () => {
        const lines = txt.split("\n");
        expect(lines[0]).toBe("# Promptea");
        expect(lines.find((l) => l.startsWith(">"))).toMatch(/Promptea/);
        expect(txt).toMatch(/^## /m);
        expect(txt.endsWith("\n")).toBe(true);
      });

      it("has the expected sections", () => {
        for (const h of ["## Optional"]) expect(txt).toContain(h);
        const h = {
          es: ["## Herramientas", "## Guías de prompting", "## Glosario", "## Prompts por modelo", "### Cómo citar"],
          en: ["## Tools", "## Prompting guides", "## Glossary", "## Prompts by model", "### How to cite"],
          pt: ["## Ferramentas", "## Guias de prompting", "## Glossário", "## Prompts por modelo", "### Como citar"],
        }[lang];
        for (const heading of h) expect(txt).toContain(heading);
      });

      it("links every page of the registry exactly once (markdown twin when there is one)", () => {
        const all = links(txt);
        // v1.8.4: with no stories, the empty Tech index is the one registry page left out.
        for (const u of withoutEmptySectionIndexes(staticSeoUrls(lang), lang, [])) {
          const target = absUrl(u.markdown ? `${u.path}.md` : u.path);
          expect(all.filter((x) => x === target), target).toHaveLength(1);
        }
      });

      it("leaves out the Tech index while it has no stories (v1.8.4)", () => {
        expect(links(txt)).not.toContain(absUrl(`/${lang}/blog/tech`));
      });

      it("only contains absolute links, with no placeholders", () => {
        expect(txt).not.toMatch(/\]\((?!https?:\/\/)/);
        expect(txt).not.toMatch(/undefined|\[object Object\]|NaN/);
        for (const l of links(txt)) expect(() => new URL(l)).not.toThrow();
      });

      it("points at llms-full.txt, sitemap.xml and robots.txt", () => {
        expect(txt).toContain(absUrl(`/${lang}/llms-full.txt`));
        expect(txt).toContain(absUrl("/sitemap.xml"));
        expect(txt).toContain(absUrl("/robots.txt"));
      });
    });
  }

  it("says honestly when there is no benchmark snapshot, and summarises one when there is", () => {
    expect(buildLlmsTxt(empty("en"))).toMatch(/No benchmark snapshot was available/);
    const withBench = buildLlmsTxt({ ...empty("en"), benchmarks: makeSnapshot() });
    expect(withBench).not.toMatch(/No benchmark snapshot/);
    expect(withBench).toMatch(/Alpha 1/);
  });

  it("lists AI Daily stories newest first, capped, grouped by edition with a generic heading for an unknown one", () => {
    const many = Array.from({ length: LLMS_MAX_ARTICLES + 10 }, (_, i) =>
      makeArticle({ slug: `a-${String(i).padStart(2, "0")}`, eventDate: `2026-10-${String((i % 28) + 1).padStart(2, "0")}` }),
    );
    const tech = makeArticle({ slug: "tech-one", eventDate: "2026-11-01", edition: "tech" as never });
    const txt = buildLlmsTxt({ ...empty("en"), articles: [...many, tech] });
    // "/blog/tech" is the index of the Tech section (v1.8.3), not an article.
    const articleLinks = links(txt).filter((l) => l.includes("/blog/") && !l.includes("/blog/weekly") && !l.endsWith("/blog/tech") && !l.endsWith("feed.xml"));
    expect(articleLinks.length).toBeLessThanOrEqual(LLMS_MAX_ARTICLES);
    expect(txt).toContain("/blog/tech-one"); // listed under whatever heading, without a code change
  });

  it("caps weekly editions and lists them with their Monday", () => {
    const eds = Array.from({ length: LLMS_MAX_EDITIONS + 4 }, (_, i) => makeEdition(`2026-${i < 6 ? "09" : "10"}-${String(1 + ((i * 7) % 28)).padStart(2, "0")}`));
    const txt = buildLlmsTxt({ ...empty("en"), editions: eds });
    expect(links(txt).filter((l) => /\/blog\/weekly\/\d{4}-\d{2}-\d{2}$/.test(l)).length).toBeLessThanOrEqual(LLMS_MAX_EDITIONS);
  });
});

describe("llms-full.txt", () => {
  for (const lang of LOCALES) {
    it(`${lang}: contains the title of every guide, glossary term, model page and landing`, () => {
      const txt = buildLlmsFullTxt(empty(lang));
      // a guide not translated to this locale yet is not part of its full text (guideLang())
      for (const g of guides) if (guideLang(g, lang) === lang) expect(txt, g.slug).toContain(g.title[lang]);
      for (const g of glossary) expect(txt, g.slug).toContain(g.title[lang]);
      for (const m of modelPages) expect(txt, m.slug).toContain(m.title[lang]);
      for (const p of landings) expect(txt, p.slug).toContain(p.h1[lang]);
      // "null/undefined" is legitimate prose in the code guides; a bare "undefined" is a template bug.
      expect(withoutKnownProse(txt)).not.toMatch(/undefined|\[object Object\]/);
    });
  }

  it("includes at most LLMS_FULL_MAX_ARTICLES stories, the most recently updated ones", () => {
    const arts = Array.from({ length: LLMS_FULL_MAX_ARTICLES + 5 }, (_, i) =>
      makeArticle({ slug: `story-${String(i).padStart(2, "0")}`, eventDate: `2026-10-${String(i + 1).padStart(2, "0")}`, title: `Unique story title number ${String(i).padStart(2, "0")}` }),
    );
    const txt = buildLlmsFullTxt({ ...empty("en"), articles: arts });
    const included = arts.filter((a) => txt.includes(a.title));
    expect(included).toHaveLength(LLMS_FULL_MAX_ARTICLES);
    expect(txt).toContain(arts[arts.length - 1].title);
    expect(txt).not.toContain(arts[0].title);
  });

  it("stays within the size budget: static part under 330 KB, AI Daily under its own budget", () => {
    for (const lang of LOCALES) {
      const base = buildLlmsFullTxt(empty(lang));
      expect(Buffer.byteLength(base) / 1024, `${lang} static part`).toBeLessThan(330);

      const big = Array.from({ length: 12 }, (_, i) =>
        makeArticle({
          slug: `big-${i}`,
          eventDate: `2026-10-${String(10 + i)}`,
          lang: contentLangFor(lang),
          title: `Big story number ${i} headline`,
          body: Array.from({ length: 40 }, (_, k) => ({ type: "paragraph", text: `Paragraph ${k}. ` + "Lorem ipsum dolor sit amet. ".repeat(25) })) as never,
        }),
      );
      const full = buildLlmsFullTxt({ ...empty(lang), articles: big });
      const included = big.filter((a) => full.includes(a.title)).length;
      expect(included).toBeGreaterThan(0);
      expect(included).toBeLessThan(big.length);
      // the AI Daily part never exceeds its budget, however many stories exist
      expect(Buffer.byteLength(full) - Buffer.byteLength(base)).toBeLessThanOrEqual(LLMS_FULL_ARTICLES_BYTES + 2048);
    }
  });

  it("is compact: guides list template titles and point at the twin; no prompt is repeated inside a prefilled link", () => {
    const txt = buildLlmsFullTxt(empty("en"));
    const g = guides.find((x) => x.templates.length > 0)!;
    expect(txt).toContain(g.templates[0].title.en);
    expect(txt).toContain(`The prompts themselves: ${absUrl(`/en/guides/${g.slug}`)}.md`);
    const promptLines = g.templates[0].prompt.en.trim().split("\n");
    expect(txt).not.toContain(`${promptLines[0]}\n${promptLines[1]}`);
    expect(txt).not.toMatch(/\]\(https?:\/\/[^)]*\/analyzer\?/);
    // the page's own twin keeps the full prompt and the prefilled link
    const twin = guideMarkdown(g, "en", absUrl(`/en/guides/${g.slug}`), "2026-11-09");
    expect(twin).toContain(promptLines[0]);
    expect(twin).toMatch(/\]\(https?:\/\/[^)]*\/analyzer\?/);
  });

  it("embeds the benchmark snapshot only when it exists", () => {
    expect(buildLlmsFullTxt({ ...empty("en"), benchmarks: makeSnapshot() })).toMatch(/Alpha 1/);
    expect(buildLlmsFullTxt(empty("en"))).not.toMatch(/Alpha 1/);
  });

  it("has a single top-level heading per section and starts with the product summary", () => {
    const txt = buildLlmsFullTxt(empty("en"));
    expect(txt.startsWith("# Promptea — full text")).toBe(true);
    expect(txt.match(/^# (?!#)/gm)!.length).toBeLessThan(15); // sections, not one H1 per document
  });
});

describe("demote", () => {
  it("pushes headings down one level but leaves fenced code alone", () => {
    const md = ["# A", "text", "```", "# not a heading", "```", "## B"].join("\n");
    expect(demote(md).split("\n")).toEqual(["## A", "text", "```", "# not a heading", "```", "### B"]);
  });

  it("never exceeds h6 and keeps longer fences open until their own close", () => {
    const md = ["###### Deep", "````", "```", "# inside", "```", "````", "# After"].join("\n");
    expect(demote(md).split("\n")).toEqual(["###### Deep", "````", "```", "# inside", "```", "````", "## After"]);
  });
});

describe("markdown twins", () => {
  it("declare their media type", () => {
    expect(MARKDOWN_CONTENT_TYPE).toMatch(/^text\/markdown/);
  });

  for (const lang of LOCALES) {
    it(`${lang}: guides, glossary, models and landings carry title, source URL, language and no HTML`, () => {
      const url = absUrl(`/${lang}/x`);
      const docs = [
        guideMarkdown(guides[0], lang, url, "2026-11-08"),
        glossaryMarkdown(glossary[0], lang, url, "2026-11-08"),
        modelMarkdown(modelPages[0], lang, url, "2026-11-08"),
        landingMarkdown(landings[0], lang, url, "2026-11-08"),
        docMarkdown(aboutDoc(lang), lang, url),
        docMarkdown(methodologyDoc(lang), lang, url),
        docMarkdown(homeAboutDoc(lang), lang, url, { title: "Promptea" }),
        docMarkdown(howItWorksDoc(lang), lang, url),
      ];
      for (const md of docs) {
        expect(md.startsWith("# ")).toBe(true);
        expect(md).toContain(url);
        expect(md).toContain(LANG_NAME[lang]);
        expect(md).not.toMatch(/<\/?(div|span|p|ul|li|script|style)\b/i);
        expect(withoutKnownProse(md)).not.toMatch(/undefined|\[object Object\]/);
        for (const l of links(md)) expect(() => new URL(l)).not.toThrow();
      }
    });
  }

  it("a guide twin contains its steps' text and its FAQ", () => {
    const g = guides.find((x) => x.faq.length > 0)!;
    const md = guideMarkdown(g, "en", absUrl("/en/guides/x"), "2026-11-08");
    expect(md).toContain(g.faq[0].q.en);
    expect(md).toContain(g.faq[0].a.en);
  });

  it("the how-it-works twin renders the how-to steps with their names and the FAQ", () => {
    const doc = howItWorksDoc("en");
    const md = docMarkdown(doc, "en", absUrl("/en/how-it-works"));
    expect(md).toMatch(/1\. \*\*Paste your prompt\.\*\*/);
    expect(md).toContain(doc.faq[0].q);
  });

  it("the home twin is short and points at how-it-works (v1.8.1)", () => {
    const md = docMarkdown(homeAboutDoc("en"), "en", absUrl("/en"), { title: "Promptea" });
    expect(md).toContain("/en/how-it-works");
    expect(md).not.toMatch(/Frequently asked questions/);
  });

  it("article twin: summary, sources with the primary marked, date and correction", () => {
    const a = makeArticle({ slug: "x", eventDate: "2026-11-05" });
    const md = articleMarkdown({ ...a, correction: { note: "Fixed a number.", correctedAt: "2026-11-06T00:00:00.000Z" } as never }, absUrl("/en/blog/x"), "2026-11-06T00:00:00.000Z");
    expect(md).toContain("Summary of x.");
    expect(md).toContain("[Primary](https://example.com/x)");
    expect(md).toContain("primary source");
    expect(md).toContain("Last updated: 2026-11-06");
    expect(md).toContain("Correction");
  });

  it("benchmarks twin states source and date of the snapshot", () => {
    const md = benchmarksMarkdown(makeSnapshot(), "en", absUrl("/en/benchmarks"), "2026-11-08");
    expect(md).toMatch(/2026-11-03/);
    expect(md).toContain("Alpha 1");
  });

  it("a prompt containing backticks cannot break out of its code fence", () => {
    const g = { ...guides[0], templates: [{ title: { en: "T", es: "T" }, prompt: { en: "```\n# injected heading\n```", es: "x" } }] } as never;
    const md = guideMarkdown(g, "en", absUrl("/en/guides/x"), "2026-11-08");
    expect(md).toMatch(/````text\n```\n# injected heading\n```\n````/);
  });
});
