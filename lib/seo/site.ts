export const LOCALES = ["es", "en"] as const;
export type Locale = (typeof LOCALES)[number];

// The app currently redirects / -> /en, but this is only used for SEO helpers.
export const DEFAULT_LOCALE: Locale = "en";

/**
 * IMPORTANT for SEO:
 * Set NEXT_PUBLIC_SITE_URL (or SITE_URL) in Vercel/production to your real domain,
 * e.g. https://promptea.com
 */
export function getSiteUrl(): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL;
  const url = (env && env.trim()) || "http://localhost:3000";
  return url.replace(/\/+$/, "");
}

export function absUrl(pathname: string): string {
  const clean = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return new URL(clean, getSiteUrl()).toString();
}

export function isLocale(x: string): x is Locale {
  return (LOCALES as readonly string[]).includes(x);
}
