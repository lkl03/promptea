// v1.9.0 — "Markdown for Agents": Accept negotiation in the proxy, the tool
// twins, Content Signals in robots.txt and the API catalog.

import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/seo/dynamic", () => ({
  loadArticles: async () => [],
  loadEditions: async () => [],
  loadBenchmarksSnapshot: async () => null,
}));
vi.mock("@/lib/blog/server", () => ({ getArticleBySlug: async () => null }));

import { AGENT_LINKS, proxy } from "@/proxy";
import { LANGS } from "@/lib/domain";
import { NEGOTIATED_KINDS_ALL_LANGS, NEGOTIATED_SINGLES, negotiatedTwinPath, prefersMarkdown } from "@/lib/seo/negotiate";
import { resolveMarkdown, staticMarkdownPaths } from "@/lib/seo/mdResolve";
import { guides } from "@/lib/seo/content/guides";
import { glossary } from "@/lib/seo/content/glossary";
import { modelPages } from "@/lib/seo/content/models";
import { landings } from "@/lib/seo/content/landings";
import { TOOL_PAGE_IDS, toolPageDoc } from "@/lib/seo/content/toolPages";
import { CORE_PAGES } from "@/lib/seo/registry";
import { CONTENT_SIGNALS } from "@/lib/seo/crawlers";
import { contentSignalValue, robotsTxt } from "@/lib/seo/robotsTxt";
import { apiCatalog, openApiDocument } from "@/lib/seo/apiCatalog";
import { GET as robotsGet } from "@/app/robots.txt/route";
import { GET as catalogGet } from "@/app/.well-known/api-catalog/route";
import { GET as openApiGet } from "@/app/api/openapi.json/route";
import { GET as benchmarksGet } from "@/app/api/benchmarks/route";

const run = (url: string, accept?: string) => proxy(new NextRequest(url, { headers: accept ? { accept } : {} }));
const rewriteOf = (res: Response) => res.headers.get("x-middleware-rewrite");

describe("prefersMarkdown", () => {
  it("opts in only on an explicit text/markdown that is not ranked below HTML", () => {
    expect(prefersMarkdown("text/markdown")).toBe(true);
    expect(prefersMarkdown("text/markdown, text/html;q=0.9")).toBe(true);
    expect(prefersMarkdown("text/html, text/markdown")).toBe(true);
    expect(prefersMarkdown("TEXT/Markdown; q=0.8, */*;q=0.1")).toBe(true);
    expect(prefersMarkdown("text/html, text/markdown;q=0.5")).toBe(false);
    expect(prefersMarkdown("text/markdown;q=0")).toBe(false);
  });

  it("never opts a browser or a wildcard client in", () => {
    expect(prefersMarkdown("text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8")).toBe(false);
    expect(prefersMarkdown("*/*")).toBe(false);
    expect(prefersMarkdown("text/*")).toBe(false);
    expect(prefersMarkdown("")).toBe(false);
    expect(prefersMarkdown(null)).toBe(false);
  });
});

describe("negotiatedTwinPath", () => {
  it("maps a page path to its internal twin", () => {
    expect(negotiatedTwinPath("/en")).toBe("/md/en");
    expect(negotiatedTwinPath("/zh/flow")).toBe("/md/zh/flow");
    expect(negotiatedTwinPath("/es/guides/prompt-chaining")).toBe("/md/es/guides/prompt-chaining");
    expect(negotiatedTwinPath("/pt/models/claude")).toBe("/md/pt/models/claude");
  });

  it("leaves alone what has no twin, or only has one in some languages", () => {
    for (const p of ["/en/blog", "/en/changelog", "/en/privacy", "/en/guides", "/pt/guides/prompt-chaining", "/zh/guides/prompt-chaining", "/pt/blog/some-story", "/zh/blog/some-story", "/en/blog/weekly/2026-11-14", "/fr", "/", "/en/guides/Bad_Slug"]) {
      expect(negotiatedTwinPath(p), p).toBeNull();
    }
  });

  it("every negotiated path resolves in the real resolver (a negotiated request must never 404 on an existing page)", async () => {
    for (const lang of LANGS) {
      const paths: string[][] = [
        [],
        ...NEGOTIATED_SINGLES.map((s) => [s]),
        ...glossary.map((g) => ["glossary", g.slug]),
        ...modelPages.map((m) => ["models", m.slug]),
        ...landings.map((p) => ["landing", p.slug]),
        ...(lang === "es" || lang === "en" ? guides.map((g) => ["guides", g.slug]) : []),
      ];
      for (const segs of paths) {
        const path = `/${[lang, ...segs].join("/")}`;
        expect(negotiatedTwinPath(path), path).toBe(`/md${path}`);
        expect(await resolveMarkdown(lang, segs), path).not.toBeNull();
      }
    }
    expect(NEGOTIATED_KINDS_ALL_LANGS).toEqual(["glossary", "models", "landing"]);
  });
});

describe("proxy: markdown negotiation", () => {
  it("rewrites to the twin when markdown is preferred, and says Vary: Accept", () => {
    const res = run("https://www.promptea.me/en/about", "text/markdown");
    expect(new URL(rewriteOf(res)!).pathname).toBe("/md/en/about");
    expect(res.headers.get("vary")).toMatch(/accept/i);
  });

  it("serves HTML to browsers, with the discovery Link headers", () => {
    const res = run("https://www.promptea.me/en/about", "text/html,application/xhtml+xml,*/*;q=0.8");
    expect(rewriteOf(res)).toBeNull();
    const link = res.headers.get("link") ?? "";
    for (const l of AGENT_LINKS) expect(link).toContain(l);
    expect(link).toContain('</en/about.md>; rel="alternate"; type="text/markdown"');
  });

  it("?format=html opts out; pages without a twin are never rewritten and announce no twin", () => {
    expect(rewriteOf(run("https://www.promptea.me/en/about?format=html", "text/markdown"))).toBeNull();
    const res = run("https://www.promptea.me/en/changelog", "text/markdown");
    expect(rewriteOf(res)).toBeNull();
    expect(res.headers.get("link")).not.toContain("text/markdown");
    expect(res.headers.get("link")).toContain("api-catalog");
  });

  it("keeps the legacy analyzer redirect ahead of negotiation", () => {
    const res = run("https://www.promptea.me/en?prompt=x", "text/markdown");
    expect(res.status).toBe(308);
  });
});

describe("tool twins", () => {
  it("are static paths and flagged in the registry, so llms.txt links the .md", () => {
    const stat = staticMarkdownPaths().map((p) => p.join("/"));
    for (const id of TOOL_PAGE_IDS) {
      expect(stat).toContain(id);
      expect(CORE_PAGES.find((p) => p.id === id)?.markdown, id).toBe(true);
    }
  });

  it("resolve in every language with the registry title, real facts and the page's own FAQ", async () => {
    for (const lang of LANGS) {
      for (const id of TOOL_PAGE_IDS) {
        const found = await resolveMarkdown(lang, [id]);
        expect(found?.htmlPath).toBe(`/${lang}/${id}`);
        const doc = toolPageDoc(id, lang);
        expect(found!.body.startsWith(`# ${doc.h1}`)).toBe(true);
        expect(found!.body).not.toMatch(/undefined|\[object Object\]/);
        for (const f of doc.faq) expect(found!.body).toContain(f.q);
      }
    }
    const analyzer = (await resolveMarkdown("en", ["analyzer"]))!.body;
    expect(analyzer).toContain("deepseek");
    expect(analyzer).toContain("?prompt=");
    expect(toolPageDoc("analyzer", "en").faq.length).toBeGreaterThan(0);
    expect(toolPageDoc("flow", "zh").faq.length).toBeGreaterThan(0);
  });
});

describe("robots.txt: Content Signals", () => {
  it("declares the three signals from the crawler policy in every allowed group", async () => {
    expect(Object.keys(CONTENT_SIGNALS)).toEqual(["search", "ai-input", "ai-train"]);
    expect(contentSignalValue()).toBe("search=yes, ai-input=yes, ai-train=yes");
    const txt = robotsTxt("https://www.promptea.me");
    const groups = txt.split("\n\n").filter((g) => g.startsWith("User-Agent:"));
    expect(groups.length).toBeGreaterThan(20);
    for (const g of groups) {
      expect(g.split("\n")[1], g).toBe("Content-Signal: search=yes, ai-input=yes, ai-train=yes");
      expect(g).toContain("Allow: /");
      expect(g).toContain("Disallow: /_next/");
    }
    expect(txt.startsWith("User-Agent: *\n")).toBe(true);
  });

  it("is served as plain text", async () => {
    const res = robotsGet();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    expect(await res.text()).toMatch(/^Sitemap: https?:\/\/.+\/sitemap\.xml$/m);
  });
});

describe("API catalog and OpenAPI", () => {
  it("the catalog is an RFC 9727 linkset that points at the OpenAPI document", async () => {
    const res = catalogGet();
    expect(res.headers.get("content-type")).toContain("application/linkset+json");
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
    const body = (await res.json()) as ReturnType<typeof apiCatalog>;
    expect(Array.isArray(body.linkset)).toBe(true);
    const entry = body.linkset[0] as { anchor: string; "service-desc": Array<{ href: string }> };
    expect(entry.anchor).toMatch(/\/api\/benchmarks$/);
    expect(entry["service-desc"][0].href).toMatch(/\/api\/openapi\.json$/);
  });

  it("the OpenAPI document describes what /api/benchmarks really returns", async () => {
    const res = openApiGet();
    expect(res.headers.get("content-type")).toContain("application/openapi+json");
    const doc = openApiDocument("https://www.promptea.me") as { openapi: string; paths: Record<string, { get: { responses: Record<string, { content: Record<string, { schema: { properties: Record<string, unknown>; required: string[] } }> }> } }> };
    expect(doc.openapi).toBe("3.1.0");
    const schema = doc.paths["/api/benchmarks"].get.responses["200"].content["application/json"].schema;
    const live = (await (await benchmarksGet()).json()) as Record<string, unknown>;
    expect(Object.keys(live).sort()).toEqual(Object.keys(schema.properties).sort());
    for (const k of schema.required) expect(live).toHaveProperty(k);
  });
});
