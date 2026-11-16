#!/usr/bin/env node
// scripts/release/newsletter-check.mjs
//
// v1.8.7 — what a visitor actually sees of the floating newsletter prompt
// ("Join our newsletter", bottom-right), with a real Chrome and a fresh profile
// per visit:
//
//   for every page × width × stored state, open the page, wait 6.5 s and record
//   whether the card is open (and which variant), whether only the pill shows,
//   or nothing; whether the card took the focus; whether it overlaps a text box
//   or the main tool controls; and the layout shift it caused.
//
// States ("profiles"):
//   clean       nothing in localStorage — a new visitor;
//   seen        the card already opened by itself once (v1.8.1 marked that for good);
//   closed      the visitor closed the card 2 days ago;
//   closed8     the visitor closed the card 8 days ago (the 7-day pause is over);
//   subscribed  subscribed from any form.
//
// Read-only against anything that is not localhost: every request that is not
// a GET/HEAD is aborted (no subscription, no telemetry write). On localhost the
// subscription endpoint is answered by a mock (`--mock-subscribe`) so the form
// can be submitted without storing an address.
//
//   node scripts/release/newsletter-check.mjs --base=http://localhost:3191 [--widths=1440,375] [--out=file.json]
//   node scripts/release/newsletter-check.mjs --base=https://www.promptea.me --profiles=clean,seen

import fs from "node:fs";
import puppeteer from "puppeteer-core";

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split(/=(.*)/s).slice(0, 2)));
const BASE = (args.base ?? "http://localhost:3191").replace(/\/+$/, "");
const LOCAL = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(BASE);
const CHROME = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const WIDTHS = (args.widths ?? "1440,375").split(",").map(Number);
const PAGES = (args.pages ?? "/es,/en/analyzer,/en/guides,/es/models,/en/benchmarks,/pt/how-it-works,/es/blog,/en/blog/tech").split(",");
const PROFILES = (args.profiles ?? "clean,seen,closed,closed8,subscribed").split(",");
const WAIT_MS = Number(args.wait ?? 6500);
const DAY = 86_400_000;

const now = Date.now();
const STATE = {
  clean: null,
  seen: { subscribed: false, pillDismissedAt: 0, dockDismissedAt: 0, modalShownAt: 0, cardShownAt: now - 3 * DAY },
  closed: { subscribed: false, pillDismissedAt: 0, dockDismissedAt: 0, modalShownAt: 0, cardShownAt: now - 2 * DAY, cardDismissedAt: now - 2 * DAY },
  closed8: { subscribed: false, pillDismissedAt: 0, dockDismissedAt: 0, modalShownAt: 0, cardShownAt: now - 8 * DAY, cardDismissedAt: now - 8 * DAY },
  subscribed: { subscribed: true, pillDismissedAt: 0, dockDismissedAt: 0, modalShownAt: 0, cardShownAt: 0 },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox"] });
const rows = [];

for (const profile of PROFILES) {
  for (const width of WIDTHS) {
    for (const path of PAGES) {
      const context = await browser.createBrowserContext();
      const page = await context.newPage();
      const height = width < 600 ? 812 : 900;
      await page.setViewport({ width, height, deviceScaleFactor: 1, isMobile: width < 600, hasTouch: width < 600 });
      await page.setRequestInterception(true);
      page.on("request", (req) => {
        const m = req.method();
        if (m === "GET" || m === "HEAD") return req.continue();
        if (LOCAL && args["mock-subscribe"] !== undefined && /\/api\/newsletter\/subscribe/.test(req.url())) {
          return req.respond({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, status: "pending" }) });
        }
        if (LOCAL && !/\/api\/(newsletter\/subscribe|feedback|internal)/.test(req.url())) return req.continue();
        return req.abort();
      });
      const state = STATE[profile];
      await page.evaluateOnNewDocument((s) => {
        try {
          if (s) localStorage.setItem("promptea:newsletter-nudges", JSON.stringify(s));
        } catch {}
        // Layout shifts, measured from the start.
        window.__cls = 0;
        try {
          new PerformanceObserver((l) => {
            for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value;
          }).observe({ type: "layout-shift", buffered: true });
        } catch {}
      }, state);
      let status = 0;
      try {
        const res = await page.goto(BASE + path, { waitUntil: "load", timeout: 60_000 });
        status = res?.status() ?? 0;
      } catch (e) {
        rows.push({ profile, width, path, error: String(e).slice(0, 120) });
        await context.close();
        continue;
      }
      const clsBefore = await page.evaluate(() => window.__cls);
      await sleep(WAIT_MS);
      const r = await page.evaluate(() => {
        const vis = (el) => {
          if (!el) return false;
          const wrap = el.closest(".newsletter-pill-wrap");
          if (wrap && wrap.classList.contains("is-hidden")) return false;
          const s = getComputedStyle(el);
          const b = el.getBoundingClientRect();
          return s.display !== "none" && s.visibility !== "hidden" && Number(s.opacity) > 0.05 && b.width > 0 && b.height > 0;
        };
        const card = document.querySelector("[data-newsletter-card]");
        const pill = document.querySelector(".newsletter-pill");
        const cardBox = card?.getBoundingClientRect();
        const title = card?.querySelector("h2")?.textContent?.trim() ?? null;
        // Does the floating surface sit on a text box or a primary control of the page?
        const surface = vis(card) ? card : vis(pill) ? pill : null;
        let covers = [];
        if (surface) {
          const a = surface.getBoundingClientRect();
          for (const el of document.querySelectorAll("main textarea, main input:not([type=hidden]), main button, main select, main a.btn")) {
            if (surface.contains(el)) continue;
            const b = el.getBoundingClientRect();
            if (b.width === 0 || b.height === 0) continue;
            if (a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom) covers.push((el.tagName + " " + (el.getAttribute("aria-label") || el.textContent || "").trim()).slice(0, 40));
          }
        }
        const inline = [...document.querySelectorAll("[data-newsletter-inline]")].some((el) => {
          const b = el.getBoundingClientRect();
          return b.bottom > 0 && b.top < innerHeight && b.width > 0;
        });
        return {
          innerWidth,
          card: vis(card) ? card.getAttribute("data-newsletter-card") : null,
          cardRole: card ? card.getAttribute("role") : null,
          cardRight: cardBox ? Math.round(innerWidth - cardBox.right) : null,
          cardBottom: cardBox ? Math.round(innerHeight - cardBox.bottom) : null,
          title,
          pill: vis(pill),
          focusInCard: Boolean(card && card.contains(document.activeElement)),
          inlineFormOnScreen: inline,
          covers,
          modal: Boolean(document.querySelector('[role="dialog"][aria-modal="true"]')),
          stored: localStorage.getItem("promptea:newsletter-nudges"),
          cls: window.__cls,
        };
      });
      rows.push({ profile, width, path, status, ...r, cls: Math.round((r.cls - clsBefore) * 1000) / 1000 });
      const shown = r.card ? `CARD(${r.card})` : r.pill ? "pill" : "nothing";
      console.log(`${profile.padEnd(10)} ${String(width).padStart(4)} ${path.padEnd(18)} ${status} → ${shown}${r.inlineFormOnScreen ? " [inline form on screen]" : ""}${r.covers.length ? " COVERS: " + r.covers.join(" | ") : ""}${r.focusInCard ? " FOCUS-STOLEN" : ""}`);
      await context.close();
    }
  }
}

await browser.close();
if (args.out) fs.writeFileSync(args.out, JSON.stringify({ base: BASE, at: new Date().toISOString(), rows }, null, 2));
