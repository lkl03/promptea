#!/usr/bin/env node
// scripts/release/ambient-check.mjs
//
// v1.8.1 — is the ambient background visibly moving, and is it cheap?
// With a real Chrome, per theme/scheme it measures over a few seconds:
//   - how far each blob travels (px and % of the viewport) and how much its
//     scale/opacity change — "perceptible" means the fastest blob moves at
//     least MIN_MOVE_PCT of the viewport width in the window;
//   - frames per second (requestAnimationFrame), long tasks, layout and
//     style-recalculation counts, main-thread task time (CDP Performance
//     metrics) and layout shift — the animation must cost no layout work;
//   - that Metro shows no blobs and that prefers-reduced-motion freezes them.
// It also saves two screenshots taken --gap ms apart (default 4000).
//
//   node scripts/release/ambient-check.mjs --base=http://localhost:3182 [--out=dir] [--gap=4000]

import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import puppeteer from "puppeteer-core";

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split(/=(.*)/s).slice(0, 2)));
const BASE = (args.base ?? "http://localhost:3182").replace(/\/+$/, "");
const GAP = Number(args.gap ?? 4000);
const OUT = args.out ?? null;
const CHROME = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const MIN_MOVE_PCT = 1.5; // % of the viewport width in GAP ms, fastest blob
const W = 1440;
const H = 900;

const CASES = [
  { theme: "aqua", scheme: "light", expectMotion: true },
  { theme: "glass", scheme: "light", expectMotion: true },
  { theme: "glass", scheme: "dark", expectMotion: true },
  { theme: "metro", scheme: "dark", expectMotion: false },
  { theme: "glass", scheme: "dark", reduce: true, expectMotion: false },
];

const read = () =>
  [...document.querySelectorAll(".ambient-blob")]
    .filter((b) => getComputedStyle(b).display !== "none")
    .map((b) => {
      const r = b.getBoundingClientRect();
      const cs = getComputedStyle(b);
      return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, w: r.width, opacity: Number(cs.opacity) };
    });

if (OUT) await mkdir(OUT, { recursive: true });
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox"] });
const findings = [];

for (const c of CASES) {
  const label = `${c.theme}/${c.scheme}${c.reduce ? " (reduced motion)" : ""}`;
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  await page.emulateMediaFeatures([
    { name: "prefers-color-scheme", value: c.scheme },
    { name: "prefers-reduced-motion", value: c.reduce ? "reduce" : "no-preference" },
  ]);
  await page.evaluateOnNewDocument((t) => {
    try {
      localStorage.setItem("theme", t);
      // Keep the newsletter card out of the measurement window.
      localStorage.setItem("promptea:newsletter-nudges", JSON.stringify({ subscribed: true }));
    } catch {}
    window.__cls = 0;
    window.__long = 0;
    try {
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value;
      }).observe({ type: "layout-shift", buffered: true });
      new PerformanceObserver((l) => {
        window.__long += l.getEntries().length;
      }).observe({ type: "longtask" });
    } catch {}
  }, c.theme);
  // v1.8.3: this check measures the ambient background, so the third-party X feed
  // widget is kept out of it. Since v1.8.3 the widget loads after the load event,
  // i.e. inside this measuring window, and rendering its posts costs ~100 layouts
  // that have nothing to do with the animation (scripts/release/xfeed-check.mjs
  // measures the widget on its own).
  const LOCAL = /^https?:\/\/(localhost|127\.0\.0\.1)/.test(BASE);
  await page.setRequestInterception(true);
  page.on("request", (r) => {
    if (/elfsight|twimg\.com/.test(r.url())) return r.abort();
    // Read-only against anything that is not local: no telemetry or other writes leave the browser.
    return LOCAL || r.method() === "GET" ? r.continue() : r.abort();
  });
  await page.goto(`${BASE}/en`, { waitUntil: "networkidle2", timeout: 60_000 });
  await new Promise((r) => setTimeout(r, 1500)); // let hydration settle
  const cdp = await page.createCDPSession();
  await cdp.send("Performance.enable");
  const metrics = async () => Object.fromEntries((await cdp.send("Performance.getMetrics")).metrics.map((m) => [m.name, m.value]));

  const before = await page.evaluate(read);
  const m0 = await metrics();
  await page.evaluate(() => {
    window.__frames = 0;
    window.__cls = 0;
    window.__long = 0;
    const tick = () => {
      window.__frames++;
      window.__raf = requestAnimationFrame(tick);
    };
    window.__raf = requestAnimationFrame(tick);
  });
  if (OUT) await page.screenshot({ path: join(OUT, `ambient__${c.theme}-${c.scheme}${c.reduce ? "-reduced" : ""}__t0.jpg`), type: "jpeg", quality: 70 });
  await new Promise((r) => setTimeout(r, GAP));
  if (OUT) await page.screenshot({ path: join(OUT, `ambient__${c.theme}-${c.scheme}${c.reduce ? "-reduced" : ""}__t1.jpg`), type: "jpeg", quality: 70 });
  const after = await page.evaluate(read);
  const m1 = await metrics();
  const runtime = await page.evaluate(() => {
    cancelAnimationFrame(window.__raf);
    return { frames: window.__frames, cls: window.__cls, long: window.__long };
  });

  const moves = before.map((b, i) => {
    const a = after[i];
    return { px: Math.hypot(a.cx - b.cx, a.cy - b.cy), scale: a.w / b.w, dOpacity: Math.abs(a.opacity - b.opacity) };
  });
  const maxPx = moves.length ? Math.max(...moves.map((m) => m.px)) : 0;
  const maxPct = (maxPx / W) * 100;
  const fps = runtime.frames / (GAP / 1000);
  const layouts = m1.LayoutCount - m0.LayoutCount;
  const recalcs = m1.RecalcStyleCount - m0.RecalcStyleCount;
  const taskMs = Math.round((m1.TaskDuration - m0.TaskDuration) * 1000);

  console.log(
    `${label}: blobs=${before.length} max move=${maxPx.toFixed(0)}px (${maxPct.toFixed(1)}% vw) in ${GAP} ms` +
      ` | per blob px=[${moves.map((m) => m.px.toFixed(0)).join(", ")}] scale=[${moves.map((m) => m.scale.toFixed(2)).join(", ")}]` +
      ` | fps=${fps.toFixed(0)} longtasks=${runtime.long} layouts=${layouts} recalcs=${recalcs} main-thread=${taskMs} ms cls=${runtime.cls.toFixed(4)}`
  );

  if (c.expectMotion && maxPct < MIN_MOVE_PCT) findings.push(`${label}: background barely moves (${maxPct.toFixed(2)}% of the viewport in ${GAP} ms)`);
  if (!c.expectMotion && maxPx > 0.5) findings.push(`${label}: background should be static but moved ${maxPx.toFixed(1)}px`);
  if (c.theme === "metro" && before.length > 0) findings.push(`${label}: Metro must stay flat but shows ${before.length} blob(s)`);
  if (runtime.cls > 0.001) findings.push(`${label}: layout shift ${runtime.cls.toFixed(4)} while idle`);
  if (layouts > 2) findings.push(`${label}: ${layouts} layouts while idle (the animation must not trigger layout)`);
  if (runtime.long > 0) findings.push(`${label}: ${runtime.long} long task(s) while idle`);
  // Headless Chrome is throttled to the display rate; anything well under it means dropped frames.
  if (fps < 45) findings.push(`${label}: ${fps.toFixed(0)} fps while idle`);
  await page.close();
}
await browser.close();
if (findings.length) {
  console.log(`\n${findings.length} finding(s):`);
  for (const f of findings) console.log(" - " + f);
  process.exit(1);
}
console.log("\nno findings");
