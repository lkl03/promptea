import { NextRequest, NextResponse } from "next/server";
import { match } from "@formatjs/intl-localematcher";
import Negotiator from "negotiator";

import { negotiatedTwinPath, prefersMarkdown } from "./lib/seo/negotiate";
import { DEFAULT_LOCALE, LOCALES } from "./lib/seo/site";

// lib/domain.ts LANGS: es, en, pt, zh. The matcher resolves regional tags to their
// language, so pt-BR and pt-PT both land on /pt (and es-AR, es-MX on /es).
//
// v1.8.7 — /zh is Simplified Chinese: zh, zh-CN, zh-Hans, zh-SG (and zh-MY) land
// on it. Traditional Chinese (zh-TW, zh-HK, zh-MO, zh-Hant…) is NOT matched to it:
// a Traditional reader is not served Simplified text by default. Those tags are
// dropped before matching, so the visitor gets their next listed language, or
// /en. The switcher still offers 中文 to anyone. Why /en and not /zh with a
// notice: in the 30 days to 2026-11-16 Taiwan and Hong Kong together brought 6
// visitors (Vercel Analytics), and auto-serving the other script is the one
// choice that annoys readers of both (docs/i18n/zh-review.md).
const locales = LOCALES;
/**
 * The language a visitor gets when nothing in Accept-Language matches (an
 * unsupported language, no header at all — which is what most crawlers send).
 * v1.8.0: this is lib/seo/site.ts's DEFAULT_LOCALE, the same locale that
 * hreflang="x-default" advertises, so what a search engine is told and what the
 * server does are one decision. English is the broader fallback; anyone whose
 * browser asks for Spanish still gets /es, and for Portuguese /pt.
 */
const defaultLocale = DEFAULT_LOCALE;

type Locale = (typeof locales)[number];

/** v1.9.0 — site-wide discovery links sent with every HTML page. */
export const AGENT_LINKS: readonly string[] = [
  '</llms.txt>; rel="describedby"; type="text/plain"',
  '</.well-known/api-catalog>; rel="api-catalog"',
  '</sitemap.xml>; rel="sitemap"',
];

// Evita redirigir archivos estáticos tipo /logo.png, /images/a.webp, etc.
const PUBLIC_FILE = /\.(.*)$/;

/**
 * v1.7.0 — query parameters that address the analyzer. Before v1.7.0 the
 * analyzer was the homepage, so deep links (SEO packs, guides, the matcher
 * handoff, links shared by users) point at /{lang}?prompt=…. The homepage is
 * now a hub; a root URL carrying any of these parameters is forwarded to
 * /{lang}/analyzer with the query string untouched. A bare root shows the hub.
 */
export const ANALYZER_PARAMS = ["prompt", "purpose", "target", "model", "handoff"] as const;

export function hasAnalyzerParams(search: URLSearchParams): boolean {
  return ANALYZER_PARAMS.some((k) => search.has(k));
}

/** Traditional-Chinese tags: never matched to the Simplified /zh (see above). */
export const TRADITIONAL_CHINESE = /^zh-(?:hant|tw|hk|mo)(?:-|$)/i;

function getLocale(request: NextRequest): Locale {
  const acceptLanguage = request.headers.get("accept-language") ?? "";

  // Negotiator espera headers como objeto plano
  const headers = { "accept-language": acceptLanguage };
  // "*" (what some crawlers send) and malformed tags make Intl throw a
  // RangeError inside match(): that used to turn the request into a 500. Neither
  // says anything about the visitor's language, so they fall back to the default.
  const all = new Negotiator({ headers }).languages().filter((l) => l !== "*");
  // A browser whose FIRST Chinese tag is Traditional ("zh-TW,zh;q=0.9") uses the bare
  // "zh" as a fallback for the same reader: drop it too; an explicit zh-CN/zh-Hans stays.
  const traditionalFirst = TRADITIONAL_CHINESE.test(all.find((l) => /^zh(?:-|$)/i.test(l)) ?? "");
  const languages = all.filter((l) => !TRADITIONAL_CHINESE.test(l) && !(traditionalFirst && /^zh$/i.test(l)));

  try {
    return match(languages, locales as unknown as string[], defaultLocale) as Locale;
  } catch {
    return defaultLocale;
  }
}

export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // ✅ No interferir con API routes ni assets internos/estáticos
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  // ✅ Raíz de idioma con parámetros del analizador → /{lang}/analyzer (v1.7.0)
  const rootLocale = locales.find((locale) => pathname === `/${locale}` || pathname === `/${locale}/`);
  if (rootLocale && hasAnalyzerParams(searchParams)) {
    // A plain URL: NextURL.clone() would carry the trailing slash of "/es/" over.
    const url = new URL(`/${rootLocale}/analyzer${request.nextUrl.search}`, request.url);
    return NextResponse.redirect(url, 308);
  }

  // ✅ Si ya viene con locale, seguir normal
  const pathnameHasLocale = locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)
  );

  if (pathnameHasLocale) {
    // v1.9.0 — "Markdown for Agents": a client that prefers text/markdown gets
    // the page's markdown twin at the same URL. `?format=html` opts out. The
    // markdown answer says `Vary: Accept`. The HTML one cannot: Next writes its
    // own Vary on a page and drops ours (also when set from next.config). No
    // cache mixes them up: pages are `max-age=0, must-revalidate`, and this
    // proxy runs before the platform's cache, so it picks the representation.
    const twin = searchParams.get("format") === "html" ? null : negotiatedTwinPath(pathname);
    if (twin && prefersMarkdown(request.headers.get("accept"))) {
      const res = NextResponse.rewrite(new URL(twin, request.url));
      res.headers.append("Vary", "Accept");
      return res;
    }
    const res = NextResponse.next();
    // Link headers (RFC 8288): where a program finds the site index, the API
    // catalog and, when the page has one, its markdown twin.
    const links = [...AGENT_LINKS];
    if (twin) {
      links.push(`<${pathname}.md>; rel="alternate"; type="text/markdown"`);
    }
    res.headers.set("Link", links.join(", "));
    return res;
  }

  // ✅ Si no hay locale, redirigir a /{locale}{pathname} — en un solo salto al
  // analizador cuando la raíz trae parámetros del analizador.
  const locale = getLocale(request);
  const url = request.nextUrl.clone();
  url.pathname = pathname === "/" && hasAnalyzerParams(searchParams) ? `/${locale}/analyzer` : `/${locale}${pathname}`;

  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    // corre para todo, excepto api/_next/assets/archivos con extensión
    "/((?!api|_next|.*\\..*).*)",
  ],
};
