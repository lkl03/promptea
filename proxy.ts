import { NextRequest, NextResponse } from "next/server";
import { match } from "@formatjs/intl-localematcher";
import Negotiator from "negotiator";

const locales = ["es", "en"] as const;
const defaultLocale = "es";

type Locale = (typeof locales)[number];

// Evita redirigir archivos estáticos tipo /logo.png, /images/a.webp, etc.
const PUBLIC_FILE = /\.(.*)$/;

function getLocale(request: NextRequest): Locale {
  const acceptLanguage = request.headers.get("accept-language") ?? "";

  // Negotiator espera headers como objeto plano
  const headers = { "accept-language": acceptLanguage };
  const languages = new Negotiator({ headers }).languages();

  return match(languages, locales as unknown as string[], defaultLocale) as Locale;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

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

  // ✅ Si ya viene con locale, seguir normal
  const pathnameHasLocale = locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)
  );

  if (pathnameHasLocale) {
    return NextResponse.next();
  }

  // ✅ Si no hay locale, redirigir a /{locale}{pathname}
  const locale = getLocale(request);
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname}`;

  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    // corre para todo, excepto api/_next/assets/archivos con extensión
    "/((?!api|_next|.*\\..*).*)",
  ],
};
