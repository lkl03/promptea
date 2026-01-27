import type { Lang, TargetAI, TaskType } from "../promptTemplates";
import { targetTip } from "../promptTemplates";
import type { Features, Recommendation } from "./types";

export function buildRecommendations(task: TaskType, lang: Lang, target: TargetAI, f: Features): Recommendation[] {
  const es = lang === "es";
  const recs: Recommendation[] = [];
  const push = (r: Recommendation) => recs.push(r);

  if (!f.hasGoal) {
    push({
      title: es ? "Decí el objetivo en una frase" : "State your goal in one sentence",
      detail: es ? "Ej: “Quiero lograr X” (así la IA apunta directo)." : 'Example: "My goal is X" (so it aims correctly).',
      impact: "high",
    });
  }
  if (!f.hasInputs) {
    push({
      title: es ? "Agregá datos de entrada" : "Add input data",
      detail: es ? "Pegá texto/datos/logs/código con lo que debe trabajar." : "Paste the text/data/logs/code it should work with.",
      impact: "high",
    });
  }
  if (!f.hasOutputFormat) {
    push({
      title: es ? "Pedí un formato de salida" : "Request an output format",
      detail: es ? "Viñetas / pasos / tabla / JSON según lo que necesites." : "Bullets / steps / table / JSON depending on your need.",
      impact: "high",
    });
  }
  if (!f.hasConstraints) {
    push({
      title: es ? "Sumá límites simples" : "Add simple constraints",
      detail: es ? "Tono, largo, qué evitar, y supuestos permitidos." : "Tone, length, what to avoid, allowed assumptions.",
      impact: "medium",
    });
  }
  if (!f.hasSuccessCriteria) {
    push({
      title: es ? "Agregá criterios de éxito" : "Add success criteria",
      detail: es ? "2–3 checks: qué tiene que incluir y qué NO." : "2–3 checks: what it must include and must NOT.",
      impact: "medium",
    });
  }

  if (task === "debugging") {
    push({
      title: es ? "Incluí el error exacto y cómo reproducir" : "Include the exact error and repro steps",
      detail: es ? "Logs/stack + 2–4 pasos para reproducir el problema." : "Logs/stack + 2–4 steps to reproduce the issue.",
      impact: "high",
    });
  }

  if (task === "research") {
    push({
      title: es ? "Pedí fuentes y período" : "Request sources and timeframe",
      detail: es ? "Ej: últimos 12 meses + links a fuentes." : "E.g., last 12 months + links to sources.",
      impact: "high",
    });
  }

  if (task === "data_extraction") {
    push({
      title: es ? "Definí campos + JSON estricto" : "Define fields + strict JSON",
      detail: es ? "Listá campos requeridos y ejemplo de salida." : "List required fields and an output example.",
      impact: "high",
    });
  }

  push({
    title: es ? "Ajuste para tu IA" : "Tune for your target AI",
    detail: targetTip(target, lang),
    impact: "medium",
  });

  return recs.slice(0, 6);
}