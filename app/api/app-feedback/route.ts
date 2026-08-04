// app/api/app-feedback/route.ts
//
// v1.3.0 general product feedback → Firestore (collection "app_feedback").
// Replaces the old mailto flow. Never stores prompt content, audio, email,
// or raw session ids — only the message plus privacy-safe context.

import { NextRequest, NextResponse } from "next/server";
import { createHash, randomUUID } from "crypto";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { APP_FEEDBACK_CATEGORIES, APP_MODES, LANGS } from "@/lib/domain";
import { APP_VERSION } from "@/lib/version";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 32 * 1024;
const MESSAGE_MIN = 10;
const MESSAGE_MAX = 2000;
const COOLDOWN_MS = 60_000;

const FeedbackSchema = z.object({
  message: z.string().min(MESSAGE_MIN).max(MESSAGE_MAX),
  category: z.enum(APP_FEEDBACK_CATEGORIES).optional(),
  lang: z.enum(LANGS),
  mode: z.enum(APP_MODES).optional(),
  page: z.string().max(200).optional(),
  theme: z.string().max(32).optional(),
  sessionId: z.string().min(10).max(100).optional(),
});

// Best-effort per-instance cooldown (serverless instances don't share it —
// good enough to stop casual spam without adding infrastructure).
const lastAccepted = new Map<string, number>();

function cooldownKey(sessionId: string | undefined, req: NextRequest): string {
  const basis = sessionId ?? req.headers.get("x-forwarded-for") ?? "local";
  return createHash("sha256").update(basis).digest("hex").slice(0, 32);
}

function pruneCooldowns(now: number) {
  if (lastAccepted.size <= 500) return;
  for (const [key, ts] of lastAccepted) {
    if (now - ts > 10 * 60_000) lastAccepted.delete(key);
  }
}

function uaCategory(req: NextRequest): "mobile" | "desktop" | "other" {
  const ua = (req.headers.get("user-agent") ?? "").toLowerCase();
  if (!ua) return "other";
  if (/mobile|android|iphone|ipad/.test(ua)) return "mobile";
  if (/windows|macintosh|linux|cros/.test(ua)) return "desktop";
  return "other";
}

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return NextResponse.json({ ok: false, error: "unsupported_content_type" }, { status: 415 });
  }

  const declaredLength = Number(req.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false, error: "too_long" }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  // Typed message-length errors first so the bilingual UI can map them.
  const rawMessage = typeof (body as { message?: unknown })?.message === "string"
    ? ((body as { message: string }).message ?? "").trim()
    : "";
  if (rawMessage.length < MESSAGE_MIN) {
    return NextResponse.json({ ok: false, error: "too_short" }, { status: 400 });
  }
  if (rawMessage.length > MESSAGE_MAX) {
    return NextResponse.json({ ok: false, error: "too_long" }, { status: 400 });
  }

  const parsed = FeedbackSchema.safeParse({ ...(body as object), message: rawMessage });
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "validation", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const now = Date.now();
  const key = cooldownKey(parsed.data.sessionId, req);
  const last = lastAccepted.get(key) ?? 0;
  if (now - last < COOLDOWN_MS) {
    return NextResponse.json({ ok: false, error: "cooldown" }, { status: 429 });
  }

  const feedbackId = randomUUID();
  const page = parsed.data.page ? parsed.data.page.split("?")[0].slice(0, 200) : null;

  const doc = {
    feedbackId,
    message: parsed.data.message,
    category: parsed.data.category ?? null,
    lang: parsed.data.lang,
    mode: parsed.data.mode ?? null,
    page,
    theme: parsed.data.theme ?? null,
    appVersion: APP_VERSION,
    sessionHash: parsed.data.sessionId
      ? createHash("sha256").update(parsed.data.sessionId).digest("hex").slice(0, 32)
      : null,
    uaCategory: uaCategory(req),
    status: "new" as const,
    createdAt: FieldValue.serverTimestamp(),
  };

  try {
    const db = getAdminFirestore();
    await db.collection("app_feedback").doc(feedbackId).set(doc);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.log("[app-feedback] firestore unavailable", {
        err: error instanceof Error ? error.message : String(error),
      });
    }
    return NextResponse.json({ ok: false, error: "unavailable" }, { status: 503 });
  }

  lastAccepted.set(key, now);
  pruneCooldowns(now);

  return NextResponse.json({ ok: true, feedbackId }, { status: 200 });
}
