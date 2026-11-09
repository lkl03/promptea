// lib/seo/mdResolve.ts
//
// Resolves a markdown-twin request (`/{lang}/guides/x.md`, `/{lang}.md`, …) to
// its markdown body. Hand-written pages come from the content modules; AI Daily
// articles and the benchmarks snapshot from the (optional) database. Returns
// null for anything that does not exist so the route can answer 404.

import "server-only";

import { getArticleBySlug } from "@/lib/blog/server";
import { glossary } from "@/lib/seo/content/glossary";
import { guides } from "@/lib/seo/content/guides";
import { landings } from "@/lib/seo/content/landings";
import { modelPages } from "@/lib/seo/content/models";
import { aboutDoc, homeAboutDoc, methodologyDoc } from "./content/sitePages";
import { CONTENT_UPDATED } from "./dates";
import { loadBenchmarksSnapshot } from "./dynamic";
import { articleUpdated } from "./dynamicUrls";
import { articleMarkdown, benchmarksMarkdown, docMarkdown, glossaryMarkdown, guideMarkdown, landingMarkdown, modelMarkdown } from "./markdown";
import { modelPageUpdated } from "./registry";
import { absUrl, type Locale } from "./site";

export type ResolvedMarkdown = {
  body: string;
  /** Site-relative path of the HTML page this is the twin of. */
  htmlPath: string;
};

/** The `[...path]` segments that have a markdown twin, for static generation. */
export function staticMarkdownPaths(): string[][] {
  return [
    [],
    ["about"],
    ["methodology"],
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
    if (kind === "about") return { htmlPath, body: docMarkdown(aboutDoc(lang), lang, url) };
    if (kind === "methodology") return { htmlPath, body: docMarkdown(methodologyDoc(lang), lang, url) };
    if (kind === "benchmarks") {
      const snapshot = await loadBenchmarksSnapshot();
      return snapshot && snapshot.tables.length > 0
        ? { htmlPath, body: benchmarksMarkdown(snapshot, lang, url, CONTENT_UPDATED.benchmarks) }
        : null;
    }
    return null;
  }

  if (kind === "guides") {
    const g = guides.find((x) => x.slug === slug);
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
    try {
      const a = await getArticleBySlug(lang, slug);
      return a ? { htmlPath, body: articleMarkdown(a, url, articleUpdated(a)) } : null;
    } catch {
      return null;
    }
  }
  return null;
}
