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
  label: Record<Lang, string>;
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

function t(lang: Lang, es: string, en: string, pt: string) {
  return { es, en, pt }[lang];
}

const CRITERIA_BY_TASK: Record<string, ScoreCriterion[]> = {
  coding: [
    { key: "context", label: { es: "Contexto del repo y del stack", en: "Repo and stack context", pt: "Contexto do repositório e da stack" } },
    { key: "boundaries", label: { es: "Límites de la tarea", en: "Task boundaries", pt: "Limites da tarefa" } },
    { key: "acceptance", label: { es: "Criterios de aceptación", en: "Acceptance criteria", pt: "Critérios de aceitação" } },
    { key: "tests", label: { es: "Tests / cómo validar", en: "Tests / how to validate", pt: "Testes / como validar" } },
    { key: "format", label: { es: "Formato del entregable", en: "Output format", pt: "Formato de saída" } },
  ],
  debugging: [
    { key: "error", label: { es: "Mensaje de error completo", en: "Full error message", pt: "Mensagem de erro completa" } },
    { key: "repro", label: { es: "Pasos para reproducir", en: "Reproduction steps", pt: "Passos para reproduzir" } },
    { key: "env", label: { es: "Entorno y versiones", en: "Environment and versions", pt: "Ambiente e versões" } },
    { key: "expected", label: { es: "Comportamiento esperado", en: "Expected behavior", pt: "Comportamento esperado" } },
  ],
  refactor: [
    { key: "scope", label: { es: "Alcance del refactor", en: "Refactor scope", pt: "Escopo da refatoração" } },
    { key: "invariants", label: { es: "Invariantes que mantener", en: "Invariants to preserve", pt: "Invariantes a preservar" } },
    { key: "tradeoffs", label: { es: "Trade-offs aceptables", en: "Acceptable trade-offs", pt: "Trade-offs aceitáveis" } },
    { key: "tests", label: { es: "Tests / cobertura", en: "Tests / coverage", pt: "Testes / cobertura" } },
  ],
  data_extraction: [
    { key: "schema", label: { es: "Esquema y tipos", en: "Schema and types", pt: "Esquema e tipos" } },
    { key: "validation", label: { es: "Reglas de validación", en: "Validation rules", pt: "Regras de validação" } },
    { key: "examples", label: { es: "Ejemplos input/output", en: "Input/output examples", pt: "Exemplos de entrada/saída" } },
    { key: "missing", label: { es: "Política para faltantes", en: "Missing-value policy", pt: "Política para valores ausentes" } },
  ],
  marketing: [
    { key: "audience", label: { es: "Audiencia", en: "Audience", pt: "Público" } },
    { key: "tone", label: { es: "Tono y voz de marca", en: "Tone and brand voice", pt: "Tom e voz da marca" } },
    { key: "channel", label: { es: "Canal y formato", en: "Channel and format", pt: "Canal e formato" } },
    { key: "cta", label: { es: "CTA", en: "Call to action", pt: "Chamada para ação" } },
    { key: "differentiator", label: { es: "Propuesta de valor", en: "Differentiator", pt: "Diferencial" } },
  ],
  study: [
    { key: "level", label: { es: "Nivel del usuario", en: "Learner level", pt: "Nível de quem estuda" } },
    { key: "objective", label: { es: "Objetivo de aprendizaje", en: "Learning objective", pt: "Objetivo de aprendizagem" } },
    { key: "examples", label: { es: "Ejemplos / práctica", en: "Examples / practice", pt: "Exemplos / prática" } },
    { key: "format", label: { es: "Formato y feedback", en: "Format and feedback style", pt: "Formato e estilo do feedback" } },
  ],
  image: [
    { key: "subject", label: { es: "Sujeto", en: "Subject", pt: "Sujeito" } },
    { key: "style", label: { es: "Estilo", en: "Style", pt: "Estilo" } },
    { key: "composition", label: { es: "Composición", en: "Composition", pt: "Composição" } },
    { key: "lighting", label: { es: "Iluminación", en: "Lighting", pt: "Iluminação" } },
    { key: "aspect", label: { es: "Relación de aspecto / negativos", en: "Aspect ratio / negatives", pt: "Proporção / negativos" } },
  ],
  research: [
    { key: "scope", label: { es: "Alcance", en: "Scope", pt: "Escopo" } },
    { key: "sources", label: { es: "Fuentes / período", en: "Sources / time period", pt: "Fontes / período" } },
    { key: "format", label: { es: "Formato del entregable", en: "Output format", pt: "Formato de saída" } },
    { key: "criteria", label: { es: "Criterios de calidad", en: "Quality criteria", pt: "Critérios de qualidade" } },
  ],
  text: [
    { key: "goal", label: { es: "Objetivo claro", en: "Clear goal", pt: "Objetivo claro" } },
    { key: "context", label: { es: "Contexto mínimo", en: "Minimal context", pt: "Contexto mínimo" } },
    { key: "format", label: { es: "Formato de salida", en: "Output format", pt: "Formato de saída" } },
    { key: "constraints", label: { es: "Tono / largo / restricciones", en: "Tone / length / constraints", pt: "Tom / tamanho / restrições" } },
  ],
};

function criteriaFor(task: TaskType): ScoreCriterion[] {
  return CRITERIA_BY_TASK[task] ?? CRITERIA_BY_TASK.text;
}

function pickStrengths(features: Features, task: TaskType, lang: Lang): string[] {
  const out: string[] = [];

  if (features.hasGoal) out.push(t(lang, "El objetivo está explícito.", "The goal is explicit.", "O objetivo está explícito."));
  if (features.hasOutputFormat)
    out.push(t(lang, "Pedís un formato de salida concreto.", "You request a concrete output format.", "Você pede um formato de saída concreto."));
  if (features.hasInputs)
    out.push(
      t(
        lang,
        "Aportás material de entrada (texto, datos o código).",
        "You provide source material (text, data, or code).",
        "Você fornece o material-fonte (texto, dados ou código)."
      )
    );
  if (features.hasExamples) out.push(t(lang, "Incluís ejemplos.", "You include examples.", "Você inclui exemplos."));
  if (features.hasConstraints) out.push(t(lang, "Tenés restricciones definidas.", "Constraints are defined.", "As restrições estão definidas."));
  if (features.hasErrorDetails && (task === "debugging" || task === "coding"))
    out.push(t(lang, "Incluís el detalle del error.", "Error details are included.", "Os detalhes do erro estão incluídos."));
  if (features.hasReproSteps && task === "debugging")
    out.push(t(lang, "Hay pasos para reproducir.", "Reproduction steps are present.", "Os passos para reproduzir estão presentes."));

  return out.slice(0, 3);
}

function pickFollowUps(features: Features, task: TaskType, purpose: PromptPurpose, lang: Lang): string[] {
  const qs: string[] = [];

  if (task === "coding" || task === "refactor") {
    if (!features.hasInputs)
      qs.push(t(lang, "¿Podés pegar el código o un repo de referencia?", "Can you paste the code or link a reference repo?", "Você pode colar o código ou indicar um repositório de referência?"));
    if (!features.hasOutputFormat)
      qs.push(
        t(lang, "¿Querés diff, función completa o instrucciones paso a paso?", "Do you want a diff, a full function, or step-by-step instructions?", "Você quer um diff, uma função completa ou instruções passo a passo?")
      );
    if (!features.hasSuccessCriteria)
      qs.push(
        t(lang, "¿Cuáles son los criterios de aceptación o tests?", "What are the acceptance criteria or required tests?", "Quais são os critérios de aceitação ou os testes obrigatórios?")
      );
  }

  if (task === "debugging") {
    if (!features.hasErrorDetails)
      qs.push(t(lang, "¿Podés pegar el error o stacktrace exacto?", "Can you paste the exact error or stacktrace?", "Você pode colar o erro exato ou o stack trace?"));
    if (!features.hasReproSteps)
      qs.push(t(lang, "¿Cuáles son los pasos para reproducir el bug?", "What are the steps to reproduce the bug?", "Quais são os passos para reproduzir o bug?"));
  }

  if (task === "data_extraction") {
    if (!features.hasOutputFormat)
      qs.push(t(lang, "¿Cuál es el schema esperado (campos y tipos)?", "What is the expected schema (fields and types)?", "Qual é o esquema esperado (campos e tipos)?"));
    if (!features.hasInputs)
      qs.push(t(lang, "¿Cuál es la fuente de datos a procesar?", "What is the source data to process?", "Quais são os dados de origem a processar?"));
  }

  if (task === "marketing") {
    if (!features.hasAudience)
      qs.push(t(lang, "¿Quién es la audiencia objetivo?", "Who is the target audience?", "Qual é o público-alvo?"));
    if (!features.hasTone)
      qs.push(t(lang, "¿Qué tono querés (formal, casual, energético)?", "What tone (formal, casual, energetic)?", "Que tom (formal, casual, enérgico)?"));
    if (!features.hasConstraints)
      qs.push(t(lang, "¿Cuál es el CTA y el canal?", "What is the CTA and the channel?", "Qual é o CTA e qual é o canal?"));
  }

  if (task === "study") {
    if (!features.hasAudience)
      qs.push(t(lang, "¿Cuál es el nivel del estudiante?", "What is the learner's level?", "Qual é o nível de quem vai estudar?"));
    if (!features.hasOutputFormat)
      qs.push(
        t(lang, "¿Querés explicación, ejemplos, ejercicios o todo junto?", "Do you want explanation, examples, exercises, or all of them?", "Você quer explicação, exemplos, exercícios ou tudo isso?")
      );
  }

  if (purpose === "image") {
    if (!features.hasInputs)
      qs.push(t(lang, "¿Qué sujeto, estilo y composición buscás?", "What subject, style, and composition are you after?", "Que sujeito, estilo e composição você procura?"));
    if (!features.hasConstraints)
      qs.push(t(lang, "¿Relación de aspecto y elementos a evitar?", "Aspect ratio and elements to avoid?", "Qual a proporção e que elementos evitar?"));
  }

  if (qs.length < 3) {
    if (!features.hasGoal)
      qs.push(t(lang, "¿Cuál es el objetivo concreto en una frase?", "What is the concrete goal in one sentence?", "Qual é o objetivo concreto em uma frase?"));
    if (!features.hasOutputFormat && task !== "image")
      qs.push(
        t(lang, "¿En qué formato querés la respuesta (lista, JSON, tabla)?", "In what format do you want the answer (list, JSON, table)?", "Em que formato você quer a resposta (lista, JSON, tabela)?")
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
    fallback.push(t(lang, "Definí el formato de salida en una línea.", "Define the output format in one line.", "Defina o formato de saída em uma linha."));
  if (!features.hasConstraints)
    fallback.push(t(lang, "Sumá tono, largo y qué evitar.", "Add tone, length, and what to avoid.", "Adicione tom, tamanho e o que evitar."));
  if (!features.hasInputs)
    fallback.push(
      t(lang, "Pegá el material fuente o adjuntalo como archivo.", "Paste the source material or attach it as a file.", "Cole o material-fonte ou anexe-o como arquivo.")
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
