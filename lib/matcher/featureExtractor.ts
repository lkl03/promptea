// lib/matcher/featureExtractor.ts
//
// Deterministic feature extraction for the matcher. Runs every rubric
// signal against the prompt (plus attachment metadata) and accumulates
// weighted evidence per category. No LLM, no randomness.

import type { Lang, MatchCategory } from "@/lib/domain";
import { detectPromptLanguage } from "@/lib/refine/language";
import type { AttachmentContext } from "@/lib/attachments";
import {
  CHAT_BASELINE_EVIDENCE,
  PROFILE_RULES,
  SIGNALS,
  signalLabel,
  type SignalContext,
} from "./rubric";
import type { MatcherFeatures, SignalHit } from "./types";

function wordCount(text: string): number {
  const t = text.trim();
  return t === "" ? 0 : t.split(/\s+/).length;
}

export type ExtractArgs = {
  prompt: string;
  uiLang: Lang;
  attachments?: AttachmentContext[];
};

export function extractMatcherFeatures(args: ExtractArgs): MatcherFeatures {
  const text = String(args.prompt ?? "").trim();
  const attachments = args.attachments ?? [];
  const lang = detectPromptLanguage(text, args.uiLang).lang;

  const ctx: SignalContext = {
    text,
    lower: text.toLowerCase(),
    wordCount: wordCount(text),
    attachmentsCount: attachments.length,
    attachmentChars: attachments.reduce((sum, file) => sum + (file.text?.length ?? 0), 0),
  };

  const signals: SignalHit[] = [];
  const evidence: Partial<Record<MatchCategory, number>> = {};

  for (const def of SIGNALS) {
    let hit = false;
    try {
      hit = def.test(ctx);
    } catch {
      hit = false;
    }
    if (!hit) continue;

    signals.push({
      id: def.id,
      label: signalLabel(def, lang),
      categories: def.contributes.map((c) => c.category),
    });
    for (const { category, weight } of def.contributes) {
      evidence[category] = (evidence[category] ?? 0) + weight;
    }
  }

  // Every prompt is at least a chat prompt — this keeps general assistants
  // in the race when nothing specialized was detected.
  evidence.chat = (evidence.chat ?? 0) + CHAT_BASELINE_EVIDENCE;

  const profile =
    PROFILE_RULES.find((rule) => (evidence[rule.category] ?? 0) >= rule.minEvidence)?.profile ??
    "chat";

  const total = Object.values(evidence).reduce((a, b) => a + b, 0);
  const specialized = total - (evidence.chat ?? 0);
  const ambiguity: MatcherFeatures["ambiguity"] =
    specialized >= 4 ? "low" : specialized >= 2 ? "medium" : "high";

  return {
    lang,
    wordCount: ctx.wordCount,
    signals,
    evidence,
    profile,
    ambiguity,
    attachmentsCount: attachments.length,
  };
}
