// v1.8.3 — /api/analyze and /api/analyze-llm are throttled per client, and the
// baseline security headers are configured for every response.

import { describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/telemetry/server", () => ({ upsertAnalysisEvent: vi.fn().mockResolvedValue({ ok: true }) }));
const groq = { enabled: true, hints: vi.fn().mockResolvedValue({ questions: [] }) };
vi.mock("@/lib/llm/groq", () => ({ isGroqEnabled: () => groq.enabled, fetchGroqHints: (...a: unknown[]) => groq.hints(...a) }));

import { ANALYZE_RATE_LIMIT, POST as analyze } from "@/app/api/analyze/route";
import { ANALYZE_LLM_RATE_LIMIT, POST as analyzeLlm } from "@/app/api/analyze-llm/route";
import nextConfig, { SECURITY_HEADERS } from "@/next.config";

const request = (path: string, ip: string, body: unknown) =>
  new NextRequest(`http://localhost${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });

describe("/api/analyze rate limit", () => {
  const body = { prompt: "Write a haiku about rain.", target: "gpt", lang: "en", purpose: "text", sessionId: "session_test_1234567890" };

  test("the limit is generous for a person and finite for a script", () => {
    expect(ANALYZE_RATE_LIMIT.limit).toBeGreaterThanOrEqual(20);
    expect(ANALYZE_RATE_LIMIT.limit).toBeLessThanOrEqual(60);
  });

  test("a client over the limit gets 429 with Retry-After; another client is unaffected", async () => {
    for (let i = 0; i < ANALYZE_RATE_LIMIT.limit; i++) {
      const res = await analyze(request("/api/analyze", "198.51.100.1", body));
      expect(res.status).toBe(200);
    }
    const blocked = await analyze(request("/api/analyze", "198.51.100.1", body));
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get("retry-after"))).toBeGreaterThan(0);
    expect(blocked.headers.get("cache-control")).toBe("no-store");
    expect(await blocked.json()).toMatchObject({ error: "rate_limited" });

    expect((await analyze(request("/api/analyze", "198.51.100.2", body))).status).toBe(200);
  });

  test("a throttled request is refused before the body is read (no analysis, no telemetry)", async () => {
    const { upsertAnalysisEvent } = await import("@/lib/telemetry/server");
    vi.mocked(upsertAnalysisEvent).mockClear();
    const res = await analyze(request("/api/analyze", "198.51.100.1", { not: "valid" }));
    expect(res.status).toBe(429);
    expect(upsertAnalysisEvent).not.toHaveBeenCalled();
  });
});

describe("/api/analyze-llm rate limit", () => {
  const body = { prompt: "Write a haiku about rain.", lang: "en" };

  test("each client gets a handful of paid calls a minute, then 429", async () => {
    groq.hints.mockClear();
    for (let i = 0; i < ANALYZE_LLM_RATE_LIMIT.limit; i++) {
      expect((await analyzeLlm(request("/api/analyze-llm", "198.51.100.9", body))).status).toBe(200);
    }
    const blocked = await analyzeLlm(request("/api/analyze-llm", "198.51.100.9", body));
    expect(blocked.status).toBe(429);
    expect(groq.hints).toHaveBeenCalledTimes(ANALYZE_LLM_RATE_LIMIT.limit);
  });

  test("without a provider key it stays a free no-op and is not throttled", async () => {
    groq.enabled = false;
    for (let i = 0; i < ANALYZE_LLM_RATE_LIMIT.limit + 3; i++) {
      const res = await analyzeLlm(request("/api/analyze-llm", "198.51.100.10", body));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ enabled: false, hints: null });
    }
    groq.enabled = true;
  });
});

describe("security headers (next.config.ts)", () => {
  test("every path gets the baseline headers and the framework is not advertised", async () => {
    expect(nextConfig.poweredByHeader).toBe(false);
    const rules = await nextConfig.headers!();
    const all = rules.find((r) => r.source === "/:path*");
    expect(all?.headers).toEqual(SECURITY_HEADERS);
    const byKey = Object.fromEntries(SECURITY_HEADERS.map((h) => [h.key.toLowerCase(), h.value]));
    expect(byKey["x-content-type-options"]).toBe("nosniff");
    expect(byKey["x-frame-options"]).toBe("SAMEORIGIN");
    expect(byKey["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    // Voice dictation needs the microphone on this origin.
    expect(byKey["permissions-policy"]).toContain("microphone=(self)");
    expect(byKey["permissions-policy"]).toContain("camera=()");
  });
});
