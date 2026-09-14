// app/api/newsletter/unsubscribe/route.ts
//
// One-click unsubscribe via GET (linked from every newsletter email).
// Returns a self-contained HTML page — no external dependencies, no JS.
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
}): string {
  const accentColor = opts.success ? "#22c55e" : "#ef4444";
  const icon = opts.success ? "✓" : "!";

  return `<!DOCTYPE html>
<html lang="en">
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
    <a href="https://promptea.me">${opts.link}</a>
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

export async function GET(req: NextRequest) {
  const lang = detectLang(req);
  const copy = COPY[lang];

  // 1. Read token from query string
  const token = req.nextUrl.searchParams.get("token")?.trim();
  if (!token) {
    return htmlResponse(
      htmlPage({
        title: copy.invalidTitle,
        heading: copy.invalidHeading,
        body: copy.invalidBody,
        link: copy.invalidLink,
        success: false,
      }),
      400,
    );
  }

  // 2. Process unsubscription
  try {
    await removeSubscriber(token);

    return htmlResponse(
      htmlPage({
        title: copy.title,
        heading: copy.heading,
        body: copy.body,
        link: copy.link,
        success: true,
      }),
      200,
    );
  } catch {
    return htmlResponse(
      htmlPage({
        title: copy.errorTitle,
        heading: copy.errorHeading,
        body: copy.errorBody,
        link: copy.errorLink,
        success: false,
      }),
      503,
    );
  }
}
