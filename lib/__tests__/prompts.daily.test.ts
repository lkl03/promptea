import { describe, expect, test } from "vitest";
import { DAILY_PROMPTS, dayOfYearUTC, getDailyPrompt } from "@/lib/prompts/daily";

describe("Prompt of the Day", () => {
  test("dataset is non-empty and covers diverse categories", () => {
    expect(DAILY_PROMPTS.length).toBeGreaterThanOrEqual(5);
    const cats = new Set(DAILY_PROMPTS.map((p) => p.category));
    expect(cats.size).toBeGreaterThanOrEqual(5);
  });

  test("each prompt has both ES and EN variants", () => {
    for (const p of DAILY_PROMPTS) {
      expect(typeof p.title.es).toBe("string");
      expect(typeof p.title.en).toBe("string");
      expect(typeof p.prompt.es).toBe("string");
      expect(typeof p.prompt.en).toBe("string");
      expect(p.title.es.length).toBeGreaterThan(0);
      expect(p.title.en.length).toBeGreaterThan(0);
      expect(p.prompt.es.length).toBeGreaterThan(20);
      expect(p.prompt.en.length).toBeGreaterThan(20);
    }
  });

  test("rotation is deterministic for the same date", () => {
    const sameDay = new Date(Date.UTC(2026, 3, 30));
    const a = getDailyPrompt(sameDay);
    const b = getDailyPrompt(sameDay);
    expect(a).toEqual(b);
  });

  test("rotation eventually changes within DAILY_PROMPTS.length days", () => {
    const start = new Date(Date.UTC(2026, 0, 1));
    const seen = new Set<string>();
    for (let i = 0; i < DAILY_PROMPTS.length; i++) {
      const d = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
      seen.add(getDailyPrompt(d).title.en);
    }
    // We expect to hit every prompt at least once across the cycle.
    expect(seen.size).toBe(DAILY_PROMPTS.length);
  });

  test("dayOfYearUTC handles UTC boundaries", () => {
    expect(dayOfYearUTC(new Date(Date.UTC(2026, 0, 1)))).toBe(1);
    expect(dayOfYearUTC(new Date(Date.UTC(2026, 11, 31)))).toBe(365);
  });
});
