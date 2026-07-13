import { describe, expect, test, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/telemetry/server", () => {
  return {
    upsertAnalysisEvent: vi.fn().mockResolvedValue({ ok: true }),
  };
});

import { upsertAnalysisEvent } from "@/lib/telemetry/server";
import { POST } from "@/app/api/analyze/route";

describe("API /api/analyze", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("normalizes purpose aliases before validation", async () => {
    const req = new NextRequest("http://localhost/api/analyze", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ui-lang": "es",
      },
      body: JSON.stringify({
        prompt: "Traducí el archivo al inglés.",
        target: "gpt",
        lang: "es",
        purpose: "translate",
        sessionId: "session_test_1234567890",
        attachments: [
          {
            name: "source.txt",
            mime: "text/plain",
            text: "Buen día. ¿Cómo estás?",
            size: 25,
          },
        ],
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.meta.purpose).toBe("translation");
    expect(json.meta.attachmentsCount).toBe(1);
  });

  test("summarization with attachments should not return prompt_injection", async () => {
    const req = new NextRequest("http://localhost/api/analyze", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ui-lang": "es",
      },
      body: JSON.stringify({
        prompt: "Haceme un resumen de este archivo",
        target: "gpt",
        lang: "es",
        purpose: "summarization",
        sessionId: "session_test_1234567890",
        attachments: [
          {
            name: "notes.txt",
            mime: "text/plain",
            text: "2018 fue un año cargado de eventos políticos, culturales y tecnológicos.",
            size: 86,
          },
        ],
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    const findingIds = (json.findings ?? []).map((f: { id: string }) => f.id);

    expect(findingIds).not.toContain("prompt_injection");
    expect(findingIds).not.toContain("missing_goal");
    expect(findingIds).not.toContain("missing_input_data");
    expect(json.meta.attachmentsCount).toBe(1);
  });

  test("attachments are still rejected for image purpose", async () => {
    const req = new NextRequest("http://localhost/api/analyze", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ui-lang": "en",
      },
      body: JSON.stringify({
        prompt: "Make a cinematic image.",
        target: "gpt",
        lang: "en",
        purpose: "image",
        sessionId: "session_test_1234567890",
        attachments: [
          {
            name: "notes.md",
            mime: "text/markdown",
            text: "This should not be accepted for image prompts.",
            size: 44,
          },
        ],
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(String(json.error).toLowerCase()).toContain("attachments");
  });

  test("telemetry still receives normalized purpose and score metadata", async () => {
    const req = new NextRequest("http://localhost/api/analyze", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ui-lang": "en",
      },
      body: JSON.stringify({
        prompt: "Summarize the attached file in 3 bullets.",
        target: "gpt",
        lang: "en",
        purpose: "summarization",
        sessionId: "session_test_1234567890",
        attachments: [
          {
            name: "notes.md",
            mime: "text/markdown",
            text: "Retention increased by 12%. Activation increased by 6%.",
            size: 58,
          },
        ],
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    expect(upsertAnalysisEvent).toHaveBeenCalledTimes(1);
    const arg = vi.mocked(upsertAnalysisEvent).mock.calls[0][0];
    expect(arg.purpose).toBe("summarization");
    expect(typeof arg.score).toBe("number");
  });
});