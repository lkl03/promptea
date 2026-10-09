#!/usr/bin/env node
// scripts/showcase/record.mjs
//
// v1.7.0 — records the hub's product showcase from the REAL running app.
// Nothing is mocked or composited: a headless Chrome drives the interface
// (hub → analyzer → copy → best AI → AI Daily → weekly digest → benchmarks)
// while the Chrome DevTools screencast captures every painted frame. The
// only additions are a visible cursor (so viewers can follow clicks) and a
// caption strip naming each step; the same captions are written as WebVTT.
//
// Usage (see scripts/showcase/README.md):
//   npm run build && npx next start -p 3060          # in another terminal
//   node scripts/showcase/record.mjs --base=http://localhost:3060 --lang=es
//   node scripts/showcase/record.mjs --base=http://localhost:3060 --lang=en
//
// Output: tmp frames in .showcase-tmp/<lang>/ (git-ignored), then
// scripts/showcase/encode.mjs turns them into public/showcase/*.{webm,mp4,jpg,vtt}.

import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import puppeteer from "puppeteer-core";

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")));
const BASE = (args.base ?? "http://localhost:3060").replace(/\/+$/, "");
const LANG = args.lang === "en" ? "en" : "es";
const THEME = args.theme ?? "glass";
const CHROME = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const OUT = join(process.cwd(), ".showcase-tmp", LANG);
const W = 1280;
const H = 720;
const SCALE = 1.5; // 1920×1080 frames, encoded down to 1280×720 for crisp text

// Demo data: clearly a sample, no personal or private information.
const DEMO = {
  es: {
    prompt: "Escribí un mail para invitar a nuestros clientes a un webinar sobre cómo usar IA en atención al cliente. Que sea breve y con un llamado a la acción claro.",
    task: "Tengo que resumir contratos largos en PDF y sacar fechas y montos en una tabla.",
    steps: {
      hub: "Promptea v1.7.0 · todo empieza en el hub",
      analyze: "Analizar prompt · pegá tu prompt y elegí la IA",
      result: "Puntaje, problemas detectados y versión optimizada",
      copy: "Copiá el prompt optimizado con un clic",
      bestAi: "Elegir la mejor IA · describí tu tarea",
      daily: "IA al día · noticias verificadas",
      weekly: "Resumen semanal · cada edición con su página",
      benchmarks: "Benchmarks · rankings con fuente, fecha y métrica",
      end: "promptea.me",
    },
    labels: { analyzeCard: "Analizar prompt", analyze: "Analizar", copy: "Copiar prompt optimizado", bestAi: "Elegir la mejor IA", weekly: "Resumen semanal", purpose: "Marketing" },
  },
  en: {
    prompt: "Write an email inviting our customers to a webinar about using AI in customer support. Keep it short with a clear call to action.",
    task: "I need to summarize long PDF contracts and pull dates and amounts into a table.",
    steps: {
      hub: "Promptea v1.7.0 · everything starts at the hub",
      analyze: "Analyze a prompt · paste it and pick the AI",
      result: "Score, detected issues and an optimized version",
      copy: "Copy the optimized prompt in one click",
      bestAi: "Find the best AI · describe your task",
      daily: "AI Daily · verified news",
      weekly: "Weekly digest · every edition has its own page",
      benchmarks: "Benchmarks · rankings with source, date and metric",
      end: "promptea.me",
    },
    labels: { analyzeCard: "Analyze a prompt", analyze: "Analyze", copy: "Copy optimized prompt", bestAi: "Find the best AI", weekly: "Weekly digest", purpose: "Marketing" },
  },
}[LANG];

// ---------------------------------------------------------------------------
// Overlay: a visible cursor + a caption strip. Injected into every document.
// ---------------------------------------------------------------------------
const OVERLAY = () => {
  const install = () => {
    if (document.getElementById("__sc_cursor")) return;
    const style = document.createElement("style");
    style.textContent = `
      #__sc_cursor{position:fixed;left:0;top:0;width:26px;height:26px;z-index:2147483647;pointer-events:none;transform:translate(-100px,-100px);transition:transform 40ms linear;filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))}
      #__sc_tap{position:fixed;width:36px;height:36px;margin:-18px 0 0 -18px;border-radius:50%;border:2px solid #16a870;z-index:2147483646;pointer-events:none;opacity:0}
      #__sc_tap.on{animation:__sc_tap .5s ease-out}
      @keyframes __sc_tap{from{opacity:.9;transform:scale(.3)}to{opacity:0;transform:scale(1.4)}}
      #__sc_cap{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:2147483645;pointer-events:none;padding:10px 18px;border-radius:14px;background:rgba(10,24,18,.82);color:#eef7f2;font:600 17px/1.3 Inter,system-ui,sans-serif;letter-spacing:-.005em;box-shadow:0 10px 30px rgba(0,0,0,.25);opacity:0;transition:opacity .25s ease;white-space:nowrap}
      #__sc_cap.on{opacity:1}
      nextjs-portal{display:none!important}`;
    document.documentElement.appendChild(style);
    const c = document.createElement("div");
    c.id = "__sc_cursor";
    c.innerHTML = '<svg viewBox="0 0 24 24" width="26" height="26"><path d="M4 2l15 11-6.5 1.2L16 21l-3 1.4-3.3-6.8L4 20z" fill="#fff" stroke="#0e1f18" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    const t = document.createElement("div");
    t.id = "__sc_tap";
    const cap = document.createElement("div");
    cap.id = "__sc_cap";
    document.documentElement.append(c, t, cap);
    const last = window.__sc_last;
    if (last) c.style.transform = `translate(${last.x - 4}px, ${last.y - 2}px)`;
    if (window.__sc_caption) {
      cap.textContent = window.__sc_caption;
      cap.classList.add("on");
    }
  };
  document.addEventListener("mousemove", (e) => {
    window.__sc_last = { x: e.clientX, y: e.clientY };
    const c = document.getElementById("__sc_cursor");
    if (c) c.style.transform = `translate(${e.clientX - 4}px, ${e.clientY - 2}px)`;
  }, true);
  document.addEventListener("mousedown", (e) => {
    const t = document.getElementById("__sc_tap");
    if (!t) return;
    t.style.left = e.clientX + "px";
    t.style.top = e.clientY + "px";
    t.classList.remove("on");
    void t.offsetWidth;
    t.classList.add("on");
  }, true);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install);
  else install();
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ["--no-sandbox", "--hide-scrollbars", "--disable-features=Translate", `--window-size=${W},${H}`],
  });
  const context = browser.defaultBrowserContext();
  await context.overridePermissions(BASE, ["clipboard-read", "clipboard-write", "clipboard-sanitized-write"]);
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: SCALE });
  await page.emulateMediaFeatures([
    { name: "prefers-color-scheme", value: "light" },
    { name: "prefers-reduced-motion", value: "no-preference" },
  ]);
  await page.evaluateOnNewDocument((theme) => {
    try {
      localStorage.setItem("theme", theme);
      sessionStorage.setItem("promptea:newsletter-dock-dismissed", "1");
    } catch {}
  }, THEME);
  await page.evaluateOnNewDocument(OVERLAY);

  // ── Screencast ────────────────────────────────────────────────────────
  const cdp = await page.createCDPSession();
  const frames = [];
  let n = 0;
  let recording = false;
  cdp.on("Page.screencastFrame", async (f) => {
    try {
      await cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId });
    } catch {}
    if (!recording) return;
    const file = `f${String(n++).padStart(5, "0")}.jpg`;
    frames.push({ file, t: f.metadata.timestamp });
    await writeFile(join(OUT, file), Buffer.from(f.data, "base64"));
  });

  const cues = [];
  let t0 = 0;
  const now = () => Date.now() / 1000 - t0;
  let cursor = { x: W / 2, y: H / 2 };

  async function caption(text) {
    if (cues.length) cues[cues.length - 1].end = now();
    cues.push({ start: now(), end: null, text });
    await page.evaluate((txt) => {
      window.__sc_caption = txt;
      const cap = document.getElementById("__sc_cap");
      if (cap) {
        cap.textContent = txt;
        cap.classList.add("on");
      }
    }, text);
  }

  async function glide(x, y, ms = 650) {
    const steps = Math.max(8, Math.round(ms / 16));
    const from = { ...cursor };
    for (let i = 1; i <= steps; i++) {
      const p = i / steps;
      const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      await page.mouse.move(from.x + (x - from.x) * e, from.y + (y - from.y) * e);
      await sleep(14);
    }
    cursor = { x, y };
  }

  async function centerOf(handle) {
    await handle.evaluate((el) => el.scrollIntoView({ block: "center", behavior: "smooth" }));
    await sleep(700);
    const box = await handle.boundingBox();
    if (!box) throw new Error("element not visible");
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  }

  async function clickEl(handle, { wait = 350 } = {}) {
    const c = await centerOf(handle);
    await glide(c.x, c.y);
    await sleep(wait);
    await page.mouse.down();
    await sleep(70);
    await page.mouse.up();
  }

  const byText = (sel, text) => page.waitForSelector(`${sel}::-p-text(${JSON.stringify(text).slice(1, -1)})`, { visible: true, timeout: 20000 });

  async function go(path) {
    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle2", timeout: 120000 });
    await page.mouse.move(cursor.x, cursor.y);
    await sleep(400);
  }

  async function smoothScroll(y, ms = 1200) {
    await page.evaluate((top) => window.scrollTo({ top, behavior: "smooth" }), y);
    await sleep(ms);
  }

  // ── Script ────────────────────────────────────────────────────────────
  await go(`/${LANG}`);
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 88, everyNthFrame: 1, maxWidth: W * SCALE, maxHeight: H * SCALE });
  recording = true;
  t0 = Date.now() / 1000;

  // 1. Hub
  await caption(DEMO.steps.hub);
  await glide(W * 0.34, H * 0.62, 900);
  await sleep(900);
  await glide(W * 0.66, H * 0.62, 700);
  await sleep(1200);

  // 2. Analyzer: open it from the hub card
  const analyzeCard = await page.waitForSelector('a[data-card="analyze"]', { visible: true });
  await clickEl(analyzeCard);
  await page.waitForSelector("textarea", { visible: true, timeout: 60000 });
  await sleep(800);
  await caption(DEMO.steps.analyze);

  const targetSelect = await page.waitForSelector("select", { visible: true });
  await clickEl(targetSelect, { wait: 200 });
  await targetSelect.select("claude");
  await sleep(700);
  const purpose = await byText("button", DEMO.labels.purpose);
  await clickEl(purpose);
  await sleep(500);
  const textarea = await page.waitForSelector("textarea", { visible: true });
  await clickEl(textarea, { wait: 150 });
  await page.keyboard.type(DEMO.prompt, { delay: 18 });
  await sleep(700);
  const analyzeBtn = await byText("button", DEMO.labels.analyze);
  await clickEl(analyzeBtn);

  // 3. Results
  const copyBtn = await page.waitForSelector(`button[aria-label="${DEMO.labels.copy}"]`, { timeout: 90000 });
  await sleep(1200);
  await caption(DEMO.steps.result);
  const resultsTop = await page.evaluate(() => {
    const el = document.querySelector("#prompt-tabpanel");
    return el ? el.getBoundingClientRect().top + window.scrollY - 360 : window.scrollY + 500;
  });
  await smoothScroll(resultsTop - 200, 1600);
  await sleep(1400);
  await smoothScroll(resultsTop + 120, 1400);
  await sleep(900);

  // 4. Copy
  await caption(DEMO.steps.copy);
  await clickEl(copyBtn);
  await sleep(1800);

  // 5. Best AI
  await go(`/${LANG}/best-ai`);
  await caption(DEMO.steps.bestAi);
  const matcherInput = await page.waitForSelector("textarea", { visible: true });
  await clickEl(matcherInput, { wait: 150 });
  // The matcher may restore the last prompt; start from an empty box.
  await page.keyboard.down("Control");
  await page.keyboard.press("KeyA");
  await page.keyboard.up("Control");
  await page.keyboard.press("Backspace");
  await page.keyboard.type(DEMO.task, { delay: 18 });
  await sleep(500);
  const matcherBtn = await byText("button", DEMO.labels.bestAi);
  await clickEl(matcherBtn);
  await page.waitForSelector("#matcher-results *", { timeout: 60000 });
  await sleep(900);
  const matcherTop = await page.evaluate(() => document.querySelector("#matcher-results").getBoundingClientRect().top + window.scrollY - 120);
  await smoothScroll(matcherTop, 1500);
  await sleep(2200);

  // 6. AI Daily
  await go(`/${LANG}/blog`);
  await caption(DEMO.steps.daily);
  await sleep(1400);
  await smoothScroll(420, 1400);
  await sleep(900);
  await smoothScroll(0, 900);

  // 7. Weekly digest tab → latest edition
  const weeklyTab = await byText("a", DEMO.labels.weekly);
  await clickEl(weeklyTab);
  await page.waitForFunction(() => location.pathname.endsWith("/blog/weekly"), { timeout: 60000 });
  await sleep(900);
  await caption(DEMO.steps.weekly);
  await sleep(1400);
  const edition = await page.$('a[href*="/blog/weekly/"]');
  if (edition) {
    await clickEl(edition);
    await page.waitForFunction(() => /\/blog\/weekly\/\d{4}-\d{2}-\d{2}$/.test(location.pathname), { timeout: 60000 });
    await sleep(1200);
    await smoothScroll(500, 1600);
    await sleep(900);
  }

  // 8. Benchmarks (whatever state the page is honestly in)
  await go(`/${LANG}/benchmarks`);
  await caption(DEMO.steps.benchmarks);
  await sleep(1600);
  // Tour as far as the page actually goes (an empty state is short).
  const room = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight - 260);
  for (const y of [520, 1300, 2200]) {
    if (y > room) break;
    await smoothScroll(y, 1600);
    await sleep(1400);
  }

  // 9. Back to the hub
  await go(`/${LANG}`);
  await caption(DEMO.steps.end);
  await sleep(2200);

  cues[cues.length - 1].end = now();
  recording = false;
  await cdp.send("Page.stopScreencast");
  await sleep(300);
  await browser.close();

  await writeFile(join(OUT, "frames.json"), JSON.stringify({ lang: LANG, width: W, height: H, scale: SCALE, t0, frames, cues }, null, 2));
  console.log(`recorded ${frames.length} frames, ${cues.length} captions → ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
