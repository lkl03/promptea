// app/api/transcribe/route.ts
//
// v1.3.0 voice transcription (server-only). Receives a short audio recording
// and returns the transcript via Groq's OpenAI-compatible speech-to-text
// endpoint (whisper-large-v3-turbo by default: multilingual, fastest, and
// the model Groq recommends for dictation — verified 2026-08-03 at
// https://console.groq.com/docs/speech-to-text).
//
// Privacy: audio is forwarded to the provider and discarded — never written
// to disk, Firestore, telemetry, or logs. Transcripts are returned to the
// client only.

import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import type { TranscribeErrorReason } from "@/lib/domain";

export const runtime = "nodejs";

const GROQ_TRANSCRIBE_URL = "https://api.groq.com/openai/v1/audio/transcriptions";
const DEFAULT_MODEL = "whisper-large-v3-turbo";
const TIMEOUT_MS = 20_000;
// Vercel serverless bodies cap at ~4.5 MB — stay safely under. Two minutes of
// Opus-encoded speech is well below this.
const MAX_AUDIO_BYTES = 4 * 1024 * 1024;
const MAX_TEXT_CHARS = 20_000;
const COOLDOWN_MS = 3_000;

// Formats MediaRecorder actually produces across browsers; all are in Groq's
// supported list (flac/mp3/mp4/mpeg/mpga/m4a/ogg/wav/webm).
const ACCEPTED_MIME_PREFIXES = [
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/mpeg",
  "audio/wav",
  "audio/x-m4a",
  "audio/m4a",
];

function transcriptionModel(): string {
  const env = process.env.GROQ_TRANSCRIPTION_MODEL?.trim();
  return env && env.length > 0 ? env : DEFAULT_MODEL;
}

function fail(reason: TranscribeErrorReason, status: number) {
  return NextResponse.json({ ok: false, reason }, { status });
}

// Best-effort per-instance cooldown against rapid-fire uploads.
const lastAccepted = new Map<string, number>();

function cooldownKey(req: NextRequest): string {
  const basis = req.headers.get("x-forwarded-for") ?? "local";
  return createHash("sha256").update(basis).digest("hex").slice(0, 32);
}

function pruneCooldowns(now: number) {
  if (lastAccepted.size <= 500) return;
  for (const [key, ts] of lastAccepted) {
    if (now - ts > 10 * 60_000) lastAccepted.delete(key);
  }
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey.trim().length <= 10) return fail("missing_api_key", 503);

  const now = Date.now();
  const key = cooldownKey(req);
  if (now - (lastAccepted.get(key) ?? 0) < COOLDOWN_MS) {
    return fail("rate_limited", 429);
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail("unsupported_media", 415);
  }

  const audio = form.get("audio");
  if (!(audio instanceof Blob)) return fail("empty_audio", 400);

  const mime = (audio.type || "").toLowerCase();
  if (!ACCEPTED_MIME_PREFIXES.some((prefix) => mime.startsWith(prefix))) {
    return fail("unsupported_media", 415);
  }
  if (audio.size === 0) return fail("empty_audio", 400);
  if (audio.size > MAX_AUDIO_BYTES) return fail("file_too_large", 413);

  const langRaw = String(form.get("lang") ?? "").toLowerCase();
  const language = langRaw === "es" || langRaw === "en" ? langRaw : undefined;

  const ext = mime.includes("ogg") ? "ogg" : mime.includes("mp4") || mime.includes("m4a") ? "mp4" : mime.includes("wav") ? "wav" : mime.includes("mpeg") ? "mp3" : "webm";
  const upstream = new FormData();
  upstream.append("file", audio, `recording.${ext}`);
  upstream.append("model", transcriptionModel());
  upstream.append("response_format", "json");
  upstream.append("temperature", "0");
  if (language) upstream.append("language", language);

  const startedAt = Date.now();
  let res: Response;
  try {
    res = await fetch(GROQ_TRANSCRIBE_URL, {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}` },
      body: upstream,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    const name = (err as { name?: string })?.name ?? "";
    if (name === "TimeoutError" || name === "AbortError") return fail("timeout", 504);
    return fail("network", 502);
  }

  if (process.env.NODE_ENV !== "production") {
    // Operational metadata only — never audio bytes or transcript text.
    console.log("[transcribe]", {
      status: res.status,
      ms: Date.now() - startedAt,
      bytes: audio.size,
      mime,
      language: language ?? "auto",
    });
  }

  if (res.status === 401 || res.status === 403) return fail("invalid_api_key", 503);
  if (res.status === 429) return fail("rate_limited", 429);
  if (res.status === 413) return fail("file_too_large", 413);
  if (res.status === 422) return fail("unsupported_media", 415);
  if (!res.ok) return fail("provider_error", 502);

  let data: { text?: unknown };
  try {
    data = (await res.json()) as { text?: unknown };
  } catch {
    return fail("invalid_response", 502);
  }

  const text = typeof data.text === "string" ? data.text.trim() : "";
  if (!text) return fail("no_speech", 422);

  lastAccepted.set(key, now);
  pruneCooldowns(now);

  return NextResponse.json({ ok: true, text: text.slice(0, MAX_TEXT_CHARS) }, { status: 200 });
}
