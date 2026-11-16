#!/usr/bin/env node
// scripts/release/benchmarks-layout.mjs
//
// v1.8.1 — regression check for the "Ranking by benchmark" layout with a real
// Chrome. v1.8.0 shipped with the benchmark cards growing past their grid track
// and sliding under the chart panel. For every width × category this script
// asserts, from real layout boxes:
//   - no benchmark card overlaps the chart panel or another card,
//   - no card is wider than the list that holds it,
//   - the page has no horizontal overflow,
//   - the chart panel starts right after the picker (no tall empty gap).
// v1.8.7 — and the model analysis and the comparison, per width:
//   - the frontier quick view and its cards fit (no card wider than the page);
//   - a model name opens the analysis: a modal dialog inside the viewport, focus
//     inside it, no horizontal overflow of its content, Esc closes it and the
//     focus returns to the name;
//   - three "Compare" checkboxes show the comparison bar inside the viewport, and
//     the comparison dialog opens inside the viewport.
//
//   node scripts/release/benchmarks-layout.mjs --base=http://localhost:3181 [--lang=en] [--shots=dir]
//
// Exit code 1 on any finding.

import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import puppeteer from "puppeteer-core";

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")));
const BASE = (args.base ?? "http://localhost:3181").replace(/\/+$/, "");
const LANG = args.lang ?? "en";
const CHROME = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const WIDTHS = [1920, 1440, 1024, 768, 375];
const MAX_GAP = 40; // px between the picker and the chart panel

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox"] });
const findings = [];
let checks = 0;
if (args.shots) await mkdir(args.shots, { recursive: true });

for (const width of WIDTHS) {
  const page = await browser.newPage();
  await page.setViewport({ width, height: 900, deviceScaleFactor: 1, isMobile: width < 600, hasTouch: width < 600 });
  // v1.8.3: read-only against anything that is not localhost, so production data can be checked without writing telemetry.
  if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(BASE)) {
    await page.setRequestInterception(true);
    page.on("request", (r) => (r.method() === "GET" ? r.continue() : r.abort()));
  }
  await page.evaluateOnNewDocument(() => {
    try {
      localStorage.setItem("theme", "glass");
    } catch {}
  });
  await page.goto(`${BASE}/${LANG}/benchmarks`, { waitUntil: "networkidle2", timeout: 60_000 });
  const categories = await page.$$eval("#ranking > [role=group] button.pill", (els) => els.map((e) => e.textContent.trim()));
  if (categories.length === 0) {
    findings.push(`${width}px: no category pills found (is a snapshot available?)`);
    await page.close();
    continue;
  }
  for (let i = 0; i < categories.length; i++) {
    await page.evaluate((idx) => document.querySelectorAll("#ranking > [role=group] button.pill")[idx].click(), i);
    await new Promise((r) => setTimeout(r, 250));
    const m = await page.evaluate(() => {
      const list = document.querySelector("#ranking ul.bm-picker");
      const cards = [...list.querySelectorAll("button")].map((b) => b.getBoundingClientRect());
      const panel = list.nextElementSibling.getBoundingClientRect();
      const lr = list.getBoundingClientRect();
      // Phones with many benchmarks: the picker is one scrollable row (cards extend past it by design).
      const scrolls = getComputedStyle(list).overflowX === "auto";
      const hit = (a, b) => a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5;
      let overlapPanel = 0;
      let overlapCards = 0;
      let wider = 0;
      cards.forEach((c, i) => {
        if (hit(c, panel)) overlapPanel++;
        if (!scrolls && (c.right > lr.right + 0.5 || c.left < lr.left - 0.5)) wider++;
        for (let j = i + 1; j < cards.length; j++) if (hit(c, cards[j])) overlapCards++;
      });
      return {
        cards: cards.length,
        overlapPanel,
        overlapCards,
        wider,
        gap: Math.round(panel.top - lr.bottom),
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });
    checks++;
    const label = `${width}px · ${categories[i]} (${m.cards} benchmark${m.cards === 1 ? "" : "s"})`;
    if (m.overlapPanel) findings.push(`${label}: ${m.overlapPanel} card(s) overlap the chart panel`);
    if (m.overlapCards) findings.push(`${label}: ${m.overlapCards} card pair(s) overlap each other`);
    if (m.wider) findings.push(`${label}: ${m.wider} card(s) wider than the list`);
    if (m.gap < 0 || m.gap > MAX_GAP) findings.push(`${label}: gap between picker and chart is ${m.gap}px`);
    if (m.overflow > 1) findings.push(`${label}: horizontal overflow ${m.overflow}px`);
    console.log(`ok  ${label}  gap=${m.gap} overflow=${m.overflow}`);
    if (args.shots) {
      await page.evaluate(() => document.querySelector("#ranking").scrollIntoView());
      await page.screenshot({ path: join(args.shots, `benchmarks-ranking__${width}__${i + 1}.jpg`), type: "jpeg", quality: 80 });
    }
  }

  // ── v1.8.7: frontier quick view, model analysis, comparison ──────────────
  const inside = (r, vw, vh) => r.left >= -0.5 && r.top >= -0.5 && r.right <= vw + 0.5 && r.bottom <= vh + 0.5;
  const fq = await page.evaluate(() => {
    const cards = [...document.querySelectorAll("#frontier ol > li")].map((li) => li.getBoundingClientRect());
    const vw = document.documentElement.clientWidth;
    return { cards: cards.length, wider: cards.filter((c) => c.right > vw + 0.5 || c.left < -0.5).length };
  });
  checks++;
  if (!fq.cards) findings.push(`${width}px: frontier quick view has no cards`);
  if (fq.wider) findings.push(`${width}px: ${fq.wider} frontier card(s) wider than the page`);
  const opener = await page.$("#ranking .bm-model-link");
  if (!opener) findings.push(`${width}px: no model name opens an analysis`);
  else {
    await opener.focus();
    await page.keyboard.press("Enter");
    await new Promise((r) => setTimeout(r, 500));
    const d = await page.evaluate(() => {
      const dlg = document.querySelector('[role="dialog"][aria-modal="true"]');
      if (!dlg) return null;
      const r = dlg.getBoundingClientRect();
      const scroller = dlg.querySelector(".overflow-y-auto");
      return { box: { left: r.left, top: r.top, right: r.right, bottom: r.bottom }, focus: dlg.contains(document.activeElement), overflow: scroller ? scroller.scrollWidth - scroller.clientWidth : 0, vw: innerWidth, vh: innerHeight };
    });
    checks++;
    if (!d) findings.push(`${width}px: the model analysis did not open`);
    else {
      if (!inside(d.box, d.vw, d.vh)) findings.push(`${width}px: the model analysis is not inside the viewport ${JSON.stringify(d.box)}`);
      if (!d.focus) findings.push(`${width}px: focus is not inside the model analysis`);
      if (d.overflow > 1) findings.push(`${width}px: the model analysis overflows sideways by ${d.overflow}px`);
      if (args.shots) await page.screenshot({ path: join(args.shots, `benchmarks-model__${width}.jpg`), type: "jpeg", quality: 80 });
      await page.keyboard.press("Escape");
      await new Promise((r) => setTimeout(r, 300));
      const back = await page.evaluate(() => !document.querySelector('[role="dialog"][aria-modal="true"]') && document.activeElement?.classList.contains("bm-model-link"));
      if (!back) findings.push(`${width}px: Esc did not close the analysis or return the focus`);
      console.log(`ok  ${width}px · model analysis (inside viewport, focus in, Esc returns focus)`);
    }
  }
  await page.evaluate(() => [...document.querySelectorAll("#frontier table .bm-compare-check")].slice(0, 3).forEach((c) => c.click()));
  await new Promise((r) => setTimeout(r, 300));
  const bar = await page.evaluate(() => {
    const b = document.querySelector(".bm-compare-bar");
    if (!b) return null;
    b.scrollIntoView({ block: "nearest" });
    const r = b.getBoundingClientRect();
    return { right: r.right, left: r.left, vw: document.documentElement.clientWidth };
  });
  checks++;
  if (!bar) findings.push(`${width}px: the comparison bar did not appear`);
  else if (bar.right > bar.vw + 0.5 || bar.left < -0.5) findings.push(`${width}px: the comparison bar is wider than the page`);
  else {
    await page.click(".bm-compare-bar .btn-primary");
    await new Promise((r) => setTimeout(r, 500));
    const c = await page.evaluate(() => {
      const dlg = document.querySelector('[role="dialog"][aria-modal="true"]');
      if (!dlg) return null;
      const r = dlg.getBoundingClientRect();
      return { box: { left: r.left, top: r.top, right: r.right, bottom: r.bottom }, vw: innerWidth, vh: innerHeight, headers: dlg.querySelectorAll("thead th").length };
    });
    if (!c) findings.push(`${width}px: the comparison did not open`);
    else {
      if (!inside(c.box, c.vw, c.vh)) findings.push(`${width}px: the comparison is not inside the viewport`);
      if (c.headers !== 4) findings.push(`${width}px: the comparison has ${c.headers - 1} model columns, expected 3`);
      if (args.shots) await page.screenshot({ path: join(args.shots, `benchmarks-compare__${width}.jpg`), type: "jpeg", quality: 80 });
      console.log(`ok  ${width}px · comparison bar and dialog`);
    }
    await page.keyboard.press("Escape");
  }
  await page.close();
}
await browser.close();
console.log(`\n${checks} layout checks`);
if (findings.length) {
  console.log(`${findings.length} finding(s):`);
  for (const f of findings) console.log(" - " + f);
  process.exit(1);
}
console.log("no findings");
