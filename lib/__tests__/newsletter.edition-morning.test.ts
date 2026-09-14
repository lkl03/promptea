// lib/__tests__/newsletter.edition-morning.test.ts
//
// v1.5.0 — daily-morning edition and expanded categories.
//
// The daily-morning edition is a second daily slot that shares the same
// freshness and backdate rules as the main daily edition but carries its own
// document-id prefix (`ai-morning`) so the two never collide. These tests
// pin the domain constants, the freshness guard, and the derived identifiers
// for the new edition.
//
// Like blog.editions.test.ts, every date is derived from a fixed instant so
// nothing here rots when the wall clock moves past it.

import { describe, expect, test } from "vitest";
import {
  checkFreshness,
  editionDocId,
  editionIdempotencyKey,
  editorialDate,
} from "@/lib/blog/dates";
import { BLOG_CATEGORIES, BLOG_EDITIONS, EDITION_KEY_PREFIX } from "@/lib/domain";

// ---------------------------------------------------------------------------
// The fixed clock — same pattern as blog.editions.test.ts
// ---------------------------------------------------------------------------

const FIXED_INSTANT = new Date("2026-09-14T14:00:00.000Z");
const DAY_MS = 86_400_000;

function dayOffset(days: number): string {
  return editorialDate(new Date(FIXED_INSTANT.getTime() + days * DAY_MS));
}

const TODAY = dayOffset(0);
const YESTERDAY = dayOffset(-1);
const TOMORROW = dayOffset(1);

// ---------------------------------------------------------------------------
// BLOG_EDITIONS includes daily-morning
// ---------------------------------------------------------------------------

describe("BLOG_EDITIONS — daily-morning is a first-class edition", () => {
  test("daily-morning is in the BLOG_EDITIONS array", () => {
    expect(BLOG_EDITIONS).toContain("daily-morning");
  });

  test("EDITION_KEY_PREFIX maps daily-morning to ai-morning", () => {
    expect(EDITION_KEY_PREFIX["daily-morning"]).toBe("ai-morning");
  });
});

// ---------------------------------------------------------------------------
// New categories
// ---------------------------------------------------------------------------

describe("BLOG_CATEGORIES — v1.5.0 additions", () => {
  test.each(["open-source", "business", "agents", "benchmarks", "energy"])(
    "%s is in BLOG_CATEGORIES",
    (cat) => {
      expect(BLOG_CATEGORIES).toContain(cat);
    }
  );
});

// ---------------------------------------------------------------------------
// Freshness guard for daily-morning
// ---------------------------------------------------------------------------

describe("checkFreshness — daily-morning follows daily rules", () => {
  const now = FIXED_INSTANT;

  test("a same-day event with edition daily-morning passes", () => {
    expect(checkFreshness(TODAY, { now, edition: "daily-morning" })).toEqual({
      ok: true,
      today: TODAY,
      backdated: false,
      daysStale: 0,
    });
  });

  test("a stale event with edition daily-morning and allowBackdate passes", () => {
    expect(
      checkFreshness(YESTERDAY, { now, edition: "daily-morning", allowBackdate: true })
    ).toEqual({
      ok: true,
      today: TODAY,
      backdated: true,
      daysStale: 1,
    });
  });

  test("a stale event with edition daily-morning WITHOUT allowBackdate fails with stale_event", () => {
    const verdict = checkFreshness(YESTERDAY, { now, edition: "daily-morning" });
    expect(verdict.ok).toBe(false);
    if (verdict.ok) throw new Error("expected stale verdict");
    expect(verdict.reason).toBe("stale_event");
  });

  test("a post-dated event with edition daily-morning fails with future_event", () => {
    const verdict = checkFreshness(TOMORROW, { now, edition: "daily-morning" });
    expect(verdict.ok).toBe(false);
    if (verdict.ok) throw new Error("expected future verdict");
    expect(verdict.reason).toBe("future_event");
  });
});

// ---------------------------------------------------------------------------
// Document ID generation
// ---------------------------------------------------------------------------

describe("editionDocId / editionIdempotencyKey — daily-morning identifiers", () => {
  test("editionDocId for daily-morning uses ai-morning prefix", () => {
    expect(editionDocId("2026-09-14", "daily-morning")).toBe("ai-morning_2026-09-14");
  });

  test("editionIdempotencyKey for daily-morning uses ai-morning prefix", () => {
    expect(editionIdempotencyKey("2026-09-14", "daily-morning")).toBe("ai-morning:2026-09-14");
  });
});

// ---------------------------------------------------------------------------
// Morning and evening editions must not collide
// ---------------------------------------------------------------------------

describe("morning and evening editions on the same date never collide", () => {
  test("editionDocId differs between daily and daily-morning", () => {
    expect(editionDocId("2026-09-14", "daily")).not.toBe(
      editionDocId("2026-09-14", "daily-morning")
    );
  });

  test("editionIdempotencyKey differs between daily and daily-morning", () => {
    expect(editionIdempotencyKey("2026-09-14", "daily")).not.toBe(
      editionIdempotencyKey("2026-09-14", "daily-morning")
    );
  });

  test("all four editions on the same date produce distinct doc ids", () => {
    const date = "2026-09-14";
    const ids = BLOG_EDITIONS.map((e) => editionDocId(date, e));
    expect(new Set(ids).size).toBe(BLOG_EDITIONS.length);
  });
});
