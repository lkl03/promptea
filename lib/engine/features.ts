import type { Lang, TaskType } from "../promptTemplates";
import type { Features } from "./types";
import { normalizeText, wordCount } from "./normalize";

function scoreKeywords(text: string, patterns: RegExp[]) {
  const t = text.toLowerCase();
  let s = 0;
  for (const re of patterns) if (re.test(t)) s++;
  return s;
}

function detectDominantLanguageMismatch(core: string, uiLang: Lang) {
  const t = core.toLowerCase();
  const esHits = scoreKeywords(t, [/\b(el|la|los|las|un|una|para|que|con|sin|como|quiero|necesito|por)\b/]);
  const enHits = scoreKeywords(t, [/\b(the|a|an|to|for|with|without|like|i want|i need|please)\b/]);

  if (uiLang === "es") return enHits >= esHits + 2;
  return esHits >= enHits + 2;
}

export function extractFeatures(core: string, task: TaskType, lang: Lang): Features {
  const clean = normalizeText(core);
  const t = clean.toLowerCase();
  const words = wordCount(clean);

  const hasGoal = /(goal|objective|objetivo|meta|quiero|necesito|busco|mi objetivo)/.test(t);
  const hasInputs = /(input|datos de entrada|dataset|csv|json|texto:|contexto:|logs:|code:|código:)/.test(t) || words > 80;
  const hasAudience = /(audience|audiencia|para (quién|quien)|cliente|usuario final|stakeholders)/.test(t);
  const hasExamples = /(example|ejemplo|por ejemplo|e\.g\.)/.test(t) || /```/.test(clean);
  const hasConstraints = /(constraints|restricciones|límites|limites|avoid|no (incluyas|uses|use)|must|debe)/.test(t);
  const hasOutputFormat = /(output format|formato de salida|json|tabla|table|viñetas|bullets|pasos|steps)/.test(t);
  const hasSuccessCriteria = /(success criteria|criterios de (éxito|exito)|validar|verify|verificar|aceptación|acceptance)/.test(t);
  const hasTone = /(tono|tone|formal|casual|amigable|serio|directo)/.test(t);
  const hasLengthHint = /(breve|corto|short|brief|extenso|largo|long|detailed|detallado)/.test(t);
  const hasTimeframe = /(202\d|20\d\d|last|recent|reciente|últim|timeframe|periodo|período)/.test(t);
  const hasRegion = /(argentina|latam|usa|europe|europa|spain|españa|region|región|timezone|zona horaria)/.test(t);

  const hasErrorDetails =
    task === "debugging" || task === "coding"
      ? /(error|exception|stack|trace|log|mensaje de error|stack trace|fails|falla)/.test(t)
      : false;

  const hasReproSteps =
    task === "debugging" ? /(steps to reproduce|repro|reproduce|pasos para reproducir|reproducir)/.test(t) : false;

  const injectionLike = /(ignore previous|bypass|jailbreak|dan|system prompt|developer message|olvid(a|á) las instrucciones)/.test(t);

  const contradictions =
    (/(breve|short|brief)/.test(t) && /(muy detallado|very detailed|exhaustive|extenso|largo)/.test(t)) ||
    (/(no supongas|don'?t assume|no assume)/.test(t) && /(invent|make up|ficción|inventá|inventa)/.test(t));

  const languageMismatch = detectDominantLanguageMismatch(clean, lang);

  return {
    words,
    hasGoal,
    hasInputs,
    hasAudience,
    hasExamples,
    hasConstraints,
    hasOutputFormat,
    hasSuccessCriteria,
    hasTone,
    hasLengthHint,
    hasTimeframe,
    hasRegion,
    hasErrorDetails,
    hasReproSteps,
    injectionLike,
    contradictions,
    languageMismatch,
  };
}