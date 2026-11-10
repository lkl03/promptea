// lib/benchmarks/compact.ts
//
// v1.8.1 — the wire format of the benchmark tables sent to the interactive
// dashboard (a client component).
//
// Why: in v1.8.0 the page serialised every row of every table as a full object
// into the HTML (the React Server Components payload). With ~1,300 rows that
// was ~520 KB of the 680 KB document, most of it repeated key names
// ("costPerTask":null,"winRate":null,…) and fields the dashboard never reads.
// Here each row travels as a small tuple with only what the charts use, and
// everything derivable (provider, provider label, rank) is rebuilt on arrival.
// Nothing is rounded or dropped from what is displayed.
//
// The long descriptive texts of a benchmark (what it measures, limitations)
// stay on the server: the page renders them itself in "What each one measures".

import type { BenchmarkDef } from "./catalog";
import { providerLabel, providerOf, type BenchmarkRow, type BenchmarkTable } from "./normalize";

/** [modelId, name, value, stddev, inputPerM, outputPerM] — price fields are null when there is no price at all. */
export type CompactRow = [string, string, number, number | null, number | null, number | null] | [string, string, number];

export type CompactDef = Pick<BenchmarkDef, "key" | "category" | "source" | "label" | "metric" | "metricLabel" | "frontier">;

export type CompactTable = { def: CompactDef; rows: CompactRow[] };

export function compactTables(tables: BenchmarkTable[]): CompactTable[] {
  return tables.map((t) => ({
    def: {
      key: t.def.key,
      category: t.def.category,
      source: t.def.source,
      label: t.def.label,
      metric: t.def.metric,
      metricLabel: t.def.metricLabel,
      frontier: t.def.frontier,
    },
    rows: t.rows.map((r): CompactRow => {
      const hasPrice = r.price !== null;
      // The short form covers the common "no stddev, no price" row.
      if (r.stddev === null && !hasPrice) return [r.modelId, r.name, r.value];
      return [r.modelId, r.name, r.value, r.stddev, hasPrice ? r.price!.inputPerM : null, hasPrice ? r.price!.outputPerM : null];
    }),
  }));
}

const EMPTY_TEXT = { es: "", en: "", pt: "" };

/**
 * Rebuilds full tables. Rows arrive in ranking order (best first); ranks are
 * dense with ties sharing a rank, exactly as buildSnapshot() assigns them.
 * A price whose two sides are both null is "no price" — the same thing the
 * charts already treat as missing.
 */
export function expandTables(compact: CompactTable[]): BenchmarkTable[] {
  return compact.map((t) => {
    let rank = 0;
    let last: number | null = null;
    const rows: BenchmarkRow[] = t.rows.map((c) => {
      const [modelId, name, value] = c;
      const stddev = c.length > 3 ? (c[3] ?? null) : null;
      const inputPerM = c.length > 3 ? (c[4] ?? null) : null;
      const outputPerM = c.length > 3 ? (c[5] ?? null) : null;
      if (last === null || value < last) {
        rank++;
        last = value;
      }
      const provider = providerOf(modelId);
      return {
        modelId,
        name,
        provider,
        providerLabel: providerLabel(provider),
        value,
        rank,
        price: inputPerM === null && outputPerM === null ? null : { inputPerM, outputPerM },
        stddev,
        tasks: null,
        costPerTask: null,
        winRate: null,
        lastRun: null,
      };
    });
    return { def: { ...t.def, measures: EMPTY_TEXT, limitations: EMPTY_TEXT }, rows };
  });
}
