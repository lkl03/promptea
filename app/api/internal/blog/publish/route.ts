// app/api/internal/blog/publish/route.ts
//
// v1.4.0 — the ONLY way an article enters Promptea.
//
// Security model. The production server owns the Firebase Admin credentials;
// the editorial routine owns nothing but a publish-only shared secret. Requests
// are authenticated with an HMAC-SHA256 signature over
// `${timestamp}.${nonce}.${rawBody}`, which means the secret itself never
// travels on the wire and the body cannot be tampered with in transit.
//
// Defences, in the order they are applied:
//   415 content type          — reject non-JSON before reading the body
//   413 size                  — bounded read, no unbounded buffering
//   503 misconfigured         — a missing secret must never fall through to "open"
//   401 signature/timestamp   — constant-time compare, ±5 min replay window
//   409 replay                — nonce seen before
//   400 validation            — Zod, including the same-day freshness guard
//   409 conflict              — slug collision or already-published article
//
// The endpoint deliberately reports typed snake_case error codes and never
// echoes the payload, the secret, or any signature material into logs.

import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { checkFreshness } from "@/lib/blog/dates";
import { MAX_PUBLISH_BODY_BYTES, PublishPayloadSchema } from "@/lib/blog/types";
import { publishPost, recordRun } from "@/lib/blog/server";
import { APP_VERSION } from "@/lib/version";

export const runtime = "nodejs";

/** How far a request timestamp may drift from server time. */
const REPLAY_WINDOW_SECONDS = 300;

/**
 * Best-effort per-instance nonce cache. Serverless instances do not share it,
 * so this alone is NOT the duplicate-publication guarantee — the deterministic
 * document id plus the Firestore transaction in publishPost() is. This exists
 * to reject the cheap case early.
 */
const seenNonces = new Map<string, number>();

function pruneNonces(nowMs: number) {
  if (seenNonces.size <= 500) return;
  for (const [nonce, ts] of seenNonces) {
    if (nowMs - ts > REPLAY_WINDOW_SECONDS * 1000) seenNonces.delete(nonce);
  }
}

function safeEqualHex(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  // timingSafeEqual throws on length mismatch — compare lengths first, which
  // leaks only the length of a value the caller already controls.
  if (bufA.length === 0 || bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function fail(error: string, status: number, extra?: Record<string, unknown>) {
  const res = NextResponse.json({ ok: false, error, ...extra }, { status });
  res.headers.set("x-app-version", APP_VERSION);
  return res;
}

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return fail("unsupported_content_type", 415);
  }

  const declaredLength = Number(req.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_PUBLISH_BODY_BYTES) {
    return fail("payload_too_large", 413);
  }

  const secret = process.env.BLOG_PUBLISH_SECRET;
  if (!secret || secret.length < 32) {
    // Misconfiguration must fail closed and must not look like an auth failure.
    if (process.env.NODE_ENV !== "production") {
      console.log("[blog/publish] BLOG_PUBLISH_SECRET missing or too short");
    }
    return fail("publishing_disabled", 503);
  }

  const timestamp = req.headers.get("x-promptea-timestamp") ?? "";
  const nonce = req.headers.get("x-promptea-nonce") ?? "";
  const signature = req.headers.get("x-promptea-signature") ?? "";

  if (!timestamp || !nonce || !signature) return fail("unauthorized", 401);
  if (nonce.length < 8 || nonce.length > 128) return fail("unauthorized", 401);

  const tsSeconds = Number(timestamp);
  if (!Number.isFinite(tsSeconds)) return fail("unauthorized", 401);

  const nowMs = Date.now();
  if (Math.abs(nowMs / 1000 - tsSeconds) > REPLAY_WINDOW_SECONDS) {
    return fail("stale_timestamp", 401);
  }

  const rawBody = await req.text();
  if (Buffer.byteLength(rawBody, "utf8") > MAX_PUBLISH_BODY_BYTES) {
    return fail("payload_too_large", 413);
  }

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${nonce}.${rawBody}`)
    .digest("hex");

  if (!safeEqualHex(signature, expected)) return fail("invalid_signature", 401);

  if (seenNonces.has(nonce)) return fail("replay_detected", 409);

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return fail("invalid_json", 400);
  }

  const parsed = PublishPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return fail("validation", 400, { details: parsed.error.flatten() });
  }
  const payload = parsed.data;

  // --- the same-day editorial guard -----------------------------------------
  // Enforced server-side so a routine bug, a clock skew or a hand-crafted
  // request cannot publish yesterday's news as today's.
  const freshness = checkFreshness(payload.eventDate);
  if (payload.status === "published" && !freshness.ok) {
    return fail(freshness.reason, 422, {
      today: freshness.today,
      eventDate: payload.eventDate,
    });
  }
  // A draft may be backdated, but never post-dated.
  if (!freshness.ok && freshness.reason === "future_event") {
    return fail("future_event", 422, { today: freshness.today, eventDate: payload.eventDate });
  }

  if (payload.dryRun) {
    seenNonces.set(nonce, nowMs);
    pruneNonces(nowMs);
    const res = NextResponse.json(
      {
        ok: true,
        dryRun: true,
        outcome: "validated",
        canonicalSlug: payload.canonicalSlug,
        eventDate: payload.eventDate,
        today: freshness.today,
        sourceCount: payload.sources.length,
        primarySourceCount: payload.sources.filter((s) => s.primary).length,
      },
      { status: 200 }
    );
    res.headers.set("x-app-version", APP_VERSION);
    return res;
  }

  let result: Awaited<ReturnType<typeof publishPost>>;
  try {
    result = await publishPost(payload, {});
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.log("[blog/publish] firestore unavailable", {
        err: error instanceof Error ? error.message : String(error),
      });
    }
    return fail("unavailable", 503);
  }

  seenNonces.set(nonce, nowMs);
  pruneNonces(nowMs);

  if (result.outcome === "slug_conflict") {
    return fail("slug_conflict", 409, { slug: result.slug });
  }

  // Record the run outcome; never let logging failure affect the response.
  void recordRun({
    runId: payload.routineRunId,
    status: result.outcome === "already_published" ? "ALREADY_PUBLISHED" : "PUBLISHED",
    selectedCategory: payload.category,
    selectedImportance: payload.importance,
    sourceCount: payload.sources.length,
    articleId: result.id,
  }).catch(() => {});

  const res = NextResponse.json(
    {
      ok: true,
      outcome: result.outcome,
      id: result.id,
      canonicalSlug: result.canonicalSlug,
      urls: {
        en: `/en/blog/${payload.locales.en.slug}`,
        es: `/es/blog/${payload.locales.es.slug}`,
      },
    },
    { status: result.outcome === "already_published" ? 200 : 201 }
  );
  res.headers.set("x-app-version", APP_VERSION);
  return res;
}
