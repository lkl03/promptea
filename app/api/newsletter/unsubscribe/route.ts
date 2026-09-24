// app/api/newsletter/unsubscribe/route.ts
//
// Unsubscribe for Promptea Weekly. GET is the footer link (returns a
// self-contained HTML page — no external dependencies, no JS); POST is the
// RFC 8058 one-click endpoint mail clients call from List-Unsubscribe-Post.
// NEVER logs or surfaces the subscriber's email address.

import { NextRequest, NextResponse } from "next/server";
import { removeSubscriber } from "@/lib/newsletter/server";
import { APP_VERSION } from "@/lib/version";

export const runtime = "nodejs";

// ---------------------------------------------------------------------------
// Language detection
// ---------------------------------------------------------------------------

function detectLang(req: NextRequest): "es" | "en" {
  const accept = req.headers.get("accept-language") ?? "";
  // Check for Spanish variants before defaulting to English
  if (/^es\b|,\s*es\b/i.test(accept)) return "es";
  return "en";
}

// ---------------------------------------------------------------------------
// HTML responses
// ---------------------------------------------------------------------------

const COPY = {
  en: {
    title: "Unsubscribed — Promptea",
    heading: "You’ve been unsubscribed",
    body: "You will no longer receive Promptea Weekly emails.",
    link: "Back to Promptea",
    errorTitle: "Something went wrong — Promptea",
    errorHeading: "Something went wrong",
    errorBody: "We couldn’t process your unsubscription right now. Please try again later or contact us.",
    errorLink: "Back to Promptea",
    invalidTitle: "Invalid link — Promptea",
    invalidHeading: "Invalid unsubscribe link",
    invalidBody: "This link appears to be invalid or incomplete. If you received this in an email, please use the full link.",
    invalidLink: "Back to Promptea",
  },
  es: {
    title: "Desuscripto — Promptea",
    heading: "Te desuscribiste de Promptea Semanal",
    body: "No recibirás más correos de Promptea Semanal.",
    link: "Volver a Promptea",
    errorTitle: "Algo salió mal — Promptea",
    errorHeading: "Algo salió mal",
    errorBody: "No pudimos procesar tu desuscripción en este momento. Intentalo de nuevo más tarde.",
    errorLink: "Volver a Promptea",
    invalidTitle: "Enlace inválido — Promptea",
    invalidHeading: "Enlace de desuscripción inválido",
    invalidBody: "Este enlace parece inválido o incompleto. Si lo recibiste en un correo, usá el enlace completo.",
    invalidLink: "Volver a Promptea",
  },
} as const;

function htmlPage(opts: {
  title: string;
  heading: string;
  body: string;
  link: string;
  success: boolean;
  lang: "es" | "en";
}): string {
  const accentColor = opts.success ? "#22c55e" : "#ef4444";
  const icon = opts.success ? "✓" : "!";

  return `<!DOCTYPE html>
<html lang="${opts.lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>${opts.title}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #fafafa;
      color: #1a1a1a;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      background: #fff;
      border: 1px solid #e5e5e5;
      border-radius: 12px;
      padding: 40px 32px;
      max-width: 440px;
      width: 100%;
      text-align: center;
    }
    .icon {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: ${accentColor};
      color: #fff;
      font-size: 24px;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;
    }
    h1 {
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 8px;
      line-height: 1.3;
    }
    p {
      font-size: 15px;
      color: #555;
      line-height: 1.5;
      margin-bottom: 24px;
    }
    a {
      display: inline-block;
      font-size: 14px;
      color: #6366f1;
      text-decoration: none;
      font-weight: 500;
    }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${icon}</div>
    <h1>${opts.heading}</h1>
    <p>${opts.body}</p>
    <a href="https://www.promptea.me/${opts.lang}">${opts.link}</a>
  </div>
</body>
</html>`;
}

function htmlResponse(html: string, status: number): NextResponse {
  return new NextResponse(html, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "x-app-version": APP_VERSION,
      "cache-control": "no-store",
    },
  });
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

function page(lang: "es" | "en", kind: "success" | "invalid" | "error"): string {
  const copy = COPY[lang];
  if (kind === "success") {
    return htmlPage({ title: copy.title, heading: copy.heading, body: copy.body, link: copy.link, success: true, lang });
  }
  if (kind === "invalid") {
    return htmlPage({ title: copy.invalidTitle, heading: copy.invalidHeading, body: copy.invalidBody, link: copy.invalidLink, success: false, lang });
  }
  return htmlPage({ title: copy.errorTitle, heading: copy.errorHeading, body: copy.errorBody, link: copy.errorLink, success: false, lang });
}

/**
 * GET — the link in the email footer. Idempotent: an already-unsubscribed
 * token still shows the confirmation. An unknown or malformed token shows the
 * invalid-link page (v1.5 reported success for any token).
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")?.trim() ?? "";
  const fallbackLang = detectLang(req);

  if (!token) return htmlResponse(page(fallbackLang, "invalid"), 400);

  const result = await removeSubscriber(token);
  if (result.ok) return htmlResponse(page(result.lang ?? fallbackLang, "success"), 200);
  if (result.reason === "unavailable") return htmlResponse(page(fallbackLang, "error"), 503);
  return htmlResponse(page(fallbackLang, "invalid"), 400);
}

/**
 * POST — RFC 8058 one-click unsubscribe. Gmail and Yahoo call this directly
 * from their UI because every newsletter carries
 * `List-Unsubscribe-Post: List-Unsubscribe=One-Click`; before v1.6.0 there was
 * no POST handler, so those requests failed with 405.
 */
export async function POST(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")?.trim() ?? "";
  if (!token) return jsonResponse({ ok: false, error: "invalid_token" }, 400);

  const result = await removeSubscriber(token);
  if (result.ok) return jsonResponse({ ok: true }, 200);
  if (result.reason === "unavailable") return jsonResponse({ ok: false, error: "unavailable" }, 503);
  return jsonResponse({ ok: false, error: "invalid_token" }, 400);
}

function jsonResponse(body: Record<string, unknown>, status: number): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { "x-app-version": APP_VERSION, "cache-control": "no-store" },
  });
}
