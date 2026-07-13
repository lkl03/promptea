import type { TaskType } from "./types";

function scoreKeywords(text: string, patterns: RegExp[]) {
  const t = text.toLowerCase();
  let s = 0;
  for (const re of patterns) if (re.test(t)) s++;
  return s;
}

export function classifyTask(core: string): TaskType | "general" {
  const t = core.toLowerCase();

  const scores: Record<TaskType | "general", number> = {
    coding: 0,
    debugging: 0,
    refactor: 0,
    research: 0,
    marketing: 0,
    writing: 0,
    summarization: 0,
    translation: 0,
    data_extraction: 0,
    planning: 0,
    customer_support: 0,
    study: 0,
    text: 0,
    image: 0,
    general: 0,
  };

  const bump = (k: keyof typeof scores, n: number) => (scores[k] += n);

  // \b boundaries matter: without them "go" matched inside "Goal:" and
  // "java" inside "javascript"-adjacent words, misclassifying plain text.
  bump("coding", scoreKeywords(t, [/\b(typescript|javascript|python|go|rust|java|sql|api|endpoint|next\.?js|react|node)\b|c\+\+|c#/]));
  bump("debugging", scoreKeywords(t, [/(bug|error|exception|stack|trace|fails|falla|rompe|crash|no anda)/]));
  bump("refactor", scoreKeywords(t, [/(refactor|restructure|clean up|limpi(ar|á)|optimizar código|optimizar codigo|mejorar código|mejorar codigo)/]));
  bump("research", scoreKeywords(t, [/(research|investig(a|á)|sources|fuentes|papers|estudios|evidence|evidencia)/]));
  bump("marketing", scoreKeywords(t, [/(marketing|ads|anuncio|copy|seo|cta|conversion|conversión|landing|brand|marca)/]));
  bump("summarization", scoreKeywords(t, [/(summary|summarize|summarise|resumen|resum(i|í|e)|resumime|tl;dr|puntos clave)/]));
  bump("translation", scoreKeywords(t, [/(translate|translation|tradu(c|z)í|traduce|traducir|traducción)/]));
  // Split into several patterns so multi-signal extraction prompts
  // ("return ONLY JSON", "fields:", "table with columns") outrank
  // single-keyword matches from other categories.
  bump("data_extraction", scoreKeywords(t, [
    /(extract|extracción|extraer|extraé|parse|parser)/,
    /(json|schema|esquema)/,
    /(campos|required fields|fields:)/,
    /(tabla con columnas|table with columns|columnas:|columns:)/,
  ]));
  bump("planning", scoreKeywords(t, [/(plan|roadmap|cronograma|timeline|milestones|checklist|pasos|step-by-step)/]));
  bump("customer_support", scoreKeywords(t, [/(support|soporte|cliente|ticket|reclamo|queja|disculpa|apology)/]));
  bump("writing", scoreKeywords(t, [/(write|escrib(i|í|e)|redact(a|á)|story|cuento|guion|artículo|articulo|post)/]));
  bump("study", scoreKeywords(t, [/(explain|teach|learn|explica|explicá|enseñame|ensename|aprender)/]));

  if (scores.debugging > 0 && scores.coding > 0) scores.debugging += 1;

  let best: keyof typeof scores = "general";
  let bestScore = 0;

  (Object.keys(scores) as Array<keyof typeof scores>).forEach((k) => {
    if (scores[k] > bestScore) {
      best = k;
      bestScore = scores[k];
    }
  });

  return bestScore === 0 ? "general" : (best as TaskType | "general");
}