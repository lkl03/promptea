import type { Lang, TargetAI } from "../promptTemplates";
import type { Features, TaskType } from "./types";

type Breakdown = {
  clarity: number;
  context: number;
  constraints: number;
  output: number;
  verifiability: number;
  safety: number;
};

type Scored = {
  score: number;
  breakdown: Breakdown;
  confidence: number;
  explain: string[];
};

function clamp(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function t(lang: Lang, es: string, en: string) {
  return lang === "es" ? es : en;
}

function pctFromFlags(hits: number, total: number) {
  if (total <= 0) return 0;
  return clamp((hits / total) * 100);
}

export function scorePrompt(taskType: TaskType, target: TargetAI, f: Features, lang: Lang, intent?: any): Scored {
  // (target reservado para ajustes futuros; hoy no cambia el score)
  const intentStr = String(intent ?? "").toLowerCase();

  // --- component scoring ---
  const clarity = (() => {
    // base por longitud mínima
    const lenScore =
      f.words >= 40 ? 100 :
      f.words >= 25 ? 85 :
      f.words >= 15 ? 65 :
      f.words >= 8 ? 45 : 20;

    const add = (f.hasGoal ? 10 : 0) + (f.hasTone ? 5 : 0);
    return clamp(lenScore + add);
  })();

  const context = (() => {
    const hits = (f.hasInputs ? 1 : 0) + (f.hasAudience ? 1 : 0) + (f.hasExamples ? 1 : 0);
    // en "study" y "code" el contexto pesa más
    const base = pctFromFlags(hits, 3);
    const boost = (taskType === "study" || taskType === "coding") && f.hasExamples ? 8 : 0;

    // Debugging / data_extraction: si no hay material de trabajo (inputs), cap de contexto.
    const needsInputs = intentStr === "debugging" || intentStr === "data_extraction";
    const cap = needsInputs && !f.hasInputs ? 45 : 100;

    return clamp(Math.min(base + boost, cap));
  })();

  const constraints = (() => {
    const hits =
      (f.hasConstraints ? 1 : 0) +
      (f.hasTone ? 1 : 0) +
      (f.hasLengthHint ? 1 : 0) +
      (f.hasTimeframe ? 1 : 0) +
      (f.hasRegion ? 1 : 0);
    return pctFromFlags(hits, 5);
  })();

  const output = (() => {
    const hits = (f.hasOutputFormat ? 1 : 0) + (f.hasSuccessCriteria ? 1 : 0);
    return pctFromFlags(hits, 2);
  })();

  const verifiability = (() => {
    // Más "personalizado" según tipo de tarea detectada.
    if (intentStr === "debugging") {
      const hits = (f.hasErrorDetails ? 1 : 0) + (f.hasReproSteps ? 1 : 0) + (f.hasSuccessCriteria ? 1 : 0);
      return pctFromFlags(hits, 3);
    }

    if (intentStr === "data_extraction") {
      const hits = (f.hasInputs ? 1 : 0) + (f.hasOutputFormat ? 1 : 0) + (f.hasSuccessCriteria ? 1 : 0);
      return pctFromFlags(hits, 3);
    }

    const hits = (f.hasSuccessCriteria ? 1 : 0) + (f.hasErrorDetails ? 1 : 0) + (f.hasReproSteps ? 1 : 0);
    return pctFromFlags(hits, 3);
  })();

  const safety = (() => {
    let s = 100;
    if (f.injectionLike) s -= 40;
    if (f.contradictions) s -= 25;
    if (f.languageMismatch) s -= 15;
    return clamp(s);
  })();

  // weights (ajustados por taskType)
  const weights = (() => {
    // base: suman 1
    switch (taskType) {
      case "study":
        return { clarity: 0.20, context: 0.28, constraints: 0.16, output: 0.16, verifiability: 0.12, safety: 0.08 };
      case "coding":
        return { clarity: 0.18, context: 0.22, constraints: 0.18, output: 0.18, verifiability: 0.16, safety: 0.08 };
      case "data":
        return { clarity: 0.16, context: 0.20, constraints: 0.16, output: 0.28, verifiability: 0.12, safety: 0.08 };
      case "image":
        return { clarity: 0.18, context: 0.24, constraints: 0.18, output: 0.22, verifiability: 0.10, safety: 0.08 };
      case "marketing":
        return { clarity: 0.20, context: 0.22, constraints: 0.22, output: 0.24, verifiability: 0.04, safety: 0.08 };
      default:
        return { clarity: 0.22, context: 0.22, constraints: 0.20, output: 0.20, verifiability: 0.08, safety: 0.08 };
    }
  })();

  const score =
    weights.clarity * clarity +
    weights.context * context +
    weights.constraints * constraints +
    weights.output * output +
    weights.verifiability * verifiability +
    weights.safety * safety;

  // confidence: heurística simple
  const confidence = (() => {
    let c = 55;
    if (f.words >= 30) c += 15;
    if (f.hasGoal) c += 10;
    if (f.hasOutputFormat) c += 8;
    if (f.hasConstraints) c += 8;
    if (f.injectionLike) c -= 20;
    if (f.contradictions) c -= 15;
    return clamp(c);
  })();

  // --- explain lines localized ---
  const explain: string[] = [];

  // Headline
  if (clamp(score) >= 85) {
    explain.push(t(lang, "¡Muy bien! Está claro y debería responder de forma consistente.", "Nice! It’s clear and should respond consistently."));
  } else if (clamp(score) >= 70) {
    explain.push(t(lang, "Buen punto de partida: con pequeños ajustes puede mejorar mucho.", "Good starting point: small tweaks can make it much better."));
  } else if (clamp(score) >= 50) {
    explain.push(t(lang, "Buen comienzo, pero falta estructura para que responda con precisión.", "Good start, but it needs structure to be precise."));
  } else {
    explain.push(t(lang, "Prompt débil: el motor limita el score porque falta información clave.", "Weak prompt: the engine caps the score because key info is missing."));
  }

  // Missing pieces (máximo 3 bullets)
  const bullets: string[] = [];

  if (!f.hasGoal) {
    bullets.push(t(lang, "Falta objetivo: sin “qué querés lograr”, no se puede ser preciso.", "Missing goal: without “what you want to achieve”, it can’t be precise."));
  }
  if (!f.hasOutputFormat) {
    bullets.push(t(lang, "Falta formato de salida: la respuesta puede salir desordenada o inútil.", "Missing output format: the answer may be messy or unusable."));
  }
  if (!f.hasConstraints) {
    bullets.push(t(lang, "Faltan restricciones: sin límites (tono, largo, qué evitar) la respuesta varía mucho.", "Missing constraints: without limits (tone, length, what to avoid) the answer varies a lot."));
  }
  if (!f.hasInputs && (taskType === "data" || taskType === "coding")) {
    bullets.push(t(lang, "Faltan inputs/datos: para esto necesitás indicar formato, ejemplos o datos de entrada.", "Missing inputs/data: for this, you should specify format, examples, or input data."));
  }

  if (intentStr === "debugging" && !f.hasErrorDetails) {
    bullets.push(t(lang, "Para debugging falta el error/logs: sin eso la solución es adivinanza.", "For debugging, the error/logs are missing: without them, the fix is guesswork."));
  }

  if (intentStr === "data_extraction" && !f.hasOutputFormat) {
    bullets.push(t(lang, "Para extracción falta el formato final (JSON/tabla): si no, la salida varía.", "For extraction, the final format (JSON/table) is missing, so outputs vary."));
  }
  if (f.injectionLike) {
    bullets.push(t(lang, "Riesgo de prompt injection: limpiá instrucciones contradictorias o externas.", "Prompt-injection risk: remove contradictory/external instructions."));
  }

  explain.push(...bullets.slice(0, 3));

  return {
    score: clamp(score),
    breakdown: {
      clarity: clamp(clarity),
      context: clamp(context),
      constraints: clamp(constraints),
      output: clamp(output),
      verifiability: clamp(verifiability),
      safety: clamp(safety),
    },
    confidence,
    explain,
  };
}

