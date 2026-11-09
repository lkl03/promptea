// lib/seo/site.ts
//
// Where the site lives and which locales it speaks. Everything that emits an
// absolute URL (sitemap, robots, llms.txt, JSON-LD, metadata) goes through here
// so there is exactly one answer to "what is our origin?".

export const LOCALES = ["es", "en"] as const;
export type Locale = (typeof LOCALES)[number];

/**
 * The locale `hreflang="x-default"` points at: the page shown to users whose
 * language matches none of ours. English is the broader fallback.
 */
export const DEFAULT_LOCALE: Locale = "en";
export const X_DEFAULT_LOCALE: Locale = DEFAULT_LOCALE;

/** Public brand name, the same string in both locales. */
export const SITE_NAME = "Promptea";

/** The studio behind Promptea. */
export const STUDIO_NAME = "eterlab";
export const STUDIO_URL = "https://eterlab.co";

/** `og:locale` for each language. */
export const OG_LOCALE: Record<Locale, string> = { en: "en_US", es: "es_AR" };

/**
 * IMPORTANT for SEO:
 * Set NEXT_PUBLIC_SITE_URL (or SITE_URL) in Vercel/production to the real
 * domain, e.g. https://promptea.me. A bare host gets `https://`; without any
 * variable the Vercel deployment URL is used, then localhost for development.
 */
export function getSiteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.SITE_URL?.trim() ||
    (process.env.VERCEL_URL?.trim() ? `https://${process.env.VERCEL_URL.trim()}` : "") ||
    "http://localhost:3000";
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return withProtocol.replace(/\/+$/, "");
}

export function absUrl(pathname: string): string {
  const clean = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return new URL(clean, getSiteUrl()).toString();
}

export function isLocale(x: string): x is Locale {
  return (LOCALES as readonly string[]).includes(x);
}
