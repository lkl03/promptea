// lib/social/feed.ts
//
// v1.8.7 — Promptea's own X feed: the posts of @promptea_me rendered with our
// markup, on the server, with no third-party script. It replaces the Elfsight
// widget of v1.8.1–v1.8.6 (a paid plan close to its limit; before it, X's own
// embed, which stopped rendering). Decision record: docs/release/v1.8.7/x-feed-decision.md.
//
// This module is PURE (no network, no env): the post type, the sources'
// contract, and everything that decides what reaches the page —
//   - tweet URLs: only x.com / twitter.com status links, rebuilt canonically;
//   - text: plain text only, control characters removed, length capped. It is
//     always rendered by React as text (escaped); links are produced here from
//     the text and only for https URLs, @mentions and #hashtags, and carry
//     rel="noopener noreferrer nofollow" in the component;
//   - no images: posts are text; avatars and media of X are never loaded;
//   - order, de-duplication and the cap on the number of posts;
//   - the localized relative date.
// The sources live in ./sources/*.ts (network, injected fetch) and the
// server wiring (env, cache) in ./server.ts.

/** One post of Promptea's X account, as the card shows it. */
export type XPost = {
  /** The tweet id (digits). */
  id: string;
  /** Canonical link to the post on x.com. */
  url: string;
  /** Plain text (sanitized). */
  text: string;
  /** ISO date-time the post was published. */
  createdAt: string;
  /** True when only the day is known (oEmbed): the card shows the date, not "2 h ago". */
  dateOnly?: boolean;
};

/** Where the posts came from. "none" = no source configured. */
export type XFeedSource = "buffer" | "oembed" | "fixture" | "none";

export type XFeedFailure = "not_configured" | "unauthorized" | "rate_limited" | "timeout" | "upstream_error" | "invalid_response";

export type XFeedResult = {
  source: XFeedSource;
  posts: XPost[];
  /** Why there are no posts (null when the source answered, even with zero posts). */
  reason: XFeedFailure | null;
  fetchedAt: string;
};

/** The card shows at most this many posts (newest first). */
export const MAX_POSTS = 10;
/** A post longer than this is cut on a word boundary (X allows 280; threads and long posts exist). */
export const MAX_TEXT_CHARS = 600;
/**
 * How long a fetched feed is reused before the next upstream call (seconds).
 * Promptea posts about once a day. Buffer's free plan allows 600 API calls a
 * day and 1,000 a month per channel, shared with the MCP tools the owner uses
 * to schedule posts: one call every 2 h is ~360 a month.
 */
export const FEED_REVALIDATE_SECONDS = 2 * 60 * 60;

// ---------------------------------------------------------------------------
// Tweet URLs
// ---------------------------------------------------------------------------

const TWEET_HOST = /^(?:www\.|mobile\.)?(?:x|twitter)\.com$/i;
// A handle, or the numeric account id Buffer uses in its links (up to 20 digits).
const STATUS_PATH = /^\/(?:[A-Za-z0-9_]{1,20}|i(?:\/web)?)\/status(?:es)?\/(\d{5,25})(?:\/|$)/;

/** The tweet id of an x.com / twitter.com status URL, or null for anything else. */
export function tweetIdFromUrl(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    if (u.username || u.password || !TWEET_HOST.test(u.hostname)) return null;
    return STATUS_PATH.exec(u.pathname)?.[1] ?? null;
  } catch {
    return null;
  }
}

/** https://x.com/<handle>/status/<id> (or the handle-less /i/status/<id>, which X also resolves). */
export function canonicalTweetUrl(id: string, handle: string | null): string {
  return handle ? `https://x.com/${handle}/status/${id}` : `https://x.com/i/status/${id}`;
}

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------

// C0/C1 controls (except \n and \t), bidi overrides and zero-width joiners used for spoofing.
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F‪-‮⁦-⁩​﻿]/g;

/** Plain, bounded text: no control characters, \n line breaks, at most two in a row, capped length. */
export function sanitizeText(raw: unknown, max = MAX_TEXT_CHARS): string {
  if (typeof raw !== "string") return "";
  let t = raw.normalize("NFC").replace(/\r\n?/g, "\n").replace(/\t/g, " ").replace(CONTROL, "");
  t = t
    .split("\n")
    .map((line) => line.replace(/ {2,}/g, " ").trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", mdash: "—", ndash: "–", hellip: "…" };

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "";
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

/**
 * Text of an HTML fragment (the oEmbed blockquote): <br> become line breaks,
 * every tag is dropped, entities are decoded. Links keep their visible text, and
 * a space is put in front of a link glued to the previous word (X's oEmbed drops
 * the line breaks before a link). Never used to render HTML: the result is text.
 */
export function htmlToText(html: string): string {
  const s = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/(\S)<a\b/gi, "$1 <a")
    .replace(/<\/a>(?=[^\s<])/gi, "</a> ")
    .replace(/<\/p>\s*<p[^>]*>/gi, "\n\n")
    .replace(/<[^>]*>/g, "");
  return decodeEntities(s);
}

// ---------------------------------------------------------------------------
// Links inside a post
// ---------------------------------------------------------------------------

export type Segment =
  | { kind: "text"; text: string }
  | { kind: "link"; text: string; href: string };

const TOKEN = /(https?:\/\/[^\s<>"'`]+)|(^|[^\p{L}\p{N}_&/])#([\p{L}\p{N}_]{1,100})|(^|[^\p{L}\p{N}_/@.])@([A-Za-z0-9_]{1,15})\b/gu;

/** An https URL without credentials, as a string, or null. */
export function safeHref(raw: string): string | null {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" || u.username || u.password || !u.hostname.includes(".")) return null;
    return u.href;
  } catch {
    return null;
  }
}

/** Short visible form of a URL: no scheme, no "www.", at most 32 characters. */
export function displayUrl(href: string): string {
  const u = new URL(href);
  const s = (u.host.replace(/^www\./, "") + (u.pathname === "/" ? "" : u.pathname) + u.search).replace(/\/$/, "");
  return s.length > 32 ? `${s.slice(0, 31)}…` : s;
}

/** Trailing punctuation that belongs to the sentence, not to the URL. */
function splitTrailing(url: string): [string, string] {
  let end = url.length;
  while (end > 0 && /[.,;:!?'")\]}]/.test(url[end - 1])) {
    const c = url[end - 1];
    if (c === ")" && (url.slice(0, end).match(/\(/g)?.length ?? 0) >= (url.slice(0, end).match(/\)/g)?.length ?? 0)) break;
    end--;
  }
  return [url.slice(0, end), url.slice(end)];
}

/** Splits a post's text into plain text and safe links (https URLs, #hashtags, @mentions). */
export function linkify(text: string): Segment[] {
  const out: Segment[] = [];
  const push = (seg: Segment) => {
    const last = out[out.length - 1];
    if (seg.kind === "text" && last?.kind === "text") last.text += seg.text;
    else if (seg.kind === "text" && !seg.text) return;
    else out.push(seg);
  };
  let i = 0;
  for (const m of text.matchAll(TOKEN)) {
    const start = m.index ?? 0;
    push({ kind: "text", text: text.slice(i, start) });
    if (m[1]) {
      const [url, trail] = splitTrailing(m[1]);
      const href = safeHref(url);
      push(href ? { kind: "link", text: displayUrl(href), href } : { kind: "text", text: url });
      push({ kind: "text", text: trail });
    } else if (m[3]) {
      push({ kind: "text", text: m[2] });
      push({ kind: "link", text: `#${m[3]}`, href: `https://x.com/hashtag/${encodeURIComponent(m[3])}` });
    } else if (m[5]) {
      push({ kind: "text", text: m[4] });
      push({ kind: "link", text: `@${m[5]}`, href: `https://x.com/${m[5]}` });
    }
    i = start + m[0].length;
  }
  push({ kind: "text", text: text.slice(i) });
  return out;
}

// ---------------------------------------------------------------------------
// Posts
// ---------------------------------------------------------------------------

/** Valid ISO date-time (parsable and not in the future by more than a day), or null. */
export function isoOrNull(raw: unknown, now = Date.now()): string | null {
  if (typeof raw !== "string" && typeof raw !== "number") return null;
  const t = typeof raw === "number" ? raw : Date.parse(raw);
  if (!Number.isFinite(t) || t <= 0 || t > now + 86_400_000) return null;
  return new Date(t).toISOString();
}

/** Newest first, one per id, empty texts dropped, at most `max`. */
export function normalizePosts(posts: XPost[], max = MAX_POSTS): XPost[] {
  const seen = new Set<string>();
  return posts
    .filter((p) => p && /^\d+$/.test(p.id) && p.text.length > 0 && Number.isFinite(Date.parse(p.createdAt)))
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || b.id.localeCompare(a.id))
    .filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)))
    .slice(0, max);
}

export function emptyFeed(source: XFeedSource, reason: XFeedFailure | null, now = new Date()): XFeedResult {
  return { source, posts: [], reason, fetchedAt: now.toISOString() };
}

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

/**
 * "2 h ago" / "yesterday" / "3 days ago" in the page's language for the last
 * week, the date after that (and always the date for a post whose time is not
 * known). Computed when the page is rendered (the page revalidates every few
 * minutes); the exact date and time are in the <time> element's title.
 */
export function relativeDate(iso: string, now: number, locale: string, dateOnly = false): string {
  const t = Date.parse(iso);
  const diff = Math.max(0, now - t);
  const min = Math.floor(diff / 60_000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto", style: "short" });
  if (!dateOnly) {
    if (min < 1) return rtf.format(0, "minute");
    if (min < 60) return rtf.format(-min, "minute");
    const h = Math.floor(min / 60);
    if (h < 24) return rtf.format(-h, "hour");
    const d = Math.floor(h / 24);
    if (d < 7) return rtf.format(-d, "day");
  }
  const sameYear = new Date(t).getUTCFullYear() === new Date(now).getUTCFullYear();
  const timeZone = dateOnly ? "UTC" : "America/Argentina/Buenos_Aires";
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", ...(sameYear ? {} : { year: "numeric" }), timeZone }).format(t);
}

/** Full date and time for the title attribute and screen readers. */
export function fullDate(iso: string, locale: string, dateOnly = false): string {
  return new Intl.DateTimeFormat(locale, dateOnly ? { dateStyle: "long", timeZone: "UTC" } : { dateStyle: "long", timeStyle: "short", timeZone: "America/Argentina/Buenos_Aires" }).format(Date.parse(iso));
}
