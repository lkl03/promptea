// The JSON-LD graph: stable @ids, every reference resolved, dates real, and the
// markup limited to what the page says — plus the validator that enforces it
// (scripts/seo/ld.mjs, the same code scripts/seo-check.mjs runs on the live site).

import { describe, expect, it } from "vitest";

import { makeArticle, makeEdition, makeSnapshot } from "./seo.fixtures";
import { editorialNode, entityIds, graph, pageId, serializeLd, siteGraph, webPageNode } from "@/lib/seo/jsonld";
import { benchmarksGraph, docPageGraph, glossaryGraph, guideGraph, homeGraph, modelGraph, registryPageGraph, weeklyEditionGraph } from "@/lib/seo/pageGraphs";
import { blogIndexJsonLd, newsArticleNode, blogBreadcrumbNode, truncateHeadline } from "@/lib/blog/jsonld";
import { aboutDoc, homeAboutDoc, howItWorksDoc, methodologyDoc } from "@/lib/seo/content/sitePages";
import { guides } from "@/lib/seo/content/guides";
import { glossary } from "@/lib/seo/content/glossary";
import { modelPages } from "@/lib/seo/content/models";
import { docMarkdown, glossaryMarkdown, guideMarkdown, modelMarkdown, benchmarksMarkdown } from "@/lib/seo/markdown";
import { LOCALES, absUrl, type Locale } from "@/lib/seo/site";
import { validateLd, isIsoDate, squash } from "../../scripts/seo/ld.mjs";
import { decodeEntities, headings, ldBlocks, parseHead, visibleText } from "../../scripts/seo/html.mjs";

const SITE = "https://promptea.me";

const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;");

/** A page as a crawler sees it: an h1, the visible text, the site graph and the page graph. */
function page(lang: Locale, h1: string, visible: string, ...graphs: object[]) {
  const ld = [siteGraph(lang, "Promptea site description"), ...graphs].map((g) => `<script type="application/ld+json">${serializeLd(g)}</script>`).join("");
  return `<!doctype html><html><head><title>${h1}</title>${ld}</head><body><h1>${h1}</h1><main>${esc(visible)}</main></body></html>`;
}

const errs = (html: string, url: string, expect_?: string[]) => validateLd(html, { url, expect: expect_ }).errors;

describe("site graph", () => {
  it("has stable, origin-based @ids and connects everything to them", () => {
    const g = siteGraph("en", "desc", SITE) as { "@graph": Array<Record<string, unknown>> };
    const ids = entityIds(SITE);
    const byType = (t: string) => g["@graph"].filter((n) => n["@type"] === t);
    expect(ids.organization).toBe(`${SITE}/#organization`);
    expect(ids.website).toBe(`${SITE}/#website`);
    expect(ids.software).toBe(`${SITE}/#software`);
    expect(byType("Organization").map((n) => n["@id"])).toContain(ids.organization);
    expect(byType("WebSite")[0]["@id"]).toBe(ids.website);
    expect(byType("SoftwareApplication")[0]["@id"]).toBe(ids.software);
    expect(byType("ImageObject")[0]["@id"]).toBe(ids.logo);
    // the document passes the validator on its own: every reference resolves
    const html = `<html><body><h1>x</h1><script type="application/ld+json">${serializeLd(g)}</script></body></html>`;
    expect(errs(html, SITE)).toEqual([]);
  });

  it("is deterministic: same input, same output", () => {
    expect(JSON.stringify(siteGraph("es", "d", SITE))).toBe(JSON.stringify(siteGraph("es", "d", SITE)));
  });

  it("never claims a rating or a price other than free", () => {
    const s = JSON.stringify(siteGraph("en", "d", SITE));
    expect(s).not.toMatch(/aggregateRating|reviewRating|ratingValue|"review"/);
    expect(s).toMatch(/"price":"0"/);
  });

  it("pageId builds #fragment ids on the page URL", () => {
    expect(pageId("https://x.test/en/a", "faq")).toBe("https://x.test/en/a#faq");
  });
});

describe("page graphs resolve against the site graph and match their visible content", () => {
  for (const lang of LOCALES) {
    it(`${lang}: every guide`, () => {
      for (const g of guides) {
        const path = `/${lang}/guides/${g.slug}`;
        const md = guideMarkdown(g, lang, absUrl(path), "2026-11-08");
        const html = page(lang, g.title[lang], md, guideGraph(g, lang, "2026-11-08"));
        expect(errs(html, absUrl(path), ["Article", "BreadcrumbList", "WebPage"]), g.slug).toEqual([]);
      }
    });

    it(`${lang}: every glossary term`, () => {
      for (const t of glossary) {
        const path = `/${lang}/glossary/${t.slug}`;
        const md = glossaryMarkdown(t, lang, absUrl(path), "2026-11-08");
        const html = page(lang, t.title[lang], md, glossaryGraph(t, lang, "2026-11-08"));
        expect(errs(html, absUrl(path), ["DefinedTerm"]), t.slug).toEqual([]);
      }
    });

    it(`${lang}: every model page`, () => {
      for (const m of modelPages) {
        const path = `/${lang}/models/${m.slug}`;
        const md = modelMarkdown(m, lang, absUrl(path), "2026-11-08");
        const html = page(lang, m.title[lang], md, modelGraph(m, lang, "2026-11-08"));
        expect(errs(html, absUrl(path)), m.slug).toEqual([]);
      }
    });

    it(`${lang}: home (WebPage only), how-it-works (HowTo + FAQ), about and methodology`, () => {
      // v1.8.1: the home page is short; its graph must not describe text it no longer prints.
      const home = homeAboutDoc(lang);
      const homeLd = homeGraph(home, lang) as { "@graph": Array<{ "@type": string | string[] }> };
      const homeTypes = homeLd["@graph"].flatMap((n) => n["@type"]);
      expect(homeTypes).toContain("WebPage");
      expect(homeTypes).not.toContain("FAQPage");
      expect(homeTypes).not.toContain("HowTo");
      const homeHtml = page(lang, home.h1, docMarkdown(home, lang, absUrl(`/${lang}`)), homeGraph(home, lang));
      expect(errs(homeHtml, absUrl(`/${lang}`))).toEqual([]);

      // The HowTo and the FAQ live with their visible text on /how-it-works.
      const how = howItWorksDoc(lang);
      const howPath = `/${lang}/how-it-works`;
      const howHtml = page(lang, how.h1, docMarkdown(how, lang, absUrl(howPath)), docPageGraph({ doc: how, lang, path: howPath, kind: "how-it-works", label: how.h1 }));
      expect(errs(howHtml, absUrl(howPath), ["HowTo", "FAQPage"])).toEqual([]);

      for (const [kind, doc] of [["about", aboutDoc(lang)], ["methodology", methodologyDoc(lang)]] as const) {
        const path = `/${lang}/${kind}`;
        const html = page(lang, doc.h1, docMarkdown(doc, lang, absUrl(path)), docPageGraph({ doc, lang, path, kind, label: doc.h1 }));
        expect(errs(html, absUrl(path), ["FAQPage"]), kind).toEqual([]);
      }
    });

    it(`${lang}: registry pages (tools, hubs, landings, legal) have a graph; unknown paths do not`, () => {
      for (const p of ["analyzer", "best-ai", "guides", "models", "glossary", "prompts", "privacy", "changelog", "blog/weekly"]) {
        const path = `/${lang}/${p}`;
        const g = registryPageGraph(lang, path, { collection: ["guides", "models", "glossary", "prompts", "blog/weekly"].includes(p) });
        expect(g, p).not.toBeNull();
        const title = (g as { "@graph": Array<{ name?: string }> })["@graph"][0].name!;
        expect(errs(page(lang, title, "", g!), absUrl(path)), p).toEqual([]);
      }
      expect(registryPageGraph(lang, `/${lang}/does-not-exist`)).toBeNull();
    });
  }
});

describe("data-backed graphs", () => {
  it("benchmarks: a Dataset only when a snapshot is shown, dated by its asOf, naming its source", () => {
    const without = benchmarksGraph({ lang: "en", title: "AI model benchmarks", description: "d", snapshot: null }) as { "@graph": Array<Record<string, unknown>> };
    expect(without["@graph"].map((n) => n["@type"])).not.toContain("Dataset");

    const snap = makeSnapshot();
    const withSnap = benchmarksGraph({ lang: "en", title: "AI model benchmarks", description: "d", snapshot: snap }) as { "@graph": Array<Record<string, unknown>> };
    const ds = withSnap["@graph"].find((n) => n["@type"] === "Dataset")!;
    expect(ds["@id"]).toBe(`${absUrl("/en/benchmarks")}#dataset`);
    expect(ds.dateModified).toBe(snap.asOf);
    expect((ds.isBasedOn as { url: string }).url).toMatch(/^https?:\/\//);
    expect((ds.variableMeasured as unknown[]).length).toBe(snap.tables.length);

    const md = benchmarksMarkdown(snap, "en", absUrl("/en/benchmarks"), "2026-11-08");
    expect(errs(page("en", "AI model benchmarks", md, withSnap), absUrl("/en/benchmarks"), ["Dataset", "CollectionPage"])).toEqual([]);
  });

  it("AI Daily article: NewsArticle with real dates, references to the graph, headline within 110 chars", () => {
    const a = makeArticle({ slug: "story", eventDate: "2026-11-05", title: "A".repeat(40) + " " + "long headline ".repeat(12), updatedAt: "2026-11-06T08:00:00.000Z" });
    const url = absUrl("/en/blog/story");
    const news = newsArticleNode(a, { url, siteUrl: absUrl("/").replace(/\/$/, ""), imageUrl: `${url}/opengraph-image` }) as Record<string, unknown>;
    expect(news["@type"]).toBe("NewsArticle");
    expect(news.datePublished).toBe("2026-11-05T11:00:00.000Z");
    expect(news.dateModified).toBe("2026-11-06T08:00:00.000Z");
    expect((news.headline as string).length).toBeLessThanOrEqual(110);
    expect(news.author).toEqual({ "@id": entityIds().editorial });
    expect(news.publisher).toEqual({ "@id": entityIds().organization });

    const g = graph(
      webPageNode({ lang: "en", url, name: a.title, description: a.metaDescription, datePublished: a.publishedAt!, dateModified: a.updatedAt!, hasBreadcrumb: true }),
      news,
      editorialNode(),
      blogBreadcrumbNode({ lang: "en", title: a.title, slug: a.slug }),
    );
    expect(errs(page("en", a.title, "", g), url, ["NewsArticle", "BreadcrumbList"])).toEqual([]);
  });

  it("AI Daily index: the Blog has its own @id, distinct from the page", () => {
    const ld = blogIndexJsonLd({ lang: "en", title: "AI Daily", description: "One story a day.", items: [{ title: "T", slug: "t", publishedAt: "2026-11-05T11:00:00.000Z", eventDate: "2026-11-05" }] }) as { "@graph": Array<Record<string, unknown>> };
    const url = absUrl("/en/blog");
    const types = Object.fromEntries(ld["@graph"].map((n) => [n["@type"] as string, n["@id"]]));
    expect(types.CollectionPage).toBe(`${url}#webpage`);
    expect(types.Blog).toBe(`${url}#blog`);
    expect(types.Blog).not.toBe(types.CollectionPage);
    expect(errs(page("en", "AI Daily", "", ld), url, ["Blog", "CollectionPage"])).toEqual([]);
  });

  it("weekly edition: Article + breadcrumb with the edition's own dates", () => {
    const e = makeEdition("2026-11-02");
    const url = absUrl("/en/blog/weekly/2026-11-02");
    const g = weeklyEditionGraph(e, "en") as { "@graph": Array<Record<string, unknown>> };
    const art = g["@graph"].find((n) => n["@type"] === "Article")!;
    expect(art.datePublished).toBe("2026-11-09T09:30:00.000Z");
    expect(art.dateModified).toBe("2026-11-09T10:00:00.000Z");
    expect(errs(page("en", e.locales.en.heroHeadline, `${e.locales.en.preheader}`, g), url, ["Article", "BreadcrumbList"])).toEqual([]);
  });

  it("truncateHeadline never exceeds the limit and cuts on a word", () => {
    const t = truncateHeadline("word ".repeat(60), 110);
    expect(t.length).toBeLessThanOrEqual(110);
    expect(t.endsWith("…")).toBe(true);
    expect(truncateHeadline("short")).toBe("short");
  });
});

describe("the validator fails when the contract is broken", () => {
  const url = absUrl("/en/x");
  const wp = (extra: object = {}) => ({ "@type": "WebPage", "@id": `${url}#webpage`, url, name: "X", ...extra });
  const doc = (nodes: object[], h1 = "X", visible = "") =>
    `<html><body><h1>${h1}</h1><p>${visible}</p><script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@graph": nodes })}</script></body></html>`;

  it("passes a clean page", () => {
    expect(errs(doc([wp()]), url)).toEqual([]);
  });

  it("flags no JSON-LD, invalid JSON and a missing @context", () => {
    expect(errs("<html><h1>x</h1></html>", url).join()).toMatch(/no JSON-LD/);
    expect(errs(`<html><script type="application/ld+json">{nope</script></html>`, url).join()).toMatch(/not valid JSON/);
    expect(errs(`<html><script type="application/ld+json">{"@type":"WebPage"}</script></html>`, url).join()).toMatch(/@context/);
  });

  it("flags a reference to an @id that does not exist", () => {
    expect(errs(doc([wp({ isPartOf: { "@id": `${SITE}/#nowhere` } })]), url).join()).toMatch(/does not exist/);
  });

  it("flags one @id described two ways", () => {
    const e = errs(doc([wp(), { "@type": "CollectionPage", "@id": `${url}#webpage`, url, name: "X" }]), url).join();
    expect(e).toMatch(/described twice|two top-level/);
  });

  it("flags impossible, future and out-of-order dates", () => {
    expect(errs(doc([wp({ dateModified: "2026-02-30" })]), url).join()).toMatch(/not a real ISO date/);
    expect(errs(doc([wp({ dateModified: "2999-01-01" })]), url).join()).toMatch(/future/);
    expect(errs(doc([wp({ datePublished: "2026-05-02", dateModified: "2026-05-01" })]), url).join()).toMatch(/precedes/);
    expect(isIsoDate("2026-11-09")).toBe(true);
    expect(isIsoDate("yesterday")).toBe(false);
  });

  it("flags invented ratings and reviews", () => {
    expect(errs(doc([wp({ aggregateRating: { ratingValue: 5 } })]), url).join()).toMatch(/invented signal/);
  });

  it("flags a FAQ whose question or answer is not on the page", () => {
    const faq = { "@type": "FAQPage", "@id": `${url}#faq`, mainEntity: [{ "@type": "Question", name: "Is it free?", acceptedAnswer: { "@type": "Answer", text: "Yes, completely free." } }] };
    expect(errs(doc([wp(), faq]), url).join()).toMatch(/question not visible/);
    expect(errs(doc([wp(), faq], "X", "Is it free? Yes, completely free."), url)).toEqual([]);
    expect(errs(doc([wp(), faq], "X", "Is it free? Sometimes."), url).join()).toMatch(/answer not visible/);
  });

  it("flags a HowTo whose steps are not on the page", () => {
    const howto = { "@type": "HowTo", "@id": `${url}#howto`, name: "H", step: [{ "@type": "HowToStep", position: 1, name: "Do it", text: "Do the thing" }] };
    expect(errs(doc([wp(), howto]), url).join()).toMatch(/step name not visible/);
    expect(errs(doc([wp(), howto], "X", "Do it. Do the thing"), url)).toEqual([]);
  });

  it("flags a breadcrumb that does not end at this page, a wrong canonical and a foreign @id namespace", () => {
    const crumb = (item: string) => ({ "@type": "BreadcrumbList", "@id": `${url}#breadcrumb`, itemListElement: [{ "@type": "ListItem", position: 1, name: "X", item }] });
    expect(errs(doc([wp(), crumb(absUrl("/en/other"))]), url).join()).toMatch(/last item/);
    expect(errs(doc([wp({ url: absUrl("/en/other") })]), url).join()).toMatch(/canonical/);
    expect(errs(doc([wp({ "@id": `${absUrl("/en/other")}#webpage` })]), url).join()).toMatch(/namespace/);
  });

  it("flags a Dataset that is not backed by what the page shows", () => {
    const ds = { "@type": "Dataset", "@id": `${url}#dataset`, name: "D", variableMeasured: [{ "@type": "PropertyValue", name: "GPQA Diamond (Science)" }], dateModified: "2026-11-03", isBasedOn: { url: "https://openrouter.ai/benchmarks" } };
    expect(errs(doc([wp(), ds]), url).join()).toMatch(/measured variable not visible/);
    expect(errs(doc([wp(), ds], "X", "GPQA Diamond ranking"), url)).toEqual([]);
  });

  it("flags non-absolute URLs", () => {
    expect(errs(doc([wp({ sameAs: ["/relative"] })]), url).join()).toMatch(/not an absolute URL/);
  });

  it("flags an article whose headline is not the page's", () => {
    const art = { "@type": "Article", "@id": `${url}#article`, headline: "Totally different headline here for real", datePublished: "2026-11-01", dateModified: "2026-11-02" };
    expect(errs(doc([wp(), art], "X"), url).join()).toMatch(/headline does not match/);
  });
});

describe("html helpers", () => {
  const html = `<!doctype html><html><head>
    <title>Hi &amp; bye</title>
    <meta name="description" content="Desc &quot;q&quot;"/><meta property="og:title" content="T"/>
    <link rel="canonical" href="https://x.test/en"/>
    <link rel="alternate" hreflang="es" href="https://x.test/es"/><link rel="alternate" hreflang="en" href="https://x.test/en"/>
    <link rel="alternate" type="text/markdown" href="/en.md"/>
    <script type="application/ld+json">{"@context":"https://schema.org"}</script></head>
    <body><h1>Main <span>title</span></h1><script>var x="<h1>no</h1>"</script><p>Some&nbsp;text</p></body></html>`;

  it("parses the head and headings, ignoring script contents", () => {
    const h = parseHead(html);
    expect(h.titles).toEqual(["Hi & bye"]);
    expect(h.h1).toEqual(["main title"]);
    expect(h.canonicals).toEqual(["https://x.test/en"]);
    expect(h.hreflang).toEqual({ es: "https://x.test/es", en: "https://x.test/en" });
    expect(h.markdownAlternate).toBe("/en.md");
    expect(h.first("description")).toBe('Desc "q"');
    expect(h.count("og:title")).toBe(1);
    expect(headings(html, 1)).toHaveLength(1);
  });

  it("extracts JSON-LD blocks and visible text", () => {
    expect(ldBlocks(html)).toHaveLength(1);
    expect(visibleText(html)).toContain("some text");
    expect(visibleText(html)).not.toContain("var x");
    expect(decodeEntities("&#x27;a&#39; &amp; &lt;")).toBe("'a' & <");
    expect(squash("Hello, World — ¿Qué tal?")).toBe("helloworldquétal");
  });
});
