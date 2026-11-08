// lib/engine/signals.ts
//
// v1.8.0 (engine 2.3.0): shared signal detectors.
//
// Before 2.3.0 the linter (findings) and the feature extractor (score) each
// had their own regex for "does this prompt state a goal?" and "does it ask
// for an output format?". They disagreed: "Write a LinkedIn post…" scored a
// goal but was ALSO flagged `missing_goal`. Both now read the same detectors.
//
// Word boundaries: JS `\b` treats accented letters as non-word characters, so
// `/\bescribí\b/` never matched "escribí un…". Every pattern here uses
// Unicode-aware letter lookarounds instead (see `words`).

import type { TaskType } from "@/lib/domain";

const L = "\\p{L}\\p{N}_";

/** Build a case-insensitive Unicode regex matching any alternative as a whole word. */
export function words(alternation: string): RegExp {
  return new RegExp(`(?<![${L}])(?:${alternation})(?![${L}])`, "iu");
}

// Imperative / request verbs (ES voseo + tú + infinitive, EN imperative).
const GOAL_VERBS = words(
  [
    // EN
    "write|rewrite|draft|create|make|build|generate|design|produce|compose",
    "give me|tell me|help me|show me|walk me through|teach me|let me know",
    "explain|summari[sz]e|translate|extract|parse|convert|transform|format",
    "fix|debug|refactor|implement|migrate|add|update|remove|delete|rename|review|audit",
    "analy[sz]e|compare|research|investigate|find|list|plan|outline|propose|suggest|recommend",
    "improve|optimi[sz]e|polish|shorten|expand|answer|reply|respond|describe|teach|calculate",
    "classify|evaluate|assess|invite|draw|paint|illustrate|render|brainstorm",
    "i want|i need|i'?d like|i'?m trying to|my goal is|goal|objective|can you|could you|please",
    // ES
    "quiero|quisiera|necesito|busco|objetivo|meta|me gustar[ií]a",
    "escrib[ií]|escribe|escribir|escribile|escribime|escr[ií]beme|redact[aá]|redactar|red[aá]ctame",
    "reescrib[ií]|reescribe|reescribir|cre[aá]|crear|creame|cr[eé]ame|hac[eé]|haceme|hazme|hacer|haz",
    "arm[aá]|armar|armame|gener[aá]|generar|generame|gen[eé]rame|dise[nñ][aá]|dise[nñ]ar",
    "dame|decime|dime|contame|cu[eé]ntame|mostrame|mu[eé]strame|ayudame|ay[uú]dame|ayudar",
    "explic[aá]|explicame|expl[ií]came|explicar|res[uú]m[ií]|resume|resumime|resumir|res[uú]meme",
    "traduc[ií]|traduce|traducime|trad[uú]ceme|traducir|extra[eé]|extraer|convert[ií]|convertir",
    "arregl[aá]|arreglar|correg[ií]|corregir|implement[aá]|implementar|migr[aá]|migrar",
    "agreg[aá]|agregar|a[nñ]ad[ií]|actualiz[aá]|actualizar|elimin[aá]|sac[aá]|revis[aá]|revisar",
    "analiz[aá]|analizar|compar[aá]|comparar|investig[aá]|investigar|busc[aá]|buscar|list[aá]",
    "planific[aá]|planificar|suger[ií]|sugerime|recomend[aá]|recomendame|mejor[aá]|mejora|mejorar",
    "optimiz[aá]|optimizar|respond[eé]|responde|responder|contest[aá]|contestar|describ[ií]|describir",
    "ense[nñ]ame|calcul[aá]|calcular|clasific[aá]|propon[eé]|proponer|evalu[aá]|evaluar",
    "invitar|dibuj[aá]|dibujar|pint[aá]|pintar|ilustr[aá]|ilustrar|pod[eé]s|podr[ií]as|por favor",
  ].join("|")
);

/**
 * True when the prompt states what it wants: an imperative/request verb, an
 * explicit goal marker, or — for image generation — a description of what to
 * depict (a noun phrase IS the goal of an image prompt).
 */
export function hasGoalSignal(text: string, taskType?: TaskType | string): boolean {
  const src = String(text ?? "");
  if (GOAL_VERBS.test(src)) return true;
  if (/(?:^|\n)\s*(goal|objective|objetivo|meta|task|tarea)\s*:/i.test(src)) return true;
  if (String(taskType) === "image") {
    const n = src.trim().split(/\s+/).filter(Boolean).length;
    return n >= 3;
  }
  return false;
}

const NUMBER_WORDS =
  "\\d+|one|two|three|four|five|six|seven|eight|nine|ten|twelve|un|una|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|doce";
const OUTPUT_UNITS =
  "palabras|words|caracteres|characters|chars|l[ií]neas|lines|p[aá]rrafos?|paragraphs?|oraciones|sentences|" +
  "variantes|variants|versiones|versions|headlines|titulares|t[ií]tulos|titles|asuntos|subject lines|" +
  "bullets?|vi[nñ]etas|puntos|points|preguntas|questions|ejemplos|examples|ideas|opciones|options|" +
  "pasos|steps|secciones|sections|slides|diapositivas|tweets|posts|items|[ií]tems|alternativas|alternatives";

const COUNT_WITH_UNIT = new RegExp(
  `(?<![\\p{L}])(?:${NUMBER_WORDS})(?:\\s+|-)(?:[\\p{L}-]+\\s+){0,2}(?:${OUTPUT_UNITS})(?![\\p{L}])`,
  "iu"
);
const N_QUESTION = /\d+[- ](question|pregunta|item|ítem|step|paso)s?\b/i;
const OUTPUT_LABEL = /(?:^|\n|\.\s)\s*(output|salida|formato|format|entregable|deliverable|response format|formato de respuesta)\s*:/i;

/**
 * Output spec written without the words "format"/"JSON"/"table": a count plus
 * a unit ("3 headlines", "max 120 words", "5 practice questions"), an
 * `Output:` label, or an N-question quiz. These are concrete deliverables and
 * must not be flagged `missing_output_format`.
 */
export function hasImplicitOutputSpec(text: string): boolean {
  const src = String(text ?? "");
  return COUNT_WITH_UNIT.test(src) || N_QUESTION.test(src) || OUTPUT_LABEL.test(src);
}

// ---------------------------------------------------------------------------
// Image prompts
// ---------------------------------------------------------------------------

/** "no people", "sin texto", "without logos", "avoid…", "evitar…", "--no". */
export const IMAGE_NEGATIVE_RE = words(
  "no|sin|without|avoid|avoiding|evit[aá]|evitar|nada de|excepto|except|--no|negative prompt|prompt negativo"
);

const IMAGE_SPEC_RE = words(
  [
    "aspect ratio|relaci[oó]n de aspecto|--ar|\\d{1,2}:\\d{1,2}|square|cuadrad[ao]|vertical|horizontal|portrait|landscape|panor[aá]mic[ao]",
    "photo|photograph|photorealistic|fotograf[ií]a|foto|fotorrealista|illustration|ilustraci[oó]n|watercolor|acuarela",
    "oil painting|[oó]leo|vector|pixel art|3d|render|anime|cartoon|sketch|boceto|line art|isometric|isom[eé]trico|cinematic|cinematogr[aá]fico",
    "poster|p[oó]ster|logo|icon|[ií]cono|sticker|wallpaper|fondo de pantalla",
  ].join("|")
);

/** An image prompt's "output format" is its medium/style or aspect ratio. */
export function hasImageOutputSpec(text: string): boolean {
  return IMAGE_SPEC_RE.test(String(text ?? ""));
}

// ---------------------------------------------------------------------------
// Coding specs
// ---------------------------------------------------------------------------

// v1.8.0: engineering-spec signals for coding tasks.
export const CODE_CONSTRAINT_RE =
  /\b(python|node|typescript|java|go|php|ruby|react|next\.?js|django|fastapi|express|spring)\s*v?\d+(\.\d+)*\b|\bv\d+(\.\d+)+\b|\b(with|using|con|usando)\s+(pydantic|zod|sqlalchemy|prisma|postgres(ql)?|mysql|sqlite|redis|tailwind|typescript|jest|vitest|pytest)\b/i;
export const CODE_DELIVERABLE_RE = words(
  "include tests|with tests|unit tests|pytest|jest|vitest|inclu[ií] tests|con tests|tests unitarios|incluí pruebas|con pruebas|docstrings?|readme|type hints|tipado"
);
export const CODE_SUCCESS_RE =
  /\b(devuelva|devolver|retorne|return(s)?|responds?( with)?|responda)\s+(un\s+|an?\s+|with\s+)?(status\s+)?[1-5]\d\d\b|\btests?\s+(pass|pasen)\b|\bexpected:\s/i;
/** A bug report's explicit expectation ("Expected: ...", "expected 200", "debería devolver"). */
export const DEBUG_EXPECTED_RE =
  /\bexpected(:|\s+(result|behaviou?r|output|status|response|\d{3}))|\b(resultado )?esperado:|\bdeber[i\u00ed]a (devolver|responder|mostrar)\b/i;
