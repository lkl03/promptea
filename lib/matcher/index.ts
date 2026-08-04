// lib/matcher/index.ts
//
// Public entry point for the deterministic "Find the Best AI" matcher.
//
// matchPrompt() is a pure function of (prompt, uiLang, attachments) and the
// model registry: same input → same ranking, scores, confidence, and
// explanations. No LLM is involved anywhere in the decision path.

import type { Lang } from "@/lib/domain";
import type { AttachmentContext } from "@/lib/attachments";
import { getMatcherCandidates, getModelById, type ModelEntry } from "@/lib/models";
import { extractMatcherFeatures } from "./featureExtractor";
import { bestPerTarget, deriveConfidence, scoreCandidates } from "./scorer";
import {
  buildAdaptationAdvice,
  buildBestAt,
  buildReasons,
  buildSwitchingAdvice,
  buildTieBreaker,
  buildTradeoff,
  productLabel,
} from "./explanations";
import { RUBRIC_VERSION } from "./rubric";
import type { MatchRecommendation, MatchResult, ScoredModel } from "./types";

export { RUBRIC_VERSION } from "./rubric";
export { extractMatcherFeatures } from "./featureExtractor";
export type * from "./types";

const MAX_ALTERNATIVES = 3;

export type MatchArgs = {
  prompt: string;
  uiLang: Lang;
  attachments?: AttachmentContext[];
  /** Injectable for tests. Defaults to the live registry candidates. */
  candidates?: ModelEntry[];
};

function toRecommendation(
  scored: ScoredModel,
  entry: ModelEntry,
  args: {
    lang: Lang;
    features: ReturnType<typeof extractMatcherFeatures>;
    primary?: ScoredModel;
  }
): MatchRecommendation {
  // The interaction profile is per-recommendation: a coding-agent prompt
  // recommended to a provider without an agent product falls back to chat.
  const profile =
    args.features.profile !== "chat" && entry.interactionProfiles?.includes(args.features.profile)
      ? args.features.profile
      : entry.interactionProfiles?.includes("chat")
      ? "chat"
      : entry.interactionProfiles?.[0] ?? "chat";

  const rec: MatchRecommendation = {
    target: entry.target,
    modelId: entry.id,
    modelLabel: entry.label,
    provider: entry.provider,
    profile,
    productLabel: productLabel(entry.target, profile),
    score: scored.score,
    reasons: buildReasons(args.lang, args.features, scored, entry, profile),
  };

  if (args.primary) {
    rec.tradeoff = buildTradeoff(args.lang, scored, entry, args.primary);
    rec.bestAt = buildBestAt(args.lang, scored, entry);
  }

  return rec;
}

export function matchPrompt(args: MatchArgs): MatchResult {
  const lang = args.uiLang;
  const features = extractMatcherFeatures({
    prompt: args.prompt,
    uiLang: lang,
    attachments: args.attachments,
  });

  const candidates = args.candidates ?? getMatcherCandidates();
  const ranked = bestPerTarget(scoreCandidates(features, candidates));
  const { confidence, isTie } = deriveConfidence(features, ranked);

  const primaryScored = ranked[0];
  const primaryEntry = getModelById(primaryScored?.modelId) ?? candidates.find((c) => c.id === primaryScored?.modelId);
  if (!primaryScored || !primaryEntry) {
    throw new Error("matcher: no candidates available");
  }

  const primary = toRecommendation(primaryScored, primaryEntry, {
    lang,
    features: { ...features, lang },
  });

  const alternatives = ranked
    .slice(1, 1 + MAX_ALTERNATIVES)
    .map((scored) => {
      const entry = getModelById(scored.modelId) ?? candidates.find((c) => c.id === scored.modelId);
      return entry
        ? toRecommendation(scored, entry, { lang, features: { ...features, lang }, primary: primaryScored })
        : null;
    })
    .filter((x): x is MatchRecommendation => x !== null);

  const categories = (Object.entries(features.evidence) as Array<[keyof typeof features.evidence, number]>)
    .filter(([, v]) => (v ?? 0) > 0)
    .map(([category, evidence]) => ({ category: category as MatchResult["detected"]["categories"][number]["category"], evidence: evidence ?? 0 }))
    .sort((a, b) => b.evidence - a.evidence);

  const result: MatchResult = {
    rubricVersion: RUBRIC_VERSION,
    lang,
    detected: {
      signals: features.signals,
      categories,
      profile: features.profile,
      ambiguity: features.ambiguity,
    },
    primary,
    alternatives,
    confidence,
    isTie,
    advice: {
      fit: primary.reasons,
      adaptation: buildAdaptationAdvice(lang, features, primaryEntry, primary.profile),
      switching: buildSwitchingAdvice(lang, features, primary.profile),
    },
  };

  if (isTie && ranked.length >= 2) {
    result.tieBreaker = buildTieBreaker(lang, primaryScored, ranked[1], primaryEntry);
  }

  return result;
}
