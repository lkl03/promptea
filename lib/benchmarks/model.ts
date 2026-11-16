// lib/benchmarks/model.ts
//
// v1.8.7 — the per-model view of a benchmarks snapshot: everything the model
// panel and the comparison show, as pure functions (no React, no DOM, no
// network), tested in lib/__tests__/benchmarks.model.test.ts.
//
// Honesty rules, the same as the rest of lib/benchmarks:
//   - a model's score in a benchmark is shown in THAT benchmark's metric, with
//     its rank among the models that benchmark measured; scores of different
//     benchmarks are never added, averaged or put on one scale;
//   - what can be put side by side across benchmarks is the POSITION (rank out
//     of N, and the share of measured models it beats), which is a property of
//     each ranking, never a mix of metrics;
//   - a benchmark the model is not in is "not measured", never 0;
//   - a missing price is "no price", never free; no release date is invented
//     (the OpenRouter benchmarks API does not carry one).

import type { BenchmarkDef } from "./catalog";
import { CATEGORY_ORDER, PROVIDER_TO_PROMPTEA } from "./catalog";
import { toDisplayValue, estimateCost } from "./chart";
import { FRONTIER_TOP_N, type BenchmarkTable, type Price } from "./normalize";

/** A model is "strong" in a benchmark when it is in the top N or beats at least this share of the field. */
export const STRENGTH_TOP_N = FRONTIER_TOP_N;
export const STRENGTH_SHARE = 0.9;
/** At most this many models in a comparison. */
export const MAX_COMPARE = 4;

export type ModelScore = {
  key: string;
  def: Pick<BenchmarkDef, "key" | "category" | "source" | "label" | "metric" | "metricLabel" | "frontier">;
  /** Raw value as the source reports it (fractions for accuracy/F1). */
  value: number;
  /** Value in display units (percent for accuracy/F1). */
  display: number;
  stddev: number | null;
  rank: number;
  /** Models measured in this benchmark. */
  total: number;
  /** Share of the OTHER measured models this one ranks above (0–1); 1 = first of all. */
  beats: number;
  /** In the top STRENGTH_TOP_N or above STRENGTH_SHARE of the field. */
  strong: boolean;
};

export type ModelProfile = {
  modelId: string;
  name: string;
  provider: string;
  providerLabel: string;
  price: Price | null;
  /** Every benchmark the model appears in, in the page's category order, then best position first. */
  scores: ModelScore[];
  /** Frontier qualifiers (general-capability benchmarks where it is in the top FRONTIER_TOP_N). */
  frontier: Array<{ key: string; label: BenchmarkDef["label"]; rank: number }>;
  /** Benchmarks where it is strong, best position first. */
  strengths: ModelScore[];
  /** Promptea's page for the family, when there is one. */
  promptea: { modelPage: string; target: string } | null;
};

/** "Claude X 5 (Max, Default Fallback)" → the shortest clean name among the ones the sources use. */
export function preferredName(names: string[]): string {
  const clean = names.map((n) => n.trim()).filter(Boolean);
  if (!clean.length) return "";
  const plain = clean.filter((n) => !/\(.*\)\s*$/.test(n));
  const pool = plain.length ? plain : clean;
  return [...pool].sort((a, b) => a.length - b.length || a.localeCompare(b))[0];
}

/** Share of the other measured models a rank beats (dense ranks: ties share a rank). */
export function beatsShare(rank: number, total: number, rowsAbove: number): number {
  if (total <= 1) return 1;
  return Math.max(0, Math.min(1, (total - 1 - rowsAbove) / (total - 1)));
}

function categoryIndex(c: BenchmarkDef["category"]): number {
  const i = CATEGORY_ORDER.indexOf(c);
  return i < 0 ? 99 : i;
}

/** The profile of every model in the snapshot, keyed by model id. */
export function buildModelIndex(tables: BenchmarkTable[]): Map<string, ModelProfile> {
  const names = new Map<string, string[]>();
  const index = new Map<string, ModelProfile>();
  for (const t of tables) {
    const total = t.rows.length;
    t.rows.forEach((r, i) => {
      // Rows above this one with a strictly better rank (ties are not "above").
      let above = i;
      while (above > 0 && t.rows[above - 1].rank === r.rank) above--;
      const beats = beatsShare(r.rank, total, above);
      const score: ModelScore = {
        key: t.def.key,
        def: { key: t.def.key, category: t.def.category, source: t.def.source, label: t.def.label, metric: t.def.metric, metricLabel: t.def.metricLabel, frontier: t.def.frontier },
        value: r.value,
        display: toDisplayValue(r.value, t.def.metric),
        stddev: r.stddev,
        rank: r.rank,
        total,
        beats,
        strong: r.rank <= STRENGTH_TOP_N || (total >= 10 && beats >= STRENGTH_SHARE),
      };
      const p =
        index.get(r.modelId) ??
        ({ modelId: r.modelId, name: r.name, provider: r.provider, providerLabel: r.providerLabel, price: null, scores: [], frontier: [], strengths: [], promptea: PROVIDER_TO_PROMPTEA[r.provider] ?? null } as ModelProfile);
      p.scores.push(score);
      if (!p.price && r.price) p.price = r.price;
      if (t.def.frontier && r.rank <= FRONTIER_TOP_N) p.frontier.push({ key: t.def.key, label: t.def.label, rank: r.rank });
      index.set(r.modelId, p);
      names.set(r.modelId, [...(names.get(r.modelId) ?? []), r.name]);
    });
  }
  for (const p of index.values()) {
    p.name = preferredName(names.get(p.modelId) ?? [p.name]) || p.name;
    p.scores.sort((a, b) => categoryIndex(a.def.category) - categoryIndex(b.def.category) || Number(b.def.frontier) - Number(a.def.frontier) || a.rank - b.rank || a.key.localeCompare(b.key));
    p.frontier.sort((a, b) => a.rank - b.rank || a.key.localeCompare(b.key));
    p.strengths = p.scores.filter((s) => s.strong).sort((a, b) => a.rank - b.rank || b.beats - a.beats || a.key.localeCompare(b.key));
  }
  return index;
}

export function modelProfile(tables: BenchmarkTable[], modelId: string): ModelProfile | null {
  return buildModelIndex(tables).get(modelId) ?? null;
}

// ---------------------------------------------------------------------------
// Comparison
// ---------------------------------------------------------------------------

export type CompareRow = {
  key: string;
  def: ModelScore["def"];
  /** One entry per compared model, in order: its score in this benchmark, or null (not measured). */
  cells: Array<ModelScore | null>;
  /** Every compared model is measured here. */
  common: boolean;
  /** Index of the best model in this row (highest value), among the measured ones. */
  best: number | null;
};

export type Comparison = {
  models: ModelProfile[];
  rows: CompareRow[];
  /** Keys of the benchmarks every model shares. */
  common: string[];
};

/** Up to MAX_COMPARE known, distinct models, compared benchmark by benchmark. */
export function compareModels(index: Map<string, ModelProfile>, ids: string[]): Comparison {
  const models = [...new Set(ids)].map((id) => index.get(id)).filter((m): m is ModelProfile => Boolean(m)).slice(0, MAX_COMPARE);
  const keys: string[] = [];
  const defs = new Map<string, ModelScore["def"]>();
  for (const m of models)
    for (const s of m.scores) {
      if (!defs.has(s.key)) {
        defs.set(s.key, s.def);
        keys.push(s.key);
      }
    }
  const rows: CompareRow[] = keys.map((key) => {
    const cells = models.map((m) => m.scores.find((s) => s.key === key) ?? null);
    let best: number | null = null;
    cells.forEach((c, i) => {
      if (c && (best === null || c.value > (cells[best] as ModelScore).value)) best = i;
    });
    return { key, def: defs.get(key)!, cells, common: cells.every(Boolean), best };
  });
  rows.sort(
    (a, b) =>
      Number(b.common) - Number(a.common) ||
      b.cells.filter(Boolean).length - a.cells.filter(Boolean).length ||
      categoryIndex(a.def.category) - categoryIndex(b.def.category) ||
      Number(b.def.frontier) - Number(a.def.frontier) ||
      a.key.localeCompare(b.key)
  );
  return { models, rows, common: rows.filter((r) => r.common).map((r) => r.key) };
}

/**
 * Cost per score point of one benchmark for a workload (the cost calculator's
 * "chat" preset by default: 1,000 input + 500 output tokens per request,
 * 1,000 requests). null when the model has no complete price or no score there.
 */
export function costPerPoint(model: ModelProfile, key: string, workload = { input: 1_000, output: 500, requests: 1_000 }): number | null {
  const s = model.scores.find((x) => x.key === key);
  const p = model.price;
  if (!s || !p || p.inputPerM === null || p.outputPerM === null || !(s.display > 0)) return null;
  return (estimateCost(p.inputPerM, p.outputPerM, workload.input, workload.output) * workload.requests) / s.display;
}

// ---------------------------------------------------------------------------
// Frontier quick view and URL state
// ---------------------------------------------------------------------------

/**
 * The models the "Frontier models" section leads with: the top `n` of the
 * general benchmark (Intelligence Index), or of the first frontier benchmark
 * in the snapshot when that one is missing.
 */
export function frontierLeaders(tables: BenchmarkTable[], index: Map<string, ModelProfile>, n = 6): { key: string | null; models: Array<{ profile: ModelProfile; score: ModelScore }> } {
  const table = tables.find((t) => t.def.key === "aa:intelligence") ?? tables.find((t) => t.def.frontier);
  if (!table) return { key: null, models: [] };
  const models = table.rows
    .slice(0, n)
    .map((r) => index.get(r.modelId))
    .filter((p): p is ModelProfile => Boolean(p))
    .map((profile) => ({ profile, score: profile.scores.find((s) => s.key === table.def.key)! }));
  return { key: table.def.key, models };
}

export type BenchHash = { b: string | null; m: string | null; c: string[] };

/** "#b=aa:coding&m=openai/gpt-x&c=a,b" → its parts (unknown keys ignored, values decoded). */
export function parseBenchHash(hash: string): BenchHash {
  const out: BenchHash = { b: null, m: null, c: [] };
  for (const part of hash.replace(/^#/, "").split("&")) {
    const eq = part.indexOf("=");
    if (eq < 1) continue;
    const k = part.slice(0, eq);
    let v: string;
    try {
      v = decodeURIComponent(part.slice(eq + 1));
    } catch {
      continue;
    }
    if (!v || v.length > 400) continue;
    if (k === "b") out.b = v;
    else if (k === "m") out.m = v;
    else if (k === "c") out.c = [...new Set(v.split(",").filter(Boolean))].slice(0, MAX_COMPARE);
  }
  return out;
}

export function buildBenchHash(h: Partial<BenchHash>): string {
  const parts: string[] = [];
  if (h.b) parts.push(`b=${encodeURIComponent(h.b)}`);
  if (h.m) parts.push(`m=${encodeURIComponent(h.m)}`);
  if (h.c && h.c.length) parts.push(`c=${h.c.map(encodeURIComponent).join(",")}`);
  return parts.length ? `#${parts.join("&")}` : "";
}
