#!/usr/bin/env node
// scripts/release/qa-local.mjs
//
// v1.8.1 — release QA against a LOCAL server (never production: /api/analyze
// writes telemetry where Firestore is configured). It checks, end to end:
//
//   engine      POST /api/analyze for the 8 purposes × es/en: a 0–100 score, the
//               six-dimension breakdown, the before → after score
//               (meta.optimizedScore), and — with no provider keys — the
//               deterministic fallback with a reason; no judge unless enabled.
//   share card  /api/share/card with valid, out-of-range and hostile parameters:
//               always an image or a clean 4xx, never a 5xx, never echoing text.
//   share page  /{lang}/share with hostile parameters: 200, noindex, no reflected markup.
//   noindex     /library and /share are noindex; key pages are not.
//   degradation with JavaScript disabled, and with localStorage/sessionStorage
//               throwing, the key pages still render their content without errors.
//
//   node scripts/release/qa-local.mjs --base=http://localhost:3182 [--json=out.json]

import { writeFile } from "node:fs/promises";
import puppeteer from "puppeteer-core";

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split(/=(.*)/s).slice(0, 2)));
const BASE = (args.base ?? "http://localhost:3182").replace(/\/+$/, "");
if (!/^https?:\/\/(localhost|127\.0\.0\.1)/.test(BASE)) {
  console.error("qa-local only runs against localhost (it posts to /api/analyze).");
  process.exit(2);
}
const CHROME = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";

const results = [];
const ok = (group, name, pass, detail = "") => {
  results.push({ group, name, pass, detail });
  console.log(`${pass ? "ok  " : "FAIL"} [${group}] ${name}${detail ? " — " + detail : ""}`);
};

// ── engine ────────────────────────────────────────────────────────────────
const PROMPTS = {
  text: { en: "Write a welcome message for new members of a book club. Friendly tone, under 120 words.", es: "Escribí un mensaje de bienvenida para nuevos socios de un club de lectura. Tono amable, menos de 120 palabras." },
  study: { en: "Explain photosynthesis to a 12 year old with one everyday example and three quiz questions.", es: "Explicame la fotosíntesis para un chico de 12 años con un ejemplo cotidiano y tres preguntas de repaso." },
  code: { en: "Write a TypeScript function that deduplicates an array of objects by id and keeps the last one. Include tests.", es: "Escribí una función en TypeScript que elimine duplicados de un array de objetos por id y conserve el último. Incluí tests." },
  data: { en: "Extract name, date and total from this invoice text and return JSON with those three keys.", es: "Extraé nombre, fecha y total de este texto de factura y devolvé un JSON con esas tres claves." },
  image: { en: "A lighthouse on a cliff at dusk, watercolor style, soft warm light, wide shot.", es: "Un faro sobre un acantilado al atardecer, estilo acuarela, luz cálida suave, plano general." },
  marketing: { en: "Write three subject lines for an email announcing a 20% discount on running shoes for returning customers.", es: "Escribí tres asuntos para un mail que anuncia 20 % de descuento en zapatillas de running para clientes recurrentes." },
  translation: { en: "Translate this product description into Spanish for Argentina, keeping the brand names in English.", es: "Traducí esta descripción de producto al inglés de Estados Unidos, manteniendo los nombres de marca." },
  summarization: { en: "Summarize the following meeting notes in five bullet points with owners and deadlines.", es: "Resumí las siguientes notas de reunión en cinco viñetas con responsables y fechas límite." },
};
const SESSION = "qa-local-release-check";
const DIMS = ["clarity", "context", "constraints", "output", "verifiability", "safety"];
const engineRows = [];

for (const [purpose, byLang] of Object.entries(PROMPTS)) {
  for (const lang of ["es", "en"]) {
    const name = `${purpose}/${lang}`;
    try {
      const res = await fetch(`${BASE}/api/analyze`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt: byLang[lang], lang, purpose, target: "claude", sessionId: SESSION }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body) {
        ok("engine", name, false, `status ${res.status}`);
        continue;
      }
      const meta = body.meta ?? {};
      const score = body.score;
      const after = meta.optimizedScore;
      const breakdown = meta.scoreBreakdown ?? {};
      const problems = [];
      if (!(Number.isInteger(score) && score >= 0 && score <= 100)) problems.push(`score ${score}`);
      if (!(Number.isInteger(after) && after >= 0 && after <= 100)) problems.push(`optimizedScore ${after}`);
      for (const d of DIMS) if (typeof breakdown[d] !== "number") problems.push(`breakdown.${d} missing`);
      if (typeof body.optimizedPrompt !== "string" || body.optimizedPrompt.trim().length < 10) problems.push("no optimized prompt");
      if (meta.judge !== undefined) problems.push("judge present although PROMPT_JUDGE_ENABLED is off");
      // Who wrote the optimized prompt: meta.refinement.execution = { engine, fallbackReason? }.
      const execution = meta.refinement?.execution ?? {};
      if (!execution.engine) problems.push("meta.refinement.execution.engine missing");
      if (execution.engine === "deterministic" && !execution.fallbackReason) problems.push("deterministic result without a fallbackReason");
      engineRows.push({ purpose, lang, score, after, delta: after - score, engine: execution.engine ?? null, fallbackReason: execution.fallbackReason ?? null, taskType: meta.taskType ?? null });
      ok("engine", name, problems.length === 0, problems.join("; ") || `score ${score} → ${after}`);
    } catch (e) {
      ok("engine", name, false, e.message);
    }
  }
}
// Same input, same score (the score is deterministic).
{
  const body = JSON.stringify({ prompt: PROMPTS.code.en, lang: "en", purpose: "code", target: "claude", sessionId: SESSION });
  const run = async () => (await (await fetch(`${BASE}/api/analyze`, { method: "POST", headers: { "content-type": "application/json" }, body })).json()).score;
  const [a, b] = [await run(), await run()];
  ok("engine", "same prompt, same score", a === b, `${a} / ${b}`);
}
// Invalid input is a clean 4xx.
{
  const res = await fetch(`${BASE}/api/analyze`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt: "", lang: "xx" }) });
  ok("engine", "invalid body is rejected with 4xx", res.status >= 400 && res.status < 500, `status ${res.status}`);
}

// ── share card + share page ───────────────────────────────────────────────
const XSS = `"><script>alert(1)</script>`;
const CARD_CASES = [
  ["valid", "?s=72&o=91&c=80&x=60&k=70&u=75&v=65&f=90&lang=en"],
  ["no params", ""],
  ["score out of range", "?s=9999&o=-5&lang=en"],
  ["non-numeric", "?s=abc&o=NaN&c=1e9"],
  ["hostile strings", `?s=50&lang=${encodeURIComponent(XSS)}&p=${encodeURIComponent(XSS)}&prompt=${encodeURIComponent("my secret prompt text")}`],
  ["very long value", `?s=${"9".repeat(4000)}`],
];
for (const [name, qs] of CARD_CASES) {
  try {
    const res = await fetch(`${BASE}/api/share/card${qs}`);
    const type = res.headers.get("content-type") ?? "";
    const buf = Buffer.from(await res.arrayBuffer());
    const isImage = type.startsWith("image/");
    const clean4xx = res.status >= 400 && res.status < 500;
    const leaks = !isImage && /script>|secret prompt/i.test(buf.toString("utf8"));
    ok("share card", name, (isImage || clean4xx) && res.status < 500 && !leaks, `status ${res.status} ${type.split(";")[0]} ${buf.length} B`);
  } catch (e) {
    ok("share card", name, false, e.message);
  }
}
for (const lang of ["es", "en"]) {
  const res = await fetch(`${BASE}/${lang}/share?s=50&o=70&p=${encodeURIComponent(XSS)}&t=${encodeURIComponent(XSS)}&lang=${encodeURIComponent(XSS)}`);
  const html = await res.text();
  ok("share page", `/${lang}/share with hostile params`, res.status === 200 && !html.includes("<script>alert(1)</script>"), `status ${res.status}`);
  ok("share page", `/${lang}/share is noindex`, /<meta name="robots" content="[^"]*noindex/i.test(html));
}

// ── noindex where it belongs ──────────────────────────────────────────────
for (const [path, want] of [["/en/library", true], ["/es/library", true], ["/en", false], ["/en/how-it-works", false], ["/es/how-it-works", false], ["/en/analyzer", false], ["/en/benchmarks", false]]) {
  const html = await (await fetch(BASE + path)).text();
  const noindex = /<meta name="robots" content="[^"]*noindex/i.test(html);
  ok("noindex", `${path} ${want ? "is" : "is not"} noindex`, noindex === want);
}

// ── degradation: no JS, storage blocked ───────────────────────────────────
const KEY = ["/en", "/es", "/en/how-it-works", "/en/analyzer", "/en/best-ai", "/en/benchmarks", "/en/blog", "/en/library", "/en/guides/json-output"];
// 200, or 304 when the same browser already holds the page from an earlier check.
const served = (res) => res.status() === 200 || res.status() === 304;
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox"] });
{
  const page = await browser.newPage();
  await page.setJavaScriptEnabled(false);
  for (const path of KEY) {
    const res = await page.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 60_000 });
    const m = await page.evaluate(() => ({ h1: document.querySelectorAll("h1").length, words: (document.body.innerText || "").split(/\s+/).length, nav: document.querySelectorAll("header a, footer a").length }));
    ok("no JavaScript", path, served(res) && m.h1 === 1 && m.words > 40 && m.nav > 5, `h1=${m.h1} words=${m.words} links=${m.nav}`);
  }
  // The home prompt box is a plain GET form to the analyzer without JS.
  await page.goto(`${BASE}/en`, { waitUntil: "domcontentloaded" });
  const form = await page.evaluate(() => {
    const f = document.querySelector("form[action$='/analyzer']");
    return f ? { method: f.method, field: Boolean(f.querySelector("textarea[name=prompt]")) } : null;
  });
  ok("no JavaScript", "home prompt box is a GET form with a 'prompt' field", Boolean(form && form.method === "get" && form.field));
  await page.close();
}
{
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && !/404|favicon|_vercel/.test(m.text())) errors.push(m.text().slice(0, 200));
  });
  await page.evaluateOnNewDocument(() => {
    const boom = () => {
      throw new DOMException("blocked", "SecurityError");
    };
    Object.defineProperty(window, "localStorage", { get: boom });
    Object.defineProperty(window, "sessionStorage", { get: boom });
  });
  for (const path of KEY) {
    errors.length = 0;
    const res = await page.goto(BASE + path, { waitUntil: "networkidle2", timeout: 60_000 });
    await new Promise((r) => setTimeout(r, 5800)); // past the 5 s newsletter prompt
    const h1 = await page.evaluate(() => document.querySelectorAll("h1").length);
    ok("storage blocked", path, served(res) && h1 === 1 && errors.length === 0, errors.slice(0, 2).join(" | "));
  }
  // The home hand-off falls back to the URL when sessionStorage is blocked.
  await page.goto(`${BASE}/en`, { waitUntil: "networkidle2" });
  await page.type("textarea[name=prompt]", "Write a haiku about rain");
  await Promise.all([page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 30_000 }), page.click("form[action$='/analyzer'] button[type=submit]")]);
  ok("storage blocked", "home prompt box falls back to ?prompt=", /\/en\/analyzer\?prompt=/.test(page.url()), page.url().slice(0, 90));
  await page.close();
}
{
  // Normal browser: the prompt travels through sessionStorage, not the URL.
  const page = await browser.newPage();
  await page.goto(`${BASE}/en`, { waitUntil: "networkidle2" });
  await page.type("textarea[name=prompt]", "Write a haiku about rain");
  await Promise.all([page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 30_000 }), page.click("form[action$='/analyzer'] button[type=submit]")]);
  await page.waitForSelector("textarea", { timeout: 30_000 });
  await new Promise((r) => setTimeout(r, 800));
  const value = await page.evaluate(() => document.querySelector("textarea")?.value ?? "");
  ok("hand-off", "home → analyzer keeps the prompt out of the URL", !page.url().includes("haiku") && /handoff=1/.test(page.url()), page.url());
  ok("hand-off", "the analyzer opens with the prompt loaded", value.includes("haiku about rain"), value.slice(0, 40));
  await page.close();
}
await browser.close();

const failed = results.filter((r) => !r.pass);
console.log("\nengine summary:");
console.table(engineRows);
console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`);
if (args.json) await writeFile(args.json, JSON.stringify({ base: BASE, at: new Date().toISOString(), results, engineRows }, null, 2));
process.exit(failed.length ? 1 : 0);
