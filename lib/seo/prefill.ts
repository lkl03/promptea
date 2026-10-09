import type { Locale } from "./site";
import type { PromptPurpose, TargetAI } from "@/lib/domain";

// v1.2.0: derive from the shared domain model (perplexity was missing here).
export type Purpose = PromptPurpose;
export type TargetModel = TargetAI;

export function buildPrefillHref(opts: {
  lang: Locale;
  prompt: string;
  purpose: Purpose;
  target: TargetModel;
}): string {
  const { lang, prompt, purpose, target } = opts;
  const qs = new URLSearchParams({
    prompt,
    purpose,
    target,
  });
  // v1.7.0: the analyzer lives at /{lang}/analyzer (the homepage is a hub).
  return `/${lang}/analyzer?${qs.toString()}`;
}
