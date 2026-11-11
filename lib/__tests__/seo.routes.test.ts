// Route handlers of the machine-readable surface: /llms.txt, /llms-full.txt (root
// and per-locale) and the markdown twins. Storage is faked; what is under test
// is status, headers and the 404 contract.

import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeArticle, makeSnapshot } from "./seo.fixtures";

vi.mock("server-only", () => ({}));

const db = {
  articles: vi.fn(),
  editions: vi.fn(),
  snapshot: vi.fn(),
  bySlug: vi.fn(),
};
vi.mock("@/lib/seo/dynamic", () => ({
  loadArticles: (...a: unknown[]) => db.articles(...a),
  loadEditions: (...a: unknown[]) => db.editions(...a),
  loadBenchmarksSnapshot: (...a: unknown[]) => db.snapshot(...a),
}));
vi.mock("@/lib/blog/server", () => ({ getArticleBySlug: (...a: unknown[]) => db.bySlug(...a) }));

import { GET as llmsRoot } from "@/app/llms.txt/route";
import { GET as llmsFullRoot } from "@/app/llms-full.txt/route";
import { GET as llmsLocale, generateStaticParams as llmsParams } from "@/app/[lang]/llms.txt/route";
import { GET as llmsFullLocale } from "@/app/[lang]/llms-full.txt/route";
import { GET as mdGet, generateStaticParams as mdParams } from "@/app/md/[lang]/[[...path]]/route";
import { resolveMarkdown, staticMarkdownPaths } from "@/lib/seo/mdResolve";
import { guideLang, guides } from "@/lib/seo/content/guides";
import { glossary } from "@/lib/seo/content/glossary";
import { modelPages } from "@/lib/seo/content/models";
import { landings } from "@/lib/seo/content/landings";
import { LOCALES, absUrl } from "@/lib/seo/site";

const ctx = (lang: string) => ({ params: Promise.resolve({ lang }) });
const mdCtx = (lang: string, path?: string[]) => ({ params: Promise.resolve({ lang, path }) });
const req = new Request("http://localhost/x");

beforeEach(() => {
  db.articles.mockReset().mockResolvedValue([]);
  db.editions.mockReset().mockResolvedValue([]);
  db.snapshot.mockReset().mockResolvedValue(null);
  db.bySlug.mockReset().mockResolvedValue(null);
});

describe("llms.txt routes", () => {
  it("/llms.txt is English plain text, 200", async () => {
    const res = await llmsRoot();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    const body = await res.text();
    expect(body.startsWith("# Promptea")).toBe(true);
    expect(body).toContain("Prompting guides");
  });

  it("/es/llms.txt and /en/llms.txt serve their own language", async () => {
    const es = await (await llmsLocale(req, ctx("es"))).text();
    const en = await (await llmsLocale(req, ctx("en"))).text();
    expect(es).toContain("Guías de prompting");
    expect(en).toContain("Prompting guides");
    expect(es).not.toBe(en);
  });

  it("an unknown locale is a text/plain 404, not a 500", async () => {
    for (const handler of [llmsLocale, llmsFullLocale]) {
      const res = await handler(req, ctx("fr"));
      expect(res.status).toBe(404);
      expect(res.headers.get("content-type")).toMatch(/^text\/plain/);
    }
  });

  it("llms-full.txt serves the full text in both locales", async () => {
    const root = await llmsFullRoot();
    expect(root.status).toBe(200);
    expect(root.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    const es = await (await llmsFullLocale(req, ctx("es"))).text();
    expect(es.startsWith("# Promptea — full text")).toBe(true);
    expect(es).toContain(guides[0].title.es);
    expect(await root.text()).toContain(guides[0].title.en);
  });

  it("still answers 200 when the database is down (loaders degrade to empty)", async () => {
    db.articles.mockResolvedValue([]);
    db.editions.mockResolvedValue([]);
    db.snapshot.mockResolvedValue(null);
    expect((await llmsRoot()).status).toBe(200);
    expect((await llmsFullRoot()).status).toBe(200);
  });

  it("lists AI Daily stories when there are some", async () => {
    db.articles.mockResolvedValue([makeArticle({ slug: "fresh-story", eventDate: "2026-11-08" })]);
    expect(await (await llmsRoot()).text()).toContain("/blog/fresh-story");
  });

  it("is statically generated for every locale only", () => {
    expect(llmsParams()).toEqual([{ lang: "es" }, { lang: "en" }, { lang: "pt" }]);
  });
});

describe("markdown twin route", () => {
  it("serves a guide as text/markdown with the HTML page as canonical", async () => {
    const g = guides[0];
    const res = await mdGet(req, mdCtx("en", ["guides", g.slug]));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/markdown; charset=utf-8");
    expect(res.headers.get("link")).toBe(`<${absUrl(`/en/guides/${g.slug}`)}>; rel="canonical"`);
    const body = await res.text();
    expect(body.startsWith(`# ${g.title.en}`)).toBe(true);
    expect(body).toContain(absUrl(`/en/guides/${g.slug}`));
  });

  it("serves the home, about and methodology twins", async () => {
    for (const path of [undefined, ["about"], ["methodology"]]) {
      const res = await mdGet(req, mdCtx("es", path));
      expect(res.status, String(path)).toBe(200);
      expect(await res.text()).toMatch(/Idioma: Español/);
    }
  });

  it("404s (text/plain) for anything that does not exist", async () => {
    const cases: Array<[string, string[] | undefined]> = [
      ["en", ["guides", "no-such-guide"]],
      ["en", ["glossary", "nope"]],
      ["en", ["models", "nope"]],
      ["en", ["landing", "nope"]],
      ["en", ["guides"]], // an index has no twin
      ["en", ["guides", "json-output", "extra"]],
      ["en", ["unknown-section"]],
      ["en", ["blog", "missing-article"]],
      ["fr", ["about"]],
    ];
    for (const [lang, path] of cases) {
      const res = await mdGet(req, mdCtx(lang, path));
      expect(res.status, `${lang}/${path?.join("/")}`).toBe(404);
      expect(res.headers.get("content-type")).toMatch(/^text\/plain/);
    }
  });

  it("benchmarks twin always exists (llms.txt links it): honest note without data, rankings with it", async () => {
    const none = await mdGet(req, mdCtx("en", ["benchmarks"]));
    expect(none.status).toBe(200);
    expect(await none.text()).toMatch(/not available right now/);
    db.snapshot.mockResolvedValue(makeSnapshot());
    const res = await mdGet(req, mdCtx("en", ["benchmarks"]));
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("Alpha 1");
  });

  it("serves an AI Daily article by slug and 404s when the store fails", async () => {
    db.bySlug.mockResolvedValue(makeArticle({ slug: "story", eventDate: "2026-11-08" }));
    const ok = await mdGet(req, mdCtx("en", ["blog", "story"]));
    expect(ok.status).toBe(200);
    expect(ok.headers.get("link")).toContain("/en/blog/story");
    db.bySlug.mockRejectedValue(new Error("firestore down"));
    expect((await mdGet(req, mdCtx("en", ["blog", "story"]))).status).toBe(404);
  });

  it("every statically generated twin exists in every locale (no dead .md link from the sitemap/llms.txt)", async () => {
    const paths = staticMarkdownPaths();
    expect(paths).toContainEqual([]);
    expect(paths).toContainEqual(["about"]);
    expect(paths).toContainEqual(["methodology"]);
    for (const g of guides) expect(paths).toContainEqual(["guides", g.slug]);
    for (const g of glossary) expect(paths).toContainEqual(["glossary", g.slug]);
    for (const m of modelPages) expect(paths).toContainEqual(["models", m.slug]);
    for (const l of landings) expect(paths).toContainEqual(["landing", l.slug]);
    for (const lang of LOCALES) {
      for (const p of paths) {
        const r = await resolveMarkdown(lang, p);
        // A guide not translated to this locale yet has no twin there (and no link points at one).
        const g = p[0] === "guides" ? guides.find((x) => x.slug === p[1]) : undefined;
        if (g && guideLang(g, lang) !== lang) {
          expect(r, `${lang}/${p.join("/")}`).toBeNull();
          continue;
        }
        expect(r, `${lang}/${p.join("/")}`).not.toBeNull();
        expect(r!.htmlPath).toBe(`/${[lang, ...p].join("/")}`);
      }
    }
    expect(mdParams()).toHaveLength(paths.length * LOCALES.length);
  });
});
