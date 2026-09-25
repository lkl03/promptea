// lib/newsletter/generate.ts
//
// Derives a weekly newsletter edition from the AI Daily archive (server-only
// wrapper around the pure builder in lib/newsletter/compose.ts).
//
// The digest is not an independent research pipeline. It selects, ranks, and
// summarises stories that AI Daily has already researched and verified. No new
// factual claims are introduced; every story in the newsletter traces back to
// a published article with its sources intact.
//
// v1.6.0: the covered week comes from lib/newsletter/dates.ts. v1.5.0 derived
// "last Saturday" from the day of the MONTH (`day % 7`), which selected the
// wrong week on most dates, and padded quiet weeks with a placeholder story
// whose link 404ed. Both are gone.

import "server-only";

import { listAllPublishedArticles } from "@/lib/blog/server";
import { addDays, editorialDate } from "@/lib/blog/dates";
import type { NewsletterEdition } from "@/lib/newsletter/types";
import { buildEdition } from "./compose";
import { editionWindowFor } from "./dates";
import { DEFAULT_SITE_URL } from "./render";

/**
 * The Monday delivery date for the current week: today when today is Monday,
 * otherwise the upcoming Monday.
 */
export function nextMonday(from: Date = new Date()): string {
  const today = editorialDate(from);
  const [y, m, d] = today.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const daysUntilMonday = dow === 0 ? 1 : dow === 1 ? 0 : 8 - dow;
  return addDays(today, daysUntilMonday);
}

/**
 * Build the edition that is (or was) sent on the Monday of `now`'s week. The
 * run endpoint (app/api/internal/newsletter/run) is the only caller that
 * stores or sends it; this function has no side effects.
 */
export async function generateWeeklyEdition(opts?: { now?: Date; date?: string }): Promise<NewsletterEdition | null> {
  const now = opts?.now ?? new Date();
  const window = editionWindowFor(opts?.date ?? editorialDate(now));
  const [en, es] = await Promise.all([listAllPublishedArticles("en", 200), listAllPublishedArticles("es", 200)]);
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL).replace(/\/+$/, "");
  return buildEdition({ window, en, es, now, siteUrl });
}
