// v1.8.1 — the redesigned home page, the unified header and /how-it-works.
// These are contract tests: structure that the redesign promised and that a
// later edit could silently undo (one header for every page, strings in the
// dictionaries, button hierarchy, the SEO content kept on its own page).

import { describe, expect, test } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { storyLabel } from "@/components/home/LatestDaily";
import { HANDOFF_PROMPT_MAX, HOME_PROMPT_MAX, stashPromptForAnalyzer } from "@/components/home/HomePromptBox";
import { timelineSource } from "@/components/home/XFeed";
import { NAV_LINKS } from "@/components/TopBar";
import { HANDOFF_KEY } from "@/lib/matcher/handoff";
import { resolveXFeedSource } from "@/lib/social";
import { homeAboutDoc, howItWorksDoc } from "@/lib/seo/content/sitePages";
import { CORE_PAGES, allStaticSeoUrls } from "@/lib/seo/registry";
import { LOCALES } from "@/lib/seo/site";
import { SCORE_DIMENSIONS } from "@/lib/seo/facts";

const root = process.cwd();
const read = (...p: string[]) => readFileSync(join(root, ...p), "utf8");
const dict = (lang: string) => JSON.parse(read("app", "[lang]", "dictionaries", `${lang}.json`));

describe("one header for every page", () => {
  const topBar = read("components", "TopBar.tsx");
  const home = read("app", "[lang]", "page.tsx");
  const layout = read("app", "[lang]", "layout.tsx");

  test("the header no longer steps aside on the home page, and the home renders no controls of its own", () => {
    expect(topBar).not.toMatch(/return null/);
    expect(layout.match(/<TopBar /g)).toHaveLength(1);
    expect(home).not.toMatch(/LanguageSwitcher|ThemeToggle/);
  });

  test("the navigation carries the five resources the home used to list loose, plus the tools", () => {
    const keys = NAV_LINKS.map((l) => l.key);
    for (const k of ["prompts", "guides", "models", "glossary", "library"]) expect(keys).toContain(k);
    for (const k of ["analyzer", "bestAi", "daily", "benchmarks"]) expect(keys).toContain(k);
    expect(new Set(NAV_LINKS.map((l) => l.path)).size).toBe(NAV_LINKS.length);
  });

  test("labels come from the dictionaries (both locales), never from the component", () => {
    for (const lang of LOCALES) {
      const nav = dict(lang).nav;
      for (const l of NAV_LINKS) expect(nav[l.key], `${lang}.nav.${l.key}`).toBeTruthy();
      for (const k of ["main", "home", "menu", "closeMenu"]) expect(nav[k]).toBeTruthy();
    }
    expect(topBar).not.toMatch(/label: \{ es:/);
    expect(topBar).not.toMatch(/lang === "es" \?/);
  });

  test("the collapsed menu is an accessible disclosure", () => {
    expect(topBar).toMatch(/aria-expanded=\{open\}/);
    expect(topBar).toMatch(/aria-controls=\{panelId\}/);
    expect(topBar).toMatch(/e\.key === "Escape"/);
    expect(topBar).toMatch(/hidden=\{!open\}/);
  });
});

describe("home page structure", () => {
  const file = read("app", "[lang]", "page.tsx");
  // The component only: the header comment explains what was removed, and names it.
  const home = file.slice(file.indexOf("export default async function"));

  test("the long blocks left the home: no about section, no video, no tool cards, no marquee", () => {
    expect(home).not.toMatch(/HomeAbout|ShowcaseVideo|HubCards|NewsMarquee/);
    expect(existsSync(join(root, "components", "home", "HubCards.tsx"))).toBe(false);
    expect(existsSync(join(root, "components", "home", "HomeAbout.tsx"))).toBe(false);
  });

  test("reading order: heading, actions + how it works, prompt box, stories, benchmarks; X and newsletter aside", () => {
    const order = ["<h1", "t.actionsAria", "/how-it-works", "<HomePromptBox", "<LatestDaily", "<BenchmarksTeaser", "<aside", "<XFeed"];
    const at = order.map((m) => home.indexOf(m));
    expect(at.every((i) => i > 0), JSON.stringify(at)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
  });

  test("exactly one <h1>, and it still says what Promptea is", () => {
    expect(home.match(/<h1/g)).toHaveLength(1);
    for (const lang of LOCALES) expect(homeAboutDoc(lang).h1).toMatch(/^Promptea — /);
  });

  test("the home still renders statically (no searchParams, short revalidation)", () => {
    expect(file).toMatch(/export const revalidate = 300/);
    expect(file.replace(/^\s*\/\/.*$/gm, "")).not.toMatch(/searchParams/);
  });
});

describe("prompt box", () => {
  test("its explanation says what you get, in both languages, without overpromising", () => {
    const en = dict("en").hub.promptBox.explain as string;
    const es = dict("es").hub.promptBox.explain as string;
    expect(en).toMatch(/0–100/);
    expect(en).toMatch(/six criteria/);
    expect(en).toMatch(/optimized/);
    expect(en).toMatch(/no account/i);
    expect(es).toMatch(/0 a 100/);
    expect(es).toMatch(/seis criterios/);
    expect(es).toMatch(/sin cuenta/i);
    // "six criteria" is a fact of the engine, not copy.
    expect(SCORE_DIMENSIONS).toHaveLength(6);
  });

  test("the prompt is handed to the analyzer through sessionStorage, not the URL", () => {
    const store = new Map<string, string>();
    const ok = stashPromptForAnalyzer("Write a haiku about rain", { setItem: (k, v) => void store.set(k, v) });
    expect(ok).toBe(true);
    expect(JSON.parse(store.get(HANDOFF_KEY)!)).toEqual({ prompt: "Write a haiku about rain" });
    const src = read("components", "home", "HomePromptBox.tsx");
    expect(src).toMatch(/analyzer\?handoff=1/);
  });

  test("long prompts are capped at the analyzer's limit; blocked storage falls back", () => {
    const store = new Map<string, string>();
    stashPromptForAnalyzer("x".repeat(HANDOFF_PROMPT_MAX + 500), { setItem: (k, v) => void store.set(k, v) });
    expect(JSON.parse(store.get(HANDOFF_KEY)!).prompt).toHaveLength(HANDOFF_PROMPT_MAX);
    expect(stashPromptForAnalyzer("hi", null)).toBe(false);
    expect(
      stashPromptForAnalyzer("hi", {
        setItem: () => {
          throw new Error("QuotaExceededError");
        },
      })
    ).toBe(false);
    expect(HOME_PROMPT_MAX).toBeLessThan(HANDOFF_PROMPT_MAX);
  });
});

describe("Latest in AI Daily", () => {
  const cats = { other: "Other", digest: "Digest", business: "Business" };
  const eds = { daily: "Daily", "daily-morning": "Morning", "weekly-recap": "Week in review", "week-ahead": "Week ahead" };

  test("weekly editions are labelled by edition, never 'Other' / 'Digest'", () => {
    expect(storyLabel({ category: "other", edition: "week-ahead" }, cats, eds)).toBe("Week ahead");
    expect(storyLabel({ category: "digest", edition: "weekly-recap" }, cats, eds)).toBe("Week in review");
  });

  test("daily stories keep their topic", () => {
    expect(storyLabel({ category: "business", edition: "daily" }, cats, eds)).toBe("Business");
    expect(storyLabel({ category: "business", edition: "daily-morning" }, cats, eds)).toBe("Business");
  });

  test("both dictionaries name both weekly editions", () => {
    for (const lang of LOCALES) {
      const e = dict(lang).blog.edition;
      expect(e["week-ahead"]).toBeTruthy();
      expect(e["weekly-recap"]).toBeTruthy();
    }
  });

  test("button hierarchy: 'See all stories' is primary, 'Weekly digest' is ghost", () => {
    const src = read("components", "home", "LatestDaily.tsx");
    expect(src).toMatch(/href=\{`\/\$\{lang\}\/blog`\} className="btn btn-primary[^"]*">\s*\{dict\.all\}/);
    expect(src).toMatch(/href=\{`\/\$\{lang\}\/blog\/weekly`\} className="btn btn-ghost[^"]*">\s*\{dict\.weekly\}/);
  });

  test("the top story is not laid out beside the list (no stretched, half-empty card)", () => {
    const src = read("components", "home", "LatestDaily.tsx");
    expect(src).not.toMatch(/lg:grid-cols-\[minmax\(0,1\.15fr\)/);
  });
});

describe("X feed source", () => {
  test("no handle, no card", () => {
    expect(resolveXFeedSource(undefined, undefined, undefined)).toBeNull();
    expect(resolveXFeedSource("", "https://x.com", "123456789")).toBeNull();
  });

  test("a handle gives the profile timeline; a valid list id switches the source", () => {
    expect(resolveXFeedSource("@promptea_me", undefined, undefined)).toEqual({ kind: "profile", handle: "promptea_me" });
    const list = resolveXFeedSource("promptea_me", undefined, " 1234567890123 ");
    expect(list).toEqual({ kind: "list", handle: "promptea_me", listId: "1234567890123" });
    expect(timelineSource(list!)).toEqual({ sourceType: "list", id: "1234567890123" });
    expect(timelineSource({ kind: "profile", handle: "promptea_me" })).toEqual({ sourceType: "profile", screenName: "promptea_me" });
  });

  test("a malformed list id is ignored (never passed to the embed)", () => {
    for (const bad of ["abc", "12", "123456789'); alert(1)//", "https://x.com/i/lists/1"]) {
      expect(resolveXFeedSource("promptea_me", undefined, bad)).toEqual({ kind: "profile", handle: "promptea_me" });
    }
  });

  test("the card stays a click-to-load facade with a fixed height", () => {
    const src = read("components", "home", "XFeed.tsx");
    expect(src).toMatch(/onClick=\{load\}/);
    expect(src).toMatch(/style=\{\{ height: FEED_HEIGHT \}\}/);
    expect(src).not.toMatch(/useEffect\(\(\) => \{\s*load\(\)/);
  });
});

describe("/how-it-works keeps the SEO content that left the home", () => {
  test("it is a registered page with a markdown twin, in both locales", () => {
    expect(CORE_PAGES.some((p) => p.id === "how-it-works" && p.markdown)).toBe(true);
    const urls = allStaticSeoUrls().map((u) => u.path);
    for (const lang of LOCALES) expect(urls).toContain(`/${lang}/how-it-works`);
    // lib/seo/mdResolve.ts is server-only: check its source.
    const md = read("lib", "seo", "mdResolve.ts");
    expect(md).toMatch(/\["how-it-works"\],/);
    expect(md).toMatch(/kind === "how-it-works"/);
    expect(existsSync(join(root, "app", "[lang]", "how-it-works", "page.tsx"))).toBe(true);
  });

  test("it carries the six scoring criteria, the steps and the FAQ", () => {
    for (const lang of LOCALES) {
      const doc = howItWorksDoc(lang);
      const text = JSON.stringify(doc);
      for (const d of SCORE_DIMENSIONS) expect(text).toContain(d.label[lang]);
      expect(doc.steps?.steps.length).toBeGreaterThanOrEqual(3);
      expect(doc.faq.length).toBeGreaterThanOrEqual(5);
      expect(doc.title.length + " · Promptea".length).toBeLessThanOrEqual(65);
      expect(doc.description.length).toBeLessThanOrEqual(175);
    }
  });

  test("the home document is the short one and links to it", () => {
    for (const lang of LOCALES) {
      const doc = homeAboutDoc(lang);
      expect(doc.faq).toEqual([]);
      expect(doc.steps).toBeUndefined();
      expect(JSON.stringify(doc)).toContain(`/${lang}/how-it-works`);
    }
  });

  test("the page renders the video and the document, and the home links to it", () => {
    const page = read("app", "[lang]", "how-it-works", "page.tsx");
    expect(page).toMatch(/<ShowcaseVideo /);
    expect(page).toMatch(/<DocSections /);
    expect(page).toMatch(/kind: "how-it-works"/);
    expect(read("app", "[lang]", "page.tsx")).toMatch(/href=\{`\/\$\{l\}\/how-it-works`\}/);
  });
});
