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

export function scorePrompt(taskType: TaskType, target: TargetAI, f: Features, lang: Lang): Scored {
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
    return clamp(base + boost);
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

  // weights (más o menos estables)
  const score =
    0.22 * clarity +
    0.22 * context +
    0.20 * constraints +
    0.20 * output +
    0.08 * verifiability +
    0.08 * safety;

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

