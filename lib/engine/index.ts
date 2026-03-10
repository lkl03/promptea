import type { Lang, TargetAI } from "../promptTemplates";
import type { AnalyzeResult, PromptPurpose, TaskType, Features } from "./types";

import { lintPrompt } from "./lint";
import { extractFeatures } from "./features";
import { scorePrompt } from "./scoring";
import { buildOptimizedPrompt } from "./builder";

import { normalizeText, wordCount, approxTokensFromWords } from "./normalize";
import { detectStructured, extractCorePrompt } from "./extractor";
import { ENGINE_VERSION } from "./contract";

const TASK_FROM_PURPOSE: Record<PromptPurpose, TaskType> = {
  text: "text",
  study: "study",
  code: "coding",
  data: "data",
  image: "image",
  marketing: "marketing",
  translation: "translation",
  summarization: "summarization",
};

function canonicalize(s: string) {
  return String(s ?? "").replace(/\r\n/g, "\n").trimEnd();
}

type PrompteaParsed = {
  version: string;
  model: string | null;
  purpose: string | null;
  taskType: string | null;
  core: string | null;
};

function parsePromptea(raw: string): PrompteaParsed | null {
  const sig = raw.match(/^PROMPTEA:\s*v?([0-9.]+)\s*$/im);
  if (!sig) return null;

  const version = sig[1] ?? "1.0";

  const model = raw.match(/^MODEL:\s*(.+)\s*$/im)?.[1]?.trim()?.toLowerCase() ?? null;
  const purpose = raw.match(/^PURPOSE:\s*(.+)\s*$/im)?.[1]?.trim()?.toLowerCase() ?? null;
  const taskType = raw.match(/^TASK_TYPE:\s*(.+)\s*$/im)?.[1]?.trim()?.toLowerCase() ?? null;

  const coreMatch = raw.match(/\nTASK:\s*\n([\s\S]*?)(?:\n\n(?:OUTPUT FORMAT:|CONSTRAINTS:)\s*\n|$)/i);
  const core = coreMatch?.[1] ? coreMatch[1].trim() : null;

  return { version, model, purpose, taskType, core };
}

function normalizePurpose(p: any): PromptPurpose {
  if (p === "data_json") return "data";
  if (p === "summary" || p === "summarize") return "summarization";
  if (p === "translate") return "translation";
  if (
    p === "text" ||
    p === "study" ||
    p === "code" ||
    p === "data" ||
    p === "image" ||
    p === "marketing" ||
    p === "translation" ||
    p === "summarization"
  ) {
    return p;
  }
  return "text";
}

export function analyzePrompt(prompt: string, target: TargetAI, lang: Lang, purposeInput: any): AnalyzeResult {
  const raw = canonicalize(normalizeText(prompt));
  const purpose: PromptPurpose = normalizePurpose(purposeInput);
  const taskType: TaskType = TASK_FROM_PURPOSE[purpose] ?? "text";

  const scoreText = raw;

  const lint = lintPrompt(scoreText, lang, taskType);
  const findings = lint.findings;
  const recommendations = lint.recommendations;

  let features: Features = extractFeatures(scoreText, taskType as any, lang);

  const promptea = parsePromptea(scoreText);
  if (promptea) {
    features = {
      ...features,
      hasOutputFormat: true,
      hasConstraints: true,
      hasGoal: true,
    };
  }

  const scored = scorePrompt(taskType, target, features, lang);
  const score = scored.score;
  const breakdown = scored.breakdown;

  let coreForBuild = scoreText;
  let coreExtracted = false;

  if (promptea?.core) {
    coreForBuild = promptea.core;
    coreExtracted = true;
  } else if (detectStructured(scoreText)) {
    const extracted = extractCorePrompt(scoreText);
    coreForBuild = extracted.core;
    coreExtracted = extracted.extracted;
  }

  const coreClean = canonicalize(normalizeText(coreForBuild));

  const targetLower = String(target).toLowerCase();
  const sameModel = (promptea?.model ?? null) === targetLower;
  const samePurpose = (promptea?.purpose ?? null) === String(purpose);

  let optimizedPrompt: string;

  if (promptea && sameModel && samePurpose) {
    optimizedPrompt = canonicalize(scoreText);
  } else {
    optimizedPrompt = canonicalize(buildOptimizedPrompt(coreClean, taskType as any, target, lang, purpose));
  }

  const words = wordCount(scoreText);
  const approxTokens = approxTokensFromWords(words);

  return {
    score,
    findings,
    recommendations,
    optimizedPrompt,
    stats: { words, approxTokens },
    meta: {
      engineVersion: ENGINE_VERSION,
      lang,
      target,
      purpose,
      taskType,
      alreadyStructured: detectStructured(scoreText),
      coreExtracted,
      confidence: scored.confidence,
      scoreExplain: scored.explain,
      scoreBreakdown: breakdown,
      outputFormat: lint.outputFormat ?? null,
    },
  };
}

export { ENGINE_VERSION };
export type { AnalyzeResult } from "./types";
