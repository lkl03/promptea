// v1.8.4 — the Tech index before its first story is an empty listing: noindex
// (and out of sitemap.xml and llms.txt, see seo.tech.test.ts). It must become
// indexable again on its own with the first story, and the AI index must never
// be affected by it.

import { beforeEach, describe, expect, test, vi } from "vitest";

import { makeArticle } from "./seo.fixtures";

vi.mock("server-only", () => ({}));

const list = vi.fn();
vi.mock("@/lib/blog/server", () => ({
  listAllPublishedArticles: (...a: unknown[]) => list(...a),
}));

import { blogIndexMetadata } from "@/components/blog/BlogIndexView";

const ai = makeArticle({ slug: "an-ai-story", eventDate: "2026-11-08" });
const tech = makeArticle({ slug: "a-tech-story", eventDate: "2026-11-10", edition: "tech-daily", category: "cloud" } as Parameters<typeof makeArticle>[0]);

const noindex = (m: Awaited<ReturnType<typeof blogIndexMetadata>>) => {
  const r = m.robots as { index?: boolean; follow?: boolean } | undefined;
  return r?.index === false;
};

beforeEach(() => { list.mockReset(); });

describe("Tech index with no stories", () => {
  test("is noindex, follow while there are no Tech stories (only AI ones)", async () => {
    list.mockResolvedValue([ai]);
    for (const lang of ["en", "es", "pt"] as const) {
      const m = await blogIndexMetadata(lang, {}, "tech");
      expect(noindex(m), lang).toBe(true);
      expect((m.robots as { follow?: boolean }).follow).toBe(true);
    }
  });

  test("is noindex when the database is unavailable (degrades to empty)", async () => {
    list.mockImplementation(async () => {
      throw new Error("firestore down");
    });
    const m = await blogIndexMetadata("en", {}, "tech");
    expect(noindex(m)).toBe(true);
  });

  test("is indexable again with the first Tech story", async () => {
    list.mockResolvedValue([tech, ai]);
    const m = await blogIndexMetadata("en", {}, "tech");
    expect(noindex(m)).toBe(false);
    expect(String(m.alternates?.canonical)).toMatch(/\/en\/blog\/tech$/);
  });

  test("the AI index is never affected", async () => {
    list.mockResolvedValue([]);
    expect(noindex(await blogIndexMetadata("en", {}, "ai"))).toBe(false);
  });
});
