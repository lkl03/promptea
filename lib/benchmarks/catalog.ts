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
  general: { es: "Inteligencia general", en: "General intelligence", pt: "Inteligência geral", zh: "通用智能" },
  coding: { es: "Programación", en: "Coding", pt: "Programação", zh: "编程" },
  agents: { es: "Agentes y herramientas", en: "Agents and tools", pt: "Agentes e ferramentas", zh: "智能体与工具" },
  science: { es: "Razonamiento científico", en: "Scientific reasoning", pt: "Raciocínio científico", zh: "科学推理" },
  search: { es: "Búsqueda", en: "Search", pt: "Busca", zh: "搜索" },
  design: { es: "Diseño y UI", en: "Design and UI", pt: "Design e UI", zh: "设计与UI" },
};

const AA_LIMITS = {
  es: "Es un índice compuesto: combina varias evaluaciones de terceros con la ponderación que define Artificial Analysis, y cambia entre versiones. Sirve para comparar modelos dentro del mismo índice, no para predecir el resultado en tu tarea concreta.",
  en: "It is a composite index: it combines several third-party evaluations with weights chosen by Artificial Analysis, and it changes between versions. Use it to compare models within the same index, not to predict results on your specific task.",
  pt: "É um índice composto: combina várias avaliações de terceiros com pesos escolhidos pela Artificial Analysis e muda de uma versão para outra. Use-o para comparar modelos dentro do mesmo índice, não para prever resultados na sua tarefa específica.",
  zh: "这是一个综合指数：它按Artificial Analysis设定的权重合并多项第三方评测，并且会随版本变化。适合在同一指数内比较模型，不适合用来预测你具体任务上的结果。",
};

const STATIC_DEFS: BenchmarkDef[] = [
  {
    key: "aa:intelligence",
    category: "general",
    source: "artificial-analysis",
    label: { es: "Intelligence Index", en: "Intelligence Index", pt: "Intelligence Index", zh: "Intelligence Index" },
    metric: "index",
    metricLabel: { es: "Índice compuesto (más alto es mejor)", en: "Composite index (higher is better)", pt: "Índice composto (quanto maior, melhor)", zh: "综合指数（越高越好）" },
    measures: {
      es: "Capacidad general: agrega evaluaciones de razonamiento, conocimiento, matemática y programación en un solo índice.",
      en: "General capability: aggregates reasoning, knowledge, math and coding evaluations into a single index.",
      pt: "Capacidade geral: agrega avaliações de raciocínio, conhecimento, matemática e programação em um único índice.",
      zh: "通用能力：把推理、知识、数学和编程评测汇总成一个指数。",
    },
    limitations: AA_LIMITS,
    frontier: true,
  },
  {
    key: "aa:coding",
    category: "coding",
    source: "artificial-analysis",
    label: { es: "Coding Index", en: "Coding Index", pt: "Coding Index", zh: "Coding Index" },
    metric: "index",
    metricLabel: { es: "Índice compuesto (más alto es mejor)", en: "Composite index (higher is better)", pt: "Índice composto (quanto maior, melhor)", zh: "综合指数（越高越好）" },
    measures: {
      es: "Programación: agrega evaluaciones de generación y resolución de código.",
      en: "Coding: aggregates code generation and problem-solving evaluations.",
      pt: "Programação: agrega avaliações de geração de código e resolução de problemas.",
      zh: "编程：汇总代码生成和问题求解评测。",
    },
    limitations: AA_LIMITS,
    frontier: true,
  },
  {
    key: "aa:agentic",
    category: "agents",
    source: "artificial-analysis",
    label: { es: "Agentic Index", en: "Agentic Index", pt: "Agentic Index", zh: "Agentic Index" },
    metric: "index",
    metricLabel: { es: "Índice compuesto (más alto es mejor)", en: "Composite index (higher is better)", pt: "Índice composto (quanto maior, melhor)", zh: "综合指数（越高越好）" },
    measures: {
      es: "Trabajo agéntico: agrega evaluaciones de uso de herramientas y tareas de varios pasos.",
      en: "Agentic work: aggregates tool-use and multi-step task evaluations.",
      pt: "Trabalho agêntico: agrega avaliações de uso de ferramentas e de tarefas em várias etapas.",
      zh: "智能体任务：汇总工具调用和多步骤任务评测。",
    },
    limitations: AA_LIMITS,
    frontier: true,
  },
  {
    key: "or:gpqa_diamond",
    category: "science",
    source: "openrouter",
    label: { es: "GPQA Diamond", en: "GPQA Diamond", pt: "GPQA Diamond", zh: "GPQA Diamond" },
    metric: "accuracy",
    metricLabel: { es: "Precisión: % de respuestas correctas", en: "Accuracy: % correct answers", pt: "Acurácia: % de respostas corretas", zh: "准确率：回答正确的百分比" },
    measures: {
      es: "Preguntas de opción múltiple de biología, física y química a nivel de posgrado, difíciles de responder buscando en la web. Corrida por OpenRouter.",
      en: "Graduate-level multiple-choice questions in biology, physics and chemistry that are hard to answer by searching the web. Run by OpenRouter.",
      pt: "Questões de múltipla escolha de nível de pós-graduação em biologia, física e química, difíceis de responder pesquisando na web. Executado pela OpenRouter.",
      zh: "研究生水平的生物、物理和化学选择题，很难通过上网搜索找到答案。由OpenRouter运行。",
    },
    limitations: {
      es: "Es de opción múltiple y de un solo dominio (ciencias); los mejores modelos ya puntúan muy alto, así que las diferencias pequeñas pueden caer dentro del margen de variación entre corridas.",
      en: "Multiple choice and single-domain (science); top models already score very high, so small gaps can fall within run-to-run variation.",
      pt: "Múltipla escolha e de um só domínio (ciência); os melhores modelos já pontuam muito alto, então diferenças pequenas podem estar dentro da variação entre execuções.",
      zh: "题型为选择题，且只覆盖一个领域（科学）；顶尖模型的得分已经很高，因此微小的差距可能落在不同运行之间的波动范围内。",
    },
    frontier: true,
  },
  {
    key: "or:tau_bench_verified_airline",
    category: "agents",
    source: "openrouter",
    label: { es: "τ-bench (verificado, aerolínea)", en: "τ-bench (verified, airline)", pt: "τ-bench (verified, airline)", zh: "τ-bench（已验证，航空公司）" },
    metric: "accuracy",
    metricLabel: { es: "Precisión: % de tareas resueltas", en: "Accuracy: % of tasks solved", pt: "Acurácia: % de tarefas resolvidas", zh: "准确率：完成任务的百分比" },
    measures: {
      es: "Un agente atiende a un usuario simulado de una aerolínea usando herramientas y siguiendo políticas. Corrida por OpenRouter.",
      en: "An agent serves a simulated airline customer using tools while following policies. Run by OpenRouter.",
      pt: "Um agente atende um cliente simulado de uma companhia aérea usando ferramentas e seguindo políticas. Executado pela OpenRouter.",
      zh: "智能体在遵守规则的前提下使用工具，为一位模拟的航空公司客户提供服务。由OpenRouter运行。",
    },
    limitations: {
      es: "Cubre un solo dominio (aerolínea) con un usuario simulado; no mide otros tipos de agentes ni integraciones reales.",
      en: "Covers a single domain (airline) with a simulated user; it does not measure other kinds of agents or real integrations.",
      pt: "Cobre um único domínio (companhia aérea) com um usuário simulado; não mede outros tipos de agentes nem integrações reais.",
      zh: "只覆盖一个领域（航空公司），使用模拟用户；不衡量其他类型的智能体，也不衡量真实的集成。",
    },
    frontier: true,
  },
];

const SEARCH_LABELS: Record<string, Record<Lang, string>> = {
  search_browsecomp: { es: "BrowseComp (búsqueda)", en: "BrowseComp (search)", pt: "BrowseComp (busca)", zh: "BrowseComp（搜索）" },
  search_hle: { es: "Humanity's Last Exam (búsqueda)", en: "Humanity's Last Exam (search)", pt: "Humanity's Last Exam (busca)", zh: "Humanity's Last Exam（搜索）" },
  search_dsqa: { es: "DSQA (búsqueda)", en: "DSQA (search)", pt: "DSQA (busca)", zh: "DSQA（搜索）" },
  search_widesearch: { es: "WideSearch (búsqueda)", en: "WideSearch (search)", pt: "WideSearch (busca)", zh: "WideSearch（搜索）" },
};

function searchDef(type: string, metric: "accuracy" | "f1_by_item"): BenchmarkDef {
  return {
    key: `or:${type}`,
    category: "search",
    source: "openrouter",
    label: SEARCH_LABELS[type] ?? { es: type, en: type, pt: type, zh: type },
    metric: metric === "f1_by_item" ? "f1" : "accuracy",
    metricLabel:
      metric === "f1_by_item"
        ? { es: "F1 por ítem (más alto es mejor)", en: "F1 by item (higher is better)", pt: "F1 por item (quanto maior, melhor)", zh: "按条目计算的F1（越高越好）" }
        : { es: "Precisión: % de respuestas correctas", en: "Accuracy: % correct answers", pt: "Acurácia: % de respostas corretas", zh: "准确率：回答正确的百分比" },
    measures: {
      es: "Benchmark de búsqueda de OpenRouter: el modelo responde usando una herramienta de búsqueda web.",
      en: "OpenRouter search benchmark: the model answers using a web-search tool.",
      pt: "Benchmark de busca da OpenRouter: o modelo responde usando uma ferramenta de busca na web.",
      zh: "OpenRouter的搜索基准测试：模型借助网页搜索工具作答。",
    },
    limitations: {
      es: "OpenRouter publica la configuración con mejor puntaje de cada modelo (motor de búsqueda, superficie, esfuerzo), así que el resultado depende también de esa configuración, no solo del modelo.",
      en: "OpenRouter publishes each model's best-scoring configuration (search engine, surface, effort), so the result also depends on that configuration, not only on the model.",
      pt: "A OpenRouter publica a configuração de melhor pontuação de cada modelo (buscador, superfície, esforço), então o resultado também depende dessa configuração, não só do modelo.",
      zh: "OpenRouter公布的是每个模型得分最高的配置（搜索引擎、调用方式、推理强度），因此结果也取决于这套配置，而不只取决于模型本身。",
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
    label: { es: `Design Arena · ${pretty}`, en: `Design Arena · ${pretty}`, pt: `Design Arena · ${pretty}`, zh: `Design Arena · ${pretty}` },
    metric: "elo",
    metricLabel: { es: "Elo (más alto es mejor; relativo a esta arena)", en: "Elo (higher is better; relative to this arena)", pt: "Elo (quanto maior, melhor; relativo a esta arena)", zh: "Elo（越高越好；仅相对于本竞技场）" },
    measures: {
      es: "Comparaciones cara a cara votadas por personas: qué resultado visual prefieren entre dos modelos para la misma consigna.",
      en: "Head-to-head comparisons voted by people: which visual result they prefer between two models for the same brief.",
      pt: "Comparações diretas votadas por pessoas: qual resultado visual elas preferem entre dois modelos para o mesmo briefing.",
      zh: "由真人投票的一对一比较：针对同一需求，两个模型的视觉结果中他们更喜欢哪一个。",
    },
    limitations: {
      es: "Mide preferencia, no corrección. El Elo solo es comparable dentro de la misma arena y categoría.",
      en: "Measures preference, not correctness. Elo is only comparable within the same arena and category.",
      pt: "Mede preferência, não correção. O Elo só é comparável dentro da mesma arena e categoria.",
      zh: "衡量的是偏好，而不是正确性。Elo只能在同一竞技场、同一类别内比较。",
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
  // v1.8.6
  qwen: { modelPage: "qwen", target: "qwen" },
  "z-ai": { modelPage: "glm", target: "glm" },
  minimax: { modelPage: "minimax", target: "minimax" },
};
