import type { Lang, TargetAI } from "../promptTemplates";
import type { AnalyzeResult, PromptPurpose, TaskType, Features } from "./types";

import { lintPrompt } from "./lint";
import { extractFeatures } from "./features";
import { scorePrompt } from "./scoring";
import { buildOptimizedPrompt, PROMPTEA_TEMPLATE_VERSION } from "./builder";

import { normalizeText, wordCount, approxTokensFromWords } from "./normalize";
import { detectStructured, extractCorePrompt } from "./extractor";
import { ENGINE_VERSION } from "./contract";
import { classifyTask } from "./classifier";
import { sanitizeCorePrompt } from "./sanitize";

const TASK_FROM_PURPOSE: Record<PromptPurpose, TaskType> = {
  text: "text",
  study: "study",
  code: "coding",
  data: "data",
  image: "image",
  marketing: "marketing",
};

function canonicalize(s: string) {
  return String(s ?? "").replace(/\r\n/g, "\n").trimEnd();
}

type PrompteaParsed = {
  version: string;
  model: string | null;   // lower
  purpose: string | null; // lower
  taskType: string | null;// lower
  core: string | null;
};

function parsePromptea(raw: string): PrompteaParsed | null {
  const sig = raw.match(/^PROMPTEA:\s*v?([0-9.]+)\s*$/im);
  if (!sig) return null;

  const version = sig[1] ?? "1.0";

  const model = raw.match(/^MODEL:\s*(.+)\s*$/im)?.[1]?.trim()?.toLowerCase() ?? null;
  const purpose = raw.match(/^PURPOSE:\s*(.+)\s*$/im)?.[1]?.trim()?.toLowerCase() ?? null;
  const taskType = raw.match(/^TASK_TYPE:\s*(.+)\s*$/im)?.[1]?.trim()?.toLowerCase() ?? null;

  // Task section: between "TASK:" and next big header (OUTPUT FORMAT / CONSTRAINTS) or EOF
  const coreMatch = raw.match(/\nTASK:\s*\n([\s\S]*?)(?:\n\n(?:OUTPUT FORMAT:|CONSTRAINTS:)\s*\n|$)/i);
  const core = coreMatch?.[1] ? coreMatch[1].trim() : null;

  return { version, model, purpose, taskType, core };
}

function normalizePurpose(p: any): PromptPurpose {
  // compat
  if (p === "data_json") return "data";
  if (p === "text" || p === "study" || p === "code" || p === "data" || p === "image" || p === "marketing") return p;
  return "text";
}

export function analyzePrompt(prompt: string, target: TargetAI, lang: Lang, purposeInput: any): AnalyzeResult {
  const raw = canonicalize(normalizeText(prompt));
  const purpose: PromptPurpose = normalizePurpose(purposeInput);
  const taskType: TaskType = TASK_FROM_PURPOSE[purpose] ?? "text";

  // ✅ 1) Clasificación por contenido (sirve para reglas más específicas)
  // No cambia el taskType "oficial" (purpose-driven) que exponemos en meta.
  const intent = classifyTask(raw);

  // ✅ 2) Score/lint/features sobre el prompt COMPLETO (incluye scaffold)
  // Esto mantiene el UX: el optimizado suele scorear mejor que el input crudo.
  const scoreText = raw;

  const lint = lintPrompt(scoreText, lang, intent);
  const findings = lint.findings;
  const recommendations = lint.recommendations;

  let features: Features = extractFeatures(scoreText, intent as any, lang);

  // ✅ 2) Si es un prompt Promptea, aseguramos que “cuenten” cosas del template
  const promptea = parsePromptea(scoreText);
  if (promptea) {
    // estas flags garantizan mejora de score si el extractor no detecta encabezados
    features = {
      ...features,
      hasOutputFormat: true,
      hasConstraints: true,
      hasGoal: true,
    };
  }

  const scored = scorePrompt(taskType, target, features, lang, intent);

  // ✅ Caps por señales críticas (más “personalizado” por tipo de tarea)
  // La idea: no dejar que el scaffold tape faltantes graves del core.
  const capScore = (base: number) => {
    let cap = 100;
    const ids = new Set((findings ?? []).map((f) => String(f.id)));

    if (ids.has("prompt_injection")) cap = Math.min(cap, 55);

    // Debugging: sin error/repro/entorno, el score no puede ser alto.
    if (String(intent) === "debugging") {
      if (ids.has("missing_error_message")) cap = Math.min(cap, 65);
      if (ids.has("missing_repro_steps")) cap = Math.min(cap, 75);
      if (ids.has("missing_environment")) cap = Math.min(cap, 85);
    }

    // Data extraction: sin input o schema fuerte (si pide JSON), cap.
    if (String(intent) === "data_extraction") {
      if (ids.has("missing_input_data")) cap = Math.min(cap, 60);
      if (ids.has("missing_schema")) cap = Math.min(cap, 75);
    }

    return Math.min(base, cap);
  };

  const score = capScore(scored.score);
  const breakdown = scored.breakdown;

  // ✅ 3) Core para construir optimizado (evita nesting)
  let coreForBuild = scoreText;
  let coreExtracted = false;

  if (promptea?.core) {
    // si input ya es promptea, el core es la sección TASK (para no re-envolver)
    coreForBuild = promptea.core;
    coreExtracted = true;
  } else if (detectStructured(scoreText)) {
    const extracted = extractCorePrompt(scoreText);
    coreForBuild = extracted.core;
    coreExtracted = extracted.extracted;
  }

  // ✅ Sanitización de core para evitar amplificar prompt injection
  const coreCleanRaw = canonicalize(normalizeText(coreForBuild));
  const sanitized = sanitizeCorePrompt(coreCleanRaw);
  const coreClean = sanitized.clean;

  // ✅ 4) Idempotencia: si el prompt ya es Promptea y coincide PURPOSE+MODEL con selección actual, devolvemos el mismo prompt
  const targetLower = String(target).toLowerCase();
  const sameModel = (promptea?.model ?? null) === targetLower;
  const samePurpose = (promptea?.purpose ?? null) === String(purpose);

  let optimizedPrompt: string;

  if (promptea && sameModel && samePurpose) {
    // Solo devolvemos tal cual si ya está en la versión actual del template.
    // Si no, lo "upgradeamos" re-construyendo desde TASK.
    if ((promptea.version ?? "") === PROMPTEA_TEMPLATE_VERSION && !sanitized.removed) {
      optimizedPrompt = canonicalize(scoreText);
    } else {
      optimizedPrompt = canonicalize(buildOptimizedPrompt(coreClean, taskType as any, target, lang, purpose, lint.outputFormat ?? null));
    }
  } else {
    optimizedPrompt = canonicalize(buildOptimizedPrompt(coreClean, taskType as any, target, lang, purpose, lint.outputFormat ?? null));
  }

  // stats del prompt que pegó el usuario (si pegó uno optimizado, cuenta todo)
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





