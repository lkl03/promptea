// lib/social/sources/oembed.ts
//
// v1.8.7 — the X feed from a list of post URLs, read through X's public oEmbed
// endpoint: GET https://publish.x.com/oembed?url=<post>&omit_script=1&dnt=1.
// No account and no key. It answers JSON describing one post (author, and an
// HTML blockquote with the text and the day); we read only that DATA — the
// blockquote is turned into plain text here and never rendered, and X's
// widgets.js is never loaded (omit_script=1).
//
// It needs someone to keep the list of URLs (X_FEED_POST_URLS), so it is the
// fallback when Buffer is not configured or fails, not the primary source.
// Only posts written by Promptea's own account are accepted.
//
// Pure: fetch is injected, nothing here reads the environment.

import { canonicalTweetUrl, htmlToText, normalizePosts, sanitizeText, tweetIdFromUrl, type XFeedFailure, type XPost } from "../feed";
import { handleFromUrl } from "../links";

export const OEMBED_URL = "https://publish.x.com/oembed";
export const OEMBED_TIMEOUT_MS = 5_000;
export const OEMBED_MAX_URLS = 10;

/** X_FEED_POST_URLS: comma / whitespace separated post URLs → unique tweet ids, in order, at most OEMBED_MAX_URLS. */
export function parsePostUrlList(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const ids: string[] = [];
  for (const part of raw.split(/[\s,]+/)) {
    const id = tweetIdFromUrl(part);
    if (id && !ids.includes(id)) ids.push(id);
    if (ids.length >= OEMBED_MAX_URLS) break;
  }
  return ids;
}

/**
 * The text and the day of one oEmbed blockquote. The text is the first <p>;
 * the day is the visible text of the last link ("November 15, 2026"), which
 * oEmbed always writes in English. Returns null when either is missing.
 */
export function parseOembedHtml(html: string): { text: string; date: string } | null {
  const p = /<p\b[^>]*>([\s\S]*?)<\/p>/i.exec(html);
  if (!p) return null;
  const text = sanitizeText(htmlToText(p[1]));
  const links = [...html.matchAll(/<a\b[^>]*>([^<]{4,40})<\/a>/gi)];
  const last = links[links.length - 1]?.[1]?.trim();
  const day = last ? Date.parse(`${last} 12:00:00 UTC`) : NaN;
  if (!text || !Number.isFinite(day)) return null;
  return { text, date: new Date(day).toISOString() };
}

export type OembedDeps = { fetchImpl?: typeof fetch; timeoutMs?: number };

async function one(deps: OembedDeps, id: string, handle: string | null): Promise<XPost | XFeedFailure> {
  const target = `https://x.com/${handle ?? "i"}/status/${id}`;
  const url = `${OEMBED_URL}?url=${encodeURIComponent(target)}&omit_script=1&dnt=1`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), deps.timeoutMs ?? OEMBED_TIMEOUT_MS);
  try {
    const res = await (deps.fetchImpl ?? fetch)(url, { headers: { Accept: "application/json" }, signal: controller.signal, cache: "no-store" });
    if (res.status === 429) return "rate_limited";
    if (res.status === 404) return "invalid_response"; // deleted or private post: skipped
    if (!res.ok) return "upstream_error";
    const body = (await res.json()) as { author_url?: unknown; html?: unknown };
    const author = handleFromUrl(typeof body.author_url === "string" ? body.author_url : null);
    // Only Promptea's own posts: a URL of someone else's post in the list is ignored.
    if (handle && (!author || author.toLowerCase() !== handle.toLowerCase())) return "invalid_response";
    const parsed = typeof body.html === "string" ? parseOembedHtml(body.html) : null;
    if (!parsed) return "invalid_response";
    return { id, url: canonicalTweetUrl(id, author ?? handle), text: parsed.text, createdAt: parsed.date, dateOnly: true };
  } catch (err) {
    return (err as { name?: string })?.name === "AbortError" ? "timeout" : "upstream_error";
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchOembedPosts(deps: OembedDeps, ids: string[], handle: string | null): Promise<{ ok: true; posts: XPost[] } | { ok: false; reason: XFeedFailure }> {
  if (!ids.length) return { ok: false, reason: "not_configured" };
  const results = await Promise.all(ids.slice(0, OEMBED_MAX_URLS).map((id) => one(deps, id, handle)));
  const posts = results.filter((r): r is XPost => typeof r === "object");
  if (posts.length) return { ok: true, posts: normalizePosts(posts) };
  const failure = results.find((r): r is XFeedFailure => typeof r === "string") ?? "invalid_response";
  return { ok: false, reason: failure };
}
