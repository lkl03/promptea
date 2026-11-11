// lib/seo/metadata.ts
//
// One builder for the per-page <head> so every page states the same things the
// same way: a canonical URL, hreflang alternates for EVERY locale plus
// `x-default`, Open Graph and Twitter tags that match the title/description, and
// (when the page has one) the markdown twin as `<link rel="alternate"
// type="text/markdown">`.
//
// Why a helper: the layout used to declare a canonical (the locale home) that
// every page without its own `alternates` inherited, so those pages told search
// engines they were duplicates of the home page. The layout now sets none; each
// page states its own through this function.
//
// Relative paths are resolved against `metadataBase` (set in the layout).

import type { Metadata } from "next";
import { CONTENT_LANGS, type ContentLang } from "@/lib/domain";
import { HREFLANG, LOCALES, OG_LOCALE, SITE_NAME, X_DEFAULT_LOCALE, swapLocale, type Locale } from "./site";

export type PageMetadataInput = {
  lang: Locale;
  /** Locale-prefixed path of THIS page, e.g. `/en/guides/json-output`. */
  path: string;
  title: string;
  description: string;
  /**
   * Use the title verbatim instead of letting the layout template append
   * " · Promptea" (for titles that already carry the brand).
   */
  absoluteTitle?: boolean;
  type?: "website" | "article";
  /** Path of this page in each locale when the slug differs per locale (articles). */
  alternatePaths?: Partial<Record<Locale, string>>;
  /** ISO instants/days; emitted as article:published_time / modified_time. */
  publishedTime?: string;
  modifiedTime?: string;
  authors?: string[];
  /**
   * Explicit image URLs. Omitted: the locale's default card
   * (`/{lang}/opengraph-image`, `/{lang}/twitter-image`). A page that defines its
   * own `openGraph` does NOT inherit the layout's file-convention image, so the
   * default has to be stated here.
   */
  images?: Array<{ url: string; width?: number; height?: number; alt?: string }>;
  /** Path of the markdown version (`/en/guides/x.md`). */
  markdownPath?: string;
  noindex?: boolean;
  keywords?: string[];
  /**
   * Title for Open Graph / Twitter cards when it should differ from <title>
   * (e.g. the full headline of an edition whose <title> is clamped).
   */
  socialTitle?: string;
  /**
   * v1.8.2 — the language the page's CONTENT is written in, when the interface
   * language has no edition of its own (AI Daily and the weekly summary exist in
   * Spanish and English; under /pt they are shown in English). Stating it marks
   * the page as editorial: hreflang lists only the languages the content exists
   * in. When it also differs
   * from `lang` the page is a view of the original, and the head says so instead
   * of claiming a translation exists: canonical → the original, hreflang only for
   * the languages the content exists in, `og:locale` of the content, and no
   * markdown twin of its own.
   */
  contentLang?: ContentLang;
};

/** Longest <title> text (before " · Promptea") that search results show without cutting it. */
export const TITLE_MAX = 60;

/**
 * v1.8.1 — a headline that fits a <title>: cut at the last whole word within
 * `max` characters and closed with an ellipsis. Editorial headlines (weekly
 * editions) run past 120 characters; search engines cut them mid-word and
 * `npm run seo:check` rejects them. Short titles are returned untouched.
 */
export function clampTitle(text: string, max = TITLE_MAX): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const atWord = cut.lastIndexOf(" ");
  const head = (atWord > max * 0.5 ? cut.slice(0, atWord) : cut).replace(/[\s,;:.\-–—]+$/, "");
  return `${head}…`;
}

/**
 * hreflang map for a page that exists in `locales`: one entry per hreflang value
 * of each locale (`es`, `en`, `pt-BR` + `pt`) plus `x-default`.
 */
export function languageAlternates(
  pathFor: (lang: Locale) => string,
  locales: readonly Locale[] = LOCALES,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const l of locales) for (const tag of HREFLANG[l]) out[tag] = pathFor(l);
  out["x-default"] = pathFor(X_DEFAULT_LOCALE);
  return out;
}

/** Swap the locale segment of a locale-prefixed path: `/es/guides/x` → `/en/guides/x`. */
export function pathForLocale(path: string, lang: Locale): string {
  return swapLocale(path, lang);
}

export function pageMetadata(i: PageMetadataInput): Metadata {
  const pathIn = (l: Locale) => i.alternatePaths?.[l] ?? pathForLocale(i.path, l);
  // A view of content written in another language (see `contentLang`).
  const view = i.contentLang && i.contentLang !== i.lang ? i.contentLang : null;
  // Editorial content (any page that states its `contentLang`) exists in the
  // content languages only, so no page — not the es/en originals either —
  // announces a Portuguese alternate for it.
  const locales: readonly Locale[] = i.contentLang ? CONTENT_LANGS : LOCALES;
  const languages = languageAlternates(pathIn, locales);
  const canonical = view ? pathIn(view) : i.path;
  const ogLang: Locale = view ?? i.lang;

  // A title that already names the brand is used as is (no " · Promptea" suffix).
  const absolute = i.absoluteTitle || i.title.includes(SITE_NAME);
  const ogTitle = i.socialTitle ?? (absolute ? i.title : `${i.title} · ${SITE_NAME}`);
  const ogImages = i.images ?? [{ url: `/${i.lang}/opengraph-image`, width: 1200, height: 630, alt: SITE_NAME }];
  const twitterImages = i.images ? i.images.map((im) => im.url) : [`/${i.lang}/twitter-image`];
  const other = locales.filter((l) => l !== ogLang).map((l) => OG_LOCALE[l]);

  return {
    title: absolute ? { absolute: i.title } : i.title,
    description: i.description,
    ...(i.keywords ? { keywords: i.keywords } : {}),
    alternates: {
      canonical,
      languages,
      ...(i.markdownPath && !view ? { types: { "text/markdown": i.markdownPath } } : {}),
    },
    ...(i.noindex ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      type: i.type ?? "website",
      url: canonical,
      siteName: SITE_NAME,
      title: ogTitle,
      description: i.description,
      locale: OG_LOCALE[ogLang],
      alternateLocale: other,
      ...(i.type === "article"
        ? {
            ...(i.publishedTime ? { publishedTime: i.publishedTime } : {}),
            ...(i.modifiedTime ? { modifiedTime: i.modifiedTime } : {}),
            ...(i.authors ? { authors: i.authors } : {}),
          }
        : {}),
      images: ogImages,
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: i.description,
      images: twitterImages,
    },
  };
}
