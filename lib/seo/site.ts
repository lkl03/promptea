// lib/seo/site.ts
//
// Where the site lives and which locales it speaks. Everything that emits an
// absolute URL (sitemap, robots, llms.txt, JSON-LD, metadata) goes through here
// so there is exactly one answer to "what is our origin?".

import { DEFAULT_LANG, LANGS, LANG_TAG, isLang, type Lang } from "@/lib/domain";

/** The interface languages — lib/domain.ts LANGS is the single source of truth. */
export const LOCALES = LANGS;
export type Locale = Lang;

/**
 * The locale `hreflang="x-default"` points at: the page shown to users whose
 * language matches none of ours. English is the broader fallback.
 */
export const DEFAULT_LOCALE: Locale = DEFAULT_LANG;
export const X_DEFAULT_LOCALE: Locale = DEFAULT_LOCALE;

/**
 * hreflang values each locale is announced under. Spanish and English stay
 * region-neutral (as before v1.8.2); Portuguese is written for Brazil, so it is
 * announced as `pt-BR` and also as plain `pt` (the fallback for every other
 * Portuguese-speaking region, which has no page of its own).
 */
export const HREFLANG: Record<Locale, readonly string[]> = { es: ["es"], en: ["en"], pt: ["pt-BR", "pt"] };

/** BCP 47 tag of a locale: `<html lang>`, JSON-LD `inLanguage`, RSS `<language>`. */
export const LOCALE_TAG: Record<Locale, string> = LANG_TAG;

/** Matches the locale segment at the start of a locale-prefixed path. */
export const LOCALE_PREFIX_RE = new RegExp(`^/(${LOCALES.join("|")})(?=/|$)`);

/** Swap the locale segment of a locale-prefixed path: `/es/guides/x` → `/pt/guides/x`. */
export function swapLocale(path: string, lang: Locale): string {
  return path.replace(LOCALE_PREFIX_RE, `/${lang}`);
}

/** Public brand name, the same string in every locale. */
export const SITE_NAME = "Promptea";

/** The studio behind Promptea. */
export const STUDIO_NAME = "eterlab";
export const STUDIO_URL = "https://eterlab.co";

/** `og:locale` for each language. */
export const OG_LOCALE: Record<Locale, string> = { en: "en_US", es: "es_AR", pt: "pt_BR" };

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
  return isLang(x);
}
