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
import { PUNCT } from "@/lib/domain";

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

function t(lang: Lang, es: string, en: string, pt: string, zh: string = en) {
  // v1.8.7: zh is optional while the Chinese text is written; it falls back to English (zh === en marks it untranslated).
  return { es, en, pt, zh }[lang];
}

const CRITERIA_BY_TASK: Record<string, ScoreCriterion[]> = {
  coding: [
    { key: "context", label: { es: "Contexto del repo y del stack", en: "Repo and stack context", pt: "Contexto do repositório e da stack", zh: "代码库与技术栈上下文" } },
    { key: "boundaries", label: { es: "Límites de la tarea", en: "Task boundaries", pt: "Limites da tarefa", zh: "任务边界" } },
    { key: "acceptance", label: { es: "Criterios de aceptación", en: "Acceptance criteria", pt: "Critérios de aceitação", zh: "验收标准" } },
    { key: "tests", label: { es: "Tests / cómo validar", en: "Tests / how to validate", pt: "Testes / como validar", zh: "测试/验证方式" } },
    { key: "format", label: { es: "Formato del entregable", en: "Output format", pt: "Formato de saída", zh: "输出格式" } },
  ],
  debugging: [
    { key: "error", label: { es: "Mensaje de error completo", en: "Full error message", pt: "Mensagem de erro completa", zh: "完整的错误信息" } },
    { key: "repro", label: { es: "Pasos para reproducir", en: "Reproduction steps", pt: "Passos para reproduzir", zh: "复现步骤" } },
    { key: "env", label: { es: "Entorno y versiones", en: "Environment and versions", pt: "Ambiente e versões", zh: "环境与版本" } },
    { key: "expected", label: { es: "Comportamiento esperado", en: "Expected behavior", pt: "Comportamento esperado", zh: "预期行为" } },
  ],
  refactor: [
    { key: "scope", label: { es: "Alcance del refactor", en: "Refactor scope", pt: "Escopo da refatoração", zh: "重构范围" } },
    { key: "invariants", label: { es: "Invariantes que mantener", en: "Invariants to preserve", pt: "Invariantes a preservar", zh: "需要保持的不变量" } },
    { key: "tradeoffs", label: { es: "Trade-offs aceptables", en: "Acceptable trade-offs", pt: "Trade-offs aceitáveis", zh: "可接受的取舍" } },
    { key: "tests", label: { es: "Tests / cobertura", en: "Tests / coverage", pt: "Testes / cobertura", zh: "测试/覆盖率" } },
  ],
  data_extraction: [
    { key: "schema", label: { es: "Esquema y tipos", en: "Schema and types", pt: "Esquema e tipos", zh: "数据结构与类型" } },
    { key: "validation", label: { es: "Reglas de validación", en: "Validation rules", pt: "Regras de validação", zh: "校验规则" } },
    { key: "examples", label: { es: "Ejemplos input/output", en: "Input/output examples", pt: "Exemplos de entrada/saída", zh: "输入/输出示例" } },
    { key: "missing", label: { es: "Política para faltantes", en: "Missing-value policy", pt: "Política para valores ausentes", zh: "缺失值处理规则" } },
  ],
  marketing: [
    { key: "audience", label: { es: "Audiencia", en: "Audience", pt: "Público", zh: "受众" } },
    { key: "tone", label: { es: "Tono y voz de marca", en: "Tone and brand voice", pt: "Tom e voz da marca", zh: "语气与品牌调性" } },
    { key: "channel", label: { es: "Canal y formato", en: "Channel and format", pt: "Canal e formato", zh: "渠道与形式" } },
    { key: "cta", label: { es: "CTA", en: "Call to action", pt: "Chamada para ação", zh: "行动号召" } },
    { key: "differentiator", label: { es: "Propuesta de valor", en: "Differentiator", pt: "Diferencial", zh: "差异化卖点" } },
  ],
  study: [
    { key: "level", label: { es: "Nivel del usuario", en: "Learner level", pt: "Nível de quem estuda", zh: "学习者水平" } },
    { key: "objective", label: { es: "Objetivo de aprendizaje", en: "Learning objective", pt: "Objetivo de aprendizagem", zh: "学习目标" } },
    { key: "examples", label: { es: "Ejemplos / práctica", en: "Examples / practice", pt: "Exemplos / prática", zh: "示例/练习" } },
    { key: "format", label: { es: "Formato y feedback", en: "Format and feedback style", pt: "Formato e estilo do feedback", zh: "格式与反馈方式" } },
  ],
  image: [
    { key: "subject", label: { es: "Sujeto", en: "Subject", pt: "Sujeito", zh: "主体" } },
    { key: "style", label: { es: "Estilo", en: "Style", pt: "Estilo", zh: "风格" } },
    { key: "composition", label: { es: "Composición", en: "Composition", pt: "Composição", zh: "构图" } },
    { key: "lighting", label: { es: "Iluminación", en: "Lighting", pt: "Iluminação", zh: "光线" } },
    { key: "aspect", label: { es: "Relación de aspecto / negativos", en: "Aspect ratio / negatives", pt: "Proporção / negativos", zh: "宽高比/负面提示" } },
  ],
  research: [
    { key: "scope", label: { es: "Alcance", en: "Scope", pt: "Escopo", zh: "范围" } },
    { key: "sources", label: { es: "Fuentes / período", en: "Sources / time period", pt: "Fontes / período", zh: "来源/时间范围" } },
    { key: "format", label: { es: "Formato del entregable", en: "Output format", pt: "Formato de saída", zh: "输出格式" } },
    { key: "criteria", label: { es: "Criterios de calidad", en: "Quality criteria", pt: "Critérios de qualidade", zh: "质量标准" } },
  ],
  text: [
    { key: "goal", label: { es: "Objetivo claro", en: "Clear goal", pt: "Objetivo claro", zh: "明确的目标" } },
    { key: "context", label: { es: "Contexto mínimo", en: "Minimal context", pt: "Contexto mínimo", zh: "必要的背景" } },
    { key: "format", label: { es: "Formato de salida", en: "Output format", pt: "Formato de saída", zh: "输出格式" } },
    { key: "constraints", label: { es: "Tono / largo / restricciones", en: "Tone / length / constraints", pt: "Tom / tamanho / restrições", zh: "语气/篇幅/约束" } },
  ],
};

function criteriaFor(task: TaskType): ScoreCriterion[] {
  return CRITERIA_BY_TASK[task] ?? CRITERIA_BY_TASK.text;
}

function pickStrengths(features: Features, task: TaskType, lang: Lang): string[] {
  const out: string[] = [];

  if (features.hasGoal) out.push(t(lang, "El objetivo está explícito.", "The goal is explicit.", "O objetivo está explícito.", "目标很明确。"));
  if (features.hasOutputFormat)
    out.push(t(lang, "Pedís un formato de salida concreto.", "You request a concrete output format.", "Você pede um formato de saída concreto.", "你要求了具体的输出格式。"));
  if (features.hasInputs)
    out.push(
      t(
        lang,
        "Aportás material de entrada (texto, datos o código).",
        "You provide source material (text, data, or code).",
        "Você fornece o material-fonte (texto, dados ou código).",
        "你提供了源材料（文本、数据或代码）。"
      )
    );
  if (features.hasExamples) out.push(t(lang, "Incluís ejemplos.", "You include examples.", "Você inclui exemplos.", "你提供了示例。"));
  if (features.hasConstraints) out.push(t(lang, "Tenés restricciones definidas.", "Constraints are defined.", "As restrições estão definidas.", "约束条件已经明确。"));
  if (features.hasErrorDetails && (task === "debugging" || task === "coding"))
    out.push(t(lang, "Incluís el detalle del error.", "Error details are included.", "Os detalhes do erro estão incluídos.", "附上了错误详情。"));
  if (features.hasReproSteps && task === "debugging")
    out.push(t(lang, "Hay pasos para reproducir.", "Reproduction steps are present.", "Os passos para reproduzir estão presentes.", "提供了复现步骤。"));

  return out.slice(0, 3);
}

function pickFollowUps(features: Features, task: TaskType, purpose: PromptPurpose, lang: Lang): string[] {
  const qs: string[] = [];

  if (task === "coding" || task === "refactor") {
    if (!features.hasInputs)
      qs.push(t(lang, "¿Podés pegar el código o un repo de referencia?", "Can you paste the code or link a reference repo?", "Você pode colar o código ou indicar um repositório de referência?", "你能粘贴代码，或给出参考代码库的链接吗？"));
    if (!features.hasOutputFormat)
      qs.push(
        t(lang, "¿Querés diff, función completa o instrucciones paso a paso?", "Do you want a diff, a full function, or step-by-step instructions?", "Você quer um diff, uma função completa ou instruções passo a passo?", "你想要diff、完整的函数，还是分步说明？")
      );
    if (!features.hasSuccessCriteria)
      qs.push(
        t(lang, "¿Cuáles son los criterios de aceptación o tests?", "What are the acceptance criteria or required tests?", "Quais são os critérios de aceitação ou os testes obrigatórios?", "验收标准或必须通过的测试是什么？")
      );
  }

  if (task === "debugging") {
    if (!features.hasErrorDetails)
      qs.push(t(lang, "¿Podés pegar el error o stacktrace exacto?", "Can you paste the exact error or stacktrace?", "Você pode colar o erro exato ou o stack trace?", "你能粘贴原始的报错信息或stack trace吗？"));
    if (!features.hasReproSteps)
      qs.push(t(lang, "¿Cuáles son los pasos para reproducir el bug?", "What are the steps to reproduce the bug?", "Quais são os passos para reproduzir o bug?", "复现这个bug的步骤是什么？"));
  }

  if (task === "data_extraction") {
    if (!features.hasOutputFormat)
      qs.push(t(lang, "¿Cuál es el schema esperado (campos y tipos)?", "What is the expected schema (fields and types)?", "Qual é o esquema esperado (campos e tipos)?", "预期的数据结构是什么（字段和类型）？"));
    if (!features.hasInputs)
      qs.push(t(lang, "¿Cuál es la fuente de datos a procesar?", "What is the source data to process?", "Quais são os dados de origem a processar?", "要处理的源数据是什么？"));
  }

  if (task === "marketing") {
    if (!features.hasAudience)
      qs.push(t(lang, "¿Quién es la audiencia objetivo?", "Who is the target audience?", "Qual é o público-alvo?", "目标受众是谁？"));
    if (!features.hasTone)
      qs.push(t(lang, "¿Qué tono querés (formal, casual, energético)?", "What tone (formal, casual, energetic)?", "Que tom (formal, casual, enérgico)?", "想要什么语气（正式、随意、充满活力）？"));
    if (!features.hasConstraints)
      qs.push(t(lang, "¿Cuál es el CTA y el canal?", "What is the CTA and the channel?", "Qual é o CTA e qual é o canal?", "CTA和发布渠道分别是什么？"));
  }

  if (task === "study") {
    if (!features.hasAudience)
      qs.push(t(lang, "¿Cuál es el nivel del estudiante?", "What is the learner's level?", "Qual é o nível de quem vai estudar?", "学习者是什么水平？"));
    if (!features.hasOutputFormat)
      qs.push(
        t(lang, "¿Querés explicación, ejemplos, ejercicios o todo junto?", "Do you want explanation, examples, exercises, or all of them?", "Você quer explicação, exemplos, exercícios ou tudo isso?", "你想要讲解、示例、练习，还是全都要？")
      );
  }

  if (purpose === "image") {
    if (!features.hasInputs)
      qs.push(t(lang, "¿Qué sujeto, estilo y composición buscás?", "What subject, style, and composition are you after?", "Que sujeito, estilo e composição você procura?", "你想要什么样的主体、风格和构图？"));
    if (!features.hasConstraints)
      qs.push(t(lang, "¿Relación de aspecto y elementos a evitar?", "Aspect ratio and elements to avoid?", "Qual a proporção e que elementos evitar?", "宽高比是多少？要避免哪些元素？"));
  }

  if (qs.length < 3) {
    if (!features.hasGoal)
      qs.push(t(lang, "¿Cuál es el objetivo concreto en una frase?", "What is the concrete goal in one sentence?", "Qual é o objetivo concreto em uma frase?", "用一句话说，具体目标是什么？"));
    if (!features.hasOutputFormat && task !== "image")
      qs.push(
        t(lang, "¿En qué formato querés la respuesta (lista, JSON, tabla)?", "In what format do you want the answer (list, JSON, table)?", "Em que formato você quer a resposta (lista, JSON, tabela)?", "你希望回答用什么格式（列表、JSON、表格）？")
      );
  }

  return Array.from(new Set(qs)).slice(0, 5);
}

function pickQuickWins(features: Features, recommendations: Recommendation[], lang: Lang): string[] {
  const fromRecs = recommendations
    .filter((r) => r.impact !== "low")
    .map((r) => `${r.title}${PUNCT[lang].colon}${r.detail}`)
    .slice(0, 3);

  if (fromRecs.length > 0) return fromRecs;

  const fallback: string[] = [];
  if (!features.hasOutputFormat)
    fallback.push(t(lang, "Definí el formato de salida en una línea.", "Define the output format in one line.", "Defina o formato de saída em uma linha.", "用一行写清输出格式。"));
  if (!features.hasConstraints)
    fallback.push(t(lang, "Sumá tono, largo y qué evitar.", "Add tone, length, and what to avoid.", "Adicione tom, tamanho e o que evitar.", "补充语气、篇幅和需要避免的内容。"));
  if (!features.hasInputs)
    fallback.push(
      t(lang, "Pegá el material fuente o adjuntalo como archivo.", "Paste the source material or attach it as a file.", "Cole o material-fonte ou anexe-o como arquivo.", "粘贴源材料，或作为文件附上。")
    );

  return fallback.slice(0, 3);
}

function pickMissingInformation(findings: Finding[], lang: Lang): string[] {
  return findings
    .filter((f) => f.severity !== "low" && /missing/i.test(f.id))
    .map((f) => `${f.title}${PUNCT[lang].stop}${f.fix}`)
    .slice(0, 3);
}

function pickCriticalIssues(findings: Finding[], lang: Lang): string[] {
  return findings
    .filter((f) => f.severity === "high" && !/missing/i.test(f.id))
    .map((f) => `${f.title}${PUNCT[lang].stop}${f.description}`)
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
    criticalIssues: pickCriticalIssues(findings, lang),
    quickWins: pickQuickWins(features, recommendations, lang),
    missingInformation: pickMissingInformation(findings, lang),
    followUpQuestions: pickFollowUps(features, taskType, purpose, lang),
    modelNotes: modelNoteForTarget(target, lang, modelId),
  };
}
