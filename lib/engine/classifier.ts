import type { TaskType } from "./types";

function scoreKeywords(text: string, patterns: RegExp[]) {
  const t = text.toLowerCase();
  let s = 0;
  for (const re of patterns) if (re.test(t)) s++;
  return s;
}

export type TaskScores = Record<TaskType | "general", number>;

export type TaskClassification = {
  best: TaskType | "general";
  /** Hits for the winning category (0 → "general"). */
  score: number;
  scores: TaskScores;
};

// v1.8.0: phrases that mention errors without reporting a bug ("include error
// handling", "manejo de errores para email duplicado") — an implementation
// spec, not a debugging request.
const ERROR_HANDLING_PHRASES =
  /\b(error handling|handle errors?|handling errors?|errores? esperados?)\b|manej(o|ar|á) (de |los )?errores?|manejo de error|control de errores/g;

/** Per-category keyword hits plus the winning category. */
export function classifyTaskDetailed(core: string): TaskClassification {
  const t = core.toLowerCase();
  const tNoErrorHandling = t.replace(ERROR_HANDLING_PHRASES, " ");

  const scores: TaskScores = {
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
  bump("coding", scoreKeywords(t, [
    /\b(typescript|javascript|python|go|rust|java|sql|api|endpoint|next\.?js|react|node)\b|c\+\+|c#/,
    // v1.8.0: explicit implementation intent outranks an incidental "error".
    /\b(implement|implementar|implementá|implementa)\b|implementá|\b(write|escrib[ií]|haceme|hac[eé]|cre[aá]) (a |an |una |un )?(function|funci[oó]n|class|clase|endpoint|script|component|componente)/,
  ]));
  bump("debugging", scoreKeywords(tNoErrorHandling, [/(bug|error|exception|stack|trace|fails|falla|rompe|crash|no anda)/]));
  bump("refactor", scoreKeywords(t, [/(refactor|restructure|clean up|limpi(ar|á)|optimizar código|optimizar codigo|mejorar código|mejorar codigo)/]));
  bump("research", scoreKeywords(t, [
    /(research|investig(a|á)|sources|fuentes|papers|estudios|evidence|evidencia)/,
    /\b(peer-reviewed|citations?|citas|studies|meta-analysis|metaan[aá]lisis|literature|bibliograf[ií]a)\b/,
  ]));
  // v1.8.0: split into independent signals so one generic word ("marca",
  // "ads") cannot outrank a real plan or brief on its own.
  bump("marketing", scoreKeywords(t, [
    /\b(marketing|campaign|campaña|campana)\b/,
    /\b(ads|anuncios?|copy|copywriting|headlines?|titulares|slogan|eslogan)\b/,
    /\b(cta|call to action|conversion|conversión|landing)\b/,
    /\b(seo|brand|marca|target audience|p[uú]blico objetivo|audiencia objetivo)\b/,
  ]));
  bump("summarization", scoreKeywords(t, [/(summary|summarize|summarise|resumen|resum(i|í|e)|resumime|tl;dr|puntos clave)/]));
  // v1.8.0: "traducime", "traduci", "traduzca" were missed by the old
  // accent-specific alternation.
  bump("translation", scoreKeywords(t, [/(translat|tradu[cz])/]));
  // Split into several patterns so multi-signal extraction prompts
  // ("return ONLY JSON", "fields:", "table with columns") outrank
  // single-keyword matches from other categories.
  bump("data_extraction", scoreKeywords(t, [
    /(extract|extracción|extraer|extraé|parse|parser)/,
    /(json|schema|esquema)/,
    /(campos|required fields|fields:)/,
    /(tabla con columnas|table with columns|columnas:|columns:)/,
  ]));
  // v1.8.0: word-bounded ("explanation" contains "plan") and multi-signal.
  bump("planning", scoreKeywords(t, [
    /\b(plan|planes|planning|planificaci[oó]n|roadmap|cronograma|timeline)\b|planific/,
    /\b(milestones?|hitos|checklist|step-by-step|paso a paso)\b/,
    /\b(risks|riesgos|owners|responsables|dependencies|dependencias|rollback|mitigation|mitigaci[oó]n)\b/,
  ]));
  bump("customer_support", scoreKeywords(t, [
    /(support|soporte|ticket|reclamo|queja|complaint)/,
    /(cliente|customer)/,
    /(disculpa|apology|apologi[sz]e|lo sentimos|we're sorry)/,
  ]));
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

  return { best: bestScore === 0 ? "general" : best, score: bestScore, scores };
}

export function classifyTask(core: string): TaskType | "general" {
  return classifyTaskDetailed(core).best;
}
