import type { Lang, TargetAI } from "../promptTemplates";
import type { AnalyzeResult, PromptPurpose, TaskType, Features } from "./types";
import type { AttachmentContext, AttachmentKind } from "@/lib/attachments";

import { lintPrompt } from "./lint";
import { extractFeatures } from "./features";
import { scorePrompt } from "./scoring";
import { buildOptimizedPrompt } from "./builder";
import { buildJsonOptimizedPrompt } from "./jsonOutput";
import { buildFeedbackBlock } from "./feedback";

import { normalizeText, wordCount, approxTokensFromWords } from "./normalize";
import { detectStructured, extractCorePrompt } from "./extractor";
import { ENGINE_VERSION } from "./contract";
import { summarizeAttachments, getExtension, inferAttachmentKind } from "@/lib/attachments";
import { classifyTask } from "./classifier";
import { selectStrategy, type RoutingDecision } from "@/lib/refine/router";
import { normalizePurpose } from "@/lib/domain";

export type OutputFormatChoice = "checklist" | "json";

export type AnalyzeOptions = {
  attachments?: AttachmentContext[];
  format?: OutputFormatChoice;
  modelId?: string | null;
};

const TASK_FROM_PURPOSE: Record<PromptPurpose, TaskType> = {
  text: "text",
  study: "study",
  code: "coding",
  data: "data_extraction",
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

  const coreMatch = raw.match(
    /\nTASK:\s*\n([\s\S]*?)(?:\n\n(?:ATTACHED CONTEXT:|CONTEXTO ADJUNTO:|OUTPUT FORMAT:|CONSTRAINTS:|RESTRICCIONES:)\s*\n|$)/i
  );
  const core = coreMatch?.[1] ? coreMatch[1].trim() : null;

  return { version, model, purpose, taskType, core };
}

function parseEmbeddedAttachments(raw: string): AttachmentContext[] {
  const matches = Array.from(raw.matchAll(/<file\s+([^>]+)>([\s\S]*?)<\/file>/gi));
  if (!matches.length) return [];

  return matches
    .map((match) => {
      const attrs = match[1] ?? "";
      const text = canonicalize(match[2] ?? "").trim();

      const name = attrs.match(/name="([^"]+)"/i)?.[1]?.trim() ?? "attachment.txt";
      const explicitKind = attrs.match(/kind="([^"]+)"/i)?.[1]?.trim() ?? "";
      const truncated = /truncated="true"/i.test(attrs);

      const kind = (explicitKind || inferAttachmentKind(name, "text/plain")) as AttachmentKind;

      return {
        name,
        mime: "text/plain",
        ext: getExtension(name),
        kind,
        text,
        size: text.length,
        truncated,
        removedLines: 0,
      } satisfies AttachmentContext;
    })
    .filter((item) => item.text.length > 0);
}


function resolveTaskType(raw: string, purpose: PromptPurpose): TaskType {
  const fallback = TASK_FROM_PURPOSE[purpose] ?? "text";
  const classified = classifyTask(raw);

  switch (purpose) {
    case "code":
      if (classified === "debugging" || classified === "refactor" || classified === "coding") return classified;
      return "coding";
    case "data":
      return "data_extraction";
    case "text":
      // v1.2.0: detect the real task even when the user kept the default
      // "text" purpose — a JSON-extraction or debugging prompt typed under
      // "text" should be scored and structured as what it actually is.
      if (
        classified === "research" ||
        classified === "planning" ||
        classified === "customer_support" ||
        classified === "writing" ||
        classified === "summarization" ||
        classified === "translation" ||
        classified === "data_extraction"
      ) {
        return classified;
      }
      // Coding/debugging need real code-work intent, not just a tech noun
      // ("improve my React CV" is a text task, not a coding task).
      if (
        (classified === "coding" || classified === "debugging") &&
        /(fix|debug|implement|bug|error|write code|refactor|function|función|funcion|snippet|compile|compilar|deploy|```)/i.test(raw)
      ) {
        return classified;
      }
      return "text";
    case "marketing":
      return "marketing";
    case "study":
      return "study";
    case "translation":
      return "translation";
    case "summarization":
      return "summarization";
    case "image":
      return "image";
    default:
      return fallback;
  }
}

function attachmentBlob(attachments: AttachmentContext[]) {
  return attachments.map((file) => file.text.slice(0, 2400)).join("\n\n");
}

function enhanceFeaturesWithAttachments(
  features: Features,
  attachments: AttachmentContext[],
  taskType: TaskType
): Features {
  if (!attachments.length) return features;

  const summary = summarizeAttachments(attachments);
  const blob = attachmentBlob(attachments);

  const attachmentHasErrors = /(error|exception|traceback|stack\s*trace|stacktrace|fails?|falla|crash)/i.test(blob);
  const attachmentHasSteps = /\bsteps?\b/i.test(blob) || /^\s*\d+\s*[\).\:-]\s+/m.test(blob);

  return {
    ...features,
    hasInputs: true,
    hasExamples: features.hasExamples || summary.hasCode || summary.hasStructuredData,
    hasErrorDetails:
      features.hasErrorDetails ||
      ((taskType === "coding" || taskType === "debugging") && (summary.hasLogs || attachmentHasErrors)),
    hasReproSteps:
      features.hasReproSteps ||
      (taskType === "debugging" && attachmentHasSteps),
  };
}

function softenLintWithAttachments(
  lint: ReturnType<typeof lintPrompt>,
  attachments: AttachmentContext[],
  taskType: TaskType
) {
  if (!attachments.length) return lint;

  const summary = summarizeAttachments(attachments);
  const blob = attachmentBlob(attachments);

  const hasDebugEvidence = summary.hasLogs || /(error|exception|traceback|stack\s*trace|stacktrace|fails?|falla|crash)/i.test(blob);
  const hasReproEvidence = /\bsteps?\b/i.test(blob) || /^\s*\d+\s*[\).\:-]\s+/m.test(blob);

  const findingIdsToDrop = new Set<string>(["missing_context"]);
  const recoIdsToDrop = new Set<string>(["add_context"]);

  if (
    taskType === "coding" ||
    taskType === "debugging" ||
    taskType === "refactor" ||
    taskType === "data_extraction" ||
    taskType === "translation" ||
    taskType === "summarization"
  ) {
    findingIdsToDrop.add("missing_input_data");
    recoIdsToDrop.add("add_input_data");
  }

  if (taskType === "debugging" && hasDebugEvidence) {
    findingIdsToDrop.add("missing_error_message");
    recoIdsToDrop.add("add_error_message");
  }

  if (taskType === "debugging" && hasReproEvidence) {
    findingIdsToDrop.add("missing_repro_steps");
    recoIdsToDrop.add("add_repro_steps");
  }

  return {
    ...lint,
    findings: lint.findings.filter((item) => !findingIdsToDrop.has(String(item.id))),
    recommendations: lint.recommendations.filter((item) => !recoIdsToDrop.has(String(item.id))),
  };
}

export function analyzePrompt(
  prompt: string,
  target: TargetAI,
  lang: Lang,
  purposeInput: unknown = "text",
  attachmentsOrOptions: AttachmentContext[] | AnalyzeOptions = []
): AnalyzeResult {
  const opts: AnalyzeOptions = Array.isArray(attachmentsOrOptions)
    ? { attachments: attachmentsOrOptions }
    : (attachmentsOrOptions ?? {});

  const attachments: AttachmentContext[] = Array.isArray(opts.attachments) ? opts.attachments : [];
  const formatChoice: OutputFormatChoice = opts.format === "json" ? "json" : "checklist";
  const modelId = opts.modelId ?? null;

  const raw = canonicalize(normalizeText(prompt));
  const purpose: PromptPurpose = normalizePurpose(purposeInput);
  const taskType: TaskType = resolveTaskType(raw, purpose);

  const promptea = parsePromptea(raw);
  const embeddedAttachments = attachments.length === 0 ? parseEmbeddedAttachments(raw) : [];
  const effectiveAttachments = attachments.length > 0 ? attachments : embeddedAttachments;

  let analysisInput = raw;
  let coreExtracted = false;

  if (promptea?.core) {
    analysisInput = promptea.core;
    coreExtracted = true;
  } else if (detectStructured(raw)) {
    const extracted = extractCorePrompt(raw);
    analysisInput = extracted.core;
    coreExtracted = extracted.extracted;
  }

  const cleanAnalysisInput = canonicalize(normalizeText(analysisInput));

  const lint = softenLintWithAttachments(
    lintPrompt(cleanAnalysisInput, lang, taskType, {
      attachmentsPresent: effectiveAttachments.length > 0,
    }),
    effectiveAttachments,
    taskType
  );

  let features: Features = enhanceFeaturesWithAttachments(
    extractFeatures(cleanAnalysisInput, taskType, lang),
    effectiveAttachments,
    taskType
  );

  // v1.2.0: when the extractor strips structured sections (OUTPUT FORMAT,
  // CONSTRAINTS, etc.) out of the analyzed core, the user still WROTE them —
  // credit those features from the raw text so scores don't punish
  // well-structured prompts.
  if (coreExtracted && !promptea) {
    const rawFeatures = extractFeatures(raw, taskType, lang);
    features = {
      ...features,
      hasOutputFormat: features.hasOutputFormat || rawFeatures.hasOutputFormat,
      hasConstraints: features.hasConstraints || rawFeatures.hasConstraints,
      hasTone: features.hasTone || rawFeatures.hasTone,
      hasLengthHint: features.hasLengthHint || rawFeatures.hasLengthHint,
      hasAudience: features.hasAudience || rawFeatures.hasAudience,
      hasExamples: features.hasExamples || rawFeatures.hasExamples,
      hasSuccessCriteria: features.hasSuccessCriteria || rawFeatures.hasSuccessCriteria,
    };
  }

  if (promptea) {
    features = {
      ...features,
      hasOutputFormat: true,
      hasConstraints: true,
      hasGoal: features.hasGoal || true,
    };
  }

  const scored = scorePrompt(taskType, target, features, lang, {
    attachmentsCount: effectiveAttachments.length,
  });

  const targetLower = String(target).toLowerCase();
  const sameModel = (promptea?.model ?? null) === targetLower;
  const samePurpose = (promptea?.purpose ?? null) === String(purpose);

  // v1.2.0: route refinement strategy + complexity from the prompt itself.
  const routing: RoutingDecision = selectStrategy({
    prompt: cleanAnalysisInput,
    taskType,
    purpose,
    attachmentsCount: effectiveAttachments.length,
  });

  let optimizedPrompt: string;
  if (formatChoice === "json") {
    optimizedPrompt = buildJsonOptimizedPrompt({
      core: cleanAnalysisInput,
      taskType,
      target,
      lang,
      purpose,
      attachments: effectiveAttachments,
    });
  } else if (promptea && sameModel && samePurpose && attachments.length === 0) {
    optimizedPrompt = canonicalize(raw);
  } else {
    optimizedPrompt = canonicalize(
      buildOptimizedPrompt(cleanAnalysisInput, taskType, target, lang, purpose, effectiveAttachments, {
        complexity: routing.complexity,
      })
    );
  }

  const words = wordCount(raw);
  const approxTokens = approxTokensFromWords(words);

  const feedback = buildFeedbackBlock({
    taskType,
    purpose,
    target,
    features,
    findings: lint.findings,
    recommendations: lint.recommendations,
    lang,
    modelId,
  });

  return {
    score: scored.score,
    findings: lint.findings,
    recommendations: lint.recommendations,
    optimizedPrompt,
    stats: { words, approxTokens },
    meta: {
      engineVersion: ENGINE_VERSION,
      lang,
      target,
      purpose,
      taskType,
      alreadyStructured: detectStructured(raw),
      coreExtracted,
      confidence: scored.confidence,
      scoreExplain: scored.explain,
      scoreBreakdown: scored.breakdown,
      outputFormat: lint.outputFormat ?? null,
      attachmentsCount: effectiveAttachments.length,
      attachmentsUsed: effectiveAttachments.map((file) => ({
        name: file.name,
        kind: file.kind,
        truncated: file.truncated,
      })),
      formatChoice,
      modelId,
      routing,
      scoreCriteria: feedback.scoreCriteria,
      strengths: feedback.strengths,
      criticalIssues: feedback.criticalIssues,
      quickWins: feedback.quickWins,
      missingInformation: feedback.missingInformation,
      followUpQuestions: feedback.followUpQuestions,
      modelNotes: feedback.modelNotes,
    },
  };
}

export { ENGINE_VERSION };
export type { AnalyzeResult } from "./types";