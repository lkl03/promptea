#!/usr/bin/env node
// scripts/release/shot.mjs — one full-page screenshot with a real Chrome, for quick reviews.
//   node scripts/release/shot.mjs --url=http://localhost:3010/es/benchmarks --out=shot.png [--theme=glass] [--scheme=light] [--w=375] [--h=812] [--scroll=#value] [--clip=1600] [--click=selector]
import puppeteer from "puppeteer-core";
const a = Object.fromEntries(process.argv.slice(2).map((x) => { const i = x.indexOf("="); return [x.slice(2, i), x.slice(i + 1)]; }));
const CHROME = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const w = Number(a.w ?? 1280), h = Number(a.h ?? 800);
const b = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox"] });
const p = await b.newPage();
await p.setViewport({ width: w, height: h, deviceScaleFactor: 1, isMobile: w < 600, hasTouch: w < 600 });
await p.emulateMediaFeatures([{ name: "prefers-color-scheme", value: a.scheme ?? "light" }, ...(a.reduce ? [{ name: "prefers-reduced-motion", value: "reduce" }] : [])]);
await p.evaluateOnNewDocument((t) => { try { localStorage.setItem("theme", t); } catch {} }, a.theme ?? "aqua");
await p.goto(a.url, { waitUntil: "networkidle2", timeout: 45000 });
await new Promise((r) => setTimeout(r, Number(a.wait ?? 900)));
if (a.click) { await p.click(a.click); await new Promise((r) => setTimeout(r, 500)); }
if (a.scroll) { await p.evaluate((s) => document.querySelector(s)?.scrollIntoView(), a.scroll); await new Promise((r) => setTimeout(r, 400)); }
await p.screenshot({ path: a.out, fullPage: a.full === "1", ...(a.clip ? { clip: { x: 0, y: await p.evaluate(() => window.scrollY), width: w, height: Number(a.clip) } } : {}) });
await b.close();
