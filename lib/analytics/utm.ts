// lib/analytics/utm.ts
//
// v1.8.8 — UTM tags for the links in Promptea's weekly tweets, so reach is
// measured where the visit happens (Vercel Web Analytics → UTM Parameters)
// instead of in Buffer's reactions.
//
// Why: the 9 tweets of 9–16/11 had 105 impressions and 0 clicks in Buffer, and
// in Vercel Analytics `t.co` appears with 4 visitors in 30 days: X strips or
// shortens the referrer, so a visit from a tweet looks like a direct visit.
// A UTM on every link fixes the attribution and splits it by tweet type.
//
//   utm_source   = x
//   utm_medium   = social
//   utm_campaign = tweets-<Monday of the week, YYYY-MM-DD>
//   utm_content  = the tweet type (TWEET_TYPES)
//
// The routine that writes the tweets (scheduled task `promptea-weekly-tweets`,
// prompt in docs/social/weekly-tweets-routine.md) builds the same URLs by hand;
// a test pins the format so the two cannot drift.
//
// Redirects keep the query string (promptea.me → www → /en; checked 2026-11-20),
// and the hash (`#m=` on /benchmarks) stays after the query, where browsers
// expect it.

/** One value per kind of tweet; the dashboard groups by these. */
export const TWEET_TYPES = [
  "tip", // a prompting tip → homepage or a guide
  "model-choice", // which AI for which task → /best-ai or /models
  "ai-daily", // a dated AI Daily story → /blog/<slug>
  "benchmarks", // one model's analysis → /benchmarks#m=<modelId>
  "feature", // a Promptea feature → the feature's page
  "rough-idea", // rough idea → better prompt → /analyzer
] as const;
export type TweetType = (typeof TWEET_TYPES)[number];

export const UTM_SOURCE = "x";
export const UTM_MEDIUM = "social";

export function isTweetType(v: unknown): v is TweetType {
  return (TWEET_TYPES as readonly unknown[]).includes(v);
}

/** `tweets-2026-11-23`: the campaign is the week, named by its Monday (YYYY-MM-DD). */
export function tweetCampaign(weekMonday: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekMonday)) throw new Error(`weekMonday must be YYYY-MM-DD, got "${weekMonday}"`);
  return `tweets-${weekMonday}`;
}

/**
 * The link a tweet of `type` should carry. Only promptea.me URLs are tagged;
 * existing utm_* parameters are replaced, other parameters and the hash kept.
 */
export function tweetLink(url: string, type: TweetType, weekMonday: string): string {
  const u = new URL(url);
  if (!/(^|\.)promptea\.me$/.test(u.hostname)) throw new Error(`only promptea.me links are tagged, got ${u.hostname}`);
  if (!isTweetType(type)) throw new Error(`unknown tweet type "${String(type)}"`);
  for (const k of [...u.searchParams.keys()]) if (k.startsWith("utm_")) u.searchParams.delete(k);
  u.searchParams.set("utm_source", UTM_SOURCE);
  u.searchParams.set("utm_medium", UTM_MEDIUM);
  u.searchParams.set("utm_campaign", tweetCampaign(weekMonday));
  u.searchParams.set("utm_content", type);
  return u.toString();
}
