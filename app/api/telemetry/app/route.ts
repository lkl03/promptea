// app/api/telemetry/app/route.ts
//
// v1.3.0 lightweight operational events (mode opened, matcher handoff, voice
// outcomes). Strict whitelist — no prompt content, no transcripts, no audio,
// ever. Degrades to 200 {skipped} when Firestore is unavailable, matching
// the session route's behavior.

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { APP_MODES, LANGS, TRANSCRIBE_ERROR_REASONS } from "@/lib/domain";

export const runtime = "nodejs";

const APP_EVENTS = [
  "mode_opened",
  "matcher_handoff",
  "voice_recording_started",
  "voice_transcribed",
  "voice_failed",
] as const;

const AppEventSchema = z.object({
  sessionId: z.string().min(10).max(100),
  lang: z.enum(LANGS),
  event: z.enum(APP_EVENTS),
  mode: z.enum(APP_MODES).optional(),
  /** Typed failure reason only — never free text. */
  reason: z.enum(TRANSCRIBE_ERROR_REASONS).optional(),
});

function ttlDays() {
  const n = Number(process.env.TELEMETRY_TTL_DAYS ?? "90");
  return Number.isFinite(n) && n > 0 ? n : 90;
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const parsed = AppEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  let db;
  try {
    db = getAdminFirestore();
  } catch {
    return NextResponse.json({ ok: true, skipped: "telemetry_unavailable" }, { status: 200 });
  }

  const now = new Date();
  const expires = new Date(now.getTime() + ttlDays() * 24 * 60 * 60 * 1000);

  try {
    await db
      .collection("telemetry_events")
      .doc(randomUUID())
      .set({
        name: "app",
        event: parsed.data.event,
        sessionId: parsed.data.sessionId,
        lang: parsed.data.lang,
        mode: parsed.data.mode ?? null,
        reason: parsed.data.reason ?? null,
        ts: Timestamp.fromDate(now),
        createdAt: FieldValue.serverTimestamp(),
        expiresAt: Timestamp.fromDate(expires),
      });
  } catch {
    return NextResponse.json({ ok: true, skipped: "telemetry_unavailable" }, { status: 200 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
