import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const listAllPublishedArticles = vi.fn();
const listPublicEditions = vi.fn();
vi.mock("@/lib/blog/server", () => ({ listAllPublishedArticles: (...a: unknown[]) => listAllPublishedArticles(...a) }));
vi.mock("@/lib/newsletter/server", () => ({ listPublicEditions: (...a: unknown[]) => listPublicEditions(...a) }));
vi.mock("@/lib/benchmarks/server", () => ({ getBenchmarks: vi.fn(async () => ({ status: "unavailable" })) }));
vi.mock("@/lib/firebase/admin", () => ({
  getAdminFirestore: () => {
    throw new Error("not configured");
  },
}));

import {
  clearSeoMemo,
  loadArticles,
  loadBenchmarksAsOf,
  loadBenchmarksSnapshot,
  loadEditions,
  SEO_MEMO_FAILURE_TTL_MS,
  SEO_MEMO_TTL_MS,
} from "@/lib/seo/dynamic";

describe("SEO dynamic loaders", () => {
  beforeEach(() => {
    clearSeoMemo();
    listAllPublishedArticles.mockReset();
    listPublicEditions.mockReset();
    vi.useRealTimers();
  });

  it("degrades to empty when the database is down, never throws", async () => {
    listAllPublishedArticles.mockRejectedValue(new Error("down"));
    listPublicEditions.mockRejectedValue(new Error("down"));
    expect(await loadArticles("en")).toEqual([]);
    expect(await loadEditions()).toEqual([]);
    expect(await loadBenchmarksAsOf()).toBeNull();
    expect(await loadBenchmarksSnapshot()).toBeNull();
  });

  it("issues one query for concurrent callers (sitemap + llms + md share it)", async () => {
    listAllPublishedArticles.mockResolvedValue([{ slug: "a" }]);
    const [a, b, c] = await Promise.all([loadArticles("es"), loadArticles("es"), loadArticles("es")]);
    expect(a).toEqual(b);
    expect(c).toHaveLength(1);
    expect(listAllPublishedArticles).toHaveBeenCalledTimes(1);
    await loadArticles("en");
    expect(listAllPublishedArticles).toHaveBeenCalledTimes(2);
  });

  it("re-queries after the TTL and retries a failure much sooner", async () => {
    vi.useFakeTimers();
    listPublicEditions.mockResolvedValueOnce([]).mockResolvedValue([{ editionId: "x" }]);
    await loadEditions();
    vi.advanceTimersByTime(SEO_MEMO_TTL_MS - 1);
    await loadEditions();
    expect(listPublicEditions).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(2);
    expect(await loadEditions()).toHaveLength(1);
    expect(listPublicEditions).toHaveBeenCalledTimes(2);

    clearSeoMemo();
    listAllPublishedArticles.mockReset();
    listAllPublishedArticles.mockRejectedValueOnce(new Error("x")).mockResolvedValue([{ slug: "ok" }]);
    expect(await loadArticles("en")).toEqual([]);
    vi.advanceTimersByTime(SEO_MEMO_FAILURE_TTL_MS + 1);
    expect(await loadArticles("en")).toHaveLength(1);
  });
});
