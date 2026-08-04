// lib/matcher/types.ts
//
// Types for the deterministic "Find the Best AI" matching engine (v1.3.0).
//
// The matcher is deterministic, explainable, and testable end to end:
// feature extraction (rubric signals) → scoring against registry capability
// data → confidence/ties → template-based bilingual explanations. No LLM
// participates in ranking; strings are generated for the requested language.

import type {
  InteractionProfile,
  Lang,
  MatchCategory,
  MatchConfidence,
  TargetAI,
} from "@/lib/domain";

/** One detected rubric signal (safe for diagnostics — never raw prompt text). */
export type SignalHit = {
  id: string;
  /** Short user-facing label in the requested language. */
  label: string;
  /** Categories this signal contributed evidence to. */
  categories: MatchCategory[];
};

export type MatcherFeatures = {
  lang: Lang;
  wordCount: number;
  /** Detected rubric signals, in rubric order. */
  signals: SignalHit[];
  /** Accumulated evidence per category (0 when absent). */
  evidence: Partial<Record<MatchCategory, number>>;
  /** Recommended interaction profile derived from evidence thresholds. */
  profile: InteractionProfile;
  ambiguity: "low" | "medium" | "high";
  attachmentsCount: number;
};

/** Per-category contribution to a model's score (for explanations/tests). */
export type CategoryContribution = {
  category: MatchCategory;
  evidence: number;
  fit: number;
  points: number;
};

export type ScoredModel = {
  modelId: string;
  target: TargetAI;
  /** 0-100 relative to a perfect-fit model for the detected evidence. */
  score: number;
  contributions: CategoryContribution[];
};

export type MatchRecommendation = {
  target: TargetAI;
  modelId: string;
  modelLabel: string;
  provider: string;
  profile: InteractionProfile;
  /**
   * What to actually open: "Claude Code", "Perplexity", "ChatGPT"… — the
   * interaction product, not just the model id.
   */
  productLabel: string;
  score: number;
  /** Concrete reasons citing detected signals (requested language). */
  reasons: string[];
  /** For alternatives: the main trade-off vs the primary pick. */
  tradeoff?: string;
  /** What this alternative would be especially good at. */
  bestAt?: string;
};

export type MatchResult = {
  rubricVersion: string;
  lang: Lang;
  detected: {
    signals: SignalHit[];
    /** Categories ranked by evidence (only those with evidence > 0). */
    categories: Array<{ category: MatchCategory; evidence: number }>;
    profile: InteractionProfile;
    ambiguity: "low" | "medium" | "high";
  };
  primary: MatchRecommendation;
  alternatives: MatchRecommendation[];
  confidence: MatchConfidence;
  isTie: boolean;
  /** When isTie: the deciding factor between the top two (requested language). */
  tieBreaker?: string;
  advice: {
    /** Why the current prompt fits the recommendation. */
    fit: string[];
    /** What to change to use the recommended AI well (cites prompt traits). */
    adaptation: string[];
    /** What to change if the user wants a DIFFERENT AI instead. */
    switching: string[];
  };
};
