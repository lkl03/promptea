import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeArticle, makeEdition } from "./seo.fixtures";

vi.mock("server-only", () => ({}));

const loaders = {
  articles: vi.fn(),
  editions: vi.fn(),
  asOf: vi.fn(),
};
vi.mock("@/lib/seo/dynamic", () => ({
  loadArticles: (...a: unknown[]) => loaders.articles(...a),
  loadEditions: (...a: unknown[]) => loaders.editions(...a),
  loadBenchmarksAsOf: (...a: unknown[]) => loaders.asOf(...a),
}));

import sitemap from "@/app/sitemap";
import { allStaticSeoUrls, staticSeoUrls } from "@/lib/seo/registry";
import { LOCALES, X_DEFAULT_LOCALE, absUrl } from "@/lib/seo/site";
import { guides } from "@/lib/seo/content/guides";
import { glossary } from "@/lib/seo/content/glossary";
import { modelPages } from "@/lib/seo/content/models";
import { landings } from "@/lib/seo/content/landings";

type Entry = Awaited<ReturnType<typeof sitemap>>[number];
const langs = (e: Entry) => (e.alternates?.languages ?? {}) as Record<string, string>;

beforeEach(() => {
  loaders.articles.mockReset().mockResolvedValue([]);
  loaders.editions.mockReset().mockResolvedValue([]);
  loaders.asOf.mockReset().mockResolvedValue(null);
});

describe("static URL registry", () => {
  it("has the same set of pages in both locales and no duplicate paths", () => {
    const es = staticSeoUrls("es").map((u) => u.path.replace(/^\/es/, ""));
    const en = staticSeoUrls("en").map((u) => u.path.replace(/^\/en/, ""));
    expect(new Set(es).size).toBe(es.length);
    expect([...es].sort()).toEqual([...en].sort());
  });

  it("lists every hand-written page once (guides, glossary, models, landings, about, methodology)", () => {
    const paths = new Set(staticSeoUrls("en").map((u) => u.path));
    for (const g of guides) expect(paths, g.slug).toContain(`/en/guides/${g.slug}`);
    for (const g of glossary) expect(paths, g.slug).toContain(`/en/glossary/${g.slug}`);
    for (const m of modelPages) expect(paths, m.slug).toContain(`/en/models/${m.slug}`);
    for (const l of landings) expect(paths, l.slug).toContain(`/en/landing/${l.slug}`);
    for (const p of ["", "/about", "/methodology", "/benchmarks", "/analyzer", "/best-ai", "/guides", "/models", "/glossary", "/blog", "/blog/weekly", "/privacy", "/changelog", "/prompts"]) {
      expect(paths, p).toContain(`/en${p}`);
    }
  });

  it("every entry has a title, a description and a real date", () => {
    for (const u of allStaticSeoUrls()) {
      expect(u.title.trim().length, u.path).toBeGreaterThan(3);
      expect(u.description.trim().length, u.path).toBeGreaterThan(10);
      expect(Number.isNaN(new Date(u.updated.length === 10 ? `${u.updated}T00:00:00Z` : u.updated).getTime()), `${u.path} ${u.updated}`).toBe(false);
      expect(u.path.startsWith(`/${u.lang}`), u.path).toBe(true);
    }
  });
});

describe("sitemap.xml generator", () => {
  it("emits every static URL of every locale, once, absolute", async () => {
    const entries = await sitemap();
    const urls = entries.map((e) => e.url);
    expect(new Set(urls).size).toBe(urls.length);
    for (const l of LOCALES) for (const u of staticSeoUrls(l)) expect(urls).toContain(absUrl(u.path));
    for (const u of urls) expect(u).toMatch(/^https?:\/\//);
    expect(entries).toHaveLength(allStaticSeoUrls().length);
  });

  it("gives every URL es, en, pt-BR + pt and x-default alternates that point back at itself", async () => {
    const entries = await sitemap();
    const byUrl = new Map(entries.map((e) => [e.url, e]));
    for (const e of entries) {
      const l = langs(e);
      // AI Daily exists in es/en only: no Portuguese alternate is claimed for it.
      const editorial = /\/blog(\/|$)/.test(new URL(e.url).pathname);
      expect(Object.keys(l).sort(), e.url).toEqual(editorial ? ["en", "es", "x-default"] : ["en", "es", "pt", "pt-BR", "x-default"]);
      expect(Object.values(l), e.url).toContain(e.url);
      expect(l["x-default"], e.url).toBe(l[X_DEFAULT_LOCALE]);
      if (!editorial) expect(l.pt, e.url).toBe(l["pt-BR"]);
      // reciprocal: every alternate has its own entry, with the very same alternates
      for (const alt of new Set(Object.values(l))) {
        const other = byUrl.get(alt);
        expect(other, `${e.url} -> ${alt}`).toBeDefined();
        expect(langs(other as Entry), `${alt} mirrors ${e.url}`).toEqual(l);
      }
    }
  });

  it("lists every static page in Portuguese, except AI Daily (shown under /pt as a view of the English original)", async () => {
    const urls = (await sitemap()).map((e) => new URL(e.url).pathname);
    expect(urls).toContain("/pt");
    expect(urls).toContain("/pt/analyzer");
    expect(urls).toContain("/pt/guides");
    expect(urls.filter((u) => u.startsWith("/pt/blog"))).toEqual([]);
    expect(urls).toContain("/en/blog");
    expect(urls).toContain("/es/blog/weekly");
  });

  it("uses real lastmod dates: valid, in the past and not all 'now'", async () => {
    const entries = await sitemap();
    const dates = entries.map((e) => e.lastModified as Date);
    for (const d of dates) {
      expect(d instanceof Date && !Number.isNaN(d.getTime())).toBe(true);
      expect(d.getTime()).toBeGreaterThan(new Date("2025-01-01").getTime()); // never the epoch fallback
      expect(d.getTime()).toBeLessThanOrEqual(Date.now() + 24 * 3600 * 1000);
    }
    expect(new Set(dates.map((d) => d.toISOString())).size).toBeGreaterThan(2);
  });

  it("adds AI Daily articles with their own per-locale slugs and update times", async () => {
    const en = makeArticle({ slug: "en-slug", eventDate: "2026-11-05", lang: "en", alternateSlugs: { en: "en-slug", es: "es-slug" }, updatedAt: "2026-11-06T08:00:00.000Z" });
    const es = makeArticle({ slug: "es-slug", eventDate: "2026-11-05", lang: "es", alternateSlugs: { en: "en-slug", es: "es-slug" } });
    loaders.articles.mockImplementation(async (lang: string) => (lang === "en" ? [en] : [es]));
    const entries = await sitemap();
    const e = entries.find((x) => x.url === absUrl("/en/blog/en-slug"));
    expect(e).toBeDefined();
    expect(langs(e as Entry)).toMatchObject({ en: absUrl("/en/blog/en-slug"), es: absUrl("/es/blog/es-slug"), "x-default": absUrl("/en/blog/en-slug") });
    expect((e as Entry).lastModified).toEqual(new Date("2026-11-06T08:00:00.000Z"));
    expect(entries.find((x) => x.url === absUrl("/es/blog/es-slug"))).toBeDefined();
    // the AI Daily index takes the newest article date
    const idx = entries.find((x) => x.url === absUrl("/en/blog")) as Entry;
    expect((idx.lastModified as Date).getTime()).toBeGreaterThanOrEqual(new Date("2026-11-06T08:00:00.000Z").getTime());
  });

  it("adds weekly editions in both locales and dates the archive by the newest one", async () => {
    loaders.editions.mockResolvedValue([makeEdition("2026-11-02")]);
    const entries = await sitemap();
    expect(entries.find((x) => x.url === absUrl("/en/blog/weekly/2026-11-02"))).toBeDefined();
    expect(entries.find((x) => x.url === absUrl("/es/blog/weekly/2026-11-02"))).toBeDefined();
    const archive = entries.find((x) => x.url === absUrl("/en/blog/weekly")) as Entry;
    expect((archive.lastModified as Date).toISOString()).toBe("2026-11-09T10:00:00.000Z");
  });

  it("dates /benchmarks by the snapshot's asOf when there is one", async () => {
    loaders.asOf.mockResolvedValue("2026-11-03T00:00:00Z");
    const entries = await sitemap();
    const b = entries.find((x) => x.url === absUrl("/en/benchmarks")) as Entry;
    expect((b.lastModified as Date).toISOString()).toBe("2026-11-03T00:00:00.000Z");
  });

  it("still serves every static URL when the database is down", async () => {
    loaders.articles.mockResolvedValue([]);
    loaders.editions.mockResolvedValue([]);
    loaders.asOf.mockResolvedValue(null);
    expect((await sitemap()).length).toBe(allStaticSeoUrls().length);
  });
});
