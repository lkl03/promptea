// lib/refine/qualityGate.ts
//
// Post-generation quality gate for adaptive rewrites. An external API
// responding 200 is NOT enough: the rewrite must preserve intent markers,
// protected literals, language, and requested format — and must actually be
// a prompt, not an answer to the user's underlying task.

import type { Lang, PromptProfileId } from "@/lib/domain";
import { languageMatches } from "./language";
import { literalsPreserved, type ProtectedLiteral } from "./literals";
import { imagePromptIssues } from "@/lib/engine/imagePrompt";

export type QualityGateInput = {
  original: string;
  deterministic: string;
  candidate: string;
  language: Lang;
  literals: ProtectedLiteral[];
  /** v1.6.0: routing strategy — enables the image-prompt checks. */
  strategy?: string;
  /** v1.6.0: target model's prompting profile — enables model-guidance checks. */
  profileId?: PromptProfileId;
};

export type QualityGateResult = {
  passed: boolean;
  /** Hard failures — reject the candidate. */
  failures: string[];
  /** Soft issues — accept but surface to diagnostics. */
  warnings: string[];
};

const INTERNAL_LEAK =
  /\b(as an ai|i cannot|i can't|lo siento, no puedo|chain[- ]of[- ]thought|system prompt|developer message|hidden instructions|\{"optimizedPrompt")\b/i;

// A rewrite that ANSWERS the task instead of improving the prompt tends to
// open with an answer-style lead-in rather than instructions.
const ANSWER_LIKE =
  /^(here (is|are) (the|your) (answer|result|translation|summary)|la respuesta es|aqu[ií] (tienes|est[aá]) (la respuesta|el resultado))/i;

const JSON_DEMAND = /\b(only\s+(valid\s+)?json|solo\s+json|devolv[eé]\s+solo\s+json|return\s+only\s+json)\b/i;

// v1.3.0: the optimized prompt must NOT carry internal metadata headers —
// version/model/purpose belong in result metadata, never in prompt content.
const METADATA_HEADER = /^(PROMPTEA:|MODEL:\s|PURPOSE:\s|TASK_TYPE:\s)/im;

// v1.6.0: Claude Opus 5.5 / Fable 5.1 always think (adaptive thinking; effort
// is the control) and Anthropic's guide says to drop reasoning-inducing and
// reasoning-extraction instructions — a rewrite must not ADD them.
const REASONING_SCAFFOLD =
  /\b(think (step[- ]by[- ]step|carefully|hard|deeply)|let'?s think|show (me )?your (reasoning|work|thinking)|write out your reasoning|explain your reasoning before|chain[- ]of[- ]thought|pens[aá] paso a paso|pens[aá] (con cuidado|bien)|razon[aá] paso a paso|mostr[aá] (tu|el) razonamiento)\b/i;
// Opus 5.x self-verifies; explicit re-check instructions cause over-verification.
const OVER_VERIFICATION = /\b(double[- ]check|re-?verify|verify your (work|answer)|check your work|revis[aá] dos veces|verific[aá] tu (trabajo|respuesta))\b/i;

export function runQualityGate(input: QualityGateInput): QualityGateResult {
  const failures: string[] = [];
  const warnings: string[] = [];
  const candidate = String(input.candidate ?? "").trim();

  // 1. Non-empty and within limits.
  if (candidate.length < 20) failures.push("too_short");
  if (candidate.length > 24000) failures.push("too_long");

  // 2. No internal metadata headers in user-facing prompt content.
  const firstLines = candidate.split("\n").slice(0, 4).join("\n");
  if (METADATA_HEADER.test(firstLines)) {
    failures.push("metadata_header_added");
  }

  // 3. Expected language.
  if (!languageMatches(candidate, input.language)) failures.push("language_switched");

  // 4. Protected literals retained.
  const litCheck = literalsPreserved(input.literals, candidate);
  if (!litCheck.ok) {
    failures.push("protected_literal_loss");
    for (const miss of litCheck.missing.slice(0, 5)) {
      warnings.push(`missing_literal:${miss.kind}`);
    }
  }

  // 5. Requested format retained or strengthened.
  if (JSON_DEMAND.test(input.original) && !/\bjson\b/i.test(candidate)) {
    failures.push("format_requirement_lost");
  }

  // 6. Must be a prompt, not the answer to the task.
  if (ANSWER_LIKE.test(candidate)) failures.push("answers_instead_of_prompting");

  // 7. No internal/system leakage or refusal noise.
  if (INTERNAL_LEAK.test(candidate)) failures.push("internal_leakage");

  // 7b. v1.6.0 image prompts must be FINISHED prompts: no placeholders, no
  // "specify the mood" meta-instructions, no quality-keyword spam, and no
  // contradictory visual direction (unless the user wrote it that way).
  if (input.strategy === "image_generation") {
    for (const issue of imagePromptIssues(candidate, input.original)) failures.push(`image_${issue}`);
  }

  // 7c. v1.6.0 model guidance: never add reasoning scaffolding for always-
  // thinking Claude models, nor re-check instructions for Opus 5.5.
  if (input.profileId === "opus-adaptive" || input.profileId === "fable-autonomous") {
    if (REASONING_SCAFFOLD.test(candidate) && !REASONING_SCAFFOLD.test(input.original)) {
      failures.push("reasoning_instruction_added");
    }
  }
  if (input.profileId === "opus-adaptive" && OVER_VERIFICATION.test(candidate) && !OVER_VERIFICATION.test(input.original)) {
    failures.push("verification_instruction_added");
  }

  // 8. Verbosity: reject rewrites that balloon without value.
  const baseLen = Math.max(input.deterministic.length, input.original.length, 200);
  if (candidate.length > baseLen * 3) failures.push("excessive_verbosity");
  else if (candidate.length > baseLen * 2) warnings.push("verbose_rewrite");

  // 9. Rewrites that DROP almost all user content are suspicious.
  if (candidate.length < Math.min(input.original.length, 400) * 0.25) {
    warnings.push("aggressive_compression");
  }

  return { passed: failures.length === 0, failures, warnings };
}
