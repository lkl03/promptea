// lib/benchmarks/catalog.ts
//
// v1.7.0 — what each benchmark Promptea shows measures, how to read its
// metric, and its known limitations. Descriptions are deliberately limited to
// what the benchmark owners and the OpenRouter API reference state; where we
// know little about a benchmark we say so instead of guessing.
//
// Scores from different benchmarks are NEVER merged: every benchmark is its
// own ranking with its own metric. There is no universal score.

import type { Lang } from "@/lib/domain";

export type BenchmarkCategory = "general" | "coding" | "agents" | "science" | "search" | "design";

export type MetricKind = "index" | "accuracy" | "f1" | "elo";

export type BenchmarkDef = {
  key: string;
  category: BenchmarkCategory;
  source: "artificial-analysis" | "openrouter" | "design-arena";
  label: Record<Lang, string>;
  metric: MetricKind;
  /** Short reading guide for the metric. */
  metricLabel: Record<Lang, string>;
  measures: Record<Lang, string>;
  limitations: Record<Lang, string>;
  /** Counts toward the "frontier model" definition (general capability). */
  frontier: boolean;
};

export const SOURCE_INFO: Record<BenchmarkDef["source"], { name: string; url: string }> = {
  "artificial-analysis": { name: "Artificial Analysis", url: "https://artificialanalysis.ai" },
  openrouter: { name: "OpenRouter", url: "https://openrouter.ai/benchmarks" },
  "design-arena": { name: "Design Arena", url: "https://www.designarena.ai" },
};

export const CATEGORY_LABELS: Record<BenchmarkCategory, Record<Lang, string>> = {
  general: { es: "Inteligencia general", en: "General intelligence" },
  coding: { es: "Programación", en: "Coding" },
  agents: { es: "Agentes y herramientas", en: "Agents and tools" },
  science: { es: "Razonamiento científico", en: "Scientific reasoning" },
  search: { es: "Búsqueda", en: "Search" },
  design: { es: "Diseño y UI", en: "Design and UI" },
};

const AA_LIMITS = {
  es: "Es un índice compuesto: combina varias evaluaciones de terceros con la ponderación que define Artificial Analysis, y cambia entre versiones. Sirve para comparar modelos dentro del mismo índice, no para predecir el resultado en tu tarea concreta.",
  en: "It is a composite index: it combines several third-party evaluations with weights chosen by Artificial Analysis, and it changes between versions. Use it to compare models within the same index, not to predict results on your specific task.",
};

const STATIC_DEFS: BenchmarkDef[] = [
  {
    key: "aa:intelligence",
    category: "general",
    source: "artificial-analysis",
    label: { es: "Intelligence Index", en: "Intelligence Index" },
    metric: "index",
    metricLabel: { es: "Índice compuesto (más alto es mejor)", en: "Composite index (higher is better)" },
    measures: {
      es: "Capacidad general: agrega evaluaciones de razonamiento, conocimiento, matemática y programación en un solo índice.",
      en: "General capability: aggregates reasoning, knowledge, math and coding evaluations into a single index.",
    },
    limitations: AA_LIMITS,
    frontier: true,
  },
  {
    key: "aa:coding",
    category: "coding",
    source: "artificial-analysis",
    label: { es: "Coding Index", en: "Coding Index" },
    metric: "index",
    metricLabel: { es: "Índice compuesto (más alto es mejor)", en: "Composite index (higher is better)" },
    measures: {
      es: "Programación: agrega evaluaciones de generación y resolución de código.",
      en: "Coding: aggregates code generation and problem-solving evaluations.",
    },
    limitations: AA_LIMITS,
    frontier: true,
  },
  {
    key: "aa:agentic",
    category: "agents",
    source: "artificial-analysis",
    label: { es: "Agentic Index", en: "Agentic Index" },
    metric: "index",
    metricLabel: { es: "Índice compuesto (más alto es mejor)", en: "Composite index (higher is better)" },
    measures: {
      es: "Trabajo agéntico: agrega evaluaciones de uso de herramientas y tareas de varios pasos.",
      en: "Agentic work: aggregates tool-use and multi-step task evaluations.",
    },
    limitations: AA_LIMITS,
    frontier: true,
  },
  {
    key: "or:gpqa_diamond",
    category: "science",
    source: "openrouter",
    label: { es: "GPQA Diamond", en: "GPQA Diamond" },
    metric: "accuracy",
    metricLabel: { es: "Precisión: % de respuestas correctas", en: "Accuracy: % correct answers" },
    measures: {
      es: "Preguntas de opción múltiple de biología, física y química a nivel de posgrado, difíciles de responder buscando en la web. Corrida por OpenRouter.",
      en: "Graduate-level multiple-choice questions in biology, physics and chemistry that are hard to answer by searching the web. Run by OpenRouter.",
    },
    limitations: {
      es: "Es de opción múltiple y de un solo dominio (ciencias); los mejores modelos ya puntúan muy alto, así que las diferencias pequeñas pueden caer dentro del margen de variación entre corridas.",
      en: "Multiple choice and single-domain (science); top models already score very high, so small gaps can fall within run-to-run variation.",
    },
    frontier: true,
  },
  {
    key: "or:tau_bench_verified_airline",
    category: "agents",
    source: "openrouter",
    label: { es: "τ-bench (verificado, aerolínea)", en: "τ-bench (verified, airline)" },
    metric: "accuracy",
    metricLabel: { es: "Precisión: % de tareas resueltas", en: "Accuracy: % of tasks solved" },
    measures: {
      es: "Un agente atiende a un usuario simulado de una aerolínea usando herramientas y siguiendo políticas. Corrida por OpenRouter.",
      en: "An agent serves a simulated airline customer using tools while following policies. Run by OpenRouter.",
    },
    limitations: {
      es: "Cubre un solo dominio (aerolínea) con un usuario simulado; no mide otros tipos de agentes ni integraciones reales.",
      en: "Covers a single domain (airline) with a simulated user; it does not measure other kinds of agents or real integrations.",
    },
    frontier: true,
  },
];

const SEARCH_LABELS: Record<string, Record<Lang, string>> = {
  search_browsecomp: { es: "BrowseComp (búsqueda)", en: "BrowseComp (search)" },
  search_hle: { es: "Humanity's Last Exam (búsqueda)", en: "Humanity's Last Exam (search)" },
  search_dsqa: { es: "DSQA (búsqueda)", en: "DSQA (search)" },
  search_widesearch: { es: "WideSearch (búsqueda)", en: "WideSearch (search)" },
};

function searchDef(type: string, metric: "accuracy" | "f1_by_item"): BenchmarkDef {
  return {
    key: `or:${type}`,
    category: "search",
    source: "openrouter",
    label: SEARCH_LABELS[type] ?? { es: type, en: type },
    metric: metric === "f1_by_item" ? "f1" : "accuracy",
    metricLabel:
      metric === "f1_by_item"
        ? { es: "F1 por ítem (más alto es mejor)", en: "F1 by item (higher is better)" }
        : { es: "Precisión: % de respuestas correctas", en: "Accuracy: % correct answers" },
    measures: {
      es: "Benchmark de búsqueda de OpenRouter: el modelo responde usando una herramienta de búsqueda web.",
      en: "OpenRouter search benchmark: the model answers using a web-search tool.",
    },
    limitations: {
      es: "OpenRouter publica la configuración con mejor puntaje de cada modelo (motor de búsqueda, superficie, esfuerzo), así que el resultado depende también de esa configuración, no solo del modelo.",
      en: "OpenRouter publishes each model's best-scoring configuration (search engine, surface, effort), so the result also depends on that configuration, not only on the model.",
    },
    frontier: false,
  };
}

function designDef(arena: string, category: string): BenchmarkDef {
  const pretty = category.replace(/[-_]/g, " ");
  return {
    key: `da:${arena}:${category}`,
    category: "design",
    source: "design-arena",
    label: { es: `Design Arena · ${pretty}`, en: `Design Arena · ${pretty}` },
    metric: "elo",
    metricLabel: { es: "Elo (más alto es mejor; relativo a esta arena)", en: "Elo (higher is better; relative to this arena)" },
    measures: {
      es: "Comparaciones cara a cara votadas por personas: qué resultado visual prefieren entre dos modelos para la misma consigna.",
      en: "Head-to-head comparisons voted by people: which visual result they prefer between two models for the same brief.",
    },
    limitations: {
      es: "Mide preferencia, no corrección. El Elo solo es comparable dentro de la misma arena y categoría.",
      en: "Measures preference, not correctness. Elo is only comparable within the same arena and category.",
    },
    frontier: false,
  };
}

export function getBenchmarkDef(key: string, hints?: { metric?: "accuracy" | "f1_by_item" }): BenchmarkDef | null {
  const fixed = STATIC_DEFS.find((d) => d.key === key);
  if (fixed) return fixed;
  if (key.startsWith("or:search_")) return searchDef(key.slice(3), hints?.metric ?? "accuracy");
  if (key.startsWith("da:")) {
    const [, arena, ...rest] = key.split(":");
    if (arena && rest.length) return designDef(arena, rest.join(":"));
  }
  return null;
}

export const CATEGORY_ORDER: BenchmarkCategory[] = ["general", "coding", "agents", "science", "search", "design"];

export const PROVIDER_LABELS: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google",
  "x-ai": "xAI",
  deepseek: "DeepSeek",
  moonshotai: "Moonshot AI",
  "meta-llama": "Meta",
  mistralai: "Mistral AI",
  qwen: "Qwen",
  "z-ai": "Z.ai",
  minimax: "MiniMax",
  perplexity: "Perplexity",
  cohere: "Cohere",
  amazon: "Amazon",
  microsoft: "Microsoft",
  nvidia: "NVIDIA",
};

/** Promptea's own model guide + Best-AI target for a provider, when we have one. */
export const PROVIDER_TO_PROMPTEA: Record<string, { modelPage: string; target: string }> = {
  openai: { modelPage: "gpt", target: "gpt" },
  anthropic: { modelPage: "claude", target: "claude" },
  google: { modelPage: "gemini", target: "gemini" },
  "x-ai": { modelPage: "grok", target: "grok" },
  deepseek: { modelPage: "deepseek", target: "deepseek" },
  moonshotai: { modelPage: "kimi", target: "kimi" },
};
