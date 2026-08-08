// lib/blog/dates.ts
//
// v1.4.0 — editorial date arithmetic for AI Daily.
//
// The whole freshness guarantee rests on one idea: "today" is a calendar date
// in the editorial timezone (America/Argentina/Buenos_Aires), NOT a UTC
// instant and NOT the server's local time. A Vercel function runs in UTC, and
// between 21:00 and 24:00 ART the UTC date is already tomorrow — so any naive
// `new Date().toISOString().slice(0,10)` would silently publish "tomorrow's"
// article and break the same-day guard.
//
// Everything here is derived from Intl with an explicit timeZone, so it stays
// correct without hardcoding the UTC-3 offset.

import { EDITION_KEY_PREFIX, EDITORIAL_TIMEZONE, MAX_BACKDATE_DAYS } from "@/lib/domain";
import type { BlogEdition } from "@/lib/domain";

/** `YYYY-MM-DD` — the only date shape stored or compared anywhere in the blog. */
export type EditorialDate = string;

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * True when `v` is a syntactically valid `YYYY-MM-DD` string that also denotes
 * a real calendar day (rejects `2026-02-30`, `2026-13-01`, `2026-00-10`).
 */
export function isEditorialDate(v: unknown): v is EditorialDate {
  if (typeof v !== "string" || !ISO_DATE_RE.test(v)) return false;
  const [y, m, d] = v.split("-").map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  // Round-trip through UTC to reject impossible days (Feb 30, Apr 31, ...).
  const probe = new Date(Date.UTC(y, m - 1, d));
  return (
    probe.getUTCFullYear() === y && probe.getUTCMonth() === m - 1 && probe.getUTCDate() === d
  );
}

/**
 * The calendar date of `instant` as observed in the editorial timezone.
 *
 * Uses formatToParts rather than a locale string so the output is stable
 * regardless of the host's default locale or ICU version.
 */
export function editorialDate(instant: Date = new Date()): EditorialDate {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: EDITORIAL_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";

  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Wall-clock time in the editorial timezone, as `HH:MM` (24h). Used in run logs. */
export function editorialTime(instant: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: EDITORIAL_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";

  return `${get("hour")}:${get("minute")}`;
}

/**
 * Difference in whole calendar days between two editorial dates
 * (`a - b`). Positive means `a` is later. Both must be `YYYY-MM-DD`.
 */
export function daysBetween(a: EditorialDate, b: EditorialDate): number {
  const toUtc = (s: EditorialDate) => {
    const [y, m, d] = s.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toUtc(a) - toUtc(b)) / 86_400_000);
}

/**
 * The same-day editorial guard.
 *
 * `eventDate` is when the underlying development actually happened; `now` is
 * when we are publishing. A source publishing today about yesterday's event
 * does NOT qualify — that is the entire point of storing eventDate separately
 * from publishedAt.
 *
 * Returns a typed result rather than a boolean so the API can report a precise
 * machine-readable reason.
 */
export type FreshnessVerdict =
  | { ok: true; today: EditorialDate; backdated: boolean; daysStale: number }
  | { ok: false; reason: "invalid_event_date"; today: EditorialDate }
  | { ok: false; reason: "stale_event"; today: EditorialDate; daysStale: number }
  | { ok: false; reason: "backdate_too_old"; today: EditorialDate; daysStale: number }
  | { ok: false; reason: "future_event"; today: EditorialDate; daysAhead: number };

export type FreshnessOptions = {
  now?: Date;
  /** Weekly editions are dated the day they run, so they must be exactly today. */
  edition?: BlogEdition;
  /**
   * Explicit human override for a daily story about an earlier event. Requires
   * a stated reason at the schema layer, is capped at MAX_BACKDATE_DAYS, and is
   * disclosed on the rendered article. The automated routine must never set it.
   */
  allowBackdate?: boolean;
};

export function checkFreshness(
  eventDate: unknown,
  opts: FreshnessOptions | Date = {}
): FreshnessVerdict {
  // Back-compat: earlier callers passed a bare Date as the second argument.
  const o: FreshnessOptions = opts instanceof Date ? { now: opts } : opts;
  const today = editorialDate(o.now ?? new Date());

  if (!isEditorialDate(eventDate)) return { ok: false, reason: "invalid_event_date", today };

  const delta = daysBetween(today, eventDate);

  // A post-dated event is never acceptable, for any edition or override.
  if (delta < 0) return { ok: false, reason: "future_event", today, daysAhead: -delta };

  if (delta === 0) return { ok: true, today, backdated: false, daysStale: 0 };

  // Weekly editions carry the date they were published; they cannot be backdated.
  const edition = o.edition ?? "daily";
  if (edition !== "daily") return { ok: false, reason: "stale_event", today, daysStale: delta };

  if (!o.allowBackdate) return { ok: false, reason: "stale_event", today, daysStale: delta };
  if (delta > MAX_BACKDATE_DAYS) {
    return { ok: false, reason: "backdate_too_old", today, daysStale: delta };
  }

  return { ok: true, today, backdated: true, daysStale: delta };
}

/**
 * Deterministic idempotency key for a given editorial day and edition.
 *
 * Keyed per edition so a Saturday can legitimately carry BOTH the weekly recap
 * and a breaking daily story without either colliding with the other.
 */
export function editionIdempotencyKey(
  date: EditorialDate,
  edition: BlogEdition = "daily"
): string {
  return `${EDITION_KEY_PREFIX[edition]}:${date}`;
}

/**
 * Firestore document id for a given editorial day and edition. Deterministic so
 * a retried routine run addresses the SAME document instead of creating a
 * duplicate. `:` is legal in a Firestore id but awkward in URLs and CLI
 * tooling, so the id uses an underscore while the stored idempotencyKey keeps
 * the `:` form.
 */
export function editionDocId(date: EditorialDate, edition: BlogEdition = "daily"): string {
  return `${EDITION_KEY_PREFIX[edition]}_${date}`;
}

/** Back-compat aliases — the daily edition is still the common case. */
export const dailyIdempotencyKey = (date: EditorialDate) => editionIdempotencyKey(date, "daily");
export const dailyDocId = (date: EditorialDate) => editionDocId(date, "daily");

/**
 * Day of week in the editorial timezone. 0 = Sunday … 6 = Saturday.
 * Derived via Intl rather than getDay() so it reflects Buenos Aires, not UTC.
 */
export function editorialWeekday(instant: Date = new Date()): number {
  const name = new Intl.DateTimeFormat("en-US", {
    timeZone: EDITORIAL_TIMEZONE,
    weekday: "short",
  }).format(instant);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(name);
}

/** Shift an editorial date by whole days, returning `YYYY-MM-DD`. */
export function addDays(date: EditorialDate, delta: number): EditorialDate {
  const [y, m, d] = date.split("-").map(Number);
  const shifted = new Date(Date.UTC(y, m - 1, d + delta));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`;
}

/**
 * The seven-day window a Saturday recap covers: the preceding Sunday through
 * the Saturday itself, inclusive.
 */
export function recapWindow(date: EditorialDate): { from: EditorialDate; to: EditorialDate } {
  return { from: addDays(date, -6), to: date };
}

/** The seven-day window a Sunday look-ahead covers: that Sunday through the following Saturday. */
export function weekAheadWindow(date: EditorialDate): { from: EditorialDate; to: EditorialDate } {
  return { from: date, to: addDays(date, 6) };
}

/**
 * Human-readable publication date, matching the locale conventions already used
 * on the changelog page: ES writes `DD-MM-YYYY`, EN writes `YYYY-MM-DD`.
 */
export function formatEditorialDate(date: EditorialDate, lang: "es" | "en"): string {
  if (!isEditorialDate(date)) return date;
  const [y, m, d] = date.split("-");
  return lang === "es" ? `${d}-${m}-${y}` : `${y}-${m}-${d}`;
}
