// lib/social.ts
//
// v1.8.0 — where Promptea's X (Twitter) presence lives, read from the
// environment at build/render time (both variables are NEXT_PUBLIC_*, so they
// are inlined into client bundles too):
//
//   NEXT_PUBLIC_X_HANDLE  the account handle, with or without "@"  (preferred)
//   NEXT_PUBLIC_X_URL     the profile URL; the handle is derived from it when
//                         NEXT_PUBLIC_X_HANDLE is not set (default https://x.com,
//                         which carries no handle)
//
//   NEXT_PUBLIC_X_LIST_ID (v1.8.1, optional) the numeric id of an X list: when
//                         set, the feed card embeds that list instead of the
//                         account's own timeline (the handle still names the
//                         account and feeds the "Follow" link).
//
// Without a handle there is nothing to embed: the feed card is not rendered and
// the footer keeps linking to the generic URL.
//
// To change what the feed card shows, change these variables — never the
// component (components/home/XFeed.tsx renders whatever source it is given).

/** X handles: 1–15 letters, digits or underscores. */
const HANDLE_RE = /^[A-Za-z0-9_]{1,15}$/;

/** Path segments on x.com / twitter.com that are not profiles. */
const RESERVED = new Set(["i", "home", "intent", "share", "search", "explore", "settings", "login", "signup", "hashtag", "messages", "notifications", "tos", "privacy"]);

export function normalizeHandle(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const h = raw.trim().replace(/^@+/, "");
  return HANDLE_RE.test(h) && !RESERVED.has(h.toLowerCase()) ? h : null;
}

export function handleFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    if (!/(^|\.)(x|twitter)\.com$/i.test(u.hostname)) return null;
    return normalizeHandle(u.pathname.split("/").filter(Boolean)[0]);
  } catch {
    return null;
  }
}

export type XLinks = { url: string; handle: string | null };

/** Pure: takes the raw values so it can be tested without touching process.env. */
export function resolveXLinks(handleEnv: string | undefined, urlEnv: string | undefined): XLinks {
  const handle = normalizeHandle(handleEnv) ?? handleFromUrl(urlEnv);
  const url = handle ? `https://x.com/${handle}` : urlEnv && /^https?:\/\//.test(urlEnv) ? urlEnv : "https://x.com";
  return { url, handle };
}

export function getXLinks(): XLinks {
  // Direct property access so Next inlines the NEXT_PUBLIC_* values.
  return resolveXLinks(process.env.NEXT_PUBLIC_X_HANDLE, process.env.NEXT_PUBLIC_X_URL);
}

// ---------------------------------------------------------------------------
// Feed source (v1.8.1)
// ---------------------------------------------------------------------------

/** What the X feed card embeds: an account's timeline, or a curated list owned by that account. */
export type XFeedSource = { kind: "profile"; handle: string } | { kind: "list"; handle: string; listId: string };

/** X list ids are numeric snowflakes. */
const LIST_ID_RE = /^[0-9]{5,25}$/;

/** Pure: null when there is no valid handle (no card), a list when a valid list id is given, the profile otherwise. */
export function resolveXFeedSource(handleEnv: string | undefined, urlEnv: string | undefined, listIdEnv: string | undefined): XFeedSource | null {
  const { handle } = resolveXLinks(handleEnv, urlEnv);
  if (!handle) return null;
  const listId = listIdEnv?.trim();
  return listId && LIST_ID_RE.test(listId) ? { kind: "list", handle, listId } : { kind: "profile", handle };
}

export function getXFeedSource(): XFeedSource | null {
  return resolveXFeedSource(process.env.NEXT_PUBLIC_X_HANDLE, process.env.NEXT_PUBLIC_X_URL, process.env.NEXT_PUBLIC_X_LIST_ID);
}
