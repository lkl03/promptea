// lib/__tests__/blog.editions.test.ts
//
// v1.4.1 — editions, cadence and the backdating override.
//
// v1.4.0 could only express one idea: "today's story". v1.4.1 adds two weekly
// editions and a deliberate, disclosed escape hatch for publishing a daily
// story about an earlier event. Both additions touch the two places where a
// mistake is expensive and silent:
//
//   1. IDENTITY. A document id is derived, not random, so a retried run
//      addresses the same document instead of duplicating it. Adding editions
//      means one calendar date can now legitimately carry more than one post —
//      a Saturday holds both the weekly recap and any breaking daily story.
//      If the per-edition prefixes ever collapsed, the recap would silently
//      overwrite the day's news (or vice versa) with no error anywhere.
//   2. FRESHNESS. Backdating is the only way a stale event may be published,
//      so it must stay narrow: daily only, bounded by MAX_BACKDATE_DAYS, never
//      forward in time, and never without a reason the reader gets to see.
//
// Every date below is derived from a fixed instant through the real helpers,
// so nothing here rots when the wall clock moves past it.

import { describe, expect, test } from "vitest";
import {
  addDays,
  checkFreshness,
  daysBetween,
  editionDocId,
  editionIdempotencyKey,
  editorialDate,
  editorialWeekday,
  recapWindow,
  weekAheadWindow,
} from "@/lib/blog/dates";
import { BLOG_EDITIONS, EDITION_KEY_PREFIX, MAX_BACKDATE_DAYS } from "@/lib/domain";
import type { BlogEdition } from "@/lib/domain";
import { PublishPayloadSchema } from "@/lib/blog/types";
import type { LocaleContent, PublishPayload, Source } from "@/lib/blog/types";

// ---------------------------------------------------------------------------
// The fixed clock
//
// 2026-08-08T14:00:00Z is 11:00 in Buenos Aires on Saturday 2026-08-08 — the
// recap's own weekday, which is exactly the collision this file cares about.
// ---------------------------------------------------------------------------

const SATURDAY_INSTANT = new Date("2026-08-08T14:00:00.000Z");
const DAY_MS = 86_400_000;

/** Editorial calendar date `n` days from the fixed instant (negative = past). */
function dayOffset(days: number): string {
  return editorialDate(new Date(SATURDAY_INSTANT.getTime() + days * DAY_MS));
}

const TODAY = dayOffset(0); // Saturday 2026-08-08
const YESTERDAY = dayOffset(-1); // Friday 2026-08-07
const TOMORROW = dayOffset(1); // Sunday 2026-08-09

const SATURDAY = TODAY;
const SUNDAY = TOMORROW;

/** Argentina is UTC-3 year round (no DST since 2009), so these are unambiguous. */
const at = (iso: string) => new Date(iso);

// ---------------------------------------------------------------------------
// A local payload factory — deliberately independent of blog.fixtures.ts so the
// edition rules are pinned by content this file fully controls.
// ---------------------------------------------------------------------------

const EN_LOCALE: LocaleContent = {
  slug: "example-labs-ships-orion",
  title: "Example Labs ships Orion, its 400k-context model",
  deck: "The model card lists a 400k-token context window and lower output pricing than the previous generation.",
  summary:
    "Example Labs published the Orion model card, stating a 400k-token context window and a lower price per million output tokens. No independent benchmarks exist yet.",
  body: [
    {
      type: "paragraph",
      text: "Example Labs published the model card for Orion, which the company says is available in its public API.",
    },
  ],
  whyItMatters: ["A context window above 200k tokens changes what fits into a single request."],
  keyTakeaways: ["400k-token context window"],
  seoTitle: "Example Labs ships Orion (400k context)",
  metaDescription:
    "Example Labs published the Orion model card: a 400k-token context window and lower output pricing, available in the public API.",
};

const ES_LOCALE: LocaleContent = {
  slug: "example-labs-lanza-orion",
  title: "Example Labs lanza Orion, su modelo con contexto de 400k",
  deck: "La model card declara una ventana de contexto de 400k tokens y un precio de salida más bajo que la generación anterior.",
  summary:
    "Example Labs publicó la model card de Orion, con una ventana de contexto de 400k tokens y un precio más bajo por millón de tokens de salida. Todavía no hay benchmarks independientes.",
  body: [
    {
      type: "paragraph",
      text: "Example Labs publicó la model card de Orion, que según la empresa ya está disponible en su API pública.",
    },
  ],
  whyItMatters: ["Una ventana de más de 200k tokens cambia lo que te entra en un solo pedido."],
  keyTakeaways: ["Ventana de contexto de 400k tokens"],
  seoTitle: "Example Labs lanza Orion (contexto 400k)",
  metaDescription:
    "Example Labs publicó la model card de Orion: contexto de 400k tokens y precio de salida más bajo, disponible en la API pública.",
};

function sources(accessedAt: string): Source[] {
  return [
    {
      title: "Orion model card",
      publisher: "Example Labs",
      url: "https://example.com/labs/orion/model-card",
      sourceType: "model-card",
      primary: true,
      publishedAt: accessedAt,
      accessedAt,
    },
    {
      title: "Example Labs ships Orion with a 400k context window",
      publisher: "Example Wire",
      url: "https://example.com/wire/orion-launch",
      sourceType: "reporting",
      primary: false,
      publishedAt: accessedAt,
      accessedAt,
    },
  ];
}

/**
 * A schema-valid payload with `overrides` applied.
 *
 * `idempotencyKey` and the coverage window are re-derived from the resulting
 * edition + eventDate, so a caller that only moves the date never has to
 * remember the rules. Pass either explicitly to defeat that — which is how the
 * invalid cases below are built.
 */
function makePayload(overrides: Partial<PublishPayload> = {}): PublishPayload {
  const eventDate = overrides.eventDate ?? TODAY;
  const edition: BlogEdition = overrides.edition ?? "daily";
  const window =
    edition === "weekly-recap"
      ? recapWindow(eventDate)
      : edition === "week-ahead"
        ? weekAheadWindow(eventDate)
        : null;

  const base: PublishPayload = {
    idempotencyKey: editionIdempotencyKey(eventDate, edition),
    routineRunId: "run-editions-test",
    canonicalSlug: "example-labs-ships-orion",
    status: "published",
    eventDate,
    edition,
    coveredFrom: window ? window.from : null,
    coveredTo: window ? window.to : null,
    allowBackdate: false,
    backdateReason: null,
    importance: "P1",
    category: "model-release",
    tags: ["model-release"],
    companies: ["Example Labs"],
    models: ["Orion"],
    locales: { en: EN_LOCALE, es: ES_LOCALE },
    sources: sources(eventDate),
    singleSourceJustification: null,
    image: null,
    digestItems: null,
    dryRun: false,
  };

  return {
    ...base,
    ...overrides,
    eventDate,
    edition,
    idempotencyKey: overrides.idempotencyKey ?? base.idempotencyKey,
  };
}

type ParseResult = ReturnType<typeof PublishPayloadSchema.safeParse>;

/** Dotted issue paths, e.g. `coveredFrom`. */
function issuePaths(result: ParseResult): string[] {
  return result.success ? [] : result.error.issues.map((i) => i.path.join("."));
}

function expectRejected(input: unknown, expectedPath: string): ParseResult {
  const result = PublishPayloadSchema.safeParse(input);
  expect(result.success).toBe(false);
  expect(issuePaths(result)).toContain(expectedPath);
  return result;
}

function expectAccepted(input: unknown): void {
  const result = PublishPayloadSchema.safeParse(input);
  if (!result.success) {
    throw new Error(`expected a valid payload, got issues: ${JSON.stringify(issuePaths(result))}`);
  }
  expect(result.success).toBe(true);
}

// ---------------------------------------------------------------------------
// Identity: one date, three editions, three documents
// ---------------------------------------------------------------------------

describe("editionDocId / editionIdempotencyKey — per-edition namespaces", () => {
  test("each edition has its documented prefix", () => {
    expect(editionDocId(SATURDAY, "daily")).toBe(`ai-daily_${SATURDAY}`);
    expect(editionDocId(SATURDAY, "weekly-recap")).toBe(`ai-weekly_${SATURDAY}`);
    expect(editionDocId(SATURDAY, "week-ahead")).toBe(`ai-ahead_${SATURDAY}`);

    expect(editionIdempotencyKey(SATURDAY, "daily")).toBe(`ai-daily:${SATURDAY}`);
    expect(editionIdempotencyKey(SATURDAY, "weekly-recap")).toBe(`ai-weekly:${SATURDAY}`);
    expect(editionIdempotencyKey(SATURDAY, "week-ahead")).toBe(`ai-ahead:${SATURDAY}`);
  });

  test("the prefixes come from EDITION_KEY_PREFIX and stay in sync with it", () => {
    for (const edition of BLOG_EDITIONS) {
      const prefix = EDITION_KEY_PREFIX[edition];
      expect(editionDocId(SATURDAY, edition)).toBe(`${prefix}_${SATURDAY}`);
      expect(editionIdempotencyKey(SATURDAY, edition)).toBe(`${prefix}:${SATURDAY}`);
    }
  });

  test("a Saturday can hold BOTH a daily story and the weekly recap", () => {
    // This is the guarantee that lets a big Saturday story coexist with the
    // recap: same date, different documents, so neither overwrites the other.
    const dailyDoc = editionDocId(SATURDAY, "daily");
    const recapDoc = editionDocId(SATURDAY, "weekly-recap");

    expect(dailyDoc).not.toBe(recapDoc);
    expect(editionIdempotencyKey(SATURDAY, "daily")).not.toBe(
      editionIdempotencyKey(SATURDAY, "weekly-recap")
    );

    // And both payloads are individually publishable on that same date.
    expectAccepted(makePayload({ eventDate: SATURDAY, edition: "daily" }));
    expectAccepted(makePayload({ eventDate: SATURDAY, edition: "weekly-recap" }));
  });

  test("all three editions on one date produce three distinct ids and keys", () => {
    const docs = BLOG_EDITIONS.map((e) => editionDocId(SATURDAY, e));
    const keys = BLOG_EDITIONS.map((e) => editionIdempotencyKey(SATURDAY, e));

    expect(new Set(docs).size).toBe(BLOG_EDITIONS.length);
    expect(new Set(keys).size).toBe(BLOG_EDITIONS.length);
  });

  test("the daily edition is the default, matching the v1.4.0 callers", () => {
    expect(editionDocId(SATURDAY)).toBe(editionDocId(SATURDAY, "daily"));
    expect(editionIdempotencyKey(SATURDAY)).toBe(editionIdempotencyKey(SATURDAY, "daily"));
  });

  test("ids stay URL- and CLI-safe, and keys stay inside the schema's 10..64 window", () => {
    for (const edition of BLOG_EDITIONS) {
      const docId = editionDocId(SATURDAY, edition);
      expect(docId).not.toContain(":");
      expect(docId).not.toContain("/");
      expect(docId).not.toContain(" ");

      const key = editionIdempotencyKey(SATURDAY, edition);
      expect(key.length).toBeGreaterThanOrEqual(10);
      expect(key.length).toBeLessThanOrEqual(64);
    }
  });

  test("ids are deterministic per date and differ across dates", () => {
    for (const edition of BLOG_EDITIONS) {
      expect(editionDocId(SATURDAY, edition)).toBe(editionDocId(SATURDAY, edition));
      expect(editionDocId(SATURDAY, edition)).not.toBe(editionDocId(SUNDAY, edition));
    }
  });
});

// ---------------------------------------------------------------------------
// The editorial weekday — the cadence trigger
// ---------------------------------------------------------------------------

describe("editorialWeekday", () => {
  test("reports the Buenos Aires weekday, 0 = Sunday", () => {
    expect(editorialWeekday(at("2026-08-09T15:00:00Z"))).toBe(0); // Sunday
    expect(editorialWeekday(at("2026-08-10T15:00:00Z"))).toBe(1); // Monday
    expect(editorialWeekday(at("2026-08-07T15:00:00Z"))).toBe(5); // Friday
    expect(editorialWeekday(at("2026-08-08T15:00:00Z"))).toBe(6); // Saturday
  });

  test("an instant that is Saturday in UTC is still Friday in ART", () => {
    const instant = at("2026-08-08T02:30:00Z"); // 23:30 Friday in Buenos Aires

    // Prove the naive implementation would get this wrong.
    expect(instant.getUTCDay()).toBe(6); // Saturday in UTC
    expect(editorialWeekday(instant)).toBe(5); // Friday in ART
    expect(editorialDate(instant)).toBe("2026-08-07");
  });

  test("and an instant that is Sunday in UTC is still Saturday in ART", () => {
    const instant = at("2026-08-09T01:00:00Z"); // 22:00 Saturday in Buenos Aires

    expect(instant.getUTCDay()).toBe(0); // Sunday in UTC
    expect(editorialWeekday(instant)).toBe(6); // Saturday in ART — recap day
    expect(editorialDate(instant)).toBe("2026-08-08");
  });

  test("the two clocks agree again from 03:00Z, when ART crosses midnight", () => {
    expect(editorialWeekday(at("2026-08-08T02:59:59Z"))).toBe(5); // still Friday
    expect(editorialWeekday(at("2026-08-08T03:00:00Z"))).toBe(6); // now Saturday
    expect(editorialWeekday(at("2026-08-09T02:59:59Z"))).toBe(6); // still Saturday
    expect(editorialWeekday(at("2026-08-09T03:00:00Z"))).toBe(0); // now Sunday
  });

  test("ART is never AHEAD of UTC, so the weekday only ever lags", () => {
    // A run at midday UTC always agrees; a run just after UTC midnight lags.
    expect(editorialWeekday(at("2026-08-08T12:00:00Z"))).toBe(
      at("2026-08-08T12:00:00Z").getUTCDay()
    );
    expect(editorialWeekday(at("2026-08-08T00:30:00Z"))).not.toBe(
      at("2026-08-08T00:30:00Z").getUTCDay()
    );
  });

  test("the fixed instant this file publishes from is a Saturday", () => {
    expect(editorialWeekday(SATURDAY_INSTANT)).toBe(6);
    expect(editorialWeekday(new Date(SATURDAY_INSTANT.getTime() + DAY_MS))).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// addDays
// ---------------------------------------------------------------------------

describe("addDays", () => {
  test("zero is the identity", () => {
    expect(addDays("2026-08-08", 0)).toBe("2026-08-08");
  });

  test("crosses month boundaries in both directions", () => {
    expect(addDays("2026-08-31", 1)).toBe("2026-09-01");
    expect(addDays("2026-09-01", -1)).toBe("2026-08-31");
    expect(addDays("2026-07-31", 1)).toBe("2026-08-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28"); // 2026 is not a leap year
  });

  test("crosses year boundaries in both directions", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2027-01-01", -1)).toBe("2026-12-31");
    expect(addDays("2026-12-28", 7)).toBe("2027-01-04");
    expect(addDays("2027-01-04", -7)).toBe("2026-12-28");
  });

  test("lands on, and steps off, a leap day", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29"); // 2028 IS a leap year
    expect(addDays("2028-02-29", 1)).toBe("2028-03-01");
    expect(addDays("2028-03-01", -1)).toBe("2028-02-29");
    expect(addDays("2028-02-29", 365)).toBe("2029-02-28");
  });

  test("output stays zero-padded", () => {
    expect(addDays("2026-01-09", 1)).toBe("2026-01-10");
    expect(addDays("2026-10-01", -1)).toBe("2026-09-30");
    expect(addDays("2026-09-30", 1)).toBe("2026-10-01");
  });

  test("shifting and un-shifting round-trips", () => {
    for (const delta of [1, 6, 7, 30, 365]) {
      expect(addDays(addDays(TODAY, delta), -delta)).toBe(TODAY);
    }
  });
});

// ---------------------------------------------------------------------------
// The weekly windows
// ---------------------------------------------------------------------------

describe("recapWindow / weekAheadWindow", () => {
  test("a Saturday recap covers the preceding Sunday through that Saturday", () => {
    const window = recapWindow(SATURDAY);

    expect(window).toEqual({ from: "2026-08-02", to: "2026-08-08" });
    expect(window.to).toBe(SATURDAY);
    expect(editorialWeekday(at(`${window.from}T15:00:00Z`))).toBe(0); // Sunday
    expect(editorialWeekday(at(`${window.to}T15:00:00Z`))).toBe(6); // Saturday
  });

  test("a Sunday look-ahead covers that Sunday through the following Saturday", () => {
    const window = weekAheadWindow(SUNDAY);

    expect(window).toEqual({ from: "2026-08-09", to: "2026-08-15" });
    expect(window.from).toBe(SUNDAY);
    expect(editorialWeekday(at(`${window.from}T15:00:00Z`))).toBe(0); // Sunday
    expect(editorialWeekday(at(`${window.to}T15:00:00Z`))).toBe(6); // Saturday
  });

  test("both spans are exactly seven inclusive days", () => {
    const recap = recapWindow(SATURDAY);
    const ahead = weekAheadWindow(SUNDAY);

    expect(daysBetween(recap.to, recap.from) + 1).toBe(7);
    expect(daysBetween(ahead.to, ahead.from) + 1).toBe(7);
  });

  test("consecutive weeks tile without gap or overlap", () => {
    const thisWeek = recapWindow(SATURDAY);
    const nextWeek = recapWindow(addDays(SATURDAY, 7));

    expect(addDays(thisWeek.to, 1)).toBe(nextWeek.from);
  });

  test("a recap and the look-ahead published the next day are adjacent, not overlapping", () => {
    const recap = recapWindow(SATURDAY);
    const ahead = weekAheadWindow(addDays(SATURDAY, 1));

    expect(ahead.from).toBe(addDays(recap.to, 1));
  });

  test("the windows survive a month boundary", () => {
    expect(recapWindow("2026-09-05")).toEqual({ from: "2026-08-30", to: "2026-09-05" });
    expect(weekAheadWindow("2026-08-30")).toEqual({ from: "2026-08-30", to: "2026-09-05" });
  });
});

// ---------------------------------------------------------------------------
// Freshness, per edition
// ---------------------------------------------------------------------------

describe("checkFreshness — edition and backdating semantics", () => {
  const now = SATURDAY_INSTANT;

  test("MAX_BACKDATE_DAYS is the documented fortnight", () => {
    expect(MAX_BACKDATE_DAYS).toBe(14);
  });

  test("a daily story about today is fresh and not backdated", () => {
    expect(checkFreshness(TODAY, { now, edition: "daily" })).toEqual({
      ok: true,
      today: TODAY,
      backdated: false,
      daysStale: 0,
    });
  });

  test("a daily story about yesterday is stale without an override", () => {
    expect(checkFreshness(YESTERDAY, { now, edition: "daily" })).toEqual({
      ok: false,
      reason: "stale_event",
      today: TODAY,
      daysStale: 1,
    });
  });

  test("the same story passes WITH the override, and is reported as backdated", () => {
    expect(
      checkFreshness(YESTERDAY, { now, edition: "daily", allowBackdate: true })
    ).toEqual({ ok: true, today: TODAY, backdated: true, daysStale: 1 });
  });

  test("the override reaches exactly MAX_BACKDATE_DAYS back, and no further", () => {
    const atLimit = dayOffset(-MAX_BACKDATE_DAYS);
    const pastLimit = dayOffset(-(MAX_BACKDATE_DAYS + 1));

    expect(checkFreshness(atLimit, { now, edition: "daily", allowBackdate: true })).toEqual({
      ok: true,
      today: TODAY,
      backdated: true,
      daysStale: MAX_BACKDATE_DAYS,
    });

    expect(checkFreshness(pastLimit, { now, edition: "daily", allowBackdate: true })).toEqual({
      ok: false,
      reason: "backdate_too_old",
      today: TODAY,
      daysStale: MAX_BACKDATE_DAYS + 1,
    });
  });

  test("a too-old event is reported as backdate_too_old, not as plain staleness", () => {
    // The distinction matters: one means "ask for the override", the other
    // means "the override cannot help you".
    const verdict = checkFreshness(dayOffset(-30), { now, edition: "daily", allowBackdate: true });
    expect(verdict.ok).toBe(false);
    if (verdict.ok) throw new Error("expected a rejection");
    expect(verdict.reason).toBe("backdate_too_old");

    const withoutOverride = checkFreshness(dayOffset(-30), { now, edition: "daily" });
    expect(withoutOverride.ok).toBe(false);
    if (withoutOverride.ok) throw new Error("expected a rejection");
    expect(withoutOverride.reason).toBe("stale_event");
  });

  test("weekly editions cannot be backdated, override or not", () => {
    for (const edition of ["weekly-recap", "week-ahead"] as const) {
      expect(checkFreshness(YESTERDAY, { now, edition })).toEqual({
        ok: false,
        reason: "stale_event",
        today: TODAY,
        daysStale: 1,
      });

      // The override is simply ignored for a weekly edition — still stale.
      expect(checkFreshness(YESTERDAY, { now, edition, allowBackdate: true })).toEqual({
        ok: false,
        reason: "stale_event",
        today: TODAY,
        daysStale: 1,
      });
    }
  });

  test("a weekly edition dated today is fresh", () => {
    for (const edition of ["weekly-recap", "week-ahead"] as const) {
      expect(checkFreshness(TODAY, { now, edition })).toEqual({
        ok: true,
        today: TODAY,
        backdated: false,
        daysStale: 0,
      });
    }
  });

  test("a post-dated event is never acceptable, for any edition or override", () => {
    for (const edition of BLOG_EDITIONS) {
      expect(checkFreshness(TOMORROW, { now, edition })).toEqual({
        ok: false,
        reason: "future_event",
        today: TODAY,
        daysAhead: 1,
      });

      expect(checkFreshness(TOMORROW, { now, edition, allowBackdate: true })).toEqual({
        ok: false,
        reason: "future_event",
        today: TODAY,
        daysAhead: 1,
      });
    }
  });

  test("omitting the edition keeps the v1.4.0 daily behaviour", () => {
    expect(checkFreshness(YESTERDAY, { now })).toEqual({
      ok: false,
      reason: "stale_event",
      today: TODAY,
      daysStale: 1,
    });
    expect(checkFreshness(YESTERDAY, { now, allowBackdate: true })).toEqual({
      ok: true,
      today: TODAY,
      backdated: true,
      daysStale: 1,
    });
  });

  test("a bare Date second argument still works, and never enables backdating", () => {
    expect(checkFreshness(TODAY, now)).toEqual({
      ok: true,
      today: TODAY,
      backdated: false,
      daysStale: 0,
    });
    expect(checkFreshness(YESTERDAY, now)).toMatchObject({
      ok: false,
      reason: "stale_event",
    });
  });

  test("an invalid event date is rejected before any edition rule applies", () => {
    for (const edition of BLOG_EDITIONS) {
      expect(checkFreshness("2026-02-30", { now, edition, allowBackdate: true })).toEqual({
        ok: false,
        reason: "invalid_event_date",
        today: TODAY,
      });
    }
  });
});

// ---------------------------------------------------------------------------
// PublishPayloadSchema — the edition contract
// ---------------------------------------------------------------------------

describe("PublishPayloadSchema — the local factory is valid to begin with", () => {
  test("a daily payload parses", () => {
    expectAccepted(makePayload());
  });

  test("a weekly recap dated its Saturday parses, window and all", () => {
    const payload = makePayload({ eventDate: SATURDAY, edition: "weekly-recap" });
    expect(payload.coveredFrom).toBe("2026-08-02");
    expect(payload.coveredTo).toBe(SATURDAY);
    expectAccepted(payload);
  });

  test("a week-ahead dated its Sunday parses, window and all", () => {
    const payload = makePayload({ eventDate: SUNDAY, edition: "week-ahead" });
    expect(payload.coveredFrom).toBe(SUNDAY);
    expect(payload.coveredTo).toBe("2026-08-15");
    expectAccepted(payload);
  });

  test("edition defaults to daily when the routine omits it", () => {
    const { edition: _dropped, ...withoutEdition } = makePayload({ eventDate: TODAY });
    void _dropped;
    const result = PublishPayloadSchema.safeParse(withoutEdition);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.edition).toBe("daily");
  });
});

describe("PublishPayloadSchema — the coverage window", () => {
  test("a weekly recap missing coveredFrom and coveredTo fails", () => {
    expectRejected(
      makePayload({
        eventDate: SATURDAY,
        edition: "weekly-recap",
        coveredFrom: null,
        coveredTo: null,
      }),
      "coveredFrom"
    );
  });

  test("a weekly recap declaring only one end of the window fails", () => {
    expectRejected(
      makePayload({ eventDate: SATURDAY, edition: "weekly-recap", coveredTo: null }),
      "coveredFrom"
    );
    expectRejected(
      makePayload({ eventDate: SATURDAY, edition: "weekly-recap", coveredFrom: null }),
      "coveredFrom"
    );
  });

  test("a week-ahead missing its window fails too", () => {
    expectRejected(
      makePayload({
        eventDate: SUNDAY,
        edition: "week-ahead",
        coveredFrom: null,
        coveredTo: null,
      }),
      "coveredFrom"
    );
  });

  test("a weekly recap whose window does not match recapWindow(eventDate) fails", () => {
    const expected = recapWindow(SATURDAY);

    // Off by one day at the start...
    expectRejected(
      makePayload({
        eventDate: SATURDAY,
        edition: "weekly-recap",
        coveredFrom: addDays(expected.from, -1),
        coveredTo: expected.to,
      }),
      "coveredFrom"
    );

    // ...and off by one day at the end.
    expectRejected(
      makePayload({
        eventDate: SATURDAY,
        edition: "weekly-recap",
        coveredFrom: expected.from,
        coveredTo: addDays(expected.to, 1),
      }),
      "coveredFrom"
    );
  });

  test("a weekly recap carrying the WEEK-AHEAD window fails", () => {
    const ahead = weekAheadWindow(SATURDAY);
    expectRejected(
      makePayload({
        eventDate: SATURDAY,
        edition: "weekly-recap",
        coveredFrom: ahead.from,
        coveredTo: ahead.to,
      }),
      "coveredFrom"
    );
  });

  test("a week-ahead whose window does not match weekAheadWindow(eventDate) fails", () => {
    const expected = weekAheadWindow(SUNDAY);
    expectRejected(
      makePayload({
        eventDate: SUNDAY,
        edition: "week-ahead",
        coveredFrom: expected.from,
        coveredTo: addDays(expected.to, 7),
      }),
      "coveredFrom"
    );
  });

  test("a daily that declares a coverage window fails", () => {
    expectRejected(
      makePayload({ eventDate: TODAY, edition: "daily", coveredFrom: addDays(TODAY, -6) }),
      "coveredFrom"
    );
    expectRejected(
      makePayload({ eventDate: TODAY, edition: "daily", coveredTo: TODAY }),
      "coveredFrom"
    );
  });

  test("a daily with null/absent window ends is fine", () => {
    expectAccepted(makePayload({ coveredFrom: null, coveredTo: null }));

    const { coveredFrom: _from, coveredTo: _to, ...withoutWindow } = makePayload();
    void _from;
    void _to;
    expectAccepted(withoutWindow);
  });
});

describe("PublishPayloadSchema — backdating requires a disclosed reason", () => {
  test("allowBackdate without backdateReason fails, on the backdateReason path", () => {
    const result = expectRejected(
      makePayload({ eventDate: YESTERDAY, allowBackdate: true, backdateReason: null }),
      "backdateReason"
    );
    expect(result.success).toBe(false);
    if (result.success) return;
    const issue = result.error.issues.find((i) => i.path.join(".") === "backdateReason");
    expect(issue?.path).toEqual(["backdateReason"]);
  });

  test("backdateReason without allowBackdate fails", () => {
    expectRejected(
      makePayload({
        eventDate: YESTERDAY,
        allowBackdate: false,
        backdateReason: "The vendor changelog only surfaced two days after the change shipped.",
      }),
      "allowBackdate"
    );
  });

  test("both together, on a daily, parse", () => {
    expectAccepted(
      makePayload({
        eventDate: YESTERDAY,
        edition: "daily",
        allowBackdate: true,
        backdateReason: "The vendor changelog only surfaced two days after the change shipped.",
      })
    );
  });

  test("a too-short backdateReason fails — it is reader-facing copy, not a flag", () => {
    expectRejected(
      makePayload({ eventDate: YESTERDAY, allowBackdate: true, backdateReason: "late" }),
      "backdateReason"
    );
  });

  test("allowBackdate on a weekly edition fails", () => {
    for (const edition of ["weekly-recap", "week-ahead"] as const) {
      const eventDate = edition === "weekly-recap" ? SATURDAY : SUNDAY;
      expectRejected(
        makePayload({
          eventDate,
          edition,
          allowBackdate: true,
          backdateReason: "The recap run was delayed by an outage on the publishing endpoint.",
        }),
        "allowBackdate"
      );
    }
  });

  test("allowBackdate defaults to false when the routine omits it", () => {
    const { allowBackdate: _dropped, ...withoutFlag } = makePayload();
    void _dropped;
    const result = PublishPayloadSchema.safeParse(withoutFlag);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.allowBackdate).toBe(false);
  });
});

describe("PublishPayloadSchema — the idempotency key carries the edition", () => {
  test("a daily key on a weekly recap fails", () => {
    expectRejected(
      makePayload({
        eventDate: SATURDAY,
        edition: "weekly-recap",
        idempotencyKey: editionIdempotencyKey(SATURDAY, "daily"),
      }),
      "idempotencyKey"
    );
  });

  test("a weekly key on a daily story fails", () => {
    expectRejected(
      makePayload({
        eventDate: TODAY,
        edition: "daily",
        idempotencyKey: editionIdempotencyKey(TODAY, "weekly-recap"),
      }),
      "idempotencyKey"
    );
  });

  test("a week-ahead key on a weekly recap fails", () => {
    expectRejected(
      makePayload({
        eventDate: SATURDAY,
        edition: "weekly-recap",
        idempotencyKey: editionIdempotencyKey(SATURDAY, "week-ahead"),
      }),
      "idempotencyKey"
    );
  });

  test("the right prefix on the wrong date still fails", () => {
    expectRejected(
      makePayload({
        eventDate: SATURDAY,
        edition: "weekly-recap",
        idempotencyKey: editionIdempotencyKey(addDays(SATURDAY, -7), "weekly-recap"),
      }),
      "idempotencyKey"
    );
  });

  test("the doc-id form (underscore) is not accepted as an idempotency key", () => {
    expectRejected(
      makePayload({ eventDate: TODAY, idempotencyKey: editionDocId(TODAY, "daily") }),
      "idempotencyKey"
    );
  });

  test("every edition accepts its own correctly derived key", () => {
    for (const edition of BLOG_EDITIONS) {
      const eventDate = edition === "week-ahead" ? SUNDAY : SATURDAY;
      expectAccepted(
        makePayload({
          eventDate,
          edition,
          idempotencyKey: editionIdempotencyKey(eventDate, edition),
        })
      );
    }
  });
});
