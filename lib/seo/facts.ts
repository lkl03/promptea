// lib/seo/facts.ts
//
// The product facts that public copy (home, about, methodology, llms.txt) is
// allowed to state — each one read from the code that implements it, so the
// text cannot promise more than the product does and updates itself when the
// registries change.
//
//   - scoring dimensions  ← lib/engine/scoring.ts (`ScoreBreakdown`)
//   - purposes            ← lib/domain.ts PURPOSES + lib/purposes.ts labels
//   - AI targets / models ← lib/domain.ts TARGETS + lib/models.ts registry
//
// Nothing here invents a number: counts are computed, dates are the registry's
// own `verifiedAt`.

import { PURPOSES, TARGETS, type TargetAI } from "@/lib/domain";
import { MODEL_REGISTRY, type ModelEntry } from "@/lib/models";
import { purposeLabel } from "@/lib/purposes";
import { ENGINE_VERSION } from "@/lib/engine/contract";
import type { Locale } from "./site";

type L = Record<Locale, string>;

/**
 * The six scored dimensions, in the order the engine reports them. The
 * `measures` text restates what lib/engine/scoring.ts actually looks at.
 */
export const SCORE_DIMENSIONS: ReadonlyArray<{ key: "clarity" | "context" | "constraints" | "output" | "verifiability" | "safety"; label: L; measures: L }> = [
  {
    key: "clarity",
    label: { en: "Clarity", es: "Claridad" },
    measures: {
      en: "Is there a stated goal and enough words to say what is wanted? Very short or goal-less requests score low.",
      es: "¿Hay un objetivo explícito y suficiente texto para decir qué se quiere? Los pedidos muy cortos o sin objetivo puntúan bajo.",
    },
  },
  {
    key: "context",
    label: { en: "Context", es: "Contexto" },
    measures: {
      en: "Does the prompt include the material to work on (inputs), say who the answer is for (audience), or give examples?",
      es: "¿Incluye el material sobre el que trabajar (inputs), dice para quién es la respuesta (audiencia) o da ejemplos?",
    },
  },
  {
    key: "constraints",
    label: { en: "Constraints", es: "Restricciones" },
    measures: {
      en: "Are there explicit limits such as tone, length, timeframe, region or rules the answer must respect?",
      es: "¿Hay límites explícitos como tono, largo, plazo, región o reglas que la respuesta deba respetar?",
    },
  },
  {
    key: "output",
    label: { en: "Output format", es: "Formato de salida" },
    measures: {
      en: "Does it say what shape the answer must have (list, table, JSON, steps), and what a good answer looks like?",
      es: "¿Dice qué forma debe tener la respuesta (lista, tabla, JSON, pasos) y cómo se ve una buena respuesta?",
    },
  },
  {
    key: "verifiability",
    label: { en: "Verifiability", es: "Verificabilidad" },
    measures: {
      en: "Can the answer be checked? Success criteria, error details and reproduction steps count here; it weighs most for debugging and code.",
      es: "¿Se puede comprobar la respuesta? Cuentan los criterios de éxito, el detalle del error y los pasos para reproducirlo; pesa más en depuración y código.",
    },
  },
  {
    key: "safety",
    label: { en: "Safety", es: "Seguridad" },
    measures: {
      en: "Starts at 100 and drops for text that looks like a prompt injection, for contradictory instructions and for a language mismatch with the request.",
      es: "Parte de 100 y baja si el texto parece una inyección de prompt, si hay instrucciones contradictorias o si el idioma no coincide con el pedido.",
    },
  },
] as const;

export const SCORE_RANGE = { min: 0, max: 100 } as const;

/** Brand-facing name of each AI family, as users know it. */
export const TARGET_LABEL: Record<TargetAI, string> = {
  gpt: "ChatGPT / GPT (OpenAI)",
  claude: "Claude (Anthropic)",
  gemini: "Gemini (Google)",
  grok: "Grok (xAI)",
  kimi: "Kimi (Moonshot AI)",
  deepseek: "DeepSeek",
  perplexity: "Perplexity",
};

/** Short family names for inline lists. */
export const TARGET_SHORT: Record<TargetAI, string> = {
  gpt: "GPT",
  claude: "Claude",
  gemini: "Gemini",
  grok: "Grok",
  kimi: "Kimi",
  deepseek: "DeepSeek",
  perplexity: "Perplexity",
};

export function purposeList(lang: Locale): string[] {
  return PURPOSES.map((p) => purposeLabel(p, lang));
}

/** Models a user can pick in the analyzer today: selectable and not retired. */
export function currentModels(target?: TargetAI): ModelEntry[] {
  return MODEL_REGISTRY.filter((m) => m.selectable && (m.status === "stable" || m.status === "preview") && (!target || m.target === target));
}

/** Current models grouped by AI family, in TARGETS order, default model first. */
export function currentModelsByTarget(): Array<{ target: TargetAI; models: ModelEntry[] }> {
  return TARGETS.map((target) => ({
    target,
    models: currentModels(target).sort((a, b) => Number(!!b.defaultForTarget) - Number(!!a.defaultForTarget)),
  })).filter((g) => g.models.length > 0);
}

export const ENGINE = { version: ENGINE_VERSION } as const;

/** "1.05M" / "200K" / "—" for a token count. */
export function formatTokens(n: number | null | undefined): string {
  if (!n) return "—";
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

export type ModelSummary = {
  id: string;
  label: string;
  status: ModelEntry["status"];
  default: boolean;
  verifiedAt: string;
  sourceUrl: string;
  context: string;
  maxOutput: string;
  inputs: string;
  outputs: string;
  latency: string;
  structuredOutput: boolean;
  toolUse: boolean;
  nativeSearch: boolean;
  strengths: string[];
  note: string;
  promptGuidance: string;
};

const LATENCY_LABEL: Record<"fast" | "balanced" | "slow", Record<Locale, string>> = {
  fast: { en: "fast", es: "rápido" },
  balanced: { en: "balanced", es: "equilibrado" },
  slow: { en: "slower (deliberate)", es: "más lento (deliberado)" },
};

const STRENGTH_LABEL: Record<ModelEntry["strengths"][number], Record<Locale, string>> = {
  reasoning: { en: "reasoning", es: "razonamiento" },
  coding: { en: "coding", es: "código" },
  writing: { en: "writing", es: "escritura" },
  data: { en: "data", es: "datos" },
  multimodal: { en: "multimodal", es: "multimodal" },
  long_context: { en: "long context", es: "contexto largo" },
  speed: { en: "speed", es: "velocidad" },
  creativity: { en: "creativity", es: "creatividad" },
  search: { en: "search", es: "búsqueda" },
};

/** Everything a page, the markdown twin and llms.txt may say about one registry entry. */
export function modelSummary(m: ModelEntry, lang: Locale): ModelSummary {
  const c = m.capabilities;
  return {
    id: m.id,
    label: m.label,
    status: m.status,
    default: !!m.defaultForTarget,
    verifiedAt: m.verifiedAt,
    sourceUrl: m.sourceUrl,
    context: formatTokens(c?.contextWindowTokens),
    maxOutput: formatTokens(c?.maxOutputTokens),
    inputs: (c?.inputModalities ?? []).join(", ") || "—",
    outputs: (c?.outputModalities ?? []).join(", ") || "—",
    latency: c ? LATENCY_LABEL[c.latencyClass][lang] : "—",
    structuredOutput: !!c?.structuredOutput,
    toolUse: !!c?.toolUse,
    nativeSearch: !!c?.nativeSearch,
    strengths: m.strengths.map((s) => STRENGTH_LABEL[s][lang]),
    note: m.notes[lang],
    promptGuidance: c?.promptGuidance[lang] ?? "",
  };
}
