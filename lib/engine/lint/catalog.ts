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
      fix: "Escribí el objetivo en una frase (qué resultado querés obtener).",
    },
    missing_context: {
      title: "Falta contexto",
      description: "No queda claro el escenario, qué información hay disponible o para qué lo necesitás.",
      fix: "Agregá: contexto mínimo, datos de entrada (si aplica), audiencia/uso y un ejemplo si podés.",
    },
    missing_input_data: {
      title: "Faltan datos de entrada",
      description: "No está el texto/datos/logs/código con lo que la IA debe trabajar.",
      fix: "Pegá el contenido a analizar o describí exactamente los datos de entrada.",
    },
    missing_output_format: {
      title: "No definiste el formato de salida",
      description: "Si no pedís un formato, la IA decide sola cómo responder y puede no coincidir con lo que querías.",
      fix: "Pedí un formato: viñetas / pasos / tabla / JSON (según lo que necesites).",
    },
    missing_constraints: {
      title: "Faltan restricciones",
      description: "Sin límites (tono, largo, qué evitar), las respuestas pueden variar demasiado.",
      fix: "Indicá tono, largo, qué evitar y supuestos permitidos.",
    },
    contradiction: {
      title: "Hay instrucciones contradictorias",
      description: "El prompt pide cosas incompatibles (por ejemplo: 'muy detallado' pero '3 líneas').",
      fix: "Elegí una prioridad (detalle vs brevedad) y ajustá el resto en consecuencia.",
    },
    prompt_injection: {
      title: "Posible prompt injection",
      description: "Hay instrucciones para ignorar reglas o revelar información interna del modelo.",
      fix: "Eliminá esas frases y definí el objetivo y el formato de salida de forma directa.",
    },
    missing_repro_steps: {
      title: "Faltan pasos para reproducir",
      description: "Sin pasos concretos, es difícil diagnosticar problemas técnicos.",
      fix: "Agregá pasos numerados para reproducir el error.",
    },
    missing_error_message: {
      title: "Falta el mensaje de error",
      description: "Sin error exacto (stacktrace/logs), se reduce mucho la precisión del diagnóstico.",
      fix: "Pegá el error completo y cualquier log relevante.",
    },
    missing_environment: {
      title: "Falta el entorno",
      description: "Versiones/OS/framework cambian la solución.",
      fix: "Indicá versiones (framework, runtime, OS) y configuración relevante.",
    },
    missing_schema: {
      title: "Falta un esquema",
      description: "Pedís JSON, pero no están definidos los campos. Eso suele generar una salida inconsistente.",
      fix: "Definí campos + tipos + un ejemplo de salida (JSON/tabla).",
    },
  };

  const en: Record<FindingId, { title: string; description: string; fix: string }> = {
    too_short: {
      title: "Prompt is too short",
      description: "With little information, the model tends to guess, reducing accuracy.",
      fix: "Add a goal + minimal context + an expected output format.",
    },
    missing_goal: {
      title: "Missing goal",
      description: "It’s not clear what outcome you want.",
      fix: "State your goal in one sentence (what you want to achieve).",
    },
    missing_context: {
      title: "Missing context",
      description: "The scenario, what info is available, or intended use is unclear.",
      fix: "Add minimal context, input data (if any), audience/use, and an example if possible.",
    },
    missing_input_data: {
      title: "Missing input data",
      description: "The text/data/logs/code to work with are not provided.",
      fix: "Paste the input content or describe the input precisely.",
    },
    missing_output_format: {
      title: "No output format specified",
      description: "Without a format, the model picks one and it may not match what you need.",
      fix: "Ask for a format: bullets / steps / table / JSON (as needed).",
    },
    missing_constraints: {
      title: "Missing constraints",
      description: "Without limits (tone, length, what to avoid), answers can vary too much.",
      fix: "Specify tone, length, what to avoid, and allowed assumptions.",
    },
    contradiction: {
      title: "Contradictory instructions",
      description: "The prompt asks for incompatible things (e.g., 'very detailed' but '3 lines').",
      fix: "Pick a priority (detail vs brevity) and adjust the rest accordingly.",
    },
    prompt_injection: {
      title: "Possible prompt injection",
      description: "The prompt includes instructions to bypass rules or reveal hidden system content.",
      fix: "Remove those phrases and state your goal/output format directly.",
    },
    missing_repro_steps: {
      title: "Missing reproduction steps",
      description: "Without clear steps, it’s hard to diagnose technical issues.",
      fix: "Add numbered steps to reproduce the issue.",
    },
    missing_error_message: {
      title: "Missing error message",
      description: "Without the exact error/stacktrace/logs, diagnosis becomes unreliable.",
      fix: "Paste the full error and relevant logs.",
    },
    missing_environment: {
      title: "Missing environment",
      description: "Versions/OS/frameworks can change the solution.",
      fix: "Include versions (framework, runtime, OS) and relevant config.",
    },
    missing_schema: {
      title: "Missing schema",
      description: "You request JSON, but fields aren’t defined, which often produces inconsistent output.",
      fix: "Define fields + types + a short output example (JSON/table).",
    },
  };

  return lang === "es" ? es[id] : en[id];
}

export function recoText(id: RecommendationId, lang: Lang) {
  const es: Record<RecommendationId, { title: string; detail: string }> = {
    add_goal: { title: "Definí el objetivo", detail: "Decí qué resultado querés lograr (una frase clara)." },
    add_context: { title: "Agregá contexto mínimo", detail: "Incluí escenario, info disponible y para qué lo necesitás." },
    add_input_data: { title: "Pegá los datos de entrada", detail: "Texto/datos/logs/código con lo que la IA debe trabajar." },
    define_output_format: { title: "Definí el formato de salida", detail: "Pedí viñetas / pasos / tabla / JSON (según lo que necesites)." },
    add_constraints: { title: "Sumá restricciones/límites", detail: "Tono, largo, qué evitar y supuestos permitidos." },
    add_success_criteria: { title: "Agregá criterios de éxito", detail: "Decí cómo sabés que la respuesta es buena (qué debe incluir)." },
    add_examples: { title: "Sumá un ejemplo", detail: "Un ejemplo de entrada/salida reduce ambigüedad y mejora consistencia." },
    add_schema: { title: "Definí campos y tipos", detail: "Para JSON/extracción: campos, tipos y un ejemplo de salida." },
    add_repro_steps: { title: "Agregá pasos para reproducir", detail: "Checklist numerado para reproducir el problema." },
    add_error_message: { title: "Pegá el error completo", detail: "Stacktrace/logs exactos y contexto de cuándo ocurre." },
    add_environment: { title: "Indicá el entorno", detail: "Versiones (framework/runtime), OS y config relevante." },
  };

  const en: Record<RecommendationId, { title: string; detail: string }> = {
    add_goal: { title: "State the goal", detail: "Say what outcome you want (one clear sentence)." },
    add_context: { title: "Add minimal context", detail: "Include scenario, available info, and intended use." },
    add_input_data: { title: "Paste the input", detail: "Text/data/logs/code the model must work with." },
    define_output_format: { title: "Define the output format", detail: "Ask for bullets / steps / table / JSON (as needed)." },
    add_constraints: { title: "Add constraints/limits", detail: "Tone, length, what to avoid, and allowed assumptions." },
    add_success_criteria: { title: "Add success criteria", detail: "Define what a good answer must include." },
    add_examples: { title: "Add an example", detail: "A short input/output example reduces ambiguity and improves consistency." },
    add_schema: { title: "Define fields and types", detail: "For JSON/extraction: define fields, types, and an output example." },
    add_repro_steps: { title: "Add repro steps", detail: "Provide numbered steps to reproduce the issue." },
    add_error_message: { title: "Paste the full error", detail: "Exact stacktrace/logs and when it happens." },
    add_environment: { title: "Include environment", detail: "Versions (framework/runtime), OS, and relevant config." },
  };

  return lang === "es" ? es[id] : en[id];
}
