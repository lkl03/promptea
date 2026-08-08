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
  "already_optimized", // input is already a strong/Promptea-shaped prompt — minimal edits, no LLM call
] as const;
export type FallbackReason = (typeof FALLBACK_REASONS)[number];

// ---------------------------------------------------------------------------
// Application modes (v1.3.0 two-mode product)
// ---------------------------------------------------------------------------

/** The two route-addressable product experiences. */
export const APP_MODES = ["improve", "best-ai"] as const;
export type AppMode = (typeof APP_MODES)[number];

export function isAppMode(v: unknown): v is AppMode {
  return APP_MODES.includes(v as AppMode);
}

// ---------------------------------------------------------------------------
// Matcher domain (Find the Best AI)
// ---------------------------------------------------------------------------

/**
 * Task categories the matcher scores against. Each model in the registry
 * carries a 0-3 fit score per category; the rubric weights detected prompt
 * signals into these categories.
 */
export const MATCH_CATEGORIES = [
  "chat",
  "coding",
  "codingAgent",
  "research",
  "longContext",
  "multimodal",
  "dataExtraction",
  "creativeWriting",
  "marketing",
  "translation",
  "summarization",
  "tutoring",
  "imagePrompts",
  "complexReasoning",
  "fastLightweight",
] as const;
export type MatchCategory = (typeof MATCH_CATEGORIES)[number];

/**
 * Interaction profiles: HOW the user should work with the AI, beyond which
 * model family. "codingAgent" (e.g. Claude Code) is an environment with
 * different prompt requirements than plain chat — never treated as a model.
 */
export const INTERACTION_PROFILES = [
  "chat",
  "codingAgent",
  "researchAssistant",
  "multimodalAssistant",
  "codeSpecialist",
] as const;
export type InteractionProfile = (typeof INTERACTION_PROFILES)[number];

export const MATCH_CONFIDENCES = ["high", "medium", "low"] as const;
export type MatchConfidence = (typeof MATCH_CONFIDENCES)[number];

// ---------------------------------------------------------------------------
// Voice transcription
// ---------------------------------------------------------------------------

/** Typed server-side transcription failure reasons (bilingual UI maps them). */
export const TRANSCRIBE_ERROR_REASONS = [
  "unsupported_media",
  "file_too_large",
  "empty_audio",
  "no_speech",
  "recording_too_long",
  "missing_api_key",
  "invalid_api_key",
  "timeout",
  "rate_limited",
  "provider_error",
  "invalid_response",
  "network",
] as const;
export type TranscribeErrorReason = (typeof TRANSCRIBE_ERROR_REASONS)[number];

// ---------------------------------------------------------------------------
// General app feedback (stored in Firestore, never contains prompt content)
// ---------------------------------------------------------------------------

export const APP_FEEDBACK_CATEGORIES = [
  "bug",
  "suggestion",
  "design",
  "result_quality",
  "other",
] as const;
export type AppFeedbackCategory = (typeof APP_FEEDBACK_CATEGORIES)[number];

export function isAppFeedbackCategory(v: unknown): v is AppFeedbackCategory {
  return APP_FEEDBACK_CATEGORIES.includes(v as AppFeedbackCategory);
}

// ---------------------------------------------------------------------------
// AI Daily editorial blog (v1.4.0)
//
// Every union the blog needs lives here so the Zod schemas in lib/blog/types.ts,
// the Firestore reader, and the UI cannot drift. Same rule as the rest of this
// file: readonly array + derived type + guard.
// ---------------------------------------------------------------------------

/**
 * Publication lifecycle. Only `published` and `corrected` are publicly visible;
 * `draft` and `archived` are hidden from the feed, article routes, sitemap and
 * the RSS feed.
 */
export const BLOG_STATUSES = ["draft", "published", "corrected", "archived"] as const;
export type BlogStatus = (typeof BLOG_STATUSES)[number];

export function isBlogStatus(v: unknown): v is BlogStatus {
  return BLOG_STATUSES.includes(v as BlogStatus);
}

/** Statuses that render publicly. Used by every public query and by the sitemap. */
export const PUBLIC_BLOG_STATUSES = ["published", "corrected"] as const;
export type PublicBlogStatus = (typeof PUBLIC_BLOG_STATUSES)[number];

export function isPubliclyVisible(status: unknown): status is PublicBlogStatus {
  return PUBLIC_BLOG_STATUSES.includes(status as PublicBlogStatus);
}

/**
 * Which edition a post belongs to (v1.4.1).
 *
 * `daily` is a same-day news story and is the only edition the freshness guard
 * applies to. The two weekly editions are published ON their date but describe
 * a range or a forward view, so "event date" for them simply means the day the
 * edition ran — they are not claiming a past event happened today.
 */
export const BLOG_EDITIONS = ["daily", "weekly-recap", "week-ahead"] as const;
export type BlogEdition = (typeof BLOG_EDITIONS)[number];

export function isBlogEdition(v: unknown): v is BlogEdition {
  return BLOG_EDITIONS.includes(v as BlogEdition);
}

/** Document-id and idempotency-key prefix per edition, so two editions can coexist on one date. */
export const EDITION_KEY_PREFIX: Record<BlogEdition, string> = {
  daily: "ai-daily",
  "weekly-recap": "ai-weekly",
  "week-ahead": "ai-ahead",
};

/** How far back a manually backdated post may reach, in days. */
export const MAX_BACKDATE_DAYS = 14;

/** Editorial category of the day's story. */
export const BLOG_CATEGORIES = [
  "model-release",
  "product",
  "research",
  "policy",
  "funding",
  "infrastructure",
  "security",
  "developer-tools",
  "digest",
  "other",
] as const;
export type BlogCategory = (typeof BLOG_CATEGORIES)[number];

export function isBlogCategory(v: unknown): v is BlogCategory {
  return BLOG_CATEGORIES.includes(v as BlogCategory);
}

/**
 * Editorial priority, per the routine's scoring rubric.
 * P0 breaking/industry-shaping, P1 major, P2 useful.
 */
export const BLOG_IMPORTANCE = ["P0", "P1", "P2"] as const;
export type BlogImportance = (typeof BLOG_IMPORTANCE)[number];

export function isBlogImportance(v: unknown): v is BlogImportance {
  return BLOG_IMPORTANCE.includes(v as BlogImportance);
}

/**
 * Source classification. `primary` on the source object is the authoritative
 * "is this a first-party source" flag; sourceType records what kind it is so
 * the article can visually distinguish an official model card from reporting.
 */
export const BLOG_SOURCE_TYPES = [
  "announcement",
  "documentation",
  "model-card",
  "research-paper",
  "changelog",
  "repository",
  "regulatory",
  "reporting",
  "other",
] as const;
export type BlogSourceType = (typeof BLOG_SOURCE_TYPES)[number];

export function isBlogSourceType(v: unknown): v is BlogSourceType {
  return BLOG_SOURCE_TYPES.includes(v as BlogSourceType);
}

/**
 * Block kinds allowed in an article body. The renderer supports exactly these
 * and nothing else — there is no HTML passthrough anywhere in the pipeline.
 */
export const BLOG_BLOCK_TYPES = ["paragraph", "heading", "list", "quote"] as const;
export type BlogBlockType = (typeof BLOG_BLOCK_TYPES)[number];

export function isBlogBlockType(v: unknown): v is BlogBlockType {
  return BLOG_BLOCK_TYPES.includes(v as BlogBlockType);
}

/** Terminal outcome of one routine run, recorded in `blog_runs`. */
export const BLOG_RUN_STATUSES = [
  "PUBLISHED",
  "ALREADY_PUBLISHED",
  "NO_ELIGIBLE_STORY",
  "RESEARCH_FAILED",
  "VERIFICATION_FAILED",
  "PUBLICATION_FAILED",
] as const;
export type BlogRunStatus = (typeof BLOG_RUN_STATUSES)[number];

export function isBlogRunStatus(v: unknown): v is BlogRunStatus {
  return BLOG_RUN_STATUSES.includes(v as BlogRunStatus);
}

/** Editorial author shown publicly. Never a fabricated human byline. */
export const BLOG_AUTHOR = "Promptea Editorial" as const;

/** The editorial timezone that defines "today" for the freshness guard. */
export const EDITORIAL_TIMEZONE = "America/Argentina/Buenos_Aires" as const;
