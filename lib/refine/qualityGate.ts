// lib/refine/qualityGate.ts
//
// Post-generation quality gate for adaptive rewrites. An external API
// responding 200 is NOT enough: the rewrite must preserve intent markers,
// protected literals, language, and requested format — and must actually be
// a prompt, not an answer to the user's underlying task.

import type { Lang } from "@/lib/domain";
import { languageMatches } from "./language";
import { literalsPreserved, type ProtectedLiteral } from "./literals";

export type QualityGateInput = {
  original: string;
  deterministic: string;
  candidate: string;
  language: Lang;
  literals: ProtectedLiteral[];
  /** The candidate must start with this exact header block. */
  requiredHeader: string;
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

export function runQualityGate(input: QualityGateInput): QualityGateResult {
  const failures: string[] = [];
  const warnings: string[] = [];
  const candidate = String(input.candidate ?? "").trim();

  // 1. Non-empty and within limits.
  if (candidate.length < 20) failures.push("too_short");
  if (candidate.length > 24000) failures.push("too_long");

  // 2. Header invariant (Promptea signature block).
  if (input.requiredHeader && !candidate.startsWith(input.requiredHeader)) {
    failures.push("header_lost");
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
  const body = candidate.slice(input.requiredHeader.length).trimStart();
  if (ANSWER_LIKE.test(body)) failures.push("answers_instead_of_prompting");

  // 7. No internal/system leakage or refusal noise.
  if (INTERNAL_LEAK.test(candidate)) failures.push("internal_leakage");

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
