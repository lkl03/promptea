// lib/promptTemplates.ts
export type Lang = "es" | "en";
export type TargetAI = "gpt" | "gemini" | "grok" | "claude" | "kimi" | "deepseek";

export type TaskType =
  | "coding"
  | "debugging"
  | "refactor"
  | "research"
  | "marketing"
  | "writing"
  | "summarization"
  | "translation"
  | "data_extraction"
  | "planning"
  | "customer_support"
  | "general";

export type OutputPreset = {
  title: string; // label en UI/opt prompt
  lines: string[];
};

export function modelLabel(target: TargetAI) {
  switch (target) {
    case "gpt":
      return "GPT";
    case "gemini":
      return "Gemini";
    case "grok":
      return "Grok";
    case "claude":
      return "Claude";
    case "kimi":
      return "Kimi";
    case "deepseek":
      return "Deepseek";
  }
}

export function languageLine(lang: Lang) {
  return lang === "es"
    ? "Respondé exclusivamente en español (mismo idioma que esta interfaz)."
    : "Answer exclusively in English (same language as this interface).";
}

export function askQuestionsLine(lang: Lang) {
  return lang === "es"
    ? "Si te falta información para responder bien, haceme hasta 3 preguntas puntuales antes de responder (sin suponer)."
    : "If you lack information to answer well, ask up to 3 precise questions before answering (no guessing).";
}

export function outputPreset(task: TaskType, lang: Lang): OutputPreset {
  const es = lang === "es";
  const title = es ? "OUTPUT FORMAT" : "OUTPUT FORMAT";

  switch (task) {
    case "coding":
      return {
        title,
        lines: es
          ? ["- Explicación breve", "- Solución (código)", "- Casos borde", "- Tests mínimos", "- Cómo ejecutar"]
          : ["- Brief explanation", "- Solution (code)", "- Edge cases", "- Minimal tests", "- How to run"],
      };

    case "debugging":
      return {
        title,
        lines: es
          ? ["- Diagnóstico", "- Causa probable", "- Fix paso a paso", "- Validación / tests", "- Prevención"]
          : ["- Diagnosis", "- Likely cause", "- Step-by-step fix", "- Validation / tests", "- Prevention"],
      };

    case "refactor":
      return {
        title,
        lines: es
          ? ["- Objetivo del refactor", "- Cambios propuestos", "- Código final", "- Riesgos", "- Tests"]
          : ["- Refactor goal", "- Proposed changes", "- Final code", "- Risks", "- Tests"],
      };

    case "research":
      return {
        title,
        lines: es
          ? ["- Resumen ejecutivo", "- Hallazgos clave", "- Supuestos", "- Fuentes", "- Próximos pasos"]
          : ["- Executive summary", "- Key findings", "- Assumptions", "- Sources", "- Next steps"],
      };

    case "marketing":
      return {
        title,
        lines: es
          ? ["- 3 versiones (corta / media / larga)", "- Tono de marca", "- CTA", "- Variantes A/B"]
          : ["- 3 versions (short / medium / long)", "- Brand voice", "- CTA", "- A/B variants"],
      };

    case "summarization":
      return {
        title,
        lines: es
          ? ["- Resumen en 5 viñetas", "- 3 ideas clave", "- Dudas / faltantes", "- Próximos pasos"]
          : ["- 5-bullet summary", "- 3 key ideas", "- Missing info / questions", "- Next steps"],
      };

    case "translation":
      return {
        title,
        lines: es
          ? ["- Traducción", "- Alternativa más formal", "- Alternativa más natural", "- Notas de contexto"]
          : ["- Translation", "- More formal alternative", "- More natural alternative", "- Context notes"],
      };

    case "data_extraction":
      return {
        title,
        lines: es
          ? ["- JSON estricto", "- Campos requeridos", "- Faltantes como null", "- Validación de formato"]
          : ["- Strict JSON", "- Required fields", "- Missing values as null", "- Format validation"],
      };

    case "planning":
      return {
        title,
        lines: es
          ? ["- Objetivo", "- Plan por pasos", "- Checklist", "- Riesgos", "- Próximas acciones"]
          : ["- Goal", "- Step-by-step plan", "- Checklist", "- Risks", "- Next actions"],
      };

    default:
      return {
        title,
        lines: es ? ["- Respuesta en viñetas", "- Resumen final", "- Próximos pasos"] : ["- Bullet answer", "- Final summary", "- Next steps"],
      };
  }
}

export function targetTip(target: TargetAI, lang: Lang) {
  const es = lang === "es";
  switch (target) {
    case "claude":
      return es
        ? "Claude suele responder mejor con secciones muy claras (incluso con tags tipo XML)."
        : "Claude often does best with very clear sections (even XML-like tags).";
    case "gemini":
      return es
        ? "Gemini mejora mucho si le das ejemplos y le pedís que marque supuestos."
        : "Gemini improves a lot with examples and explicit assumptions.";
    case "deepseek":
      return es
        ? "Deepseek suele rendir muy bien en código si pedís tests y casos borde."
        : "Deepseek excels for code if you request tests and edge cases.";
    case "kimi":
      return es
        ? "Kimi maneja bien contexto largo: separalo en bloques y marcá prioridades."
        : "Kimi handles long context well: split into blocks and mark priorities.";
    case "grok":
      return es
        ? "Grok funciona mejor si definís el tono y cuán directo querés que sea."
        : "Grok works best if you define tone and how direct you want it.";
    default:
      return es
        ? "GPT mejora si separás objetivo, contexto y formato en secciones cortas."
        : "GPT improves if you separate goal, context, and output format into short sections.";
  }
}

