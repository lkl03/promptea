// lib/blog/marquee.ts
//
// v1.7.0 — which AI Daily headlines the homepage news marquee shows.
//
// Pure (no Firestore), so the rules are tested exactly:
//   - only articles that are publicly visible (the read path already filters
//     to published/corrected — drafts never reach this function);
//   - only articles first PUBLISHED within the last 72 hours. `publishedAt`
//     is set once when the article goes live; editing or correcting it later
//     bumps `updatedAt`, never `publishedAt`, so an old story can never be
//     rejuvenated into the marquee by an edit;
//   - nothing dated in the future: a `publishedAt` after now (clock skew, a
//     scheduled document) or an event date after today's editorial date is
//     excluded;
//   - newest first, one entry per article.

import type { PublicArticle } from "@/lib/blog/types";
import { editorialDate } from "@/lib/blog/dates";

export const MARQUEE_WINDOW_HOURS = 72;
export const MARQUEE_MAX_ITEMS = 12;

export type MarqueeItem = {
  slug: string;
  title: string;
  publishedAt: string;
  category: PublicArticle["category"];
};

export function selectMarqueeItems(
  articles: Array<Pick<PublicArticle, "slug" | "title" | "publishedAt" | "eventDate" | "category" | "status">>,
  now: Date = new Date(),
  opts: { windowHours?: number; max?: number } = {}
): MarqueeItem[] {
  const windowMs = (opts.windowHours ?? MARQUEE_WINDOW_HOURS) * 3_600_000;
  const nowMs = now.getTime();
  const today = editorialDate(now);
  const seen = new Set<string>();
  const out: Array<MarqueeItem & { t: number }> = [];

  for (const a of articles) {
    if (a.status !== "published" && a.status !== "corrected") continue;
    if (!a.publishedAt) continue;
    const t = Date.parse(a.publishedAt);
    if (!Number.isFinite(t)) continue;
    if (t > nowMs) continue;
    if (nowMs - t > windowMs) continue;
    if (a.eventDate && a.eventDate > today) continue;
    if (seen.has(a.slug)) continue;
    seen.add(a.slug);
    out.push({ slug: a.slug, title: a.title, publishedAt: a.publishedAt, category: a.category, t });
  }

  return out
    .sort((x, y) => y.t - x.t || x.slug.localeCompare(y.slug))
    .slice(0, opts.max ?? MARQUEE_MAX_ITEMS)
    .map(({ t: _t, ...item }) => (void _t, item));
}
