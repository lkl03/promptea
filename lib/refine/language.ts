// lib/refine/language.ts
//
// Lightweight language detection for prompt text (es, en, pt). Used to
// preserve the user's language through refinement, to verify that an adaptive
// rewrite did not switch languages, and (v1.8.2) to decide when the engine
// should look for Portuguese vocabulary in a prompt. Deliberately
// dependency-free.
//
// v1.8.2 added Portuguese WITHOUT touching how Spanish and English are told
// apart: the es/en scores are computed exactly as before, and Portuguese only
// wins when the text carries Portuguese-only signal on top of what it shares
// with Spanish. A text with no Portuguese-only word or letter can never be
// detected as Portuguese, so every es/en result of v1.8.1 is unchanged.

import type { Lang } from "@/lib/domain";

const ES_MARKERS =
  /\b(el|la|los|las|un|una|que|qué|para|con|por|como|cómo|pero|más|está|estás|este|esta|hacé|haceme|quiero|necesito|ayudame|ayúdame|escribí|escribi|redactá|traducí|resumen|resumir|código|codigo|dame|decime|sos|vos|usá|mejorá|generá|armá|explicá|siguiente|texto|archivo|debe|debería|según|también|función|error|solución|pregunta|respuesta)\b/gi;

const EN_MARKERS =
  /\b(the|a|an|that|this|for|with|from|and|but|what|how|when|where|which|write|make|help|need|want|please|give|show|explain|create|generate|improve|translate|summarize|following|text|file|should|would|could|question|answer|function|error|solution|about|into|your|you|me|my|our|their)\b/gi;

// Unicode-aware word edges: JS `\b` is ASCII-only, so it never matches next to
// "ê", "ã" or "é" ("você", "não", "é"). A leading "." is excluded so the "com"
// of "example.com" is not read as the Portuguese preposition.
const EDGE_L = "(?<![\\p{L}\\p{N}_.])";
const EDGE_R = "(?![\\p{L}\\p{N}_])";

/**
 * Words that are Portuguese and NOT Spanish or English. Words the three
 * languages (or Portuguese and Spanish) share are left out on purpose —
 * "explique", "resuma", "corrija", "preciso", "nos", "dos", "da", "do", "tom"
 * read as Spanish or English too.
 */
const PT_ONLY = new RegExp(
  `${EDGE_L}(não|você|vocês|uma|um|com|sem|mais|isso|isto|esse|essa|esses|essas|aquele|aquela|quero|gostaria|ajude|ajudar|escreva|escrever|crie|criar|faça|gere|gerar|traduza|traduzir|melhore|melhorar|corrigir|seguinte|seguintes|arquivo|arquivos|deve|devem|deveria|também|função|funções|erro|erros|solução|pergunta|perguntas|resposta|respostas|meu|minha|meus|minhas|seu|sua|seus|suas|são|tem|têm|foi|muito|muita|muitos|muitas|onde|qual|quais|quando|então|já|até|ou|em|na|nas|ao|aos|às|das|pelo|pela|pelos|pelas|num|numa|dele|dela|e|é|à|olá|obrigado|obrigada|fazer|pode|podem|usuário|usuários|saída|tópicos|parágrafo|parágrafos|tamanho|prazo|público-alvo|português|inglês|espanhol|os|deste|desta|destes|destas|neste|nesta|disso|nisso|daquele|daquela|pontos|principais|relatório|relatórios|artigo|artigos|resumo|anúncio|anúncios|reunião|equipe|orçamento|mensagem|mensagens|título do|notícias|empresa de)${EDGE_R}`,
  "giu",
);

/** Words Portuguese shares with Spanish (already counted for Spanish by ES_MARKERS). */
const ROMANCE_SHARED = /\b(que|para|por|como|este|esta|texto)\b/gi;

export type DetectedLanguage = { lang: Lang; confidence: number };

const count = (text: string, re: RegExp) => (text.match(re) ?? []).length;

/**
 * Detect whether prompt text reads as Spanish, English or Portuguese.
 * `fallback` wins when the signal is too weak (very short or mixed text).
 */
export function detectPromptLanguage(text: string, fallback: Lang = "en"): DetectedLanguage {
  const src = String(text ?? "");
  if (src.trim().length < 3) return { lang: fallback, confidence: 0 };

  const esHits = count(src, ES_MARKERS);
  const enHits = count(src, EN_MARKERS);
  // Accented characters are a strong Spanish signal.
  const accents = count(src, /[áéíóúñ¿¡]/gi);

  const esScore = esHits + accents * 2;
  const enScore = enHits;

  // Portuguese: its own words and letters, plus what it shares with Spanish.
  const ptOnlyHits = count(src, PT_ONLY);
  const ptLetters = count(src, /[ãõçêâôà]/gi);
  const sharedAccents = count(src, /[áéíóú]/gi);
  const ptScore = ptOnlyHits + ptLetters * 2 + count(src, ROMANCE_SHARED) + sharedAccents * 2;

  if (ptOnlyHits + ptLetters > 0 && ptScore > esScore && ptScore > enScore) {
    // Confidence compares what is DISTINCTIVE of each language. Portuguese and
    // Spanish share words and accents, and counting those on both sides would
    // make every Portuguese text look like a near-tie.
    const ptOwn = ptOnlyHits + ptLetters * 2;
    const esOwn = spanishOwnSignal(src);
    const rival = Math.max(esOwn, enScore);
    return { lang: "pt", confidence: Math.min(1, Math.max(0, ptOwn - rival) / Math.max(4, ptOwn + rival)) };
  }

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

/**
 * v1.8.2 — the language whose VOCABULARY the engine should look for in a prompt.
 *
 * The detectors are keyword-based. Spanish and English keep their v1.8.1
 * behaviour (the interface language decides); Portuguese vocabulary is used
 * when the interface is Portuguese or when the prompt itself clearly reads as
 * Portuguese, whatever the interface language — a prompt written in Portuguese
 * is analyzed properly from /es and /en too.
 */
export function vocabularyLang(prompt: string, uiLang: Lang): Lang {
  const d = detectPromptLanguage(prompt, uiLang);
  if (d.lang === "pt" && (uiLang === "pt" || d.confidence >= 0.35)) return "pt";
  if (uiLang === "pt") {
    // A Portuguese interface with a prompt that clearly is Spanish or English.
    // "Clearly Spanish" needs Spanish-ONLY signal: a short Portuguese sentence
    // made of words both languages share ("Resuma o relatório") scores as
    // Spanish on accents alone and must stay Portuguese here.
    if (d.lang === "es") return d.confidence >= 0.35 && spanishOwnSignal(prompt) >= 2 ? "es" : "pt";
    return d.confidence >= 0.35 ? d.lang : "pt";
  }
  return uiLang;
}

/** How much of a text is Spanish and NOT also Portuguese: Spanish-only words, ñ, ¿, ¡. */
function spanishOwnSignal(text: string): number {
  const src = String(text ?? "");
  return Math.max(0, count(src, ES_MARKERS) - count(src, ROMANCE_SHARED)) + count(src, /[ñ¿¡]/gi) * 2;
}

/** True when the prompt should also be read with the Portuguese vocabulary. */
export function readsAsPortuguese(prompt: string, uiLang: Lang = "en"): boolean {
  return vocabularyLang(prompt, uiLang) === "pt";
}
