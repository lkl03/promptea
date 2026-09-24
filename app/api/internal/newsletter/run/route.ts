// app/api/internal/newsletter/run/route.ts
//
// v1.6.0 — the ONLY way Promptea Weekly is generated, stored, or sent.
//
// Called by the weekly Claude Code routine (Mondays 09:00 ART) or by a human
// with the same signed request. Same security model as the AI Daily publish
// endpoint: the caller holds a single-purpose shared secret
// (NEWSLETTER_SEND_SECRET) and signs `${timestamp}.${nonce}.${rawBody}` with
// HMAC-SHA256; the server alone holds the Firebase and Resend credentials.
// A leaked secret can only trigger this week's deterministic digest (every
// recipient at most once, behind NEWSLETTER_DELIVERY_ENABLED) or send a test
// copy to the fixed NEWSLETTER_TEST_RECIPIENTS — it cannot read subscribers,
// choose recipients, or change content.
//
// Body: { "mode": "dry_run" | "test" | "live", "date"?: "YYYY-MM-DD" }
//   `date` previews another week and is accepted in dry_run/test only.
//
// Responses are 200 with a typed `outcome` for every business result (see
// lib/newsletter/run.ts); transport/auth problems use HTTP errors. Nothing in
// a response or a log line ever contains a subscriber address.

import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { z } from "zod";
import { APP_VERSION } from "@/lib/version";
import { isEditorialDate } from "@/lib/blog/dates";
import { listAllPublishedArticles } from "@/lib/blog/server";
import { readDeliveryConfig } from "@/lib/newsletter/config";
import { createResendMailer } from "@/lib/newsletter/email";
import { firestoreNewsletterStore } from "@/lib/newsletter/server";
import { runWeeklyNewsletter } from "@/lib/newsletter/run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Sending is time-budgeted inside the run (45 s); a large list continues on
// the next call, and delivered subscribers are skipped.
export const maxDuration = 60;

const REPLAY_WINDOW_SECONDS = 300;
const MAX_BODY_BYTES = 2_048;

const seenNonces = new Map<string, number>();

function pruneNonces(nowMs: number) {
  if (seenNonces.size <= 200) return;
  for (const [nonce, ts] of seenNonces) {
    if (nowMs - ts > REPLAY_WINDOW_SECONDS * 1000) seenNonces.delete(nonce);
  }
}

function safeEqualHex(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  if (bufA.length === 0 || bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function json(body: Record<string, unknown>, status: number) {
  const res = NextResponse.json(body, { status });
  res.headers.set("x-app-version", APP_VERSION);
  res.headers.set("cache-control", "no-store");
  return res;
}

const fail = (error: string, status: number) => json({ ok: false, error }, status);

const RunRequestSchema = z
  .object({
    mode: z.enum(["dry_run", "test", "live"]),
    date: z.string().optional(),
  })
  .strict();

export async function POST(req: NextRequest) {
  if (!(req.headers.get("content-type") || "").includes("application/json")) return fail("unsupported_content_type", 415);
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) return fail("payload_too_large", 413);

  const secret = process.env.NEWSLETTER_SEND_SECRET;
  if (!secret || secret.length < 32) {
    // Misconfiguration fails closed and does not look like an auth failure.
    return fail("newsletter_runner_disabled", 503);
  }

  const timestamp = req.headers.get("x-promptea-timestamp") ?? "";
  const nonce = req.headers.get("x-promptea-nonce") ?? "";
  const signature = req.headers.get("x-promptea-signature") ?? "";
  if (!timestamp || !nonce || !signature) return fail("unauthorized", 401);
  if (nonce.length < 8 || nonce.length > 128) return fail("unauthorized", 401);

  const tsSeconds = Number(timestamp);
  if (!Number.isFinite(tsSeconds)) return fail("unauthorized", 401);
  const nowMs = Date.now();
  if (Math.abs(nowMs / 1000 - tsSeconds) > REPLAY_WINDOW_SECONDS) return fail("stale_timestamp", 401);

  const rawBody = await req.text();
  if (Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) return fail("payload_too_large", 413);

  const expected = createHmac("sha256", secret).update(`${timestamp}.${nonce}.${rawBody}`).digest("hex");
  if (!safeEqualHex(signature, expected)) return fail("invalid_signature", 401);
  if (seenNonces.has(nonce)) return fail("replay_detected", 409);
  seenNonces.set(nonce, nowMs);
  pruneNonces(nowMs);

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return fail("invalid_json", 400);
  }
  const parsed = RunRequestSchema.safeParse(body);
  if (!parsed.success) return fail("validation", 400);
  const { mode, date } = parsed.data;
  if (date !== undefined && (!isEditorialDate(date) || mode === "live")) return fail("date_not_allowed", 400);

  const config = readDeliveryConfig();
  let store: ReturnType<typeof firestoreNewsletterStore>;
  try {
    store = firestoreNewsletterStore();
  } catch {
    return fail("storage_unavailable", 503);
  }

  const result = await runWeeklyNewsletter(
    mode,
    {
      store,
      mailer: config.apiKey ? createResendMailer(config.apiKey, config.from) : null,
      loadArticles: (lang) => listAllPublishedArticles(lang, 200),
      config,
      log: (event, meta) => console.log(`[newsletter] ${event}`, meta),
    },
    { date }
  );

  return json(result as unknown as Record<string, unknown>, 200);
}
