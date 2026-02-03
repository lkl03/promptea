// lib/engine/builder.ts
import type { Lang, TargetAI } from "../promptTemplates";
import type { TaskType, PromptPurpose } from "./types";

function t(lang: Lang, es: string, en: string) {
  return lang === "es" ? es : en;
}

function isPrompteaOptimized(text: string) {
  return /^PROMPTEA:\s*v/i.test(String(text ?? "").trim());
}

function purposeBlock(purpose: PromptPurpose, lang: Lang) {
  switch (purpose) {
    case "image":
      return t(
        lang,
        [
          "OBJETIVO (IMAGEN): Generar una imagen con descripción clara.",
          "Incluí: sujeto, estilo, composición, iluminación, encuadre, fondo, relación de aspecto.",
          "Si falta info, preguntá hasta 3 cosas antes de asumir.",
        ].join("\n"),
        [
          "GOAL (IMAGE): Generate an image from a clear description.",
          "Include: subject, style, composition, lighting, framing, background, aspect ratio.",
          "If info is missing, ask up to 3 questions before assuming.",
        ].join("\n")
      );

    case "data":
      return t(
        lang,
        [
          "OBJETIVO (DATOS): Extraer/transformar datos con formato estricto.",
          "Si el usuario pide JSON: devolvé SOLO JSON válido, sin texto extra.",
          "Validá tipos, normalizá fechas y no inventes campos.",
        ].join("\n"),
        [
          "GOAL (DATA): Extract/transform data with strict formatting.",
          "If JSON is requested: output ONLY valid JSON, no extra text.",
          "Validate types, normalize dates, and don’t invent fields.",
        ].join("\n")
      );

    case "code":
      return t(
        lang,
        [
          "OBJETIVO (CÓDIGO): Producir código correcto y ejecutable.",
          "Incluí: supuestos explícitos, pasos, edge cases y cómo correrlo/testearlo.",
          "Si falta contexto, preguntá antes de elegir librerías/framework.",
        ].join("\n"),
        [
          "GOAL (CODE): Produce correct, runnable code.",
          "Include: explicit assumptions, steps, edge cases, and how to run/test it.",
          "If context is missing, ask before choosing libraries/frameworks.",
        ].join("\n")
      );

    case "study":
      return t(
        lang,
        [
          "OBJETIVO (ESTUDIO): Explicar para aprender.",
          "Pedí nivel (secundario/universidad), y entregá: resumen + ejemplos + ejercicios cortos.",
          "Si hay ambigüedad, preguntá antes de avanzar.",
        ].join("\n"),
        [
          "GOAL (STUDY): Explain to learn.",
          "Ask for level, then deliver: summary + examples + short exercises.",
          "If ambiguous, ask before continuing.",
        ].join("\n")
      );

    case "marketing":
      return t(
        lang,
        [
          "OBJETIVO (MARKETING): Escribir copy efectivo.",
          "Incluí: audiencia, propuesta de valor, tono, CTA, y 2–3 variantes.",
          "No prometas cosas falsas. Mantenelo consistente con la marca.",
        ].join("\n"),
        [
          "GOAL (MARKETING): Write effective copy.",
          "Include: audience, value prop, tone, CTA, and 2–3 variants.",
          "Don’t promise false claims. Keep it brand-consistent.",
        ].join("\n")
      );

    default:
      return t(
        lang,
        ["OBJETIVO (TEXTO): Responder con claridad y estructura.", "Si falta info clave, hacé hasta 3 preguntas antes de asumir."].join("\n"),
        ["GOAL (TEXT): Respond clearly with structure.", "If key info is missing, ask up to 3 questions before assuming."].join("\n")
      );
  }
}

function targetHints(target: TargetAI, lang: Lang) {
  switch (String(target)) {
    case "claude":
      return t(
        lang,
        "Sugerencia (Claude): usá secciones claras y, si ayuda, etiquetas tipo <context>…</context>.",
        "Tip (Claude): use clear sections and, if helpful, XML-like tags such as <context>…</context>."
      );
    case "gemini":
      return t(
        lang,
        "Sugerencia (Gemini): especificá el formato exacto de salida y ejemplos cortos.",
        "Tip (Gemini): specify an exact output format and short examples."
      );
    case "grok":
      return t(
        lang,
        "Sugerencia (Grok): pedí respuesta directa, con bullets si aplica, y evitá relleno.",
        "Tip (Grok): ask for direct answers, bullets if relevant, avoid fluff."
      );
    case "deepseek":
      return t(
        lang,
        "Sugerencia (Deepseek): definí criterios de corrección y casos borde.",
        "Tip (Deepseek): define correctness criteria and edge cases."
      );
    case "kimi":
      return t(
        lang,
        "Sugerencia (Kimi): marcá el objetivo y el formato final (especialmente si es resumen).",
        "Tip (Kimi): state the goal and final format (especially for summarization)."
      );
    default:
      return t(lang, "Sugerencia: delimitá input y pedí formato de salida explícito.", "Tip: delimit input and request an explicit output format.");
  }
}

export function buildOptimizedPrompt(
  core: string,
  taskType: TaskType | string,
  target: TargetAI,
  lang: Lang,
  purpose: PromptPurpose = "text"
) {
  const trimmed = String(core ?? "").trim();

  // ✅ Idempotencia: si ya es prompt de Promptea, no lo “envolvemos” de nuevo
  if (isPrompteaOptimized(trimmed)) return trimmed;

  const title = "PROMPTEA: v1.0.2";
  const modelLine = `MODEL: ${String(target).toUpperCase()}`;

  const instrHeader = t(lang, "INSTRUCCIONES:", "INSTRUCTIONS:");
  const taskHeader = t(lang, "TASK:", "TASK:");
  const outputHeader = t(lang, "OUTPUT FORMAT:", "OUTPUT FORMAT:");
  const constraintsHeader = t(lang, "RESTRICCIONES:", "CONSTRAINTS:");

  const outputDefaults =
    purpose === "data"
      ? t(
          lang,
          ["- Devolvé SOLO JSON válido.", "- Sin texto extra.", "- Respetá el schema/campos del usuario."].join("\n"),
          ["- Return ONLY valid JSON.", "- No extra text.", "- Follow the user's schema/fields."].join("\n")
        )
      : purpose === "image"
      ? t(
          lang,
          ["- Describí en 6–10 bullets (sujeto/estilo/composición).", "- Incluí relación de aspecto."].join("\n"),
          ["- Describe in 6–10 bullets (subject/style/composition).", "- Include aspect ratio."].join("\n")
        )
      : t(
          lang,
          ["- Respuesta en secciones.", "- Si falta info: 1–3 preguntas primero."].join("\n"),
          ["- Sectioned answer.", "- If info is missing: ask 1–3 questions first."].join("\n")
        );

  const constraintsDefaults = t(
    lang,
    ["- No inventes datos.", "- Si hay ambigüedad, preguntá antes de asumir."].join("\n"),
    ["- Do not invent facts.", "- If ambiguous, ask before assuming."].join("\n")
  );

  const hint = targetHints(target, lang);
  const purposeTxt = purposeBlock(purpose, lang);

  return [
    title,
    modelLine,
    `PURPOSE: ${purpose}`,
    `TASK_TYPE: ${String(taskType)}`,
    "",
    instrHeader,
    `- ${t(lang, "Respondé en el idioma de la interfaz.", "Respond in the UI language.")}`,
    `- ${t(lang, "Sé específico y estructurado.", "Be specific and structured.")}`,
    `- ${t(lang, "Usá delimitadores para el input si aplica.", "Use delimiters for input if relevant.")}`,
    `- ${hint}`,
    "",
    purposeTxt,
    "",
    taskHeader,
    trimmed,
    "",
    outputHeader,
    outputDefaults,
    "",
    constraintsHeader,
    constraintsDefaults,
  ].join("\n");
}


