// v1.8.3 — AI Daily Tech (edition "tech-daily"): the data model, the publish
// contract, ids and idempotency, the same-day guard, filters, the feed, the home
// selection, the marquee, the weekly digest's Tech block, structured data and
// backwards compatibility with everything published before the edition existed.

import { beforeEach, describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";
import { createHmac, randomUUID } from "crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const publishPostMock = vi.fn();
const recordRunMock = vi.fn().mockResolvedValue({ ok: true });
vi.mock("@/lib/blog/server", () => ({
  publishPost: (...args: unknown[]) => publishPostMock(...args),
  recordRun: (...args: unknown[]) => recordRunMock(...args),
}));

import { POST } from "@/app/api/internal/blog/publish/route";
import {
  BLOG_CATEGORIES,
  BLOG_EDITIONS,
  BLOG_SECTIONS,
  EDITION_KEY_PREFIX,
  RESERVED_BLOG_SLUGS,
  SECTION_OF_EDITION,
  STORY_EDITIONS,
  WEEKLY_EDITIONS,
  editionsOfSection,
  isStoryEdition,
  isWeeklyEdition,
  sectionOfEdition,
  type BlogEdition,
} from "@/lib/domain";
import { addDays, checkFreshness, editionDocId, editionIdempotencyKey, editorialDate } from "@/lib/blog/dates";
import { blogDevFixture } from "@/lib/blog/dev-fixture";
import { FEED_LIMIT, buildFeedXml, feedArticles } from "@/lib/blog/feed";
import { applyFilters, cardsOfSection, collectEditions, parseFilters, EMPTY_FILTERS } from "@/lib/blog/filters";
import { blogBreadcrumbNode, blogIndexJsonLd, blogSectionFeedPath, blogSectionIndexPath } from "@/lib/blog/jsonld";
import { HOME_LATEST_COUNT, hasTechStory, selectHomeLatest } from "@/lib/blog/latest";
import { selectMarqueeItems } from "@/lib/blog/marquee";
import { PublishPayloadSchema } from "@/lib/blog/types";
import { MAX_TECH_STORIES, buildEdition, techCandidates, weekCandidates } from "@/lib/newsletter/compose";
import { renderNewsletterHtml, renderNewsletterText } from "@/lib/newsletter/render";
import { NewsletterEditionSchema } from "@/lib/newsletter/types";
import { makeArticle } from "./seo.fixtures";

const TODAY = editorialDate();
const EXAMPLE_PATH = join(process.cwd(), "docs", "editorial", "tech-daily-payload.example.json");

/** The payload documented in docs/editorial/tech-daily-routine.md, re-dated to today. */
type ExampleLocale = Record<string, unknown> & { deck: string; slug: string; keyTakeaways: string[] };
type Example = Record<string, unknown> & {
  locales: { en: ExampleLocale; es: ExampleLocale };
  sources: Array<Record<string, unknown> & { url: string }>;
  allowBackdate?: unknown;
};

function examplePayload(overrides: Record<string, unknown> = {}): Example {
  const raw = JSON.parse(readFileSync(EXAMPLE_PATH, "utf8")) as Example;
  return {
    ...raw,
    eventDate: TODAY,
    idempotencyKey: `ai-tech:${TODAY}`,
    sources: raw.sources.map((s) => ({ ...s, publishedAt: TODAY, accessedAt: TODAY })),
    ...overrides,
  };
}

const issues = (payload: unknown) => {
  const r = PublishPayloadSchema.safeParse(payload);
  return r.success ? [] : r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
};

// ---------------------------------------------------------------------------
describe("domain: the tech-daily edition", () => {
  test("tech-daily is appended; the four editions that existed keep their order and prefixes", () => {
    expect([...BLOG_EDITIONS]).toEqual(["daily", "daily-morning", "weekly-recap", "week-ahead", "tech-daily"]);
    expect(EDITION_KEY_PREFIX).toMatchObject({ daily: "ai-daily", "daily-morning": "ai-morning", "weekly-recap": "ai-weekly", "week-ahead": "ai-ahead", "tech-daily": "ai-tech" });
  });

  test("every edition has its own prefix (two editions can never share a document id)", () => {
    const prefixes = BLOG_EDITIONS.map((e) => EDITION_KEY_PREFIX[e]);
    expect(new Set(prefixes).size).toBe(BLOG_EDITIONS.length);
    for (const p of prefixes) expect(p).toMatch(/^ai-[a-z]+$/);
  });

  test("story and weekly editions partition the list", () => {
    expect([...STORY_EDITIONS].sort()).toEqual(["daily", "daily-morning", "tech-daily"]);
    expect([...WEEKLY_EDITIONS].sort()).toEqual(["week-ahead", "weekly-recap"]);
    for (const e of BLOG_EDITIONS) expect(isStoryEdition(e) !== isWeeklyEdition(e), e).toBe(true);
    expect(isStoryEdition("nope")).toBe(false);
  });

  test("every edition belongs to exactly one section; only tech-daily is Tech", () => {
    expect([...BLOG_SECTIONS]).toEqual(["ai", "tech"]);
    expect(Object.keys(SECTION_OF_EDITION).sort()).toEqual([...BLOG_EDITIONS].sort());
    expect(editionsOfSection("tech")).toEqual(["tech-daily"]);
    expect(editionsOfSection("ai")).toEqual(["daily", "daily-morning", "weekly-recap", "week-ahead"]);
  });

  test("an unknown or missing edition reads as the AI section (documents written by another build)", () => {
    expect(sectionOfEdition("tech-daily")).toBe("tech");
    expect(sectionOfEdition("something-new")).toBe("ai");
    expect(sectionOfEdition(undefined)).toBe("ai");
    expect(sectionOfEdition(null)).toBe("ai");
  });

  test("the new categories are appended after every category that already existed", () => {
    const before = ["model-release", "product", "research", "policy", "funding", "infrastructure", "security", "developer-tools", "open-source", "agents", "benchmarks", "business", "energy", "digest", "other"];
    expect(BLOG_CATEGORIES.slice(0, before.length)).toEqual(before);
    expect(BLOG_CATEGORIES.slice(before.length)).toEqual(["cloud", "web-platform", "hardware"]);
  });

  test("the pages under /blog/ are reserved slugs", () => {
    expect([...RESERVED_BLOG_SLUGS]).toEqual(expect.arrayContaining(["tech", "weekly"]));
  });
});

// ---------------------------------------------------------------------------
describe("ids and idempotency", () => {
  test("the Tech story of a day has its own document, next to that day's AI stories", () => {
    const ids = BLOG_EDITIONS.map((e) => editionDocId("2026-11-12", e));
    expect(new Set(ids).size).toBe(BLOG_EDITIONS.length);
    expect(editionDocId("2026-11-12", "tech-daily")).toBe("ai-tech_2026-11-12");
    expect(editionIdempotencyKey("2026-11-12", "tech-daily")).toBe("ai-tech:2026-11-12");
  });

  test("the same edition on the same day always resolves to the same document (a retry cannot duplicate)", () => {
    expect(editionDocId(TODAY, "tech-daily")).toBe(editionDocId(TODAY, "tech-daily"));
    expect(editionDocId(TODAY, "tech-daily")).not.toBe(editionDocId(addDays(TODAY, 1), "tech-daily"));
  });

  test("ids of the editions that already existed did not change", () => {
    expect(editionDocId("2026-08-07")).toBe("ai-daily_2026-08-07");
    expect(editionDocId("2026-08-07", "daily-morning")).toBe("ai-morning_2026-08-07");
    expect(editionDocId("2026-08-08", "weekly-recap")).toBe("ai-weekly_2026-08-08");
    expect(editionDocId("2026-08-09", "week-ahead")).toBe("ai-ahead_2026-08-09");
  });
});

// ---------------------------------------------------------------------------
describe("publish schema: a Tech story", () => {
  test("the documented example payload is valid", () => {
    expect(issues(examplePayload())).toEqual([]);
    const parsed = PublishPayloadSchema.parse(examplePayload());
    expect(parsed.edition).toBe("tech-daily");
    expect(parsed.category).toBe("cloud");
    expect(parsed.locales.en.keyTakeaways.length).toBe(parsed.locales.es.keyTakeaways.length);
  });

  test("the example states that it is not a real story, in both languages", () => {
    const p = examplePayload();
    expect(p.locales.en.deck).toMatch(/FORMAT EXAMPLE/);
    expect(p.locales.es.deck).toMatch(/EJEMPLO DE FORMATO/);
    for (const s of p.sources) expect(new URL(s.url).hostname).toBe("example.com");
  });

  test.each(["cloud", "web-platform", "hardware", "developer-tools", "infrastructure", "security", "open-source"])("category %s is accepted", (category) => {
    expect(issues(examplePayload({ category }))).toEqual([]);
  });

  test("the idempotency key must be ai-tech:<eventDate>", () => {
    expect(issues(examplePayload({ idempotencyKey: `ai-daily:${TODAY}` })).join("\n")).toMatch(/idempotencyKey must be "ai-tech:/);
    expect(issues(examplePayload({ idempotencyKey: `ai-tech:${addDays(TODAY, -1)}` })).join("\n")).toMatch(/idempotencyKey/);
  });

  test("a Tech story covers one event: no coverage window", () => {
    expect(issues(examplePayload({ coveredFrom: addDays(TODAY, -6), coveredTo: TODAY })).join("\n")).toMatch(/must not declare a coverage window/);
  });

  test("a published Tech story needs a primary source", () => {
    const p = examplePayload();
    const noPrimary = { ...p, sources: p.sources.map((s) => ({ ...s, primary: false })) };
    expect(issues(noPrimary).join("\n")).toMatch(/at least one primary source/);
  });

  test("one source needs a stated justification; with it the story is valid", () => {
    const p = examplePayload();
    const one = { ...p, sources: [p.sources[0]] };
    expect(issues(one).join("\n")).toMatch(/second independent source, or singleSourceJustification/);
    expect(issues({ ...one, singleSourceJustification: "Announced today on the vendor's changelog; no independent coverage yet." })).toEqual([]);
  });

  test("backdating needs a reason (and the routine never sets it)", () => {
    expect(issues(examplePayload({ allowBackdate: true })).join("\n")).toMatch(/backdateReason is required/);
    expect(issues(examplePayload({ allowBackdate: true, backdateReason: "Published two days late on purpose by an editor." }))).toEqual([]);
    expect(examplePayload().allowBackdate).toBeUndefined();
  });

  test("both languages must tell the same story", () => {
    const p = examplePayload();
    const uneven = { ...p, locales: { ...p.locales, es: { ...p.locales.es, keyTakeaways: ["Solo un punto clave."] } } };
    expect(issues(uneven).join("\n")).toMatch(/same number of key takeaways/);
  });

  test.each(["tech", "weekly", "feed"])("the slug %s is refused: it is a page of the blog", (slug) => {
    const p = examplePayload();
    expect(issues({ ...p, canonicalSlug: slug }).join("\n")).toMatch(/is a page of the blog/);
    expect(issues({ ...p, locales: { ...p.locales, es: { ...p.locales.es, slug } } }).join("\n")).toMatch(/is a page of the blog/);
  });

  test("an http source is refused", () => {
    const p = examplePayload();
    expect(issues({ ...p, sources: [{ ...p.sources[0], url: "http://example.com/x" }, p.sources[1]] }).join("\n")).toMatch(/https/);
  });

  test("backwards compatibility: a payload without `edition` is still a daily AI story", () => {
    const p: Record<string, unknown> = examplePayload({ idempotencyKey: `ai-daily:${TODAY}` });
    delete p.edition;
    const parsed = PublishPayloadSchema.parse(p);
    expect(parsed.edition).toBe("daily");
  });

  test("backwards compatibility: weekly editions still require their window", () => {
    expect(issues(examplePayload({ edition: "weekly-recap", idempotencyKey: `ai-weekly:${TODAY}` })).join("\n")).toMatch(/must declare coveredFrom and coveredTo/);
    expect(issues(examplePayload({ edition: "weekly-recap", idempotencyKey: `ai-weekly:${TODAY}`, coveredFrom: addDays(TODAY, -6), coveredTo: TODAY }))).toEqual([]);
    expect(issues(examplePayload({ edition: "weekly-recap", idempotencyKey: `ai-weekly:${TODAY}`, coveredFrom: addDays(TODAY, -6), coveredTo: TODAY, allowBackdate: true, backdateReason: "Weekly editions cannot be backdated at all." })).join("\n")).toMatch(/only a daily story can be backdated/);
  });
});

// ---------------------------------------------------------------------------
describe("same-day guard for the Tech edition", () => {
  const now = new Date();
  test("today is fresh; yesterday is stale; tomorrow is refused", () => {
    expect(checkFreshness(TODAY, { now, edition: "tech-daily" })).toMatchObject({ ok: true, backdated: false });
    expect(checkFreshness(addDays(TODAY, -1), { now, edition: "tech-daily" })).toMatchObject({ ok: false, reason: "stale_event" });
    expect(checkFreshness(addDays(TODAY, 1), { now, edition: "tech-daily" })).toMatchObject({ ok: false, reason: "future_event" });
  });

  test("a human backdate follows the daily rules (allowed, capped at 14 days); a weekly edition never", () => {
    expect(checkFreshness(addDays(TODAY, -3), { now, edition: "tech-daily", allowBackdate: true })).toMatchObject({ ok: true, backdated: true });
    expect(checkFreshness(addDays(TODAY, -15), { now, edition: "tech-daily", allowBackdate: true })).toMatchObject({ ok: false, reason: "backdate_too_old" });
    expect(checkFreshness(addDays(TODAY, -3), { now, edition: "weekly-recap", allowBackdate: true })).toMatchObject({ ok: false, reason: "stale_event" });
  });
});

// ---------------------------------------------------------------------------
describe("POST /api/internal/blog/publish with a Tech payload", () => {
  const SECRET = "t".repeat(48);
  const sign = (payload: unknown) => {
    const body = JSON.stringify(payload);
    const timestamp = String(Math.floor(Date.now() / 1000));
    const nonce = randomUUID();
    const signature = createHmac("sha256", SECRET).update(`${timestamp}.${nonce}.${body}`).digest("hex");
    return new NextRequest("http://localhost/api/internal/blog/publish", {
      method: "POST",
      headers: { "content-type": "application/json", "x-promptea-timestamp": timestamp, "x-promptea-nonce": nonce, "x-promptea-signature": signature },
      body,
    });
  };

  beforeEach(() => {
    vi.stubEnv("BLOG_PUBLISH_SECRET", SECRET);
    publishPostMock.mockReset();
    recordRunMock.mockClear();
  });

  test("dryRun validates the documented example and writes nothing", async () => {
    const res = await POST(sign(examplePayload({ dryRun: true })));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, dryRun: true, outcome: "validated", edition: "tech-daily", eventDate: TODAY, sourceCount: 2, primarySourceCount: 2 });
    expect(publishPostMock).not.toHaveBeenCalled();
    expect(recordRunMock).not.toHaveBeenCalled();
  });

  test("a Tech story about yesterday is refused before any write", async () => {
    const yesterday = addDays(TODAY, -1);
    const res = await POST(sign(examplePayload({ eventDate: yesterday, idempotencyKey: `ai-tech:${yesterday}`, dryRun: false })));
    expect(res.status).toBe(422);
    expect(await res.json()).toMatchObject({ ok: false, error: "stale_event", edition: "tech-daily" });
    expect(publishPostMock).not.toHaveBeenCalled();
  });

  test("publishing passes the Tech edition through and records which edition ran", async () => {
    publishPostMock.mockResolvedValue({ outcome: "published", id: `ai-tech_${TODAY}`, canonicalSlug: "example-cloud-agent-sandboxes-per-second-billing" });
    const res = await POST(sign(examplePayload({ dryRun: false })));
    expect(res.status).toBe(201);
    expect(publishPostMock.mock.calls[0][0]).toMatchObject({ edition: "tech-daily", eventDate: TODAY });
    expect(recordRunMock).toHaveBeenCalledWith(expect.objectContaining({ status: "PUBLISHED", edition: "tech-daily", articleId: `ai-tech_${TODAY}` }));
  });

  test("a second Tech story on the same day is `already_published`, not a duplicate", async () => {
    publishPostMock.mockResolvedValue({ outcome: "already_published", id: `ai-tech_${TODAY}`, canonicalSlug: "x" });
    const res = await POST(sign(examplePayload({ dryRun: false })));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, outcome: "already_published" });
  });

  test("an unsigned request is refused whatever the edition", async () => {
    const req = new NextRequest("http://localhost/api/internal/blog/publish", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(examplePayload()) });
    expect((await POST(req)).status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
const day = (n: number) => `2026-11-${String(n).padStart(2, "0")}`;
const story = (slug: string, d: number, edition: BlogEdition = "daily", extra: Record<string, unknown> = {}) =>
  makeArticle({ slug, eventDate: day(d), edition, ...extra } as Parameters<typeof makeArticle>[0]);

describe("filters by section", () => {
  const cards = [story("ai-1", 9), story("tech-1", 9, "tech-daily"), story("recap", 8, "weekly-recap"), story("tech-2", 7, "tech-daily"), story("morning", 7, "daily-morning")];

  test("each index gets its own stories, in the original order", () => {
    expect(cardsOfSection(cards, "ai").map((c) => c.slug)).toEqual(["ai-1", "recap", "morning"]);
    expect(cardsOfSection(cards, "tech").map((c) => c.slug)).toEqual(["tech-1", "tech-2"]);
  });

  test("?edition= only accepts an edition of the section being browsed", () => {
    expect(parseFilters({ edition: "tech-daily" }, "ai").edition).toBeNull();
    expect(parseFilters({ edition: "weekly-recap" }, "ai").edition).toBe("weekly-recap");
    expect(parseFilters({ edition: "weekly-recap" }, "tech").edition).toBeNull();
    expect(parseFilters({ edition: "tech-daily" }, "tech").edition).toBe("tech-daily");
    // No section (older callers): every edition, as before.
    expect(parseFilters({ edition: "tech-daily" }).edition).toBe("tech-daily");
  });

  test("the edition dropdown offers only what the index has", () => {
    expect(collectEditions(cardsOfSection(cards, "ai"))).toEqual(["daily", "daily-morning", "weekly-recap"]);
    expect(collectEditions(cardsOfSection(cards, "tech"))).toEqual(["tech-daily"]);
  });

  test("search, category and sort work inside the Tech index", () => {
    const tech = cardsOfSection([story("a", 9, "tech-daily", { category: "cloud", title: "Example Cloud ships sandboxes" }), story("b", 8, "tech-daily", { category: "hardware", title: "Example Silicon card" })], "tech");
    expect(applyFilters(tech, { ...EMPTY_FILTERS, category: "hardware" }).map((c) => c.slug)).toEqual(["b"]);
    expect(applyFilters(tech, { ...EMPTY_FILTERS, q: "sandboxes" }).map((c) => c.slug)).toEqual(["a"]);
    expect(applyFilters(tech, { ...EMPTY_FILTERS, sort: "oldest" }).map((c) => c.slug)).toEqual(["b", "a"]);
  });
});

// ---------------------------------------------------------------------------
describe("RSS feeds per section", () => {
  const articles = [story("ai-new", 9), story("tech-new", 9, "tech-daily", { title: "R&D <fast> \"quotes\"" }), story("ai-old", 7), story("tech-old", 6, "tech-daily")];
  const base = { lang: "en" as const, articles, siteUrl: "https://www.promptea.me/", now: new Date("2026-11-09T12:00:00Z") };

  test("the AI feed carries no Tech story and keeps its URL", () => {
    const xml = buildFeedXml({ ...base, section: "ai" });
    expect(xml).toContain("<link>https://www.promptea.me/en/blog</link>");
    expect(xml).toContain('href="https://www.promptea.me/en/blog/feed.xml"');
    expect(xml).toContain("/en/blog/ai-new");
    expect(xml).not.toContain("tech-new");
    expect((xml.match(/<item>/g) ?? []).length).toBe(2);
  });

  test("the Tech feed carries only Tech stories, under its own channel and self link", () => {
    const xml = buildFeedXml({ ...base, section: "tech" });
    expect(xml).toContain("<title>Promptea · AI Daily Tech</title>");
    expect(xml).toContain("<link>https://www.promptea.me/en/blog/tech</link>");
    expect(xml).toContain('href="https://www.promptea.me/en/blog/tech/feed.xml"');
    expect(xml).toContain("/en/blog/tech-new");
    expect(xml).not.toContain("ai-new");
    // Article URLs are shared with the AI section: /blog/<slug>, not /blog/tech/<slug>.
    expect(xml).not.toContain("/en/blog/tech/tech-new");
  });

  test("text is escaped and the document is well formed enough to parse", () => {
    const xml = buildFeedXml({ ...base, section: "tech" });
    expect(xml).toContain("R&amp;D &lt;fast&gt; &quot;quotes&quot;");
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect((xml.match(/<item>/g) ?? []).length).toBe((xml.match(/<\/item>/g) ?? []).length);
  });

  test("an empty section is an empty, valid feed (no story yet, or no database)", () => {
    const xml = buildFeedXml({ ...base, articles: [story("only-ai", 9)], section: "tech" });
    expect(xml).toContain("<channel>");
    expect(xml).not.toContain("<item>");
  });

  test("each feed is capped", () => {
    const many = Array.from({ length: FEED_LIMIT + 20 }, (_, i) => story(`t-${i}`, 1 + (i % 28), "tech-daily"));
    expect(feedArticles(many, "tech").length).toBe(FEED_LIMIT);
  });

  test("paths", () => {
    expect(blogSectionIndexPath("es", "ai")).toBe("/es/blog");
    expect(blogSectionIndexPath("es", "tech")).toBe("/es/blog/tech");
    expect(blogSectionFeedPath("en", "ai")).toBe("/en/blog/feed.xml");
    expect(blogSectionFeedPath("en", "tech")).toBe("/en/blog/tech/feed.xml");
  });
});

// ---------------------------------------------------------------------------
describe("home: which stories 'Latest in AI Daily' shows", () => {
  const slugs = (xs: Array<{ slug: string }>) => xs.map((x) => x.slug);

  test("the lead is the newest AI story even when a Tech story is newer", () => {
    const list = [story("tech-a", 9, "tech-daily"), story("ai-a", 9), story("ai-b", 8), story("ai-c", 7), story("ai-d", 6)];
    expect(slugs(selectHomeLatest(list))).toEqual(["ai-a", "tech-a", "ai-b", "ai-c"]);
  });

  test("at most one Tech story, however many there are", () => {
    const list = [story("ai-a", 9), story("tech-a", 9, "tech-daily"), story("tech-b", 8, "tech-daily"), story("tech-c", 7, "tech-daily"), story("ai-b", 6), story("ai-c", 5)];
    const out = selectHomeLatest(list);
    expect(slugs(out)).toEqual(["ai-a", "tech-a", "ai-b", "ai-c"]);
    expect(out.filter((a) => a.edition === "tech-daily")).toHaveLength(1);
    expect(out).toHaveLength(HOME_LATEST_COUNT);
  });

  test("without Tech stories the block is exactly what it was before v1.8.3", () => {
    const list = [story("a", 9), story("b", 8, "daily-morning"), story("c", 7, "week-ahead"), story("d", 6), story("e", 5)];
    expect(slugs(selectHomeLatest(list))).toEqual(slugs(list.slice(0, 4)));
  });

  test("with only Tech stories the newest one leads instead of an empty block", () => {
    expect(slugs(selectHomeLatest([story("tech-a", 9, "tech-daily"), story("tech-b", 8, "tech-daily")]))).toEqual(["tech-a"]);
  });

  test("empty in, empty out; the Tech link appears only when there is a Tech story", () => {
    expect(selectHomeLatest([])).toEqual([]);
    expect(hasTechStory([story("a", 9)])).toBe(false);
    expect(hasTechStory([story("a", 9), story("t", 8, "tech-daily")])).toBe(true);
  });
});

// ---------------------------------------------------------------------------
describe("marquee", () => {
  test("Tech headlines of the last 72 hours are in the strip with the AI ones, newest first", () => {
    const now = new Date("2026-11-09T18:00:00Z");
    const items = selectMarqueeItems(
      [
        story("ai", 9, "daily", { publishedAt: "2026-11-09T12:00:00Z" }),
        story("tech", 9, "tech-daily", { publishedAt: "2026-11-09T15:00:00Z" }),
        story("old-tech", 1, "tech-daily", { publishedAt: "2026-11-01T15:00:00Z" }),
      ],
      now,
    );
    expect(items.map((i) => i.slug)).toEqual(["tech", "ai"]);
  });
});

// ---------------------------------------------------------------------------
describe("weekly digest: the Tech block", () => {
  const window = { editionId: "promptea-weekly_2026-11-09", weekStart: "2026-11-01", weekEnd: "2026-11-07", monday: "2026-11-09" } as Parameters<typeof buildEdition>[0]["window"];
  const ai = [story("ai-1", 3, "daily"), story("ai-2", 5, "daily-morning"), story("recap", 7, "weekly-recap")];
  const tech = [1, 2, 3, 4, 5].map((n) => story(`tech-${n}`, n, "tech-daily"));
  const build = (articles: ReturnType<typeof story>[]) => buildEdition({ window, en: articles, es: articles, now: new Date("2026-11-09T12:00:00Z"), siteUrl: "https://www.promptea.me" });

  test("AI and Tech candidates never overlap, and weekly editions are neither", () => {
    const all = [...ai, ...tech];
    expect(weekCandidates(all, window).map((a) => a.slug)).toEqual(["ai-1", "ai-2"]);
    expect(techCandidates(all, window).map((a) => a.slug)).toEqual(tech.map((t) => t.slug));
  });

  test("with Tech stories: a capped Tech block; the top stories, the hero and the subject stay AI", () => {
    const edition = build([...ai, ...tech])!;
    const en = edition.locales.en;
    expect(en.techStories).toHaveLength(MAX_TECH_STORIES);
    expect(en.techStories!.every((s) => s.articleSlug.startsWith("tech-"))).toBe(true);
    expect(en.topStories.map((s) => s.articleSlug)).toEqual(["ai-2", "ai-1"]);
    expect(en.tools.every((t) => !t.title.includes("tech-"))).toBe(true);
    expect(en.heroHeadline).toContain("ai-2");
    expect(en.subject).not.toContain("tech-");
    expect(NewsletterEditionSchema.safeParse(edition).success).toBe(true);
  });

  test("without Tech stories: an empty block and the same edition as before", () => {
    const edition = build(ai)!;
    expect(edition.locales.en.techStories).toEqual([]);
    expect(edition.locales.es.techStories).toEqual([]);
  });

  test("a week with only Tech stories produces no edition (the digest is the week in AI)", () => {
    expect(build(tech)).toBeNull();
  });

  test("the email shows the block only when there are Tech stories", () => {
    const withTech = build([...ai, ...tech])!;
    const html = renderNewsletterHtml(withTech, "en", { siteUrl: "https://www.promptea.me" });
    expect(html).toContain("Tech this week");
    expect(html).toContain("https://www.promptea.me/en/blog/tech-5");
    expect(renderNewsletterHtml(withTech, "es", { siteUrl: "https://www.promptea.me" })).toContain("Tech de la semana");
    expect(renderNewsletterText(withTech, "en", { siteUrl: "https://www.promptea.me" })).toContain("TECH THIS WEEK");

    const without = build(ai)!;
    expect(renderNewsletterHtml(without, "en", { siteUrl: "https://www.promptea.me" })).not.toContain("Tech this week");
    expect(renderNewsletterText(without, "es", { siteUrl: "https://www.promptea.me" })).not.toContain("TECH DE LA SEMANA");
  });

  test("backwards compatibility: an edition stored before v1.8.3 (no techStories field) parses and renders byte for byte as before", () => {
    const current = build(ai)!;
    const legacy = JSON.parse(JSON.stringify(current)) as typeof current;
    for (const l of ["en", "es"] as const) delete (legacy.locales[l] as { techStories?: unknown }).techStories;
    expect("techStories" in legacy.locales.en).toBe(false);

    const parsed = NewsletterEditionSchema.safeParse(legacy);
    expect(parsed.success).toBe(true);
    for (const l of ["en", "es"] as const) {
      expect(renderNewsletterHtml(legacy, l, { siteUrl: "https://www.promptea.me" })).toBe(renderNewsletterHtml(current, l, { siteUrl: "https://www.promptea.me" }));
      expect(renderNewsletterText(legacy, l, { siteUrl: "https://www.promptea.me" })).toBe(renderNewsletterText(current, l, { siteUrl: "https://www.promptea.me" }));
    }
  });
});

// ---------------------------------------------------------------------------
describe("structured data", () => {
  const site = "https://www.promptea.me";
  type Node = Record<string, unknown> & { "@type"?: string; itemListElement?: Array<{ name: string; item: string; position: number }> };
  const nodes = (ld: Record<string, unknown>) => (ld["@graph"] as Node[]) ?? [];

  test("the Tech index is its own CollectionPage + Blog with a three-level breadcrumb", () => {
    const ld = blogIndexJsonLd({ lang: "en", title: "AI Daily Tech", description: "One verified technology story a day.", items: [{ title: "A Tech story headline", slug: "a-tech-story", publishedAt: null, eventDate: "2026-11-09" }], siteUrl: site, section: "tech" });
    const page = nodes(ld).find((n) => n["@type"] === "CollectionPage")!;
    const blog = nodes(ld).find((n) => n["@type"] === "Blog")!;
    const crumbs = nodes(ld).find((n) => n["@type"] === "BreadcrumbList")!;
    expect(page.url).toBe(`${site}/en/blog/tech`);
    expect(blog.url).toBe(`${site}/en/blog/tech`);
    expect((blog.blogPost as Array<{ url: string }>)[0].url).toBe(`${site}/en/blog/a-tech-story`);
    expect(crumbs.itemListElement!.map((i) => i.name)).toEqual(["Home", "AI Daily", "Tech"]);
    expect(crumbs.itemListElement![1].item).toBe(`${site}/en/blog`);
  });

  test("the AI index is unchanged: /blog with a two-level breadcrumb", () => {
    const ld = blogIndexJsonLd({ lang: "es", title: "IA al Día", description: "Una noticia de IA verificada.", siteUrl: site });
    const crumbs = nodes(ld).find((n) => n["@type"] === "BreadcrumbList")!;
    expect(nodes(ld).find((n) => n["@type"] === "CollectionPage")!.url).toBe(`${site}/es/blog`);
    expect(crumbs.itemListElement!.map((i) => i.name)).toEqual(["Inicio", "AI Daily"]);
  });

  test("a Tech article's breadcrumb goes through the Tech index; an AI article's does not", () => {
    const tech = blogBreadcrumbNode({ lang: "en", title: "A Tech story headline", slug: "a-tech-story", siteUrl: site, section: "tech" }) as Node;
    expect(tech.itemListElement!.map((i) => i.item)).toEqual([`${site}/en`, `${site}/en/blog`, `${site}/en/blog/tech`, `${site}/en/blog/a-tech-story`]);
    expect(tech.itemListElement!.map((i) => i.position)).toEqual([1, 2, 3, 4]);
    const ai = blogBreadcrumbNode({ lang: "en", title: "An AI story headline", slug: "an-ai-story", siteUrl: site }) as Node;
    expect(ai.itemListElement!.map((i) => i.item)).toEqual([`${site}/en`, `${site}/en/blog`, `${site}/en/blog/an-ai-story`]);
  });
});

// ---------------------------------------------------------------------------
describe("development fixture", () => {
  test("it has Tech stories (clearly fictitious) next to the AI ones, in both content languages", () => {
    for (const lang of ["en", "es"] as const) {
      const all = blogDevFixture(lang, new Date("2026-11-11T15:00:00Z"));
      const tech = all.filter((a) => a.edition === "tech-daily");
      expect(tech.length).toBeGreaterThanOrEqual(3);
      expect(all.length - tech.length).toBeGreaterThanOrEqual(6);
      expect(new Set(tech.map((a) => a.category))).toEqual(new Set(["cloud", "web-platform", "hardware", "developer-tools"]));
      for (const a of tech) expect(a.title).toMatch(/^Demo /);
      expect(new Set(all.map((a) => a.slug)).size).toBe(all.length);
    }
  });
});
