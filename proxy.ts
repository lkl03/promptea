import { NextRequest, NextResponse } from "next/server";
import { match } from "@formatjs/intl-localematcher";
import Negotiator from "negotiator";

const locales = ["es", "en"] as const;
const defaultLocale = "es";

type Locale = (typeof locales)[number];

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

function getLocale(request: NextRequest): Locale {
  const acceptLanguage = request.headers.get("accept-language") ?? "";

  // Negotiator espera headers como objeto plano
  const headers = { "accept-language": acceptLanguage };
  const languages = new Negotiator({ headers }).languages();

  return match(languages, locales as unknown as string[], defaultLocale) as Locale;
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
    return NextResponse.next();
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
