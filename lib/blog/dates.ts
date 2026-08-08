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

import { EDITORIAL_TIMEZONE } from "@/lib/domain";

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
  | { ok: true; today: EditorialDate }
  | { ok: false; reason: "invalid_event_date"; today: EditorialDate }
  | { ok: false; reason: "stale_event"; today: EditorialDate; daysStale: number }
  | { ok: false; reason: "future_event"; today: EditorialDate; daysAhead: number };

export function checkFreshness(eventDate: unknown, now: Date = new Date()): FreshnessVerdict {
  const today = editorialDate(now);

  if (!isEditorialDate(eventDate)) return { ok: false, reason: "invalid_event_date", today };

  const delta = daysBetween(today, eventDate);
  if (delta > 0) return { ok: false, reason: "stale_event", today, daysStale: delta };
  if (delta < 0) return { ok: false, reason: "future_event", today, daysAhead: -delta };

  return { ok: true, today };
}

/** Deterministic idempotency key for a given editorial day. */
export function dailyIdempotencyKey(date: EditorialDate): string {
  return `ai-daily:${date}`;
}

/**
 * Firestore document id for a given editorial day. Deterministic so a retried
 * routine run addresses the SAME document instead of creating a duplicate.
 * `:` is legal in a Firestore id but awkward in URLs and CLI tooling, so the
 * id uses an underscore while the stored idempotencyKey keeps the `:` form.
 */
export function dailyDocId(date: EditorialDate): string {
  return `ai-daily_${date}`;
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
