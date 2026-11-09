// lib/benchmarks/teaser.ts
//
// v1.8.0 — the small "benchmarks at a glance" block on the homepage: the top
// of ONE ranking (Artificial Analysis' Intelligence Index when the snapshot
// has it, otherwise the first general-capability ranking, otherwise the first
// ranking at all). Pure; the homepage decides what to do when there is no
// snapshot (it falls back to a plain link card — nothing is invented).

import type { BenchmarksSnapshot } from "./normalize";
import type { BenchmarkDef } from "./catalog";
import { toDisplayValue } from "./chart";

export type TeaserRow = { modelId: string; name: string; provider: string; providerLabel: string; rank: number; value: number; display: number; ratio: number };
export type Teaser = { def: BenchmarkDef; rows: TeaserRow[]; asOf: string | null; fetchedAt: string };

export const TEASER_PREFERRED_KEY = "aa:intelligence";

export function buildTeaser(snapshot: BenchmarksSnapshot | null, n = 5): Teaser | null {
  if (!snapshot || snapshot.tables.length === 0) return null;
  const table =
    snapshot.tables.find((t) => t.def.key === TEASER_PREFERRED_KEY) ??
    snapshot.tables.find((t) => t.def.frontier) ??
    snapshot.tables[0];
  const top = table.rows.slice(0, Math.max(1, n));
  const displays = top.map((r) => toDisplayValue(r.value, table.def.metric));
  const max = table.def.metric === "accuracy" || table.def.metric === "f1" ? 100 : Math.max(...displays, 1);
  // Elo has no zero: a mini-bar would exaggerate or hide differences, so the teaser shows bars only for 0-based metrics.
  const zeroBased = table.def.metric !== "elo";
  return {
    def: table.def,
    asOf: snapshot.asOf,
    fetchedAt: snapshot.fetchedAt,
    rows: top.map((r, i) => ({
      modelId: r.modelId,
      name: r.name,
      provider: r.provider,
      providerLabel: r.providerLabel,
      rank: r.rank,
      value: r.value,
      display: displays[i],
      ratio: zeroBased ? Math.min(1, displays[i] / max) : 0,
    })),
  };
}
