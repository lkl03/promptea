// lib/analyzeClient.ts
//
// Client-side type for the /api/analyze response: the engine's AnalyzeResult
// plus the API-added metadata (analysisId, refinement block, compat flags).
// Types only — safe to import from client components.

import type { AnalyzeResult } from "@/lib/engine/types";
import type { RefinementResult } from "@/lib/refine/schema";
import type { JudgeResult } from "@/lib/refine/judge";

export type AnalyzeResponse = Omit<AnalyzeResult, "meta"> & {
  meta: AnalyzeResult["meta"] & {
    analysisId: string;
    attachmentFormats?: Array<{ kind: string | null; ext: string | null; mime: string | null }>;
    refinement?: RefinementResult;
    /** v1.8.0: optional LLM second opinion — advisory only, never replaces `score`. */
    judge?: JudgeResult;
    adaptiveEngine?: string | null;
    adaptiveFallback?: boolean;
    adaptiveReason?: string;
  };
};
