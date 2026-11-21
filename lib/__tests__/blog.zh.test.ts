// v1.8.8 — AI Daily in Simplified Chinese: the optional `locales.zh` of a story,
// and what it changes for SEO (canonical, hreflang, sitemap) and the home.

import { describe, expect, test } from "vitest";
import { PublishPayloadSchema } from "@/lib/blog/types";
import type { LocaleContent, PublicArticle } from "@/lib/blog/types";
import { makeEnLocale, makePayload } from "./blog.fixtures";
import { articleUrl } from "@/lib/seo/dynamicUrls";
import { zhBlogIndexUrls } from "@/lib/seo/registry";
import { selectMarqueeItems } from "@/lib/blog/marquee";
import { pageMetadata } from "@/lib/seo/metadata";
import { ARTICLE_LANGS, blogLangFor, contentLangFor } from "@/lib/domain";

function zhLocale(overrides: Partial<LocaleContent> = {}): LocaleContent {
  const en = makeEnLocale();
  return {
    ...en,
    title: "Example Labs发布Orion：40万token上下文，输出价格更低",
    deck: "Example Labs发布了Orion的模型卡：上下文窗口为40万token，输出价格下调，今天起在公开API中提供。",
    summary: "Example Labs发布Orion：上下文窗口扩大到40万token，输出价格更低，并从今天起在公开API中提供。这篇报道说明了哪些已经确认、哪些还不清楚。",
    seoTitle: "Example Labs发布Orion（40万上下文）",
    metaDescription: "Example Labs发布了Orion的模型卡：40万token上下文窗口、更低的输出价格，今天起可通过公开API使用。",
    ...overrides,
  };
}

describe("the publish contract accepts an optional Chinese locale", () => {
  test("es + en only is still valid (the routines before v1.8.8)", () => {
    expect(PublishPayloadSchema.safeParse(makePayload()).success).toBe(true);
  });

  test("es + en + zh is valid", () => {
    const p = makePayload({ locales: { en: makeEnLocale(), es: makePayload().locales.es, zh: zhLocale() } });
    const r = PublishPayloadSchema.safeParse(p);
    expect(r.success).toBe(true);
    expect(r.success && r.data.locales.zh?.title).toContain("发布");
  });

  test("zh must be the same story: same number of takeaways and why-it-matters points", () => {
    const en = makeEnLocale();
    const bad = makePayload({ locales: { en, es: makePayload().locales.es, zh: zhLocale({ keyTakeaways: ["只有一个要点。"] }) } });
    const r = PublishPayloadSchema.safeParse(bad);
    expect(en.keyTakeaways.length).toBeGreaterThan(1);
    expect(r.success).toBe(false);
    expect(JSON.stringify(r.error?.issues)).toContain("key takeaways");
  });

  test("zh must actually be Chinese", () => {
    const r = PublishPayloadSchema.safeParse(makePayload({ locales: { en: makeEnLocale(), es: makePayload().locales.es, zh: makeEnLocale() } }));
    expect(r.success).toBe(false);
    expect(JSON.stringify(r.error?.issues)).toContain("written in Chinese");
  });

  test("a zh slug can be the English one (ASCII), but never a page of the blog", () => {
    const same = makePayload({ locales: { en: makeEnLocale(), es: makePayload().locales.es, zh: zhLocale({ slug: makeEnLocale().slug }) } });
    expect(PublishPayloadSchema.safeParse(same).success).toBe(true);
    const reserved = makePayload({ locales: { en: makeEnLocale(), es: makePayload().locales.es, zh: zhLocale({ slug: "tech" }) } });
    expect(PublishPayloadSchema.safeParse(reserved).success).toBe(false);
  });

  test("a digest item may carry a Chinese title", () => {
    const item = { titleEn: "Orion ships", titleEs: "Sale Orion", titleZh: "Orion发布", eventDate: makePayload().eventDate };
    expect(PublishPayloadSchema.shape.digestItems.unwrap().unwrap().element.safeParse(item).success).toBe(true);
  });
});

describe("which language AI Daily is read in", () => {
  test("zh reads Chinese (story by story), pt the English edition, es and en their own", () => {
    expect([...ARTICLE_LANGS]).toEqual(["es", "en", "zh"]);
    expect(blogLangFor("zh")).toBe("zh");
    expect(blogLangFor("pt")).toBe("en");
    expect(blogLangFor("es")).toBe("es");
    // The newsletter and the weekly digest stay es/en.
    expect(contentLangFor("zh")).toBe("en");
  });
});

function article(lang: PublicArticle["lang"], zhSlug?: string): PublicArticle {
  return {
    canonicalSlug: "orion",
    slug: lang === "es" ? "orion-es" : lang === "zh" ? (zhSlug ?? "orion") : "orion",
    lang,
    status: "published",
    title: "t",
    deck: "d",
    summary: "s",
    body: [],
    whyItMatters: [],
    keyTakeaways: [],
    seoTitle: "t",
    metaDescription: "m",
    edition: "daily",
    eventDate: "2026-11-20",
    coveredFrom: null,
    coveredTo: null,
    backdateReason: null,
    publishedAt: "2026-11-20T23:05:00.000Z",
    updatedAt: null,
    category: "model-release",
    importance: "P1",
    tags: [],
    companies: [],
    models: [],
    author: "Promptea",
    sources: [],
    image: null,
    digestItems: [],
    singleSourceJustification: null,
    correction: null,
    readingMinutes: 3,
    alternateSlugs: { en: "orion", es: "orion-es", ...(zhSlug ? { zh: zhSlug } : {}) },
  };
}

describe("sitemap entries", () => {
  test("a story with Chinese text lists zh in every language's entry", () => {
    for (const lang of ["es", "en", "zh"] as const) {
      const u = articleUrl(article(lang, "orion"));
      expect(u.locales).toEqual(["es", "en", "zh"]);
      expect(u.alternates).toEqual({ es: "/es/blog/orion-es", en: "/en/blog/orion", zh: "/zh/blog/orion" });
    }
    expect(articleUrl(article("zh", "orion")).path).toBe("/zh/blog/orion");
  });

  test("a story without Chinese text stays es/en", () => {
    const u = articleUrl(article("en"));
    expect(u.locales).toBeUndefined();
    expect(u.alternates).toEqual({ es: "/es/blog/orion-es", en: "/en/blog/orion" });
  });

  test("/zh/blog and /zh/blog/tech exist only once a story of the section has Chinese text; never /zh/blog/weekly", () => {
    expect(zhBlogIndexUrls([])).toEqual([]);
    expect(zhBlogIndexUrls([{ edition: "daily" }]).map((u) => u.path)).toEqual(["/zh/blog"]);
    expect(zhBlogIndexUrls([{ edition: "tech-daily" }]).map((u) => u.path)).toEqual(["/zh/blog/tech"]);
    const both = zhBlogIndexUrls([{ edition: "daily-morning" }, { edition: "tech-daily" }]);
    expect(both.map((u) => u.path)).toEqual(["/zh/blog", "/zh/blog/tech"]);
    for (const u of both) {
      expect(u.locales).toEqual(["es", "en", "zh"]);
      expect(u.title).toMatch(/AI Daily/);
    }
  });
});

describe("head of a story page", () => {
  test("a Chinese story is its own page: self canonical, zh_CN, hreflang es/en/zh", () => {
    const meta = pageMetadata({
      lang: "zh",
      contentLang: "zh",
      locales: ["es", "en", "zh"],
      path: "/zh/blog/orion",
      alternatePaths: { es: "/es/blog/orion-es", en: "/en/blog/orion", zh: "/zh/blog/orion" },
      title: "Orion",
      description: "d",
      type: "article",
    });
    expect(meta.alternates?.canonical).toBe("/zh/blog/orion");
    expect(meta.openGraph?.locale).toBe("zh_CN");
    expect(Object.keys(meta.alternates?.languages ?? {}).sort()).toEqual(["en", "es", "x-default", "zh", "zh-CN", "zh-Hans"]);
  });

  test("a story without Chinese text under /zh is still a view of the English one", () => {
    const meta = pageMetadata({
      lang: "zh",
      contentLang: "en",
      path: "/zh/blog/orion",
      alternatePaths: { es: "/es/blog/orion-es", en: "/en/blog/orion" },
      title: "Orion",
      description: "d",
      type: "article",
    });
    expect(meta.alternates?.canonical).toBe("/en/blog/orion");
    expect(meta.openGraph?.locale).toBe("en_US");
    expect(Object.keys(meta.alternates?.languages ?? {}).sort()).toEqual(["en", "es", "x-default"]);
  });
});

describe("home", () => {
  test("marquee items carry their own language", () => {
    const now = new Date("2026-11-21T12:00:00.000Z");
    const items = selectMarqueeItems(
      [
        { slug: "a", lang: "zh", title: "中文标题", publishedAt: "2026-11-21T10:00:00.000Z", eventDate: "2026-11-21", category: "model-release", status: "published" },
        { slug: "b", lang: "en", title: "English title", publishedAt: "2026-11-21T09:00:00.000Z", eventDate: "2026-11-21", category: "model-release", status: "published" },
      ],
      now
    );
    expect(items.map((i) => i.lang)).toEqual(["zh", "en"]);
  });
});
