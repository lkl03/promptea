// lib/engine/feedback.ts
//
// Builds task-aware, actionable feedback that complements the existing
// findings/recommendations. Returns concise high-signal suggestions that
// the UI can show under "areas to improve" or as follow-up questions.
//
// This module is additive: nothing here changes the base score or findings.

import type { Lang, TargetAI } from "@/lib/promptTemplates";
import type { Features, Finding, PromptPurpose, Recommendation, TaskType } from "./types";
import { modelNoteForTarget } from "@/lib/models";

export type ScoreCriterion = {
  key: string;
  label: { es: string; en: string };
};

export type FeedbackBlock = {
  scoreCriteria: ScoreCriterion[];
  strengths: string[];
  criticalIssues: string[];
  quickWins: string[];
  missingInformation: string[];
  followUpQuestions: string[];
  modelNotes: string;
};

function t(lang: Lang, es: string, en: string) {
  return lang === "es" ? es : en;
}

const CRITERIA_BY_TASK: Record<string, ScoreCriterion[]> = {
  coding: [
    { key: "context", label: { es: "Contexto del repo y del stack", en: "Repo and stack context" } },
    { key: "boundaries", label: { es: "Límites de la tarea", en: "Task boundaries" } },
    { key: "acceptance", label: { es: "Criterios de aceptación", en: "Acceptance criteria" } },
    { key: "tests", label: { es: "Tests / cómo validar", en: "Tests / how to validate" } },
    { key: "format", label: { es: "Formato del entregable", en: "Output format" } },
  ],
  debugging: [
    { key: "error", label: { es: "Mensaje de error completo", en: "Full error message" } },
    { key: "repro", label: { es: "Pasos para reproducir", en: "Reproduction steps" } },
    { key: "env", label: { es: "Entorno y versiones", en: "Environment and versions" } },
    { key: "expected", label: { es: "Comportamiento esperado", en: "Expected behavior" } },
  ],
  refactor: [
    { key: "scope", label: { es: "Alcance del refactor", en: "Refactor scope" } },
    { key: "invariants", label: { es: "Invariantes que mantener", en: "Invariants to preserve" } },
    { key: "tradeoffs", label: { es: "Trade-offs aceptables", en: "Acceptable trade-offs" } },
    { key: "tests", label: { es: "Tests / cobertura", en: "Tests / coverage" } },
  ],
  data_extraction: [
    { key: "schema", label: { es: "Esquema y tipos", en: "Schema and types" } },
    { key: "validation", label: { es: "Reglas de validación", en: "Validation rules" } },
    { key: "examples", label: { es: "Ejemplos input/output", en: "Input/output examples" } },
    { key: "missing", label: { es: "Política para faltantes", en: "Missing-value policy" } },
  ],
  marketing: [
    { key: "audience", label: { es: "Audiencia", en: "Audience" } },
    { key: "tone", label: { es: "Tono y voz de marca", en: "Tone and brand voice" } },
    { key: "channel", label: { es: "Canal y formato", en: "Channel and format" } },
    { key: "cta", label: { es: "CTA", en: "Call to action" } },
    { key: "differentiator", label: { es: "Propuesta de valor", en: "Differentiator" } },
  ],
  study: [
    { key: "level", label: { es: "Nivel del usuario", en: "Learner level" } },
    { key: "objective", label: { es: "Objetivo de aprendizaje", en: "Learning objective" } },
    { key: "examples", label: { es: "Ejemplos / práctica", en: "Examples / practice" } },
    { key: "format", label: { es: "Formato y feedback", en: "Format and feedback style" } },
  ],
  image: [
    { key: "subject", label: { es: "Sujeto", en: "Subject" } },
    { key: "style", label: { es: "Estilo", en: "Style" } },
    { key: "composition", label: { es: "Composición", en: "Composition" } },
    { key: "lighting", label: { es: "Iluminación", en: "Lighting" } },
    { key: "aspect", label: { es: "Relación de aspecto / negativos", en: "Aspect ratio / negatives" } },
  ],
  research: [
    { key: "scope", label: { es: "Alcance", en: "Scope" } },
    { key: "sources", label: { es: "Fuentes / período", en: "Sources / time period" } },
    { key: "format", label: { es: "Formato del entregable", en: "Output format" } },
    { key: "criteria", label: { es: "Criterios de calidad", en: "Quality criteria" } },
  ],
  text: [
    { key: "goal", label: { es: "Objetivo claro", en: "Clear goal" } },
    { key: "context", label: { es: "Contexto mínimo", en: "Minimal context" } },
    { key: "format", label: { es: "Formato de salida", en: "Output format" } },
    { key: "constraints", label: { es: "Tono / largo / restricciones", en: "Tone / length / constraints" } },
  ],
};

function criteriaFor(task: TaskType): ScoreCriterion[] {
  return CRITERIA_BY_TASK[task] ?? CRITERIA_BY_TASK.text;
}

function pickStrengths(features: Features, task: TaskType, lang: Lang): string[] {
  const out: string[] = [];

  if (features.hasGoal) out.push(t(lang, "El objetivo está explícito.", "The goal is explicit."));
  if (features.hasOutputFormat)
    out.push(t(lang, "Pedís un formato de salida concreto.", "You request a concrete output format."));
  if (features.hasInputs)
    out.push(
      t(
        lang,
        "Aportás material de entrada (texto, datos o código).",
        "You provide source material (text, data, or code)."
      )
    );
  if (features.hasExamples) out.push(t(lang, "Incluís ejemplos.", "You include examples."));
  if (features.hasConstraints) out.push(t(lang, "Tenés restricciones definidas.", "Constraints are defined."));
  if (features.hasErrorDetails && (task === "debugging" || task === "coding"))
    out.push(t(lang, "Incluís el detalle del error.", "Error details are included."));
  if (features.hasReproSteps && task === "debugging")
    out.push(t(lang, "Hay pasos para reproducir.", "Reproduction steps are present."));

  return out.slice(0, 3);
}

function pickFollowUps(features: Features, task: TaskType, purpose: PromptPurpose, lang: Lang): string[] {
  const qs: string[] = [];

  if (task === "coding" || task === "refactor") {
    if (!features.hasInputs)
      qs.push(t(lang, "¿Podés pegar el código o un repo de referencia?", "Can you paste the code or link a reference repo?"));
    if (!features.hasOutputFormat)
      qs.push(
        t(lang, "¿Querés diff, función completa o instrucciones paso a paso?", "Do you want a diff, a full function, or step-by-step instructions?")
      );
    if (!features.hasSuccessCriteria)
      qs.push(
        t(lang, "¿Cuáles son los criterios de aceptación o tests?", "What are the acceptance criteria or required tests?")
      );
  }

  if (task === "debugging") {
    if (!features.hasErrorDetails)
      qs.push(t(lang, "¿Podés pegar el error o stacktrace exacto?", "Can you paste the exact error or stacktrace?"));
    if (!features.hasReproSteps)
      qs.push(t(lang, "¿Cuáles son los pasos para reproducir el bug?", "What are the steps to reproduce the bug?"));
  }

  if (task === "data_extraction") {
    if (!features.hasOutputFormat)
      qs.push(t(lang, "¿Cuál es el schema esperado (campos y tipos)?", "What is the expected schema (fields and types)?"));
    if (!features.hasInputs)
      qs.push(t(lang, "¿Cuál es la fuente de datos a procesar?", "What is the source data to process?"));
  }

  if (task === "marketing") {
    if (!features.hasAudience)
      qs.push(t(lang, "¿Quién es la audiencia objetivo?", "Who is the target audience?"));
    if (!features.hasTone)
      qs.push(t(lang, "¿Qué tono querés (formal, casual, energético)?", "What tone (formal, casual, energetic)?"));
    if (!features.hasConstraints)
      qs.push(t(lang, "¿Cuál es el CTA y el canal?", "What is the CTA and the channel?"));
  }

  if (task === "study") {
    if (!features.hasAudience)
      qs.push(t(lang, "¿Cuál es el nivel del estudiante?", "What is the learner's level?"));
    if (!features.hasOutputFormat)
      qs.push(
        t(lang, "¿Querés explicación, ejemplos, ejercicios o todo junto?", "Do you want explanation, examples, exercises, or all of them?")
      );
  }

  if (purpose === "image") {
    if (!features.hasInputs)
      qs.push(t(lang, "¿Qué sujeto, estilo y composición buscás?", "What subject, style, and composition are you after?"));
    if (!features.hasConstraints)
      qs.push(t(lang, "¿Relación de aspecto y elementos a evitar?", "Aspect ratio and elements to avoid?"));
  }

  if (qs.length < 3) {
    if (!features.hasGoal)
      qs.push(t(lang, "¿Cuál es el objetivo concreto en una frase?", "What is the concrete goal in one sentence?"));
    if (!features.hasOutputFormat && task !== "image")
      qs.push(
        t(lang, "¿En qué formato querés la respuesta (lista, JSON, tabla)?", "In what format do you want the answer (list, JSON, table)?")
      );
  }

  return Array.from(new Set(qs)).slice(0, 5);
}

function pickQuickWins(features: Features, recommendations: Recommendation[], lang: Lang): string[] {
  const fromRecs = recommendations
    .filter((r) => r.impact !== "low")
    .map((r) => `${r.title}: ${r.detail}`)
    .slice(0, 3);

  if (fromRecs.length > 0) return fromRecs;

  const fallback: string[] = [];
  if (!features.hasOutputFormat)
    fallback.push(t(lang, "Definí el formato de salida en una línea.", "Define the output format in one line."));
  if (!features.hasConstraints)
    fallback.push(t(lang, "Sumá tono, largo y qué evitar.", "Add tone, length, and what to avoid."));
  if (!features.hasInputs)
    fallback.push(
      t(lang, "Pegá el material fuente o adjuntalo como archivo.", "Paste the source material or attach it as a file.")
    );

  return fallback.slice(0, 3);
}

function pickMissingInformation(findings: Finding[]): string[] {
  return findings
    .filter((f) => f.severity !== "low" && /missing/i.test(f.id))
    .map((f) => `${f.title}. ${f.fix}`)
    .slice(0, 3);
}

function pickCriticalIssues(findings: Finding[]): string[] {
  return findings
    .filter((f) => f.severity === "high" && !/missing/i.test(f.id))
    .map((f) => `${f.title}. ${f.description}`)
    .slice(0, 3);
}

export function buildFeedbackBlock(args: {
  taskType: TaskType;
  purpose: PromptPurpose;
  target: TargetAI;
  features: Features;
  findings: Finding[];
  recommendations: Recommendation[];
  lang: Lang;
  modelId?: string | null;
}): FeedbackBlock {
  const { taskType, purpose, target, features, findings, recommendations, lang, modelId } = args;

  return {
    scoreCriteria: criteriaFor(taskType),
    strengths: pickStrengths(features, taskType, lang),
    criticalIssues: pickCriticalIssues(findings),
    quickWins: pickQuickWins(features, recommendations, lang),
    missingInformation: pickMissingInformation(findings),
    followUpQuestions: pickFollowUps(features, taskType, purpose, lang),
    modelNotes: modelNoteForTarget(target, lang, modelId),
  };
}
