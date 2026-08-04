// lib/matcher/rubric.ts
//
// Versioned, centralized rubric for the deterministic matcher.
//
// Each signal is an independently testable detector that contributes
// weighted evidence to one or more match categories. Update policy: bump
// RUBRIC_VERSION whenever a weight, threshold, or signal changes so
// telemetry and tests can distinguish rubric generations.

import type { InteractionProfile, Lang, MatchCategory } from "@/lib/domain";

export const RUBRIC_VERSION = "2026-08-04.1";

export type SignalDef = {
  id: string;
  label: { es: string; en: string };
  /** Pure detector — no state, no randomness. */
  test: (ctx: SignalContext) => boolean;
  contributes: Array<{ category: MatchCategory; weight: number }>;
};

export type SignalContext = {
  text: string;
  lower: string;
  wordCount: number;
  attachmentsCount: number;
  attachmentChars: number;
};

// ── Detector regexes (bilingual ES/EN) ──────────────────────────────────────

const RE = {
  repoPath: /(\b[\w.-]+\/[\w.-]+\/[\w./-]+\.(ts|tsx|js|jsx|py|go|rs|rb|java|kt|swift|php|c|cpp|h|css|scss|sql|json|ya?ml|md)\b|\b(src|lib|app|components|pages|tests?)\/[\w./-]+|[A-Za-z]:\\[\w\\.-]+)/,
  fileName: /\b[\w-]+\.(ts|tsx|js|jsx|py|go|rs|rb|java|kt|swift|php|cpp|sql|json|ya?ml|toml|css|scss|html|md|csv|txt|log)\b/i,
  shellCommand: /\b(npm (run|ci|install|test)|pnpm|yarn|npx|pip install|cargo (build|run|test)|docker (build|run|compose)|makefile\b|make (install|build|test|clean|all)\b|git (checkout|pull|push|commit|merge|rebase|clone|add)|bash|zsh|curl -)/i,
  gitWorkflow: /\b(pull request|PR\b|branch|rama|merge|commit|rebase|checkout|main\b|repositorio|repository|repo\b)/i,
  testsAcceptance: /\b(tests?( suite)?|testing|criterios de aceptaci[oó]n|acceptance criteria|CI\b|pipeline|coverage|lint(er)?|typecheck|validaci[oó]n autom[aá]tica)\b/i,
  autonomousAgent: /\b(claude code|codex|copilot (agent|workspace)|cursor|agente( de c[oó]digo)?|coding agent|aut[oó]nom[oa]|multi[- ]?step|paso a paso ejecut|end[- ]to[- ]end|de punta a punta|implement[aá]?(r| the| la| el)|migra(r|ci[oó]n)|refactoriz)/i,
  codeFence: /```|~~~/,
  codeSymbol: /\b(function|const|let|var|class \w+|=>|def |import |export |async |await |interface |struct |enum )\b/,
  codingLanguage: /\b(typescript|javascript|python|java\b|kotlin|swift|golang|\bgo\b|rust|ruby|php|c\+\+|c#|sql|html|css|react|next\.?js|vue|svelte|node\.?js|django|flask|spring|laravel)\b/i,
  debugSignal: /\b(error|exception|traceback|stack ?trace|crash|falla|no funciona|doesn'?t work|bug\b|undefined is not|NullPointer|segfault|status (4\d\d|5\d\d))\b/i,
  webRecency: /\b(hoy|ahora|actual(es|idad|izado)?|reciente?s?|[uú]ltim[oa]s?|latest|current|recent|today|this (week|month|year)|202[5-9]|news|noticias|precio(s)? de mercado|market price)\b/i,
  citations: /\b(fuentes?|sources?|citas?|citations?|referencias?|references?|links?\b|url(es)?\b|bibliograf[ií]a|papers?\b|estudios? (cient[ií]ficos?|acad[eé]micos?))\b/i,
  searchVerb: /\b(busc[aá](r|me)?|search|investig[aá](r|me)?|research|averigu[aá]|find out|compar[aá[r]? (precios|opciones|productos)|qu[eé] (dice|opina) la gente)\b/i,
  longDocument: /\b(documento|document|pdf\b|informe|report|contrato|contract|paper\b|transcripci[oó]n|transcript|cap[ií]tulos?|chapters?|p[aá]ginas|pages|whitepaper)\b/i,
  multimodalRef: /\b(esta (imagen|foto|captura)|this (image|photo|screenshot)|attached (image|photo|screenshot)|adjunt[oé] (una )?(imagen|foto)|el video|this video|audio adjunto|analiz[aá] (la|esta) (imagen|foto|captura)|look at th(is|e) (picture|image))\b/i,
  jsonStrict: /\b(json v[aá]lido|valid json|solo json|only json|json only|schema|jsonl?\b|estructura de campos|campos:|fields:)\b/i,
  tabularData: /\b(csv|tabla|table|columnas?|columns?|filas?|rows?|celdas?|spreadsheet|planilla|excel|extrae[er]?|extract|parse[aá]?r?)\b/i,
  creativeWriting: /\b(cuento|historia|relato|novela|poema|poem|story|fiction|ficci[oó]n|personajes?|characters?|di[aá]logo|guion|screenplay|verso|lyrics?|letra de canci[oó]n|haiku)\b/i,
  marketingCopy: /\b(copy\b|anuncio|ad\b|ads\b|campa[nñ]a|campaign|marketing|instagram|tiktok|facebook|linkedin|landing|CTA\b|conversi[oó]n|conversion|slogan|tagline|audiencia objetivo|target audience|venta|sales pitch|newsletter)\b/i,
  translation: /\b(traduc[ií](r|me|lo)?|traducci[oó]n|translate|translation|al (ingl[eé]s|espa[nñ]ol|franc[eé]s|portugu[eé]s|alem[aá]n|italiano)|(to|into) (english|spanish|french|german|portuguese|italian))\b/i,
  summarization: /\b(resum[ií](r|me|lo)?|resumen|summar(y|ize|ise)|tl;?dr|s[ií]ntesis|synthesize|puntos (clave|principales)|key points|condens[aá])\b/i,
  tutoring: /\b(explic[aá](me|r)?|explain( to me)?|ense[nñ][aá](me|r)?|teach me|aprend(er|a)|learn(ing)?|estudi(ar|o)|study(ing)?|examen|exam\b|parcial|homework|tarea escolar|como si tuviera \d+|like i'?m \d+|paso a paso|step by step)\b/i,
  imageGen: /\b(gener[aá](r|me)? una (imagen|foto|ilustraci[oó]n)|generate (an? )?(image|picture|illustration)|dibuj[aá]|draw\b|midjourney|dall[- ]?e|stable diffusion|imagen\b.{0,30}\b(estilo|style)|aspect ratio|relaci[oó]n de aspecto|fotorrealista|photorealistic|render\b|un logo|a logo)\b/i,
  complexReasoning: /\b(demostr[aá](r|ci[oó]n)?|prove\b|proof\b|teorema|theorem|optimiz[aá](r|ci[oó]n)|optimize|trade[- ]?offs?|arquitectura de sistema|system design|estrategia (compleja|de largo plazo)|razonamiento|reasoning|l[oó]gica formal|paradoja|paradox|ajedrez|chess|matem[aá]tica avanzada)\b/i,
  quickTask: /\b(corrig[eí](me)?|fix this typo|rename|renombr[aá]|una l[ií]nea|one[- ]liner|r[aá]pido|quick(ly)?|simple\b|cortito|breve|solo (decime|dime)|just tell me)\b/i,
};

// ── Signal registry ─────────────────────────────────────────────────────────

export const SIGNALS: SignalDef[] = [
  {
    id: "repo_paths",
    label: { es: "Rutas de repositorio o archivos de código", en: "Repository or code file paths" },
    test: (c) => RE.repoPath.test(c.text),
    contributes: [
      { category: "codingAgent", weight: 2 },
      { category: "coding", weight: 1 },
    ],
  },
  {
    id: "shell_commands",
    label: { es: "Comandos de terminal", en: "Shell commands" },
    test: (c) => RE.shellCommand.test(c.text),
    contributes: [
      { category: "codingAgent", weight: 2 },
      { category: "coding", weight: 0.5 },
    ],
  },
  {
    id: "git_workflow",
    label: { es: "Flujo git / pull requests", en: "Git / pull-request workflow" },
    test: (c) => RE.gitWorkflow.test(c.text),
    contributes: [{ category: "codingAgent", weight: 1.5 }],
  },
  {
    id: "tests_acceptance",
    label: { es: "Tests o criterios de aceptación", en: "Tests or acceptance criteria" },
    test: (c) => RE.testsAcceptance.test(c.text),
    contributes: [
      { category: "codingAgent", weight: 1.5 },
      { category: "coding", weight: 0.5 },
    ],
  },
  {
    id: "autonomous_multistep",
    label: { es: "Ejecución autónoma multi-paso", en: "Autonomous multi-step execution" },
    test: (c) => RE.autonomousAgent.test(c.text) && RE.gitWorkflow.test(c.text),
    contributes: [{ category: "codingAgent", weight: 1.5 }],
  },
  {
    id: "code_content",
    label: { es: "Código en el prompt", en: "Code in the prompt" },
    test: (c) => RE.codeFence.test(c.text) || RE.codeSymbol.test(c.text),
    contributes: [{ category: "coding", weight: 2 }],
  },
  {
    id: "coding_language",
    label: { es: "Lenguajes o frameworks de programación", en: "Programming languages or frameworks" },
    test: (c) => RE.codingLanguage.test(c.text),
    contributes: [{ category: "coding", weight: 1.5 }],
  },
  {
    id: "debug_evidence",
    label: { es: "Errores o comportamiento a depurar", en: "Errors or behavior to debug" },
    test: (c) => RE.debugSignal.test(c.text),
    contributes: [{ category: "coding", weight: 1.5 }],
  },
  {
    id: "web_recency",
    label: { es: "Necesita información actual de la web", en: "Needs current web information" },
    test: (c) => RE.webRecency.test(c.text) && (RE.searchVerb.test(c.text) || RE.citations.test(c.text) || /\b(precio|price|noticia|news|versi[oó]n m[aá]s reciente|latest version)\b/i.test(c.text)),
    contributes: [{ category: "research", weight: 2 }],
  },
  {
    id: "citations_required",
    label: { es: "Pide fuentes o citas", en: "Requests sources or citations" },
    test: (c) => RE.citations.test(c.text),
    contributes: [{ category: "research", weight: 2 }],
  },
  {
    id: "search_task",
    label: { es: "Tarea de búsqueda o investigación", en: "Search or research task" },
    test: (c) => RE.searchVerb.test(c.text),
    contributes: [{ category: "research", weight: 1.5 }],
  },
  {
    id: "long_input",
    label: { es: "Contexto largo (documentos extensos)", en: "Long context (large documents)" },
    test: (c) => c.wordCount > 1200 || c.attachmentChars > 8000,
    contributes: [{ category: "longContext", weight: 2.5 }],
  },
  {
    id: "document_processing",
    label: { es: "Procesamiento de documentos", en: "Document processing" },
    test: (c) => RE.longDocument.test(c.text),
    contributes: [
      { category: "longContext", weight: 1.5 },
      { category: "summarization", weight: 0.5 },
    ],
  },
  {
    id: "multimodal_refs",
    label: { es: "Referencias a imágenes, video o audio", en: "References to images, video, or audio" },
    test: (c) => RE.multimodalRef.test(c.text),
    contributes: [{ category: "multimodal", weight: 2.5 }],
  },
  {
    id: "strict_json",
    label: { es: "Salida JSON o schema estricto", en: "Strict JSON or schema output" },
    test: (c) => RE.jsonStrict.test(c.text),
    contributes: [{ category: "dataExtraction", weight: 2.5 }],
  },
  {
    id: "tabular_extraction",
    label: { es: "Extracción de datos tabulares", en: "Tabular data extraction" },
    test: (c) => RE.tabularData.test(c.text) && (RE.jsonStrict.test(c.text) || /\b(extrae[er]?|extract|parse)\b/i.test(c.text)),
    contributes: [{ category: "dataExtraction", weight: 1.5 }],
  },
  {
    id: "creative_writing",
    label: { es: "Escritura creativa", en: "Creative writing" },
    test: (c) => RE.creativeWriting.test(c.text),
    contributes: [{ category: "creativeWriting", weight: 2.5 }],
  },
  {
    id: "marketing_copy",
    label: { es: "Copy de marketing", en: "Marketing copy" },
    test: (c) => RE.marketingCopy.test(c.text),
    contributes: [{ category: "marketing", weight: 2.5 }],
  },
  {
    id: "translation_task",
    label: { es: "Traducción", en: "Translation" },
    test: (c) => RE.translation.test(c.text),
    contributes: [{ category: "translation", weight: 2.5 }],
  },
  {
    id: "summarization_task",
    label: { es: "Resumen de contenido", en: "Content summarization" },
    test: (c) => RE.summarization.test(c.text),
    contributes: [{ category: "summarization", weight: 2.5 }],
  },
  {
    id: "tutoring_task",
    label: { es: "Aprendizaje o tutoría", en: "Learning or tutoring" },
    test: (c) => RE.tutoring.test(c.text),
    contributes: [{ category: "tutoring", weight: 2 }],
  },
  {
    id: "image_generation",
    label: { es: "Generación de imágenes", en: "Image generation" },
    test: (c) => RE.imageGen.test(c.text),
    contributes: [{ category: "imagePrompts", weight: 3 }],
  },
  {
    id: "complex_reasoning",
    label: { es: "Razonamiento complejo", en: "Complex reasoning" },
    test: (c) => RE.complexReasoning.test(c.text),
    contributes: [{ category: "complexReasoning", weight: 2 }],
  },
  {
    id: "quick_lightweight",
    label: { es: "Tarea corta y liviana", en: "Short, lightweight task" },
    test: (c) => c.wordCount <= 30 && RE.quickTask.test(c.text),
    contributes: [{ category: "fastLightweight", weight: 2 }],
  },
];

// ── Profile thresholds ──────────────────────────────────────────────────────

/**
 * Interaction profile derivation from category evidence. Order matters:
 * the first threshold met wins; "chat" is the default.
 */
export const PROFILE_RULES: Array<{
  profile: InteractionProfile;
  category: MatchCategory;
  minEvidence: number;
}> = [
  { profile: "codingAgent", category: "codingAgent", minEvidence: 3 },
  { profile: "researchAssistant", category: "research", minEvidence: 3 },
  { profile: "multimodalAssistant", category: "multimodal", minEvidence: 2.5 },
  { profile: "codeSpecialist", category: "coding", minEvidence: 3 },
];

// ── Confidence thresholds ───────────────────────────────────────────────────

export const CONFIDENCE_RULES = {
  /** Below this total evidence the matcher refuses to claim certainty. */
  lowEvidenceBelow: 3,
  /** Total evidence + margin needed for high confidence. */
  highEvidenceAtLeast: 6,
  highMarginAtLeast: 8,
  /** Top-2 score gap (0-100 scale) at or below which it's a tie. */
  tieMarginAtMost: 3,
} as const;

/** Baseline evidence for plain conversational prompts with no strong signal. */
export const CHAT_BASELINE_EVIDENCE = 1;

export function signalLabel(def: SignalDef, lang: Lang): string {
  return lang === "es" ? def.label.es : def.label.en;
}
