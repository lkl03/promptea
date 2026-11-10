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
      const hit = (a, b) => a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5;
      let overlapPanel = 0;
      let overlapCards = 0;
      let wider = 0;
      cards.forEach((c, i) => {
        if (hit(c, panel)) overlapPanel++;
        if (c.right > lr.right + 0.5 || c.left < lr.left - 0.5) wider++;
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
