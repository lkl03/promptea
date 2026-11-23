// v1.8.10 — /zh/llms.txt lists the AI Daily stories the routines also wrote in
// Chinese (locales.zh, since v1.8.8). Before, zh was treated like pt (no edition
// of its own) and listed none, even after the first Chinese story was published
// on 2026-11-22. Stories without Chinese text stay out: under /zh they are read
// in English, and /en/llms.txt already lists them.

import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeArticle } from "./seo.fixtures";
import type { PublicArticle } from "@/lib/blog/types";

vi.mock("server-only", () => ({}));

const loadArticles = vi.fn();
const loadEditions = vi.fn();
vi.mock("@/lib/seo/dynamic", () => ({
  loadArticles: (...a: unknown[]) => loadArticles(...a),
  loadEditions: (...a: unknown[]) => loadEditions(...a),
  loadBenchmarksSnapshot: async () => null,
}));

import { buildLlmsFullTxt, buildLlmsTxt, summaryText, type LlmsInput } from "@/lib/seo/llms";
import { loadLlmsInput } from "@/lib/seo/serve";
import { absUrl, type Locale } from "@/lib/seo/site";

const empty = (lang: Locale): LlmsInput => ({ lang, articles: [], editions: [], benchmarks: null });

/** A story the routine also wrote in Chinese, as the zh projection returns it. */
const zhStory = (slug: string, eventDate: string, edition = "daily", title = `中文标题 ${slug}`) =>
  makeArticle({
    slug: `${slug}-zh`,
    eventDate,
    lang: "zh",
    edition,
    title,
    alternateSlugs: { en: slug, es: `${slug}-es`, zh: `${slug}-zh` },
  } as Parameters<typeof makeArticle>[0]);

/** An older story with no Chinese text: under zh the loader returns its English text. */
const enFallback = (slug: string, eventDate: string) => makeArticle({ slug, eventDate, lang: "en", title: `English only ${slug}` });

const links = (md: string) => [...md.matchAll(/\]\((https?:\/\/[^)\s]+)\)/g)].map((m) => m[1]);

beforeEach(() => {
  loadArticles.mockReset();
  loadEditions.mockReset();
  loadEditions.mockResolvedValue([]);
});

describe("loadLlmsInput", () => {
  it("zh: loads the zh projection and keeps only the stories written in Chinese; no weekly digest", async () => {
    loadArticles.mockResolvedValue([zhStory("week-ahead", "2026-11-22", "week-ahead"), enFallback("older", "2026-11-20")]);
    const input = await loadLlmsInput("zh");
    expect(loadArticles).toHaveBeenCalledWith("zh", 200);
    expect(input.articles.map((a) => a.lang)).toEqual(["zh"]);
    expect(loadEditions).not.toHaveBeenCalled();
  });

  it("pt: still lists no stories (AI Daily has no Portuguese edition)", async () => {
    const input = await loadLlmsInput("pt");
    expect(loadArticles).not.toHaveBeenCalled();
    expect(input.articles).toEqual([]);
  });

  it("en/es: unchanged, every story of the language plus the weekly digest", async () => {
    const en = [makeArticle({ slug: "one", eventDate: "2026-11-21" }), makeArticle({ slug: "two", eventDate: "2026-11-22" })];
    loadArticles.mockResolvedValue(en);
    const input = await loadLlmsInput("en");
    expect(loadArticles).toHaveBeenCalledWith("en", 200);
    expect(input.articles).toHaveLength(2);
    expect(loadEditions).toHaveBeenCalled();
  });
});

describe("/zh/llms.txt", () => {
  it("lists the Chinese stories under their edition, linking the zh markdown twin", () => {
    const daily = zhStory("gpt-launch", "2026-11-24", "daily", "OpenAI发布新模型");
    const ahead = zhStory("week-ahead-2026-11-22", "2026-11-22", "week-ahead", "下周看点：Dell、HP和Workday周二发布财报");
    const txt = buildLlmsTxt({ ...empty("zh"), articles: [ahead, daily] });

    expect(txt).toContain("## AI Daily：最新新闻");
    expect(txt).toContain("## AI Daily：下周展望");
    expect(links(txt)).toContain(absUrl("/zh/blog/week-ahead-2026-11-22-zh.md"));
    expect(links(txt)).toContain(absUrl("/zh/blog/gpt-launch-zh.md"));
    expect(txt).toContain("下周看点：Dell、HP和Workday周二发布财报");
    // the explanation and the links to the other editions are still there
    expect(txt).toContain(`- [AI Daily（中文）](${absUrl("/zh/blog")})`);
    expect(txt).toContain(absUrl("/en/llms.txt"));
    // daily stories come before the week-ahead edition, as on /en
    expect(txt.indexOf("## AI Daily：最新新闻")).toBeLessThan(txt.indexOf("## AI Daily：下周展望"));
  });

  it("never lists the English text of a story without Chinese text", () => {
    const txt = buildLlmsTxt({ ...empty("zh"), articles: [enFallback("older-story", "2026-11-20"), zhStory("new", "2026-11-22")] });
    expect(txt).not.toContain("English only older-story");
    expect(links(txt).some((l) => l.includes("/blog/older-story"))).toBe(false);
    expect(links(txt)).toContain(absUrl("/zh/blog/new-zh.md"));
  });

  it("with no Chinese stories yet, shows no story headings (as before)", () => {
    const txt = buildLlmsTxt(empty("zh"));
    expect(txt).not.toContain("## AI Daily：");
    expect(txt).toContain("## AI Daily");
  });

  it("pt keeps pointing at the English and Spanish editions without listing stories", () => {
    const txt = buildLlmsTxt({ ...empty("pt"), articles: [enFallback("story", "2026-11-20")] });
    expect(links(txt).some((l) => /\/blog\/story/.test(l))).toBe(false);
    expect(txt).toContain(absUrl("/en/llms.txt"));
  });

  it("the summary no longer says AI Daily is only in English and Spanish", () => {
    expect(summaryText("zh")).not.toContain("只有英文和西班牙文");
    expect(summaryText("zh")).toContain("新报道也有中文版");
  });
});

describe("/zh/llms-full.txt", () => {
  it("includes the Chinese stories in full", () => {
    const story: PublicArticle = zhStory("week-ahead-2026-11-22", "2026-11-22", "week-ahead", "下周看点：三家公司周二发布财报");
    const txt = buildLlmsFullTxt({ ...empty("zh"), articles: [story] });
    expect(txt).toContain("# AI Daily：最新新闻");
    expect(txt).toContain("下周看点：三家公司周二发布财报");
  });
});
