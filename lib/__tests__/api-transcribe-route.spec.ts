// POST /api/transcribe — every failure class typed, no audio persistence,
// Groq mocked via global fetch stub (never hits the network).

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/transcribe/route";

function audioRequest(opts: {
  bytes?: number;
  mime?: string;
  lang?: string;
  ip?: string;
  omitAudio?: boolean;
}): NextRequest {
  const form = new FormData();
  if (!opts.omitAudio) {
    const blob = new Blob([new Uint8Array(opts.bytes ?? 4000)], { type: opts.mime ?? "audio/webm" });
    form.append("audio", blob, "recording.webm");
  }
  if (opts.lang) form.append("lang", opts.lang);

  return new NextRequest("http://localhost/api/transcribe", {
    method: "POST",
    body: form,
    headers: opts.ip ? { "x-forwarded-for": opts.ip } : undefined,
  });
}

function groqOk(text: string) {
  return vi.fn(async () => new Response(JSON.stringify({ text }), { status: 200 }));
}

let ipCounter = 0;
function freshIp() {
  ipCounter += 1;
  return `10.0.0.${ipCounter}`;
}

describe("API /api/transcribe", () => {
  beforeEach(() => {
    process.env.GROQ_API_KEY = "test-key-1234567890";
  });
  afterEach(() => {
    delete process.env.GROQ_API_KEY;
    delete process.env.GROQ_TRANSCRIPTION_MODEL;
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  test("missing API key → 503 missing_api_key", async () => {
    delete process.env.GROQ_API_KEY;
    const res = await POST(audioRequest({ ip: freshIp() }));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ ok: false, reason: "missing_api_key" });
  });

  test("successful English transcription returns the text (default turbo model)", async () => {
    const fetchMock = groqOk("Hello, this is my prompt.");
    vi.stubGlobal("fetch", fetchMock);
    const res = await POST(audioRequest({ lang: "en", ip: freshIp() }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, text: "Hello, this is my prompt." });

    const upstream = fetchMock.mock.calls[0] as unknown as [string, { body: FormData; headers: Record<string, string> }];
    expect(upstream[0]).toContain("api.groq.com/openai/v1/audio/transcriptions");
    expect(upstream[1].body.get("model")).toBe("whisper-large-v3-turbo");
    expect(upstream[1].body.get("language")).toBe("en");
  });

  test("successful Spanish transcription passes language=es", async () => {
    const fetchMock = groqOk("Hola, este es mi prompt.");
    vi.stubGlobal("fetch", fetchMock);
    const res = await POST(audioRequest({ lang: "es", ip: freshIp() }));
    expect(res.status).toBe(200);
    expect(((await res.json()) as { text: string }).text).toBe("Hola, este es mi prompt.");
    const body = (fetchMock.mock.calls[0] as unknown as [string, { body: FormData }])[1].body;
    expect(body.get("language")).toBe("es");
  });

  test("GROQ_TRANSCRIPTION_MODEL overrides the model", async () => {
    process.env.GROQ_TRANSCRIPTION_MODEL = "whisper-large-v3";
    const fetchMock = groqOk("ok text");
    vi.stubGlobal("fetch", fetchMock);
    await POST(audioRequest({ ip: freshIp() }));
    const body = (fetchMock.mock.calls[0] as unknown as [string, { body: FormData }])[1].body;
    expect(body.get("model")).toBe("whisper-large-v3");
  });

  test("invalid MIME type → 415 unsupported_media (Groq never called)", async () => {
    const fetchMock = groqOk("nope");
    vi.stubGlobal("fetch", fetchMock);
    const res = await POST(audioRequest({ mime: "video/mp4", ip: freshIp() }));
    expect(res.status).toBe(415);
    expect(await res.json()).toEqual({ ok: false, reason: "unsupported_media" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("empty audio → 400 empty_audio", async () => {
    const res = await POST(audioRequest({ bytes: 0, ip: freshIp() }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, reason: "empty_audio" });
  });

  test("missing audio field → 400 empty_audio", async () => {
    const res = await POST(audioRequest({ omitAudio: true, ip: freshIp() }));
    expect(res.status).toBe(400);
  });

  test("oversized audio → 413 file_too_large (Groq never called)", async () => {
    const fetchMock = groqOk("nope");
    vi.stubGlobal("fetch", fetchMock);
    const res = await POST(audioRequest({ bytes: 5 * 1024 * 1024, ip: freshIp() }));
    expect(res.status).toBe(413);
    expect(await res.json()).toEqual({ ok: false, reason: "file_too_large" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("provider timeout → 504 timeout", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        const err = new Error("timed out");
        (err as Error & { name: string }).name = "TimeoutError";
        throw err;
      })
    );
    const res = await POST(audioRequest({ ip: freshIp() }));
    expect(res.status).toBe(504);
    expect(await res.json()).toEqual({ ok: false, reason: "timeout" });
  });

  test("provider rate limit → 429 rate_limited", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("slow down", { status: 429 })));
    const res = await POST(audioRequest({ ip: freshIp() }));
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ ok: false, reason: "rate_limited" });
  });

  test("invalid API key upstream → 503 invalid_api_key", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("no", { status: 401 })));
    const res = await POST(audioRequest({ ip: freshIp() }));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ ok: false, reason: "invalid_api_key" });
  });

  test("malformed provider response → 502 invalid_response", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("not-json{", { status: 200 })));
    const res = await POST(audioRequest({ ip: freshIp() }));
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ ok: false, reason: "invalid_response" });
  });

  test("empty transcript → 422 no_speech", async () => {
    vi.stubGlobal("fetch", groqOk("   "));
    const res = await POST(audioRequest({ ip: freshIp() }));
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({ ok: false, reason: "no_speech" });
  });

  test("rapid-fire uploads from the same source hit the cooldown", async () => {
    vi.stubGlobal("fetch", groqOk("first"));
    const ip = freshIp();
    const first = await POST(audioRequest({ ip }));
    expect(first.status).toBe(200);
    const second = await POST(audioRequest({ ip }));
    expect(second.status).toBe(429);
    expect(await second.json()).toEqual({ ok: false, reason: "rate_limited" });
  });
});
