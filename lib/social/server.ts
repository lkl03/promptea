// lib/social/server.ts
//
// v1.8.7 — server-only wiring of the X feed: which source, its credentials from
// the environment, and the cache. Pages call getXFeed(); it never throws and
// never blocks a page on X or Buffer: any failure is an empty feed, and the
// card then shows its call to action to the profile.
//
// Sources, in order (lib/social/feed.ts has the contract):
//   1. Buffer   BUFFER_API_KEY (secret, server-only) — the posts Promptea sent
//               through Buffer. Optional BUFFER_ORGANIZATION_ID (otherwise the
//               account's first organization, looked up once a week) and
//               BUFFER_X_CHANNEL_ID (otherwise every sent post whose service is X).
//   2. oEmbed   X_FEED_POST_URLS — a hand-kept list of post URLs, read through
//               X's public oEmbed JSON (no key). Used when Buffer is not
//               configured, or as a fallback when Buffer fails.
//   3. none     no source: the card shows the call to action.
// Development only: X_FEED_DEV_FIXTURE=1 shows clearly fictitious posts.
//
// Cache: the result (posts OR failure) is kept FEED_REVALIDATE_SECONDS in the
// Next.js data cache (unstable_cache), shared by every page and language, so
// Buffer is called at most once per window whatever the traffic. Credentials
// are read inside the cached functions and never become part of a cache key,
// a log line or the page.

import "server-only";

import { cache } from "react";
import { unstable_cache } from "next/cache";
import { emptyFeed, FEED_REVALIDATE_SECONDS, type XFeedResult } from "./feed";
import { fetchBufferPosts, fetchOrganizationId, isBufferId } from "./sources/buffer";
import { fetchOembedPosts, parsePostUrlList } from "./sources/oembed";
import { devFixtureFeed } from "./dev-fixture";
import { getXLinks } from "./links";

const log = (event: string, meta: Record<string, unknown>) => console.log(`[x-feed] ${event}`, meta);

/** The organization is looked up at most once a week (it never changes). */
const bufferOrganization = unstable_cache(
  async (): Promise<string | null> => {
    const configured = process.env.BUFFER_ORGANIZATION_ID?.trim();
    if (isBufferId(configured)) return configured;
    const r = await fetchOrganizationId({ apiKey: process.env.BUFFER_API_KEY ?? "" });
    if (!r.ok) {
      log("organization_lookup_failed", { reason: r.reason });
      throw new Error(r.reason); // not cached: retried with the next feed refresh
    }
    return r.id;
  },
  ["x-feed", "buffer-organization", "v1"],
  { revalidate: 7 * 24 * 60 * 60, tags: ["x-feed"] }
);

const bufferFeed = unstable_cache(
  async (handle: string | null): Promise<XFeedResult> => {
    const apiKey = process.env.BUFFER_API_KEY ?? "";
    let organizationId: string | null;
    try {
      organizationId = await bufferOrganization();
    } catch (err) {
      return emptyFeed("buffer", (err as Error).message === "unauthorized" ? "unauthorized" : "upstream_error");
    }
    if (!organizationId) return emptyFeed("buffer", "invalid_response");
    const r = await fetchBufferPosts({ apiKey }, { organizationId, channelId: process.env.BUFFER_X_CHANNEL_ID?.trim() || null, handle });
    if (!r.ok) {
      log("buffer_failed", { reason: r.reason });
      return emptyFeed("buffer", r.reason);
    }
    log("buffer_ok", { posts: r.posts.length });
    return { source: "buffer", posts: r.posts, reason: null, fetchedAt: new Date().toISOString() };
  },
  ["x-feed", "buffer", "v1"],
  { revalidate: FEED_REVALIDATE_SECONDS, tags: ["x-feed"] }
);

const oembedFeed = unstable_cache(
  async (ids: string[], handle: string | null): Promise<XFeedResult> => {
    const r = await fetchOembedPosts({}, ids, handle);
    if (!r.ok) {
      log("oembed_failed", { reason: r.reason });
      return emptyFeed("oembed", r.reason);
    }
    return { source: "oembed", posts: r.posts, reason: null, fetchedAt: new Date().toISOString() };
  },
  ["x-feed", "oembed", "v1"],
  { revalidate: FEED_REVALIDATE_SECONDS, tags: ["x-feed"] }
);

/** The feed for the card. Deduplicated per request; cached across requests (see above). */
export const getXFeed = cache(async (): Promise<XFeedResult> => {
  const { handle } = getXLinks();
  if (process.env.NODE_ENV === "development" && process.env.X_FEED_DEV_FIXTURE === "1") return devFixtureFeed(handle);

  const hasBuffer = Boolean(process.env.BUFFER_API_KEY?.trim());
  const ids = parsePostUrlList(process.env.X_FEED_POST_URLS);
  try {
    if (hasBuffer) {
      const fromBuffer = await bufferFeed(handle);
      if (fromBuffer.posts.length || !ids.length) return fromBuffer;
    }
    if (ids.length) return await oembedFeed(ids, handle);
  } catch (err) {
    log("unexpected", { name: (err as Error)?.name ?? "Error" });
    return emptyFeed(hasBuffer ? "buffer" : "oembed", "upstream_error");
  }
  return emptyFeed("none", "not_configured");
});
