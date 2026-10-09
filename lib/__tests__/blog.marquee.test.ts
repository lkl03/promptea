// v1.7.0 — homepage news marquee eligibility.

import { describe, expect, test } from "vitest";
import { selectMarqueeItems, MARQUEE_MAX_ITEMS } from "@/lib/blog/marquee";

const NOW = new Date("2026-10-09T15:00:00.000Z"); // 12:00 ART

type A = Parameters<typeof selectMarqueeItems>[0][number];

function a(slug: string, hoursAgo: number, o: Partial<A> = {}): A {
  return {
    slug,
    title: `Title ${slug}`,
    publishedAt: new Date(NOW.getTime() - hoursAgo * 3_600_000).toISOString(),
    eventDate: "2026-10-08",
    category: "model-release",
    status: "published",
    ...o,
  };
}

describe("selectMarqueeItems", () => {
  test("only the last 72 hours, newest first", () => {
    const items = selectMarqueeItems([a("old", 80), a("mid", 30), a("new", 2), a("edge", 71.9)], NOW);
    expect(items.map((i) => i.slug)).toEqual(["new", "mid", "edge"]);
  });

  test("an old article edited recently is NOT rejuvenated (publishedAt rules, not updatedAt)", () => {
    const edited = { ...a("edited", 200), updatedAt: NOW.toISOString() } as A;
    expect(selectMarqueeItems([edited], NOW)).toEqual([]);
  });

  test("future publications and future event dates are excluded", () => {
    const items = selectMarqueeItems(
      [a("future-pub", -1), a("future-event", 1, { eventDate: "2026-10-10" }), a("ok", 1)],
      NOW
    );
    expect(items.map((i) => i.slug)).toEqual(["ok"]);
  });

  test("drafts, missing or malformed dates are excluded", () => {
    const items = selectMarqueeItems(
      [
        a("draft", 1, { status: "draft" as never }),
        a("nodate", 1, { publishedAt: null }),
        a("garbage", 1, { publishedAt: "not a date" }),
        a("corrected", 1, { status: "corrected" }),
      ],
      NOW
    );
    expect(items.map((i) => i.slug)).toEqual(["corrected"]);
  });

  test("no eligible news yields an empty list (the strip hides)", () => {
    expect(selectMarqueeItems([], NOW)).toEqual([]);
    expect(selectMarqueeItems([a("stale", 100)], NOW)).toEqual([]);
  });

  test("duplicates collapse and the list is capped", () => {
    const many = Array.from({ length: 30 }, (_, i) => a(`s${i}`, i));
    expect(selectMarqueeItems([...many, a("s0", 0)], NOW)).toHaveLength(MARQUEE_MAX_ITEMS);
    const dup = selectMarqueeItems([a("x", 1), a("x", 2)], NOW);
    expect(dup).toHaveLength(1);
  });
});
