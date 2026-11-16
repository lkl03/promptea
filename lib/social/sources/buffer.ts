// lib/social/sources/buffer.ts
//
// v1.8.7 — the X feed from Buffer, the tool Promptea's posts are scheduled and
// published with. Buffer keeps every SENT post with its text, the moment it
// went out and `externalLink`, the post's URL on X — exactly what the card
// needs, from Buffer's public GraphQL API (https://developers.buffer.com):
//
//   POST https://api.buffer.com   Authorization: Bearer <BUFFER_API_KEY>
//   posts(first, input: { organizationId, filter: { status: [sent] }, sort: [{ field: dueAt, direction: desc }] })
//
// The key is an account API key (publish.buffer.com/settings/api), server-only:
// it never reaches the browser, a log line or the cache key. The free plan
// includes API access (1 key; 600 calls a day; 1,000 a month per channel,
// shared with the owner's MCP use) — the server calls it at most once every
// FEED_REVALIDATE_SECONDS (lib/social/feed.ts).
//
// Pure: fetch is injected, nothing here reads the environment.

import { canonicalTweetUrl, isoOrNull, normalizePosts, sanitizeText, tweetIdFromUrl, type XFeedFailure, type XPost } from "../feed";

export const BUFFER_API_URL = "https://api.buffer.com";
export const BUFFER_TIMEOUT_MS = 6_000;
/** Posts asked for: more than the card shows, in case some are not on X or have no link yet. */
export const BUFFER_PAGE_SIZE = 20;

export const ORGANIZATIONS_QUERY = "query PrompteaFeedOrganizations { account { organizations { id } } }";

/** The query for sent posts; `channelIds` is added only when a channel is configured. */
export function postsQuery(withChannel: boolean): string {
  const vars = withChannel ? "$org: OrganizationId!, $first: Int!, $channels: [ChannelId!]" : "$org: OrganizationId!, $first: Int!";
  const filter = withChannel ? "{ status: [sent], channelIds: $channels }" : "{ status: [sent] }";
  return `query PrompteaXFeed(${vars}) { posts(first: $first, input: { organizationId: $org, filter: ${filter}, sort: [{ field: dueAt, direction: desc }] }) { edges { node { id text sentAt dueAt externalLink channelService status } } } }`;
}

export type BufferDeps = {
  apiKey: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  now?: () => number;
};

type GqlOutcome = { ok: true; data: unknown } | { ok: false; reason: XFeedFailure; status?: number };

/** Buffer ids are 24 hex characters. */
const BUFFER_ID = /^[a-f0-9]{24}$/i;

export async function bufferGraphql(deps: BufferDeps, query: string, variables: Record<string, unknown> = {}): Promise<GqlOutcome> {
  const key = deps.apiKey.trim();
  if (!key) return { ok: false, reason: "not_configured" };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), deps.timeoutMs ?? BUFFER_TIMEOUT_MS);
  let res: Response;
  try {
    res = await (deps.fetchImpl ?? fetch)(BUFFER_API_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query, variables }),
      signal: controller.signal,
      cache: "no-store",
    });
  } catch (err) {
    return { ok: false, reason: (err as { name?: string })?.name === "AbortError" ? "timeout" : "upstream_error" };
  } finally {
    clearTimeout(timer);
  }
  if (res.status === 401 || res.status === 403) return { ok: false, reason: "unauthorized", status: res.status };
  if (res.status === 429) return { ok: false, reason: "rate_limited", status: res.status };
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return { ok: false, reason: res.ok ? "invalid_response" : "upstream_error", status: res.status };
  }
  const errors = (body as { errors?: Array<{ extensions?: { code?: string } }> })?.errors;
  if (Array.isArray(errors) && errors.length) {
    const codes = errors.map((e) => String(e?.extensions?.code ?? "").toUpperCase());
    if (codes.some((c) => c === "UNAUTHENTICATED" || c === "FORBIDDEN" || c === "UNAUTHORIZED")) return { ok: false, reason: "unauthorized", status: res.status };
    if (codes.some((c) => c.includes("RATE") || c === "TOO_MANY_REQUESTS")) return { ok: false, reason: "rate_limited", status: res.status };
    return { ok: false, reason: res.ok ? "invalid_response" : "upstream_error", status: res.status };
  }
  if (!res.ok) return { ok: false, reason: "upstream_error", status: res.status };
  const data = (body as { data?: unknown })?.data;
  return data && typeof data === "object" ? { ok: true, data } : { ok: false, reason: "invalid_response", status: res.status };
}

/** The account's first organization id (the API key is account-wide). */
export async function fetchOrganizationId(deps: BufferDeps): Promise<{ ok: true; id: string } | { ok: false; reason: XFeedFailure }> {
  const r = await bufferGraphql(deps, ORGANIZATIONS_QUERY);
  if (!r.ok) return r;
  const orgs = (r.data as { account?: { organizations?: Array<{ id?: unknown }> } })?.account?.organizations;
  const id = Array.isArray(orgs) ? orgs.map((o) => o?.id).find((v): v is string => typeof v === "string" && BUFFER_ID.test(v)) : undefined;
  return id ? { ok: true, id } : { ok: false, reason: "invalid_response" };
}

/** Raw Buffer post nodes → the card's posts. Only sent posts on X with a valid status link survive. */
export function postsFromBuffer(data: unknown, handle: string | null, now = Date.now()): XPost[] {
  const edges = (data as { posts?: { edges?: Array<{ node?: Record<string, unknown> }> } })?.posts?.edges;
  if (!Array.isArray(edges)) return [];
  const out: XPost[] = [];
  for (const e of edges) {
    const n = e?.node;
    if (!n || typeof n !== "object") continue;
    if (String(n.status ?? "sent").toLowerCase() !== "sent") continue;
    if (n.channelService !== undefined && !/^(twitter|x)$/i.test(String(n.channelService))) continue;
    const id = tweetIdFromUrl(typeof n.externalLink === "string" ? n.externalLink : null);
    const createdAt = isoOrNull(n.sentAt, now) ?? isoOrNull(n.dueAt, now);
    const text = sanitizeText(n.text);
    if (!id || !createdAt || !text) continue;
    out.push({ id, url: canonicalTweetUrl(id, handle), text, createdAt });
  }
  return normalizePosts(out);
}

export type BufferFeedOptions = {
  organizationId: string;
  channelId?: string | null;
  handle: string | null;
};

export async function fetchBufferPosts(deps: BufferDeps, opts: BufferFeedOptions): Promise<{ ok: true; posts: XPost[] } | { ok: false; reason: XFeedFailure }> {
  if (!BUFFER_ID.test(opts.organizationId)) return { ok: false, reason: "not_configured" };
  const channel = opts.channelId && BUFFER_ID.test(opts.channelId) ? opts.channelId : null;
  const r = await bufferGraphql(deps, postsQuery(Boolean(channel)), { org: opts.organizationId, first: BUFFER_PAGE_SIZE, ...(channel ? { channels: [channel] } : {}) });
  if (!r.ok) return r;
  return { ok: true, posts: postsFromBuffer(r.data, opts.handle, deps.now?.() ?? Date.now()) };
}

export function isBufferId(v: string | null | undefined): v is string {
  return typeof v === "string" && BUFFER_ID.test(v.trim());
}
