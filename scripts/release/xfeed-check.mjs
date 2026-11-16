#!/usr/bin/env node
// scripts/release/xfeed-check.mjs — audit of the X feed card with a real Chrome.
//
// v1.8.7: the card is Promptea's own, server-rendered feed (components/home/XFeed.tsx,
// lib/social). v1.8.3–v1.8.6 audited the Elfsight widget; that widget is gone.
//
//   node scripts/release/xfeed-check.mjs --base=http://localhost:3181 [--langs=es,en,pt] [--json=out.json]
//
// Per page (home and AI Daily) × language × width × theme, with and without JavaScript:
//   - the card is in the server HTML (works without JavaScript, crawlable);
//   - the page makes NO request to X, twimg, Elfsight or Buffer (no third-party script,
//     image or frame), and the card contains no <img>, <iframe> or <script>;
//   - with posts: at most 10, newest first, each with a <time> and a link to its post on
//     x.com/<handle>/status/<id>; every link in the card is https, opens in a new tab and
//     carries rel="noopener noreferrer nofollow" (the profile buttons: noopener noreferrer);
//   - the posts box has a fixed height (420 px) that does not change after load, and is a
//     focusable, named scroll region;
//   - without posts (no source / source down): the card shows one sentence and the primary
//     "Follow us on X" button, never an error;
//   - order of the side column: the newsletter card comes before the X card (home desktop
//     and AI Daily); on phones the newsletter (after the stories) also comes first;
//   - no horizontal overflow at 375 px.
// READ-ONLY against anything that is not localhost (every non-GET request is aborted).
// Exit code 1 when a check fails.

import { writeFile } from "node:fs/promises";
import puppeteer from "puppeteer-core";

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split(/=(.*)/s).slice(0, 2)));
const BASE = (args.base ?? "http://localhost:3181").replace(/\/+$/, "");
const LANGS_ = (args.langs ?? "es,en,pt").split(",");
const CHROME = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const LOCAL = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(BASE);
const THIRD = /elfsight|twimg\.com|(^|\.)x\.com|twitter\.com|buffer\.com|publish\.x\.com/;
const FEED_HEIGHT = 420;

const results = [];
const rows = [];
const ok = (name, pass, detail = "") => {
  results.push({ name, pass, detail });
  if (!pass || args.verbose !== undefined) console.log(`${pass ? "ok  " : "FAIL"} ${name}${detail ? " — " + detail : ""}`);
};

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox"] });

async function run({ path, width, js = true, theme = "aqua", scheme = "light" }) {
  const name = `${path} ${width}px ${theme}/${scheme}${js ? "" : " no-JS"}`;
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setViewport({ width, height: width < 600 ? 812 : 900, deviceScaleFactor: 1, isMobile: width < 600, hasTouch: width < 600 });
  await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: scheme }]);
  await page.setJavaScriptEnabled(js);
  await page.evaluateOnNewDocument((t) => {
    try {
      localStorage.setItem("theme", t);
      // Keep the floating newsletter card out of the way of this check.
      localStorage.setItem("promptea:newsletter-nudges", JSON.stringify({ subscribed: true }));
    } catch {}
  }, theme);
  const third = [];
  await page.setRequestInterception(true);
  page.on("request", (r) => {
    const host = (() => {
      try {
        return new URL(r.url()).hostname;
      } catch {
        return "";
      }
    })();
    if (THIRD.test(host)) third.push(r.url().slice(0, 120));
    if (!LOCAL && r.method() !== "GET" && r.method() !== "HEAD") return r.abort();
    return r.continue();
  });
  const res = await page.goto(BASE + path, { waitUntil: "load", timeout: 60_000 });
  await new Promise((r) => setTimeout(r, js ? 2500 : 300));
  const before = await page.evaluate(() => document.querySelector(".x-feed-box")?.getBoundingClientRect().height ?? null);
  await new Promise((r) => setTimeout(r, js ? 1500 : 0));
  const info = await page.evaluate(() => {
    const card = document.querySelector("[data-x-feed]");
    if (!card) return { card: false };
    const box = card.querySelector(".x-feed-box");
    const posts = [...card.querySelectorAll(".x-post")];
    const times = posts.map((p) => p.querySelector("time")?.getAttribute("datetime"));
    const links = [...card.querySelectorAll("a[href]")].map((a) => ({ href: a.getAttribute("href"), rel: a.getAttribute("rel") ?? "", target: a.getAttribute("target"), post: Boolean(a.closest(".x-post")) }));
    const order = (() => {
      const nl = [...document.querySelectorAll("[data-newsletter-inline], .newsletter-side, aside form")].filter((el) => el.getBoundingClientRect().width > 0);
      const first = nl[0];
      if (!first) return "no-newsletter";
      return first.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING ? "newsletter-first" : "x-first";
    })();
    return {
      card: true,
      state: card.getAttribute("data-x-feed"),
      posts: posts.length,
      sorted: times.every((t, i) => i === 0 || Date.parse(times[i - 1]) >= Date.parse(t)),
      timesOk: times.every(Boolean),
      postLinks: posts.map((p) => p.querySelector("a.x-post-open")?.getAttribute("href") ?? null),
      links,
      foreign: card.querySelectorAll("img, iframe, script, video, object, embed").length,
      boxHeight: box ? Math.round(box.getBoundingClientRect().height) : null,
      boxRegion: box ? { role: box.getAttribute("role"), tab: box.getAttribute("tabindex"), label: box.getAttribute("aria-label") } : null,
      emptyCta: !box ? Boolean(card.querySelector("a.btn-primary[href*='x.com']")) : null,
      order,
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
      text: card.innerText.slice(0, 200),
    };
  });
  rows.push({ name, status: res?.status(), third, before, ...info });

  ok(`${name}: page 200`, res?.status() === 200, String(res?.status()));
  ok(`${name}: card in the HTML`, info.card === true);
  if (info.card) {
    ok(`${name}: no request to X / Elfsight / Buffer`, third.length === 0, third.slice(0, 3).join(" "));
    ok(`${name}: no image, frame or script in the card`, info.foreign === 0, String(info.foreign));
    ok(`${name}: every link https, new tab, safe rel`, info.links.every((l) => /^https:\/\//.test(l.href) && l.target === "_blank" && /noopener/.test(l.rel) && /noreferrer/.test(l.rel) && (!l.post || /nofollow/.test(l.rel))), JSON.stringify(info.links.find((l) => !(/^https:\/\//.test(l.href) && l.target === "_blank" && /noopener/.test(l.rel)))));
    if (info.posts > 0) {
      ok(`${name}: at most 10 posts, newest first, dated`, info.posts <= 10 && info.sorted && info.timesOk, `${info.posts} posts`);
      ok(`${name}: each post links to x.com/<handle>/status/<id>`, info.postLinks.every((h) => /^https:\/\/x\.com\/[A-Za-z0-9_]{1,15}\/status\/\d+$/.test(h ?? "")), info.postLinks.find((h) => !/^https:\/\/x\.com\/[A-Za-z0-9_]{1,15}\/status\/\d+$/.test(h ?? "")) ?? "");
      ok(`${name}: fixed-height box (${FEED_HEIGHT} px), unchanged after load`, info.boxHeight === FEED_HEIGHT && (before === null || Math.round(before) === FEED_HEIGHT), `${before} → ${info.boxHeight}`);
      ok(`${name}: the box is a named, focusable region`, info.boxRegion?.role === "region" && info.boxRegion?.tab === "0" && Boolean(info.boxRegion?.label));
    } else {
      ok(`${name}: empty state shows the "Follow us on X" button`, info.emptyCta === true, info.text.replace(/\s+/g, " ").slice(0, 120));
    }
    ok(`${name}: newsletter before X`, info.order === "newsletter-first", info.order);
    if (width < 600) ok(`${name}: no horizontal overflow`, !info.overflow);
  }
  await context.close();
}

const PAGES = (lang) => [`/${lang}`, `/${lang}/blog`];
for (const lang of LANGS_) {
  for (const path of PAGES(lang)) {
    for (const width of [1440, 375]) {
      // AI Daily shows the side column (and so the X card) from lg up only.
      if (path.endsWith("/blog") && width < 1024) continue;
      await run({ path, width });
    }
  }
}
// Themes and schemes on one page; no-JavaScript on both pages.
for (const [theme, scheme] of [["metro", "dark"], ["glass", "light"], ["glass", "dark"], ["aqua", "dark"]]) await run({ path: `/${LANGS_[0]}`, width: 1440, theme, scheme });
await run({ path: `/${LANGS_[0]}`, width: 1440, js: false });
await run({ path: `/${LANGS_[0]}/blog`, width: 1440, js: false });

await browser.close();
const failed = results.filter((r) => !r.pass);
console.log(`\nxfeed-check: ${results.length - failed.length}/${results.length} passed`);
for (const r of rows) console.log(`  ${r.name.padEnd(40)} ${r.card ? `${r.state} · ${r.posts} posts · box ${r.boxHeight ?? "—"} · ${r.order}` : "NO CARD"}`);
if (args.json) await writeFile(args.json, JSON.stringify({ base: BASE, at: new Date().toISOString(), results, rows }, null, 2));
process.exit(failed.length ? 1 : 0);
