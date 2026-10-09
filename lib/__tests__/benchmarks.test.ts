// v1.7.0 — benchmarks: contract validation, normalization, frontier
// definition, and honest degradation (no key, 401, 429, 5xx, timeout,
// malformed or empty data, last-valid-snapshot fallback).

import { describe, expect, test } from "vitest";
import { parseItem } from "@/lib/benchmarks/schema";
import { buildSnapshot, frontierModels, formatScore, formatPrice, FRONTIER_TOP_N, type BenchmarksSnapshot } from "@/lib/benchmarks/normalize";
import { loadBenchmarks, fetchLive, snapshotAgeHours, OPENROUTER_BENCHMARKS_URL, type SnapshotStore } from "@/lib/benchmarks/load";

const NOW = new Date("2026-10-09T12:00:00.000Z");

// Shapes copied from the OpenRouter OpenAPI examples; model names are demo data.
const AA = (slug: string, name: string, i: number | null, c: number | null, a: number | null, prompt = "0.0000025", completion = "0.00001") => ({
  source: "artificial-analysis",
  model_permaslug: slug,
  display_name: name,
  intelligence_index: i,
  coding_index: c,
  agentic_index: a,
  pricing: { prompt, completion },
});
const GPQA = (slug: string, name: string, accuracy: number | null) => ({
  source: "openrouter",
  model_permaslug: slug,
  display_name: name,
  benchmark_type: "gpqa_diamond",
  accuracy,
  accuracy_stddev: 0.03,
  avg_cost_per_task: 0.002,
  total_tasks: 300,
  last_run_timestamp: "2026-10-01T12:00:00Z",
});
const SEARCH = (slug: string, name: string, score: number | null) => ({
  source: "openrouter",
  model_permaslug: slug,
  display_name: name,
  benchmark_type: "search_widesearch",
  primary_metric: "f1_by_item",
  primary_score: score,
  total_tasks: 200,
  avg_cost_per_task: null,
  avg_latency_per_task_ms: 4000,
  search_engine: "exa",
  search_surface: "server-tool",
  last_run_timestamp: "2026-10-02T00:00:00Z",
});
const DA = (slug: string, name: string, elo: number | null) => ({
  source: "design-arena",
  model_permaslug: slug,
  display_name: name,
  arena: "models",
  category: "uicomponent",
  elo,
  win_rate: 61,
  avg_generation_time_ms: 3200,
  tournament_stats: { first_place: 1, second_place: 1, third_place: 1, fourth_place: 1, total: 4 },
  pricing: { prompt: "0.000003", completion: "0.000015" },
});

const VALID = {
  data: [
    AA("demo-lab/alpha-1", "Alpha 1", 71.2, 65.8, 58.3),
    AA("demo-lab/beta-2", "Beta 2", 68, null, 61, "0.000001", "0.000004"),
    AA("other-lab/gamma", "Gamma", null, null, null),
    AA("openai/demo-gpt", "Demo GPT", 69.5, 70.1, 40),
    GPQA("demo-lab/alpha-1", "Alpha 1", 0.72),
    GPQA("other-lab/gamma", "Gamma", 0.81),
    GPQA("demo-lab/beta-2", "Beta 2", null),
    SEARCH("demo-lab/alpha-1", "Alpha 1", 0.44),
    DA("demo-lab/beta-2", "Beta 2", 1423),
  ],
  meta: { as_of: "2026-10-08T12:00:00Z", citation: null, model_count: 4, source: null, source_url: null, task_type: null, version: "v1" },
};

function okResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

class MemStore implements SnapshotStore {
  constructor(public value: BenchmarksSnapshot | null = null, public failRead = false) {}
  writes = 0;
  async read() {
    if (this.failRead) throw new Error("down");
    return this.value;
  }
  async write(s: BenchmarksSnapshot) {
    this.writes++;
    this.value = s;
  }
}

describe("contract validation", () => {
  test("each documented item shape parses; unknown sources and malformed rows are rejected", () => {
    expect(parseItem(VALID.data[0])?.source).toBe("artificial-analysis");
    expect(parseItem(VALID.data[4])?.source).toBe("openrouter");
    expect(parseItem(VALID.data[7])).toMatchObject({ primary_metric: "f1_by_item" });
    expect(parseItem(VALID.data[8])?.source).toBe("design-arena");
    expect(parseItem({ source: "mystery", model_permaslug: "a/b", display_name: "x" })).toBeNull();
    expect(parseItem({ source: "artificial-analysis", display_name: "no slug" })).toBeNull();
    expect(parseItem({ ...GPQA("a/b", "B", 0.5), accuracy: "high" })).toBeNull();
    expect(parseItem(null)).toBeNull();
  });
});

describe("normalization", () => {
  const snap = buildSnapshot(VALID, NOW);
  const table = (key: string) => snap.tables.find((t) => t.def.key === key);

  test("one ranking per benchmark, best first, with dense ranks", () => {
    expect(snap.tables.map((t) => t.def.key)).toEqual([
      "aa:intelligence",
      "aa:coding",
      "aa:agentic",
      "or:gpqa_diamond",
      "or:search_widesearch",
      "da:models:uicomponent",
    ]);
    expect(table("aa:intelligence")!.rows.map((r) => [r.name, r.rank])).toEqual([
      ["Alpha 1", 1],
      ["Demo GPT", 2],
      ["Beta 2", 3],
    ]);
  });

  test("missing values are left out, never counted as zero", () => {
    expect(table("aa:intelligence")!.rows.map((r) => r.modelId)).not.toContain("other-lab/gamma");
    expect(table("aa:coding")!.rows.map((r) => r.modelId)).not.toContain("demo-lab/beta-2");
    expect(table("or:gpqa_diamond")!.rows.map((r) => r.modelId)).toEqual(["other-lab/gamma", "demo-lab/alpha-1"]);
    for (const t of snap.tables) for (const r of t.rows) expect(r.value).not.toBe(0);
  });

  test("prices are per 1M tokens, joined across rankings by model, null when unknown", () => {
    const alphaGpqa = table("or:gpqa_diamond")!.rows.find((r) => r.modelId === "demo-lab/alpha-1")!;
    expect(alphaGpqa.price).toEqual({ inputPerM: 2.5, outputPerM: 10 });
    const gamma = table("or:gpqa_diamond")!.rows.find((r) => r.modelId === "other-lab/gamma")!;
    // Gamma's AA row has prices even with all-null scores; that is a real price.
    expect(gamma.price).toEqual({ inputPerM: 2.5, outputPerM: 10 });
    const noPrice = buildSnapshot({ data: [GPQA("x/solo", "Solo", 0.5)] }, NOW).tables[0].rows[0];
    expect(noPrice.price).toBeNull();
    expect(formatPrice(null, "en")).toBe("—");
  });

  test("providers come from the model slug", () => {
    const gpt = table("aa:intelligence")!.rows.find((r) => r.modelId === "openai/demo-gpt")!;
    expect(gpt.provider).toBe("openai");
    expect(gpt.providerLabel).toBe("OpenAI");
    expect(table("aa:intelligence")!.rows[0].providerLabel).toBe("Demo Lab");
  });

  test("metrics are formatted under their own unit", () => {
    expect(formatScore(0.72, "accuracy", "en")).toBe("72.0%");
    expect(formatScore(0.72, "accuracy", "es")).toBe("72,0%");
    expect(formatScore(1423.4, "elo", "en")).toBe("1,423");
    expect(formatScore(71.25, "index", "en")).toBe("71.3");
    expect(table("or:search_widesearch")!.def.metric).toBe("f1");
  });

  test("source metadata and validation counts are kept", () => {
    expect(snap.asOf).toBe("2026-10-08T12:00:00Z");
    expect(snap.fetchedAt).toBe(NOW.toISOString());
    const withJunk = buildSnapshot({ data: [...VALID.data, { source: "nope" }, 42] }, NOW);
    expect(withJunk.invalidRows).toBe(2);
    expect(withJunk.tables.length).toBe(snap.tables.length);
  });
});

describe("frontier models", () => {
  test("top-N of a general-capability benchmark qualifies; specialized rankings alone do not", () => {
    const f = frontierModels(buildSnapshot(VALID, NOW));
    const ids = f.map((m) => m.modelId);
    expect(ids).toContain("demo-lab/alpha-1");
    expect(ids).toContain("other-lab/gamma"); // GPQA leader
    // Qualifiers name the benchmark and the rank that earned it.
    const alpha = f.find((m) => m.modelId === "demo-lab/alpha-1")!;
    expect(alpha.qualifiers.map((q) => q.key)).toEqual(expect.arrayContaining(["aa:intelligence", "or:gpqa_diamond"]));
    expect(alpha.qualifiers.every((q) => !q.key.startsWith("da:") && !q.key.includes("search"))).toBe(true);
  });

  test("rank beyond the cut-off is not frontier", () => {
    const many = Array.from({ length: FRONTIER_TOP_N + 3 }, (_, i) => AA(`lab/m${i}`, `M${i}`, 90 - i, null, null));
    const ids = frontierModels(buildSnapshot({ data: many }, NOW)).map((m) => m.modelId);
    expect(ids).toHaveLength(FRONTIER_TOP_N);
    expect(ids).not.toContain(`lab/m${FRONTIER_TOP_N}`);
  });
});

describe("loading and degradation", () => {
  const live = (body: unknown, status = 200) => async () => okResponse(body, status);

  test("no API key: no network call, honest unavailable state", async () => {
    let called = false;
    const r = await loadBenchmarks({ apiKey: "", fetchImpl: (async () => ((called = true), okResponse(VALID))) as typeof fetch });
    expect(r).toEqual({ status: "unavailable", reason: "not_configured" });
    expect(called).toBe(false);
  });

  test("live data: Bearer auth to the documented endpoint, persisted as the last valid snapshot", async () => {
    const store = new MemStore();
    let seen: { url: string; auth: string | null } | null = null;
    const fetchImpl = (async (url: string, init: RequestInit) => {
      seen = { url, auth: new Headers(init.headers).get("authorization") };
      return okResponse(VALID);
    }) as unknown as typeof fetch;
    const r = await loadBenchmarks({ apiKey: "sk-or-test", fetchImpl, store, now: () => NOW });
    expect(r.status).toBe("live");
    expect(seen).toEqual({ url: OPENROUTER_BENCHMARKS_URL, auth: "Bearer sk-or-test" });
    expect(store.writes).toBe(1);
  });

  test.each([
    [401, "unauthorized"],
    [403, "unauthorized"],
    [429, "rate_limited"],
    [500, "upstream_error"],
    [503, "upstream_error"],
  ] as const)("HTTP %i → %s, falling back to the last valid snapshot with its age", async (status, reason) => {
    const previous = buildSnapshot(VALID, new Date("2026-10-08T00:00:00.000Z"));
    const store = new MemStore(previous);
    const r = await loadBenchmarks({ apiKey: "k", fetchImpl: live({ error: { code: status } }, status) as unknown as typeof fetch, store, now: () => NOW });
    expect(r).toMatchObject({ status: "stale", reason });
    if (r.status === "stale") expect(snapshotAgeHours(r.snapshot, NOW)).toBe(36);
    expect(store.writes).toBe(0);
  });

  test("provider failure with no snapshot → unavailable (nothing invented)", async () => {
    const r = await loadBenchmarks({ apiKey: "k", fetchImpl: live({}, 500) as unknown as typeof fetch, store: new MemStore(null) });
    expect(r).toEqual({ status: "unavailable", reason: "upstream_error" });
  });

  test("timeout and network errors", async () => {
    const hang = ((_u: string, init: RequestInit) =>
      new Promise((_, reject) => init.signal?.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" }))))) as unknown as typeof fetch;
    expect(await fetchLive({ apiKey: "k", fetchImpl: hang, timeoutMs: 20 })).toEqual({ ok: false, reason: "timeout" });
    const boom = (async () => {
      throw new TypeError("fetch failed");
    }) as unknown as typeof fetch;
    expect(await fetchLive({ apiKey: "k", fetchImpl: boom })).toEqual({ ok: false, reason: "upstream_error" });
  });

  test("malformed envelope, rows that all fail validation, and an empty list are not served as rankings", async () => {
    expect(await fetchLive({ apiKey: "k", fetchImpl: live({ nope: true }) as unknown as typeof fetch })).toMatchObject({ ok: false, reason: "invalid_response" });
    expect(await fetchLive({ apiKey: "k", fetchImpl: live({ data: [{ source: "artificial-analysis" }] }) as unknown as typeof fetch })).toMatchObject({ ok: false, reason: "invalid_response" });
    expect(await fetchLive({ apiKey: "k", fetchImpl: live({ data: [], meta: {} }) as unknown as typeof fetch })).toMatchObject({ ok: false, reason: "empty" });
    expect(await fetchLive({ apiKey: "k", fetchImpl: (async () => new Response("<html>", { status: 200 })) as unknown as typeof fetch })).toMatchObject({ ok: false, reason: "invalid_response" });
  });

  test("a broken snapshot store never breaks the page", async () => {
    const r = await loadBenchmarks({ apiKey: "k", fetchImpl: live({}, 503) as unknown as typeof fetch, store: new MemStore(null, true) });
    expect(r).toEqual({ status: "unavailable", reason: "upstream_error" });
  });
});
