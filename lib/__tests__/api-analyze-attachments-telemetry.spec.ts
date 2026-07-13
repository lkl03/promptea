// Telemetry sanitization + attachment metadata safety.
//
// This file existed as an empty stub and was silently skipped by the old
// vitest include pattern. v1.2.0 fills it in: telemetry must NEVER carry raw
// prompt or attachment content — only whitelisted operational metadata.

import { describe, expect, test } from "vitest";
import { sanitizeTelemetry } from "@/lib/telemetry/sanitize";

const baseEvent = {
  name: "analyze",
  ts: Date.now(),
  sessionId: "session-1234567890",
  engineVersion: "2.2.0",
};

describe("telemetry sanitization", () => {
  test("drops events that carry raw prompt content keys", () => {
    for (const forbidden of ["prompt", "optimizedPrompt", "input", "text", "content"]) {
      const evt = { ...baseEvent, [forbidden]: "SENSITIVE USER TEXT" };
      expect(sanitizeTelemetry(evt), `key ${forbidden} must poison the event`).toBeNull();
    }
  });

  test("passes through only whitelisted keys", () => {
    const evt = {
      ...baseEvent,
      lang: "es",
      target: "gpt",
      score: 80,
      // not whitelisted — must be stripped:
      userAgent: "Mozilla",
      email: "a@b.com",
      arbitrary: { nested: "data" },
    };
    const out = sanitizeTelemetry(evt);
    expect(out).not.toBeNull();
    expect(out).not.toHaveProperty("userAgent");
    expect(out).not.toHaveProperty("email");
    expect(out).not.toHaveProperty("arbitrary");
    expect(out).toMatchObject({ lang: "es", target: "gpt", score: 80 });
  });

  test("rejects events missing required identity fields", () => {
    expect(sanitizeTelemetry({ name: "analyze" })).toBeNull();
    expect(sanitizeTelemetry(null)).toBeNull();
    expect(sanitizeTelemetry("string")).toBeNull();
  });

  test("caps unbounded arrays (findingIds / recoIds)", () => {
    const evt = {
      ...baseEvent,
      findingIds: Array.from({ length: 200 }, (_, i) => `f${i}`),
      recoIds: Array.from({ length: 200 }, (_, i) => `r${i}`),
    };
    const out = sanitizeTelemetry(evt);
    expect(out?.findingIds?.length).toBeLessThanOrEqual(50);
    expect(out?.recoIds?.length).toBeLessThanOrEqual(50);
  });
});
