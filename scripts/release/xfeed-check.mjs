#!/usr/bin/env node
// scripts/release/xfeed-check.mjs — v1.8.3. Audit of the X feed card (a
// third-party Elfsight widget, components/home/XFeed.tsx) with a real Chrome.
//
//   node scripts/release/xfeed-check.mjs --base=http://localhost:3181 [--lang=en] [--json=out.json]
//
// Per case it reports:
//   - when the first request to Elfsight leaves, relative to navigation start,
//     DOMContentLoaded and the load event (is it deferred, or in the first render?);
//   - how many requests and bytes the widget costs, by host;
//   - LCP and CLS of the page, and the long-task time attributable to the period
//     after the widget starts;
//   - the feed box height before and after (it must not change), and what the
//     card ends up showing: posts, the fallback link, or an empty box;
//   - with every Elfsight / X host blocked (ad blocker): the fallback must show;
//   - with JavaScript disabled: the card must still link to the profile, and the
//     page's crawlable HTML must not depend on the widget.
// READ-ONLY against anything that is not localhost (non-GET requests are aborted, except
// CORS preflights, which write nothing).
// Exit code 1 when a case fails.

import { writeFile } from "node:fs/promises";
import puppeteer from "puppeteer-core";

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split(/=(.*)/s).slice(0, 2)));
const BASE = (args.base ?? "http://localhost:3181").replace(/\/+$/, "");
const LANG = args.lang ?? "en";
const CHROME = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const LOCAL = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(BASE);
const THIRD = /elfsight|twimg\.com|(^|\.)x\.com|twitter\.com/;
const SETTLE_MS = Number(args.settle ?? 16000); // past the card's own 12 s timeout

const results = [];
const rows = [];
const ok = (name, pass, detail = "") => {
  results.push({ name, pass, detail });
  console.log(`${pass ? "ok  " : "FAIL"} ${name}${detail ? " — " + detail : ""}`);
};

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox"] });

async function run({ name, path, width, height, block = false, blockData = false, js = true, theme = "aqua", scheme = "light" }) {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setUserAgent((await browser.userAgent()).replace("HeadlessChrome", "Chrome"));
  await page.setViewport({ width, height, deviceScaleFactor: 1, isMobile: width < 600, hasTouch: width < 600 });
  await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: scheme }]);
  await page.setJavaScriptEnabled(js);
  await page.evaluateOnNewDocument((t) => {
    try {
      localStorage.setItem("theme", t);
      localStorage.setItem("promptea:newsletter:dismissedAt", String(Date.now()));
    } catch {}
    window.__m = { lcp: 0, cls: 0, long: [], dcl: 0, load: 0 };
    try {
      new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__m.lcp = e.startTime; }).observe({ type: "largest-contentful-paint", buffered: true });
      new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__m.cls += e.value; }).observe({ type: "layout-shift", buffered: true });
      new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__m.long.push([Math.round(e.startTime), Math.round(e.duration)]); }).observe({ type: "longtask", buffered: true });
    } catch {}
    addEventListener("DOMContentLoaded", () => (window.__m.dcl = performance.now()));
    addEventListener("load", () => (window.__m.load = performance.now()));
  }, theme);

  const third = [];
  let navStart = 0;
  await page.setRequestInterception(true);
  page.on("request", (r) => {
    let host = "";
    try {
      host = new URL(r.url()).hostname;
    } catch {}
    if (THIRD.test(host)) {
      third.push({ host, t: Date.now() - navStart, url: r.url().slice(0, 90) });
      if (block) return r.abort("blockedbyclient");
      // The widget's script loads but its data service fails: Elfsight then prints its own error.
      if (blockData && /widget-data\.service\.elfsight\.com/.test(host)) return r.abort("failed");
    }
    // v1.8.4: a CORS preflight (OPTIONS) writes nothing. Elfsight sends one before every
    // request to its data service; aborting it made the widget fail with its own error on
    // every run against production, which looked like an Elfsight outage.
    if (!LOCAL && r.method() !== "GET" && r.method() !== "OPTIONS") return r.abort();
    r.continue();
  });
  const bytes = {};
  const cdp = await page.createCDPSession();
  await cdp.send("Network.enable");
  const hostOf = new Map();
  cdp.on("Network.requestWillBeSent", (e) => {
    try {
      hostOf.set(e.requestId, new URL(e.request.url).hostname);
    } catch {}
  });
  cdp.on("Network.loadingFinished", (e) => {
    const h = hostOf.get(e.requestId);
    if (h && THIRD.test(h)) bytes[h] = (bytes[h] ?? 0) + e.encodedDataLength;
  });

  navStart = Date.now();
  const res = await page.goto(`${BASE}${path}`, { waitUntil: "load", timeout: 90_000 });
  const html = await res.text().catch(() => "");
  const box = () =>
    page.evaluate(() => {
      const b = document.querySelector(".x-feed-box");
      const host = document.querySelector('[class*="elfsight-app-"]');
      if (!b) return null;
      const r = b.getBoundingClientRect();
      const text = (host?.innerText ?? "").replace(/\s+/g, " ").trim();
      return {
        height: Math.round(r.height),
        inViewport: r.top < innerHeight && r.bottom > 0,
        hostChildren: host?.childElementCount ?? 0,
        hostHeight: Math.round(host?.getBoundingClientRect().height ?? 0),
        hostTextLength: text.length,
        hostTextSample: text.slice(0, 120),
        posts: host ? host.querySelectorAll('[class*="posts-item"], a[href*="/status/"]').length : 0,
        visible: host ? getComputedStyle(host.parentElement).visibility !== "hidden" && getComputedStyle(host.parentElement).opacity !== "0" : false,
        images: host ? host.querySelectorAll("img").length : 0,
        // Only what is actually displayed counts (the "Loading…" line is hidden by <noscript> without JS).
        status: [...b.querySelectorAll("[role=status]")].filter((e) => e.offsetParent !== null).map((e) => e.innerText.trim().slice(0, 80))[0] ?? null,
        fallbackLink: [...b.querySelectorAll("a[href*='x.com']")].some((e) => e.offsetParent !== null && !e.closest('[class*="elfsight-app-"]')),
        scrollHidden: b.querySelector(".x-feed-scroll")?.hasAttribute("hidden") ?? null,
      };
    });
  const before = await box();
  if (js) {
    // Bring the card on screen the way a reader would, then let the widget settle.
    await page.evaluate(() => document.querySelector(".x-feed-box")?.scrollIntoView({ block: "center" }));
    await new Promise((r) => setTimeout(r, SETTLE_MS));
  }
  const after = await box();
  const m = js ? await page.evaluate(() => window.__m) : { lcp: 0, cls: 0, long: [], dcl: 0, load: 0 };
  const first = third[0]?.t ?? null;
  const longAfter = first == null ? 0 : m.long.filter(([s]) => s >= first).reduce((n, [, d]) => n + d, 0);
  const profileLinks = (html.match(/href="https:\/\/x\.com\/[A-Za-z0-9_]+"/g) ?? []).length;
  const row = {
    case: name,
    firstThirdPartyMs: first,
    dclMs: Math.round(m.dcl),
    loadMs: Math.round(m.load),
    lcpMs: Math.round(m.lcp),
    cls: Number(m.cls.toFixed(4)),
    thirdPartyRequests: third.length,
    thirdPartyKB: Math.round(Object.values(bytes).reduce((a, b) => a + b, 0) / 1024),
    longTaskMsAfterWidget: longAfter,
    boxBefore: before?.height ?? null,
    boxAfter: after?.height ?? null,
    state: !after ? "no card" : after.fallbackLink ? "fallback" : after.status ? `status: ${after.status}` : after.posts > 0 ? "posts" : after.visible && after.hostTextLength > 0 ? `WIDGET TEXT WITHOUT POSTS: ${after.hostTextSample.slice(0, 60)}` : "EMPTY",
    hostText: after?.hostTextLength ?? 0,
    htmlHasWidgetScript: /elfsightcdn\.com\/platform\.js/.test(html),
    htmlProfileLinks: profileLinks,
  };
  rows.push({ ...row, bytesByHost: bytes, hosts: [...new Set(third.map((t) => t.host))], sample: after?.hostTextSample ?? "" });
  await context.close();
  return { row, before, after, third };
}

const home = `/${LANG}`;

// 1. Desktop: the card is in the side column, on screen from the first paint.
{
  const { row, before } = await run({ name: "desktop 1440 (card in view)", path: home, width: 1440, height: 900 });
  ok("desktop: the server HTML does not include the widget script", !row.htmlHasWidgetScript);
  ok("desktop: the server HTML links to the profile without the widget", row.htmlProfileLinks >= 1, `${row.htmlProfileLinks} link(s)`);
  ok("desktop: nothing is requested from Elfsight before the load event", row.firstThirdPartyMs == null || row.firstThirdPartyMs >= row.loadMs, `first third-party request at ${row.firstThirdPartyMs} ms; DOMContentLoaded ${row.dclMs} ms; load ${row.loadMs} ms; LCP ${row.lcpMs} ms`);
  ok("desktop: the feed box keeps its height", before && row.boxBefore === row.boxAfter, `${row.boxBefore} → ${row.boxAfter} px`);
  ok("desktop: no layout shift", row.cls <= 0.02, `CLS ${row.cls}`);
  ok("desktop: the card ends with posts or the fallback, never an empty box", row.state === "posts" || row.state === "fallback", row.state);
}
// 2. Phone: the card is far below the fold; nothing should load until it is near.
{
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setViewport({ width: 375, height: 812, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const seen = [];
  page.on("request", (r) => {
    if (THIRD.test(new URL(r.url()).hostname)) seen.push(r.url());
  });
  await page.goto(`${BASE}${home}`, { waitUntil: "networkidle2", timeout: 90_000 });
  await new Promise((r) => setTimeout(r, 3000));
  ok("phone: no request to Elfsight while the card is far below the fold", seen.length === 0, `${seen.length} request(s)`);
  await context.close();
  const { row } = await run({ name: "phone 375 (after scrolling to the card)", path: home, width: 375, height: 812 });
  ok("phone: the feed box keeps its height", row.boxBefore === row.boxAfter, `${row.boxBefore} → ${row.boxAfter} px`);
  ok("phone: the card ends with posts or the fallback", row.state === "posts" || row.state === "fallback", row.state);
}
// 3. Dark scheme (the widget's own colours are overridden per theme).
for (const [theme, scheme] of [["glass", "dark"], ["metro", "dark"]]) {
  const { row } = await run({ name: `desktop ${theme}-${scheme}`, path: home, width: 1440, height: 900, theme, scheme });
  ok(`${theme}-${scheme}: the card ends with posts or the fallback`, row.state === "posts" || row.state === "fallback", row.state);
}
// 4. Ad blocker: every Elfsight / X host refused.
{
  const { row, after } = await run({ name: "blocked (ad blocker)", path: home, width: 1440, height: 900, block: true });
  ok("blocked: the fallback with the profile link is shown", row.state === "fallback", row.state);
  ok("blocked: the empty feed region is hidden from assistive tech", after?.scrollHidden === true);
  ok("blocked: the box keeps its height", row.boxBefore === row.boxAfter, `${row.boxBefore} → ${row.boxAfter} px`);
}
// 4b. The script loads but Elfsight cannot read the posts (seen in production on
//     2026-11-11: "Failed to fetch user data / timeline data"). The card must
//     fall back; the widget's own English error must never be what is shown.
{
  const { row } = await run({ name: "Elfsight data service failing", path: home, width: 1440, height: 900, blockData: true });
  ok("data failure: the fallback is shown instead of the widget's own error", row.state === "fallback", row.state);
  ok("data failure: the box keeps its height", row.boxBefore === row.boxAfter, `${row.boxBefore} → ${row.boxAfter} px`);
}
// 5. No JavaScript.
{
  const { row, after } = await run({ name: "JavaScript disabled", path: home, width: 1440, height: 900, js: false });
  ok("no JS: the card is rendered with a link to the profile", Boolean(after) && row.htmlProfileLinks >= 1);
  ok("no JS: the box does not say \"Loading\" forever", !/^status: /.test(row.state) || row.state === "fallback", row.state);
  ok("no JS: no request to a third party", row.thirdPartyRequests === 0, `${row.thirdPartyRequests}`);
}

await browser.close();
console.table(rows.map((r) => Object.fromEntries(Object.entries(r).filter(([k]) => !["bytesByHost", "hosts", "sample"].includes(k)))));
for (const r of rows) console.log(`${r.case}: hosts ${r.hosts.join(", ") || "—"} · sample «${r.sample}»`);
const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`);
if (args.json) await writeFile(args.json, JSON.stringify({ base: BASE, at: new Date().toISOString(), results, rows }, null, 2));
process.exit(failed.length ? 1 : 0);
