// lib/benchmarks/schema.ts
//
// v1.7.0 — the OpenRouter benchmarks contract, as documented in
// https://openrouter.ai/docs/api/api-reference/benchmarks/list-benchmarks
// (GET https://openrouter.ai/api/v1/benchmarks, Bearer auth, 30 req/min per
// key, 500 req/day per account).
//
// The response is `{ data: Item[], meta }`, where each item's shape depends on
// its source (`artificial-analysis`, `design-arena`, `openrouter`) and, for
// OpenRouter's own evals, on `benchmark_type` (classic vs. `search_*`).
// Items are validated ONE BY ONE: a malformed or future-shaped row is dropped
// and counted, it never takes the whole page down. Every score field is
// nullable upstream; null means "not measured", never zero.

import { z } from "zod";

const num = z.number().finite();
const nullableNum = num.nullable().optional().transform((v) => (v === undefined ? null : v));
const nonEmpty = z.string().trim().min(1).max(300);

/** Per-token USD prices as decimal strings (e.g. "0.0000025"). */
export const PricingSchema = z
  .object({
    prompt: z.union([z.string(), z.number()]).nullable().optional(),
    completion: z.union([z.string(), z.number()]).nullable().optional(),
  })
  .nullable()
  .optional();

export const AAItemSchema = z.object({
  source: z.literal("artificial-analysis"),
  model_permaslug: nonEmpty,
  display_name: nonEmpty,
  intelligence_index: nullableNum,
  coding_index: nullableNum,
  agentic_index: nullableNum,
  pricing: PricingSchema,
});

export const DAItemSchema = z.object({
  source: z.literal("design-arena"),
  model_permaslug: nonEmpty,
  display_name: nonEmpty,
  arena: nonEmpty,
  category: nonEmpty,
  elo: nullableNum,
  win_rate: nullableNum,
  avg_generation_time_ms: nullableNum,
  pricing: PricingSchema,
});

export const ORClassicItemSchema = z.object({
  source: z.literal("openrouter"),
  model_permaslug: nonEmpty,
  display_name: nonEmpty,
  benchmark_type: z.enum(["gpqa_diamond", "tau_bench_verified_airline"]),
  accuracy: nullableNum,
  accuracy_stddev: nullableNum,
  avg_cost_per_task: nullableNum,
  total_tasks: nullableNum,
  last_run_timestamp: z.string().nullable().optional(),
});

export const ORSearchItemSchema = z.object({
  source: z.literal("openrouter"),
  model_permaslug: nonEmpty,
  display_name: nonEmpty,
  benchmark_type: z.enum(["search_browsecomp", "search_hle", "search_dsqa", "search_widesearch"]),
  primary_metric: z.enum(["accuracy", "f1_by_item"]),
  primary_score: nullableNum,
  total_tasks: nullableNum,
  avg_cost_per_task: nullableNum,
  avg_latency_per_task_ms: nullableNum,
  search_engine: z.string().nullable().optional(),
  search_surface: z.string().nullable().optional(),
  last_run_timestamp: z.string().nullable().optional(),
});

export const MetaSchema = z.object({
  as_of: z.string().nullable().optional(),
  version: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
  source_url: z.string().nullable().optional(),
  citation: z.string().nullable().optional(),
  model_count: z.number().nullable().optional(),
  task_type: z.string().nullable().optional(),
});

export const EnvelopeSchema = z.object({
  data: z.array(z.unknown()),
  meta: MetaSchema.optional().nullable(),
});

export type AAItem = z.infer<typeof AAItemSchema>;
export type DAItem = z.infer<typeof DAItemSchema>;
export type ORClassicItem = z.infer<typeof ORClassicItemSchema>;
export type ORSearchItem = z.infer<typeof ORSearchItemSchema>;
export type BenchmarkItem = AAItem | DAItem | ORClassicItem | ORSearchItem;
export type BenchmarkMeta = z.infer<typeof MetaSchema>;

/** Validate one raw row against the shape its discriminators announce. */
export function parseItem(raw: unknown): BenchmarkItem | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const schema =
    r.source === "artificial-analysis"
      ? AAItemSchema
      : r.source === "design-arena"
        ? DAItemSchema
        : r.source === "openrouter"
          ? typeof r.benchmark_type === "string" && r.benchmark_type.startsWith("search_")
            ? ORSearchItemSchema
            : ORClassicItemSchema
          : null;
  if (!schema) return null;
  const parsed = schema.safeParse(raw);
  return parsed.success ? (parsed.data as BenchmarkItem) : null;
}
