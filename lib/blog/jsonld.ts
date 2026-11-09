// lib/blog/jsonld.ts
//
// v1.4.0 — structured data for AI Daily.
//
// Every builder here is PURE and SYNCHRONOUS: given an article (or a handful of
// strings) it returns a plain object. Nothing reads Firestore, nothing awaits,
// nothing touches the DOM. That makes each one trivially unit-testable and
// keeps the pages that emit them free of async ceremony.
//
// Two editorial rules constrain what may appear here:
//
//   1. TRUTHFUL TYPES. The article path uses `NewsArticle` because AI Daily is
//      genuinely time-sensitive reporting on a same-day event — that is what
//      the schema type means. It is not `Review`, `HowTo` or `FAQPage`.
//   2. NO INVENTED SIGNALS. Only properties whose values are actually rendered
//      on the page are emitted. There is no aggregateRating, no fabricated
//      human byline (the author is the Organization named in BLOG_AUTHOR), and
//      no metric the reader cannot see for themselves.
//
// The consuming page serializes the result with JSON.stringify inside a
// <script type="application/ld+json"> tag — the one sanctioned use of
// dangerouslySetInnerHTML in this codebase. Article prose never goes near it.

import { BLOG_AUTHOR } from "@/lib/domain";
import type { Lang } from "@/lib/domain";
import { getSiteUrl } from "@/lib/seo/site";
import { entityIds, pageId } from "@/lib/seo/jsonld";
import type { ArticleCard, PublicArticle } from "@/lib/blog/types";

/** The publishing organization, as shown in the site header and footer. */
export const PUBLISHER_NAME = "Promptea";

/** Human label for the section, used in breadcrumbs. Same string in both locales. */
export const BLOG_SECTION_LABEL: Record<Lang, string> = {
  es: "AI Daily",
  en: "AI Daily",
};

/**
 * Publisher logo: the 512×512 brand icon (Google asks for a PNG of at least
 * 112×112 for article publishers). Callers can pass `logoUrl` to override it.
 */
export const DEFAULT_PUBLISHER_LOGO_PATH = "/brand/icon-512.png";

/** JSON-LD is untyped by nature; this alias keeps the intent readable. */
type JsonLd = Record<string, unknown>;

// ---------------------------------------------------------------------------
// URL helpers — shared by the pages, the feed and the sitemap so the blog's
// URL shape is defined in exactly one place.
// ---------------------------------------------------------------------------

export function blogIndexPath(lang: Lang): string {
  return `/${lang}/blog`;
}

export function blogArticlePath(lang: Lang, slug: string): string {
  return `/${lang}/blog/${slug}`;
}

export function blogFeedPath(lang: Lang): string {
  return `/${lang}/blog/feed.xml`;
}

function origin(siteUrl?: string): string {
  return (siteUrl ?? getSiteUrl()).replace(/\/+$/, "");
}

function abs(siteUrl: string | undefined, path: string): string {
  return `${origin(siteUrl)}${path.startsWith("/") ? path : `/${path}`}`;
}

// ---------------------------------------------------------------------------
// Headline
// ---------------------------------------------------------------------------

/**
 * Clamp a headline to `max` characters on a word boundary.
 *
 * Google truncates `headline` past ~110 characters and flags longer values, so
 * we cut deliberately rather than let the crawler do it mid-word. The returned
 * string (ellipsis included) is never longer than `max`.
 */
export function truncateHeadline(s: string, max = 110): string {
  const clean = s.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;

  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  const body = lastSpace > Math.floor(max / 2) ? cut.slice(0, lastSpace) : cut;
  return `${body.trimEnd()}…`;
}

// ---------------------------------------------------------------------------
// NewsArticle
// ---------------------------------------------------------------------------

export type ArticleJsonLdOptions = {
  /** Absolute canonical URL of the article page. */
  url: string;
  /** Absolute site origin, e.g. `https://promptea.me`. */
  siteUrl: string;
  /** Absolute URL of the generated cover (the opengraph-image route). */
  imageUrl: string;
  /** Optional override for the publisher logo. */
  logoUrl?: string;
};

/**
 * Structured data for one article.
 *
 * Dates: `publishedAt` is an ISO instant when Firestore has resolved the server
 * timestamp and null while it has not. `eventDate` (`YYYY-MM-DD`) is a valid
 * ISO-8601 date on its own, so it is the fallback rather than emitting null —
 * a NewsArticle without datePublished is invalid.
 */
export function newsArticleNode(
  article: PublicArticle,
  opts: ArticleJsonLdOptions
): JsonLd {
  const site = origin(opts.siteUrl);
  const datePublished = article.publishedAt ?? article.eventDate;
  const dateModified = article.updatedAt ?? datePublished;

  const ids = entityIds(site);
  const jsonLd: JsonLd = {
    "@type": "NewsArticle",
    "@id": pageId(opts.url, "article"),
    mainEntityOfPage: { "@type": "WebPage", "@id": pageId(opts.url, "webpage") },
    url: opts.url,
    headline: truncateHeadline(article.title),
    description: article.summary || article.metaDescription,
    image: [opts.imageUrl],
    datePublished,
    dateModified,
    inLanguage: article.lang,
    articleSection: article.category,
    // Truthful: there is no paywall and no registration wall on AI Daily.
    isAccessibleForFree: true,
    // The byline is an organization (never an invented person) and the same
    // node as the site-wide editorial entity; the publisher is Promptea itself.
    author: {
      "@type": "Organization",
      "@id": ids.editorial,
      name: BLOG_AUTHOR,
      url: site,
    },
    publisher: {
      "@type": "Organization",
      "@id": ids.organization,
      name: PUBLISHER_NAME,
      url: site,
      logo: {
        "@type": "ImageObject",
        url: opts.logoUrl ?? `${site}${DEFAULT_PUBLISHER_LOGO_PATH}`,
      },
    },
  };

  // Everything below is conditional: an absent value is omitted rather than
  // emitted as null or an empty array.
  if (article.tags.length > 0) {
    jsonLd.keywords = article.tags.join(", ");
  }

  if (article.readingMinutes > 0) {
    jsonLd.timeRequired = `PT${article.readingMinutes}M`;
  }

  // The companies are listed on the page ("Companies"), so naming them is a
  // description of visible content.
  if (article.companies.length > 0) {
    jsonLd.mentions = article.companies.map((name) => ({ "@type": "Organization", name }));
  }

  // The sources block is rendered on the page, so citing it is a description of
  // what a reader can see rather than an SEO-only claim.
  if (article.sources.length > 0) {
    jsonLd.citation = article.sources.map((s) => ({
      "@type": "CreativeWork",
      name: s.title,
      url: s.url,
      publisher: { "@type": "Organization", name: s.publisher },
    }));
  }

  if (article.correction?.note) {
    jsonLd.correction = article.correction.note;
  }

  return jsonLd;
}

/** Standalone document form of {@link newsArticleNode}. */
export function newsArticleJsonLd(article: PublicArticle, opts: ArticleJsonLdOptions): JsonLd {
  return { "@context": "https://schema.org", ...newsArticleNode(article, opts) };
}

// ---------------------------------------------------------------------------
// Breadcrumbs
// ---------------------------------------------------------------------------

export type BlogBreadcrumbInput = {
  lang: Lang;
  /** The article headline, as rendered in the <h1>. */
  title: string;
  /** The article's locale slug. */
  slug: string;
  /** Absolute site origin; defaults to getSiteUrl(). */
  siteUrl?: string;
};

/**
 * Home > AI Daily > article. Mirrors the BreadcrumbList already emitted by
 * app/[lang]/guides/[slug]/page.tsx, with absolute `item` URLs so the graph is
 * unambiguous regardless of where the crawler resolved the page.
 */
export function blogBreadcrumbNode(input: BlogBreadcrumbInput): JsonLd {
  const { lang, title, slug, siteUrl } = input;

  return {
    "@type": "BreadcrumbList",
    "@id": pageId(abs(siteUrl, blogArticlePath(lang, slug)), "breadcrumb"),
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: lang === "es" ? "Inicio" : "Home",
        item: abs(siteUrl, `/${lang}`),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: BLOG_SECTION_LABEL[lang],
        item: abs(siteUrl, blogIndexPath(lang)),
      },
      {
        "@type": "ListItem",
        position: 3,
        name: truncateHeadline(title, 160),
        item: abs(siteUrl, blogArticlePath(lang, slug)),
      },
    ],
  };
}

/** Standalone document form of {@link blogBreadcrumbNode}. */
export function blogBreadcrumbJsonLd(input: BlogBreadcrumbInput): JsonLd {
  return { "@context": "https://schema.org", ...blogBreadcrumbNode(input) };
}

// ---------------------------------------------------------------------------
// Index / collection
// ---------------------------------------------------------------------------

/**
 * The minimum an index entry needs. `ArticleCard` satisfies this structurally,
 * so the index page can pass its cards straight through.
 */
export type BlogIndexItem = Pick<ArticleCard, "title" | "slug" | "publishedAt" | "eventDate">;

export type BlogIndexJsonLdInput = {
  lang: Lang;
  /** The <h1> of the index page. */
  title: string;
  /** The visible standfirst of the index page. */
  description: string;
  /** The articles actually listed on the page. */
  items?: readonly BlogIndexItem[];
  siteUrl?: string;
};

/**
 * Structured data for /[lang]/blog — a `Blog` whose page is a `CollectionPage`.
 * `blogPost` is emitted only for articles that are genuinely listed, so the
 * markup never claims more coverage than the page shows.
 */
export function blogIndexJsonLd(input: BlogIndexJsonLdInput): JsonLd {
  const url = abs(input.siteUrl, blogIndexPath(input.lang));
  const site = origin(input.siteUrl);

  const jsonLd: JsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    "@id": url,
    url,
    name: input.title,
    description: input.description,
    inLanguage: input.lang,
    mainEntityOfPage: { "@type": "CollectionPage", "@id": url },
    publisher: {
      "@type": "Organization",
      name: PUBLISHER_NAME,
      url: site,
    },
  };

  const items = input.items ?? [];
  if (items.length > 0) {
    jsonLd.blogPost = items.map((item) => ({
      "@type": "BlogPosting",
      headline: truncateHeadline(item.title),
      url: abs(input.siteUrl, blogArticlePath(input.lang, item.slug)),
      datePublished: item.publishedAt ?? item.eventDate,
    }));
  }

  return jsonLd;
}
