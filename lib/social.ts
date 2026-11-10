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
//   NEXT_PUBLIC_ELFSIGHT_X_WIDGET_ID (optional) the id of the Elfsight "Twitter
//                         Feed" widget the feed card renders. Defaults to
//                         Promptea's own widget (DEFAULT_X_WIDGET_ID below).
//
// The handle names the account in the footer link and on the feed card; the
// posts themselves come from the Elfsight widget, whose account, layout and
// number of posts are set in the Elfsight dashboard (components/home/XFeed.tsx).

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
// Feed widget (v1.8.1): Elfsight "Twitter Feed"
// ---------------------------------------------------------------------------

/** Promptea's Elfsight widget (created by the owner on 2026-11-10). */
export const DEFAULT_X_WIDGET_ID = "941b1ba8-5c1c-4d91-a254-c242d3c77a61";

/** Elfsight widget ids are UUIDs; anything else is ignored (the id becomes a class name). */
const WIDGET_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Pure: the env value when it is a valid id, the default otherwise; "off" (or "none") disables the card. */
export function resolveXWidgetId(env: string | undefined): string | null {
  const v = env?.trim();
  if (v && /^(off|none|false|0)$/i.test(v)) return null;
  return v && WIDGET_ID_RE.test(v) ? v.toLowerCase() : DEFAULT_X_WIDGET_ID;
}

export function getXWidgetId(): string | null {
  return resolveXWidgetId(process.env.NEXT_PUBLIC_ELFSIGHT_X_WIDGET_ID);
}
