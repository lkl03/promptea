// lib/models.ts
//
// Centralized, verified registry of AI models supported by Promptea's analyzer.
//
// v1.2.0: every entry now carries an explicit lifecycle status, the date it was
// verified against primary sources, and the source URL used. UI selectors only
// offer entries with `selectable: true`; legacy/deprecated entries are retained
// (non-selectable) for compatibility with older links, telemetry, and SEO pages.
//
// Promptea OPTIMIZES prompts for these models — it does not execute them.
//
// Maintenance policy:
// 1. Verify IDs only against official provider documentation (see sourceUrl).
// 2. Never add a model from a blog post, social post, or memory.
// 3. Update `verifiedAt` whenever an entry is re-checked.
// 4. Exactly one `defaultForTarget: true` entry per target (enforced by tests).
// 5. When a model is superseded, set status + replacementId instead of deleting.

import type { Lang, TargetAI } from "@/lib/domain";
import { TARGETS } from "@/lib/domain";

export type ModelProvider =
  | "openai"
  | "anthropic"
  | "google"
  | "xai"
  | "deepseek"
  | "perplexity"
  | "moonshot"
  | "meta"
  | "mistral";

export type ModelStatus = "stable" | "preview" | "legacy" | "deprecated";

export type ModelStrength =
  | "reasoning"
  | "coding"
  | "writing"
  | "data"
  | "multimodal"
  | "long_context"
  | "speed"
  | "creativity"
  | "search";

export type ModelEntry = {
  /** Stable internal id (also used in URLs/telemetry — do not rename). */
  id: string;
  /** Display name in the UI. */
  label: string;
  provider: ModelProvider;
  target: TargetAI;
  family: string;
  status: ModelStatus;
  strengths: ModelStrength[];
  notes: { es: string; en: string };
  /** Exact model id in the provider's API, when it differs from `id`. */
  apiModelId?: string;
  openRouterId?: string;
  /** ISO date this entry was last verified against `sourceUrl`. */
  verifiedAt: string;
  /** Primary source used for verification. */
  sourceUrl: string;
  /** Suggested replacement when status is legacy/deprecated. */
  replacementId?: string;
  /** Whether the model can be chosen in the UI selector. */
  selectable: boolean;
  /** Exactly one per target (validated by tests). */
  defaultForTarget?: boolean;
};

const VERIFIED = "2026-07-12";

const SRC = {
  openai: "https://developers.openai.com/api/docs/models",
  anthropic: "https://platform.claude.com/docs/en/docs/about-claude/models/overview",
  google: "https://ai.google.dev/gemini-api/docs/models",
  xai: "https://docs.x.ai/docs/models",
  deepseek: "https://api-docs.deepseek.com/quick_start/pricing",
  moonshot: "https://platform.kimi.ai/docs/introduction",
  perplexity: "https://docs.perplexity.ai/getting-started/models",
} as const;

export const MODEL_REGISTRY: ModelEntry[] = [
  // ── OpenAI ────────────────────────────────────────────────────────────────
  {
    id: "gpt-5.6",
    label: "GPT-5.6 (Sol)",
    provider: "openai",
    target: "gpt",
    family: "GPT",
    status: "stable",
    strengths: ["reasoning", "coding", "writing", "long_context", "multimodal"],
    notes: {
      es: "Modelo frontier de OpenAI para trabajo profesional complejo. Rinde mejor con objetivo claro, criterios de éxito explícitos y formato de salida definido.",
      en: "OpenAI's frontier model for complex professional work. Performs best with a clear goal, explicit success criteria, and a defined output format.",
    },
    apiModelId: "gpt-5.6-sol",
    verifiedAt: VERIFIED,
    sourceUrl: SRC.openai,
    selectable: true,
    defaultForTarget: true,
  },
  {
    id: "gpt-5.6-terra",
    label: "GPT-5.6 Terra",
    provider: "openai",
    target: "gpt",
    family: "GPT",
    status: "stable",
    strengths: ["reasoning", "coding", "speed"],
    notes: {
      es: "Balance entre inteligencia y costo. Ideal para uso diario; reducí ambigüedad y pedí formato exacto.",
      en: "Balances intelligence and cost. Great for everyday use; reduce ambiguity and request an exact format.",
    },
    apiModelId: "gpt-5.6-terra",
    verifiedAt: VERIFIED,
    sourceUrl: SRC.openai,
    selectable: true,
  },
  {
    id: "gpt-5.6-luna",
    label: "GPT-5.6 Luna",
    provider: "openai",
    target: "gpt",
    family: "GPT",
    status: "stable",
    strengths: ["speed", "writing"],
    notes: {
      es: "Optimizado para costo y velocidad. Conviene dar pasos cortos y un ejemplo del resultado esperado.",
      en: "Optimized for cost and speed. Prefer short, ordered steps and one example of the expected result.",
    },
    apiModelId: "gpt-5.6-luna",
    verifiedAt: VERIFIED,
    sourceUrl: SRC.openai,
    selectable: true,
  },
  {
    id: "gpt-5.5",
    label: "GPT-5.5",
    provider: "openai",
    target: "gpt",
    family: "GPT",
    status: "legacy",
    strengths: ["reasoning", "coding", "writing", "long_context"],
    notes: {
      es: "Generación anterior de GPT. Considerá GPT-5.6 para mejores resultados.",
      en: "Previous GPT generation. Consider GPT-5.6 for better results.",
    },
    verifiedAt: VERIFIED,
    sourceUrl: SRC.openai,
    replacementId: "gpt-5.6",
    selectable: false,
  },
  {
    id: "gpt-5.5-pro",
    label: "GPT-5.5 Pro",
    provider: "openai",
    target: "gpt",
    family: "GPT",
    status: "legacy",
    strengths: ["reasoning", "coding", "data", "long_context"],
    notes: {
      es: "Generación anterior de GPT (Pro). Considerá GPT-5.6 para mejores resultados.",
      en: "Previous GPT generation (Pro). Consider GPT-5.6 for better results.",
    },
    verifiedAt: VERIFIED,
    sourceUrl: SRC.openai,
    replacementId: "gpt-5.6",
    selectable: false,
  },
  {
    id: "gpt-4.1",
    label: "GPT-4.1",
    provider: "openai",
    target: "gpt",
    family: "GPT",
    status: "legacy",
    strengths: ["reasoning", "coding", "long_context"],
    notes: {
      es: "Modelo legacy de la serie GPT-4. Considerá GPT-5.6 para mejores resultados.",
      en: "Legacy GPT-4-series model. Consider GPT-5.6 for better results.",
    },
    verifiedAt: VERIFIED,
    sourceUrl: SRC.openai,
    replacementId: "gpt-5.6",
    selectable: false,
  },
  {
    id: "gpt-4o",
    label: "GPT-4o",
    provider: "openai",
    target: "gpt",
    family: "GPT",
    status: "legacy",
    strengths: ["multimodal", "writing", "speed"],
    notes: {
      es: "Modelo legacy multimodal. Considerá GPT-5.6 para mejores resultados.",
      en: "Legacy multimodal model. Consider GPT-5.6 for better results.",
    },
    verifiedAt: VERIFIED,
    sourceUrl: SRC.openai,
    replacementId: "gpt-5.6",
    selectable: false,
  },
  {
    id: "gpt-4o-mini",
    label: "GPT-4o mini",
    provider: "openai",
    target: "gpt",
    family: "GPT",
    status: "legacy",
    strengths: ["speed", "writing"],
    notes: {
      es: "Modelo legacy liviano. Considerá GPT-5.6 Luna para mejores resultados.",
      en: "Legacy lightweight model. Consider GPT-5.6 Luna for better results.",
    },
    verifiedAt: VERIFIED,
    sourceUrl: SRC.openai,
    replacementId: "gpt-5.6-luna",
    selectable: false,
  },
  {
    id: "gpt-o3",
    label: "OpenAI o3 (reasoning)",
    provider: "openai",
    target: "gpt",
    family: "GPT",
    status: "legacy",
    strengths: ["reasoning", "coding", "data"],
    notes: {
      es: "Modelo de razonamiento legacy. Las capacidades de razonamiento están integradas en GPT-5.6.",
      en: "Legacy reasoning model. Reasoning capabilities are integrated into GPT-5.6.",
    },
    verifiedAt: VERIFIED,
    sourceUrl: SRC.openai,
    replacementId: "gpt-5.6",
    selectable: false,
  },

  // ── Anthropic ─────────────────────────────────────────────────────────────
  {
    id: "claude-fable-5",
    label: "Claude Fable 5",
    provider: "anthropic",
    target: "claude",
    family: "Claude",
    status: "stable",
    strengths: ["reasoning", "writing", "long_context", "coding"],
    notes: {
      es: "El modelo más capaz de Anthropic (contexto de 1M tokens). Responde mejor con secciones claras, delimitadores XML y criterios explícitos de éxito.",
      en: "Anthropic's most capable model (1M-token context). Works best with clear sections, XML delimiters, and explicit success criteria.",
    },
    apiModelId: "claude-fable-5",
    openRouterId: "anthropic/claude-fable-5",
    verifiedAt: VERIFIED,
    sourceUrl: SRC.anthropic,
    selectable: true,
  },
  {
    id: "claude-opus-4.8",
    label: "Claude Opus 4.8",
    provider: "anthropic",
    target: "claude",
    family: "Claude",
    status: "stable",
    strengths: ["reasoning", "coding", "long_context"],
    notes: {
      es: "Ideal para coding agéntico complejo y trabajo empresarial. Pedile criterios de éxito y verificación explícita.",
      en: "Ideal for complex agentic coding and enterprise work. Ask for explicit success criteria and self-verification.",
    },
    apiModelId: "claude-opus-4-8",
    openRouterId: "anthropic/claude-opus-4.8",
    verifiedAt: VERIFIED,
    sourceUrl: SRC.anthropic,
    selectable: true,
  },
  {
    id: "claude-sonnet-5",
    label: "Claude Sonnet 5",
    provider: "anthropic",
    target: "claude",
    family: "Claude",
    status: "stable",
    strengths: ["writing", "reasoning", "speed", "long_context"],
    notes: {
      es: "La mejor combinación de velocidad e inteligencia de la familia Claude. Usá secciones claras y delimitadores para inputs largos.",
      en: "The best speed/intelligence combination in the Claude family. Use clear sections and delimiters for long inputs.",
    },
    apiModelId: "claude-sonnet-5",
    openRouterId: "anthropic/claude-sonnet-5",
    verifiedAt: VERIFIED,
    sourceUrl: SRC.anthropic,
    selectable: true,
    defaultForTarget: true,
  },
  {
    id: "claude-haiku-4.5",
    label: "Claude Haiku 4.5",
    provider: "anthropic",
    target: "claude",
    family: "Claude",
    status: "stable",
    strengths: ["speed", "writing"],
    notes: {
      es: "El Claude más rápido. Mantené el prompt corto, con tareas claras y formato exacto.",
      en: "The fastest Claude. Keep prompts short with clear tasks and an exact output format.",
    },
    apiModelId: "claude-haiku-4-5",
    verifiedAt: VERIFIED,
    sourceUrl: SRC.anthropic,
    selectable: true,
  },
  {
    id: "claude-sonnet",
    label: "Claude Sonnet (legacy alias)",
    provider: "anthropic",
    target: "claude",
    family: "Claude",
    status: "legacy",
    strengths: ["writing", "reasoning", "long_context"],
    notes: {
      es: "Alias genérico legacy. Usá Claude Sonnet 5.",
      en: "Legacy generic alias. Use Claude Sonnet 5.",
    },
    verifiedAt: VERIFIED,
    sourceUrl: SRC.anthropic,
    replacementId: "claude-sonnet-5",
    selectable: false,
  },
  {
    id: "claude-opus",
    label: "Claude Opus (legacy alias)",
    provider: "anthropic",
    target: "claude",
    family: "Claude",
    status: "legacy",
    strengths: ["reasoning", "writing", "long_context"],
    notes: {
      es: "Alias genérico legacy. Usá Claude Opus 4.8.",
      en: "Legacy generic alias. Use Claude Opus 4.8.",
    },
    verifiedAt: VERIFIED,
    sourceUrl: SRC.anthropic,
    replacementId: "claude-opus-4.8",
    selectable: false,
  },
  {
    id: "claude-haiku",
    label: "Claude Haiku (legacy alias)",
    provider: "anthropic",
    target: "claude",
    family: "Claude",
    status: "legacy",
    strengths: ["speed", "writing"],
    notes: {
      es: "Alias genérico legacy. Usá Claude Haiku 4.5.",
      en: "Legacy generic alias. Use Claude Haiku 4.5.",
    },
    verifiedAt: VERIFIED,
    sourceUrl: SRC.anthropic,
    replacementId: "claude-haiku-4.5",
    selectable: false,
  },

  // ── Google ────────────────────────────────────────────────────────────────
  {
    id: "gemini-3.5-flash",
    label: "Gemini 3.5 Flash",
    provider: "google",
    target: "gemini",
    family: "Gemini",
    status: "stable",
    strengths: ["speed", "multimodal", "long_context", "coding"],
    notes: {
      es: "El Gemini más inteligente para tareas agénticas y de código. Pedí formato visible y un ejemplo corto del resultado.",
      en: "The most intelligent Gemini for agentic and coding tasks. Specify a visible output format and add a short result example.",
    },
    apiModelId: "gemini-3.5-flash",
    openRouterId: "google/gemini-3.5-flash",
    verifiedAt: VERIFIED,
    sourceUrl: SRC.google,
    selectable: true,
    defaultForTarget: true,
  },
  {
    id: "gemini-3.1-flash-lite",
    label: "Gemini 3.1 Flash-Lite",
    provider: "google",
    target: "gemini",
    family: "Gemini",
    status: "stable",
    strengths: ["speed", "multimodal"],
    notes: {
      es: "Alternativa económica con rendimiento frontier. Mantené prompts compactos con instrucciones explícitas.",
      en: "Budget-friendly alternative with frontier-class performance. Keep prompts compact with explicit instructions.",
    },
    apiModelId: "gemini-3.1-flash-lite",
    verifiedAt: VERIFIED,
    sourceUrl: SRC.google,
    selectable: true,
  },
  {
    id: "gemini-3.1-pro",
    label: "Gemini 3.1 Pro",
    provider: "google",
    target: "gemini",
    family: "Gemini",
    status: "preview",
    strengths: ["reasoning", "multimodal", "long_context", "data"],
    notes: {
      es: "Inteligencia avanzada para problemas complejos (en preview). Pedí que marque supuestos y dé formato visible.",
      en: "Advanced intelligence for complex problem-solving (preview). Ask it to state assumptions and use a visible format.",
    },
    apiModelId: "gemini-3.1-pro",
    verifiedAt: VERIFIED,
    sourceUrl: SRC.google,
    selectable: true,
  },
  {
    id: "gemini-pro",
    label: "Gemini Pro (legacy alias)",
    provider: "google",
    target: "gemini",
    family: "Gemini",
    status: "legacy",
    strengths: ["multimodal", "long_context", "data"],
    notes: {
      es: "Alias genérico legacy. Usá Gemini 3.1 Pro o Gemini 3.5 Flash.",
      en: "Legacy generic alias. Use Gemini 3.1 Pro or Gemini 3.5 Flash.",
    },
    verifiedAt: VERIFIED,
    sourceUrl: SRC.google,
    replacementId: "gemini-3.1-pro",
    selectable: false,
  },
  {
    id: "gemini-flash",
    label: "Gemini Flash (legacy alias)",
    provider: "google",
    target: "gemini",
    family: "Gemini",
    status: "legacy",
    strengths: ["speed", "multimodal"],
    notes: {
      es: "Alias genérico legacy. Usá Gemini 3.5 Flash.",
      en: "Legacy generic alias. Use Gemini 3.5 Flash.",
    },
    verifiedAt: VERIFIED,
    sourceUrl: SRC.google,
    replacementId: "gemini-3.5-flash",
    selectable: false,
  },

  // ── xAI ───────────────────────────────────────────────────────────────────
  {
    id: "grok-4.5",
    label: "Grok 4.5",
    provider: "xai",
    target: "grok",
    family: "Grok",
    status: "stable",
    strengths: ["reasoning", "writing", "speed", "search"],
    notes: {
      es: "El Grok más inteligente y rápido (contexto 500k). Tono directo; definí tono y nivel de informalidad.",
      en: "The most intelligent and fastest Grok (500k context). Direct tone; define tone and informality for best results.",
    },
    apiModelId: "grok-4.5",
    verifiedAt: VERIFIED,
    sourceUrl: SRC.xai,
    selectable: true,
    defaultForTarget: true,
  },
  {
    id: "grok-4.3",
    label: "Grok 4.3",
    provider: "xai",
    target: "grok",
    family: "Grok",
    status: "stable",
    strengths: ["reasoning", "writing", "long_context"],
    notes: {
      es: "Grok con contexto de 1M tokens. Útil para material largo; separá fuente e instrucciones.",
      en: "Grok with a 1M-token context. Useful for long material; separate source text from instructions.",
    },
    apiModelId: "grok-4.3",
    openRouterId: "x-ai/grok-4.3",
    verifiedAt: VERIFIED,
    sourceUrl: SRC.xai,
    selectable: true,
  },
  {
    id: "grok-build-0.1",
    label: "Grok Build 0.1",
    provider: "xai",
    target: "grok",
    family: "Grok",
    status: "stable",
    strengths: ["coding", "reasoning"],
    notes: {
      es: "Grok especializado en código (Code API). Pedí criterios de corrección y casos borde.",
      en: "Code-specialized Grok (Code API). Ask for correctness criteria and edge cases.",
    },
    apiModelId: "grok-build-0.1",
    openRouterId: "x-ai/grok-build-0.1",
    verifiedAt: VERIFIED,
    sourceUrl: SRC.xai,
    selectable: true,
  },
  {
    id: "grok-2",
    label: "Grok (legacy)",
    provider: "xai",
    target: "grok",
    family: "Grok",
    status: "legacy",
    strengths: ["writing", "speed"],
    notes: {
      es: "Generación legacy de Grok. Usá Grok 4.5.",
      en: "Legacy Grok generation. Use Grok 4.5.",
    },
    verifiedAt: VERIFIED,
    sourceUrl: SRC.xai,
    replacementId: "grok-4.5",
    selectable: false,
  },

  // ── DeepSeek ──────────────────────────────────────────────────────────────
  {
    id: "deepseek-v4-flash",
    label: "DeepSeek V4 Flash",
    provider: "deepseek",
    target: "deepseek",
    family: "DeepSeek",
    status: "stable",
    strengths: ["coding", "speed", "reasoning"],
    notes: {
      es: "Modelo estándar de DeepSeek (contexto 1M, modos thinking y non-thinking). Pedí tests y edge cases para código.",
      en: "DeepSeek's standard model (1M context, thinking and non-thinking modes). Ask for tests and edge cases for code.",
    },
    apiModelId: "deepseek-v4-flash",
    openRouterId: "deepseek/deepseek-v4-flash",
    verifiedAt: VERIFIED,
    sourceUrl: SRC.deepseek,
    selectable: true,
    defaultForTarget: true,
  },
  {
    id: "deepseek-v4-pro",
    label: "DeepSeek V4 Pro",
    provider: "deepseek",
    target: "deepseek",
    family: "DeepSeek",
    status: "stable",
    strengths: ["coding", "reasoning", "data"],
    notes: {
      es: "El DeepSeek más capaz: excelente para razonamiento y código con criterios de aceptación explícitos.",
      en: "DeepSeek's most capable model: excels at reasoning and code with explicit acceptance criteria.",
    },
    apiModelId: "deepseek-v4-pro",
    openRouterId: "deepseek/deepseek-v4-pro",
    verifiedAt: VERIFIED,
    sourceUrl: SRC.deepseek,
    selectable: true,
  },
  {
    id: "deepseek-chat",
    label: "DeepSeek Chat (deprecated)",
    provider: "deepseek",
    target: "deepseek",
    family: "DeepSeek",
    status: "deprecated",
    strengths: ["coding", "reasoning"],
    notes: {
      es: "Alias deprecado por DeepSeek (se retira el 2026-07-24). Usá DeepSeek V4 Flash.",
      en: "Alias deprecated by DeepSeek (retires 2026-07-24). Use DeepSeek V4 Flash.",
    },
    verifiedAt: VERIFIED,
    sourceUrl: SRC.deepseek,
    replacementId: "deepseek-v4-flash",
    selectable: false,
  },

  // ── Perplexity (Sonar) ────────────────────────────────────────────────────
  {
    id: "sonar-pro",
    label: "Sonar Pro",
    provider: "perplexity",
    target: "perplexity",
    family: "Sonar",
    status: "stable",
    strengths: ["search", "writing"],
    notes: {
      es: "Búsqueda avanzada con grounding para consultas complejas. Pedí fuentes o fecha si importa la actualidad.",
      en: "Advanced grounded search for complex queries. Ask for sources or a recency date when freshness matters.",
    },
    apiModelId: "sonar-pro",
    openRouterId: "perplexity/sonar-pro",
    verifiedAt: VERIFIED,
    sourceUrl: SRC.perplexity,
    selectable: true,
    defaultForTarget: true,
  },
  {
    id: "sonar",
    label: "Sonar",
    provider: "perplexity",
    target: "perplexity",
    family: "Sonar",
    status: "stable",
    strengths: ["search", "speed"],
    notes: {
      es: "Búsqueda liviana y económica con grounding. Ideal para consultas factuales rápidas.",
      en: "Lightweight, cost-effective grounded search. Best for quick factual queries.",
    },
    apiModelId: "sonar",
    verifiedAt: VERIFIED,
    sourceUrl: SRC.perplexity,
    selectable: true,
  },
  {
    id: "sonar-reasoning-pro",
    label: "Sonar Reasoning Pro",
    provider: "perplexity",
    target: "perplexity",
    family: "Sonar",
    status: "stable",
    strengths: ["search", "reasoning"],
    notes: {
      es: "Razonamiento multi-paso con búsqueda web. Ideal para research complejo con múltiples fuentes.",
      en: "Multi-step reasoning with web search. Best for complex research and multi-source queries.",
    },
    apiModelId: "sonar-reasoning-pro",
    openRouterId: "perplexity/sonar-reasoning-pro",
    verifiedAt: VERIFIED,
    sourceUrl: SRC.perplexity,
    selectable: true,
  },
  {
    id: "sonar-deep-research",
    label: "Sonar Deep Research",
    provider: "perplexity",
    target: "perplexity",
    family: "Sonar",
    status: "stable",
    strengths: ["search", "reasoning", "long_context"],
    notes: {
      es: "Investigación exhaustiva con reportes completos. Definí alcance, período y formato del informe.",
      en: "Exhaustive research producing comprehensive reports. Define scope, time period, and report format.",
    },
    apiModelId: "sonar-deep-research",
    verifiedAt: VERIFIED,
    sourceUrl: SRC.perplexity,
    selectable: true,
  },

  // ── Moonshot ──────────────────────────────────────────────────────────────
  {
    id: "kimi-k2.6",
    label: "Kimi K2.6",
    provider: "moonshot",
    target: "kimi",
    family: "Kimi",
    status: "stable",
    strengths: ["long_context", "multimodal", "writing"],
    notes: {
      es: "El Kimi más inteligente (texto, imagen y video; modos thinking y non-thinking). Separá fuente vs instrucciones y marcá prioridades.",
      en: "Kimi's most intelligent model (text, image, and video input; thinking and non-thinking modes). Split source vs instructions and mark priorities.",
    },
    apiModelId: "kimi-k2.6",
    verifiedAt: VERIFIED,
    sourceUrl: SRC.moonshot,
    selectable: true,
    defaultForTarget: true,
  },
  {
    id: "kimi",
    label: "Kimi (legacy alias)",
    provider: "moonshot",
    target: "kimi",
    family: "Kimi",
    status: "legacy",
    strengths: ["long_context", "writing"],
    notes: {
      es: "Alias genérico legacy. Usá Kimi K2.6.",
      en: "Legacy generic alias. Use Kimi K2.6.",
    },
    verifiedAt: VERIFIED,
    sourceUrl: SRC.moonshot,
    replacementId: "kimi-k2.6",
    selectable: false,
  },

  // ── Meta (open source) ────────────────────────────────────────────────────
  {
    id: "llama-3-70b",
    label: "Llama 3 (70B)",
    provider: "meta",
    target: "gpt",
    family: "Llama",
    status: "legacy",
    strengths: ["writing", "coding"],
    notes: {
      es: "Modelo open-source legacy que se mapeaba al target GPT. Ya no es seleccionable.",
      en: "Legacy open-source model previously mapped onto the GPT target. No longer selectable.",
    },
    verifiedAt: VERIFIED,
    sourceUrl: SRC.openai,
    replacementId: "gpt-5.6",
    selectable: false,
  },
];

export const TARGET_GROUPS: Array<{
  target: TargetAI;
  label: string;
}> = [
  { target: "gpt", label: "GPT" },
  { target: "claude", label: "Claude" },
  { target: "gemini", label: "Gemini" },
  { target: "grok", label: "Grok" },
  { target: "kimi", label: "Kimi" },
  { target: "deepseek", label: "DeepSeek" },
  { target: "perplexity", label: "Perplexity" },
];

export function getModelById(id: string | null | undefined): ModelEntry | null {
  if (!id) return null;
  return MODEL_REGISTRY.find((m) => m.id === id) ?? null;
}

/** Models offered in the UI selector for a target (selectable only). */
export function getModelsForTarget(target: TargetAI): ModelEntry[] {
  return MODEL_REGISTRY.filter((m) => m.target === target && m.selectable);
}

/** All registry entries for a target, including legacy/deprecated. */
export function getAllModelsForTarget(target: TargetAI): ModelEntry[] {
  return MODEL_REGISTRY.filter((m) => m.target === target);
}

/** Explicit default policy: the single entry flagged defaultForTarget. */
export function defaultModelIdForTarget(target: TargetAI): string {
  const flagged = MODEL_REGISTRY.find((m) => m.target === target && m.defaultForTarget && m.selectable);
  if (flagged) return flagged.id;
  const firstSelectable = MODEL_REGISTRY.find((m) => m.target === target && m.selectable);
  return firstSelectable?.id ?? MODEL_REGISTRY.find((m) => m.target === target)?.id ?? "gpt-5.6";
}

/**
 * Resolve a model id that may be legacy/deprecated to its current replacement.
 * Follows the replacement chain at most 3 hops to avoid cycles.
 */
export function resolveModelId(id: string | null | undefined): ModelEntry | null {
  let entry = getModelById(id);
  for (let hops = 0; entry && !entry.selectable && entry.replacementId && hops < 3; hops++) {
    entry = getModelById(entry.replacementId);
  }
  return entry;
}

export function modelNoteForTarget(target: TargetAI, lang: Lang, modelId?: string | null): string {
  const explicit = getModelById(modelId);
  if (explicit && explicit.target === target) {
    return explicit.notes[lang];
  }
  const fallback = getModelById(defaultModelIdForTarget(target));
  return fallback ? fallback.notes[lang] : "";
}

/** Sanity export used by tests: all targets covered by the registry. */
export const REGISTRY_TARGETS = TARGETS;
