// lib/rateLimit.ts
//
// v1.8.3 — a small fixed-window rate limiter for the public POST endpoints that
// cost money or CPU per call (/api/analyze can call a paid LLM provider when a
// key is configured; /api/analyze-llm always does).
//
// It is PER INSTANCE, like the cooldowns already used by /api/app-feedback,
// /api/newsletter/subscribe and /api/transcribe: serverless instances do not
// share memory, so this caps what one client can push through one warm
// instance — enough to stop a loop or a casual script, not a distributed
// attack. A shared store (see docs/seo-proposals.md §1) is the real fix and is
// deliberately not added here: it needs new infrastructure.
//
// Pure and clock-injectable so it can be tested without timers.

import { createHash } from "crypto";

export type RateLimitDecision = { allowed: boolean; remaining: number; retryAfterSec: number };

export type RateLimiter = {
  check(key: string, now?: number): RateLimitDecision;
  /** Test helper. */
  size(): number;
};

export function createRateLimiter(opts: { limit: number; windowMs: number; maxKeys?: number }): RateLimiter {
  const { limit, windowMs } = opts;
  const maxKeys = opts.maxKeys ?? 2000;
  const buckets = new Map<string, { count: number; windowStart: number }>();

  function prune(now: number) {
    if (buckets.size <= maxKeys) return;
    for (const [key, entry] of buckets) {
      if (now - entry.windowStart >= windowMs) buckets.delete(key);
    }
    // Still over the cap (a flood of distinct keys inside one window): drop the oldest half.
    if (buckets.size > maxKeys) {
      let drop = Math.ceil(buckets.size / 2);
      for (const key of buckets.keys()) {
        if (drop-- <= 0) break;
        buckets.delete(key);
      }
    }
  }

  return {
    check(key, now = Date.now()) {
      const entry = buckets.get(key);
      if (!entry || now - entry.windowStart >= windowMs) {
        buckets.set(key, { count: 1, windowStart: now });
        prune(now);
        return { allowed: true, remaining: limit - 1, retryAfterSec: 0 };
      }
      if (entry.count >= limit) {
        return { allowed: false, remaining: 0, retryAfterSec: Math.max(1, Math.ceil((entry.windowStart + windowMs - now) / 1000)) };
      }
      entry.count += 1;
      return { allowed: true, remaining: limit - entry.count, retryAfterSec: 0 };
    },
    size: () => buckets.size,
  };
}

/**
 * A privacy-safe key for the caller: a short hash of the first address in
 * `x-forwarded-for` (the client, as the platform's proxy saw it). The address
 * itself is never stored or logged. Requests without the header (local
 * development, tests) share one bucket.
 */
export function clientKey(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0]?.trim() || headers.get("x-real-ip")?.trim() || "local";
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}
