import type { Lang, TargetAI } from "../promptTemplates";
import type { Features, TaskType } from "./types";

type Breakdown = {
  clarity: number;
  context: number;
  constraints: number;
  output: number;
  verifiability: number;
  safety: number;
};

type Scored = {
  score: number;
  breakdown: Breakdown;
  confidence: number;
  explain: string[];
};

type Weights = Breakdown;

function clamp(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function t(lang: Lang, es: string, en: string) {
  return lang === "es" ? es : en;
}

function getWeights(taskType: TaskType): Weights {
  switch (taskType) {
    case "debugging":
      return { clarity: 0.18, context: 0.24, constraints: 0.12, output: 0.12, verifiability: 0.24, safety: 0.10 };
    case "coding":
    case "refactor":
      return { clarity: 0.20, context: 0.22, constraints: 0.16, output: 0.16, verifiability: 0.16, safety: 0.10 };
    case "data_extraction":
      return { clarity: 0.16, context: 0.24, constraints: 0.16, output: 0.20, verifiability: 0.14, safety: 0.10 };
    case "translation":
    case "summarization":
      return { clarity: 0.26, context: 0.22, constraints: 0.16, output: 0.16, verifiability: 0.10, safety: 0.10 };
    case "marketing":
      return { clarity: 0.24, context: 0.18, constraints: 0.22, output: 0.16, verifiability: 0.10, safety: 0.10 };
    case "study":
    case "research":
    case "planning":
    case "customer_support":
      return { clarity: 0.24, context: 0.20, constraints: 0.18, output: 0.16, verifiability: 0.12, safety: 0.10 };
    default:
      return { clarity: 0.24, context: 0.20, constraints: 0.18, output: 0.16, verifiability: 0.12, safety: 0.10 };
  }
}

function getCriticalCap(taskType: TaskType, f: Features) {
  switch (taskType) {
    case "debugging": {
      const missing = [!f.hasInputs, !f.hasErrorDetails, !f.hasReproSteps].filter(Boolean).length;
      if (missing >= 2) return 70;
      if (missing === 1) return 84;
      return 100;
    }
    case "data_extraction":
      if (!f.hasInputs) return 72;
      if (!f.hasOutputFormat) return 82;
      return 100;
    case "translation":
      if (!f.hasInputs) return 78;
      return 100;
    case "summarization":
      if (!f.hasInputs) return 80;
      return 100;
    default:
      return 100;
  }
}

function clarityScore(taskType: TaskType, f: Features) {
  if ((taskType === "summarization" || taskType === "translation") && f.hasGoal) {
    if (f.words >= 10) return 90;
    if (f.words >= 5) return 78;
    return 65;
  }

  if (taskType === "debugging") {
    const base = f.words >= 35 ? 95 : f.words >= 20 ? 78 : f.words >= 10 ? 58 : 30;
    return clamp(base + (f.hasGoal ? 8 : 0));
  }

  const base = f.words >= 40 ? 100 : f.words >= 25 ? 85 : f.words >= 15 ? 68 : f.words >= 8 ? 48 : 24;
  return clamp(base + (f.hasGoal ? 10 : 0) + (f.hasTone ? 4 : 0));
}

function contextScore(taskType: TaskType, f: Features) {
  const hits = (f.hasInputs ? 1 : 0) + (f.hasAudience ? 1 : 0) + (f.hasExamples ? 1 : 0);
  let score = hits * 22;

  if (f.hasInputs) {
    if (taskType === "summarization" || taskType === "translation") score = Math.max(score, 72);
    if (taskType === "data_extraction") score = Math.max(score, 78);
    if (taskType === "coding" || taskType === "debugging") score = Math.max(score, 68);
  }

  if (taskType === "study" && f.hasAudience) score += 10;
  return clamp(score);
}

function constraintsScore(taskType: TaskType, f: Features) {
  let hits = 0;
  if (f.hasConstraints) hits += 1;
  if (f.hasTone) hits += 1;
  if (f.hasLengthHint) hits += 1;
  if (f.hasTimeframe) hits += 1;
  if (f.hasRegion) hits += 1;

  let score = hits * 18;

  if ((taskType === "summarization" || taskType === "translation") && (f.hasLengthHint || f.hasTone || f.hasConstraints)) {
    score = Math.max(score, 55);
  }

  return clamp(score);
}

function outputScore(taskType: TaskType, f: Features) {
  if (f.hasOutputFormat && f.hasSuccessCriteria) return 95;
  if (f.hasOutputFormat) {
    if (taskType === "data_extraction") return 92;
    if (taskType === "summarization" || taskType === "translation") return 84;
    return 78;
  }
  return taskType === "summarization" || taskType === "translation" ? 24 : 12;
}

function verifiabilityScore(taskType: TaskType, f: Features) {
  let score = 0;
  if (f.hasSuccessCriteria) score += 40;
  if (f.hasErrorDetails) score += 30;
  if (f.hasReproSteps) score += 30;

  if (taskType === "debugging" && f.hasErrorDetails && f.hasReproSteps) score += 10;
  return clamp(score);
}

function safetyScore(f: Features) {
  let s = 100;
  if (f.injectionLike) s -= 45;
  if (f.contradictions) s -= 22;
  if (f.languageMismatch) s -= 12;
  return clamp(s);
}

export function scorePrompt(
  taskType: TaskType,
  _target: TargetAI,
  f: Features,
  lang: Lang,
  opts?: { attachmentsCount?: number }
): Scored {
  const clarity = clarityScore(taskType, f);
  const context = contextScore(taskType, f);
  const constraints = constraintsScore(taskType, f);
  const output = outputScore(taskType, f);
  const verifiability = verifiabilityScore(taskType, f);
  const safety = safetyScore(f);

  const weights = getWeights(taskType);
  const rawScore =
    weights.clarity * clarity +
    weights.context * context +
    weights.constraints * constraints +
    weights.output * output +
    weights.verifiability * verifiability +
    weights.safety * safety;

  const cap = getCriticalCap(taskType, f);
  const score = Math.min(clamp(rawScore), cap);

  let confidence = 52;
  if (f.words >= 20) confidence += 12;
  if (f.hasGoal) confidence += 10;
  if (f.hasInputs) confidence += 12;
  if (f.hasOutputFormat) confidence += 8;
  if (f.hasConstraints) confidence += 8;
  if (f.hasErrorDetails) confidence += 6;
  if (f.injectionLike) confidence -= 18;
  if (f.contradictions) confidence -= 12;
  confidence = clamp(confidence);

  const explain: string[] = [];

  if (score >= 85) {
    explain.push(t(lang, "Muy buen prompt: está claro y bien guiado.", "Very good prompt: it is clear and well guided."));
  } else if (score >= 70) {
    explain.push(
      t(
        lang,
        "Buen punto de partida: con pequeños ajustes puede mejorar mucho.",
        "Good starting point: small refinements can improve it a lot."
      )
    );
  } else if (score >= 50) {
    explain.push(
      t(
        lang,
        "El pedido es entendible, pero todavía le falta precisión para responder mejor.",
        "The request is understandable, but it still lacks precision for better answers."
      )
    );
  } else {
    explain.push(
      t(
        lang,
        "Prompt flojo: faltan piezas importantes para obtener una respuesta consistente.",
        "Weak prompt: important pieces are still missing for a consistent answer."
      )
    );
  }

  if (taskType === "summarization") {
    if (!f.hasLengthHint) {
      explain.push(t(lang, "Definí cuánto resumir: bullets, párrafo o resumen corto.", "Define summary length: bullets, paragraph, or short summary."));
    }
    if (!f.hasOutputFormat) {
      explain.push(t(lang, "Pedí un formato final concreto para el resumen.", "Ask for a concrete final format for the summary."));
    }
  }

  if (taskType === "translation") {
    if (!f.hasInputs) {
      explain.push(t(lang, "Falta el texto fuente para traducir.", "The source text is missing."));
    }
    if (!f.hasConstraints) {
      explain.push(t(lang, "Aclará idioma destino y registro de traducción.", "Clarify target language and translation register."));
    }
  }

  if ((taskType === "coding" || taskType === "debugging") && !f.hasInputs) {
    explain.push(t(lang, "Falta contexto técnico concreto: código, logs o error.", "Concrete technical context is missing: code, logs, or error."));
  }

  if ((opts?.attachmentsCount ?? 0) > 0 && !f.hasGoal) {
    explain.push(
      t(
        lang,
        "Los adjuntos ayudan con contexto, pero no reemplazan un pedido claro.",
        "Attachments help with context, but they do not replace a clear request."
      )
    );
  }

  if (cap < clamp(rawScore)) {
    explain.push(
      t(
        lang,
        "El score quedó capado porque todavía faltan insumos críticos para esta tarea.",
        "The score was capped because critical inputs are still missing for this task."
      )
    );
  }

  return {
    score,
    breakdown: {
      clarity: clamp(clarity),
      context: clamp(context),
      constraints: clamp(constraints),
      output: clamp(output),
      verifiability: clamp(verifiability),
      safety: clamp(safety),
    },
    confidence,
    explain,
  };
}