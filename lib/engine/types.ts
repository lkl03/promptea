import type { Lang, TargetAI } from "../promptTemplates";
import type { OutputFormat } from "./lint/types";

export type PromptPurpose = "text" | "study" | "code" | "data" | "image" | "marketing";
export type TaskType = "text" | "study" | "coding" | "data" | "image" | "marketing";

export type Severity = "low" | "medium" | "high";
export type Impact = "low" | "medium" | "high";

export type Finding = {
  id: string;
  title: string;
  description: string;
  fix: string;
  severity: Severity;
};

export type Recommendation = {
  id?: string;
  title: string;
  detail: string;
  impact: Impact;
};

export type AnalyzeResult = {
  score: number;
  findings: Finding[];
  recommendations: Recommendation[];
  optimizedPrompt: string;
  stats: { words: number; approxTokens: number };
  meta: {
    engineVersion: string;

    // ✅ para debug y consistencia
    lang: Lang;
    target: TargetAI;
    purpose: PromptPurpose;
    taskType: TaskType;

    alreadyStructured: boolean;
    coreExtracted: boolean;

    confidence: number;
    scoreExplain: string[];
    scoreBreakdown: {
      clarity: number;
      context: number;
      constraints: number;
      output: number;
      verifiability: number;
      safety: number;
    };

    outputFormat?: OutputFormat | null;
  };
};

export type Features = {
  words: number;
  hasGoal: boolean;
  hasInputs: boolean;
  hasAudience: boolean;
  hasExamples: boolean;
  hasConstraints: boolean;
  hasOutputFormat: boolean;
  hasSuccessCriteria: boolean;
  hasTone: boolean;
  hasLengthHint: boolean;
  hasTimeframe: boolean;
  hasRegion: boolean;
  hasErrorDetails: boolean;
  hasReproSteps: boolean;
  injectionLike: boolean;
  contradictions: boolean;
  languageMismatch: boolean;
};


