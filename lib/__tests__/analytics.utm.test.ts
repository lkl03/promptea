// v1.8.8 — UTM links for the weekly tweets (lib/analytics/utm.ts) and the
// routine prompt that builds them by hand (docs/social/weekly-tweets-routine.md).

import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { TWEET_TYPES, isTweetType, tweetCampaign, tweetLink } from "@/lib/analytics/utm";

describe("tweetLink", () => {
  test("tags a homepage link", () => {
    expect(tweetLink("https://promptea.me", "tip", "2026-11-23")).toBe(
      "https://promptea.me/?utm_source=x&utm_medium=social&utm_campaign=tweets-2026-11-23&utm_content=tip"
    );
  });
  test("keeps the #m= hash after the query (benchmarks model analysis)", () => {
    const url = tweetLink("https://www.promptea.me/en/benchmarks#m=anthropic%2Fclaude-fable-5.2-20261109", "benchmarks", "2026-11-23");
    expect(url).toBe(
      "https://www.promptea.me/en/benchmarks?utm_source=x&utm_medium=social&utm_campaign=tweets-2026-11-23&utm_content=benchmarks#m=anthropic%2Fclaude-fable-5.2-20261109"
    );
    expect(new URL(url).hash).toBe("#m=anthropic%2Fclaude-fable-5.2-20261109");
  });
  test("replaces old utm_* and keeps other parameters", () => {
    const url = new URL(tweetLink("https://www.promptea.me/en/analyzer?p=hi&utm_source=buffer&utm_content=old", "rough-idea", "2026-11-23"));
    expect(url.searchParams.get("p")).toBe("hi");
    expect(url.searchParams.getAll("utm_source")).toEqual(["x"]);
    expect(url.searchParams.get("utm_content")).toBe("rough-idea");
  });
  test("refuses other hosts, unknown types and bad weeks", () => {
    expect(() => tweetLink("https://example.com/x", "tip", "2026-11-23")).toThrow(/promptea\.me/);
    expect(() => tweetLink("https://promptea.me.evil.com/", "tip", "2026-11-23")).toThrow();
    expect(() => tweetLink("https://promptea.me", "promo" as never, "2026-11-23")).toThrow(/tweet type/);
    expect(() => tweetCampaign("23/11/2026")).toThrow();
  });
  test("the six types", () => {
    expect([...TWEET_TYPES]).toEqual(["tip", "model-choice", "ai-daily", "benchmarks", "feature", "rough-idea"]);
    expect(isTweetType("ai-daily")).toBe(true);
    expect(isTweetType("promo")).toBe(false);
  });
});

describe("the routine prompt builds the same links", () => {
  const prompt = readFileSync(path.resolve(__dirname, "../../docs/social/weekly-tweets-routine.md"), "utf8");
  test("names every type and the exact parameters", () => {
    for (const t of TWEET_TYPES) expect(prompt).toContain(`\`${t}\``);
    expect(prompt).toContain("utm_source=x&utm_medium=social&utm_campaign=tweets-<MONDAY>&utm_content=<TYPE>");
  });
  test("its worked examples are what tweetLink produces", () => {
    const examples = [...prompt.matchAll(/EXAMPLE: (\S+) type=(\S+) monday=(\S+) → (\S+)/g)];
    expect(examples.length).toBeGreaterThanOrEqual(3);
    for (const [, base, type, monday, expected] of examples) {
      expect(tweetLink(base, type as never, monday)).toBe(expected);
    }
  });
});
