// lib/benchmarks/chart.ts
//
// v1.8.0 — pure helpers behind the benchmark charts (bars, price/score
// scatter, cost calculator). No React, no DOM: everything that decides WHAT a
// chart says (scales, Pareto frontier, cost maths) is here so it can be tested
// exactly. The charts themselves are plain SVG/CSS (components/benchmarks).
//
// Honesty rules, same as the rest of lib/benchmarks:
//   - a benchmark's values are only ever compared with that benchmark's values;
//   - a missing price is "no data", never 0 — such models are left out of
//     price-based charts and rankings, and the UI says how many were left out;
//   - the Elo axis does not start at zero (Elo has no meaningful zero), and the
//     chart says so.

import type { BenchmarkDef } from "./catalog";
import type { BenchmarkRow, BenchmarkTable } from "./normalize";

// ---------------------------------------------------------------------------
// Values
// ---------------------------------------------------------------------------

/** accuracy / F1 arrive as 0–1 fractions (or already 0–100); charts use 0–100. */
export function toDisplayValue(value: number, metric: BenchmarkDef["metric"]): number {
  if (metric === "accuracy" || metric === "f1") return value <= 1 ? value * 100 : value;
  return value;
}

/** Same conversion for a stddev (a spread in the metric's own unit). */
export function toDisplaySpread(spread: number, metric: BenchmarkDef["metric"]): number {
  if (metric === "accuracy" || metric === "f1") return spread <= 1 ? spread * 100 : spread;
  return spread;
}

export type BarDatum = {
  modelId: string;
  name: string;
  provider: string;
  providerLabel: string;
  rank: number;
  /** In display units (percent for accuracy/F1). */
  value: number;
  /** ± half-width of the error bar in display units, when the source gives a stddev. */
  spread: number | null;
  /** 0–1 position of the bar end inside the axis. */
  ratio: number;
  /** 0–1 positions of the error-bar ends (clamped into the axis). */
  low: number | null;
  high: number | null;
};

export type BarChartModel = {
  bars: BarDatum[];
  axisMin: number;
  axisMax: number;
  /** True when the axis does not start at 0 (Elo): the UI must say so. */
  truncatedAxis: boolean;
  /** Nice tick values for the axis, in display units. */
  ticks: number[];
  total: number;
};

function niceStep(range: number, target = 4): number {
  const raw = range / target;
  const pow = Math.pow(10, Math.floor(Math.log10(raw || 1)));
  const n = raw / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * pow;
}

export function niceTicks(min: number, max: number, target = 4): number[] {
  if (!(max > min)) return [min];
  const step = niceStep(max - min, target);
  const first = Math.ceil(min / step) * step;
  const out: number[] = [];
  for (let v = first; v <= max + step * 1e-9; v += step) out.push(Math.round(v * 1e6) / 1e6);
  return out;
}

/** Top-N horizontal bar chart model for one benchmark. */
export function buildBarChart(table: BenchmarkTable, topN: number): BarChartModel {
  const metric = table.def.metric;
  const rows = table.rows.slice(0, Math.max(1, topN));
  const values = rows.map((r) => toDisplayValue(r.value, metric));
  const spreads = rows.map((r) => (r.stddev !== null && (metric === "accuracy" || metric === "f1") ? toDisplaySpread(r.stddev, metric) : null));

  let axisMin = 0;
  let axisMax: number;
  let truncatedAxis = false;
  if (metric === "accuracy" || metric === "f1") {
    axisMax = 100;
  } else if (metric === "elo") {
    // Elo has no zero: start a little under the weakest bar shown.
    const lo = Math.min(...values);
    const hi = Math.max(...values);
    const pad = Math.max(25, (hi - lo) * 0.15);
    axisMin = Math.floor((lo - pad) / 50) * 50;
    axisMax = Math.ceil((hi + pad * 0.4) / 50) * 50;
    truncatedAxis = true;
  } else {
    const hi = Math.max(...values, 1);
    axisMax = Math.ceil(hi / 10) * 10;
  }
  const span = axisMax - axisMin || 1;
  const clamp = (v: number) => Math.min(1, Math.max(0, v));

  const bars: BarDatum[] = rows.map((r, i) => ({
    modelId: r.modelId,
    name: r.name,
    provider: r.provider,
    providerLabel: r.providerLabel,
    rank: r.rank,
    value: values[i],
    spread: spreads[i],
    ratio: clamp((values[i] - axisMin) / span),
    low: spreads[i] === null ? null : clamp((values[i] - spreads[i]! - axisMin) / span),
    high: spreads[i] === null ? null : clamp((values[i] + spreads[i]! - axisMin) / span),
  }));

  return { bars, axisMin, axisMax, truncatedAxis, ticks: niceTicks(axisMin, axisMax, 4), total: table.rows.length };
}

// ---------------------------------------------------------------------------
// Provider colours — fixed per provider, never the only cue (bars carry text)
// ---------------------------------------------------------------------------

/** Mid-tone hues with ≥3:1 contrast against the light and the dark canvases. */
const PALETTE = ["#2f7de1", "#d9642b", "#1f9d68", "#8b5cf6", "#c2417e", "#a67c00", "#0e8fa6", "#6b7280", "#d94b4b", "#4f9d2f"] as const;

const FIXED: Record<string, number> = {
  openai: 2,
  anthropic: 1,
  google: 0,
  "x-ai": 7,
  deepseek: 3,
  moonshotai: 6,
  "meta-llama": 5,
  mistralai: 4,
  qwen: 8,
  "z-ai": 9,
};

export function providerColor(provider: string): string {
  if (provider in FIXED) return PALETTE[FIXED[provider]];
  let h = 0;
  for (let i = 0; i < provider.length; i++) h = (h * 31 + provider.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

// ---------------------------------------------------------------------------
// Price / score scatter
// ---------------------------------------------------------------------------

export type PricePoint = {
  modelId: string;
  name: string;
  provider: string;
  providerLabel: string;
  /** Display-unit score on the selected benchmark. */
  score: number;
  /** US$ per million INPUT tokens (the axis). */
  inputPerM: number;
  outputPerM: number | null;
  rank: number;
  /** True when no other priced model is both cheaper-or-equal and better-or-equal. */
  efficient: boolean;
};

/**
 * Models of one benchmark that have an input price > 0. `inputPerM` of 0 (free
 * tiers) cannot sit on a log axis and is not a comparable cost; those rows are
 * counted in `excluded`, never plotted at a fake position.
 */
export function pricePoints(table: BenchmarkTable): { points: PricePoint[]; excluded: number } {
  const metric = table.def.metric;
  const pts: Omit<PricePoint, "efficient">[] = [];
  let excluded = 0;
  for (const r of table.rows) {
    const p = r.price?.inputPerM;
    if (p === null || p === undefined || !(p > 0)) {
      excluded++;
      continue;
    }
    pts.push({
      modelId: r.modelId,
      name: r.name,
      provider: r.provider,
      providerLabel: r.providerLabel,
      score: toDisplayValue(r.value, metric),
      inputPerM: p,
      outputPerM: r.price?.outputPerM ?? null,
      rank: r.rank,
    });
  }
  const frontier = paretoFrontier(pts);
  const ids = new Set(frontier.map((p) => p.modelId));
  return { points: pts.map((p) => ({ ...p, efficient: ids.has(p.modelId) })), excluded };
}

/** Non-dominated points: for each, nothing is at least as cheap AND at least as good (and strictly better in one). */
export function paretoFrontier<T extends { inputPerM: number; score: number }>(points: T[]): T[] {
  const sorted = [...points].sort((a, b) => a.inputPerM - b.inputPerM || b.score - a.score);
  const out: T[] = [];
  let best = -Infinity;
  for (const p of sorted) {
    if (p.score > best) {
      out.push(p);
      best = p.score;
    }
  }
  return out;
}

export type LogScale = { min: number; max: number; ticks: number[]; at: (v: number) => number };

/** Log10 axis snapped to decades: at(v) ∈ [0,1]. */
export function logScale(values: number[]): LogScale {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const min = Math.pow(10, Math.floor(Math.log10(lo)));
  let max = Math.pow(10, Math.ceil(Math.log10(hi)));
  if (max <= min) max = min * 10;
  const a = Math.log10(min);
  const b = Math.log10(max);
  const ticks: number[] = [];
  for (let e = a; e <= b + 1e-9; e++) ticks.push(Math.pow(10, e));
  return { min, max, ticks, at: (v) => (Math.log10(Math.max(v, min)) - a) / (b - a) };
}

// ---------------------------------------------------------------------------
// Cost calculator (v1.8.0)
// ---------------------------------------------------------------------------

export type CostRow = {
  modelId: string;
  name: string;
  provider: string;
  providerLabel: string;
  inputPerM: number;
  outputPerM: number;
  score: number;
  rank: number;
  /** US$ for the requested token volumes. */
  cost: number;
  /** Score points per US$ spent (higher = better value); null when cost is 0. */
  scorePerDollar: number | null;
  /** US$ to buy one score point; lower = better value. */
  costPerPoint: number | null;
};

/** Cost of a workload: tokens × (US$ per million) / 1e6. Non-finite or negative → 0 tokens. */
export function estimateCost(inputPerM: number, outputPerM: number, inputTokens: number, outputTokens: number): number {
  const clean = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);
  return (clean(inputTokens) * inputPerM + clean(outputTokens) * outputPerM) / 1_000_000;
}

/**
 * One row per model that has BOTH an input and an output price. Models with a
 * missing price are excluded (counted), never priced at 0.
 */
export function costRows(table: BenchmarkTable, inputTokens: number, outputTokens: number): { rows: CostRow[]; excluded: number } {
  const metric = table.def.metric;
  const rows: CostRow[] = [];
  let excluded = 0;
  for (const r of table.rows) {
    const inP = r.price?.inputPerM;
    const outP = r.price?.outputPerM;
    if (inP === null || inP === undefined || outP === null || outP === undefined) {
      excluded++;
      continue;
    }
    const score = toDisplayValue(r.value, metric);
    const cost = estimateCost(inP, outP, inputTokens, outputTokens);
    rows.push({
      modelId: r.modelId,
      name: r.name,
      provider: r.provider,
      providerLabel: r.providerLabel,
      inputPerM: inP,
      outputPerM: outP,
      score,
      rank: r.rank,
      cost,
      scorePerDollar: cost > 0 ? score / cost : null,
      costPerPoint: score > 0 ? cost / score : null,
    });
  }
  return { rows, excluded };
}

export type CostSort = "value" | "cost" | "score";

/** Sort a cost table. "value" = cheapest per score point first; unknowns last. */
export function sortCostRows(rows: CostRow[], sort: CostSort): CostRow[] {
  const copy = [...rows];
  copy.sort((a, b) => {
    if (sort === "cost") return a.cost - b.cost || b.score - a.score;
    if (sort === "score") return b.score - a.score || a.cost - b.cost;
    const av = a.costPerPoint ?? Infinity;
    const bv = b.costPerPoint ?? Infinity;
    return av - bv || b.score - a.score;
  });
  return copy;
}

/** Compact token count: 1.2k, 3.4M. */
export function formatTokens(n: number, locale: string): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString(locale, { maximumFractionDigits: 1 })}M`;
  if (n >= 1_000) return `${(n / 1_000).toLocaleString(locale, { maximumFractionDigits: 1 })}k`;
  return n.toLocaleString(locale);
}

/** US$ with adaptive precision: tiny workloads need more decimals. */
export function formatUsd(v: number, locale: string): string {
  if (v === 0) return "US$0";
  if (v < 0.01) return `US$${v.toLocaleString(locale, { maximumSignificantDigits: 2 })}`;
  if (v < 1) return `US$${v.toLocaleString(locale, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`;
  return `US$${v.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ---------------------------------------------------------------------------
// Frontier matrix
// ---------------------------------------------------------------------------

export type MatrixCell = { rank: number; value: number } | null;
export type FrontierMatrix = {
  columns: Array<{ key: string; label: BenchmarkDef["label"]; metric: BenchmarkDef["metric"] }>;
  rows: Array<{ modelId: string; name: string; provider: string; providerLabel: string; cells: MatrixCell[] }>;
};

/** Models × frontier benchmarks: each cell is that model's rank (and score) in that benchmark. */
export function frontierMatrix(tables: BenchmarkTable[], modelIds: string[]): FrontierMatrix {
  const cols = tables.filter((t) => t.def.frontier);
  const byId = new Map<string, BenchmarkRow>();
  for (const t of tables) for (const r of t.rows) if (!byId.has(r.modelId)) byId.set(r.modelId, r);
  return {
    columns: cols.map((t) => ({ key: t.def.key, label: t.def.label, metric: t.def.metric })),
    rows: modelIds
      .map((id) => {
        const base = byId.get(id);
        if (!base) return null;
        return {
          modelId: id,
          name: base.name,
          provider: base.provider,
          providerLabel: base.providerLabel,
          cells: cols.map((t) => {
            const row = t.rows.find((r) => r.modelId === id);
            return row ? { rank: row.rank, value: row.value } : null;
          }),
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null),
  };
}
