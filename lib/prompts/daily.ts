// lib/prompts/daily.ts
//
// Deterministic "Prompt of the Day" rotation.
// No database required — index is derived from the date so the same
// prompt is shown to every visitor on the same calendar day.

import type { Locale } from "@/lib/seo/site";
import type { Purpose, TargetModel } from "@/lib/seo/prefill";

export type DailyPrompt = {
  category: "coding" | "marketing" | "study" | "analysis" | "data" | "image" | "business" | "writing";
  purpose: Purpose;
  target: TargetModel;
  title: { es: string; en: string };
  prompt: { es: string; en: string };
};

export const DAILY_PROMPTS: DailyPrompt[] = [
  {
    category: "coding",
    purpose: "code",
    target: "claude",
    title: {
      es: "Refactor con criterios de aceptación",
      en: "Refactor with acceptance criteria",
    },
    prompt: {
      es: `Objetivo: refactorizar la función [nombre] para que sea más legible y testeable, sin cambiar comportamiento.
Contexto: [pegá el código]
Restricciones: TypeScript estricto, sin nuevas dependencias.
Criterios de aceptación:
- mantiene la API pública
- agrega tests unitarios
- pasa lint y tests existentes
Salida: diff con explicación breve.`,
      en: `Goal: refactor the [name] function so it is more readable and testable, without changing behavior.
Context: [paste the code]
Constraints: strict TypeScript, no new dependencies.
Acceptance criteria:
- public API unchanged
- adds unit tests
- passes lint and existing tests
Output: diff with a short explanation.`,
    },
  },
  {
    category: "marketing",
    purpose: "marketing",
    target: "gpt",
    title: {
      es: "Email de lanzamiento con CTA",
      en: "Product launch email with CTA",
    },
    prompt: {
      es: `Objetivo: escribir un email de lanzamiento para [producto] dirigido a [audiencia].
Tono: claro y directo, sin clichés.
Estructura: asunto + apertura + 3 beneficios + CTA + posdata.
Largo: máximo 180 palabras.
CTA: [acción esperada].`,
      en: `Goal: write a launch email for [product] aimed at [audience].
Tone: clear and direct, no clichés.
Structure: subject + opening + 3 benefits + CTA + PS.
Length: up to 180 words.
CTA: [intended action].`,
    },
  },
  {
    category: "study",
    purpose: "study",
    target: "claude",
    title: {
      es: "Plan de estudio en 7 días",
      en: "7-day study plan",
    },
    prompt: {
      es: `Objetivo: armar un plan de 7 días para aprender [tema] desde nivel principiante.
Incluí: objetivos diarios, recursos, ejercicios y un check de comprensión al final del día.
Formato: tabla con columnas Día | Objetivo | Práctica | Check.`,
      en: `Goal: build a 7-day plan to learn [topic] from a beginner level.
Include: daily objectives, resources, exercises, and an end-of-day comprehension check.
Format: table with columns Day | Objective | Practice | Check.`,
    },
  },
  {
    category: "analysis",
    purpose: "text",
    target: "claude",
    title: {
      es: "Análisis ejecutivo de un documento",
      en: "Executive analysis of a document",
    },
    prompt: {
      es: `Objetivo: análisis ejecutivo del documento adjunto.
Devolvé: resumen (4 líneas), 5 hallazgos clave, 3 riesgos, 3 acciones recomendadas.
Si falta evidencia, marcá supuestos en una sección aparte.`,
      en: `Goal: executive analysis of the attached document.
Return: 4-line summary, 5 key findings, 3 risks, 3 recommended actions.
If evidence is missing, list assumptions in a separate section.`,
    },
  },
  {
    category: "data",
    purpose: "data",
    target: "gemini",
    title: {
      es: "Extracción JSON estricta",
      en: "Strict JSON extraction",
    },
    prompt: {
      es: `Devolvé SOLO JSON válido con la forma:
{"items":[{"name":"string","price":"number|null","currency":"string|null"}]}
Texto fuente: """[pegá]"""
Si un valor falta, devolvelo como null. No agregues explicación.`,
      en: `Return ONLY valid JSON with the shape:
{"items":[{"name":"string","price":"number|null","currency":"string|null"}]}
Source text: """[paste]"""
If a value is missing, return null. Do not add explanation.`,
    },
  },
  {
    category: "image",
    purpose: "image",
    target: "gemini",
    title: {
      es: "Prompt de imagen controlado",
      en: "Controlled image prompt",
    },
    prompt: {
      es: `Sujeto: [describí el sujeto].
Estilo: [estilo visual].
Composición: [encuadre y disposición].
Iluminación: [hora del día y dirección de luz].
Cámara: [lente y profundidad de campo].
Aspect ratio: [16:9 / 1:1 / 4:5].
Negativos: [qué evitar].`,
      en: `Subject: [describe the subject].
Style: [visual style].
Composition: [framing and layout].
Lighting: [time of day and light direction].
Camera: [lens and depth of field].
Aspect ratio: [16:9 / 1:1 / 4:5].
Negatives: [what to avoid].`,
    },
  },
  {
    category: "business",
    purpose: "text",
    target: "gpt",
    title: {
      es: "Memo de decisión",
      en: "Decision memo",
    },
    prompt: {
      es: `Escribí un memo de decisión para [problema].
Incluí: contexto, opciones consideradas, pros/cons, recomendación, riesgos y próximos pasos.
Tono: ejecutivo, máximo 1 página.`,
      en: `Write a decision memo for [problem].
Include: context, options considered, pros/cons, recommendation, risks, and next steps.
Tone: executive, at most 1 page.`,
    },
  },
  {
    category: "writing",
    purpose: "text",
    target: "claude",
    title: {
      es: "Reescritura con tono y largo definidos",
      en: "Rewrite with defined tone and length",
    },
    prompt: {
      es: `Reescribí el siguiente texto manteniendo el sentido.
Tono: claro y profesional, sin jerga.
Largo: máximo 120 palabras.
Texto: """[pegá el texto]"""
Cerrá con 3 sugerencias de mejora.`,
      en: `Rewrite the following text preserving meaning.
Tone: clear and professional, no jargon.
Length: up to 120 words.
Text: """[paste the text]"""
End with 3 improvement suggestions.`,
    },
  },
];

// Day-of-year index, deterministic worldwide because we use UTC.
export function dayOfYearUTC(date: Date): number {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const current = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return Math.floor((current - start) / (1000 * 60 * 60 * 24));
}

export function getDailyPrompt(date: Date = new Date()): DailyPrompt {
  if (DAILY_PROMPTS.length === 0) {
    throw new Error("DAILY_PROMPTS is empty");
  }
  const idx = dayOfYearUTC(date) % DAILY_PROMPTS.length;
  return DAILY_PROMPTS[idx]!;
}

export function categoryLabel(category: DailyPrompt["category"], lang: Locale): string {
  const map: Record<DailyPrompt["category"], { es: string; en: string }> = {
    coding: { es: "Código", en: "Coding" },
    marketing: { es: "Marketing", en: "Marketing" },
    study: { es: "Estudio", en: "Study" },
    analysis: { es: "Análisis", en: "Analysis" },
    data: { es: "Data / JSON", en: "Data / JSON" },
    image: { es: "Imagen", en: "Image" },
    business: { es: "Negocio", en: "Business" },
    writing: { es: "Escritura", en: "Writing" },
  };
  return map[category][lang];
}
