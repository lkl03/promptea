// v1.8.1 — benchmarks: the provider-share donut model, the compact wire format
// of the dashboard tables, and the layout contract of the ranking picker (the
// v1.8.0 bug: benchmark cards grew past their grid track and slid under the
// chart panel).

import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { devFixtureSnapshot } from "@/lib/benchmarks/dev-fixture";
import { buildBarChart, donutArcs, providerShare, PROVIDER_SHARE_MAX_SLICES } from "@/lib/benchmarks/chart";
import { compactTables, expandTables } from "@/lib/benchmarks/compact";

const snapshot = devFixtureSnapshot(new Date("2026-11-10T12:00:00.000Z"));

describe("provider share", () => {
  const row = (provider: string, rank: number) => ({ provider, providerLabel: provider.toUpperCase(), rank });

  test("counts models per provider; shares sum to 1; most models first, ties by best rank", () => {
    const slices = providerShare([row("a", 1), row("b", 2), row("b", 3), row("c", 4), row("a", 5), row("b", 6)]);
    expect(slices.map((s) => [s.provider, s.count])).toEqual([
      ["b", 3],
      ["a", 2],
      ["c", 1],
    ]);
    expect(slices.reduce((n, s) => n + s.share, 0)).toBeCloseTo(1, 10);
    expect(slices[1].bestRank).toBe(1);
    const tie = providerShare([row("x", 2), row("y", 1)]);
    expect(tie.map((s) => s.provider)).toEqual(["y", "x"]);
  });

  test("groups the tail into one 'other' slice, always last, without losing models", () => {
    const rows = Array.from({ length: 10 }, (_, i) => row(`p${i}`, i + 1));
    const slices = providerShare(rows);
    expect(slices).toHaveLength(PROVIDER_SHARE_MAX_SLICES);
    const other = slices.at(-1)!;
    expect(other.grouped).toBe(true);
    expect(other.provider).toBe("other");
    expect(slices.reduce((n, s) => n + s.count, 0)).toBe(10);
    expect(slices.slice(0, -1).every((s) => !s.grouped)).toBe(true);
  });

  test("empty input gives no slices; one provider gives one full slice", () => {
    expect(providerShare([])).toEqual([]);
    const one = providerShare([row("a", 1), row("a", 2)]);
    expect(one).toHaveLength(1);
    expect(one[0].share).toBe(1);
  });

  test("describes exactly the bars of the chart it sits next to (real fixture)", () => {
    for (const table of snapshot.tables) {
      const bars = buildBarChart(table, 10).bars;
      const slices = providerShare(bars);
      expect(slices.reduce((n, s) => n + s.count, 0)).toBe(bars.length);
    }
  });

  test("donut arcs are contiguous and end at 1", () => {
    const arcs = donutArcs([0.5, 0.3, 0.2]);
    expect(arcs[0]).toEqual({ start: 0, end: 0.5 });
    expect(arcs[1].start).toBe(0.5);
    expect(arcs[2].end).toBeCloseTo(1, 10);
  });
});

describe("compact wire format of the dashboard tables", () => {
  const compact = compactTables(snapshot.tables);
  const back = expandTables(compact);

  test("round-trips every field the charts read", () => {
    expect(back).toHaveLength(snapshot.tables.length);
    snapshot.tables.forEach((t, i) => {
      expect(back[i].def.key).toBe(t.def.key);
      expect(back[i].def.label).toEqual(t.def.label);
      expect(back[i].def.metric).toBe(t.def.metric);
      expect(back[i].def.metricLabel).toEqual(t.def.metricLabel);
      expect(back[i].def.category).toBe(t.def.category);
      expect(back[i].def.source).toBe(t.def.source);
      expect(back[i].def.frontier).toBe(t.def.frontier);
      expect(back[i].rows).toHaveLength(t.rows.length);
      t.rows.forEach((r, j) => {
        const b = back[i].rows[j];
        expect({ modelId: b.modelId, name: b.name, provider: b.provider, providerLabel: b.providerLabel, value: b.value, rank: b.rank, stddev: b.stddev }).toEqual({
          modelId: r.modelId,
          name: r.name,
          provider: r.provider,
          providerLabel: r.providerLabel,
          value: r.value,
          rank: r.rank,
          stddev: r.stddev,
        });
        // "No price" and "a price with both sides missing" are the same thing to every chart.
        const norm = (p: typeof r.price) => (p && (p.inputPerM !== null || p.outputPerM !== null) ? p : null);
        expect(b.price).toEqual(norm(r.price));
      });
    });
  });

  test("charts built from the expanded tables are identical", () => {
    snapshot.tables.forEach((t, i) => {
      expect(buildBarChart(back[i], 10)).toEqual(buildBarChart(t, 10));
    });
  });

  test("is at most half the size of the full tables", () => {
    const full = JSON.stringify(snapshot.tables).length;
    const small = JSON.stringify(compact).length;
    expect(small).toBeLessThan(full * 0.5);
  });

  test("ties keep sharing a rank", () => {
    const [t] = expandTables([{ def: compact[0].def, rows: [["a/x", "X", 10], ["b/y", "Y", 10], ["c/z", "Z", 9]] }]);
    expect(t.rows.map((r) => r.rank)).toEqual([1, 1, 2]);
  });
});

describe("ranking layout contract (v1.8.0 overlap bug)", () => {
  const dashboard = readFileSync(join(process.cwd(), "components", "benchmarks", "BenchmarkDashboard.tsx"), "utf8");
  const css = readFileSync(join(process.cwd(), "app", "globals.css"), "utf8");

  test("the picker is a grid of shrinkable equal tracks, not a fixed side column", () => {
    expect(dashboard).not.toMatch(/grid-cols-\[19rem/);
    expect(dashboard).toMatch(/className="bm-picker /);
    const rule = /\.bm-picker\s*\{[^}]*\}/.exec(css)?.[0] ?? "";
    expect(rule).toMatch(/grid-template-columns:\s*repeat\(auto-fill,\s*minmax\(min\(100%,\s*[\d.]+rem\),\s*1fr\)\)/);
  });

  test("cards and their text can shrink (min-w-0 + truncate)", () => {
    const picker = dashboard.slice(dashboard.indexOf('className="bm-picker '), dashboard.indexOf("{/* The chart (bars)"));
    expect(picker).toMatch(/<li key=\{t\.def\.key\} className="min-w-0">/);
    expect(picker).toMatch(/min-w-0 flex-1 truncate/);
  });

  test("lists whose rows truncate use a shrinkable track (no min-content blow-out on phones)", () => {
    const bars = readFileSync(join(process.cwd(), "components", "benchmarks", "BenchmarkBars.tsx"), "utf8");
    const teaser = readFileSync(join(process.cwd(), "components", "home", "BenchmarksTeaser.tsx"), "utf8");
    expect(bars).toMatch(/<ol className="[^"]*\bgrid-cols-1\b/);
    expect(teaser).toMatch(/<ol className="[^"]*\bgrid-cols-1\b/);
  });
});
