// v1.8.0 — the homepage benchmarks teaser: real ranking or nothing.

import { describe, expect, test } from "vitest";
import { buildSnapshot } from "@/lib/benchmarks/normalize";
import { buildTeaser } from "@/lib/benchmarks/teaser";

const AA = (slug: string, name: string, i: number) => ({
  source: "artificial-analysis",
  model_permaslug: slug,
  display_name: name,
  intelligence_index: i,
  coding_index: null,
  agentic_index: null,
  pricing: null,
});

describe("buildTeaser", () => {
  test("no snapshot or no tables → null (the home shows the plain card)", () => {
    expect(buildTeaser(null)).toBeNull();
    expect(buildTeaser(buildSnapshot({ data: [] }, new Date()))).toBeNull();
  });

  test("top N of the Intelligence Index with 0-based bar ratios", () => {
    const snap = buildSnapshot({ data: [AA("a/x", "X", 80), AA("a/y", "Y", 60), AA("b/z", "Z", 40)] }, new Date("2026-10-09T00:00:00Z"));
    const t = buildTeaser(snap, 2)!;
    expect(t.def.key).toBe("aa:intelligence");
    expect(t.rows.map((r) => r.name)).toEqual(["X", "Y"]);
    expect(t.rows[0].ratio).toBe(1);
    expect(t.rows[1].ratio).toBeCloseTo(0.75);
  });

  test("accuracy rankings are scaled to 100%, Elo shows no bars", () => {
    const gpqa = buildSnapshot(
      { data: [{ source: "openrouter", model_permaslug: "a/x", display_name: "X", benchmark_type: "gpqa_diamond", accuracy: 0.5, accuracy_stddev: null, avg_cost_per_task: null, total_tasks: 10 }] },
      new Date()
    );
    expect(buildTeaser(gpqa)!.rows[0].ratio).toBeCloseTo(0.5);
    const elo = buildSnapshot(
      { data: [{ source: "design-arena", model_permaslug: "a/x", display_name: "X", arena: "models", category: "ui", elo: 1300, win_rate: 50, avg_generation_time_ms: 1, pricing: null }] },
      new Date()
    );
    expect(buildTeaser(elo)!.rows[0].ratio).toBe(0);
  });
});
