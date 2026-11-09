// lib/seo/pageGraphs.ts
//
// The JSON-LD graph of each kind of page, assembled from the same data the page
// renders. Pure functions (no I/O) so tests and scripts/seo-check.mjs can check
// them, and so every page type connects to the site-wide entities in the same
// way: WebPage → isPartOf WebSite, publisher Organization, optional breadcrumb,
// FAQ and a type-specific node.

import type { Guide } from "@/lib/seo/content/guides";
import type { GlossaryTerm } from "@/lib/seo/content/glossary";
import type { ModelPage } from "@/lib/seo/content/models";
import type { PageDoc } from "./content/sitePages";
import { entityIds, articleNode, datasetNode, breadcrumbNode, definedTermNode, faqNode, graph, howToNode, pageId, ref, webPageNode, type JsonLdNode } from "./jsonld";
import { SOURCE_INFO, CATEGORY_LABELS } from "@/lib/benchmarks/catalog";
import type { BenchmarksSnapshot } from "@/lib/benchmarks/normalize";
import { markdownPathOf } from "./registry";
import { absUrl, type Locale } from "./site";

const home = (lang: Locale) => (lang === "es" ? "Inicio" : "Home");

type Crumb = { name: string; path: string };

function crumbs(lang: Locale, trail: Crumb[]) {
  return [{ name: home(lang), url: absUrl(`/${lang}`) }, ...trail.map((c) => ({ name: c.name, url: absUrl(c.path) }))];
}

function faqItems(faq: Array<{ q: string; a: string }>) {
  return faq.map((f) => ({ question: f.q, answer: f.a }));
}

/** The home page: WebPage about the SoftwareApplication, FAQ and HowTo. */
export function homeGraph(doc: PageDoc, lang: Locale): JsonLdNode {
  const url = absUrl(`/${lang}`);
  return graph(
    webPageNode({
      lang,
      url,
      name: doc.title,
      description: doc.description,
      dateModified: doc.updated,
      about: ref(entityIds().software),
      markdownUrl: absUrl(markdownPathOf(`/${lang}`)),
    }),
    doc.steps ? howToNode(url, lang, { name: doc.steps.name, description: doc.description, steps: doc.steps.steps }) : null,
    faqNode(url, lang, faqItems(doc.faq)),
  );
}

/** /about and /methodology. */
export function docPageGraph(i: { doc: PageDoc; lang: Locale; path: string; kind: "about" | "methodology"; label: string }): JsonLdNode {
  const url = absUrl(i.path);
  return graph(
    webPageNode({
      lang: i.lang,
      url,
      name: i.doc.h1,
      description: i.doc.description,
      type: i.kind === "about" ? "AboutPage" : "WebPage",
      dateModified: i.doc.updated,
      hasBreadcrumb: true,
      about: ref(i.kind === "about" ? entityIds().organization : entityIds().software),
      markdownUrl: absUrl(markdownPathOf(i.path)),
    }),
    i.kind === "methodology"
      ? articleNode({ lang: i.lang, url, headline: i.doc.h1, description: i.doc.description, dateModified: i.doc.updated, type: "TechArticle" })
      : null,
    breadcrumbNode(url, crumbs(i.lang, [{ name: i.label, path: i.path }])),
    faqNode(url, i.lang, faqItems(i.doc.faq)),
  );
}

export function guideGraph(g: Guide, lang: Locale, updated: string): JsonLdNode {
  const path = `/${lang}/guides/${g.slug}`;
  const url = absUrl(path);
  const guidesLabel = lang === "es" ? "Guías" : "Guides";
  return graph(
    webPageNode({
      lang,
      url,
      name: g.title[lang],
      description: g.description[lang],
      dateModified: updated,
      hasBreadcrumb: true,
      markdownUrl: absUrl(markdownPathOf(path)),
    }),
    articleNode({ lang, url, headline: g.title[lang], description: g.description[lang], dateModified: updated, articleSection: guidesLabel }),
    breadcrumbNode(url, crumbs(lang, [{ name: guidesLabel, path: `/${lang}/guides` }, { name: g.title[lang], path }])),
    faqNode(url, lang, g.faq.map((f) => ({ question: f.q[lang], answer: f.a[lang] }))),
  );
}

export function glossaryGraph(term: GlossaryTerm, lang: Locale, updated: string): JsonLdNode {
  const path = `/${lang}/glossary/${term.slug}`;
  const url = absUrl(path);
  const setUrl = absUrl(`/${lang}/glossary`);
  const label = lang === "es" ? "Glosario" : "Glossary";
  const setName = lang === "es" ? "Glosario de prompt engineering" : "Prompt engineering glossary";
  const termNode = definedTermNode({ lang, url, name: term.title[lang], description: term.description[lang], setName, setUrl });
  return graph(
    webPageNode({
      lang,
      url,
      name: term.title[lang],
      description: term.description[lang],
      dateModified: updated,
      hasBreadcrumb: true,
      mainEntity: ref(pageId(url, "term")),
      markdownUrl: absUrl(markdownPathOf(path)),
    }),
    termNode,
    breadcrumbNode(url, crumbs(lang, [{ name: label, path: `/${lang}/glossary` }, { name: term.title[lang], path }])),
    faqNode(url, lang, term.faq.map((f) => ({ question: f.q[lang], answer: f.a[lang] }))),
  );
}

export function modelGraph(m: ModelPage, lang: Locale, updated: string): JsonLdNode {
  const path = `/${lang}/models/${m.slug}`;
  const url = absUrl(path);
  const label = lang === "es" ? "Modelos" : "Models";
  return graph(
    webPageNode({
      lang,
      url,
      name: m.title[lang],
      description: m.description[lang],
      dateModified: updated,
      hasBreadcrumb: true,
      markdownUrl: absUrl(markdownPathOf(path)),
    }),
    articleNode({ lang, url, headline: m.title[lang], description: m.description[lang], dateModified: updated, articleSection: label }),
    breadcrumbNode(url, crumbs(lang, [{ name: label, path: `/${lang}/models` }, { name: m.title[lang], path }])),
    faqNode(url, lang, m.faq.map((f) => ({ question: f.q[lang], answer: f.a[lang] }))),
  );
}

/**
 * /benchmarks: the page, its breadcrumb and — only when a snapshot is shown — a
 * Dataset describing exactly that snapshot (its "as of" date, the source and the
 * rankings it contains).
 */
export function benchmarksGraph(i: { lang: Locale; title: string; description: string; snapshot: BenchmarksSnapshot | null }): JsonLdNode {
  const path = `/${i.lang}/benchmarks`;
  const url = absUrl(path);
  const label = "Benchmarks";
  const es = i.lang === "es";
  const snap = i.snapshot;
  const asOf = snap ? snap.asOf ?? snap.fetchedAt : undefined;

  let dataset: JsonLdNode | null = null;
  if (snap && snap.tables.length > 0) {
    const models = new Set(snap.tables.flatMap((tb) => tb.rows.map((r) => r.modelId))).size;
    const sources = Array.from(new Set(snap.tables.map((tb) => SOURCE_INFO[tb.def.source].name)));
    dataset = datasetNode({
      lang: i.lang,
      url,
      name: es ? "Rankings de benchmarks de modelos de IA" : "AI model benchmark rankings",
      description: es
        ? `${snap.tables.length} rankings de ${models} modelos de IA, uno por benchmark, con su propia métrica. Fuentes: ${sources.join(", ")}. Los puntajes de benchmarks distintos no se combinan.`
        : `${snap.tables.length} rankings covering ${models} AI models, one per benchmark, each with its own metric. Sources: ${sources.join(", ")}. Scores from different benchmarks are not combined.`,
      dateModified: asOf,
      sourceName: "OpenRouter benchmarks API",
      sourceUrl: snap.sourceUrl ?? "https://openrouter.ai/benchmarks",
      measured: snap.tables.map((tb) => `${tb.def.label[i.lang]} (${CATEGORY_LABELS[tb.def.category][i.lang]})`),
      citation: snap.citation,
    });
  }

  return graph(
    webPageNode({
      lang: i.lang,
      url,
      name: i.title,
      description: i.description,
      type: "CollectionPage",
      dateModified: asOf,
      hasBreadcrumb: true,
      mainEntity: dataset ? ref(pageId(url, "dataset")) : undefined,
      markdownUrl: snap ? absUrl(markdownPathOf(path)) : undefined,
    }),
    dataset,
    breadcrumbNode(url, crumbs(i.lang, [{ name: label, path }])),
  );
}
