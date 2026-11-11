#!/usr/bin/env node
// scripts/seo-check.mjs — `npm run seo:check`
//
// Audits a RUNNING Promptea server the way a crawler sees it. Start one first:
//
//   npm run build && npm start            # then, in another terminal:
//   npm run seo:check                     # BASE_URL=http://localhost:3000 by default
//   BASE_URL=https://promptea.me npm run seo:check
//   npm run seo:check -- --quick          # key pages only instead of every sitemap URL
//
// What it checks
//   robots.txt      one rule group per AI crawler, the shared Disallow repeated, sitemap line
//   sitemap.xml     every URL answers 200 without redirecting, no duplicates, real <lastmod>,
//                   es/en/pt-BR+pt/x-default alternates that point back at the page (es/en/x-default
//                   for content that has no Portuguese version: AI Daily, untranslated guides)
//   llms.txt        (root, /es, /en, /pt) and llms-full.txt: 200, text/plain, expected sections,
//                   every same-site link resolves, every .md link is text/markdown
//   markdown twins  title, source URL, language, canonical Link header
//   pages           one <h1>, one <title>, one canonical equal to the page, reciprocal hreflang
//                   + x-default, Open Graph / Twitter tags with an image, no duplicated tags,
//                   no noindex, and the JSON-LD (valid, @ids resolved, dates real, FAQ/HowTo/
//                   DefinedTerm/Article/Dataset/Breadcrumb claims visible on the page)
//
// Exit code 0 when everything passes, 1 on any failure (warnings do not fail the run).
//
// Not covered, by nature: Google's Rich Results Test / Schema Markup Validator and Search
// Console need the public internet and a verified property. See docs/seo-proposals.md.

import { parseHead, visibleText } from "./seo/html.mjs";
import { isIsoDate, validateLd } from "./seo/ld.mjs";

const BASE = (process.env.BASE_URL || "http://localhost:3000").replace(/\/+$/, "");
const QUICK = process.argv.includes("--quick");
const VERBOSE = process.argv.includes("--verbose");
const CONCURRENCY = Number(process.env.SEO_CHECK_CONCURRENCY || 8);
const TIMEOUT_MS = Number(process.env.SEO_CHECK_TIMEOUT_MS || 30000);

// The AI crawler tokens robots.txt must name explicitly (lib/seo/crawlers.ts is the policy;
// this list is the contract the check holds it to).
const EXPECTED_CRAWLERS = [
  "OAI-SearchBot", "ChatGPT-User", "GPTBot",
  "Claude-SearchBot", "Claude-User", "ClaudeBot",
  "PerplexityBot", "Perplexity-User",
  "Google-Extended", "Applebot-Extended", "CCBot", "Meta-ExternalAgent",
];

// Keep equal to lib/domain.ts LANGS.
const LOCALES = ["es", "en", "pt"];
const LOCALE_ALT = LOCALES.join("|");
/** hreflang of a page that exists in every locale / only in the content languages (es, en). */
const HREFLANG_ALL = "en,es,pt,pt-BR,x-default";
const HREFLANG_CONTENT = "en,es,x-default";
const HTML_LANG = { es: "es", en: "en", pt: "pt-BR" };
const LANGUAGE_LINE = { es: "Idioma: Español", en: "Language: English", pt: "Idioma: Português" };
/** Keep equal to LLMS_FULL_TOTAL_BYTES / 1024 in lib/seo/llms.ts (test-enforced). */
const LLMS_FULL_MAX_KB = 400;
/**
 * <title> length above which a page fails (the brand suffix included). Editorial
 * headlines used as titles are clamped by clampTitle() (lib/seo/metadata.ts); 27
 * hand-written guide titles sit between 91 and 120 characters (listed in
 * docs/release/v1.8.1/qa-report.md), so the hard limit stays at 120 for now.
 */
const TITLE_MAX_LENGTH = 120;
const SINGLE_META = [
  "description", "og:title", "og:description", "og:url", "og:type", "og:site_name", "og:locale", "og:image",
  "twitter:card", "twitter:title", "twitter:description", "twitter:image",
];

// ---------------------------------------------------------------------------
// tiny test harness
// ---------------------------------------------------------------------------

const results = []; // { group, name, ok, detail?, warn? }
let currentGroup = "";
function group(name) {
  currentGroup = name;
  console.log(`\n== ${name}`);
}
function record(name, ok, detail = "") {
  results.push({ group: currentGroup, name, ok, detail });
  if (!ok) console.log(`  ✗ ${name}${detail ? `\n      ${String(detail).split("\n").join("\n      ")}` : ""}`);
  else if (VERBOSE) console.log(`  ✓ ${name}`);
}
function warn(name, detail = "") {
  results.push({ group: currentGroup, name, ok: true, warn: true, detail });
  console.log(`  ! ${name}${detail ? ` — ${detail}` : ""}`);
}
function summaryOfGroup(g) {
  const rs = results.filter((r) => r.group === g);
  const failed = rs.filter((r) => !r.ok).length;
  const warned = rs.filter((r) => r.warn).length;
  console.log(`  ${failed === 0 ? "✓" : "✗"} ${g}: ${rs.length - failed - warned} passed${failed ? `, ${failed} FAILED` : ""}${warned ? `, ${warned} warning(s)` : ""}`);
}

// ---------------------------------------------------------------------------
// http
// ---------------------------------------------------------------------------

async function get(path, init = {}) {
  const url = path.startsWith("http") ? path : `${BASE}${path}`;
  try {
    const res = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(TIMEOUT_MS), headers: { "user-agent": "promptea-seo-check/1.0" }, ...init });
    const body = init.method === "HEAD" ? "" : await res.text();
    return { url, status: res.status, headers: res.headers, body };
  } catch (e) {
    return { url, status: 0, headers: new Headers(), body: "", error: e?.message ?? String(e) };
  }
}

async function pool(items, fn, n = CONCURRENCY) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (i < items.length) {
        const k = i++;
        out[k] = await fn(items[k], k);
      }
    }),
  );
  return out;
}

const mime = (r) => (r.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
const pathOf = (u) => new URL(u).pathname + new URL(u).search;

// ---------------------------------------------------------------------------
// robots.txt
// ---------------------------------------------------------------------------

function parseRobots(txt) {
  const groups = [];
  let cur = null;
  let sitemap = [];
  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    if (!line) {
      cur = null;
      continue;
    }
    const m = /^([A-Za-z-]+)\s*:\s*(.*)$/.exec(line);
    if (!m) continue;
    const k = m[1].toLowerCase();
    if (k === "user-agent") {
      if (!cur) groups.push((cur = { agents: [], allow: [], disallow: [] }));
      cur.agents.push(m[2]);
    } else if (k === "allow" && cur) cur.allow.push(m[2]);
    else if (k === "disallow" && cur) cur.disallow.push(m[2]);
    else if (k === "sitemap") sitemap.push(m[2]);
  }
  return { groups, sitemap };
}

async function checkRobots() {
  group("robots.txt");
  const r = await get("/robots.txt");
  record("GET /robots.txt answers 200", r.status === 200, `status ${r.status}${r.error ? ` (${r.error})` : ""}`);
  record("served as text/plain", mime(r) === "text/plain", mime(r));
  if (r.status !== 200) return;
  const { groups, sitemap } = parseRobots(r.body);
  const star = groups.find((g) => g.agents.includes("*"));
  record("has a catch-all group", !!star);
  record("catch-all allows the site", !!star && star.allow.includes("/"));
  const shared = star?.disallow ?? [];
  record("catch-all keeps /_next/ out", shared.includes("/_next/"), `disallow: ${shared.join(", ")}`);
  for (const bot of EXPECTED_CRAWLERS) {
    const g = groups.find((x) => x.agents.some((a) => a.toLowerCase() === bot.toLowerCase()));
    record(`${bot} has its own rule`, !!g);
    if (g) {
      const blocked = g.disallow.includes("/");
      const allowed = g.allow.includes("/");
      record(`${bot}: explicit allow or block`, blocked || allowed);
      if (allowed) record(`${bot}: repeats the shared Disallow (its own group ignores *)`, shared.every((p) => g.disallow.includes(p)), `has: ${g.disallow.join(", ")}`);
    }
  }
  record("declares a Sitemap", sitemap.length >= 1);
  record("Sitemap URL is absolute and ends in /sitemap.xml", sitemap.every((s) => /^https?:\/\/.+\/sitemap\.xml$/.test(s)), sitemap.join(", "));
  summaryOfGroup("robots.txt");
}

// ---------------------------------------------------------------------------
// sitemap.xml
// ---------------------------------------------------------------------------

function parseSitemap(xml) {
  const urls = [];
  for (const m of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const block = m[1];
    const loc = /<loc>([\s\S]*?)<\/loc>/.exec(block)?.[1]?.trim();
    const lastmod = /<lastmod>([\s\S]*?)<\/lastmod>/.exec(block)?.[1]?.trim();
    const alts = {};
    for (const a of block.matchAll(/<xhtml:link\b[^>]*>/g)) {
      const hl = /hreflang="([^"]+)"/.exec(a[0])?.[1];
      const href = /href="([^"]+)"/.exec(a[0])?.[1];
      if (hl && href) alts[hl] = href.replace(/&amp;/g, "&");
    }
    if (loc) urls.push({ loc: loc.replace(/&amp;/g, "&"), lastmod, alts });
  }
  return urls;
}

async function checkSitemap() {
  group("sitemap.xml");
  const r = await get("/sitemap.xml");
  record("GET /sitemap.xml answers 200", r.status === 200, `status ${r.status}`);
  record("served as XML", /xml/.test(mime(r)), mime(r));
  if (r.status !== 200) return { urls: [], origin: BASE };
  const urls = parseSitemap(r.body);
  record("lists URLs", urls.length > 0, `${urls.length} urls`);
  const origin = urls[0] ? new URL(urls[0].loc).origin : BASE;
  const locs = urls.map((u) => u.loc);
  const dup = locs.filter((l, i) => locs.indexOf(l) !== i);
  record("no duplicate URLs", dup.length === 0, dup.slice(0, 5).join("\n"));
  record("all URLs share one origin", urls.every((u) => new URL(u.loc).origin === origin));
  const badDate = urls.filter((u) => !u.lastmod || !isIsoDate(u.lastmod));
  record("every URL has a valid <lastmod>", badDate.length === 0, badDate.slice(0, 5).map((u) => `${u.loc} → ${u.lastmod}`).join("\n"));
  const epoch = urls.filter((u) => u.lastmod && new Date(u.lastmod).getTime() < new Date("2025-01-01").getTime());
  record("no placeholder/epoch <lastmod>", epoch.length === 0, epoch.slice(0, 5).map((u) => u.loc).join("\n"));
  const future = urls.filter((u) => u.lastmod && new Date(u.lastmod).getTime() > Date.now() + 36e5 * 24);
  record("no <lastmod> in the future", future.length === 0, future.slice(0, 5).map((u) => u.loc).join("\n"));
  const distinct = new Set(urls.map((u) => (u.lastmod || "").slice(0, 10)));
  if (urls.length > 20 && distinct.size <= 2) warn("<lastmod> barely varies", `${distinct.size} distinct day(s) across ${urls.length} URLs — crawlers learn to ignore it`);

  for (const u of urls) {
    const keys = Object.keys(u.alts).sort().join(",");
    if (keys !== HREFLANG_ALL && keys !== HREFLANG_CONTENT) {
      record(`alternates of ${pathOf(u.loc)}`, false, `got hreflang: ${keys || "(none)"}`);
      continue;
    }
    if (keys === HREFLANG_ALL && u.alts.pt !== u.alts["pt-BR"]) record(`pt and pt-BR of ${pathOf(u.loc)} are the same page`, false, `${u.alts.pt} vs ${u.alts["pt-BR"]}`);
    // A Portuguese URL is only listed for content that exists in Portuguese.
    if (keys === HREFLANG_CONTENT && pathOf(u.loc).startsWith("/pt")) record(`${pathOf(u.loc)} is listed without a Portuguese alternate`, false);
    if (!Object.values(u.alts).includes(u.loc)) record(`alternates of ${pathOf(u.loc)} include itself`, false, JSON.stringify(u.alts));
    if (u.alts["x-default"] !== u.alts.en) record(`x-default of ${pathOf(u.loc)} equals the en page`, false, `${u.alts["x-default"]} vs ${u.alts.en}`);
  }
  const byLoc = new Map(urls.map((u) => [u.loc, u]));
  const nonRecip = urls.filter((u) => Object.values(u.alts).some((alt) => !byLoc.get(alt) || !Object.values(byLoc.get(alt).alts).includes(u.loc)));
  const ptCount = urls.filter((u) => pathOf(u.loc) === "/pt" || pathOf(u.loc).startsWith("/pt/")).length;
  record("the sitemap lists Portuguese pages", ptCount > 20, `${ptCount} /pt URL(s)`);
  record("no /pt/blog URL is listed (AI Daily has no Portuguese edition)", !urls.some((u) => pathOf(u.loc).startsWith("/pt/blog")));
  record("alternates are reciprocal (each counterpart lists this URL back)", nonRecip.length === 0, nonRecip.slice(0, 5).map((u) => u.loc).join("\n"));

  // Every URL answers 200 directly.
  const probes = await pool(urls, async (u) => {
    const res = await get(u.loc.replace(origin, BASE), { method: "HEAD" });
    return { loc: u.loc, status: res.status, location: res.headers.get("location") };
  });
  const redirected = probes.filter((p) => p.status >= 300 && p.status < 400);
  const broken = probes.filter((p) => p.status < 200 || p.status >= 400);
  record("no sitemap URL redirects", redirected.length === 0, redirected.slice(0, 8).map((p) => `${p.status} ${p.loc} → ${p.location}`).join("\n"));
  record("every sitemap URL answers 200", broken.length === 0, broken.slice(0, 8).map((p) => `${p.status} ${p.loc}`).join("\n"));
  summaryOfGroup("sitemap.xml");
  return { urls, origin };
}

// ---------------------------------------------------------------------------
// llms.txt, llms-full.txt, markdown twins
// ---------------------------------------------------------------------------

async function checkLlms(origin) {
  group("llms.txt / llms-full.txt");
  const targets = [
    ["/llms.txt", "en", false],
    ["/es/llms.txt", "es", false],
    ["/en/llms.txt", "en", false],
    ["/pt/llms.txt", "pt", false],
    ["/llms-full.txt", "en", true],
    ["/es/llms-full.txt", "es", true],
    ["/en/llms-full.txt", "en", true],
    ["/pt/llms-full.txt", "pt", true],
  ];
  const linkSet = new Set();
  for (const [path, lang, full] of targets) {
    const r = await get(path);
    record(`GET ${path} answers 200`, r.status === 200, `status ${r.status}`);
    if (r.status !== 200) continue;
    record(`${path} is text/plain`, mime(r) === "text/plain", mime(r));
    record(`${path} starts with the product heading`, full ? r.body.startsWith("# Promptea — full text") : r.body.startsWith("# Promptea\n"));
    // /pt lists a guide only once it is translated, so "Guias de prompting" is not required there.
    const expected = lang === "es"
      ? full ? ["Guías de prompting", "Glosario", "Prompts por modelo", "Cómo citar"] : ["## Herramientas", "## Guías de prompting", "## Glosario", "## Prompts por modelo", "### Cómo citar", "## Optional"]
      : lang === "pt"
        ? full ? ["Glossário", "Prompts por modelo", "Como citar"] : ["## Ferramentas", "## Glossário", "## Prompts por modelo", "### Como citar", "## AI Daily", "## Optional"]
        : full ? ["Prompting guides", "Glossary", "Prompts by model", "How to cite"] : ["## Tools", "## Prompting guides", "## Glossary", "## Prompts by model", "### How to cite", "## Optional"];
    for (const s of expected) record(`${path} has "${s}"`, r.body.includes(s));
    record(`${path} has no template leftovers`, !/\[object Object\]|\bundefined\b/.test(r.body.replace(/null(\/|%2F)undefined/g, "")));
    if (!full) {
      const links = [...r.body.matchAll(/\]\((https?:\/\/[^)\s]+)\)/g)].map((m) => m[1]);
      record(`${path} links are absolute and unique`, new Set(links).size === links.length, `${links.length - new Set(links).size} duplicate link(s)`);
      for (const l of links) linkSet.add(l);
    } else {
      const kb = Math.round(Buffer.byteLength(r.body) / 1024);
      // Ceiling and its criterion: LLMS_FULL_TOTAL_BYTES in lib/seo/llms.ts (≈100–110 k tokens,
      // a single fetch into a 200 k-token context). Above it the file is rejected, not warned about.
      record(`${path} is within the ${LLMS_FULL_MAX_KB} KB ceiling (${kb} KB)`, kb <= LLMS_FULL_MAX_KB, `${kb} KB`);
    }
  }

  const same = [...linkSet].filter((l) => new URL(l).origin === origin);
  const probes = await pool(same, async (l) => {
    const res = await get(l.replace(origin, BASE), { method: "HEAD" });
    return { l, status: res.status, type: mime(res) };
  });
  const bad = probes.filter((p) => p.status !== 200);
  record(`every same-site link in llms.txt resolves (${same.length} checked)`, bad.length === 0, bad.slice(0, 10).map((p) => `${p.status} ${p.l}`).join("\n"));
  const wrongMd = probes.filter((p) => p.l.endsWith(".md") && p.status === 200 && p.type !== "text/markdown");
  record("every .md link is served as text/markdown", wrongMd.length === 0, wrongMd.slice(0, 5).map((p) => `${p.type} ${p.l}`).join("\n"));
  summaryOfGroup("llms.txt / llms-full.txt");

  const md = same.filter((l) => l.endsWith(".md"));
  group("markdown twins");
  const twins = await pool(md, async (l) => ({ l, r: await get(l.replace(origin, BASE)) }));
  for (const { l, r } of twins) {
    const html = l.replace(/\.md$/, "");
    const lang = new URL(l).pathname.split("/")[1].replace(/\.md$/, "");
    const problems = [];
    if (r.status !== 200) problems.push(`status ${r.status}`);
    else {
      if (mime(r) !== "text/markdown") problems.push(`content-type ${mime(r)}`);
      if (!r.body.startsWith("# ")) problems.push("does not start with a heading");
      if (!r.body.includes(html)) problems.push("does not name its HTML page as the source");
      if (!r.body.includes(LANGUAGE_LINE[lang] ?? LANGUAGE_LINE.en)) problems.push("language line missing");
      if (/<\/?(div|span|script|style)\b/i.test(r.body)) problems.push("contains HTML");
      const link = r.headers.get("link") || "";
      if (!link.includes(`<${html}>`) || !/rel="canonical"/.test(link)) problems.push(`Link header: ${link || "(none)"}`);
    }
    record(`twin ${pathOf(l)}`, problems.length === 0, problems.join("; "));
  }
  // A twin that does not exist must 404, not render something.
  for (const p of ["/en/guides/this-guide-does-not-exist.md", "/en/not-a-section.md", "/fr/about.md"]) {
    const r = await get(p);
    record(`unknown twin ${p} is a 404`, r.status === 404, `status ${r.status}`);
  }
  summaryOfGroup("markdown twins");
}

// ---------------------------------------------------------------------------
// pages: head tags, headings, JSON-LD
// ---------------------------------------------------------------------------

const KEY_PATHS = ["", "/how-it-works", "/about", "/methodology", "/benchmarks", "/guides", "/models", "/glossary", "/blog", "/blog/weekly", "/analyzer", "/best-ai"];

function pickKeyPages(urls, origin) {
  const picks = new Set();
  for (const l of LOCALES) {
    for (const p of KEY_PATHS) picks.add(`${origin}/${l}${p}`);
    for (const section of ["guides", "models", "glossary", "landing"]) {
      const first = urls.find((u) => new URL(u.loc).pathname.startsWith(`/${l}/${section}/`));
      if (first) picks.add(first.loc);
    }
    const article = urls.find((u) => new RegExp(`^/(${LOCALE_ALT})/blog/(?!weekly)[^/]+$`).test(new URL(u.loc).pathname) && new URL(u.loc).pathname !== `/${l}/blog`);
    if (article && new URL(article.loc).pathname.startsWith(`/${l}/`)) picks.add(article.loc);
  }
  return [...picks].filter((u) => urls.some((x) => x.loc === u));
}

function checkPage(loc, origin, res, sitemapEntry) {
  const path = pathOf(loc);
  const problems = [];
  if (res.status !== 200) return { problems: [`status ${res.status}`], head: null };
  if (mime(res) !== "text/html") problems.push(`content-type ${mime(res)}`);
  const html = res.body;
  const head = parseHead(html);

  if (head.h1.length !== 1) problems.push(`${head.h1.length} <h1> (want exactly 1): ${head.h1.join(" | ").slice(0, 120)}`);
  if (head.titles.length !== 1) problems.push(`${head.titles.length} <title>`);
  else if (head.titles[0].length < 10 || head.titles[0].length > TITLE_MAX_LENGTH) problems.push(`title length ${head.titles[0].length} (max ${TITLE_MAX_LENGTH})`);
  if (head.canonicals.length !== 1) problems.push(`${head.canonicals.length} canonical link(s)`);
  else if (head.canonicals[0] !== loc) problems.push(`canonical ${head.canonicals[0]} ≠ ${loc}`);

  const keys = Object.keys(head.hreflang).sort().join(",");
  const fullSet = keys === HREFLANG_ALL && head.hreflangCount === 5;
  const contentSet = keys === HREFLANG_CONTENT && head.hreflangCount === 3;
  if (!fullSet && !contentSet) problems.push(`hreflang: ${keys || "(none)"} (${head.hreflangCount} tags)`);
  else {
    if (!Object.values(head.hreflang).includes(loc)) problems.push("hreflang does not include the page itself");
    if (head.hreflang["x-default"] !== head.hreflang.en) problems.push("x-default is not the en page");
    if (fullSet && head.hreflang.pt !== head.hreflang["pt-BR"]) problems.push("pt and pt-BR point at different pages");
    if (sitemapEntry && Object.keys(sitemapEntry.alts).sort().join(",") !== keys) problems.push(`hreflang set differs from the sitemap's (${Object.keys(sitemapEntry.alts).sort().join(",")})`);
    else if (sitemapEntry && !Object.keys(head.hreflang).every((k) => sitemapEntry.alts[k] === head.hreflang[k])) {
      problems.push("hreflang differs from the sitemap's alternates");
    }
  }

  for (const k of SINGLE_META) {
    const n = head.count(k);
    if (n !== 1) problems.push(`<meta ${k}> x${n} (want 1)`);
  }
  if (head.count("robots") > 1) problems.push(`<meta robots> x${head.count("robots")}`);
  if (/noindex/i.test(head.first("robots") || "")) problems.push("page is noindex");
  const desc = head.first("description") || "";
  if (desc.length < 50 || desc.length > 320) problems.push(`meta description length ${desc.length}`);
  if (head.first("og:url") && head.first("og:url") !== loc) problems.push(`og:url ${head.first("og:url")} ≠ canonical`);
  if (head.first("og:image") && !/^https?:\/\//.test(head.first("og:image"))) problems.push("og:image is not absolute");
  if (head.first("twitter:image") && !/^https?:\/\//.test(head.first("twitter:image"))) problems.push("twitter:image is not absolute");
  if (head.first("twitter:card") && head.first("twitter:card") !== "summary_large_image") problems.push(`twitter:card ${head.first("twitter:card")}`);
  const lang = /<html[^>]*\blang="([^"]+)"/i.exec(html)?.[1];
  // pt-BR for /pt; es and en as they are.
  if (lang !== (HTML_LANG[path.split("/")[1]] ?? path.split("/")[1])) problems.push(`<html lang="${lang}"> ≠ /${path.split("/")[1]}`);
  const dup = head.metas.filter((m) => m.key === "og:locale").length;
  if (dup !== 1) problems.push(`og:locale x${dup}`);

  const ld = validateLd(html, { url: loc });
  for (const e of ld.errors) problems.push(`JSON-LD: ${e}`);
  if (visibleText(html).split(" ").length < 60) problems.push("fewer than 60 words of server-rendered text");
  // v1.8.1: the HowTo + FAQ moved with their text from the home page to /how-it-works.
  const types = ld.types || [];
  if (new RegExp(`^/(${LOCALE_ALT})/how-it-works$`).test(path)) {
    for (const t of ["HowTo", "FAQPage", "BreadcrumbList"]) if (!types.includes(t)) problems.push(`JSON-LD: /how-it-works must carry ${t}`);
  }
  if (new RegExp(`^/(${LOCALE_ALT})$`).test(path)) {
    for (const t of ["HowTo", "FAQPage"]) if (types.includes(t)) problems.push(`JSON-LD: the home page no longer prints the ${t} text, so it must not claim it`);
    if (!new RegExp(`href="/(${LOCALE_ALT})/how-it-works"`).test(html)) problems.push("the home page does not link to /how-it-works");
  }
  return { problems, head, types: ld.types };
}

async function checkPages(urls, origin) {
  group(QUICK ? "pages (key pages)" : "pages (every sitemap URL)");
  const targets = QUICK ? pickKeyPages(urls, origin) : urls.map((u) => u.loc);
  const byLoc = new Map(urls.map((u) => [u.loc, u]));
  const heads = new Map();
  const typesBy = {};
  await pool(targets, async (loc) => {
    const res = await get(loc.replace(origin, BASE));
    const { problems, head, types } = checkPage(loc, origin, res, byLoc.get(loc));
    if (head) heads.set(loc, head);
    const section = new URL(loc).pathname.split("/").slice(2, 3)[0] || "home";
    (typesBy[section] ||= new Set()).add((types || []).filter((t) => !["Organization", "ImageObject", "WebSite", "SoftwareApplication"].includes(t)).sort().join("+") || "(none)");
    record(`${pathOf(loc)}`, problems.length === 0, problems.join("\n"));
  });
  // Reciprocal hreflang across the pages actually fetched.
  const nonRecip = [];
  for (const [loc, head] of heads) {
    for (const l of Object.keys(head.hreflang)) {
      const other = head.hreflang[l];
      const oh = other && heads.get(other);
      if (oh && !Object.values(oh.hreflang).includes(loc)) nonRecip.push(`${loc} ↔ ${other}`);
    }
  }
  record("hreflang is reciprocal between rendered pages", nonRecip.length === 0, nonRecip.slice(0, 6).join("\n"));
  const noLd = Object.entries(typesBy).filter(([, v]) => v.size === 1 && v.has("(none)"));
  record("every section emits page-level JSON-LD", noLd.length === 0, noLd.map(([k]) => k).join(", "));
  if (VERBOSE) for (const [k, v] of Object.entries(typesBy)) console.log(`    ${k}: ${[...v].join(" | ")}`);

  // The 404 page must not be indexable as a real page.
  const nf = await get("/en/this-page-does-not-exist");
  record("unknown page answers 404", nf.status === 404, `status ${nf.status}`);
  summaryOfGroup(QUICK ? "pages (key pages)" : "pages (every sitemap URL)");
}

// ---------------------------------------------------------------------------
// proxy: the entry point and the language fallback x-default relies on
// ---------------------------------------------------------------------------

async function checkEntry() {
  group("language entry (proxy)");
  const root = await get("/", { headers: { "accept-language": "de-DE,de;q=0.9", "user-agent": "promptea-seo-check/1.0" } });
  const loc = root.headers.get("location") || "";
  record("/ redirects a visitor with an unsupported language to /en (what x-default advertises)", root.status >= 300 && root.status < 400 && /\/en\/?$/.test(loc), `status ${root.status} → ${loc || "(none)"}`);
  const es = await get("/", { headers: { "accept-language": "es-AR,es;q=0.9", "user-agent": "promptea-seo-check/1.0" } });
  record("/ redirects a Spanish-speaking visitor to /es", es.status >= 300 && es.status < 400 && /\/es\/?$/.test(es.headers.get("location") || ""), `status ${es.status} → ${es.headers.get("location") || "(none)"}`);
  const en = await get("/", { headers: { "accept-language": "en-US,en;q=0.9", "user-agent": "promptea-seo-check/1.0" } });
  record("/ redirects an English-speaking visitor to /en", en.status >= 300 && en.status < 400 && /\/en\/?$/.test(en.headers.get("location") || ""), `status ${en.status} → ${en.headers.get("location") || "(none)"}`);
  for (const accept of ["pt-BR,pt;q=0.9,en;q=0.8", "pt-PT,pt;q=0.9"]) {
    const pt = await get("/", { headers: { "accept-language": accept, "user-agent": "promptea-seo-check/1.0" } });
    record(`/ redirects a Portuguese-speaking visitor (${accept.split(",")[0]}) to /pt`, pt.status >= 300 && pt.status < 400 && /\/pt\/?$/.test(pt.headers.get("location") || ""), `status ${pt.status} → ${pt.headers.get("location") || "(none)"}`);
  }
  summaryOfGroup("language entry (proxy)");
}

// ---------------------------------------------------------------------------
// /pt views of content that has no Portuguese version (v1.8.2)
// ---------------------------------------------------------------------------

/**
 * AI Daily, the weekly digest and any guide not translated yet are shown under
 * /pt in English. Those pages must say so: canonical → the English original,
 * hreflang only for the languages the content exists in, a visible notice, and
 * no entry in the sitemap (checked above).
 */
async function checkPortugueseViews(origin, urls) {
  group("/pt views of content without a Portuguese version");
  const views = [["/pt/blog", "/en/blog"], ["/pt/blog/weekly", "/en/blog/weekly"]];
  const listed = new Set(urls.map((u) => pathOf(u.loc)));
  const enGuide = urls.map((u) => pathOf(u.loc)).find((p) => p.startsWith("/en/guides/") && !listed.has(p.replace("/en/", "/pt/")));
  if (enGuide) views.push([enGuide.replace("/en/", "/pt/"), enGuide]);
  else console.log("    (every guide is translated to Portuguese: no guide view to check)");

  for (const [path, original] of views) {
    const r = await get(path);
    const problems = [];
    if (r.status !== 200) problems.push(`status ${r.status}`);
    else {
      const head = parseHead(r.body);
      if (head.canonicals[0] !== `${origin}${original}`) problems.push(`canonical ${head.canonicals[0]} ≠ ${origin}${original}`);
      const keys = Object.keys(head.hreflang).sort().join(",");
      if (keys !== HREFLANG_CONTENT) problems.push(`hreflang: ${keys}`);
      if (!/data-content-lang-notice/.test(r.body)) problems.push("no visible notice that the content is in English");
      if (!/<html[^>]*\blang="pt-BR"/i.test(r.body)) problems.push("<html lang> is not pt-BR");
      if (head.first("og:locale") !== "en_US") problems.push(`og:locale ${head.first("og:locale")} (the content is English)`);
    }
    record(`${path} is a view of ${original}`, problems.length === 0, problems.join("\n"));
  }
  const feed = await get("/pt/blog/feed.xml");
  record("/pt/blog/feed.xml redirects to the English feed", feed.status === 308 && /\/en\/blog\/feed\.xml$/.test(feed.headers.get("location") || ""), `status ${feed.status} → ${feed.headers.get("location") || "(none)"}`);
  summaryOfGroup("/pt views of content without a Portuguese version");
}

// ---------------------------------------------------------------------------

async function main() {
  console.log(`seo:check against ${BASE}${QUICK ? " (quick)" : ""}`);
  const probe = await get("/robots.txt");
  if (probe.status === 0) {
    console.error(`\nCannot reach ${BASE} (${probe.error}). Start the server first: npm run build && npm start`);
    process.exit(2);
  }
  await checkRobots();
  const { urls, origin } = await checkSitemap();
  await checkLlms(origin);
  if (urls.length > 0) await checkPages(urls, origin);
  await checkEntry();
  if (urls.length > 0) await checkPortugueseViews(origin, urls);

  const failed = results.filter((r) => !r.ok);
  const warned = results.filter((r) => r.warn);
  const passed = results.length - failed.length - warned.length;
  console.log(`\n${"=".repeat(60)}\nseo:check — ${passed} passed, ${failed.length} failed, ${warned.length} warning(s)  [${results.length} checks]`);
  if (failed.length) {
    console.log("\nFailures:");
    for (const f of failed) console.log(`  - [${f.group}] ${f.name}${f.detail ? `: ${String(f.detail).split("\n")[0]}` : ""}`);
  }
  console.log(failed.length ? "\nRESULT: FAIL" : "\nRESULT: PASS");
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
