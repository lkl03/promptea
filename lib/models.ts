// lib/models.ts
//
// Centralized registry of AI models supported by Promptea's analyzer.
//
// Each entry maps a recognizable submodel (e.g. "GPT-4o", "Claude Sonnet")
// to a stable internal "target" used by the engine and UI selector.
// Adding a new model only requires extending this list.

import type { Lang, TargetAI } from "@/lib/promptTemplates";

export type ModelProvider =
  | "openai"
  | "anthropic"
  | "google"
  | "xai"
  | "deepseek"
  | "moonshot"
  | "meta"
  | "mistral";

export type ModelStrength =
  | "reasoning"
  | "coding"
  | "writing"
  | "data"
  | "multimodal"
  | "long_context"
  | "speed"
  | "creativity";

export type ModelEntry = {
  id: string;
  label: string;
  provider: ModelProvider;
  target: TargetAI;
  family: string;
  strengths: ModelStrength[];
  notes: { es: string; en: string };
};

export const MODEL_REGISTRY: ModelEntry[] = [
  // OpenAI
  {
    id: "gpt-4.1",
    label: "GPT-4.1",
    provider: "openai",
    target: "gpt",
    family: "GPT",
    strengths: ["reasoning", "coding", "writing", "long_context"],
    notes: {
      es: "Bueno para razonamiento y código con contexto largo. Beneficiado por instrucciones estructuradas y criterios de éxito.",
      en: "Strong for reasoning and code with long context. Benefits from structured instructions and explicit success criteria.",
    },
  },
  {
    id: "gpt-4o",
    label: "GPT-4o",
    provider: "openai",
    target: "gpt",
    family: "GPT",
    strengths: ["multimodal", "writing", "speed"],
    notes: {
      es: "Multimodal y rápido. Pedile formato exacto y delimitadores cuando hay input largo.",
      en: "Multimodal and fast. Ask for exact format and use delimiters with long input.",
    },
  },
  {
    id: "gpt-4o-mini",
    label: "GPT-4o mini",
    provider: "openai",
    target: "gpt",
    family: "GPT",
    strengths: ["speed", "writing"],
    notes: {
      es: "Liviano y rápido. Conviene reducir ambigüedad y dar pasos cortos.",
      en: "Lightweight and fast. Reduce ambiguity and prefer short, ordered steps.",
    },
  },
  {
    id: "gpt-o3",
    label: "OpenAI o3 (reasoning)",
    provider: "openai",
    target: "gpt",
    family: "GPT",
    strengths: ["reasoning", "coding", "data"],
    notes: {
      es: "Modelo de razonamiento: dale objetivo y criterios; evitá pedirle pasos internos.",
      en: "Reasoning model: give it the goal and acceptance criteria; avoid asking for internal steps.",
    },
  },

  // Anthropic
  {
    id: "claude-sonnet",
    label: "Claude Sonnet",
    provider: "anthropic",
    target: "claude",
    family: "Claude",
    strengths: ["writing", "reasoning", "long_context"],
    notes: {
      es: "Responde mejor con secciones claras y delimitadores XML para inputs largos.",
      en: "Performs best with clear sections and XML-style delimiters for long inputs.",
    },
  },
  {
    id: "claude-opus",
    label: "Claude Opus",
    provider: "anthropic",
    target: "claude",
    family: "Claude",
    strengths: ["reasoning", "writing", "long_context"],
    notes: {
      es: "Calidad alta en razonamiento; pedile criterios y verificación explícita.",
      en: "Top-tier reasoning; ask for explicit success criteria and self-verification.",
    },
  },
  {
    id: "claude-haiku",
    label: "Claude Haiku",
    provider: "anthropic",
    target: "claude",
    family: "Claude",
    strengths: ["speed", "writing"],
    notes: {
      es: "Modelo rápido. Mantené el prompt corto, con tareas claras y formato exacto.",
      en: "Fast model. Keep prompts short with clear tasks and an exact output format.",
    },
  },

  // Google
  {
    id: "gemini-pro",
    label: "Gemini Pro",
    provider: "google",
    target: "gemini",
    family: "Gemini",
    strengths: ["multimodal", "long_context", "data"],
    notes: {
      es: "Pedí formato visible y un ejemplo corto del resultado esperado.",
      en: "Specify a visible output format and add a short example of the desired result.",
    },
  },
  {
    id: "gemini-flash",
    label: "Gemini Flash",
    provider: "google",
    target: "gemini",
    family: "Gemini",
    strengths: ["speed", "multimodal"],
    notes: {
      es: "Rápido y multimodal. Mantené prompts compactos con instrucciones explícitas.",
      en: "Fast and multimodal. Keep prompts compact with explicit instructions.",
    },
  },

  // xAI
  {
    id: "grok-2",
    label: "Grok",
    provider: "xai",
    target: "grok",
    family: "Grok",
    strengths: ["writing", "speed"],
    notes: {
      es: "Tono directo. Definí tono y nivel de informalidad si te importa el resultado.",
      en: "Direct tone. Define tone and informality if it matters for the output.",
    },
  },

  // DeepSeek
  {
    id: "deepseek-chat",
    label: "DeepSeek Chat",
    provider: "deepseek",
    target: "deepseek",
    family: "DeepSeek",
    strengths: ["coding", "reasoning"],
    notes: {
      es: "Excelente para código si pedís tests, edge cases y criterios de aceptación.",
      en: "Excels at code when you ask for tests, edge cases, and acceptance criteria.",
    },
  },

  // Moonshot
  {
    id: "kimi",
    label: "Kimi",
    provider: "moonshot",
    target: "kimi",
    family: "Kimi",
    strengths: ["long_context", "writing"],
    notes: {
      es: "Maneja contexto largo: separá fuente vs instrucciones y marcá prioridades.",
      en: "Handles long context: split source vs instructions and mark priorities.",
    },
  },

  // Llama (open source) — mapped onto an existing target so it works with current UI/engine.
  {
    id: "llama-3-70b",
    label: "Llama 3 (70B)",
    provider: "meta",
    target: "gpt",
    family: "Llama",
    strengths: ["writing", "coding"],
    notes: {
      es: "Open-source. Conviene reducir ambigüedad y dar ejemplos del formato esperado.",
      en: "Open-source. Reduce ambiguity and provide examples of the expected format.",
    },
  },
];

export const TARGET_GROUPS: Array<{
  target: TargetAI;
  label: string;
  defaultModelId: string;
}> = [
  { target: "gpt", label: "GPT", defaultModelId: "gpt-4o" },
  { target: "claude", label: "Claude", defaultModelId: "claude-sonnet" },
  { target: "gemini", label: "Gemini", defaultModelId: "gemini-pro" },
  { target: "grok", label: "Grok", defaultModelId: "grok-2" },
  { target: "kimi", label: "Kimi", defaultModelId: "kimi" },
  { target: "deepseek", label: "DeepSeek", defaultModelId: "deepseek-chat" },
];

export function getModelById(id: string | null | undefined): ModelEntry | null {
  if (!id) return null;
  return MODEL_REGISTRY.find((m) => m.id === id) ?? null;
}

export function getModelsForTarget(target: TargetAI): ModelEntry[] {
  return MODEL_REGISTRY.filter((m) => m.target === target);
}

export function defaultModelIdForTarget(target: TargetAI): string {
  const group = TARGET_GROUPS.find((g) => g.target === target);
  return group?.defaultModelId ?? MODEL_REGISTRY.find((m) => m.target === target)?.id ?? "gpt-4o";
}

export function modelNoteForTarget(target: TargetAI, lang: Lang, modelId?: string | null): string {
  const explicit = getModelById(modelId);
  if (explicit && explicit.target === target) {
    return explicit.notes[lang];
  }
  const fallback = MODEL_REGISTRY.find((m) => m.target === target);
  return fallback ? fallback.notes[lang] : "";
}
