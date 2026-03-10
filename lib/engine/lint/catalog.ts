import type { Lang, FindingId, RecommendationId } from "./types";

export function findingText(id: FindingId, lang: Lang) {
  const es: Record<FindingId, { title: string; description: string; fix: string }> = {
    too_short: {
      title: "Prompt demasiado corto",
      description: "Con poca información, la IA tiende a completar con suposiciones y baja la precisión.",
      fix: "Sumá objetivo + un poco de contexto + el formato de salida esperado.",
    },
    missing_goal: {
      title: "Falta el objetivo",
      description: "No queda claro qué querés lograr con este pedido.",
      fix: "Escribí el objetivo en una frase clara.",
    },
    missing_context: {
      title: "Falta contexto",
      description: "No queda claro el escenario, qué información hay disponible o para qué lo necesitás.",
      fix: "Agregá contexto mínimo, uso esperado y datos disponibles.",
    },
    missing_input_data: {
      title: "Faltan datos de entrada",
      description: "No está el texto, datos, logs o código con lo que la IA debe trabajar.",
      fix: "Pegá el contenido a analizar o adjuntá el material fuente.",
    },
    missing_output_format: {
      title: "No definiste el formato de salida",
      description: "Sin formato, la IA decide sola cómo responder y puede no coincidir con lo que necesitabas.",
      fix: "Pedí un formato concreto: viñetas, párrafo, secciones, tabla o JSON.",
    },
    missing_constraints: {
      title: "Faltan restricciones",
      description: "Sin límites de tono, largo o foco, las respuestas varían demasiado.",
      fix: "Indicá tono, largo, foco y qué evitar.",
    },
    contradiction: {
      title: "Hay instrucciones contradictorias",
      description: "El prompt pide cosas incompatibles entre sí.",
      fix: "Elegí una prioridad clara y ajustá el resto.",
    },
    prompt_injection: {
      title: "Posible prompt injection",
      description: "Hay instrucciones para ignorar reglas o revelar información interna del modelo.",
      fix: "Eliminá esas frases y expresá el pedido de forma directa.",
    },
    missing_repro_steps: {
      title: "Faltan pasos para reproducir",
      description: "Sin pasos concretos, es difícil diagnosticar problemas técnicos.",
      fix: "Agregá pasos numerados para reproducir el error.",
    },
    missing_error_message: {
      title: "Falta el mensaje de error",
      description: "Sin error exacto, stacktrace o logs, el diagnóstico pierde mucha precisión.",
      fix: "Pegá el error completo y logs relevantes.",
    },
    missing_environment: {
      title: "Falta el entorno",
      description: "Versiones, framework u OS pueden cambiar la solución.",
      fix: "Indicá versiones, OS y configuración relevante.",
    },
    missing_schema: {
      title: "Falta un esquema",
      description: "Pedís extracción o JSON, pero no están definidos los campos.",
      fix: "Definí campos, tipos y un ejemplo corto de salida.",
    },
    missing_summary_scope: {
      title: "Falta el foco del resumen",
      description: "No queda claro qué querés priorizar dentro del material.",
      fix: "Aclarà si querés resumen general, por secciones, por temas o enfocado en ciertos hallazgos.",
    },
    missing_summary_length: {
      title: "Falta definir el largo del resumen",
      description: "No se indica cuán corto o detallado debería ser el resumen final.",
      fix: "Definí largo: 3 bullets, 1 párrafo, resumen corto, etc.",
    },
    missing_translation_target: {
      title: "Falta el idioma destino",
      description: "No se especifica a qué idioma hay que traducir.",
      fix: "Indicá el idioma objetivo de forma explícita.",
    },
    missing_translation_register: {
      title: "Falta el registro de traducción",
      description: "No queda claro si querés una versión literal, natural, formal o neutra.",
      fix: "Definí el registro o el grado de literalidad.",
    },
    missing_study_level: {
      title: "Falta el nivel del usuario",
      description: "No se sabe para qué nivel hay que explicar el tema.",
      fix: "Indicá nivel: básico, secundario, universitario, técnico, etc.",
    },
    missing_marketing_audience: {
      title: "Falta la audiencia",
      description: "No queda claro para quién está pensado el copy.",
      fix: "Definí a quién apunta el mensaje.",
    },
    missing_marketing_cta: {
      title: "Falta el CTA",
      description: "No se indica qué acción debería provocar el copy.",
      fix: "Aclarà la acción final esperada: comprar, registrarse, responder, etc.",
    },
  };

  const en: Record<FindingId, { title: string; description: string; fix: string }> = {
    too_short: {
      title: "Prompt is too short",
      description: "With very little information, the model tends to guess.",
      fix: "Add a goal, minimal context, and an output format.",
    },
    missing_goal: {
      title: "Missing goal",
      description: "It is not clear what outcome you want.",
      fix: "State the goal in one clear sentence.",
    },
    missing_context: {
      title: "Missing context",
      description: "The scenario, intended use, or available information is unclear.",
      fix: "Add minimal context, intended use, and available information.",
    },
    missing_input_data: {
      title: "Missing input data",
      description: "The text, data, logs, or code the model must work on are missing.",
      fix: "Paste the content or attach the source material.",
    },
    missing_output_format: {
      title: "Missing output format",
      description: "Without a format, the model decides on its own and may not match your needs.",
      fix: "Request a concrete format: bullets, paragraph, sections, table, or JSON.",
    },
    missing_constraints: {
      title: "Missing constraints",
      description: "Without tone, length, or focus limits, answers vary too much.",
      fix: "Specify tone, length, focus, and what to avoid.",
    },
    contradiction: {
      title: "Contradictory instructions",
      description: "The prompt asks for incompatible things.",
      fix: "Choose a clear priority and adjust the rest.",
    },
    prompt_injection: {
      title: "Possible prompt injection",
      description: "The prompt includes instructions to bypass rules or reveal hidden system content.",
      fix: "Remove those phrases and restate the request directly.",
    },
    missing_repro_steps: {
      title: "Missing reproduction steps",
      description: "Without clear steps, it is hard to diagnose technical issues.",
      fix: "Add numbered steps to reproduce the issue.",
    },
    missing_error_message: {
      title: "Missing error message",
      description: "Without the exact error or logs, diagnosis becomes unreliable.",
      fix: "Paste the full error and relevant logs.",
    },
    missing_environment: {
      title: "Missing environment",
      description: "Versions, framework, or OS can change the solution.",
      fix: "Include versions, OS, and relevant configuration.",
    },
    missing_schema: {
      title: "Missing schema",
      description: "You ask for extraction or JSON, but the expected fields are not defined.",
      fix: "Define fields, types, and a short output example.",
    },
    missing_summary_scope: {
      title: "Missing summary focus",
      description: "It is unclear what should be prioritized in the source material.",
      fix: "Say whether you want a general summary, section-based summary, topic-based summary, or a specific focus.",
    },
    missing_summary_length: {
      title: "Missing summary length",
      description: "The prompt does not say how short or detailed the final summary should be.",
      fix: "Define the length: 3 bullets, 1 paragraph, short summary, etc.",
    },
    missing_translation_target: {
      title: "Missing target language",
      description: "The destination language is not specified.",
      fix: "State the target language explicitly.",
    },
    missing_translation_register: {
      title: "Missing translation register",
      description: "It is unclear whether you want a literal, natural, formal, or neutral version.",
      fix: "Define the register or level of literalness.",
    },
    missing_study_level: {
      title: "Missing learner level",
      description: "It is unclear what knowledge level the explanation should target.",
      fix: "Specify the level: basic, high school, university, technical, etc.",
    },
    missing_marketing_audience: {
      title: "Missing audience",
      description: "It is not clear who the copy is for.",
      fix: "Define the target audience explicitly.",
    },
    missing_marketing_cta: {
      title: "Missing CTA",
      description: "The desired action after reading the copy is unclear.",
      fix: "State the intended call to action clearly.",
    },
  };

  return lang === "es" ? es[id] : en[id];
}

export function recoText(id: RecommendationId, lang: Lang) {
  const es: Record<RecommendationId, { title: string; detail: string }> = {
    add_goal: { title: "Definí el objetivo", detail: "Decí qué resultado querés lograr en una frase clara." },
    add_context: { title: "Agregá contexto mínimo", detail: "Incluí escenario, info disponible y uso esperado." },
    add_input_data: { title: "Sumá material fuente", detail: "Pegá el texto, datos, logs o archivo que la IA debe usar." },
    define_output_format: { title: "Definí el formato de salida", detail: "Pedí viñetas, párrafo, tabla, pasos o JSON." },
    add_constraints: { title: "Sumá restricciones", detail: "Indicá tono, largo, foco y qué evitar." },
    add_success_criteria: { title: "Agregá criterios de éxito", detail: "Decí qué debe incluir una buena respuesta." },
    add_examples: { title: "Sumá un ejemplo", detail: "Un ejemplo de entrada/salida reduce ambigüedad." },
    add_schema: { title: "Definí campos y tipos", detail: "Para extracción o JSON: campos, tipos y ejemplo." },
    add_repro_steps: { title: "Agregá pasos para reproducir", detail: "Checklist numerado para reproducir el error." },
    add_error_message: { title: "Pegá el error completo", detail: "Stacktrace o logs exactos y contexto." },
    add_environment: { title: "Indicá el entorno", detail: "Framework, runtime, OS y versiones relevantes." },
    define_summary_scope: { title: "Definí el foco del resumen", detail: "Aclarà qué parte del contenido querés priorizar." },
    define_summary_length: { title: "Definí el largo del resumen", detail: "Ejemplo: 3 bullets, 1 párrafo, resumen corto." },
    define_translation_target: { title: "Definí el idioma destino", detail: "Indicá a qué idioma querés traducir." },
    define_translation_register: { title: "Definí el registro", detail: "Aclarà si querés traducción literal, natural, formal o neutra." },
    define_study_level: { title: "Definí el nivel", detail: "Indicá si es para principiante, secundario, universidad, etc." },
    define_marketing_audience: { title: "Definí la audiencia", detail: "Indicá para quién está pensado el copy." },
    define_marketing_cta: { title: "Definí el CTA", detail: "Aclarà qué acción querés provocar con el mensaje." },
  };

  const en: Record<RecommendationId, { title: string; detail: string }> = {
    add_goal: { title: "State the goal", detail: "Say what outcome you want in one clear sentence." },
    add_context: { title: "Add minimal context", detail: "Include scenario, available info, and intended use." },
    add_input_data: { title: "Add source material", detail: "Paste the text, data, logs, or file the model must use." },
    define_output_format: { title: "Define the output format", detail: "Ask for bullets, paragraph, table, steps, or JSON." },
    add_constraints: { title: "Add constraints", detail: "Specify tone, length, focus, and what to avoid." },
    add_success_criteria: { title: "Add success criteria", detail: "State what a good answer must include." },
    add_examples: { title: "Add an example", detail: "An input/output example reduces ambiguity." },
    add_schema: { title: "Define fields and types", detail: "For extraction or JSON: define fields, types, and an example." },
    add_repro_steps: { title: "Add reproduction steps", detail: "Provide numbered steps to reproduce the issue." },
    add_error_message: { title: "Paste the full error", detail: "Exact logs or stacktrace and the execution context." },
    add_environment: { title: "Specify the environment", detail: "Framework, runtime, OS, and relevant versions." },
    define_summary_scope: { title: "Define the summary focus", detail: "State which part of the content should be prioritized." },
    define_summary_length: { title: "Define the summary length", detail: "Example: 3 bullets, 1 paragraph, short summary." },
    define_translation_target: { title: "Define the target language", detail: "State the destination language explicitly." },
    define_translation_register: { title: "Define the register", detail: "Say whether you want literal, natural, formal, or neutral translation." },
    define_study_level: { title: "Define the learner level", detail: "Specify beginner, high school, university, etc." },
    define_marketing_audience: { title: "Define the audience", detail: "State who the copy is meant for." },
    define_marketing_cta: { title: "Define the CTA", detail: "Specify the action the message should drive." },
  };

  return lang === "es" ? es[id] : en[id];
}