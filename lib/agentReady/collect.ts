// lib/agentReady/collect.ts
//
// v1.9.0 — the network half of an audit: a fixed, small set of GETs against the
// site (11 at most), all through safeFetch. The page goes first because every
// other URL hangs off the origin that actually answered; the rest run a few at
// a time. A probe that fails is recorded as failed, never thrown: a site
// without /llms.txt is a finding, not an error.

import "server-only";

import { SafeFetchError, safeFetch, type SafeFetchOptions, type SafeResponse } from "./net/safeFetch";
import { PROBE_KEYS, type Probe, type ProbeKey, type Snapshot } from "./types";

export type Fetcher = (url: string, opts?: SafeFetchOptions) => Promise<SafeResponse>;

const SMALL = 300_000;

type Plan = { key: ProbeKey; url: (pageUrl: URL) => string; accept?: string; maxBytes?: number };

/** `/pricing` → `/pricing.md`; the root → `/index.md`. */
export function twinUrl(page: URL): string {
  const u = new URL(page.toString());
  u.search = "";
  const path = u.pathname.replace(/\/+$/, "");
  u.pathname = path === "" ? "/index.md" : /\.[a-z0-9]{1,5}$/i.test(path) ? path.replace(/\.[a-z0-9]{1,5}$/i, ".md") : `${path}.md`;
  return u.toString();
}

const SITE_PROBES: Plan[] = [
  { key: "pageMarkdown", url: (p) => p.toString(), accept: "text/markdown, text/html;q=0.5" },
  { key: "pageTwin", url: twinUrl, accept: "text/markdown, text/plain;q=0.8, */*;q=0.1", maxBytes: SMALL },
  { key: "robots", url: (p) => `${p.origin}/robots.txt`, accept: "text/plain, */*;q=0.1", maxBytes: SMALL },
  { key: "llms", url: (p) => `${p.origin}/llms.txt`, accept: "text/plain, text/markdown, */*;q=0.1", maxBytes: SMALL },
  { key: "sitemap", url: (p) => `${p.origin}/sitemap.xml`, accept: "application/xml, text/xml, */*;q=0.1", maxBytes: SMALL },
  { key: "apiCatalog", url: (p) => `${p.origin}/.well-known/api-catalog`, accept: "application/linkset+json, application/json", maxBytes: SMALL },
  { key: "aiCatalog", url: (p) => `${p.origin}/.well-known/ai-catalog.json`, accept: "application/json", maxBytes: SMALL },
  { key: "mcpCard", url: (p) => `${p.origin}/.well-known/mcp/server-card.json`, accept: "application/json", maxBytes: SMALL },
  { key: "skills", url: (p) => `${p.origin}/.well-known/agent-skills/index.json`, accept: "application/json", maxBytes: SMALL },
  { key: "openapi", url: (p) => `${p.origin}/openapi.json`, accept: "application/json, application/openapi+json", maxBytes: SMALL },
];

/** The site's Sitemap directive, when robots.txt names one on the same origin. */
function sitemapFromRobots(robots: Probe, origin: string): string | null {
  if (!robots.ok) return null;
  for (const m of robots.body.matchAll(/^\s*sitemap\s*:\s*(\S+)\s*$/gim)) {
    try {
      const u = new URL(m[1]);
      if (u.origin === origin) return u.toString();
    } catch {
      /* not a URL: ignore */
    }
  }
  return null;
}

function failed(key: ProbeKey, url: string, error: string): Probe {
  return { key, url, ok: false, status: 0, error, contentType: "", headers: {}, body: "", bytes: 0, truncated: false, finalUrl: url };
}

function toProbe(key: ProbeKey, url: string, res: SafeResponse): Probe {
  return {
    key,
    url,
    ok: res.status >= 200 && res.status < 300,
    status: res.status,
    contentType: (res.headers["content-type"] ?? "").split(";")[0].trim().toLowerCase(),
    headers: res.headers,
    body: res.body,
    bytes: res.bytes,
    truncated: res.truncated,
    finalUrl: res.url,
  };
}

async function probe(fetcher: Fetcher, key: ProbeKey, url: string, opts: SafeFetchOptions): Promise<Probe> {
  try {
    return toProbe(key, url, await fetcher(url, opts));
  } catch (err) {
    return failed(key, url, err instanceof SafeFetchError ? err.code : "network");
  }
}

export type CollectOptions = {
  fetcher?: Fetcher;
  concurrency?: number;
  onProbe?: (p: Probe, ms: number) => void;
  onStart?: (pageUrl: string, keys: ProbeKey[]) => void;
};

/**
 * Fetches everything an audit needs. Throws SafeFetchError only when the page
 * itself cannot be fetched (refused URL, DNS failure, timeout): without the
 * page there is nothing to audit.
 */
export async function collect(input: string, opts: CollectOptions = {}): Promise<Snapshot> {
  const fetcher = opts.fetcher ?? safeFetch;
  const t0 = Date.now();
  const pageRes = await fetcher(input, { accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5" });
  const pageUrl = new URL(pageRes.url);
  const page = toProbe("page", pageRes.requestedUrl, pageRes);
  opts.onStart?.(pageUrl.toString(), [...PROBE_KEYS]);
  opts.onProbe?.(page, Date.now() - t0);

  const probes = { page } as Record<ProbeKey, Probe>;
  const queue = [...SITE_PROBES];
  const worker = async () => {
    for (let plan = queue.shift(); plan; plan = queue.shift()) {
      const started = Date.now();
      const url = plan.url(pageUrl);
      const result = await probe(fetcher, plan.key, url, { accept: plan.accept, maxBytes: plan.maxBytes });
      probes[plan.key] = result;
      opts.onProbe?.(result, Date.now() - started);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(opts.concurrency ?? 4, 6)) }, worker));

  // robots.txt may name a sitemap that is not at /sitemap.xml: follow it once, same origin only.
  const declared = sitemapFromRobots(probes.robots, pageUrl.origin);
  if (declared && declared !== probes.sitemap.url && !probes.sitemap.ok) {
    const started = Date.now();
    probes.sitemap = await probe(fetcher, "sitemap", declared, { accept: "application/xml, text/xml, */*;q=0.1", maxBytes: SMALL });
    opts.onProbe?.(probes.sitemap, Date.now() - started);
  }

  return { requestedUrl: pageRes.requestedUrl, pageUrl: pageUrl.toString(), origin: pageUrl.origin, probes };
}
