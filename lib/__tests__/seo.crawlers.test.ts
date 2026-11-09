import { afterEach, describe, expect, it, vi } from "vitest";

import robots from "@/app/robots";
import { AI_CRAWLERS, DISALLOWED_PATHS, isCrawlerAllowed, type AiCrawler } from "@/lib/seo/crawlers";

type Rule = { userAgent?: string | string[]; allow?: string | string[]; disallow?: string | string[] };
const rulesOf = (r: ReturnType<typeof robots>): Rule[] => (Array.isArray(r.rules) ? (r.rules as Rule[]) : [r.rules as Rule]);

afterEach(() => {
  vi.doUnmock("@/lib/seo/crawlers");
  vi.resetModules();
});

describe("AI crawler policy", () => {
  it("lists every crawler token the policy is about", () => {
    const tokens = AI_CRAWLERS.map((c) => c.userAgent);
    for (const t of [
      "GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot", "Claude-User",
      "PerplexityBot", "Perplexity-User", "Google-Extended", "Applebot-Extended", "CCBot", "Meta-ExternalAgent",
    ]) {
      expect(tokens, t).toContain(t);
    }
    expect(new Set(tokens).size).toBe(tokens.length);
  });

  it("classifies each crawler and documents it", () => {
    for (const c of AI_CRAWLERS) {
      expect(["search", "user", "training"], c.userAgent).toContain(c.kind);
      expect(c.operator.length).toBeGreaterThan(0);
      expect(c.note.length).toBeGreaterThan(10);
    }
  });

  it("emits one explicit rule per crawler plus the catch-all, with the shared disallow list repeated", () => {
    const rules = rulesOf(robots());
    expect(rules[0]).toMatchObject({ userAgent: "*", allow: "/" });
    for (const c of AI_CRAWLERS) {
      const rule = rules.find((r) => r.userAgent === c.userAgent);
      expect(rule, c.userAgent).toBeDefined();
      if (isCrawlerAllowed(c)) {
        expect(rule).toMatchObject({ allow: "/", disallow: [...DISALLOWED_PATHS] });
      } else {
        expect(rule).toMatchObject({ disallow: "/" });
      }
    }
    expect(rules.filter((r) => r.userAgent !== "*")).toHaveLength(AI_CRAWLERS.length);
  });

  it("points at the sitemap and host", () => {
    const r = robots();
    expect(r.sitemap).toMatch(/\/sitemap\.xml$/);
    expect(r.host).toMatch(/^https?:\/\//);
  });

  it("allows everything by default (the current policy of the owner)", () => {
    expect(AI_CRAWLERS.every(isCrawlerAllowed)).toBe(true);
  });

  it("applies the kind switch before the per-entry flag", () => {
    const a: AiCrawler = { userAgent: "X", operator: "o", kind: "training", allow: true, note: "n" };
    expect(isCrawlerAllowed(a)).toBe(true);
    expect(isCrawlerAllowed({ ...a, allow: false })).toBe(false);
  });

  it("is editable: robots.txt follows the policy module (training bots refused)", async () => {
    vi.resetModules();
    vi.doMock("@/lib/seo/crawlers", async () => {
      const real = await vi.importActual<typeof import("@/lib/seo/crawlers")>("@/lib/seo/crawlers");
      return { ...real, isCrawlerAllowed: (c: AiCrawler) => c.kind !== "training" && c.allow };
    });
    const { default: robotsRefused } = await import("@/app/robots");
    const rules = rulesOf(robotsRefused());
    expect(rules.find((r) => r.userAgent === "GPTBot")).toMatchObject({ disallow: "/" });
    expect(rules.find((r) => r.userAgent === "ClaudeBot")).toMatchObject({ disallow: "/" });
    expect(rules.find((r) => r.userAgent === "OAI-SearchBot")).toMatchObject({ allow: "/" });
    expect(rules.find((r) => r.userAgent === "PerplexityBot")).toMatchObject({ allow: "/" });
  });
});
