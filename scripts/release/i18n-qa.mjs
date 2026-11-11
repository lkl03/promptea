#!/usr/bin/env node
// scripts/release/i18n-qa.mjs — v1.8.2. A real Chrome walks every key page in
// every language and reports what a third language tends to break.
//
//   node scripts/release/i18n-qa.mjs --base=http://localhost:3181 [--out=docs/release/v1.8.2] [--shots=1]
//
// LOCALHOST ONLY by default (it submits the analyzer form). For each
// language × page × viewport (1440 and 375) it checks:
//   - no horizontal page overflow, and which elements stick out if there is
//   - <html lang> (pt-BR under /pt) and the ES | EN | PT switcher (3 links,
//     the current one marked, none clipped, the header on one row at 375 px)
//   - text clipped inside buttons, badges, nav links and tabs
//   - under /pt: visible strings that are still English or Spanish (a list of
//     sentinel phrases taken from the en/es dictionaries), outside the regions
//     that are English on purpose (AI Daily, untranslated guides, old changelog)
// and, with --shots=1, saves screenshots (3 themes × light/dark for the home and
// the analyzer; one theme for the rest).
//
// Exit code 1 when a check fails.

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import puppeteer from "puppeteer-core";

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split(/=(.*)/s).slice(0, 2)));
const BASE = (args.base ?? "http://localhost:3181").replace(/\/+$/, "");
const OUT = args.out ?? "docs/release/v1.8.2";
const SHOTS = args.shots === "1";
const CHROME = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(BASE)) {
  console.error("i18n-qa only runs against localhost (it submits forms).");
  process.exit(2);
}

const LANGS = ["pt", "es", "en"];
const HTML_LANG = { es: "es", en: "en", pt: "pt-BR" };
const PAGES = [
  ["home", ""],
  ["analyzer", "/analyzer"],
  ["best-ai", "/best-ai"],
  ["benchmarks", "/benchmarks"],
  ["blog", "/blog"],
  ["weekly", "/blog/weekly"],
  ["guides", "/guides"],
  ["guide", "/guides/prompt-checklist"],
  ["models", "/models"],
  ["model", "/models/claude"],
  ["glossary", "/glossary"],
  ["term", "/glossary/system-prompt"],
  ["prompts", "/prompts"],
  ["pack", "/prompts/code"],
  ["landing", "/landing/prompt-analyzer"],
  ["how-it-works", "/how-it-works"],
  ["about", "/about"],
  ["methodology", "/methodology"],
  ["library", "/library"],
  ["share", "/share"],
  ["changelog", "/changelog"],
  ["privacy", "/privacy"],
  ["404", "/this-page-does-not-exist"],
];
const VIEWPORTS = [1440, 375];
const THEMES = [
  ["aqua", "light"],
  ["aqua", "dark"],
  ["metro", "light"],
  ["metro", "dark"],
  ["glass", "light"],
  ["glass", "dark"],
];
/** Pages whose every theme is checked (the rest use one theme per viewport). */
const ALL_THEMES = new Set(["home", "analyzer"]);

// Phrases that only exist in the English / Spanish interface. If one is visible
// under /pt outside an intentionally-English region, a string was not translated.
const SENTINELS = [
  "Analyze", "Find the best AI", "Improve Prompt", "Paste your prompt", "Your prompt", "Target AI", "Choose an AI", "Choose a model",
  "What is your prompt for", "Attach files", "Subscribe", "Language", "Privacy", "Home", "Back to", "Open in Promptea", "Read more",
  "Prompt packs", "Prompting guides", "Prompts by model", "Glossary", "Library", "Weekly digest", "Benchmarks at a glance", "Follow us on X",
  "How this works", "Last updated", "Markdown version", "Frequently asked questions", "Cost calculator", "Frontier models", "Send feedback",
  "Analizá", "Elegí", "Pegá", "Suscribirme", "Guías", "Glosario", "Volver", "Abrir en Promptea", "Privacidad", "Inicio",
  "Cómo funciona", "Preguntas frecuentes", "Última actualización", "Resumen semanal", "Calculadora de costo",
];

const results = [];
const fail = (where, what) => {
  results.push({ where, what });
  console.log(`  ✗ ${where}: ${what}`);
};

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox"] });
if (SHOTS) await mkdir(OUT, { recursive: true });
let pagesChecked = 0;
let shots = 0;

async function open(lang, path, w, theme, scheme) {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setViewport({ width: w, height: w < 600 ? 812 : 900, deviceScaleFactor: 1, isMobile: w < 600, hasTouch: w < 600 });
  await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: scheme }]);
  await page.evaluateOnNewDocument((t) => {
    try {
      localStorage.setItem("theme", t);
      // The first-visit newsletter card would cover part of every screenshot.
      localStorage.setItem("promptea:newsletter:dismissedAt", String(Date.now()));
    } catch {}
  }, theme);
  const res = await page.goto(`${BASE}/${lang}${path}`, { waitUntil: "networkidle2", timeout: 90_000 });
  await new Promise((r) => setTimeout(r, 500));
  return { context, page, status: res?.status() ?? 0 };
}

async function inspect(page, lang, sentinels) {
  return page.evaluate(
    ({ lang, sentinels }) => {
      const vw = document.documentElement.clientWidth;
      const out = { innerWidth: window.innerWidth, overflow: Math.max(0, document.documentElement.scrollWidth - vw), offenders: [], clipped: [], htmlLang: document.documentElement.lang, switcher: null, untranslated: [], headerRows: 0 };

      const inScrollable = (el) => {
        for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
          const o = getComputedStyle(n).overflowX;
          if (o === "auto" || o === "scroll" || o === "hidden" || o === "clip") return true;
        }
        return false;
      };
      if (out.overflow > 1) {
        for (const el of document.querySelectorAll("body *")) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.right <= vw + 1 || getComputedStyle(el).position === "fixed" || inScrollable(el)) continue;
          out.offenders.push(`${el.tagName.toLowerCase()}.${String(el.className).split(" ").slice(0, 3).join(".")} right=${Math.round(r.right)}`);
          if (out.offenders.length >= 4) break;
        }
      }

      // Text cut inside controls: the content is wider than its box and the box hides it.
      for (const el of document.querySelectorAll("button, a.btn, .btn, .badge, nav a, [role=tab], th, label")) {
        const cs = getComputedStyle(el);
        if (el.offsetParent === null || cs.visibility === "hidden") continue;
        const hides = cs.overflowX === "hidden" || cs.overflowX === "clip" || cs.textOverflow === "ellipsis";
        // clientWidth <= 1 is a visually-hidden (sr-only) label, not clipped text.
        if (hides && el.clientWidth > 1 && el.scrollWidth > el.clientWidth + 1 && el.textContent.trim().length > 0 && !el.closest(".line-clamp-1, .line-clamp-2, .truncate, [data-truncate]")) {
          out.clipped.push(`${el.tagName.toLowerCase()} "${el.textContent.trim().slice(0, 40)}" ${el.scrollWidth}>${el.clientWidth}`);
        }
      }

      const sw = document.querySelector("[data-language-switcher]");
      if (sw) {
        const links = [...sw.querySelectorAll("a")];
        const r = sw.getBoundingClientRect();
        out.switcher = {
          labels: links.map((a) => a.textContent.trim()).join("|"),
          current: links.filter((a) => a.getAttribute("aria-current") === "true").map((a) => a.textContent.trim()).join("|"),
          hrefLangs: links.map((a) => a.getAttribute("hreflang")).join("|"),
          inside: r.left >= -1 && r.right <= vw + 1,
          clipped: sw.scrollWidth > sw.clientWidth + 1,
          height: Math.round(r.height),
          top: Math.round(r.top + window.scrollY),
        };
        const bar = sw.closest(".site-header-bar");
        if (bar) {
          const tops = new Set([...bar.children].filter((c) => c.getBoundingClientRect().height > 0 && !c.matches("nav[id]")).map((c) => Math.round(c.getBoundingClientRect().top / 12)));
          out.headerRows = tops.size;
        }
      }

      if (lang === "pt") {
        // Regions that are English (or Spanish/English history) on purpose.
        const skip = '[lang="en"], [lang="es"], [data-content-lang-notice], pre, code, [data-language-switcher], script, style, .blog-row-title, [data-x-feed]';
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        const seen = new Set();
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          const el = n.parentElement;
          if (!el || el.closest(skip) || el.offsetParent === null) continue;
          const text = n.textContent.trim();
          if (text.length < 3) continue;
          for (const s of sentinels) {
            const re = new RegExp(`(^|[^\\p{L}])${s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^\\p{L}]|$)`, "u");
            if (re.test(text) && !seen.has(s + text)) {
              seen.add(s + text);
              out.untranslated.push(`"${s}" in «${text.slice(0, 70)}»`);
            }
          }
        }
      }
      return out;
    },
    { lang, sentinels },
  );
}

for (const lang of LANGS) {
  console.log(`\n== /${lang}`);
  for (const [name, path] of PAGES) {
    for (const w of VIEWPORTS) {
      const combos = ALL_THEMES.has(name) ? THEMES : [w === 1440 ? ["glass", "dark"] : ["aqua", "light"]];
      for (const [theme, scheme] of combos) {
        const where = `/${lang}${path || ""} @${w} ${theme}-${scheme}`;
        let ctx;
        try {
          ctx = await open(lang, path, w, theme, scheme);
          const { page, status } = ctx;
          pagesChecked++;
          if (name === "404" ? status !== 404 : status !== 200) fail(where, `status ${status}`);
          const r = await inspect(page, lang, SENTINELS);
          if (r.innerWidth !== w) fail(where, `viewport is ${r.innerWidth}px, not ${w}px`);
          if (r.overflow > 1) fail(where, `horizontal overflow ${r.overflow}px — ${r.offenders.join("; ")}`);
          // The 404 page is Next's own document (no site layout) in every language since before v1.8.2.
          if (name === "404") {
            await ctx.context.close();
            continue;
          }
          if (r.htmlLang !== HTML_LANG[lang]) fail(where, `<html lang="${r.htmlLang}">`);
          if (!r.switcher) fail(where, "no language switcher");
          else {
            if (r.switcher.labels !== "ES|EN|PT") fail(where, `switcher shows ${r.switcher.labels}`);
            if (r.switcher.current !== lang.toUpperCase()) fail(where, `switcher marks ${r.switcher.current || "nothing"} as current`);
            if (r.switcher.hrefLangs !== "es|en|pt-BR") fail(where, `switcher hreflang ${r.switcher.hrefLangs}`);
            if (!r.switcher.inside || r.switcher.clipped) fail(where, "language switcher is cut off");
            // One row: the switcher sits in the header's first line (≤ 60 px from the top of the page).
            if (r.switcher.top > 60) fail(where, `language switcher dropped to a second row (top ${r.switcher.top}px)`);
          }
          for (const c of r.clipped.slice(0, 3)) fail(where, `clipped text: ${c}`);
          for (const u of r.untranslated.slice(0, 4)) fail(where, `not translated: ${u}`);

          const wantShot = SHOTS && (ALL_THEMES.has(name) || lang === "pt" || name === "home" || name === "benchmarks");
          if (wantShot) {
            await page.screenshot({ path: join(OUT, `${name}__${lang}__${w}__${theme}-${scheme}.jpg`), type: "jpeg", quality: 68, fullPage: w === 375 ? false : name !== "benchmarks" && name !== "changelog" });
            shots++;
          }
        } catch (e) {
          fail(where, `error: ${e.message.slice(0, 120)}`);
        }
        await ctx?.context.close();
      }
    }
  }
}

// --- The analyzer with a real prompt written in Portuguese -------------------
console.log("\n== analyzer flow (pt)");
{
  const prompt = "Escreva um e-mail para o meu gerente pedindo uma reunião na próxima semana para revisar o orçamento do projeto. Tom profissional, no máximo 120 palavras.";
  for (const w of VIEWPORTS) {
    const where = `/pt/analyzer flow @${w}`;
    let ctx;
    try {
      ctx = await open("pt", `/analyzer?prompt=${encodeURIComponent(prompt)}&purpose=text&target=claude`, w, "aqua", "light");
      const { page } = ctx;
      await page.waitForSelector("textarea", { timeout: 20_000 });
      const filled = await page.$eval("textarea", (t) => t.value);
      if (!filled.includes("Escreva um e-mail")) fail(where, "the prompt from the URL was not loaded into the editor");
      const clicked = await page.evaluate(() => {
        const b = [...document.querySelectorAll("button")].find((x) => /^Analisar/.test(x.textContent.trim()) && !x.disabled);
        b?.click();
        return Boolean(b);
      });
      if (!clicked) fail(where, 'no enabled "Analisar" button');
      else {
        await page.waitForFunction(() => /Prompt otimizado/.test(document.body.innerText) && /Riscos detectados|Recomendações/.test(document.body.innerText), { timeout: 45_000 });
        await new Promise((r) => setTimeout(r, 1500));
        const text = await page.evaluate(() => document.body.innerText);
        for (const must of ["Qualidade", "Prompt otimizado", "Recomendações"]) if (!text.includes(must)) fail(where, `results do not show "${must}"`);
        for (const never of ["Detected risks", "Riesgos detectados", "Optimized prompt", "Prompt optimizado", "Missing ", "Falta el ", "Add success criteria", "Agregá"]) {
          if (text.includes(never)) fail(where, `results contain "${never}"`);
        }
        const r = await inspect(page, "pt", SENTINELS);
        if (r.overflow > 1) fail(where, `horizontal overflow ${r.overflow}px — ${r.offenders.join("; ")}`);
        for (const u of r.untranslated.slice(0, 4)) fail(where, `not translated: ${u}`);
        if (SHOTS) {
          await page.screenshot({ path: join(OUT, `analyzer-result__pt__${w}__aqua-light.jpg`), type: "jpeg", quality: 68, fullPage: true });
          shots++;
        }
        console.log(`  ok  ${where}`);
      }
    } catch (e) {
      fail(where, `error: ${e.message.slice(0, 160)}`);
    }
    await ctx?.context.close();
  }
}

await browser.close();
const summary = { base: BASE, pagesChecked, shots, failures: results };
await mkdir(OUT, { recursive: true });
await writeFile(join(OUT, "i18n-qa.json"), JSON.stringify(summary, null, 2));
console.log(`\n${pagesChecked} page loads checked, ${shots} screenshot(s), ${results.length} failure(s)`);
process.exit(results.length ? 1 : 0);
