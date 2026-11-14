#!/usr/bin/env node
// scripts/seo/indexnow.mjs — `npm run seo:indexnow`
//
// Submits the recently changed URLs of a deployed Promptea to IndexNow (Bing and
// the engines that share its index). Run after a production deploy by
// .github/workflows/indexnow.yml, so guides, model pages and the rest of the
// hand-written content are announced when they go live; AI Daily stories are
// pinged by the publish endpoint itself (lib/seo/indexnow.ts).
//
// It needs no secret: the key is read from the site's own /indexnow-key.txt
// (served from the INDEXNOW_KEY env var on Vercel). While that answers 404 the
// script reports it and exits 0, so a deploy never fails because of it.
//
//   npm run seo:indexnow                          # sitemap URLs with <lastmod> in the last 2 days
//   npm run seo:indexnow -- --days 7
//   npm run seo:indexnow -- --since 2026-11-14
//   npm run seo:indexnow -- --url https://www.promptea.me/en/guides/qwen-prompt-guide
//   npm run seo:indexnow -- --dry-run             # print what would be sent
//   BASE_URL=https://www.promptea.me (default)

const BASE = (process.env.BASE_URL || "https://www.promptea.me").replace(/\/+$/, "");
const ENDPOINT = "https://api.indexnow.org/indexnow";
const UA = "promptea-indexnow/1.0";
const args = process.argv.slice(2);
const DRY = args.includes("--dry-run");

function argValue(name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}
const explicit = args.flatMap((a, i) => (a === "--url" && args[i + 1] ? [args[i + 1]] : []));

function sinceDay() {
  const since = argValue("--since");
  if (since) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(since)) throw new Error(`--since must be YYYY-MM-DD, got ${since}`);
    return since;
  }
  const days = Number(argValue("--days") ?? 2);
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
}

async function get(url) {
  const res = await fetch(url, { headers: { "user-agent": UA }, redirect: "follow", signal: AbortSignal.timeout(20_000) });
  return { status: res.status, text: res.status === 200 ? await res.text() : "" };
}

/** <url><loc>…</loc><lastmod>…</lastmod></url> pairs of a sitemap. */
function parseSitemap(xml) {
  const out = [];
  for (const m of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const loc = m[1].match(/<loc>\s*([^<]+?)\s*<\/loc>/)?.[1];
    const lastmod = m[1].match(/<lastmod>\s*([^<]+?)\s*<\/lastmod>/)?.[1];
    if (loc) out.push({ loc: loc.replace(/&amp;/g, "&"), lastmod: lastmod ?? null });
  }
  return out;
}

async function main() {
  const keyRes = await get(`${BASE}/indexnow-key.txt`);
  const key = keyRes.text.trim();
  const hasKey = keyRes.status === 200 && /^[A-Za-z0-9-]{8,128}$/.test(key);
  if (!hasKey && DRY) {
    console.log(`indexnow: ${BASE}/indexnow-key.txt answered ${keyRes.status} (no key yet); --dry-run continues to list the URLs.`);
  } else if (!hasKey) {
    console.log(`indexnow: ${BASE}/indexnow-key.txt answered ${keyRes.status}; INDEXNOW_KEY is not configured on the site. Nothing sent.`);
    return;
  }

  let urls = explicit;
  let since = null;
  if (urls.length === 0) {
    since = sinceDay();
    const sm = await get(`${BASE}/sitemap.xml`);
    if (sm.status !== 200) throw new Error(`sitemap.xml answered ${sm.status}`);
    urls = parseSitemap(sm.text)
      .filter((u) => u.lastmod && u.lastmod.slice(0, 10) >= since)
      .map((u) => u.loc);
  }

  const host = new URL(BASE).host;
  const list = [...new Set(urls)].filter((u) => {
    try {
      const x = new URL(u);
      return x.host === host && x.protocol === "https:";
    } catch {
      return false;
    }
  }).slice(0, 10_000);

  if (list.length === 0) {
    console.log(`indexnow: no URLs to submit${since ? ` (none with <lastmod> since ${since})` : ""}.`);
    return;
  }

  const body = { host, key, keyLocation: `${BASE}/indexnow-key.txt`, urlList: list };
  console.log(`indexnow: ${list.length} URL(s)${since ? ` changed since ${since}` : ""}:`);
  for (const u of list) console.log(`  ${u}`);
  if (DRY) {
    console.log("indexnow: --dry-run, nothing sent.");
    return;
  }

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8", "user-agent": UA },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });
  if (res.status === 200 || res.status === 202) {
    console.log(`indexnow: accepted (${res.status}).`);
    return;
  }
  // 403: key not valid for the host / key file unreachable; 422: URLs not on the host; 429: too many requests.
  console.error(`indexnow: rejected with HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  process.exitCode = 1;
}

main().catch((err) => {
  console.error(`indexnow: ${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1;
});
