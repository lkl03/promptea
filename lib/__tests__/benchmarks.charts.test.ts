// v1.8.0 — the maths behind the benchmark charts and the cost calculator.

import { describe, expect, test } from "vitest";
import { buildSnapshot } from "@/lib/benchmarks/normalize";
import {
  buildBarChart,
  costRows,
  estimateCost,
  formatUsd,
  frontierMatrix,
  logScale,
  niceTicks,
  paretoFrontier,
  pricePoints,
  providerColor,
  sortCostRows,
  toDisplayValue,
} from "@/lib/benchmarks/chart";

const AA = (slug: string, name: string, i: number | null, prompt: string | null, completion: string | null) => ({
  source: "artificial-analysis",
  model_permaslug: slug,
  display_name: name,
  intelligence_index: i,
  coding_index: null,
  agentic_index: null,
  pricing: prompt === null && completion === null ? null : { prompt, completion },
});
const GPQA = (slug: string, name: string, accuracy: number, sd: number | null) => ({
  source: "openrouter",
  model_permaslug: slug,
  display_name: name,
  benchmark_type: "gpqa_diamond",
  accuracy,
  accuracy_stddev: sd,
  avg_cost_per_task: null,
  total_tasks: 100,
});
const DA = (slug: string, name: string, elo: number) => ({
  source: "design-arena",
  model_permaslug: slug,
  display_name: name,
  arena: "models",
  category: "uicomponent",
  elo,
  win_rate: 50,
  avg_generation_time_ms: 1,
  pricing: null,
});

const snap = buildSnapshot(
  {
    data: [
      AA("a/cheap", "Cheap", 40, "0.0000005", "0.000002"),
      AA("a/mid", "Mid", 60, "0.000003", "0.000012"),
      AA("b/top", "Top", 80, "0.00001", "0.00004"),
      AA("b/dominated", "Dominated", 55, "0.00002", "0.00008"), // pricier AND worse than Mid
      AA("c/free", "Free", 30, "0", "0"),
      AA("c/noprice", "NoPrice", 20, null, null),
      GPQA("a/mid", "Mid", 0.7, 0.04),
      GPQA("b/top", "Top", 0.9, null),
      DA("a/cheap", "Cheap", 1200),
      DA("b/top", "Top", 1380),
    ],
  },
  new Date("2026-10-09T00:00:00Z")
);
const table = (key: string) => snap.tables.find((t) => t.def.key === key)!;

describe("bar chart model", () => {
  test("accuracy: 0–100 axis, fractions become percent, stddev becomes an error bar", () => {
    const m = buildBarChart(table("or:gpqa_diamond"), 10);
    expect(m.axisMin).toBe(0);
    expect(m.axisMax).toBe(100);
    expect(m.truncatedAxis).toBe(false);
    const top = m.bars[0];
    expect(top.name).toBe("Top");
    expect(top.value).toBeCloseTo(90);
    expect(top.spread).toBeNull();
    expect(top.low).toBeNull();
    const mid = m.bars[1];
    expect(mid.spread).toBeCloseTo(4);
    expect(mid.low!).toBeCloseTo(0.66);
    expect(mid.high!).toBeCloseTo(0.74);
  });

  test("top-N truncates but reports the full size", () => {
    const m = buildBarChart(table("aa:intelligence"), 3);
    expect(m.bars).toHaveLength(3);
    expect(m.total).toBe(6);
    expect(m.bars.map((b) => b.rank)).toEqual([1, 2, 3]);
  });

  test("elo: axis does not start at zero and says so; ratios stay within 0–1", () => {
    const m = buildBarChart(table("da:models:uicomponent"), 10);
    expect(m.truncatedAxis).toBe(true);
    expect(m.axisMin).toBeGreaterThan(0);
    for (const b of m.bars) {
      expect(b.ratio).toBeGreaterThanOrEqual(0);
      expect(b.ratio).toBeLessThanOrEqual(1);
    }
    expect(m.bars[0].ratio).toBeGreaterThan(m.bars[1].ratio);
  });

  test("index: axis rounds up to a multiple of ten", () => {
    expect(buildBarChart(table("aa:intelligence"), 10).axisMax).toBe(80);
  });

  test("toDisplayValue leaves indices and elo alone", () => {
    expect(toDisplayValue(71.2, "index")).toBe(71.2);
    expect(toDisplayValue(1423, "elo")).toBe(1423);
    expect(toDisplayValue(0.5, "accuracy")).toBe(50);
    expect(toDisplayValue(63, "accuracy")).toBe(63);
  });

  test("niceTicks are monotonic and inside the range", () => {
    const t = niceTicks(0, 100, 4);
    expect(t[0]).toBe(0);
    expect(t.at(-1)).toBeLessThanOrEqual(100);
    expect([...t].sort((a, b) => a - b)).toEqual(t);
  });
});

describe("price / score scatter", () => {
  test("free and unpriced models are excluded and counted, never plotted at a fake position", () => {
    const { points, excluded } = pricePoints(table("aa:intelligence"));
    expect(points.map((p) => p.name).sort()).toEqual(["Cheap", "Dominated", "Mid", "Top"]);
    expect(excluded).toBe(2);
    expect(points.every((p) => p.inputPerM > 0)).toBe(true);
  });

  test("input price is per million tokens", () => {
    const { points } = pricePoints(table("aa:intelligence"));
    expect(points.find((p) => p.name === "Mid")!.inputPerM).toBe(3);
    expect(points.find((p) => p.name === "Mid")!.outputPerM).toBe(12);
  });

  test("pareto frontier: a model priced higher AND scoring lower is dominated", () => {
    const { points } = pricePoints(table("aa:intelligence"));
    const eff = Object.fromEntries(points.map((p) => [p.name, p.efficient]));
    expect(eff).toEqual({ Cheap: true, Mid: true, Top: true, Dominated: false });
  });

  test("paretoFrontier handles ties and empty input", () => {
    expect(paretoFrontier([])).toEqual([]);
    const f = paretoFrontier([
      { inputPerM: 1, score: 50 },
      { inputPerM: 1, score: 40 },
      { inputPerM: 2, score: 50 },
    ]);
    expect(f).toEqual([{ inputPerM: 1, score: 50 }]);
  });

  test("logScale snaps to decades and maps into 0–1", () => {
    const s = logScale([0.5, 12, 80]);
    expect(s.min).toBe(0.1);
    expect(s.max).toBe(100);
    expect(s.ticks).toEqual([0.1, 1, 10, 100]);
    expect(s.at(0.1)).toBeCloseTo(0);
    expect(s.at(100)).toBeCloseTo(1);
    expect(s.at(10)).toBeCloseTo(2 / 3);
  });
});

describe("cost calculator", () => {
  test("estimateCost = tokens × price per million", () => {
    expect(estimateCost(3, 12, 1_000_000, 500_000)).toBeCloseTo(3 + 6);
    expect(estimateCost(3, 12, 2_000, 1_000)).toBeCloseTo(0.006 + 0.012);
  });

  test("bad token counts count as zero, never NaN", () => {
    expect(estimateCost(3, 12, NaN, -5)).toBe(0);
    expect(estimateCost(3, 12, Infinity, 0)).toBe(0);
  });

  test("models without both prices are excluded and counted", () => {
    const { rows, excluded } = costRows(table("aa:intelligence"), 10_000, 2_000);
    expect(excluded).toBe(1); // NoPrice (Free has explicit 0/0 → priced, cost 0)
    const free = rows.find((r) => r.name === "Free")!;
    expect(free.cost).toBe(0);
    expect(free.scorePerDollar).toBeNull();
  });

  test("value ranking = lowest cost per score point first; cost and score sorts", () => {
    const { rows } = costRows(table("aa:intelligence"), 100_000, 20_000);
    const byValue = sortCostRows(rows, "value").map((r) => r.name);
    expect(byValue[0]).toBe("Free"); // 0 cost per point
    expect(byValue.indexOf("Cheap")).toBeLessThan(byValue.indexOf("Top"));
    expect(sortCostRows(rows, "cost")[0].name).toBe("Free");
    expect(sortCostRows(rows, "score")[0].name).toBe("Top");
  });

  test("formatUsd keeps tiny amounts legible", () => {
    expect(formatUsd(0, "en-US")).toBe("US$0");
    expect(formatUsd(0.00042, "en-US")).toBe("US$0.00042");
    expect(formatUsd(0.5, "en-US")).toBe("US$0.500");
    expect(formatUsd(12.3456, "en-US")).toBe("US$12.35");
  });
});

describe("frontier matrix + provider colours", () => {
  test("cells carry the model's rank in each frontier benchmark; missing = null", () => {
    const m = frontierMatrix(snap.tables, ["b/top", "a/cheap"]);
    expect(m.columns.map((c) => c.key)).toEqual(expect.arrayContaining(["aa:intelligence", "or:gpqa_diamond"]));
    const iIdx = m.columns.findIndex((c) => c.key === "aa:intelligence");
    const gIdx = m.columns.findIndex((c) => c.key === "or:gpqa_diamond");
    const top = m.rows.find((r) => r.modelId === "b/top")!;
    expect(top.cells[iIdx]).toEqual({ rank: 1, value: 80 });
    expect(top.cells[gIdx]!.rank).toBe(1);
    const cheap = m.rows.find((r) => r.modelId === "a/cheap")!;
    expect(cheap.cells[gIdx]).toBeNull();
  });

  test("provider colours are stable and from the palette", () => {
    expect(providerColor("anthropic")).toBe(providerColor("anthropic"));
    expect(providerColor("some-new-lab")).toMatch(/^#[0-9a-f]{6}$/);
    expect(providerColor("openai")).not.toBe(providerColor("anthropic"));
  });
});
