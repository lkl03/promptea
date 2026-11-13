import { describe, expect, test } from "vitest";
import { clientKey, createRateLimiter } from "@/lib/rateLimit";

describe("createRateLimiter", () => {
  test("allows up to the limit inside a window, then refuses with a Retry-After", () => {
    const rl = createRateLimiter({ limit: 3, windowMs: 60_000 });
    expect(rl.check("a", 0)).toEqual({ allowed: true, remaining: 2, retryAfterSec: 0 });
    expect(rl.check("a", 1_000).allowed).toBe(true);
    expect(rl.check("a", 2_000)).toEqual({ allowed: true, remaining: 0, retryAfterSec: 0 });
    expect(rl.check("a", 30_000)).toEqual({ allowed: false, remaining: 0, retryAfterSec: 30 });
    expect(rl.check("a", 59_999)).toEqual({ allowed: false, remaining: 0, retryAfterSec: 1 });
  });

  test("a new window starts when the previous one has elapsed", () => {
    const rl = createRateLimiter({ limit: 1, windowMs: 10_000 });
    expect(rl.check("a", 0).allowed).toBe(true);
    expect(rl.check("a", 9_999).allowed).toBe(false);
    expect(rl.check("a", 10_000).allowed).toBe(true);
  });

  test("keys do not affect each other", () => {
    const rl = createRateLimiter({ limit: 1, windowMs: 10_000 });
    expect(rl.check("a", 0).allowed).toBe(true);
    expect(rl.check("b", 0).allowed).toBe(true);
    expect(rl.check("a", 1).allowed).toBe(false);
  });

  test("memory stays bounded under a flood of distinct keys", () => {
    const rl = createRateLimiter({ limit: 5, windowMs: 60_000, maxKeys: 100 });
    for (let i = 0; i < 5_000; i++) rl.check(`k${i}`, i);
    expect(rl.size()).toBeLessThanOrEqual(101);
  });

  test("expired keys are pruned first", () => {
    const rl = createRateLimiter({ limit: 5, windowMs: 1_000, maxKeys: 10 });
    for (let i = 0; i < 10; i++) rl.check(`old${i}`, 0);
    rl.check("fresh", 5_000);
    expect(rl.size()).toBe(1);
  });
});

describe("clientKey", () => {
  test("hashes the first forwarded address and never returns it", () => {
    const key = clientKey(new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }));
    expect(key).toMatch(/^[0-9a-f]{32}$/);
    expect(key).not.toContain("203");
    expect(key).toBe(clientKey(new Headers({ "x-forwarded-for": "203.0.113.7" })));
    expect(key).not.toBe(clientKey(new Headers({ "x-forwarded-for": "203.0.113.8" })));
  });

  test("requests without a forwarded address share one bucket", () => {
    expect(clientKey(new Headers())).toBe(clientKey(new Headers()));
  });
});
