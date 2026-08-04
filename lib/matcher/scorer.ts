// lib/matcher/scorer.ts
//
// Deterministic scoring of registry candidates against extracted evidence.
//
// score(model) = Σ evidence[cat] × fit(model, cat), normalized to 0-100
// against a hypothetical perfect-fit model (fit 3 in every evidenced
// category). Ties are broken deterministically: higher profile alignment,
// then provider default flag, then registry order — never randomness.

import type { InteractionProfile, MatchCategory, MatchConfidence } from "@/lib/domain";
import type { ModelEntry } from "@/lib/models";
import { CONFIDENCE_RULES } from "./rubric";
import type { CategoryContribution, MatcherFeatures, ScoredModel } from "./types";

const MAX_FIT = 3;

function fitFor(entry: ModelEntry, category: MatchCategory): number {
  const caps = entry.capabilities;
  if (!caps) return 0;

  const base = caps.taskFit[category] ?? 0;

  // Capability gates: evidence in a category a model cannot serve at all
  // must never be paid for by unrelated strengths.
  if (category === "codingAgent") return Math.min(base, caps.codingAgentFit);
  if (category === "research" && !caps.nativeSearch) return Math.min(base, 1);
  if (category === "multimodal" && !caps.inputModalities.includes("image")) return 0;
  if (category === "dataExtraction" && !caps.structuredOutput) return Math.min(base, 1);

  return base;
}

export function scoreCandidates(features: MatcherFeatures, candidates: ModelEntry[]): ScoredModel[] {
  const evidenced = Object.entries(features.evidence).filter(([, v]) => (v ?? 0) > 0) as Array<
    [MatchCategory, number]
  >;
  const maxPossible = evidenced.reduce((sum, [, v]) => sum + v * MAX_FIT, 0);

  const scored: ScoredModel[] = candidates.map((entry) => {
    const contributions: CategoryContribution[] = evidenced.map(([category, evidence]) => {
      const fit = fitFor(entry, category);
      return { category, evidence, fit, points: evidence * fit };
    });
    const points = contributions.reduce((sum, c) => sum + c.points, 0);
    const score = maxPossible > 0 ? Math.round((points / maxPossible) * 100) : 0;

    return { modelId: entry.id, target: entry.target, score, contributions };
  });

  const profileAlignment = (entry: ModelEntry | undefined, profile: InteractionProfile) =>
    entry?.interactionProfiles?.includes(profile) ? 1 : 0;

  const byId = new Map(candidates.map((c) => [c.id, c]));

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const pa = profileAlignment(byId.get(a.modelId), features.profile);
    const pb = profileAlignment(byId.get(b.modelId), features.profile);
    if (pb !== pa) return pb - pa;
    const da = byId.get(a.modelId)?.defaultForTarget ? 1 : 0;
    const db = byId.get(b.modelId)?.defaultForTarget ? 1 : 0;
    if (db !== da) return db - da;
    return candidates.findIndex((c) => c.id === a.modelId) - candidates.findIndex((c) => c.id === b.modelId);
  });

  return scored;
}

/**
 * Keep only the best-scoring model per target so the ranking reads as
 * "which AI", not five entries of the same provider.
 */
export function bestPerTarget(scored: ScoredModel[]): ScoredModel[] {
  const seen = new Set<string>();
  const out: ScoredModel[] = [];
  for (const s of scored) {
    if (seen.has(s.target)) continue;
    seen.add(s.target);
    out.push(s);
  }
  return out;
}

export function deriveConfidence(
  features: MatcherFeatures,
  ranked: ScoredModel[]
): { confidence: MatchConfidence; isTie: boolean } {
  const total = Object.values(features.evidence).reduce((a, b) => a + (b ?? 0), 0);
  const margin = ranked.length >= 2 ? ranked[0].score - ranked[1].score : 100;
  const isTie = ranked.length >= 2 && margin <= CONFIDENCE_RULES.tieMarginAtMost;

  if (total < CONFIDENCE_RULES.lowEvidenceBelow || features.ambiguity === "high") {
    return { confidence: "low", isTie };
  }
  if (
    total >= CONFIDENCE_RULES.highEvidenceAtLeast &&
    margin >= CONFIDENCE_RULES.highMarginAtLeast &&
    features.ambiguity === "low"
  ) {
    return { confidence: "high", isTie: false };
  }
  return { confidence: "medium", isTie };
}
