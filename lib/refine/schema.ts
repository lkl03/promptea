// lib/refine/schema.ts
//
// Strict server-side contract for the adaptive refinement result (§ the
// external model must return exactly this shape; anything else falls back
// to the deterministic baseline). Also the shape exposed to the client in
// `meta.refinement` — never includes chain-of-thought or provider internals.

import { z } from "zod";
import { COMPLEXITIES, FALLBACK_REASONS, LANGS, REFINEMENT_STRATEGIES } from "@/lib/domain";
import type { Complexity, EnginePath, FallbackReason, Lang, RefinementStrategy } from "@/lib/domain";

/** What the refinement LLM must return (validated with Zod before use). */
export const AdaptiveLlmResponseSchema = z.object({
  optimizedPrompt: z.string().min(10).max(24000),
  summary: z.string().min(1).max(600),
  keyImprovements: z.array(z.string().min(1).max(300)).max(6).default([]),
  assumptions: z.array(z.string().min(1).max(300)).max(4).default([]),
  followUpQuestions: z.array(z.string().min(1).max(300)).max(3).default([]),
});

export type AdaptiveLlmResponse = z.infer<typeof AdaptiveLlmResponseSchema>;

/** Full refinement outcome attached to the analysis response. */
export type RefinementResult = {
  optimizedPrompt: string;
  summary: string;
  keyImprovements: string[];
  assumptions: string[];
  followUpQuestions: string[];
  detected: {
    language: Lang;
    strategy: RefinementStrategy;
    complexity: Complexity;
  };
  quality: {
    passed: boolean;
    warnings: string[];
  };
  execution: {
    engine: EnginePath;
    provider?: string;
    model?: string;
    fallbackReason?: FallbackReason;
    repaired?: boolean;
  };
};

/** Client-facing schema (used by API contract tests). */
export const RefinementResultSchema = z.object({
  optimizedPrompt: z.string(),
  summary: z.string(),
  keyImprovements: z.array(z.string()),
  assumptions: z.array(z.string()),
  followUpQuestions: z.array(z.string()),
  detected: z.object({
    language: z.enum(LANGS),
    strategy: z.enum(REFINEMENT_STRATEGIES),
    complexity: z.enum(COMPLEXITIES),
  }),
  quality: z.object({
    passed: z.boolean(),
    warnings: z.array(z.string()),
  }),
  execution: z.object({
    engine: z.enum(["adaptive", "deterministic"]),
    provider: z.string().optional(),
    model: z.string().optional(),
    fallbackReason: z.enum(FALLBACK_REASONS).optional(),
    repaired: z.boolean().optional(),
  }),
});
