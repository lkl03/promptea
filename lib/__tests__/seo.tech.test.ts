// v1.8.3 — the Tech section and the /sources page in every machine-readable
// surface: the URL registry, sitemap.xml, llms.txt, the markdown twins, the feed
// routes, and the source registry behind /sources.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { makeArticle } from "./seo.fixtures";

vi.mock("server-only", () => ({}));

const db = { articles: vi.fn(), editions: vi.fn(), asOf: vi.fn(), snapshot: vi.fn(), bySlug: vi.fn(), list: vi.fn() };
vi.mock("@/lib/seo/dynamic", () => ({
  loadArticles: (...a: unknown[]) => db.articles(...a),
  loadEditions: (...a: unknown[]) => db.editions(...a),
  loadBenchmarksAsOf: (...a: unknown[]) => db.asOf(...a),
  loadBenchmarksSnapshot: (...a: unknown[]) => db.snapshot(...a),
}));
vi.mock("@/lib/blog/server", () => ({
  getArticleBySlug: (...a: unknown[]) => db.bySlug(...a),
  listAllPublishedArticles: (...a: unknown[]) => db.list(...a),
}));

import sitemap from "@/app/sitemap";
import { GET as aiFeed } from "@/app/[lang]/blog/feed.xml/route";
import { GET as techFeed } from "@/app/[lang]/blog/tech/feed.xml/route";
import { GET as mdGet } from "@/app/md/[lang]/[[...path]]/route";
import { BLOG_SOURCE_TYPES } from "@/lib/domain";
import { EDITORIAL_SOURCES, SOURCES_VERIFIED_AT, SOURCE_FORMATS, SOURCE_TIERS, SOURCE_TOPICS, publishersByTier, sourceCounts, sourcesByTier, sourcesForEdition } from "@/lib/blog/sources";
import { sourcesDoc } from "@/lib/seo/content/sourcesPage";
import { buildLlmsTxt, type LlmsInput } from "@/lib/seo/llms";
import { docMarkdown } from "@/lib/seo/markdown";
import { resolveMarkdown, staticMarkdownPaths } from "@/lib/seo/mdResolve";
import { docPageGraph } from "@/lib/seo/pageGraphs";
import { editionHeading, editionOrder, staticSeoUrls } from "@/lib/seo/registry";
import { LOCALES, absUrl } from "@/lib/seo/site";

type Entry = Awaited<ReturnType<typeof sitemap>>[number];
const langsOf = (e: Entry) => Object.keys((e.alternates?.languages ?? {}) as Record<string, string>).sort();
const empty = (lang: LlmsInput["lang"]): LlmsInput => ({ lang, articles: [], editions: [], benchmarks: null });
const ctx = (lang: string) => ({ params: Promise.resolve({ lang }) });
const req = new Request("http://localhost/x");

const ai = makeArticle({ slug: "an-ai-story", eventDate: "2026-11-08", updatedAt: "2026-11-08T12:00:00.000Z" });
const tech = makeArticle({ slug: "a-tech-story", eventDate: "2026-11-10", edition: "tech-daily", category: "cloud", updatedAt: "2026-11-10T15:00:00.000Z", publishedAt: "2026-11-10T15:00:00.000Z" } as Parameters<typeof makeArticle>[0]);

beforeEach(() => {
  db.articles.mockReset().mockResolvedValue([]);
  db.editions.mockReset().mockResolvedValue([]);
  db.asOf.mockReset().mockResolvedValue(null);
  db.snapshot.mockReset().mockResolvedValue(null);
  db.bySlug.mockReset().mockResolvedValue(null);
  db.list.mockReset().mockResolvedValue([]);
});

describe("URL registry", () => {
  it("/blog/tech exists in the content languages only; /sources in every locale", () => {
    for (const lang of LOCALES) {
      const paths = staticSeoUrls(lang).map((u) => u.path);
      expect(paths, lang).toContain(`/${lang}/sources`);
      if (lang === "pt") expect(paths).not.toContain("/pt/blog/tech");
      else expect(paths).toContain(`/${lang}/blog/tech`);
    }
  });

  it("the two entries have a title and a description in each language, and /sources has a markdown twin", () => {
    for (const lang of LOCALES) {
      const sources = staticSeoUrls(lang).find((u) => u.path === `/${lang}/sources`)!;
      expect(sources.section).toBe("about");
      expect(sources.markdown).toBe(true);
      expect(sources.title.length).toBeGreaterThan(10);
      expect(sources.description.length).toBeGreaterThan(50);
    }
    const en = staticSeoUrls("en").find((u) => u.path === "/en/blog/tech")!;
    const es = staticSeoUrls("es").find((u) => u.path === "/es/blog/tech")!;
    expect(en.section).toBe("ai-daily");
    expect(en.title).toBe("AI Daily Tech");
    expect(es.title).toBe("IA al Día Tech");
    expect(es.description).not.toBe(en.description);
  });

  it("the Tech edition has its own heading in llms.txt, after the editions that existed", () => {
    expect(editionHeading("tech-daily", "en")).toBe("AI Daily Tech — latest stories");
    expect(editionHeading("tech-daily", "es")).toBe("IA al Día Tech — últimas notas");
    expect(editionHeading("tech-daily", "pt")).toBe("AI Daily Tech — últimas notícias");
    expect(editionOrder("tech-daily")).toBeGreaterThan(editionOrder("week-ahead"));
    expect(editionOrder("tech-daily")).toBeLessThan(editionOrder("an-edition-nobody-knows"));
  });
});

describe("sitemap.xml", () => {
  it("lists /blog/tech for es and en with es/en/x-default alternates, and never under /pt", async () => {
    db.articles.mockImplementation(async (lang: string) => (lang === "pt" ? [] : [tech]));
    const entries = await sitemap();
    const byUrl = new Map(entries.map((e) => [e.url, e]));
    for (const lang of ["es", "en"]) {
      const e = byUrl.get(absUrl(`/${lang}/blog/tech`));
      expect(e, lang).toBeDefined();
      expect(langsOf(e!)).toEqual(["en", "es", "x-default"]);
    }
    expect(byUrl.has(absUrl("/pt/blog/tech"))).toBe(false);
  });

  it("v1.8.4: leaves /blog/tech out while it has no stories, per language", async () => {
    db.articles.mockImplementation(async (lang: string) => (lang === "en" ? [tech, ai] : [ai]));
    const urls = (await sitemap()).map((e) => e.url);
    expect(urls).toContain(absUrl("/en/blog/tech"));
    expect(urls).not.toContain(absUrl("/es/blog/tech"));
    expect(urls).toContain(absUrl("/es/blog"));
  });

  it("lists /sources in the three locales with reciprocal alternates", async () => {
    const entries = await sitemap();
    for (const lang of LOCALES) {
      const e = entries.find((x) => x.url === absUrl(`/${lang}/sources`));
      expect(e, lang).toBeDefined();
      expect(langsOf(e!)).toEqual(["en", "es", "pt", "pt-BR", "x-default"]);
    }
  });

  it("each index is dated by its own section's newest story", async () => {
    // Later than the page's own content date (CONTENT_UPDATED.blogTech), so the story decides.
    const later = makeArticle({ slug: "a-later-tech-story", eventDate: "2026-12-20", edition: "tech-daily", updatedAt: "2026-12-20T15:00:00.000Z" } as Parameters<typeof makeArticle>[0]);
    db.articles.mockImplementation(async (lang: string) => (lang === "en" ? [later, tech, ai] : []));
    const entries = await sitemap();
    const at = (path: string) => (entries.find((e) => e.url === absUrl(path))!.lastModified as Date).toISOString();
    expect(at("/en/blog/tech")).toBe("2026-12-20T15:00:00.000Z");
    // The AI index does not move because a Tech story was published.
    expect(at("/en/blog").slice(0, 10)).toBe("2026-11-08");
  });

  it("a Tech article is one URL at /blog/<slug> (no duplicate under /blog/tech/)", async () => {
    db.articles.mockImplementation(async (lang: string) => (lang === "en" ? [tech] : []));
    const urls = (await sitemap()).map((e) => e.url);
    expect(urls).toContain(absUrl("/en/blog/a-tech-story"));
    expect(urls.filter((u) => u.includes("a-tech-story"))).toHaveLength(1);
    expect(new Set(urls).size).toBe(urls.length);
  });
});

describe("llms.txt", () => {
  it("links the Tech index and the sources page, and groups Tech stories under their own heading", () => {
    const txt = buildLlmsTxt({ ...empty("en"), articles: [tech, ai] });
    expect(txt).toContain(`(${absUrl("/en/blog/tech")})`);
    expect(txt).toContain(`(${absUrl("/en/sources.md")})`);
    const heading = txt.indexOf("## AI Daily Tech — latest stories");
    expect(heading).toBeGreaterThan(-1);
    expect(txt.indexOf("a-tech-story")).toBeGreaterThan(heading);
    expect(txt.indexOf("an-ai-story")).toBeLessThan(heading);
  });

  it("Portuguese: /sources is listed (it is translated), the Tech index and stories are not", () => {
    const txt = buildLlmsTxt({ ...empty("pt"), articles: [tech] });
    expect(txt).toContain(`(${absUrl("/pt/sources.md")})`);
    expect(txt).not.toContain("/pt/blog/tech");
    expect(txt).not.toContain("a-tech-story");
  });
});

describe("markdown twins", () => {
  it("/sources.md exists in every locale and is prerendered", async () => {
    expect(staticMarkdownPaths()).toContainEqual(["sources"]);
    for (const lang of LOCALES) {
      const r = await resolveMarkdown(lang, ["sources"]);
      expect(r, lang).not.toBeNull();
      expect(r!.htmlPath).toBe(`/${lang}/sources`);
      expect(r!.body).toContain(sourcesDoc(lang).h1);
      const res = await mdGet(req, { params: Promise.resolve({ lang, path: ["sources"] }) });
      expect(res.status).toBe(200);
      expect(res.headers.get("link")).toContain(`/${lang}/sources`);
    }
  });

  it("a Tech article has a twin like any article; /blog/tech itself is a page, not an article", async () => {
    db.bySlug.mockImplementation(async (_lang: string, slug: string) => (slug === "a-tech-story" ? tech : null));
    expect((await mdGet(req, { params: Promise.resolve({ lang: "en", path: ["blog", "a-tech-story"] }) })).status).toBe(200);
    expect((await mdGet(req, { params: Promise.resolve({ lang: "en", path: ["blog", "tech"] }) })).status).toBe(404);
    // No twin under /pt: the article exists in the content languages only.
    expect((await mdGet(req, { params: Promise.resolve({ lang: "pt", path: ["blog", "a-tech-story"] }) })).status).toBe(404);
  });
});

describe("feed routes", () => {
  it("each route serves its own section", async () => {
    db.list.mockResolvedValue([tech, ai]);
    const aiXml = await (await aiFeed(req, ctx("en"))).text();
    const techXml = await (await techFeed(req, ctx("en"))).text();
    expect(aiXml).toContain("an-ai-story");
    expect(aiXml).not.toContain("a-tech-story");
    expect(techXml).toContain("a-tech-story");
    expect(techXml).not.toContain("an-ai-story");
  });

  it("answers RSS with a cache header, and an empty valid feed when the store fails", async () => {
    db.list.mockRejectedValue(new Error("firestore down"));
    const res = await techFeed(req, ctx("es"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/rss+xml");
    expect(res.headers.get("cache-control")).toContain("s-maxage=300");
    const xml = await res.text();
    expect(xml).toContain("<channel>");
    expect(xml).not.toContain("<item>");
  });

  it("/pt redirects to the English feed of the same section; an unknown locale is 404", async () => {
    const t = await techFeed(req, ctx("pt"));
    expect(t.status).toBe(308);
    expect(t.headers.get("location")).toMatch(/\/en\/blog\/tech\/feed\.xml$/);
    const a = await aiFeed(req, ctx("pt"));
    expect(a.status).toBe(308);
    expect(a.headers.get("location")).toMatch(/\/en\/blog\/feed\.xml$/);
    expect((await techFeed(req, ctx("xx"))).status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
describe("source registry (lib/blog/sources.ts)", () => {
  it("ids are unique kebab-case and URLs are unique https URLs", () => {
    const ids = EDITORIAL_SOURCES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    const urls = EDITORIAL_SOURCES.map((s) => s.url);
    expect(new Set(urls).size).toBe(urls.length);
    for (const u of urls) expect(new URL(u).protocol, u).toBe("https:");
  });

  it("every entry uses the domain's vocabulary and names who publishes it", () => {
    for (const s of EDITORIAL_SOURCES) {
      expect(SOURCE_TIERS, s.id).toContain(s.tier);
      expect(SOURCE_FORMATS, s.id).toContain(s.format);
      expect(BLOG_SOURCE_TYPES, s.id).toContain(s.sourceType);
      expect(["en", "es"], s.id).toContain(s.lang);
      expect(s.name.trim().length, s.id).toBeGreaterThan(2);
      expect(s.publisher.trim().length, s.id).toBeGreaterThan(1);
      expect(s.topics.length, s.id).toBeGreaterThan(0);
      for (const t of s.topics) expect(SOURCE_TOPICS, s.id).toContain(t);
      expect(s.editions.length, s.id).toBeGreaterThan(0);
      expect(s.verifiedAt, s.id).toBe(SOURCES_VERIFIED_AT);
    }
    expect(SOURCES_VERIFIED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("tiers mean what they say: primary sources are never 'reporting', the press always is, discovery is never citable material", () => {
    for (const s of sourcesByTier(1)) expect(s.sourceType, s.id).not.toBe("reporting");
    for (const s of sourcesByTier(2)) expect(s.sourceType, s.id).toBe("reporting");
    for (const s of sourcesByTier(3)) expect(s.sourceType, s.id).toBe("other");
    const counts = sourceCounts();
    expect(counts[1]).toBeGreaterThan(counts[2]);
    expect(counts[2]).toBeGreaterThan(0);
    expect(counts[3]).toBeGreaterThan(0);
  });

  it("covers what the Tech edition needs, with primary sources", () => {
    const techPrimary = sourcesByTier(1, "tech");
    const publishers = new Set(techPrimary.map((s) => s.publisher));
    for (const p of ["Vercel", "Cloudflare", "Supabase", "GitHub", "Netlify", "Amazon Web Services", "Google Cloud", "Microsoft", "React", "OpenJS Foundation", "NVIDIA"]) {
      expect(publishers, p).toContain(p);
    }
    for (const topic of ["cloud", "frameworks", "runtimes", "developer-tools", "hardware", "web-platform", "data"] as const) {
      expect(techPrimary.some((s) => s.topics.includes(topic)), topic).toBe(true);
    }
    expect(sourcesByTier(1, "ai").some((s) => s.topics.includes("research"))).toBe(true);
    expect(sourcesForEdition("tech").length).toBeGreaterThan(60);
    // Spanish-language press exists for the Spanish edition.
    expect(sourcesByTier(2).some((s) => s.lang === "es")).toBe(true);
  });

  it("the verification report covers every URL of the registry (regenerate it after editing the registry)", () => {
    const report = readFileSync(join(process.cwd(), "docs", "editorial", "sources-verification.md"), "utf8");
    for (const s of EDITORIAL_SOURCES) expect(report, `${s.id} is missing from docs/editorial/sources-verification.md`).toContain(`| ${s.url}`);
    expect(report).toContain(`${EDITORIAL_SOURCES.length} of ${EDITORIAL_SOURCES.length} sources answered 200`);
    expect(report).toContain(`SOURCES_VERIFIED_AT = "${SOURCES_VERIFIED_AT}"`);
    expect(report).not.toMatch(/\*\*(error|\d{3})\*\*/);
  });
});

describe("/sources page document", () => {
  it("states the real numbers of the registry in every language", () => {
    const counts = sourceCounts();
    for (const lang of LOCALES) {
      const doc = sourcesDoc(lang);
      const text = JSON.stringify(doc);
      expect(doc.tldr).toContain(String(counts[1] + counts[2] + counts[3]));
      for (const tier of SOURCE_TIERS) expect(text, `${lang} tier ${tier}`).toContain(`(${counts[tier]} `);
      for (const p of ["Vercel", "Cloudflare", "Ars Technica", "Techmeme"]) expect(text, p).toContain(p);
      expect(doc.faq.length).toBeGreaterThanOrEqual(3);
      expect(doc.sections.map((s) => s.id)).toEqual(["tiers", "requirements", "who-we-read", "editions", "corrections", "limits"]);
    }
  });

  it("is translated: the three languages differ, and the Portuguese has no Spanish in it", () => {
    const [en, es, pt] = (["en", "es", "pt"] as const).map((l) => sourcesDoc(l));
    expect(new Set([en.h1, es.h1, pt.h1]).size).toBe(3);
    expect(new Set([en.tldr, es.tldr, pt.tldr]).size).toBe(3);
    const ptText = JSON.stringify(pt);
    expect(ptText).not.toMatch(/[ñ¿¡]/);
    expect(ptText).not.toMatch(/\p{L}(ción|ciones)(?!\p{L})/u);
  });

  it("the publisher lists come from the registry", () => {
    expect(publishersByTier(3)).toEqual([...publishersByTier(3)].sort((a, b) => a.localeCompare(b)));
    expect(JSON.stringify(sourcesDoc("en"))).toContain(publishersByTier(2).join(", "));
  });

  it("its JSON-LD is a WebPage about the organization with a breadcrumb and the visible FAQ", () => {
    const doc = sourcesDoc("es");
    const ld = docPageGraph({ doc, lang: "es", path: "/es/sources", kind: "sources", label: doc.h1 }) as { "@graph": Array<Record<string, unknown>> };
    const types = ld["@graph"].map((n) => n["@type"]);
    expect(types).toContain("WebPage");
    expect(types).toContain("BreadcrumbList");
    expect(types).toContain("FAQPage");
    const page = ld["@graph"].find((n) => n["@type"] === "WebPage")!;
    expect(page.url).toBe(absUrl("/es/sources"));
    expect(JSON.stringify(page.about)).toContain("organization");
  });

  it("the markdown twin carries every section heading", () => {
    const doc = sourcesDoc("pt");
    const md = docMarkdown(doc, "pt", absUrl("/pt/sources"));
    for (const s of doc.sections) expect(md).toContain(s.heading);
  });
});
