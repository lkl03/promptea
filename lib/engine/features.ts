import type { Lang } from "../promptTemplates";
import type { Features, TaskType } from "./types";
import { normalizeText, wordCount } from "./normalize";

function hasAny(text: string, patterns: RegExp[]) {
  return patterns.some((re) => re.test(text));
}

function scoreKeywords(text: string, patterns: RegExp[]) {
  let s = 0;
  for (const re of patterns) if (re.test(text)) s += 1;
  return s;
}

function detectDominantLanguageMismatch(core: string, uiLang: Lang) {
  const t = core.toLowerCase();

  const esHits = scoreKeywords(t, [
    /\b(el|la|los|las|un|una|para|que|con|sin|como|quiero|necesito|resumen|traducir|explicá|explica)\b/,
  ]);

  const enHits = scoreKeywords(t, [
    /\b(the|a|an|to|for|with|without|like|i want|i need|summary|translate|explain)\b/,
  ]);

  if (uiLang === "es") return enHits >= esHits + 2;
  return esHits >= enHits + 2;
}

function detectGoal(text: string, task: TaskType) {
  const genericGoal = hasAny(text, [
    /\b(goal|objective|objetivo|meta)\b/,
    /\b(quiero|necesito|busco|i want|i need|i'm trying to|my goal is)\b/,
    /\b(haceme|hazme|make|build|create|generate|write|escribí|redactá|redacta)\b/,
    // v1.2.0: imperative request verbs are goal statements too.
    /\b(give me|dame|decime|tell me|help me|ayudame|ayúdame|improve|mejorar|mejorá|mejora)\b/,
    /\b(extraé|extrae|devolvé|devolveme|devuelve|generá|genera|armá|arma|draft|reescribí|reescribe|rewrite|suggest|recommend|recomendá|recomienda)\b/,
    /\b(explicá|explica|explain|resumí|resume|summarize|traducí|traduce|translate|fix|arreglá|arregla|invitar|invite)\b/,
    /\b(reply|respond|respondé|responde|contestá|contesta|answer)\b/,
  ]);

  if (genericGoal) return true;

  switch (task) {
    case "summarization":
      return hasAny(text, [
        /\b(summary|summarize|summarise|tl;dr)\b/,
        /\b(resumen|resumí|resumime|resumir|resumilo|resumilo en)\b/,
      ]);

    case "translation":
      return hasAny(text, [
        /\b(translate|translation|translated)\b/,
        /\b(traducí|traducime|traducir|traduce|traducción)\b/,
      ]);

    case "study":
      return hasAny(text, [
        /\b(explain|teach|help me learn|study)\b/,
        /\b(explicá|explica|enseñame|ensename|ayudame a entender|estudiar)\b/,
      ]);

    case "marketing":
      return hasAny(text, [
        /\b(copy|ad copy|landing copy|campaign|cta|marketing)\b/,
        /\b(anuncio|copy|campaña|campana|texto de venta|cta)\b/,
      ]);

    case "coding":
    case "debugging":
    case "refactor":
      return hasAny(text, [
        /\b(fix|debug|refactor|implement|build|write code)\b/,
        /\b(arreglá|arregla|debuggeá|debuggear|refactorizá|implementá|implementa|codigo|código)\b/,
      ]);

    case "data_extraction":
      return hasAny(text, [
        /\b(extract|parse|schema|structured data|json)\b/,
        /\b(extraé|extrae|parseá|parsea|campos|json|schema|esquema)\b/,
      ]);

    default:
      return false;
  }
}

export function extractFeatures(core: string, task: TaskType, lang: Lang): Features {
  const clean = normalizeText(core);
  const t = clean.toLowerCase();
  const words = wordCount(clean);

  const hasGoal = detectGoal(t, task);

  const hasInputs =
    hasAny(t, [
      /\b(input|inputs|dataset|csv|json|xml|yaml|logs?|stacktrace|traceback)\b/,
      // NOTE: no trailing \b after ":" — ":" is a non-word char, so a word
      // boundary there never matches (pre-v1.2.0 bug: these markers were dead).
      /\b(texto:|text:|contexto:|context:|artículo:|articulo:|article:|documento:|document:)/,
      /\b(source text|original text|texto original|archivo|file|adjunto|attached)\b/,
      /\b(código:|codigo:|code:|email:|correo:)/,
      // Quoted source material ("...") of meaningful length is input data.
      /["“][^"”]{10,}["”]/,
    ]) || /```/.test(clean) || words > 80;

  const hasAudience = hasAny(t, [
    /\b(audience|for beginners|for executives|for developers|stakeholders|customer)\b/,
    /\b(audiencia|para principiantes|para ejecutivos|para developers|para desarrolladores|cliente|usuarios?)\b/,
    /\b(nivel secundario|nivel universitario|básico|basico|intermedio|avanzado)\b/,
  ]);

  const hasExamples =
    hasAny(t, [/\b(example|examples|for example|e\.g\.)\b/, /\b(ejemplo|ejemplos|por ejemplo)\b/]) ||
    /```/.test(clean);

  const hasConstraints =
    hasAny(t, [
      /\b(constraints?|limitations?|avoid|must|must not|don't|do not)\b/,
      /\b(restricciones?|límites|limites|evitá|evita|no uses|no incluyas|no inventes|debe|deben)\b/,
      /\b(formal|casual|neutral|literal|natural|tono|tone)\b/,
    ]) ||
    (task === "translation" &&
      hasAny(t, [
        /\b(target language|to english|to spanish|into english|into spanish)\b/,
        /\b(al español|al espanol|al inglés|al ingles|idioma objetivo)\b/,
      ])) ||
    (task === "summarization" &&
      hasAny(t, [
        /\b(bullets?|paragraph|sections?|length|brief|short|long|focus)\b/,
        /\b(viñetas|vinyetas|párrafo|parrafo|secciones|largo|breve|corto|extenso|foco)\b/,
      ]));

  const hasOutputFormat = hasAny(t, [
    /\b(output format|format|json|table|steps|bullets?|paragraph|sections?)\b/,
    /\b(formato de salida|json|tabla|pasos|viñetas|vinyetas|párrafo|parrafo|secciones)\b/,
    // Colon-style spec lines: "Output: subject + body", "Formato: ..."
    /\b(output:|salida:|formato:)/,
  ]);

  const hasSuccessCriteria = hasAny(t, [
    /\b(success criteri(?:a|on)|acceptance criteri(?:a|on)|must include|verify|validation)\b/,
    /\b(criterios? de éxito|criterios? de exito|debe incluir|validar|verificar|aceptación|aceptacion)\b/,
  ]);

  const hasTone = hasAny(t, [
    /\b(tone|formal|casual|friendly|serious|literal|natural|professional\w*)\b/,
    /\b(tono|formal|casual|amigable|serio|literal|natural|profesional\w*)\b/,
  ]);

  const hasLengthHint = hasAny(t, [
    /\b(short|brief|concise|long|detailed|1 paragraph|2 paragraphs|3 bullets|5 bullets)\b/,
    /\b(corto|breve|resumido|largo|extenso|detallado|1 párrafo|1 parrafo|3 viñetas|5 viñetas)\b/,
    // Numeric limits: "max 120 words", "máximo 120 palabras", "120 caracteres"
    /\b(max|máx|maximo|máximo|minimum|min|mínimo|minimo)\b.{0,12}\d+/,
    /\d+\s*(palabras|words|caracteres|characters|líneas|lineas|lines)\b/,
  ]);

  const hasTimeframe = hasAny(t, [
    /\b(202\d|20\d\d|last|recent|current|timeframe|period)\b/,
    /\b(últim|ultim|reciente|actual|periodo|período|marzo|abril|mayo|junio|julio|agosto)\b/,
  ]);

  const hasRegion = hasAny(t, [
    /\b(argentina|latam|usa|europe|spain|timezone|region)\b/,
    /\b(argentina|latam|eeuu|europa|españa|espana|región|region|zona horaria)\b/,
  ]);

  const hasErrorDetails =
    task === "debugging" || task === "coding"
      ? hasAny(t, [/\b(error|exception|stack|trace|traceback|log|fails?|crash)\b/, /\b(falla|rompe|mensaje de error)\b/])
      : false;

  const hasReproSteps =
    task === "debugging"
      ? hasAny(t, [/\b(steps to reproduce|repro|reproduce)\b/, /\b(pasos para reproducir|reproducir)\b/]) ||
        /^\s*\d+\s*[\).\:-]\s+/m.test(clean)
      : false;

  const injectionLike = hasAny(t, [
    /\b(ignore all previous instructions|ignore previous instructions|disregard the above)\b/,
    /\b(developer mode|jailbreak|do anything now|reveal the system prompt|developer message|hidden instructions)\b/,
    /\b(ignorá todas las instrucciones anteriores|ignora todas las instrucciones anteriores|modo desarrollador)\b/,
    /\b(revelá el prompt del sistema|revela el prompt del sistema|mensaje del desarrollador|instrucciones ocultas)\b/,
  ]);

  const contradictions =
    (hasAny(t, [/\b(breve|short|brief|concise)\b/]) &&
      hasAny(t, [/\b(muy detallado|very detailed|exhaustive|extenso|largo)\b/])) ||
    (hasAny(t, [/\b(no supongas|don't assume|do not assume)\b/]) &&
      hasAny(t, [/\b(invent|make up|inventá|inventa|ficción)\b/]));

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