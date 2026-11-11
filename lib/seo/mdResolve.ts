// lib/seo/mdResolve.ts
//
// Resolves a markdown-twin request (`/{lang}/guides/x.md`, `/{lang}.md`, …) to
// its markdown body. Hand-written pages come from the content modules; AI Daily
// articles and the benchmarks snapshot from the (optional) database. Returns
// null for anything that does not exist so the route can answer 404.

import "server-only";

import { getArticleBySlug } from "@/lib/blog/server";
import { glossary } from "@/lib/seo/content/glossary";
import { guideLang, guides } from "@/lib/seo/content/guides";
import { landings } from "@/lib/seo/content/landings";
import { modelPages } from "@/lib/seo/content/models";
import { aboutDoc, homeAboutDoc, howItWorksDoc, methodologyDoc } from "./content/sitePages";
import { sourcesDoc } from "./content/sourcesPage";
import { CONTENT_UPDATED } from "./dates";
import { loadBenchmarksSnapshot } from "./dynamic";
import { articleUpdated } from "./dynamicUrls";
import { articleMarkdown, benchmarksMarkdown, docMarkdown, glossaryMarkdown, guideMarkdown, landingMarkdown, modelMarkdown } from "./markdown";
import { modelPageUpdated } from "./registry";
import { absUrl, type Locale } from "./site";
import { isContentLang } from "@/lib/domain";

export type ResolvedMarkdown = {
  body: string;
  /** Site-relative path of the HTML page this is the twin of. */
  htmlPath: string;
};

/** The store behind a twin could not be read. Never cached; see resolveMarkdown(). */
export class MarkdownLookupError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "MarkdownLookupError";
  }
}

/** The `[...path]` segments that have a markdown twin, for static generation. */
export function staticMarkdownPaths(): string[][] {
  return [
    [],
    ["how-it-works"],
    ["about"],
    ["methodology"],
    ["sources"],
    ["benchmarks"],
    ...guides.map((g) => ["guides", g.slug]),
    ...glossary.map((g) => ["glossary", g.slug]),
    ...modelPages.map((m) => ["models", m.slug]),
    ...landings.map((p) => ["landing", p.slug]),
  ];
}

export async function resolveMarkdown(lang: Locale, segments: string[]): Promise<ResolvedMarkdown | null> {
  const [kind, slug, ...rest] = segments;
  if (rest.length > 0) return null;
  const htmlPath = `/${[lang, ...segments].join("/")}`;
  const url = absUrl(htmlPath);

  if (!kind) return { htmlPath, body: docMarkdown(homeAboutDoc(lang), lang, url, { title: "Promptea" }) };

  if (!slug) {
    if (kind === "how-it-works") return { htmlPath, body: docMarkdown(howItWorksDoc(lang), lang, url) };
    if (kind === "about") return { htmlPath, body: docMarkdown(aboutDoc(lang), lang, url) };
    if (kind === "methodology") return { htmlPath, body: docMarkdown(methodologyDoc(lang), lang, url) };
    if (kind === "sources") return { htmlPath, body: docMarkdown(sourcesDoc(lang), lang, url) };
    if (kind === "benchmarks") {
      // Always exists (llms.txt and the sitemap link to it); without data it says so.
      return { htmlPath, body: benchmarksMarkdown(await loadBenchmarksSnapshot(), lang, url, CONTENT_UPDATED.benchmarks) };
    }
    return null;
  }

  if (kind === "guides") {
    const g = guides.find((x) => x.slug === slug);
    // No twin for a guide that is not translated to this locale yet.
    if (g && guideLang(g, lang) !== lang) return null;
    return g ? { htmlPath, body: guideMarkdown(g, lang, url, g.updated ?? CONTENT_UPDATED.guides) } : null;
  }
  if (kind === "glossary") {
    const g = glossary.find((x) => x.slug === slug);
    return g ? { htmlPath, body: glossaryMarkdown(g, lang, url, g.updated ?? CONTENT_UPDATED.glossary) } : null;
  }
  if (kind === "models") {
    const m = modelPages.find((x) => x.slug === slug);
    return m ? { htmlPath, body: modelMarkdown(m, lang, url, modelPageUpdated(m.slug)) } : null;
  }
  if (kind === "landing") {
    const p = landings.find((x) => x.slug === slug);
    return p ? { htmlPath, body: landingMarkdown(p, lang, url, CONTENT_UPDATED.landings) } : null;
  }
  if (kind === "blog") {
    // Articles exist in the content languages only: no twin under /md/pt/blog.
    if (!isContentLang(lang)) return null;
    try {
      const a = await getArticleBySlug(lang, slug);
      return a ? { htmlPath, body: articleMarkdown(a, url, articleUpdated(a)) } : null;
    } catch (err) {
      // No database configured (a build or a deployment without credentials):
      // there is no AI Daily at all, so "not found" is the truth.
      if (!process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) return null;
      // v1.8.3: the database IS configured and the lookup failed (timeout, cold
      // start, outage). Answering "not found" here was wrong twice over: the
      // route is cached (ISR), and Next caches whatever status a route handler
      // returns — so one failed lookup replaced a good twin with a 404 for the
      // whole revalidation window, for every reader and crawler. Throwing makes
      // the route fail instead: nothing is cached, the previous good copy keeps
      // being served, and a first request gets a 500 a crawler will retry.
      throw new MarkdownLookupError(`AI Daily lookup failed for ${htmlPath}`, { cause: err });
    }
  }
  return null;
}
