// app/api/newsletter/subscribe/route.ts
//
// Newsletter subscription endpoint. Validates consent, rate-limits by IP hash,
// and delegates to the newsletter server module. NEVER logs or returns the
// subscriber's email address.

import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { SubscribeRequestSchema } from "@/lib/newsletter/types";
import { addSubscriber } from "@/lib/newsletter/server";
import { APP_VERSION } from "@/lib/version";

export const runtime = "nodejs";

// ---------------------------------------------------------------------------
// Rate limiting — per-instance Map, same pattern as app-feedback
// ---------------------------------------------------------------------------

const RATE_WINDOW_MS = 10 * 60_000; // 10 minutes
const RATE_MAX = 5;

interface RateEntry {
  count: number;
  windowStart: number;
}

const rateBucket = new Map<string, RateEntry>();

function ipKey(req: NextRequest): string {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

function pruneRateBuckets(now: number) {
  if (rateBucket.size <= 500) return;
  for (const [key, entry] of rateBucket) {
    if (now - entry.windowStart > RATE_WINDOW_MS) rateBucket.delete(key);
  }
}

function isRateLimited(key: string, now: number): boolean {
  const entry = rateBucket.get(key);
  if (!entry || now - entry.windowStart > RATE_WINDOW_MS) {
    rateBucket.set(key, { count: 1, windowStart: now });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_MAX;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { "x-app-version": APP_VERSION },
  });
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  // 1. Content-Type guard
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return jsonResponse({ ok: false, error: "unsupported_content_type" }, 415);
  }

  // 2. Rate limiting by IP hash
  const now = Date.now();
  const key = ipKey(req);
  if (isRateLimited(key, now)) {
    return jsonResponse({ ok: false, error: "rate_limited" }, 429);
  }
  pruneRateBuckets(now);

  // 3. Parse JSON body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ ok: false, error: "invalid_json" }, 400);
  }

  // 4. Validate with Zod schema
  const parsed = SubscribeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse(
      { ok: false, error: "validation", details: parsed.error.flatten() },
      400,
    );
  }

  // 5. Consent must be explicitly true
  if (!parsed.data.consent) {
    return jsonResponse({ ok: false, error: "consent_required" }, 400);
  }

  // 6. Add subscriber via server module
  try {
    const result = await addSubscriber({
      email: parsed.data.email,
      lang: parsed.data.lang,
    });

    return jsonResponse({ ok: true, outcome: result.outcome }, 200);
  } catch {
    // NEVER log the email — only a generic operational note
    return jsonResponse({ ok: false, error: "unavailable" }, 503);
  }
}
