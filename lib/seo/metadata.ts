// lib/seo/metadata.ts
//
// One builder for the per-page <head> so every page states the same things the
// same way: a canonical URL, hreflang alternates for BOTH locales plus
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
import { LOCALES, OG_LOCALE, SITE_NAME, X_DEFAULT_LOCALE, type Locale } from "./site";

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
};

/** `{es, en, x-default}` for a path that is the same in both locales. */
export function languageAlternates(pathFor: (lang: Locale) => string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const l of LOCALES) out[l] = pathFor(l);
  out["x-default"] = pathFor(X_DEFAULT_LOCALE);
  return out;
}

/** Swap the locale segment of a locale-prefixed path: `/es/guides/x` → `/en/guides/x`. */
export function pathForLocale(path: string, lang: Locale): string {
  return path.replace(/^\/(es|en)(?=\/|$)/, `/${lang}`);
}

export function pageMetadata(i: PageMetadataInput): Metadata {
  const languages = i.alternatePaths
    ? languageAlternates((l) => i.alternatePaths?.[l] ?? pathForLocale(i.path, l))
    : languageAlternates((l) => pathForLocale(i.path, l));

  // A title that already names the brand is used as is (no " · Promptea" suffix).
  const absolute = i.absoluteTitle || i.title.includes(SITE_NAME);
  const ogTitle = absolute ? i.title : `${i.title} · ${SITE_NAME}`;
  const ogImages = i.images ?? [{ url: `/${i.lang}/opengraph-image`, width: 1200, height: 630, alt: SITE_NAME }];
  const twitterImages = i.images ? i.images.map((im) => im.url) : [`/${i.lang}/twitter-image`];
  const other = LOCALES.filter((l) => l !== i.lang).map((l) => OG_LOCALE[l]);

  return {
    title: absolute ? { absolute: i.title } : i.title,
    description: i.description,
    ...(i.keywords ? { keywords: i.keywords } : {}),
    alternates: {
      canonical: i.path,
      languages,
      ...(i.markdownPath ? { types: { "text/markdown": i.markdownPath } } : {}),
    },
    ...(i.noindex ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      type: i.type ?? "website",
      url: i.path,
      siteName: SITE_NAME,
      title: ogTitle,
      description: i.description,
      locale: OG_LOCALE[i.lang],
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
