// lib/analyzeClient.ts
//
// Client-side type for the /api/analyze response: the engine's AnalyzeResult
// plus the API-added metadata (analysisId, refinement block, compat flags).
// Types only — safe to import from client components.

import type { AnalyzeResult } from "@/lib/engine/types";
import type { RefinementResult } from "@/lib/refine/schema";

export type AnalyzeResponse = Omit<AnalyzeResult, "meta"> & {
  meta: AnalyzeResult["meta"] & {
    analysisId: string;
    attachmentFormats?: Array<{ kind: string | null; ext: string | null; mime: string | null }>;
    refinement?: RefinementResult;
    adaptiveEngine?: string | null;
    adaptiveFallback?: boolean;
    adaptiveReason?: string;
  };
};
