#!/usr/bin/env node
// scripts/release/a11y-check.mjs
//
// v1.8.1 — keyboard, focus, naming and contrast checks for the surfaces this
// release added or rebuilt, with a real Chrome:
//
//   header     the collapsed menu (phones): opens from the keyboard, exposes
//              aria-expanded/aria-controls, Esc closes it and returns focus;
//              on desktop every link is reachable with Tab and has a name.
//   home       focus is visible on the action links, "How this works", the
//              prompt box and the Latest buttons; one <h1>; <html lang> matches.
//   newsletter the first-visit card opens at ~5 s WITHOUT taking focus, is a
//              non-modal dialog with a named close button, Esc collapses it to
//              the pill, the pill reopens it and then focus moves into the form.
//   names      no button or link without an accessible name on the new pages.
//   contrast   body text, muted text and button labels against their actual
//              background colour, per theme and scheme (WCAG AA: 4.5:1 for
//              normal text). Glass/Aqua surfaces are translucent, so the
//              background is sampled by blending up the ancestor chain over the
//              theme's canvas colour.
//
//   node scripts/release/a11y-check.mjs --base=http://localhost:3182

import puppeteer from "puppeteer-core";

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split(/=(.*)/s).slice(0, 2)));
const BASE = (args.base ?? "http://localhost:3182").replace(/\/+$/, "");
const CHROME = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";

const results = [];
const ok = (group, name, pass, detail = "") => {
  results.push({ group, name, pass });
  console.log(`${pass ? "ok  " : "FAIL"} [${group}] ${name}${detail ? " — " + detail : ""}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox"] });

async function open(path, { width = 1440, height = 900, theme = "aqua", scheme = "light", storage = {} } = {}) {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1, isMobile: width < 600, hasTouch: width < 600 });
  await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: scheme }]);
  await page.evaluateOnNewDocument(
    (t, s) => {
      try {
        localStorage.setItem("theme", t);
        for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v);
      } catch {}
    },
    theme,
    storage
  );
  await page.goto(BASE + path, { waitUntil: "networkidle2", timeout: 60_000 });
  return { page, context };
}
const QUIET = { "promptea:newsletter-nudges": JSON.stringify({ subscribed: true }) };

// ── header: collapsed menu on a phone ─────────────────────────────────────
for (const path of ["/en", "/es/guides"]) {
  const { page, context } = await open(path, { width: 375, height: 812, storage: QUIET });
  const btn = "[data-nav-toggle]";
  const before = await page.$eval(btn, (b) => ({ expanded: b.getAttribute("aria-expanded"), controls: b.getAttribute("aria-controls"), name: (b.getAttribute("aria-label") || b.textContent || "").trim() }));
  ok("header", `${path}: menu button is named and collapsed`, before.expanded === "false" && Boolean(before.controls) && before.name.length > 0, JSON.stringify(before));
  await page.focus(btn);
  await page.keyboard.press("Enter");
  await sleep(150);
  const opened = await page.evaluate((sel) => {
    const b = document.querySelector(sel);
    const panel = document.getElementById(b.getAttribute("aria-controls"));
    return { expanded: b.getAttribute("aria-expanded"), visible: panel && !panel.hidden && panel.getBoundingClientRect().height > 0, links: panel ? panel.querySelectorAll("a").length : 0 };
  }, btn);
  ok("header", `${path}: Enter opens the menu`, opened.expanded === "true" && opened.visible && opened.links === 9, JSON.stringify(opened));
  await page.keyboard.press("Tab");
  const inPanel = await page.evaluate((sel) => document.getElementById(document.querySelector(sel).getAttribute("aria-controls")).contains(document.activeElement), btn);
  ok("header", `${path}: Tab moves into the menu links`, inPanel || (await page.evaluate(() => document.activeElement?.tagName === "A")));
  await page.keyboard.press("Escape");
  await sleep(150);
  const closed = await page.evaluate((sel) => ({ expanded: document.querySelector(sel).getAttribute("aria-expanded"), focusBack: document.activeElement === document.querySelector(sel) }), btn);
  ok("header", `${path}: Esc closes it and returns focus to the button`, closed.expanded === "false" && closed.focusBack, JSON.stringify(closed));
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok("header", `${path}: no horizontal overflow at 375`, overflow <= 1, `${overflow}px`);
  await context.close();
}

// ── home: focus visibility, heading, lang ─────────────────────────────────
for (const [lang, theme, scheme] of [["en", "aqua", "light"], ["es", "glass", "dark"], ["en", "metro", "dark"]]) {
  const { page, context } = await open(`/${lang}`, { theme, scheme, storage: QUIET });
  const basics = await page.evaluate(() => ({ h1: document.querySelectorAll("h1").length, lang: document.documentElement.lang, navs: [...document.querySelectorAll("nav[aria-label]")].filter((n) => n.offsetParent !== null).map((n) => n.getAttribute("aria-label")) }));
  ok("home", `/${lang} ${theme}: one <h1>, <html lang="${lang}">`, basics.h1 === 1 && basics.lang === lang, JSON.stringify(basics));
  // Tab through the page and collect what gets focus and whether a focus indicator is painted.
  const seen = [];
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press("Tab");
    const f = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const cs = getComputedStyle(el);
      const ring = (cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0) || (cs.boxShadow && cs.boxShadow !== "none");
      const r = el.getBoundingClientRect();
      return { tag: el.tagName, text: (el.getAttribute("aria-label") || el.textContent || el.getAttribute("placeholder") || "").trim().slice(0, 40), ring: Boolean(ring), visible: r.width > 0 && r.height > 0, href: el.getAttribute("href") };
    });
    if (f) seen.push(f);
  }
  const hrefs = seen.map((s) => s.href).filter(Boolean);
  const must = [`/${lang}/analyzer`, `/${lang}/best-ai`, `/${lang}/how-it-works`, `/${lang}/blog`];
  ok("home", `/${lang} ${theme}: header links, the two actions and "how it works" are reachable with Tab`, must.every((m) => hrefs.includes(m)), hrefs.slice(0, 16).join(" "));
  ok("home", `/${lang} ${theme}: the prompt textarea is reachable with Tab`, seen.some((s) => s.tag === "TEXTAREA"));
  const noRing = seen.filter((s) => s.visible && !s.ring);
  ok("home", `/${lang} ${theme}: every focused control paints a focus indicator`, noRing.length === 0, noRing.slice(0, 4).map((s) => `${s.tag}:${s.text}`).join(" | "));
  const unnamed = await page.evaluate(() =>
    [...document.querySelectorAll("a, button")]
      .filter((el) => el.offsetParent !== null)
      .filter((el) => !(el.getAttribute("aria-label") || el.textContent || el.getAttribute("title") || "").trim() && !el.querySelector("img[alt]:not([alt=''])"))
      .map((el) => el.outerHTML.slice(0, 80))
  );
  ok("names", `/${lang} ${theme}: no link or button without an accessible name`, unnamed.length === 0, unnamed.slice(0, 3).join(" | "));
  await context.close();
}
for (const path of ["/en/how-it-works", "/es/benchmarks"]) {
  const { page, context } = await open(path, { storage: QUIET });
  const unnamed = await page.evaluate(() => [...document.querySelectorAll("a, button")].filter((el) => el.offsetParent !== null && !(el.getAttribute("aria-label") || el.textContent || el.getAttribute("title") || "").trim()).length);
  const imgs = await page.evaluate(() => [...document.querySelectorAll("svg[role=img]")].map((s) => Boolean(s.getAttribute("aria-label") || s.querySelector("title")) && Boolean(s.getAttribute("aria-describedby") ? document.getElementById(s.getAttribute("aria-describedby")) : true)));
  ok("names", `${path}: named controls; role="img" graphics have a name and a description`, unnamed === 0 && imgs.every(Boolean), `unnamed=${unnamed} imgs=${imgs.length}`);
  await context.close();
}

// ── newsletter card ───────────────────────────────────────────────────────
{
  const { page, context } = await open("/en/guides");
  const early = await page.evaluate(() => Boolean(document.querySelector("[data-newsletter-card]")));
  ok("newsletter", "nothing is shown before 5 s", !early);
  await page.focus("header a");
  const focusedBefore = await page.evaluate(() => document.activeElement?.outerHTML.slice(0, 60));
  await page.waitForSelector("[data-newsletter-card]", { timeout: 9000 });
  await sleep(400);
  const card = await page.evaluate(() => {
    const c = document.querySelector("[data-newsletter-card]");
    const close = c.querySelector("button[aria-label]");
    return {
      variant: c.dataset.newsletterCard,
      role: c.getAttribute("role"),
      modal: c.getAttribute("aria-modal"),
      labelled: Boolean(document.getElementById(c.getAttribute("aria-labelledby"))?.textContent.trim()),
      closeName: close?.getAttribute("aria-label"),
      form: Boolean(c.querySelector("input[type=email]")),
      focusInside: c.contains(document.activeElement),
      active: document.activeElement?.outerHTML.slice(0, 60),
      backdrop: Boolean(document.querySelector(".bg-black\\/55")),
      scrollLocked: document.body.style.overflow === "hidden",
    };
  });
  ok("newsletter", "first visit: the card opens by itself, full, with the form", card.variant === "full" && card.form, JSON.stringify(card).slice(0, 160));
  ok("newsletter", "it is a named, non-modal dialog (no backdrop, no scroll lock)", card.role === "dialog" && card.modal === "false" && card.labelled && !card.backdrop && !card.scrollLocked);
  ok("newsletter", "it does not take focus", !card.focusInside && card.active === focusedBefore, card.active);
  ok("newsletter", "its close button has an accessible name", Boolean(card.closeName));
  await page.keyboard.press("Escape");
  await sleep(350);
  const afterEsc = await page.evaluate(() => ({ card: Boolean(document.querySelector("[data-newsletter-card]")), pill: Boolean(document.querySelector(".newsletter-pill")) }));
  ok("newsletter", "Esc collapses it to the pill", !afterEsc.card && afterEsc.pill, JSON.stringify(afterEsc));
  await page.click(".newsletter-pill button");
  await sleep(400);
  const reopened = await page.evaluate(() => {
    const c = document.querySelector("[data-newsletter-card]");
    return { open: Boolean(c), focusInside: Boolean(c?.contains(document.activeElement)), activeType: document.activeElement?.getAttribute("type") };
  });
  ok("newsletter", "the pill reopens it, and then focus moves into the form", reopened.open && reopened.focusInside && reopened.activeType === "email", JSON.stringify(reopened));
  // Second visit: only the pill.
  await page.reload({ waitUntil: "networkidle2" });
  await sleep(6300);
  const second = await page.evaluate(() => ({ card: Boolean(document.querySelector("[data-newsletter-card]")), pill: Boolean(document.querySelector(".newsletter-pill")), visible: document.querySelector(".newsletter-pill-wrap")?.classList.contains("is-visible") }));
  ok("newsletter", "next visit: only the pill, the card does not reopen by itself", !second.card && second.pill && second.visible, JSON.stringify(second));
  await context.close();
}
{
  // Home on desktop: the in-page form (side column) and the floating card never show together.
  const { page, context } = await open("/en", { width: 1440, height: 1200 });
  await sleep(6300);
  const both = await page.evaluate(() => {
    const inline = [...document.querySelectorAll("[data-newsletter-inline]")].filter((f) => {
      const r = f.getBoundingClientRect();
      return r.width > 0 && r.bottom > 0 && r.top < innerHeight;
    }).length;
    const wrap = document.querySelector(".newsletter-pill-wrap");
    return { inlineOnScreen: inline, floatingVisible: wrap?.classList.contains("is-visible") };
  });
  ok("newsletter", "home: with the in-page form on screen the floating card stays away", !(both.inlineOnScreen > 0 && both.floatingVisible), JSON.stringify(both));
  await context.close();
}
{
  // Phone: compact row; on the phone analyzer nothing opens by itself.
  const a = await open("/es/prompts", { width: 375, height: 812 });
  await a.page.waitForSelector("[data-newsletter-card]", { timeout: 9000 });
  const compact = await a.page.evaluate(() => {
    const c = document.querySelector("[data-newsletter-card]");
    const r = c.getBoundingClientRect();
    return { variant: c.dataset.newsletterCard, height: Math.round(r.height), bottom: Math.round(innerHeight - r.bottom), overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  });
  ok("newsletter", "phone: the self-opened card is the compact row (< 100 px tall, inside the viewport)", compact.variant === "compact" && compact.height < 100 && compact.bottom >= 0 && compact.overflow <= 1, JSON.stringify(compact));
  await a.context.close();
  const b = await open("/es/analyzer", { width: 375, height: 812 });
  await sleep(6500);
  const tool = await b.page.evaluate(() => {
    const ta = document.querySelector("textarea")?.getBoundingClientRect();
    const wrap = document.querySelector(".newsletter-pill-wrap");
    const el = wrap?.firstElementChild?.getBoundingClientRect();
    const overlap = ta && el && wrap.classList.contains("is-visible") ? !(el.left >= ta.right || el.right <= ta.left || el.top >= ta.bottom || el.bottom <= ta.top) : false;
    return { card: Boolean(document.querySelector("[data-newsletter-card]")), overlapsTextarea: overlap };
  });
  ok("newsletter", "phone analyzer: no self-opened card, nothing over the text box", !tool.card && !tool.overlapsTextarea, JSON.stringify(tool));
  await b.context.close();
}

// ── contrast ──────────────────────────────────────────────────────────────
const CASES = [["aqua", "light"], ["glass", "light"], ["glass", "dark"], ["metro", "dark"]];
// v1.8.5: every element per page is held to 4.5:1, Aqua's primary button included
// (its accent moved from #007aff to #0061cc). The analyzer adds the accent text
// and the accent badge of the AI Daily promo, which share the same token.
const CONTRAST_PAGES = [
  ["/en", {
    tagline: "main header p",
    "action title": ".home-action-title",
    "action description": ".home-actions li p",
    "how-this-works button": "a[href$='/how-it-works']",
    "prompt box explanation": "form[action$='/analyzer'] h2 + p",
    "prompt box hint": "form[action$='/analyzer'] p[aria-live]",
    "primary button label": "form[action$='/analyzer'] button[type=submit]",
    "nav link": "header nav a",
    "newsletter body": "aside section p",
    "footer link": "footer a",
  }],
  ["/en/analyzer", {
    "accent badge (AI Daily promo)": "main a[href$='/blog'] .badge-accent",
    "accent link text (AI Daily promo)": "main a[href$='/blog'] .text-accent",
  }],
];
for (const [path, pick] of CONTRAST_PAGES)
for (const [theme, scheme] of CASES) {
  const { page, context } = await open(path, { theme, scheme, storage: QUIET });
  const rows = await page.evaluate((pick) => {
    const parse = (c) => {
      const m = /rgba?\(([^)]+)\)/.exec(c);
      if (!m) return null;
      const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
      return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
    };
    const lum = ({ r, g, b }) => {
      const f = (v) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const over = (top, bottom) => ({ r: top.r * top.a + bottom.r * (1 - top.a), g: top.g * top.a + bottom.g * (1 - top.a), b: top.b * top.a + bottom.b * (1 - top.a), a: 1 });
    // Canvas colour of the theme: the page's base under every translucent surface.
    const probe = document.createElement("div");
    probe.style.cssText = "position:fixed;background:var(--canvas);width:1px;height:1px";
    document.body.appendChild(probe);
    const canvas = parse(getComputedStyle(probe).backgroundColor) ?? { r: 255, g: 255, b: 255, a: 1 };
    probe.remove();
    // Every background an element may sit on: its nearest painted colour, or — when the
    // element is painted with a gradient (Glass buttons) — each opaque stop of that gradient.
    const bgsOf = (el) => {
      const layers = [];
      let stops = null;
      for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
        const cs = getComputedStyle(n);
        if (!stops && /gradient\(/.test(cs.backgroundImage)) {
          const found = [...cs.backgroundImage.matchAll(/rgba?\([^)]+\)/g)].map((m) => parse(m[0])).filter((c) => c && c.a >= 0.9);
          if (found.length) {
            stops = found;
            break;
          }
        }
        const c = parse(cs.backgroundColor);
        if (c && c.a > 0) layers.push(c);
        if (c && c.a === 1) break;
      }
      const bases = stops ?? [{ ...canvas, a: 1 }];
      return bases.map((b0) => {
        let base = { ...b0, a: 1 };
        for (const l of [...layers].reverse()) base = over(l, base);
        return base;
      });
    };
    // Worst case over the possible backgrounds.
    const ratio = (el) => {
      const fg0 = parse(getComputedStyle(el).color);
      if (!fg0) return null;
      const all = bgsOf(el).map((bg) => {
        const fg = over(fg0, bg);
        const [a, b] = [lum(fg), lum(bg)].sort((x, y) => y - x);
        return (a + 0.05) / (b + 0.05);
      });
      return Math.round(Math.min(...all) * 100) / 100;
    };
    return Object.entries(pick).map(([name, sel]) => {
      const el = [...document.querySelectorAll(sel)].find((e) => e.offsetParent !== null);
      return { name, ratio: el ? ratio(el) : null, size: el ? parseFloat(getComputedStyle(el).fontSize) : null };
    });
  }, pick);
  for (const r of rows) {
    if (r.ratio === null) {
      ok("contrast", `${theme}/${scheme}: ${r.name}`, false, "element not found");
      continue;
    }
    // Measured for the first time in v1.8.5 and left to the owner: in Metro and Glass light the
    // accent text and badges use each theme's own accent, below 4.5:1 there (docs/release/v1.8.5/report.md,
    // finding N-1). Aqua, the default theme, is held to 4.5:1 everywhere.
    const known = r.ratio < 4.5 && ((theme === "metro" && /accent (badge|link text)/.test(r.name)) || (theme === "glass" && scheme === "light" && /accent badge/.test(r.name)));
    if (known) {
      console.log(`known [contrast] ${path} ${theme}/${scheme}: ${r.name} ${r.ratio}:1 (pre-existing in this theme; owner decision, v1.8.5 report N-1)`);
      continue;
    }
    ok("contrast", `${path} ${theme}/${scheme}: ${r.name} ${r.ratio}:1`, r.ratio >= 4.5, `${r.size}px`);
  }
  await context.close();
}

await browser.close();
const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`);
process.exit(failed.length ? 1 : 0);
