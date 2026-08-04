// lib/engine/builder.ts
//
// v1.3.0: thin deterministic-build entry point.
//
// The old fixed "PROMPTEA: vX / MODEL / PURPOSE / TASK_TYPE" scaffold is
// gone — version/model/purpose metadata lives in result metadata only.
// Shape selection (per refinement strategy, gated by complexity) lives in
// lib/engine/shapes.ts. This module keeps the public signature stable,
// strips legacy headers from re-analyzed v1.2-era prompts, and maps
// task/purpose to a strategy when the caller has no routing decision.

import type { Lang, TargetAI } from "../promptTemplates";
import type { TaskType, PromptPurpose } from "./types";
import type { Complexity, RefinementStrategy } from "@/lib/domain";
import type { AttachmentContext } from "@/lib/attachments";
import { buildShapedPrompt } from "./shapes";

type BuilderPurpose = PromptPurpose | "translation" | "summarization";

export type BuildOptions = {
  /** Router-detected complexity. "simple" prompts stay natural — no scaffold. */
  complexity?: Complexity;
  /** Router-selected strategy. Falls back to a task/purpose mapping. */
  strategy?: RefinementStrategy;
};

// Matches the v1.2-era metadata header block so prompts optimized by older
// versions re-analyze cleanly into the new shapes instead of nesting.
const LEGACY_HEADER_RE = /^(?:PROMPTEA:[^\n]*\n?|MODEL:[^\n]*\n?|PURPOSE:[^\n]*\n?|TASK_TYPE:[^\n]*\n?)+\n*/i;

export function hasLegacyPrompteaHeader(text: string): boolean {
  return /^PROMPTEA:\s*v/i.test(String(text ?? "").trim());
}

export function stripLegacyHeader(text: string): string {
  const raw = String(text ?? "").trim();
  if (!hasLegacyPrompteaHeader(raw)) return raw;
  return raw.replace(LEGACY_HEADER_RE, "").trimStart();
}

function strategyFromTask(taskType: TaskType | string, purpose: BuilderPurpose): RefinementStrategy {
  const task = String(taskType ?? "").trim().toLowerCase();

  if (purpose === "data" || task === "data_extraction" || task === "data") return "data_schema";
  if (purpose === "image" || task === "image") return "image_generation";
  if (task === "translation") return "translation";
  if (task === "summarization") return "summarization";
  if (task === "debugging" || task === "refactor") return "debugging_review";
  if (task === "coding") return "coding_implementation";
  if (task === "study") return "study_tutoring";
  if (task === "marketing") return "marketing_copy";
  if (task === "research") return "analysis_research";
  if (task === "planning") return "planning_execution";
  if (task === "writing") return "long_form_writing";
  return "general";
}

export function buildOptimizedPrompt(
  core: string,
  taskType: TaskType | string,
  target: TargetAI,
  lang: Lang,
  purpose: BuilderPurpose = "text",
  attachments: AttachmentContext[] = [],
  opts: BuildOptions = {}
) {
  const cleaned = stripLegacyHeader(String(core ?? "").trim());
  const strategy = opts.strategy ?? strategyFromTask(taskType, purpose);
  const complexity: Complexity = opts.complexity ?? "moderate";

  return buildShapedPrompt({
    core: cleaned,
    strategy,
    complexity,
    taskType,
    target,
    lang,
    purpose,
    attachments,
  });
}
