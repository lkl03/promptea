// lib/benchmarks/dev-fixture.ts
//
// v1.8.0 — DEVELOPMENT ONLY. A clearly fictitious dataset (invented labs,
// "Demo" model names) so the benchmark charts can be built and reviewed
// without an OpenRouter key. It is reachable only when NODE_ENV is
// "development" AND BENCHMARKS_DEV_FIXTURE=1 (see getBenchmarks); production
// never reads it, and the page's policy — never show invented data — holds.

import { buildSnapshot, type BenchmarksSnapshot } from "./normalize";

const LABS = ["northwind", "southgate", "eastfield", "westbrook", "lumen", "orbit", "kite"] as const;

const DESIGN_CATEGORIES = ["uicomponent", "website", "dataviz", "gamedev", "3d", "logo", "svg", "image", "video", "slides", "mobile-app", "dashboard", "landing-page", "poster"] as const;

// Deterministic pseudo-random so the dev page is stable between reloads.
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

export function devFixtureSnapshot(now: Date = new Date()): BenchmarksSnapshot {
  const r = rng(42);
  const data: unknown[] = [];
  let n = 0;
  for (const lab of LABS) {
    const count = 3 + Math.floor(r() * 3);
    for (let i = 1; i <= count; i++) {
      n++;
      const slug = `${lab}/demo-${i}`;
      // The first model of each lab gets a long, real-world-shaped name ("… (Max, Default Fallback)"):
      // long names are exactly what broke the ranking layout in v1.8.0.
      const name = `Demo ${lab[0].toUpperCase()}${lab.slice(1)} ${i}${i === 1 ? " (Max, Default Fallback)" : ""}`;
      const tier = 0.35 + r() * 0.6; // overall capability 0.35–0.95
      const priced = r() > 0.1;
      const inPrice = (0.04 + tier * tier * 14 * (0.5 + r())) / 1_000_000;
      data.push({
        source: "artificial-analysis",
        model_permaslug: slug,
        display_name: name,
        intelligence_index: Math.round((20 + tier * 60 + r() * 5) * 10) / 10,
        coding_index: r() > 0.15 ? Math.round((15 + tier * 62 + r() * 8) * 10) / 10 : null,
        agentic_index: r() > 0.25 ? Math.round((10 + tier * 60 + r() * 12) * 10) / 10 : null,
        pricing: priced ? { prompt: String(inPrice), completion: String(inPrice * (3 + r() * 3)) } : null,
      });
      if (r() > 0.2) {
        data.push({
          source: "openrouter",
          model_permaslug: slug,
          display_name: name,
          benchmark_type: "gpqa_diamond",
          accuracy: Math.min(0.97, 0.3 + tier * 0.6 + r() * 0.05),
          accuracy_stddev: 0.015 + r() * 0.03,
          avg_cost_per_task: null,
          total_tasks: 198,
          last_run_timestamp: now.toISOString(),
        });
      }
      if (r() > 0.4) {
        data.push({
          source: "openrouter",
          model_permaslug: slug,
          display_name: name,
          benchmark_type: "tau_bench_verified_airline",
          accuracy: Math.min(0.95, 0.2 + tier * 0.65 + r() * 0.05),
          accuracy_stddev: 0.02 + r() * 0.04,
          avg_cost_per_task: null,
          total_tasks: 50,
          last_run_timestamp: now.toISOString(),
        });
      }
      if (r() > 0.5) {
        data.push({
          source: "openrouter",
          model_permaslug: slug,
          display_name: name,
          benchmark_type: "search_browsecomp",
          primary_metric: "accuracy",
          primary_score: Math.min(0.9, 0.1 + tier * 0.6 + r() * 0.08),
          total_tasks: 100,
          avg_cost_per_task: null,
          avg_latency_per_task_ms: 5000,
          search_engine: "demo",
          search_surface: "server-tool",
          last_run_timestamp: now.toISOString(),
        });
      }
      // Production carries a dozen-plus Design Arena categories: the picker must hold that many.
      for (const category of DESIGN_CATEGORIES) {
        if (r() > 0.5) {
          data.push({
            source: "design-arena",
            model_permaslug: slug,
            display_name: name,
            arena: "models",
            category,
            elo: Math.round(1000 + tier * 380 + r() * 20),
            win_rate: 40 + tier * 30,
            avg_generation_time_ms: 3000,
            pricing: null,
          });
        }
      }
    }
  }
  void n;
  return buildSnapshot({ data, meta: { as_of: now.toISOString() } }, now);
}
