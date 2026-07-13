// lib/refine/language.ts
//
// Lightweight language detection for prompt text (es vs en). Used to
// preserve the user's language through refinement and to verify that an
// adaptive rewrite did not switch languages. Deliberately dependency-free.

import type { Lang } from "@/lib/domain";

const ES_MARKERS =
  /\b(el|la|los|las|un|una|que|qué|para|con|por|como|cómo|pero|más|está|estás|este|esta|hacé|haceme|quiero|necesito|ayudame|ayúdame|escribí|escribi|redactá|traducí|resumen|resumir|código|codigo|dame|decime|sos|vos|usá|mejorá|generá|armá|explicá|siguiente|texto|archivo|debe|debería|según|también|función|error|solución|pregunta|respuesta)\b/gi;

const EN_MARKERS =
  /\b(the|a|an|that|this|for|with|from|and|but|what|how|when|where|which|write|make|help|need|want|please|give|show|explain|create|generate|improve|translate|summarize|following|text|file|should|would|could|question|answer|function|error|solution|about|into|your|you|me|my|our|their)\b/gi;

export type DetectedLanguage = { lang: Lang; confidence: number };

/**
 * Detect whether prompt text reads as Spanish or English.
 * `fallback` wins when the signal is too weak (very short or mixed text).
 */
export function detectPromptLanguage(text: string, fallback: Lang = "en"): DetectedLanguage {
  const src = String(text ?? "");
  if (src.trim().length < 3) return { lang: fallback, confidence: 0 };

  const esHits = (src.match(ES_MARKERS) ?? []).length;
  const enHits = (src.match(EN_MARKERS) ?? []).length;
  // Accented characters are a strong Spanish signal.
  const accents = (src.match(/[áéíóúñ¿¡]/gi) ?? []).length;

  const esScore = esHits + accents * 2;
  const enScore = enHits;
  const total = esScore + enScore;

  if (total === 0) return { lang: fallback, confidence: 0 };

  if (esScore > enScore) {
    return { lang: "es", confidence: Math.min(1, (esScore - enScore) / Math.max(4, total)) };
  }
  if (enScore > esScore) {
    return { lang: "en", confidence: Math.min(1, (enScore - esScore) / Math.max(4, total)) };
  }
  return { lang: fallback, confidence: 0 };
}

/**
 * Check that `rewritten` is in the expected language. Tolerant: only fails
 * when the rewrite clearly reads as the other language with decent signal.
 */
export function languageMatches(rewritten: string, expected: Lang): boolean {
  const detected = detectPromptLanguage(rewritten, expected);
  if (detected.lang === expected) return true;
  return detected.confidence < 0.35;
}
