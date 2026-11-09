#!/usr/bin/env node
// scripts/release/audit.mjs
//
// v1.8.0 — visual + runtime audit with a real Chrome (puppeteer-core, already a
// devDependency for the showcase recorder). For every page × theme × colour
// scheme × viewport it:
//   - loads the page with the theme pre-selected (localStorage "theme"),
//   - collects console errors / page errors / hydration warnings,
//   - measures horizontal overflow (scrollWidth > clientWidth) and CLS,
//   - optionally saves a screenshot to docs/release/v1.8.0/.
//
//   npm run build && npx next start -p 3070        # or `npm run dev`
//   node scripts/release/audit.mjs --base=http://localhost:3070 [--shots] [--pages=/es,/es/benchmarks] [--quick]
//
// Exit code 1 if any console error, overflow or CLS > 0.1 was found.

import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import puppeteer from "puppeteer-core";

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")));
const BASE = (args.base ?? "http://localhost:3070").replace(/\/+$/, "");
const CHROME = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const SHOTS = "shots" in args;
const QUICK = "quick" in args;
const OUT = join(process.cwd(), "docs", "release", "v1.8.0");

const PAGES = (args.pages ? args.pages.split(",") : ["/es", "/en", "/es/analyzer", "/es/best-ai", "/es/blog", "/es/benchmarks", "/es/guides", "/es/models", "/es/glossary", "/es/prompts", "/es/privacy"]).map((p) => p.trim());
const THEMES = QUICK ? ["aqua", "metro", "glass"] : ["aqua", "metro", "glass"];
const SCHEMES = QUICK ? ["light"] : ["light", "dark"];
const VIEWPORTS = QUICK ? [{ name: "desktop", width: 1280, height: 800 }] : [{ name: "desktop", width: 1280, height: 800 }, { name: "mobile", width: 375, height: 812, mobile: true }];

const slug = (p) => (p.replace(/^\//, "").replace(/\//g, "_") || "root");

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox"] });
  const findings = [];
  let runs = 0;

  for (const vp of VIEWPORTS) {
    for (const scheme of SCHEMES) {
      for (const theme of THEMES) {
        // Metro is dark by design; Aqua is light by design: only vary the scheme where it matters.
        if (scheme === "dark" && theme === "aqua") continue;
        if (scheme === "light" && theme === "metro" && !SHOTS) continue;
        const page = await browser.newPage();
        await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1, isMobile: Boolean(vp.mobile), hasTouch: Boolean(vp.mobile) });
        await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: scheme }]);
        await page.evaluateOnNewDocument((t) => {
          try {
            localStorage.setItem("theme", t);
            sessionStorage.setItem("promptea:newsletter-dock-dismissed", "1");
          } catch {}
          window.__cls = 0;
          try {
            new PerformanceObserver((list) => {
              for (const e of list.getEntries()) if (!e.hadRecentInput) window.__cls += e.value;
            }).observe({ type: "layout-shift", buffered: true });
          } catch {}
        }, theme);
        const errors = [];
        // /_vercel/insights (Vercel Analytics) only exists on Vercel: its 404 elsewhere is expected, not a finding.
        let vercelInsights404 = 0;
        page.on("response", (r) => { if (r.status() === 404 && r.url().includes("/_vercel/")) vercelInsights404++; });
        page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
        page.on("console", (m) => {
          if (m.type() === "error") errors.push(`console.error: ${m.text().slice(0, 300)}`);
        });
        page.on("requestfailed", (r) => {
          const u = r.url();
          // Prefetches cancelled by the next navigation are not failures.
          if (u.startsWith(BASE) && r.failure()?.errorText !== "net::ERR_ABORTED") errors.push(`requestfailed: ${u}`);
        });

        for (const path of PAGES) {
          errors.length = 0;
          vercelInsights404 = 0;
          const label = `${path} · ${theme}/${scheme} · ${vp.name}`;
          try {
            await page.goto(BASE + path, { waitUntil: "networkidle2", timeout: 45_000 });
            await new Promise((r) => setTimeout(r, 700));
            const m = await page.evaluate(() => ({
              overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
              cls: Math.round((window.__cls ?? 0) * 1000) / 1000,
              themeAttr: document.documentElement.dataset.theme,
            }));
            runs++;
            if (m.overflow > 1) findings.push(`${label}: horizontal overflow ${m.overflow}px`);
            if (m.cls > 0.1) findings.push(`${label}: CLS ${m.cls}`);
            // Dev-only noise that is not an app problem.
            const real = errors.filter((e) => !/favicon|Download the React DevTools|Fast Refresh|\[HMR\]/.test(e) && !(vercelInsights404 > 0 && /Failed to load resource.*404/.test(e)));
            for (const e of real) findings.push(`${label}: ${e}`);
            if (SHOTS) await page.screenshot({ path: join(OUT, `${slug(path)}__${theme}-${scheme}__${vp.name}.jpg`), fullPage: false, type: "jpeg", quality: 78 });
            // The feedback modal (the v1.8.0 translucency bug): open it from the footer and capture it on the analyzer.
            if (SHOTS && path === "/es/analyzer") {
              const opened = await page.evaluate(() => {
                const btn = [...document.querySelectorAll("footer button")].find((b) => /feedback/i.test(b.textContent ?? ""));
                btn?.click();
                return Boolean(btn);
              });
              await new Promise((r) => setTimeout(r, 450));
              const dialogBg = await page.evaluate(() => { const d = document.querySelector('[role="dialog"]'); return d ? getComputedStyle(d).backgroundColor : null; });
              // Rendered in place (inside the footer) page content painted over the panel: it must live directly under <body>.
              const inBody = await page.evaluate(() => document.querySelector('[role="dialog"]')?.parentElement?.parentElement === document.body);
              if (!inBody) findings.push(`${label}: feedback modal is not mounted at the end of <body>`);
              if (!opened || !dialogBg) findings.push(`${label}: feedback modal did not open`);
              else {
                // "rgb(r, g, b)" is opaque; "rgba(r, g, b, a)" must have a >= 0.9 (the overlay fill is 0.95-0.97).
                const alpha = dialogBg.startsWith("rgba") ? Number(dialogBg.split(",").pop().replace(")", "").trim()) : 1;
                if (!(alpha >= 0.9)) findings.push(`${label}: feedback modal is translucent (${dialogBg})`);
              }
              await page.screenshot({ path: join(OUT, `feedback-modal__${theme}-${scheme}__${vp.name}.jpg`), type: "jpeg", quality: 78 });
              await page.keyboard.press("Escape");
            }
            console.log(`ok  ${label}  cls=${m.cls} overflow=${m.overflow}`);
          } catch (e) {
            findings.push(`${label}: ${e.message}`);
          }
        }
        await page.close();
      }
    }
  }
  await browser.close();
  console.log(`\n${runs} page loads`);
  if (findings.length) {
    console.log(`\n${findings.length} finding(s):`);
    for (const f of findings) console.log(" - " + f);
    process.exit(1);
  }
  console.log("no findings");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
