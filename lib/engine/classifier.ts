import type { TaskType } from "../promptTemplates";

function scoreKeywords(text: string, patterns: RegExp[]) {
  const t = text.toLowerCase();
  let s = 0;
  for (const re of patterns) if (re.test(t)) s++;
  return s;
}

export function classifyTask(core: string): TaskType {
  const t = core.toLowerCase();

  const scores: Record<TaskType, number> = {
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
    general: 0,
  };

  const bump = (k: TaskType, n: number) => (scores[k] += n);

  bump("coding", scoreKeywords(t, [/(typescript|javascript|python|go|rust|java|c\+\+|c#|sql|api|endpoint|nextjs|react|node)/]));
  bump("debugging", scoreKeywords(t, [/(bug|error|exception|stack|trace|fails|falla|rompe|crash|no anda)/]));
  bump("refactor", scoreKeywords(t, [/(refactor|restructure|clean up|limpi(ar|á)|optimizar código|mejorar código)/]));
  bump("research", scoreKeywords(t, [/(research|investig(a|á)|sources|fuentes|papers|estudios|evidence|evidencia)/]));
  bump("marketing", scoreKeywords(t, [/(marketing|ads|anuncio|copy|seo|cta|conversion|conversión|landing|brand|marca)/]));
  bump("summarization", scoreKeywords(t, [/(summary|summarize|resum(i|í|e)|tl;dr|puntos clave)/]));
  bump("translation", scoreKeywords(t, [/(translate|translation|tradu(c|z)í|traduce|traducir)/]));
  bump("data_extraction", scoreKeywords(t, [/(extract|extracción|extraer|json|schema|campos|required fields|parse|parser)/]));
  bump("planning", scoreKeywords(t, [/(plan|roadmap|cronograma|timeline|milestones|checklist|pasos|step-by-step)/]));
  bump("customer_support", scoreKeywords(t, [/(support|soporte|cliente|ticket|reclamo|queja|disculpa|apology)/]));
  bump("writing", scoreKeywords(t, [/(write|escrib(i|í|e)|redact(a|á)|story|cuento|guion|artículo|post)/]));

  if (scores.debugging > 0 && scores.coding > 0) scores.debugging += 1;

  let best: TaskType = "general";
  let bestScore = 0;
  (Object.keys(scores) as TaskType[]).forEach((k) => {
    if (scores[k] > bestScore) {
      best = k;
      bestScore = scores[k];
    }
  });

  return bestScore === 0 ? "general" : best;
}