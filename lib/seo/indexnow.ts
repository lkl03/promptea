// lib/seo/indexnow.ts
//
// v1.8.6 — IndexNow (https://www.indexnow.org): tell Bing and the engines that
// share its index (Yandex, Seznam, Naver, Yep…) that a URL was published or
// changed, instead of waiting for the next crawl. Bing matters beyond the US:
// it is reachable from mainland China, where Google is not.
//
// How it is wired:
//   - The key is NOT in the repo. It lives in the INDEXNOW_KEY environment
//     variable (Vercel → Settings → Environment Variables, Production). Without
//     it everything here is a no-op.
//   - /indexnow-key.txt serves that key (app/indexnow-key.txt/route.ts). The
//     protocol needs the key published on the host; a root-level keyLocation
//     covers every URL of the host.
//   - AI Daily: /api/internal/blog/publish pings the story's URLs right after a
//     successful publish (the routines do not change).
//   - Guides and the rest of the hand-written pages go out with a deploy:
//     scripts/seo/indexnow.mjs submits the sitemap URLs whose <lastmod> is
//     recent, run by .github/workflows/indexnow.yml after each production deploy.
//
// A failed ping never fails the publish: IndexNow is a hint, the sitemap stays
// the source of truth.

import { getSiteUrl } from "./site";

export const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
export const INDEXNOW_KEY_PATH = "/indexnow-key.txt";
/** The protocol's limit per request. */
export const INDEXNOW_MAX_URLS = 10_000;

/** The protocol allows 8–128 characters: a–z, A–Z, 0–9 and dashes. */
const KEY_RE = /^[A-Za-z0-9-]{8,128}$/;

export function indexNowKey(env: Record<string, string | undefined> = process.env): string | null {
  const key = env.INDEXNOW_KEY?.trim();
  return key && KEY_RE.test(key) ? key : null;
}

export type IndexNowPayload = { host: string; key: string; keyLocation: string; urlList: string[] };

/**
 * The request body: absolute https URLs of this site only (IndexNow rejects the
 * whole batch when one URL is on another host), deduplicated, at most
 * INDEXNOW_MAX_URLS. Paths are resolved against the site origin.
 */
export function buildIndexNowPayload(urls: readonly string[], key: string, origin: string = getSiteUrl()): IndexNowPayload | null {
  const base = new URL(origin);
  const list: string[] = [];
  for (const raw of urls) {
    let u: URL;
    try {
      u = new URL(raw, base);
    } catch {
      continue;
    }
    if (u.host !== base.host || u.protocol !== "https:") continue;
    u.hash = "";
    const s = u.toString();
    if (!list.includes(s)) list.push(s);
    if (list.length >= INDEXNOW_MAX_URLS) break;
  }
  if (list.length === 0) return null;
  return { host: base.host, key, keyLocation: new URL(INDEXNOW_KEY_PATH, base).toString(), urlList: list };
}

export type IndexNowResult =
  | { ok: true; status: number; submitted: number }
  | { ok: false; reason: "no_key" | "no_urls" | "http_error" | "network_error"; status?: number };

/** Submit URLs to IndexNow. Never throws. 200 and 202 are both success. */
export async function submitIndexNow(
  urls: readonly string[],
  opts: { key?: string | null; origin?: string; fetchImpl?: typeof fetch; timeoutMs?: number } = {},
): Promise<IndexNowResult> {
  const key = opts.key === undefined ? indexNowKey() : opts.key;
  if (!key) return { ok: false, reason: "no_key" };
  const payload = buildIndexNowPayload(urls, key, opts.origin);
  if (!payload) return { ok: false, reason: "no_urls" };
  const doFetch = opts.fetchImpl ?? fetch;
  try {
    const res = await doFetch(INDEXNOW_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(opts.timeoutMs ?? 8000),
    });
    if (res.status === 200 || res.status === 202) return { ok: true, status: res.status, submitted: payload.urlList.length };
    return { ok: false, reason: "http_error", status: res.status };
  } catch {
    return { ok: false, reason: "network_error" };
  }
}
