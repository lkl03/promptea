import { describe, expect, test, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ✅ mock: no queremos conectar a Firebase en tests
vi.mock("@/lib/telemetry/server", () => {
  return {
    upsertAnalysisEvent: vi.fn().mockResolvedValue({ ok: true }),
  };
});

import { upsertAnalysisEvent } from "@/lib/telemetry/server";
import { POST } from "@/app/api/analyze/route"; // <- si tu path difiere, ajustalo

describe("API /api/analyze", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("x-ui-lang=en wins over body lang", async () => {
    const req = new NextRequest("http://localhost/api/analyze", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ui-lang": "en",
      },
      body: JSON.stringify({
        prompt: "hi how are you?",
        target: "gpt",
        lang: "es", // a propósito errado
        purpose: "text",
        sessionId: "session_test_1234567890",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(String(json?.meta?.analysisId ?? "")).toHaveLength(36);

    // ✅ backend realmente tomó EN
    expect(upsertAnalysisEvent).toHaveBeenCalledTimes(1);
    const arg = (upsertAnalysisEvent as any).mock.calls[0][0];
    expect(arg.lang).toBe("en");

    // ✅ y el prompt optimizado sale en inglés
    expect(String(json.optimizedPrompt)).toContain("INSTRUCTIONS:");
    expect(String(json.optimizedPrompt)).not.toContain("INSTRUCCIONES:");
  });

  test("x-ui-lang=es wins over body lang", async () => {
    const req = new NextRequest("http://localhost/api/analyze", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ui-lang": "es",
      },
      body: JSON.stringify({
        prompt: "hola, cómo estás?",
        target: "gpt",
        lang: "en", // a propósito errado
        purpose: "text",
        sessionId: "session_test_1234567890",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const json = await res.json();

    expect(upsertAnalysisEvent).toHaveBeenCalledTimes(1);
    const arg = (upsertAnalysisEvent as any).mock.calls[0][0];
    expect(arg.lang).toBe("es");

    expect(String(json.optimizedPrompt)).toContain("INSTRUCCIONES:");
    expect(String(json.optimizedPrompt)).not.toContain("INSTRUCTIONS:");
  });
});
