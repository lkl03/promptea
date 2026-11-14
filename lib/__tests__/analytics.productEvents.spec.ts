// v1.8.6 — Vercel Analytics custom events: few, at most two enum properties
// (the Pro plan limit), never prompt text, skipped under automation.

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const track = vi.fn();
vi.mock("@vercel/analytics", () => ({ track: (...args: unknown[]) => track(...args) }));

import { trackProductEvent, type ProductEvent } from "@/lib/analytics/productEvents";
import { LANGS, TARGETS } from "@/lib/domain";

const EVENTS: ProductEvent[] = [
  { name: "Prompt Analyzed", lang: "es", target: "claude" },
  { name: "Prompt Copied", lang: "en", target: "gpt" },
  { name: "Target Changed", lang: "pt", target: "gemini" },
  { name: "Template Copied", lang: "es", source: "guide" },
  { name: "Template Copied", lang: "en", source: "library" },
];

beforeEach(() => {
  track.mockClear();
  vi.stubGlobal("navigator", { webdriver: false });
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("trackProductEvent", () => {
  test.each(EVENTS)("sends $name with at most two closed-enum properties", (e) => {
    trackProductEvent(e);
    expect(track).toHaveBeenCalledTimes(1);
    const [name, props] = track.mock.calls[0] as [string, Record<string, unknown>];
    expect(name).toBe(e.name);
    expect(Object.keys(props).length).toBeLessThanOrEqual(2);
    expect(LANGS).toContain(props.lang);
    if ("target" in props) expect(TARGETS).toContain(props.target);
    if ("source" in props) expect(["guide", "library"]).toContain(props.source);
    for (const v of Object.values(props)) expect(String(v).length).toBeLessThan(20);
  });

  test("is skipped in an automated browser", () => {
    vi.stubGlobal("navigator", { webdriver: true });
    trackProductEvent(EVENTS[0]);
    expect(track).not.toHaveBeenCalled();
  });

  test("never throws when the analytics script fails", () => {
    track.mockImplementationOnce(() => {
      throw new Error("blocked");
    });
    expect(() => trackProductEvent(EVENTS[1])).not.toThrow();
  });
});
