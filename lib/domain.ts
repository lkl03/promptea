// lib/domain.ts
//
// Single authoritative domain model for Promptea.
//
// Every union that used to drift across pages, components, templates, API
// routes, and the engine (languages, targets, purposes, task types, formats)
// is defined ONCE here as a readonly array + derived type. UI options, Zod
// schemas, and registries derive from these arrays so they cannot fall out
// of sync. `lib/__tests__/domain.sync.test.ts` fails when a consumer drifts.

// ---------------------------------------------------------------------------
// Languages
// ---------------------------------------------------------------------------

export const LANGS = ["es", "en"] as const;
export type Lang = (typeof LANGS)[number];

export function isLang(v: unknown): v is Lang {
  return LANGS.includes(v as Lang);
}

// ---------------------------------------------------------------------------
// Target AI families (providers as the user picks them in the UI)
// ---------------------------------------------------------------------------

export const TARGETS = ["gpt", "claude", "gemini", "grok", "kimi", "deepseek", "perplexity"] as const;
export type TargetAI = (typeof TARGETS)[number];

export function isTarget(v: unknown): v is TargetAI {
  return TARGETS.includes(v as TargetAI);
}

// ---------------------------------------------------------------------------
// Prompt purposes (what the user says the prompt is for)
// ---------------------------------------------------------------------------

export const PURPOSES = [
  "text",
  "study",
  "code",
  "data",
  "image",
  "marketing",
  "translation",
  "summarization",
] as const;
export type PromptPurpose = (typeof PURPOSES)[number];

export function isPurpose(v: unknown): v is PromptPurpose {
  return PURPOSES.includes(v as PromptPurpose);
}

/**
 * Normalize legacy/external aliases (old links, older API clients) to the
 * canonical purpose. Single implementation — was previously duplicated in
 * app/api/analyze/route.ts, lib/engine/index.ts, and app/[lang]/page.tsx.
 */
export function normalizePurpose(p: unknown): PromptPurpose {
  const x = String(p ?? "").toLowerCase().trim();
  if (x === "data_json" || x === "json" || x === "data/json") return "data";
  if (x === "translate") return "translation";
  if (x === "summary" || x === "summarize") return "summarization";
  return isPurpose(x) ? x : "text";
}

// ---------------------------------------------------------------------------
// Task types (what the engine detects the prompt actually is)
// ---------------------------------------------------------------------------

export const TASK_TYPES = [
  "text",
  "study",
  "coding",
  "debugging",
  "refactor",
  "research",
  "planning",
  "customer_support",
  "writing",
  "data_extraction",
  "image",
  "marketing",
  "translation",
  "summarization",
] as const;
export type TaskType = (typeof TASK_TYPES)[number];

export function isTaskType(v: unknown): v is TaskType {
  return TASK_TYPES.includes(v as TaskType);
}

/** Default task type when only the purpose is known. */
export const TASK_FROM_PURPOSE: Record<PromptPurpose, TaskType> = {
  text: "text",
  study: "study",
  code: "coding",
  data: "data_extraction",
  image: "image",
  marketing: "marketing",
  translation: "translation",
  summarization: "summarization",
};

// ---------------------------------------------------------------------------
// Output format of the optimized prompt
// ---------------------------------------------------------------------------

export const FORMAT_CHOICES = ["checklist", "json"] as const;
export type FormatChoice = (typeof FORMAT_CHOICES)[number];

// ---------------------------------------------------------------------------
// Adaptive refinement domain
// ---------------------------------------------------------------------------

export const COMPLEXITIES = ["simple", "moderate", "complex"] as const;
export type Complexity = (typeof COMPLEXITIES)[number];

/**
 * Refinement strategies the router can select. The strategy decides how much
 * structure the rewritten prompt receives — a short WhatsApp message must not
 * get the same scaffolding as a repository migration plan.
 */
export const REFINEMENT_STRATEGIES = [
  "message_polish", // short wording/message improvement — minimal structure
  "long_form_writing",
  "summarization",
  "translation",
  "study_tutoring",
  "coding_implementation",
  "debugging_review",
  "agent_workflow", // repository/agent task instructions (paths, commands, delivery)
  "data_schema", // extraction & strict JSON/schema output
  "analysis_research",
  "marketing_copy",
  "image_generation",
  "brainstorming",
  "planning_execution",
  "general",
] as const;
export type RefinementStrategy = (typeof REFINEMENT_STRATEGIES)[number];

export type EnginePath = "adaptive" | "deterministic";

/** Why the adaptive path fell back to the deterministic result. */
export const FALLBACK_REASONS = [
  "disabled",
  "missing_api_key",
  "invalid_api_key",
  "timeout",
  "rate_limited",
  "provider_error",
  "invalid_json",
  "schema_mismatch",
  "empty_response",
  "unsafe_response",
  "protected_literal_loss",
  "quality_gate_failed",
  "superseded",
] as const;
export type FallbackReason = (typeof FALLBACK_REASONS)[number];
