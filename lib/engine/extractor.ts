import { normalizeText } from "./normalize";

const SECTION_HEADERS = [
  /^prompt-evaluator\s*:/i,
  /^prompt evaluator\s*:/i,
  /^<prompt_evaluator\b/i,

  /^model\s*:/i,
  /^instructions\s*:/i,
  /^(task|tarea)\s*:/i,
  /^(output format|formato de salida)\s*:/i,
  /^(recommended format|formato recomendado)\s*:/i,
  /^(constraints|restricciones|límites|limites)\s*:/i,
  /^(success criteria|criterios de (éxito|exito))\s*:/i,
  /^(questions|preguntas)\s*:/i,
  /^if you lack information/i,
  /^si te falta información/i,
];

function isHeader(line: string) {
  const t = line.trim();
  return SECTION_HEADERS.some((re) => re.test(t));
}

/**
 * Detecta si el input YA es un scaffold (PromptEvaluator v2 o Claude XML).
 * FIX: detección por líneas (antes fallaba por ^ anclado al inicio del string).
 */
export function detectStructured(input: string) {
  const s = normalizeText(input);

  // Caso Claude XML
  if (/<prompt_evaluator\b/i.test(s) || /<task><!\[cdata\[/i.test(s)) return true;

  const lines = s.split("\n");
  let hits = 0;

  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;

    if (SECTION_HEADERS.some((re) => re.test(t))) {
      hits++;
      if (hits >= 2) return true; // 2+ headers => scaffold
    }
  }

  return false;
}

export function extractCorePrompt(input: string): { core: string; extracted: boolean } {
  const raw = normalizeText(input);

  // 1) Claude XML con CDATA
  const xmlCdata = raw.match(/<task><!\[cdata\[\s*([\s\S]*?)\s*\]\]><\/task>/i);
  if (xmlCdata?.[1]) return { core: normalizeText(xmlCdata[1]), extracted: true };

  // 2) Regex: TASK/Tarea hasta próximo header
  const taskRe =
    /(^|\n)\s*(task|tarea)\s*:\s*\n?([\s\S]*?)(?=\n\s*(prompt-evaluator|prompt evaluator|model|instructions|output format|formato de salida|recommended format|formato recomendado|constraints|restricciones|límites|limites|success criteria|criterios de (éxito|exito)|questions|preguntas|if you lack information|si te falta información)\s*:?|\n\s*$|$)/i;

  const m = raw.match(taskRe);
  if (m?.[3]) {
    const core = normalizeText(m[3]);
    if (core) return { core, extracted: true };
  }

  // 3) State machine: si hay TASK explícito, nos quedamos SOLO con su bloque
  const lines = raw.split("\n");
  let inTask = false;
  const taskLines: string[] = [];

  for (const line of lines) {
    const t = line.trim();

    if (/^(task|tarea)\s*:/i.test(t)) {
      inTask = true;
      continue;
    }

    if (!t) {
      if (inTask) taskLines.push(line);
      continue;
    }

    if (inTask && isHeader(t)) break;

    if (inTask) taskLines.push(line);
  }

  const taskCandidate = normalizeText(taskLines.join("\n"));
  if (taskCandidate) return { core: taskCandidate, extracted: true };

  // 4) Fallback: eliminar scaffolds conocidos
  const blacklist = [
    /^prompt-evaluator\s*:/i,
    /^prompt evaluator\s*:/i,
    /^<prompt_evaluator\b/i,
    /^<\/prompt_evaluator>/i,
    /^<output_format\b/i,
    /^<\/output_format>/i,

    /^model\s*:/i,
    /^instructions\s*:/i,
    /^act as\b/i,
    /^actuá como\b/i,
    /^actua como\b/i,
    /^answer exclusively\b/i,
    /^respond(e|é) exclusivamente\b/i,
    /^(output format|formato de salida)\s*:/i,
    /^(recommended format|formato recomendado)\s*:/i,
    /^(constraints|restricciones|límites|limites)\s*:/i,
    /^(success criteria|criterios de (éxito|exito))\s*:/i,
    /^if you lack information/i,
    /^si te falta información/i,
  ];

  const kept: string[] = [];
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    if (blacklist.some((re) => re.test(t))) continue;
    kept.push(line);
  }

  const candidate = normalizeText(kept.join("\n"));
  if (candidate && candidate.length < raw.length) return { core: candidate, extracted: true };

  return { core: raw, extracted: false };
}