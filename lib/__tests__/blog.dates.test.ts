// lib/__tests__/blog.dates.test.ts
//
// v1.4.0 — the editorial clock.
//
// The single most consequential bug this feature could ship is a timezone bug:
// a Vercel function runs in UTC, and between 21:00 and 24:00 in Buenos Aires
// the UTC calendar date is already tomorrow. A naive
// `new Date().toISOString().slice(0, 10)` would then compute "today" as
// tomorrow, and every same-day guard downstream would silently agree with it.
//
// The boundary block below is the regression test for that. It is written with
// explicit UTC instants rather than any helper so it cannot drift with the
// implementation it is checking.

import { describe, expect, test } from "vitest";
import {
  checkFreshness,
  dailyDocId,
  dailyIdempotencyKey,
  daysBetween,
  editorialDate,
  editorialTime,
  formatEditorialDate,
  isEditorialDate,
} from "@/lib/blog/dates";
import { FIXED_INSTANT, TODAY, TOMORROW, YESTERDAY } from "@/lib/__tests__/blog.fixtures";

// Argentina is UTC-3 year round (no DST since 2009).
const at = (iso: string) => new Date(iso);

describe("editorialDate — UTC/ART rollover", () => {
  test("UTC has rolled over to the 8th but Argentina is still on the 7th", () => {
    const instant = at("2026-08-08T02:30:00Z"); // 23:30 on the 7th in Buenos Aires

    // Prove the naive implementation would get this wrong, so this test is
    // provably testing something.
    expect(instant.toISOString().slice(0, 10)).toBe("2026-08-08");
    expect(editorialDate(instant)).toBe("2026-08-07");
  });

  test("boundary instants around the ART midnight", () => {
    // Still the 7th in Buenos Aires...
    expect(editorialDate(at("2026-08-07T03:00:00Z"))).toBe("2026-08-07"); // 00:00 ART
    expect(editorialDate(at("2026-08-07T23:00:00Z"))).toBe("2026-08-07"); // 20:00 ART
    expect(editorialDate(at("2026-08-08T00:00:00Z"))).toBe("2026-08-07"); // 21:00 ART
    expect(editorialDate(at("2026-08-08T00:59:00Z"))).toBe("2026-08-07"); // 21:59 ART
    expect(editorialDate(at("2026-08-08T02:59:59Z"))).toBe("2026-08-07"); // 23:59 ART

    // ...and now the 8th.
    expect(editorialDate(at("2026-08-08T03:00:00Z"))).toBe("2026-08-08"); // 00:00 ART
    expect(editorialDate(at("2026-08-08T03:00:01Z"))).toBe("2026-08-08");
    expect(editorialDate(at("2026-08-08T23:00:00Z"))).toBe("2026-08-08"); // 20:00 ART
  });

  test("the rollover holds across a month boundary", () => {
    expect(editorialDate(at("2026-09-01T02:30:00Z"))).toBe("2026-08-31");
    expect(editorialDate(at("2026-09-01T03:00:00Z"))).toBe("2026-09-01");
  });

  test("the rollover holds across a year boundary", () => {
    expect(editorialDate(at("2027-01-01T02:00:00Z"))).toBe("2026-12-31");
    expect(editorialDate(at("2027-01-01T03:00:00Z"))).toBe("2027-01-01");
  });

  test("leap day is reported as a real calendar day", () => {
    expect(editorialDate(at("2028-02-29T15:00:00Z"))).toBe("2028-02-29");
    expect(editorialDate(at("2028-03-01T02:00:00Z"))).toBe("2028-02-29");
  });

  test("output is always a valid editorial date, and zero-padded", () => {
    expect(editorialDate(at("2026-01-05T15:00:00Z"))).toBe("2026-01-05");
    expect(isEditorialDate(editorialDate(at("2026-01-05T15:00:00Z")))).toBe(true);
  });
});

describe("editorialTime", () => {
  test("reports Buenos Aires wall-clock time, not UTC", () => {
    expect(editorialTime(at("2026-08-08T02:30:00Z"))).toBe("23:30");
    expect(editorialTime(at("2026-08-07T12:00:00Z"))).toBe("09:00");
  });

  test("uses a 24-hour cycle where midnight is 00:00, not 24:00", () => {
    expect(editorialTime(at("2026-08-08T03:00:00Z"))).toBe("00:00");
  });
});

describe("isEditorialDate", () => {
  test("accepts real calendar days", () => {
    expect(isEditorialDate("2026-08-07")).toBe(true);
    expect(isEditorialDate("2026-12-31")).toBe(true);
    expect(isEditorialDate("2024-02-29")).toBe(true); // leap year
  });

  test("rejects impossible calendar days", () => {
    expect(isEditorialDate("2026-13-01")).toBe(false); // month 13
    expect(isEditorialDate("2026-00-10")).toBe(false); // month 0
    expect(isEditorialDate("2026-02-30")).toBe(false); // February 30
    expect(isEditorialDate("2026-04-31")).toBe(false); // April 31
    expect(isEditorialDate("2026-02-29")).toBe(false); // 2026 is not a leap year
    expect(isEditorialDate("2026-08-00")).toBe(false); // day 0
  });

  test("rejects malformed strings", () => {
    expect(isEditorialDate("2026-2-3")).toBe(false); // unpadded
    expect(isEditorialDate("not-a-date")).toBe(false);
    expect(isEditorialDate("")).toBe(false);
    expect(isEditorialDate("2026-08-07T00:00:00Z")).toBe(false);
    expect(isEditorialDate(" 2026-08-07")).toBe(false);
    expect(isEditorialDate("2026/08/07")).toBe(false);
  });

  test("rejects non-strings", () => {
    expect(isEditorialDate(20260807)).toBe(false);
    expect(isEditorialDate(null)).toBe(false);
    expect(isEditorialDate(undefined)).toBe(false);
    expect(isEditorialDate(new Date())).toBe(false);
    expect(isEditorialDate(["2026-08-07"])).toBe(false);
    expect(isEditorialDate({ date: "2026-08-07" })).toBe(false);
  });
});

describe("daysBetween", () => {
  test("is zero for the same day and signed by direction", () => {
    expect(daysBetween("2026-08-07", "2026-08-07")).toBe(0);
    expect(daysBetween("2026-08-08", "2026-08-07")).toBe(1);
    expect(daysBetween("2026-08-07", "2026-08-08")).toBe(-1);
  });

  test("crosses month boundaries", () => {
    expect(daysBetween("2026-03-01", "2026-02-28")).toBe(1); // 2026 is not a leap year
    expect(daysBetween("2024-03-01", "2024-02-28")).toBe(2); // 2024 is
    expect(daysBetween("2026-08-01", "2026-07-01")).toBe(31);
    expect(daysBetween("2026-07-01", "2026-06-01")).toBe(30);
  });

  test("crosses year boundaries", () => {
    expect(daysBetween("2027-01-01", "2026-12-31")).toBe(1);
    expect(daysBetween("2026-12-31", "2027-01-01")).toBe(-1);
    expect(daysBetween("2027-01-01", "2026-01-01")).toBe(365); // 2026: 365 days
    expect(daysBetween("2025-01-01", "2024-01-01")).toBe(366); // 2024: 366 days
  });
});

describe("checkFreshness", () => {
  test("today's editorial date is fresh", () => {
    const verdict = checkFreshness(TODAY, FIXED_INSTANT);
    expect(verdict).toEqual({ ok: true, today: TODAY });
  });

  test("yesterday's event is stale by exactly one day", () => {
    const verdict = checkFreshness(YESTERDAY, FIXED_INSTANT);
    expect(verdict.ok).toBe(false);
    if (verdict.ok) throw new Error("expected a stale verdict");
    expect(verdict.reason).toBe("stale_event");
    expect(verdict).toMatchObject({ reason: "stale_event", today: TODAY, daysStale: 1 });
  });

  test("staleness is reported in whole days", () => {
    const verdict = checkFreshness("2026-08-02", at("2026-08-07T14:00:00Z"));
    expect(verdict).toEqual({
      ok: false,
      reason: "stale_event",
      today: "2026-08-07",
      daysStale: 5,
    });
  });

  test("tomorrow's event is rejected as future", () => {
    const verdict = checkFreshness(TOMORROW, FIXED_INSTANT);
    expect(verdict).toEqual({
      ok: false,
      reason: "future_event",
      today: TODAY,
      daysAhead: 1,
    });
  });

  test("junk event dates are rejected as invalid, not as stale", () => {
    for (const junk of ["not-a-date", "2026-13-01", "2026-02-30", "", null, undefined, 42]) {
      const verdict = checkFreshness(junk, FIXED_INSTANT);
      expect(verdict).toEqual({ ok: false, reason: "invalid_event_date", today: TODAY });
    }
  });

  test("uses the ART date, so 02:30Z still counts yesterday's UTC date as fresh", () => {
    // 2026-08-08T02:30:00Z is 23:30 on 2026-08-07 in Buenos Aires. An event
    // dated 2026-08-07 is therefore TODAY's news, not yesterday's.
    const lateNight = at("2026-08-08T02:30:00Z");
    expect(checkFreshness("2026-08-07", lateNight)).toEqual({ ok: true, today: "2026-08-07" });

    // And the UTC date is, correctly, one day in the future from ART's view.
    expect(checkFreshness("2026-08-08", lateNight)).toEqual({
      ok: false,
      reason: "future_event",
      today: "2026-08-07",
      daysAhead: 1,
    });
  });

  test("half an hour later, past ART midnight, the verdicts flip", () => {
    const justAfterMidnight = at("2026-08-08T03:01:00Z");
    expect(checkFreshness("2026-08-08", justAfterMidnight)).toEqual({
      ok: true,
      today: "2026-08-08",
    });
    expect(checkFreshness("2026-08-07", justAfterMidnight)).toMatchObject({
      ok: false,
      reason: "stale_event",
      daysStale: 1,
    });
  });
});

describe("dailyIdempotencyKey / dailyDocId", () => {
  test("are deterministic for the same date", () => {
    expect(dailyIdempotencyKey("2026-08-07")).toBe(dailyIdempotencyKey("2026-08-07"));
    expect(dailyDocId("2026-08-07")).toBe(dailyDocId("2026-08-07"));
  });

  test("have the documented shapes", () => {
    expect(dailyIdempotencyKey("2026-08-07")).toBe("ai-daily:2026-08-07");
    expect(dailyDocId("2026-08-07")).toBe("ai-daily_2026-08-07");
  });

  test("differ per day, and the doc id never contains a colon", () => {
    expect(dailyIdempotencyKey("2026-08-07")).not.toBe(dailyIdempotencyKey("2026-08-08"));
    expect(dailyDocId("2026-08-07")).not.toBe(dailyDocId("2026-08-08"));
    expect(dailyDocId("2026-08-07")).not.toContain(":");
    expect(dailyDocId("2026-08-07")).not.toContain("/");
  });

  test("the key fits the schema's 10..64 character window", () => {
    const key = dailyIdempotencyKey(TODAY);
    expect(key.length).toBeGreaterThanOrEqual(10);
    expect(key.length).toBeLessThanOrEqual(64);
  });
});

describe("formatEditorialDate", () => {
  test("ES writes DD-MM-YYYY and EN writes YYYY-MM-DD", () => {
    expect(formatEditorialDate("2026-08-07", "es")).toBe("07-08-2026");
    expect(formatEditorialDate("2026-08-07", "en")).toBe("2026-08-07");
  });

  test("the two locales genuinely differ for an ambiguous date", () => {
    expect(formatEditorialDate("2026-01-02", "es")).toBe("02-01-2026");
    expect(formatEditorialDate("2026-01-02", "en")).toBe("2026-01-02");
    expect(formatEditorialDate("2026-01-02", "es")).not.toBe(
      formatEditorialDate("2026-01-02", "en")
    );
  });

  test("passes invalid input through untouched rather than inventing a date", () => {
    expect(formatEditorialDate("not-a-date", "es")).toBe("not-a-date");
    expect(formatEditorialDate("2026-13-01", "en")).toBe("2026-13-01");
  });
});
