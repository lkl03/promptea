#!/usr/bin/env node
// scripts/release/overflow.mjs — v1.8.1. Which elements stick out of the viewport?
//   node scripts/release/overflow.mjs --url=http://localhost:3181/en/benchmarks [--w=375] [--theme=glass]
// Prints the page's horizontal overflow and the deepest elements whose right edge
// passes the viewport (ignoring anything inside a horizontally scrollable parent).
import puppeteer from "puppeteer-core";
const a = Object.fromEntries(process.argv.slice(2).map((x) => x.replace(/^--/, "").split(/=(.*)/s).slice(0, 2)));
const CHROME = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const w = Number(a.w ?? 375);
const b = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox"] });
const p = await b.newPage();
await p.setViewport({ width: w, height: 812, deviceScaleFactor: 1, isMobile: w < 600, hasTouch: w < 600 });
await p.evaluateOnNewDocument((t) => { try { localStorage.setItem("theme", t); } catch {} }, a.theme ?? "glass");
await p.goto(a.url, { waitUntil: "networkidle2", timeout: 60000 });
await new Promise((r) => setTimeout(r, 600));
const out = await p.evaluate(() => {
  const vw = document.documentElement.clientWidth;
  const scrollable = (el) => {
    for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
      const o = getComputedStyle(n).overflowX;
      if (o === "auto" || o === "scroll" || o === "hidden" || o === "clip") return true;
    }
    return false;
  };
  const bad = [];
  for (const el of document.querySelectorAll("body *")) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.right <= vw + 1) continue;
    if (getComputedStyle(el).position === "fixed") continue;
    if (scrollable(el)) continue;
    if ([...el.children].some((c) => c.getBoundingClientRect().right > vw + 1 && getComputedStyle(c).position !== "fixed")) continue;
    bad.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 70)} right=${Math.round(r.right)} w=${Math.round(r.width)} "${(el.textContent ?? "").trim().slice(0, 40)}"`);
  }
  return { overflow: document.documentElement.scrollWidth - vw, vw, bad: bad.slice(0, 15) };
});
console.log(JSON.stringify(out, null, 2));
await b.close();
