#!/usr/bin/env node
// scripts/release/perf.mjs
//
// v1.8.1 — load metrics with a real Chrome, to compare a build against a
// baseline (e.g. production). Per page and profile it reports:
//   LCP, CLS, long-task time during load (a lab stand-in for interaction
//   delay: INP itself needs real interactions), HTML document bytes
//   (uncompressed), JS / CSS / image / font bytes over the wire, request count,
//   DOM nodes and page height.
// Profiles: desktop (1440×900, no throttling) and mobile (375×812, 4× CPU).
// Network is NOT throttled, so timings between a local server and a remote one
// are not comparable — bytes, DOM size, CLS and long tasks are.
//
// READ-ONLY against non-local servers: every non-GET request is aborted.
//
//   node scripts/release/perf.mjs --base=http://localhost:3182 [--json=out.json] [--pages=/en,/en/analyzer]

import { writeFile } from "node:fs/promises";
import puppeteer from "puppeteer-core";

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split(/=(.*)/s).slice(0, 2)));
const BASE = (args.base ?? "http://localhost:3182").replace(/\/+$/, "");
const CHROME = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const LOCAL = /^https?:\/\/(localhost|127\.0\.0\.1)/.test(BASE);
const PAGES = (args.pages ?? "/en,/en/analyzer,/en/benchmarks,/en/blog,/en/guides/json-output,/en/how-it-works").split(",");
const PROFILES = [
  { name: "desktop", width: 1440, height: 900, cpu: 1, mobile: false },
  { name: "mobile", width: 375, height: 812, cpu: 4, mobile: true },
];

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox"] });
const rows = [];

for (const profile of PROFILES) {
  for (const path of PAGES) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    await page.setViewport({ width: profile.width, height: profile.height, deviceScaleFactor: 1, isMobile: profile.mobile, hasTouch: profile.mobile });
    const cdp = await page.createCDPSession();
    await cdp.send("Network.enable");
    if (profile.cpu > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: profile.cpu });
    const bytes = { script: 0, stylesheet: 0, image: 0, font: 0, document: 0, other: 0 };
    const types = new Map();
    let requests = 0;
    cdp.on("Network.responseReceived", (e) => types.set(e.requestId, e.type.toLowerCase()));
    cdp.on("Network.loadingFinished", (e) => {
      requests++;
      const t = types.get(e.requestId) ?? "other";
      bytes[t in bytes ? t : "other"] += e.encodedDataLength;
    });
    await page.setRequestInterception(true);
    page.on("request", (r) => (LOCAL || r.method() === "GET" ? r.continue() : r.abort()));
    await page.evaluateOnNewDocument(() => {
      try {
        localStorage.setItem("theme", "glass");
      } catch {}
      window.__m = { lcp: 0, cls: 0, long: 0 };
      try {
        new PerformanceObserver((l) => {
          for (const e of l.getEntries()) window.__m.lcp = e.startTime;
        }).observe({ type: "largest-contentful-paint", buffered: true });
        new PerformanceObserver((l) => {
          for (const e of l.getEntries()) if (!e.hadRecentInput) window.__m.cls += e.value;
        }).observe({ type: "layout-shift", buffered: true });
        new PerformanceObserver((l) => {
          for (const e of l.getEntries()) window.__m.long += Math.max(0, e.duration - 50);
        }).observe({ type: "longtask", buffered: true });
      } catch {}
    });
    try {
      const res = await page.goto(BASE + path, { waitUntil: "networkidle2", timeout: 90_000 });
      const html = (await res.text()).length;
      // Past the 5 s newsletter prompt, so any shift it caused would be counted.
      await new Promise((r) => setTimeout(r, 6500));
      const m = await page.evaluate(() => ({ ...window.__m, dom: document.querySelectorAll("*").length, height: document.documentElement.scrollHeight }));
      rows.push({
        profile: profile.name,
        path,
        lcpMs: Math.round(m.lcp),
        cls: Math.round(m.cls * 1000) / 1000,
        longTaskMs: Math.round(m.long),
        htmlKB: Math.round(html / 1024),
        jsKB: Math.round(bytes.script / 1024),
        cssKB: Math.round(bytes.stylesheet / 1024),
        imgKB: Math.round(bytes.image / 1024),
        fontKB: Math.round(bytes.font / 1024),
        requests,
        dom: m.dom,
        heightPx: m.height,
      });
    } catch (e) {
      rows.push({ profile: profile.name, path, error: e.message });
    }
    await context.close();
  }
}
await browser.close();
console.table(rows);
if (args.json) await writeFile(args.json, JSON.stringify({ base: BASE, at: new Date().toISOString(), rows }, null, 2));
