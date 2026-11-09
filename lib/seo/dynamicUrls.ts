// lib/seo/dynamicUrls.ts
//
// Pure mappers from database-backed content (AI Daily articles, weekly digest
// editions) to registry URLs. No I/O here, so they are unit-testable; the
// loaders live in lib/seo/dynamic.ts.

import type { PublicArticle } from "@/lib/blog/types";
import type { NewsletterEdition } from "@/lib/newsletter/types";
import { weeklyEditionPath } from "@/lib/newsletter/paths";
import { newest, toDay } from "./dates";
import type { SeoUrl } from "./registry";
import type { Locale } from "./site";

export function articlePath(lang: Locale, slug: string): string {
  return `/${lang}/blog/${slug}`;
}

/** The instant an article last changed: correction/update time, else publication, else its event day. */
export function articleUpdated(a: Pick<PublicArticle, "updatedAt" | "publishedAt" | "eventDate">): string {
  return newest(a.updatedAt, a.publishedAt) ?? a.eventDate;
}

export function articleUrl(a: PublicArticle): SeoUrl {
  return {
    lang: a.lang,
    path: articlePath(a.lang, a.slug),
    section: "ai-daily",
    title: a.title,
    description: a.metaDescription || a.summary,
    updated: articleUpdated(a),
    changeFrequency: "weekly",
    priority: 0.7,
    alternates: {
      es: articlePath("es", a.alternateSlugs.es),
      en: articlePath("en", a.alternateSlugs.en),
    },
    markdown: true,
  };
}

export function editionUrl(e: NewsletterEdition, lang: Locale): SeoUrl {
  const c = e.locales[lang];
  return {
    lang,
    path: weeklyEditionPath(lang, e.editionId),
    section: "ai-daily",
    title: c.heroHeadline,
    description: c.preheader,
    updated: newest(e.sentAt, e.publishedAt, e.weekEnd) ?? e.weekEnd,
    changeFrequency: "monthly",
    priority: 0.6,
  };
}

/** Day-precision "latest change" across a list of URLs, for index pages. */
export function latestUpdated(urls: Array<Pick<SeoUrl, "updated">>): string | undefined {
  return newest(...urls.map((u) => u.updated));
}

export { toDay };
