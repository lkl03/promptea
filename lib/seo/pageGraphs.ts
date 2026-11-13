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
import { markdownPathOf, staticSeoUrls } from "./registry";
import { newest } from "./dates";
import type { NewsletterEdition } from "@/lib/newsletter/types";
import { weeklyArchivePath, weeklyEditionPath } from "@/lib/newsletter/paths";
import { absUrl, type Locale } from "./site";
import { pick, type ContentLang } from "@/lib/domain";

const home = (lang: Locale) => (pick(lang, { es: "Inicio", en: "Home", pt: "Início" }));

type Crumb = { name: string; path: string };

function crumbs(lang: Locale, trail: Crumb[]) {
  return [{ name: home(lang), url: absUrl(`/${lang}`) }, ...trail.map((c) => ({ name: c.name, url: absUrl(c.path) }))];
}

function faqItems(faq: Array<{ q: string; a: string }>) {
  return faq.map((f) => ({ question: f.q, answer: f.a }));
}

/**
 * The home page: a WebPage about the SoftwareApplication. v1.8.1: the HowTo and
 * the FAQPage moved with their visible text to /how-it-works (JSON-LD must
 * describe what the page shows, and the home no longer prints that text).
 */
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
  );
}

export type DocPageKind = "about" | "methodology" | "how-it-works" | "sources";

/** /about, /methodology, /how-it-works (which carries the HowTo of its steps) and /sources (v1.8.3: about the organization, like /about). */
export function docPageGraph(i: { doc: PageDoc; lang: Locale; path: string; kind: DocPageKind; label: string }): JsonLdNode {
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
      about: ref(i.kind === "about" || i.kind === "sources" ? entityIds().organization : entityIds().software),
      markdownUrl: absUrl(markdownPathOf(i.path)),
    }),
    i.kind === "methodology"
      ? articleNode({ lang: i.lang, url, headline: i.doc.h1, description: i.doc.description, dateModified: i.doc.updated, type: "TechArticle" })
      : null,
    breadcrumbNode(url, crumbs(i.lang, [{ name: i.label, path: i.path }])),
    i.kind === "how-it-works" && i.doc.steps ? howToNode(url, i.lang, { name: i.doc.steps.name, description: i.doc.description, steps: i.doc.steps.steps }) : null,
    faqNode(url, i.lang, faqItems(i.doc.faq)),
  );
}

export function guideGraph(g: Guide, lang: Locale, updated: string): JsonLdNode {
  const path = `/${lang}/guides/${g.slug}`;
  const url = absUrl(path);
  const guidesLabel = pick(lang, { es: "Guías", en: "Guides", pt: "Guias" });
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
  const label = pick(lang, { es: "Glosario", en: "Glossary", pt: "Glossário" });
  const setName = pick(lang, {
    es: "Glosario de prompt engineering",
    en: "Prompt engineering glossary",
    pt: "Glossário de engenharia de prompt",
  });
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
  const label = pick(lang, { es: "Modelos", en: "Models", pt: "Modelos" });
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
  const snap = i.snapshot;
  const asOf = snap ? snap.asOf ?? snap.fetchedAt : undefined;

  let dataset: JsonLdNode | null = null;
  if (snap && snap.tables.length > 0) {
    const models = new Set(snap.tables.flatMap((tb) => tb.rows.map((r) => r.modelId))).size;
    const sources = Array.from(new Set(snap.tables.map((tb) => SOURCE_INFO[tb.def.source].name)));
    dataset = datasetNode({
      lang: i.lang,
      url,
      name: pick(i.lang, {
        es: "Rankings de benchmarks de modelos de IA",
        en: "AI model benchmark rankings",
        pt: "Rankings de benchmarks de modelos de IA",
      }),
      description: pick(i.lang, {
        es: `${snap.tables.length} rankings de ${models} modelos de IA, uno por benchmark, con su propia métrica. Fuentes: ${sources.join(", ")}. Los puntajes de benchmarks distintos no se combinan.`,
        en: `${snap.tables.length} rankings covering ${models} AI models, one per benchmark, each with its own metric. Sources: ${sources.join(", ")}. Scores from different benchmarks are not combined.`,
        pt: `${snap.tables.length} rankings que cobrem ${models} modelos de IA, um por benchmark, cada um com sua própria métrica. Fontes: ${sources.join(", ")}. Pontuações de benchmarks diferentes não são combinadas.`,
      }),
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

/**
 * Pages whose copy lives in the content registry (tools, hubs, landings, legal):
 * a WebPage (a CollectionPage for the hubs that list other pages) with its
 * breadcrumb, built from the very same title/description/date that llms.txt and
 * the sitemap use. Returns null for a path the registry does not know, so a page
 * can never emit a graph for something that is not in the public index.
 */
export function registryPageGraph(lang: Locale, path: string, opts: { collection?: boolean; aboutSoftware?: boolean; parent?: Crumb } = {}): JsonLdNode | null {
  const entry = staticSeoUrls(lang).find((u) => u.path === path);
  if (!entry) return null;
  const url = absUrl(path);
  return graph(
    webPageNode({
      lang,
      url,
      name: entry.title,
      description: entry.description,
      type: opts.collection ? "CollectionPage" : "WebPage",
      dateModified: entry.updated,
      hasBreadcrumb: true,
      about: opts.aboutSoftware ? ref(entityIds().software) : undefined,
      markdownUrl: entry.markdown ? absUrl(markdownPathOf(path)) : undefined,
    }),
    breadcrumbNode(url, crumbs(lang, [...(opts.parent ? [opts.parent] : []), { name: entry.title, path }])),
  );
}

/**
 * One Promptea Weekly edition page: the page, an Article whose headline is the
 * edition's hero headline (the page's <h1>), and the breadcrumb
 * Home › AI Daily › Weekly › edition. Dates are the edition's own: published
 * (else sent, else the week's last day) and last sent/published.
 */
export function weeklyEditionGraph(e: NewsletterEdition, lang: ContentLang): JsonLdNode {
  const c = e.locales[lang];
  const path = weeklyEditionPath(lang, e.editionId);
  const url = absUrl(path);
  const es = lang === "es";
  const published = e.publishedAt ?? e.sentAt ?? e.weekEnd;
  const modified = newest(e.sentAt, e.publishedAt, e.weekEnd) ?? e.weekEnd;
  return graph(
    webPageNode({
      lang,
      url,
      name: c.heroHeadline,
      description: c.preheader,
      datePublished: published,
      dateModified: modified,
      hasBreadcrumb: true,
    }),
    articleNode({ lang, url, headline: c.heroHeadline, description: c.preheader, datePublished: published, dateModified: modified, articleSection: es ? "Semanal" : "Weekly" }),
    breadcrumbNode(
      url,
      crumbs(lang, [
        { name: "AI Daily", path: `/${lang}/blog` },
        { name: es ? "Semanal" : "Weekly", path: weeklyArchivePath(lang) },
        { name: c.heroHeadline, path },
      ]),
    ),
  );
}
