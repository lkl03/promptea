import type { Lang, TargetAI } from "../promptTemplates";
import type { OutputFormat } from "./lint/types";
import type { AttachmentContext } from "@/lib/attachments";

// Canonical unions live in lib/domain.ts; re-exported here for engine consumers.
export type { PromptPurpose, TaskType } from "@/lib/domain";
import type { PromptPurpose, TaskType } from "@/lib/domain";

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

export type AnalyzeResult = {
  score: number;
  findings: Finding[];
  recommendations: Recommendation[];
  optimizedPrompt: string;
  stats: { words: number; approxTokens: number };
  meta: {
    engineVersion: string;
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
    attachmentsCount?: number;
    attachmentsUsed?: Array<Pick<AttachmentContext, "name" | "kind" | "truncated">>;
    formatChoice?: "checklist" | "json";
    modelId?: string | null;
    routing?: {
      strategy: string;
      complexity: string;
      signals: string[];
    };
    /** v1.3.0: input already is (or matches) an optimized prompt — minimal edits, adaptive layer skipped. */
    alreadyOptimized?: boolean;
    scoreCriteria?: Array<{ key: string; label: { es: string; en: string } }>;
    strengths?: string[];
    criticalIssues?: string[];
    quickWins?: string[];
    missingInformation?: string[];
    followUpQuestions?: string[];
    modelNotes?: string;
  };
};