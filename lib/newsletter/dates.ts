// lib/newsletter/dates.ts
//
// v1.6.0 — which week a Promptea Weekly edition covers. Pure and
// Firestore-free so it can be tested exactly.
//
// An edition is sent on a MONDAY (editorial timezone) and covers the AI Daily
// stories of the preceding Sunday→Saturday — the same window as the Saturday
// weekly recap. The edition id is keyed by that Monday, so every run in the
// same week (a retry, a manual re-run, a dry run) resolves to one edition.
//
// v1.5.0 computed the window from the day-of-MONTH ("day % 7"), which pointed
// at the wrong Saturday on most dates; this module replaces it.

import { addDays, isEditorialDate, type EditorialDate } from "@/lib/blog/dates";

/** 0 = Sunday … 6 = Saturday, for a `YYYY-MM-DD` editorial date. */
export function weekdayOf(date: EditorialDate): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** The Monday on or before `date`. */
export function mondayOnOrBefore(date: EditorialDate): EditorialDate {
  const dow = weekdayOf(date);
  const back = (dow + 6) % 7; // Mon → 0, Tue → 1 … Sun → 6
  return addDays(date, -back);
}

export type EditionWindow = {
  /** `promptea-weekly_YYYY-MM-DD` — the Monday it is sent. */
  editionId: string;
  monday: EditorialDate;
  /** Sunday that opens the covered week. */
  weekStart: EditorialDate;
  /** Saturday that closes the covered week. */
  weekEnd: EditorialDate;
};

export function editionWindowFor(date: EditorialDate): EditionWindow {
  if (!isEditorialDate(date)) throw new Error("editionWindowFor expects YYYY-MM-DD");
  const monday = mondayOnOrBefore(date);
  const weekEnd = addDays(monday, -2);
  const weekStart = addDays(weekEnd, -6);
  return { editionId: `promptea-weekly_${monday}`, monday, weekStart, weekEnd };
}
