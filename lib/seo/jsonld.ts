// lib/seo/jsonld.ts
//
// Structured data for the whole site, built as ONE connected graph.
//
// Every entity has a stable `@id` derived from the site origin, so a node
// emitted in one place (the layout's Organization, a page's WebPage, an
// article's author) is the same node wherever it is referenced:
//
//   {origin}/#organization      Promptea (the brand / publisher)
//   {origin}/#website           the WebSite
//   {origin}/#software          the SoftwareApplication
//   {origin}/#editorial         "Promptea Editorial", the AI Daily byline
//   {origin}/#logo              the brand logo
//   {STUDIO_URL}/#organization  eterlab, the studio behind it (parentOrganization)
//   {page URL}#webpage          the page itself (+ #breadcrumb, #faq, #howto, #dataset…)
//
// Rules this file enforces for its callers:
//   - Pure and synchronous: given data, return plain objects. No I/O.
//   - Only describe what the page renders. Builders take the same strings the
//     page prints (FAQ text, headings, dates); they never add claims of their
//     own, no ratings, no review counts.
//   - Serialize with `serializeLd`, which stays valid JSON and cannot close the
//     surrounding <script> tag.

import { BLOG_AUTHOR } from "@/lib/domain";
import { getXLinks } from "@/lib/social";
import { LOCALES, LOCALE_TAG, SITE_NAME, STUDIO_NAME, STUDIO_URL, getSiteUrl, type Locale } from "./site";

export type JsonLdNode = Record<string, unknown>;

/** Stable, human-readable JSON for diffing/debugging (kept for existing callers). */
export function jsonLd<T extends object>(obj: T): string {
  return JSON.stringify(obj, null, 2);
}

/**
 * JSON for a <script type="application/ld+json"> body. `<`, `>` and `&` are
 * escaped as \u00XX (still the same JSON value) so no string can ever contain
 * `</script>`; U+2028/2029 are escaped for old parsers.
 */
export function serializeLd(data: object): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(new RegExp(String.fromCharCode(0x2028), "g"), "\\u2028")
    .replace(new RegExp(String.fromCharCode(0x2029), "g"), "\\u2029");
}

/** A `@graph` document from nodes (falsy entries are dropped). */
export function graph(...nodes: Array<JsonLdNode | null | undefined | false>): JsonLdNode {
  return { "@context": "https://schema.org", "@graph": nodes.filter(Boolean) };
}

// ---------------------------------------------------------------------------
// Identifiers
// ---------------------------------------------------------------------------

export function origin(siteUrl?: string): string {
  return (siteUrl ?? getSiteUrl()).replace(/\/+$/, "");
}

export function entityIds(siteUrl?: string) {
  const o = origin(siteUrl);
  return {
    organization: `${o}/#organization`,
    studio: `${STUDIO_URL}/#organization`,
    website: `${o}/#website`,
    software: `${o}/#software`,
    editorial: `${o}/#editorial`,
    logo: `${o}/#logo`,
  } as const;
}

export type PageFragment = "webpage" | "breadcrumb" | "faq" | "howto" | "dataset" | "article" | "term" | "blog";

/** `{page URL}#fragment` for the nodes that belong to one page. */
export function pageId(url: string, fragment: PageFragment): string {
  return `${url.replace(/#.*$/, "")}#${fragment}`;
}

export const ref = (id: string): JsonLdNode => ({ "@id": id });

// ---------------------------------------------------------------------------
// Site-wide entities (emitted by the layout on every page)
// ---------------------------------------------------------------------------

export function logoNode(siteUrl?: string): JsonLdNode {
  const o = origin(siteUrl);
  return {
    "@type": "ImageObject",
    "@id": entityIds(o).logo,
    url: `${o}/brand/icon-512.png`,
    contentUrl: `${o}/brand/icon-512.png`,
    width: 512,
    height: 512,
    caption: SITE_NAME,
  };
}

/** Promptea as an organization. `sameAs` lists only profiles that are configured. */
export function organizationNode(siteUrl?: string): JsonLdNode {
  const o = origin(siteUrl);
  const ids = entityIds(o);
  const x = getXLinks();
  const sameAs = x.handle ? [x.url] : [];

  return {
    "@type": "Organization",
    "@id": ids.organization,
    name: SITE_NAME,
    url: o,
    logo: ref(ids.logo),
    image: ref(ids.logo),
    parentOrganization: ref(ids.studio),
    ...(sameAs.length > 0 ? { sameAs } : {}),
  };
}

/** The studio that designs and develops Promptea. */
export function studioNode(): JsonLdNode {
  return {
    "@type": "Organization",
    "@id": entityIds().studio,
    name: STUDIO_NAME,
    url: STUDIO_URL,
  };
}

export function websiteNode(siteUrl?: string): JsonLdNode {
  const o = origin(siteUrl);
  const ids = entityIds(o);
  return {
    "@type": "WebSite",
    "@id": ids.website,
    url: o,
    name: SITE_NAME,
    inLanguage: LOCALES.map((l) => LOCALE_TAG[l]),
    publisher: ref(ids.organization),
  };
}

const FEATURES: Record<Locale, string[]> = {
  en: [
    "Prompt score from 0 to 100 on six criteria",
    "Findings and recommendations for each prompt",
    "Optimized prompt for GPT, Claude, Gemini, Grok, Kimi, DeepSeek and Perplexity",
    "Best-AI recommendation for a task",
    "AI Daily: one verified AI story a day",
    "AI model benchmarks with source and date",
  ],
  es: [
    "Puntaje de 0 a 100 en seis criterios",
    "Hallazgos y recomendaciones para cada prompt",
    "Prompt optimizado para GPT, Claude, Gemini, Grok, Kimi, DeepSeek y Perplexity",
    "Recomendación de la mejor IA para una tarea",
    "IA al Día: una noticia de IA verificada por día",
    "Benchmarks de modelos de IA con fuente y fecha",
  ],
  pt: [
    "Prompt score from 0 to 100 on six criteria",
    "Findings and recommendations for each prompt",
    "Optimized prompt for GPT, Claude, Gemini, Grok, Kimi, DeepSeek and Perplexity",
    "Best-AI recommendation for a task",
    "AI Daily: one verified AI story a day",
    "AI model benchmarks with source and date",
  ],
};

export function softwareApplicationNode(lang: Locale, description: string, siteUrl?: string): JsonLdNode {
  const o = origin(siteUrl);
  const ids = entityIds(o);
  return {
    "@type": "SoftwareApplication",
    "@id": ids.software,
    name: SITE_NAME,
    description,
    url: `${o}/${lang}`,
    applicationCategory: "ProductivityApplication",
    operatingSystem: "Web",
    inLanguage: LOCALES.map((l) => LOCALE_TAG[l]),
    isAccessibleForFree: true,
    featureList: FEATURES[lang],
    image: ref(ids.logo),
    publisher: ref(ids.organization),
    creator: ref(ids.studio),
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
  };
}

/** What the layout emits on every page. */
export function siteGraph(lang: Locale, description: string, siteUrl?: string): JsonLdNode {
  return graph(
    organizationNode(siteUrl),
    studioNode(),
    logoNode(siteUrl),
    websiteNode(siteUrl),
    softwareApplicationNode(lang, description, siteUrl),
  );
}

// ---------------------------------------------------------------------------
// Page-level nodes
// ---------------------------------------------------------------------------

export type WebPageInput = {
  lang: Locale;
  /** Absolute canonical URL. */
  url: string;
  name: string;
  description: string;
  /** schema.org type; defaults to WebPage. */
  type?: "WebPage" | "AboutPage" | "CollectionPage";
  datePublished?: string;
  dateModified?: string;
  /** Link the BreadcrumbList node (see `breadcrumbNode`) as `breadcrumb`. */
  hasBreadcrumb?: boolean;
  /** What this page is mainly about / its main entity. */
  about?: JsonLdNode;
  mainEntity?: JsonLdNode;
  /** Markdown twin of the page, when one exists. */
  markdownUrl?: string;
  siteUrl?: string;
};

export function webPageNode(i: WebPageInput): JsonLdNode {
  const ids = entityIds(i.siteUrl);
  return {
    "@type": i.type ?? "WebPage",
    "@id": pageId(i.url, "webpage"),
    url: i.url,
    name: i.name,
    description: i.description,
    inLanguage: LOCALE_TAG[i.lang],
    isPartOf: ref(ids.website),
    publisher: ref(ids.organization),
    ...(i.datePublished ? { datePublished: i.datePublished } : {}),
    ...(i.dateModified ? { dateModified: i.dateModified } : {}),
    ...(i.hasBreadcrumb ? { breadcrumb: ref(pageId(i.url, "breadcrumb")) } : {}),
    ...(i.about ? { about: i.about } : {}),
    ...(i.mainEntity ? { mainEntity: i.mainEntity } : {}),
    ...(i.markdownUrl
      ? { encoding: { "@type": "MediaObject", encodingFormat: "text/markdown", contentUrl: i.markdownUrl } }
      : {}),
  };
}

export function breadcrumbNode(url: string, items: Array<{ name: string; url: string }>): JsonLdNode {
  return {
    "@type": "BreadcrumbList",
    "@id": pageId(url, "breadcrumb"),
    itemListElement: items.map((it, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: it.name,
      item: it.url,
    })),
  };
}

export function faqNode(url: string, lang: Locale, items: Array<{ question: string; answer: string }>): JsonLdNode | null {
  if (items.length === 0) return null;
  return {
    "@type": "FAQPage",
    "@id": pageId(url, "faq"),
    url,
    inLanguage: LOCALE_TAG[lang],
    isPartOf: ref(pageId(url, "webpage")),
    mainEntity: items.map((qa) => ({
      "@type": "Question",
      name: qa.question,
      acceptedAnswer: { "@type": "Answer", text: qa.answer },
    })),
  };
}

export function howToNode(
  url: string,
  lang: Locale,
  input: { name: string; description?: string; steps: Array<{ name: string; text: string }> },
): JsonLdNode {
  return {
    "@type": "HowTo",
    "@id": pageId(url, "howto"),
    name: input.name,
    inLanguage: LOCALE_TAG[lang],
    ...(input.description ? { description: input.description } : {}),
    isPartOf: ref(pageId(url, "webpage")),
    step: input.steps.map((s, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: s.name,
      text: s.text,
    })),
  };
}

/** A guide or explainer. Authored by the Promptea organization, not a made-up person. */
export function articleNode(i: {
  lang: Locale;
  url: string;
  headline: string;
  description: string;
  dateModified: string;
  datePublished?: string;
  articleSection?: string;
  type?: "Article" | "TechArticle";
  siteUrl?: string;
}): JsonLdNode {
  const ids = entityIds(i.siteUrl);
  return {
    "@type": i.type ?? "Article",
    "@id": pageId(i.url, "article"),
    headline: i.headline.length > 110 ? `${i.headline.slice(0, 109).trimEnd()}…` : i.headline,
    description: i.description,
    inLanguage: LOCALE_TAG[i.lang],
    mainEntityOfPage: ref(pageId(i.url, "webpage")),
    isPartOf: ref(pageId(i.url, "webpage")),
    dateModified: i.dateModified,
    datePublished: i.datePublished ?? i.dateModified,
    isAccessibleForFree: true,
    ...(i.articleSection ? { articleSection: i.articleSection } : {}),
    author: ref(ids.organization),
    publisher: ref(ids.organization),
  };
}

export function definedTermNode(i: {
  lang: Locale;
  url: string;
  name: string;
  description: string;
  setName: string;
  setUrl: string;
}): JsonLdNode {
  return {
    "@type": "DefinedTerm",
    "@id": pageId(i.url, "term"),
    name: i.name,
    description: i.description,
    url: i.url,
    inLanguage: LOCALE_TAG[i.lang],
    inDefinedTermSet: { "@type": "DefinedTermSet", "@id": `${i.setUrl}#termset`, name: i.setName, url: i.setUrl },
  };
}

/** A Dataset for the benchmarks snapshot actually shown on the page. */
export function datasetNode(i: {
  lang: Locale;
  url: string;
  name: string;
  description: string;
  /** The snapshot's "as of" instant or day. */
  dateModified?: string | null;
  sourceName: string;
  sourceUrl: string;
  measured: string[];
  citation?: string | null;
  siteUrl?: string;
}): JsonLdNode {
  const ids = entityIds(i.siteUrl);
  return {
    "@type": "Dataset",
    "@id": pageId(i.url, "dataset"),
    name: i.name,
    description: i.description,
    url: i.url,
    inLanguage: LOCALE_TAG[i.lang],
    isAccessibleForFree: true,
    creator: ref(ids.organization),
    publisher: ref(ids.organization),
    isBasedOn: { "@type": "Dataset", name: i.sourceName, url: i.sourceUrl },
    variableMeasured: i.measured.map((name) => ({ "@type": "PropertyValue", name })),
    ...(i.dateModified ? { dateModified: i.dateModified } : {}),
    ...(i.citation ? { citation: i.citation } : {}),
  };
}

/** The AI Daily byline: an organization, never an invented person. */
export function editorialNode(siteUrl?: string): JsonLdNode {
  const ids = entityIds(siteUrl);
  return {
    "@type": "Organization",
    "@id": ids.editorial,
    name: BLOG_AUTHOR,
    url: origin(siteUrl),
    parentOrganization: ref(ids.organization),
  };
}

// ---------------------------------------------------------------------------
// Standalone documents (kept for existing callers)
// ---------------------------------------------------------------------------

export function breadcrumbJsonLd(items: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: it.name,
      item: it.url,
    })),
  };
}

export function faqJsonLd(items: Array<{ question: string; answer: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((qa) => ({
      "@type": "Question",
      name: qa.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: qa.answer,
      },
    })),
  };
}
