#!/usr/bin/env node
// scripts/release/capture.mjs
//
// v1.8.1 — batch screenshots with a real Chrome, for before/after evidence.
//
//   node scripts/release/capture.mjs --base=https://www.promptea.me --out=docs/release/v1.8.1/before --set=before
//   node scripts/release/capture.mjs --base=http://localhost:3181 --out=docs/release/v1.8.1/after --set=after
//
// READ-ONLY against anything that is not localhost: every non-GET request
// (telemetry, subscribe, feedback, analyze…) is aborted before it leaves the
// browser, so capturing production never writes to it.
//
// Each shot: { name, path, w, h?, theme?, scheme?, full?, scroll?, click?, wait?, storage?, fill?, hover? }.
// v1.8.5: --set=primary captures the primary button (Aqua contrast fix) in the
// three languages and the key widths, plus Metro and Glass to show they did not change;
// `fill` types into a field (the analyzer's button is disabled while empty) and
// `hover` leaves the pointer over a selector.

import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import puppeteer from "puppeteer-core";

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split(/=(.*)/s).slice(0, 2)));
const BASE = (args.base ?? "http://localhost:3181").replace(/\/+$/, "");
const OUT = args.out ?? "docs/release/v1.8.1/after";
const SET = args.set ?? "after";
const ONLY = args.only ? args.only.split(",") : null;
const CHROME = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const LOCAL = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(BASE);

/** The v1.8.0 state in production: the defects the release fixes. */
const BEFORE = [
  { name: "home__en__1440__glass-dark", path: "/en", w: 1440, theme: "glass", scheme: "dark", full: true },
  { name: "home__es__375__aqua", path: "/es", w: 375, theme: "aqua", full: true },
  { name: "home-latest__en__1440__glass-dark", path: "/en", w: 1440, theme: "glass", scheme: "dark", scroll: "#latest-title" },
  { name: "benchmarks-ranking__en__1440__glass-dark", path: "/en/benchmarks", w: 1440, theme: "glass", scheme: "dark", scroll: "#ranking" },
  { name: "benchmarks-ranking__en__1920__glass-dark", path: "/en/benchmarks", w: 1920, h: 1000, theme: "glass", scheme: "dark", scroll: "#ranking" },
  { name: "benchmarks-ranking__es__375__aqua", path: "/es/benchmarks", w: 375, theme: "aqua", scroll: "#ranking" },
  { name: "analyzer-header__es__375__aqua", path: "/es/analyzer", w: 375, theme: "aqua" },
  { name: "footer-version__en__1440__metro", path: "/en/about", w: 1440, theme: "metro", scroll: "footer" },
  { name: "newsletter-pill__en__1440__aqua", path: "/en/analyzer", w: 1440, theme: "aqua", wait: 6500 },
];

/** The same views after the release, plus the new surfaces. */
const AFTER = [
  { name: "home__en__1440__glass-dark", path: "/en", w: 1440, theme: "glass", scheme: "dark", full: true },
  { name: "home__en__1920__glass-light", path: "/en", w: 1920, h: 1000, theme: "glass", scheme: "light", full: true },
  { name: "home__es__1440__aqua", path: "/es", w: 1440, theme: "aqua", full: true },
  { name: "home__es__1440__metro", path: "/es", w: 1440, theme: "metro", full: true },
  { name: "home__es__768__glass-dark", path: "/es", w: 768, h: 1024, theme: "glass", scheme: "dark", full: true },
  { name: "home__es__375__aqua", path: "/es", w: 375, theme: "aqua", full: true },
  { name: "home__en__375__metro", path: "/en", w: 375, theme: "metro", full: true },
  { name: "home-menu__es__375__aqua", path: "/es", w: 375, theme: "aqua", click: "[data-nav-toggle]" },
  { name: "home-latest__en__1440__glass-dark", path: "/en", w: 1440, theme: "glass", scheme: "dark", scroll: "#latest-title" },
  { name: "newsletter-card__en__1440__aqua", path: "/en", w: 1440, theme: "aqua", wait: 6500 },
  { name: "newsletter-card__es__375__glass-dark", path: "/es/prompts", w: 375, theme: "glass", scheme: "dark", wait: 6500 },
  { name: "how-it-works__en__1440__glass-dark", path: "/en/how-it-works", w: 1440, theme: "glass", scheme: "dark", full: true },
  { name: "how-it-works__es__375__aqua", path: "/es/how-it-works", w: 375, theme: "aqua", full: true },
  { name: "benchmarks-ranking__en__1440__glass-dark", path: "/en/benchmarks", w: 1440, theme: "glass", scheme: "dark", scroll: "#ranking" },
  { name: "benchmarks-ranking__en__1920__glass-dark", path: "/en/benchmarks", w: 1920, h: 1000, theme: "glass", scheme: "dark", scroll: "#ranking" },
  { name: "benchmarks-ranking__es__768__metro", path: "/es/benchmarks", w: 768, h: 1024, theme: "metro", scroll: "#ranking" },
  { name: "benchmarks-ranking__es__375__aqua", path: "/es/benchmarks", w: 375, theme: "aqua", scroll: "#ranking" },
  { name: "analyzer__es__1440__aqua", path: "/es/analyzer", w: 1440, theme: "aqua" },
  { name: "analyzer-header__es__375__aqua", path: "/es/analyzer", w: 375, theme: "aqua" },
  { name: "blog__en__1440__glass-light", path: "/en/blog", w: 1440, theme: "glass", scheme: "light" },
  { name: "guides__es__1440__metro", path: "/es/guides", w: 1440, theme: "metro" },
  { name: "footer-version__en__1440__metro", path: "/en/about", w: 1440, theme: "metro", scroll: "footer" },
];

/** v1.8.5 — the primary button, before and after the Aqua contrast fix. */
const SAMPLE = "Write a launch email for our new feature";
const PRIMARY = [
  { name: "primary-home__es__1440__aqua", path: "/es", w: 1440, theme: "aqua" },
  { name: "primary-home__en__1440__aqua", path: "/en", w: 1440, theme: "aqua" },
  { name: "primary-home__pt__1440__aqua", path: "/pt", w: 1440, theme: "aqua" },
  { name: "primary-home__es__768__aqua", path: "/es", w: 768, h: 1024, theme: "aqua" },
  { name: "primary-home__pt__375__aqua", path: "/pt", w: 375, theme: "aqua" },
  { name: "primary-analyzer__en__1440__aqua", path: "/en/analyzer", w: 1440, theme: "aqua", fill: "textarea", scroll: "textarea" },
  { name: "primary-home-hover__en__1440__aqua", path: "/en", w: 1440, theme: "aqua", hover: "form button.btn-primary" },
  { name: "primary-analyzer__es__375__aqua", path: "/es/analyzer", w: 375, theme: "aqua", fill: "textarea", scroll: "textarea" },
  { name: "primary-analyzer-empty__pt__1440__aqua", path: "/pt/analyzer", w: 1440, theme: "aqua", scroll: "textarea" },
  { name: "primary-home__en__1440__metro", path: "/en", w: 1440, theme: "metro" },
  { name: "primary-home__en__1440__glass-light", path: "/en", w: 1440, theme: "glass", scheme: "light" },
  { name: "primary-home__en__1440__glass-dark", path: "/en", w: 1440, theme: "glass", scheme: "dark" },
];

const shots = (SET === "before" ? BEFORE : SET === "primary" ? PRIMARY : AFTER).filter((s) => !ONLY || ONLY.some((o) => s.name.includes(o)));
await mkdir(OUT, { recursive: true });
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox"] });
let blocked = 0;

for (const s of shots) {
  // A fresh context per shot: every capture is a first visit (no shared localStorage).
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  const h = s.h ?? (s.w < 600 ? 812 : 900);
  await page.setViewport({ width: s.w, height: h, deviceScaleFactor: 1, isMobile: s.w < 600, hasTouch: s.w < 600 });
  await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: s.scheme ?? "light" }]);
  await page.evaluateOnNewDocument((t) => {
    try {
      localStorage.setItem("theme", t);
    } catch {}
  }, s.theme ?? "aqua");
  if (!LOCAL) {
    await page.setRequestInterception(true);
    page.on("request", (r) => {
      if (r.method() !== "GET") {
        blocked++;
        r.abort();
      } else r.continue();
    });
  }
  try {
    await page.goto(BASE + s.path, { waitUntil: "networkidle2", timeout: 60_000 });
    await new Promise((r) => setTimeout(r, s.wait ?? 900));
    if (s.click) {
      await page.click(s.click);
      await new Promise((r) => setTimeout(r, 450));
    }
    if (s.fill) {
      await page.type(s.fill, SAMPLE);
      await new Promise((r) => setTimeout(r, 300));
    }
    if (s.hover) {
      await page.hover(s.hover);
      await new Promise((r) => setTimeout(r, 400));
    }
    if (s.scroll) {
      await page.evaluate((sel) => document.querySelector(sel)?.scrollIntoView({ block: "start" }), s.scroll);
      await new Promise((r) => setTimeout(r, 450));
    }
    if (s.full) {
      // Scroll through once so lazy content and in-view effects settle, then capture the whole page.
      await page.evaluate(async () => {
        for (let y = 0; y < document.documentElement.scrollHeight; y += 700) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 60));
        }
        window.scrollTo(0, 0);
      });
      await new Promise((r) => setTimeout(r, 300));
    }
    await page.screenshot({ path: join(OUT, `${s.name}.jpg`), type: "jpeg", quality: 72, fullPage: Boolean(s.full) });
    console.log(`ok  ${s.name}`);
  } catch (e) {
    console.log(`ERR ${s.name}: ${e.message}`);
  }
  await context.close();
}
await browser.close();
if (!LOCAL) console.log(`${blocked} non-GET request(s) blocked (read-only capture)`);
