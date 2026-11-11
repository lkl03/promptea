#!/usr/bin/env node
// scripts/release/sweep.mjs — v1.8.3. Every URL of the sitemap that matches a
// filter, at several widths, with a real Chrome. Written for the 58 guides that
// v1.8.2 translated to Portuguese (174 pages nobody had looked at), and usable
// for any family of pages.
//
//   node scripts/release/sweep.mjs --base=http://localhost:3181 --match=/guides/ [--widths=1440,768,375] [--theme=aqua] [--scheme=light] [--json=out.json] [--extra=/pt/blog,/pt/library]
//
// Per load it checks: HTTP 200, the requested viewport really applied
// (innerWidth), no horizontal overflow (and which elements stick out), no text
// cut inside a box that hides its overflow (headings, buttons, badges, links,
// table cells, list items), exactly one <h1>, <html lang> matching the locale,
// no console or page error, and — under /pt — no sentinel string that only
// exists in the English or Spanish interface.
//
// READ-ONLY against anything that is not localhost (non-GET requests are aborted).
// Exit code 1 on any finding.

import { writeFile } from "node:fs/promises";
import puppeteer from "puppeteer-core";

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split(/=(.*)/s).slice(0, 2)));
const BASE = (args.base ?? "http://localhost:3181").replace(/\/+$/, "");
const MATCH = new RegExp(args.match ?? "/guides/");
const WIDTHS = (args.widths ?? "1440,768,375").split(",").map(Number);
const THEME = args.theme ?? "aqua";
const SCHEME = args.scheme ?? "light";
const EXTRA = args.extra ? args.extra.split(",") : [];
const CONCURRENCY = Number(args.concurrency ?? 4);
const CHROME = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const LOCAL = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(BASE);
const HTML_LANG = { es: "es", en: "en", pt: "pt-BR" };

const SENTINELS = [
  "Analyze", "Find the best AI", "Paste your prompt", "Target AI", "Subscribe", "Back to", "Open in Promptea", "Read more",
  "Prompting guides", "Glossary", "Library", "Weekly digest", "How this works", "Last updated", "Markdown version",
  "Frequently asked questions", "Send feedback", "Copy prompt", "Related guides",
  "Analizá", "Elegí", "Pegá", "Suscribirme", "Guías", "Glosario", "Volver", "Abrir en Promptea", "Privacidad",
  "Cómo funciona", "Preguntas frecuentes", "Última actualización", "Resumen semanal", "Copiar prompt", "Plantillas",
];

const sitemap = await (await fetch(`${BASE}/sitemap.xml`)).text();
const origin = /<loc>(https?:\/\/[^/<]+)/.exec(sitemap)?.[1] ?? BASE;
const paths = [...new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(origin, "")).filter((p) => MATCH.test(p)).concat(EXTRA))].sort();
if (paths.length === 0) {
  console.error(`No sitemap URL matches ${MATCH}`);
  process.exit(2);
}
console.log(`sweep: ${paths.length} page(s) × ${WIDTHS.join("/")} px, ${THEME}-${SCHEME}, against ${BASE}`);

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox"] });
const findings = [];
let loads = 0;

async function check(path, w) {
  const lang = path.split("/")[1];
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message.slice(0, 160)));
  page.on("console", (m) => {
    if (m.type() === "error" && !/favicon|_vercel|Failed to load resource/.test(m.text())) errors.push(m.text().slice(0, 160));
  });
  if (!LOCAL) {
    await page.setRequestInterception(true);
    page.on("request", (r) => (r.method() === "GET" ? r.continue() : r.abort()));
  }
  await page.setViewport({ width: w, height: w < 600 ? 812 : 900, deviceScaleFactor: 1, isMobile: w < 600, hasTouch: w < 600 });
  await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: SCHEME }]);
  await page.evaluateOnNewDocument((t) => {
    try {
      localStorage.setItem("theme", t);
      localStorage.setItem("promptea:newsletter:dismissedAt", String(Date.now()));
    } catch {}
  }, THEME);
  const where = `${path} @${w}`;
  try {
    const res = await page.goto(BASE + path, { waitUntil: "networkidle2", timeout: 120_000 });
    await new Promise((r) => setTimeout(r, 300));
    loads++;
    const r = await page.evaluate(
      ({ lang, sentinels }) => {
        const vw = document.documentElement.clientWidth;
        const out = { innerWidth: window.innerWidth, overflow: Math.max(0, document.documentElement.scrollWidth - vw), offenders: [], clipped: [], h1: document.querySelectorAll("h1").length, htmlLang: document.documentElement.lang, untranslated: [] };
        const inScrollable = (el) => {
          for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
            const o = getComputedStyle(n).overflowX;
            if (o === "auto" || o === "scroll" || o === "hidden" || o === "clip") return true;
          }
          return false;
        };
        if (out.overflow > 1) {
          for (const el of document.querySelectorAll("body *")) {
            const b = el.getBoundingClientRect();
            if (b.width === 0 || b.right <= vw + 1 || getComputedStyle(el).position === "fixed" || inScrollable(el)) continue;
            out.offenders.push(`${el.tagName.toLowerCase()}.${String(el.className).split(" ").slice(0, 3).join(".")} right=${Math.round(b.right)} "${(el.textContent ?? "").trim().slice(0, 30)}"`);
            if (out.offenders.length >= 3) break;
          }
        }
        for (const el of document.querySelectorAll("h1, h2, h3, button, .btn, .badge, nav a, th, td, li, summary, label, dt")) {
          const cs = getComputedStyle(el);
          if (el.offsetParent === null || cs.visibility === "hidden") continue;
          const hides = cs.overflowX === "hidden" || cs.overflowX === "clip" || cs.textOverflow === "ellipsis";
          if (hides && el.clientWidth > 1 && el.scrollWidth > el.clientWidth + 1 && el.textContent.trim().length > 0 && !el.closest(".line-clamp-1, .line-clamp-2, .line-clamp-3, .truncate, [data-truncate], pre")) {
            out.clipped.push(`${el.tagName.toLowerCase()} "${el.textContent.trim().slice(0, 40)}" ${el.scrollWidth}>${el.clientWidth}`);
          }
        }
        if (lang === "pt") {
          const skip = '[lang="en"], [lang="es"], [data-content-lang-notice], pre, code, [data-language-switcher], script, style, .blog-row-title, [data-x-feed]';
          const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
          for (let n = walker.nextNode(); n; n = walker.nextNode()) {
            const el = n.parentElement;
            if (!el || el.closest(skip) || el.offsetParent === null) continue;
            const text = n.textContent.trim();
            if (text.length < 3) continue;
            for (const s of sentinels) {
              const re = new RegExp(`(^|[^\\p{L}])${s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^\\p{L}]|$)`, "u");
              if (re.test(text)) out.untranslated.push(`"${s}" in «${text.slice(0, 60)}»`);
            }
          }
        }
        return out;
      },
      { lang, sentinels: SENTINELS },
    );
    const bad = [];
    if (res?.status() !== 200) bad.push(`status ${res?.status()}`);
    if (r.innerWidth !== w) bad.push(`viewport ${r.innerWidth}px`);
    if (r.overflow > 1) bad.push(`overflow ${r.overflow}px — ${r.offenders.join("; ")}`);
    if (r.h1 !== 1) bad.push(`${r.h1} <h1>`);
    if (HTML_LANG[lang] && r.htmlLang !== HTML_LANG[lang]) bad.push(`<html lang="${r.htmlLang}">`);
    for (const c of r.clipped.slice(0, 3)) bad.push(`clipped: ${c}`);
    for (const u of [...new Set(r.untranslated)].slice(0, 3)) bad.push(`not translated: ${u}`);
    for (const e of errors.slice(0, 2)) bad.push(`console: ${e}`);
    for (const b of bad) {
      findings.push({ where, what: b });
      console.log(`  ✗ ${where}: ${b}`);
    }
  } catch (e) {
    findings.push({ where, what: `error: ${e.message.slice(0, 140)}` });
    console.log(`  ✗ ${where}: error: ${e.message.slice(0, 140)}`);
  }
  await context.close();
}

const jobs = paths.flatMap((p) => WIDTHS.map((w) => [p, w]));
let next = 0;
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (next < jobs.length) {
      const [p, w] = jobs[next++];
      await check(p, w);
    }
  }),
);
await browser.close();

console.log(`\n${loads} page loads checked, ${findings.length} finding(s)`);
if (args.json) await writeFile(args.json, JSON.stringify({ base: BASE, match: String(MATCH), widths: WIDTHS, theme: `${THEME}-${SCHEME}`, pages: paths.length, loads, findings }, null, 2));
process.exit(findings.length ? 1 : 0);
