import type { Lang, TargetAI, TaskType } from "../promptTemplates";
import { targetTip } from "../promptTemplates";
import type { Features, Recommendation } from "./types";
import { pick } from "@/lib/domain";

export function buildRecommendations(task: TaskType, lang: Lang, target: TargetAI, f: Features): Recommendation[] {
  const recs: Recommendation[] = [];
  const push = (r: Recommendation) => recs.push(r);

  if (!f.hasGoal) {
    push({
      title: pick(lang, {
        es: "Decí el objetivo en una frase",
        en: "State your goal in one sentence",
        pt: "Diga o seu objetivo em uma frase",
        zh: "State your goal in one sentence",
      }),
      detail: pick(lang, {
        es: "Ej: “Quiero lograr X” (así la IA apunta directo).",
        en: 'Example: "My goal is X" (so it aims correctly).',
        pt: 'Exemplo: "Meu objetivo é X" (para ela mirar no alvo certo).',
        zh: 'Example: "My goal is X" (so it aims correctly).',
      }),
      impact: "high",
    });
  }
  if (!f.hasInputs) {
    push({
      title: pick(lang, { es: "Agregá datos de entrada", en: "Add input data", pt: "Adicione os dados de entrada", zh: "Add input data" }),
      detail: pick(lang, {
        es: "Pegá texto/datos/logs/código con lo que debe trabajar.",
        en: "Paste the text/data/logs/code it should work with.",
        pt: "Cole o texto/os dados/os logs/o código com que ela deve trabalhar.",
        zh: "Paste the text/data/logs/code it should work with.",
      }),
      impact: "high",
    });
  }
  if (!f.hasOutputFormat) {
    push({
      title: pick(lang, { es: "Pedí un formato de salida", en: "Request an output format", pt: "Peça um formato de saída", zh: "Request an output format" }),
      detail: pick(lang, {
        es: "Viñetas / pasos / tabla / JSON según lo que necesites.",
        en: "Bullets / steps / table / JSON depending on your need.",
        pt: "Tópicos / passos / tabela / JSON, conforme a sua necessidade.",
        zh: "Bullets / steps / table / JSON depending on your need.",
      }),
      impact: "high",
    });
  }
  if (!f.hasConstraints) {
    push({
      title: pick(lang, { es: "Sumá límites simples", en: "Add simple constraints", pt: "Adicione restrições simples", zh: "Add simple constraints" }),
      detail: pick(lang, {
        es: "Tono, largo, qué evitar, y supuestos permitidos.",
        en: "Tone, length, what to avoid, allowed assumptions.",
        pt: "Tom, tamanho, o que evitar, suposições permitidas.",
        zh: "Tone, length, what to avoid, allowed assumptions.",
      }),
      impact: "medium",
    });
  }
  if (!f.hasSuccessCriteria) {
    push({
      title: pick(lang, { es: "Agregá criterios de éxito", en: "Add success criteria", pt: "Adicione critérios de sucesso", zh: "Add success criteria" }),
      detail: pick(lang, {
        es: "2–3 checks: qué tiene que incluir y qué NO.",
        en: "2–3 checks: what it must include and must NOT.",
        pt: "2 ou 3 verificações: o que ela deve incluir e o que NÃO deve.",
        zh: "2–3 checks: what it must include and must NOT.",
      }),
      impact: "medium",
    });
  }

  if (task === "debugging") {
    push({
      title: pick(lang, {
        es: "Incluí el error exacto y cómo reproducir",
        en: "Include the exact error and repro steps",
        pt: "Inclua o erro exato e os passos para reproduzir",
        zh: "Include the exact error and repro steps",
      }),
      detail: pick(lang, {
        es: "Logs/stack + 2–4 pasos para reproducir el problema.",
        en: "Logs/stack + 2–4 steps to reproduce the issue.",
        pt: "Logs/stack + de 2 a 4 passos para reproduzir o problema.",
        zh: "Logs/stack + 2–4 steps to reproduce the issue.",
      }),
      impact: "high",
    });
  }

  if (task === "research") {
    push({
      title: pick(lang, { es: "Pedí fuentes y período", en: "Request sources and timeframe", pt: "Peça fontes e período", zh: "Request sources and timeframe" }),
      detail: pick(lang, {
        es: "Ej: últimos 12 meses + links a fuentes.",
        en: "E.g., last 12 months + links to sources.",
        pt: "Ex.: últimos 12 meses + links para as fontes.",
        zh: "E.g., last 12 months + links to sources.",
      }),
      impact: "high",
    });
  }

  if (task === "data_extraction") {
    push({
      title: pick(lang, {
        es: "Definí campos + JSON estricto",
        en: "Define fields + strict JSON",
        pt: "Defina os campos + JSON estrito",
        zh: "Define fields + strict JSON",
      }),
      detail: pick(lang, {
        es: "Listá campos requeridos y ejemplo de salida.",
        en: "List required fields and an output example.",
        pt: "Liste os campos obrigatórios e um exemplo de saída.",
        zh: "List required fields and an output example.",
      }),
      impact: "high",
    });
  }

  push({
    title: pick(lang, { es: "Ajuste para tu IA", en: "Tune for your target AI", pt: "Ajuste para a sua IA de destino", zh: "Tune for your target AI" }),
    detail: targetTip(target, lang),
    impact: "medium",
  });

  return recs.slice(0, 6);
}