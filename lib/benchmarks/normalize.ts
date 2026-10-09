// lib/benchmarks/normalize.ts
//
// v1.7.0 — validated OpenRouter benchmark items → one ranking per benchmark.
// Pure: no network, no storage.
//
// Rules:
//   - one benchmark = one ranking; values from different benchmarks are never
//     combined, averaged or compared;
//   - a null/absent score is "not measured" — the row is left out of that
//     ranking, never counted as 0;
//   - prices come from the rows that carry them (Artificial Analysis and
//     Design Arena) and are attached to the same model in every ranking, per
//     1M tokens; when no source has a price, price is null ("—"), not 0;
//   - ranks are dense by score (ties share a rank), sorted best-first.

import { parseItem, type BenchmarkItem, type BenchmarkMeta } from "./schema";
import { getBenchmarkDef, CATEGORY_ORDER, PROVIDER_LABELS, type BenchmarkDef } from "./catalog";

export type Price = { inputPerM: number | null; outputPerM: number | null };

export type BenchmarkRow = {
  modelId: string;
  name: string;
  provider: string;
  providerLabel: string;
  value: number;
  rank: number;
  price: Price | null;
  /** Benchmark-specific context, shown when present. */
  stddev: number | null;
  tasks: number | null;
  costPerTask: number | null;
  winRate: number | null;
  lastRun: string | null;
};

export type BenchmarkTable = {
  def: BenchmarkDef;
  rows: BenchmarkRow[];
};

export type BenchmarksSnapshot = {
  /** When the upstream data was last updated (meta.as_of), if provided. */
  asOf: string | null;
  /** When Promptea fetched and validated it. */
  fetchedAt: string;
  sourceUrl: string | null;
  citation: string | null;
  tables: BenchmarkTable[];
  /** Rows dropped because they failed validation (shape changed upstream). */
  invalidRows: number;
  totalRows: number;
};

export function providerOf(modelId: string): string {
  const slash = modelId.indexOf("/");
  return slash > 0 ? modelId.slice(0, slash).toLowerCase() : "unknown";
}

export function providerLabel(provider: string): string {
  return PROVIDER_LABELS[provider] ?? provider.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function perMillion(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 1_000_000 * 10_000) / 10_000;
}

type Draft = { key: string; metricHint?: "accuracy" | "f1_by_item"; row: Omit<BenchmarkRow, "rank" | "price"> };

function base(item: BenchmarkItem) {
  const provider = providerOf(item.model_permaslug);
  return {
    modelId: item.model_permaslug,
    name: item.display_name,
    provider,
    providerLabel: providerLabel(provider),
    stddev: null,
    tasks: null,
    costPerTask: null,
    winRate: null,
    lastRun: null,
  };
}

function drafts(item: BenchmarkItem): Draft[] {
  switch (item.source) {
    case "artificial-analysis": {
      const out: Draft[] = [];
      const pairs: Array<[string, number | null]> = [
        ["aa:intelligence", item.intelligence_index],
        ["aa:coding", item.coding_index],
        ["aa:agentic", item.agentic_index],
      ];
      for (const [key, value] of pairs) if (value !== null) out.push({ key, row: { ...base(item), value } });
      return out;
    }
    case "design-arena":
      return item.elo === null
        ? []
        : [{ key: `da:${item.arena}:${item.category}`, row: { ...base(item), value: item.elo, winRate: item.win_rate } }];
    case "openrouter":
      if ("primary_metric" in item) {
        return item.primary_score === null
          ? []
          : [
              {
                key: `or:${item.benchmark_type}`,
                metricHint: item.primary_metric,
                row: { ...base(item), value: item.primary_score, tasks: item.total_tasks, costPerTask: item.avg_cost_per_task, lastRun: item.last_run_timestamp ?? null },
              },
            ];
      }
      return item.accuracy === null
        ? []
        : [
            {
              key: `or:${item.benchmark_type}`,
              row: { ...base(item), value: item.accuracy, stddev: item.accuracy_stddev, tasks: item.total_tasks, costPerTask: item.avg_cost_per_task, lastRun: item.last_run_timestamp ?? null },
            },
          ];
  }
}

function priceMap(items: BenchmarkItem[]): Map<string, Price> {
  const map = new Map<string, Price>();
  for (const item of items) {
    if (item.source === "openrouter" || !item.pricing) continue;
    const price = { inputPerM: perMillion(item.pricing.prompt), outputPerM: perMillion(item.pricing.completion) };
    if (price.inputPerM === null && price.outputPerM === null) continue;
    if (!map.has(item.model_permaslug)) map.set(item.model_permaslug, price);
  }
  return map;
}

export function buildSnapshot(raw: { data: unknown[]; meta?: BenchmarkMeta | null }, fetchedAt: Date): BenchmarksSnapshot {
  const items: BenchmarkItem[] = [];
  let invalid = 0;
  for (const r of raw.data) {
    const item = parseItem(r);
    if (item) items.push(item);
    else invalid++;
  }

  const prices = priceMap(items);
  const byKey = new Map<string, { def: BenchmarkDef; rows: Map<string, Omit<BenchmarkRow, "rank">> }>();

  for (const item of items) {
    for (const d of drafts(item)) {
      const def = getBenchmarkDef(d.key, { metric: d.metricHint });
      if (!def) continue;
      const bucket = byKey.get(d.key) ?? { def, rows: new Map() };
      // One row per model per benchmark; keep the best if a model repeats.
      const prev = bucket.rows.get(d.row.modelId);
      if (!prev || d.row.value > prev.value) bucket.rows.set(d.row.modelId, { ...d.row, price: prices.get(d.row.modelId) ?? null });
      byKey.set(d.key, bucket);
    }
  }

  const tables: BenchmarkTable[] = [];
  for (const { def, rows } of byKey.values()) {
    const sorted = [...rows.values()].sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
    let rank = 0;
    let last: number | null = null;
    const ranked = sorted.map((r) => {
      if (last === null || r.value < last) {
        rank++;
        last = r.value;
      }
      return { ...r, rank };
    });
    if (ranked.length) tables.push({ def, rows: ranked });
  }

  tables.sort(
    (a, b) =>
      CATEGORY_ORDER.indexOf(a.def.category) - CATEGORY_ORDER.indexOf(b.def.category) ||
      Number(b.def.frontier) - Number(a.def.frontier) ||
      a.def.key.localeCompare(b.def.key)
  );

  return {
    asOf: raw.meta?.as_of ?? null,
    fetchedAt: fetchedAt.toISOString(),
    sourceUrl: raw.meta?.source_url ?? null,
    citation: raw.meta?.citation ?? null,
    tables,
    invalidRows: invalid,
    totalRows: raw.data.length,
  };
}

// ---------------------------------------------------------------------------
// Frontier models
// ---------------------------------------------------------------------------

/**
 * Promptea's definition of a "frontier model" (v1.7.0):
 *
 *   A model is frontier when it ranks in the top FRONTIER_TOP_N of at least one
 *   general-capability benchmark in the current snapshot — Artificial
 *   Analysis' Intelligence, Coding or Agentic index, or OpenRouter's
 *   GPQA Diamond or τ-bench runs.
 *
 * Why these: they measure broad capability across reasoning, coding and agentic
 * work, which is what "frontier" means in practice. Specialized rankings
 * (search configurations, design preference arenas) are shown but do not make a
 * model frontier on their own, because a narrow win there says little about
 * general capability. The definition is relative to the snapshot: it changes
 * when the data does, and it never uses a model's marketing or release date.
 */
export const FRONTIER_TOP_N = 5;

export type FrontierModel = {
  modelId: string;
  name: string;
  providerLabel: string;
  provider: string;
  qualifiers: Array<{ key: string; label: BenchmarkDef["label"]; rank: number }>;
};

export function frontierModels(snapshot: BenchmarksSnapshot): FrontierModel[] {
  const map = new Map<string, FrontierModel>();
  for (const t of snapshot.tables) {
    if (!t.def.frontier) continue;
    for (const r of t.rows) {
      if (r.rank > FRONTIER_TOP_N) continue;
      const m = map.get(r.modelId) ?? { modelId: r.modelId, name: r.name, provider: r.provider, providerLabel: r.providerLabel, qualifiers: [] };
      m.qualifiers.push({ key: t.def.key, label: t.def.label, rank: r.rank });
      map.set(r.modelId, m);
    }
  }
  return [...map.values()].sort(
    (a, b) => b.qualifiers.length - a.qualifiers.length || Math.min(...a.qualifiers.map((q) => q.rank)) - Math.min(...b.qualifiers.map((q) => q.rank)) || a.name.localeCompare(b.name)
  );
}

/** Human formatting for a score under its benchmark's metric. */
export function formatScore(value: number, metric: BenchmarkDef["metric"], lang: "es" | "en"): string {
  const locale = lang === "es" ? "es-AR" : "en-US";
  if (metric === "accuracy" || metric === "f1") {
    const pct = value <= 1 ? value * 100 : value;
    return `${pct.toLocaleString(locale, { maximumFractionDigits: 1, minimumFractionDigits: 1 })}%`;
  }
  if (metric === "elo") return Math.round(value).toLocaleString(locale);
  return value.toLocaleString(locale, { maximumFractionDigits: 1, minimumFractionDigits: 1 });
}

export function formatPrice(v: number | null, lang: "es" | "en"): string {
  if (v === null) return "—";
  const locale = lang === "es" ? "es-AR" : "en-US";
  return `US$${v.toLocaleString(locale, { maximumFractionDigits: v < 1 ? 3 : 2 })}`;
}
