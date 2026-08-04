// lib/models.ts
//
// Centralized, verified registry of AI models supported by Promptea's analyzer.
//
// v1.2.0: every entry now carries an explicit lifecycle status, the date it was
// verified against primary sources, and the source URL used. UI selectors only
// offer entries with `selectable: true`; legacy/deprecated entries are retained
// (non-selectable) for compatibility with older links, telemetry, and SEO pages.
//
// v1.3.0: selectable stable/preview entries additionally carry structured
// `capabilities` data and `interactionProfiles` consumed by the deterministic
// matcher. All capability values were verified against official provider
// documentation on 2026-08-03.
//
// Promptea OPTIMIZES prompts for these models — it does not execute them.
//
// Maintenance policy:
// 1. Verify IDs only against official provider documentation (see sourceUrl).
// 2. Never add a model from a blog post, social post, or memory.
// 3. Update `verifiedAt` whenever an entry is re-checked.
// 4. Exactly one `defaultForTarget: true` entry per target (enforced by tests).
// 5. When a model is superseded, set status + replacementId instead of deleting.

import type { InteractionProfile, Lang, MatchCategory, TargetAI } from "@/lib/domain";
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

export type Modality = "text" | "image" | "audio" | "video" | "pdf";

export type LatencyClass = "fast" | "balanced" | "slow";

/** 0 = wrong tool … 3 = among the best market choices for the category. */
export type FitScore = 0 | 1 | 2 | 3;

export type TaskFitScores = Partial<Record<MatchCategory, FitScore>>;

/**
 * v1.3.0 structured capability data consumed by the deterministic matcher
 * (lib/matcher). Values must come from official provider documentation —
 * same maintenance policy as the rest of the entry.
 */
export type ModelCapabilities = {
  inputModalities: Modality[];
  outputModalities: Modality[];
  contextWindowTokens: number | null;
  maxOutputTokens: number | null;
  latencyClass: LatencyClass;
  /** Native JSON/structured-output mode. */
  structuredOutput: boolean;
  toolUse: boolean;
  /** Built-in web search/grounding with citations. */
  nativeSearch: boolean;
  /** 0 none, 1 basic, 2 strong, 3 frontier deliberate reasoning. */
  reasoningTier: FitScore;
  /** Suitability inside repository coding agents (Claude Code, Codex…). */
  codingAgentFit: FitScore;
  taskFit: TaskFitScores;
  /** Model-specific prompting advice, shown in matcher adaptation tips. */
  promptGuidance: { es: string; en: string };
};

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
  /** v1.3.0 matcher data. Required on selectable stable/preview entries. */
  capabilities?: ModelCapabilities;
  /** Interaction environments this model powers (chat, coding agent, …). */
  interactionProfiles?: InteractionProfile[];
};

/** 2026-08-03 research sweep: every provider-backed entry re-verified. */
const VERIFIED = "2026-08-03";
/** Previous sweep — kept for entries outside the 2026-08-03 research pass. */
const VERIFIED_PREV = "2026-07-12";

const SRC = {
  openai: "https://developers.openai.com/api/docs/models",
  anthropic: "https://platform.claude.com/docs/en/about-claude/models/overview",
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
    capabilities: {
      inputModalities: ["text", "image"],
      outputModalities: ["text"],
      contextWindowTokens: 1050000,
      maxOutputTokens: 128000,
      latencyClass: "slow",
      structuredOutput: true,
      toolUse: true,
      nativeSearch: true,
      reasoningTier: 3,
      codingAgentFit: 3,
      taskFit: {
        chat: 3,
        coding: 3,
        codingAgent: 3,
        research: 3,
        longContext: 3,
        multimodal: 2,
        dataExtraction: 3,
        creativeWriting: 2,
        marketing: 2,
        translation: 2,
        summarization: 2,
        tutoring: 3,
        imagePrompts: 2,
        complexReasoning: 3,
        fastLightweight: 0,
      },
      promptGuidance: {
        es: "Escribí cada instrucción una sola vez: los prompts concisos y sin repeticiones mejoran los resultados de forma medible. Arrancá con esfuerzo de razonamiento medio, reservá el modo pro para respuestas críticas y definí explícitamente el largo de salida y los límites de autonomía.",
        en: "State each instruction once — lean, de-duplicated prompts measurably improve results. Start reasoning effort at medium, reserve pro mode for quality-critical answers, and define output length and autonomy boundaries explicitly.",
      },
    },
    interactionProfiles: ["chat", "codingAgent"],
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
    capabilities: {
      inputModalities: ["text", "image"],
      outputModalities: ["text"],
      contextWindowTokens: 1050000,
      maxOutputTokens: 128000,
      latencyClass: "balanced",
      structuredOutput: true,
      toolUse: true,
      nativeSearch: true,
      reasoningTier: 2,
      codingAgentFit: 2,
      taskFit: {
        chat: 3,
        coding: 2,
        codingAgent: 2,
        research: 2,
        longContext: 3,
        multimodal: 2,
        dataExtraction: 2,
        creativeWriting: 2,
        marketing: 2,
        translation: 2,
        summarization: 3,
        tutoring: 2,
        imagePrompts: 2,
        complexReasoning: 2,
        fastLightweight: 1,
      },
      promptGuidance: {
        es: "Usá instrucciones concisas y sin repeticiones, con formato de salida exacto: sigue mejor las instrucciones explícitas de lo que infiere la intención no dicha. Arrancá con esfuerzo de razonamiento medio y probá bajarlo.",
        en: "Use lean, non-repetitive instructions with an exact output format — it follows explicit instructions better than it infers unstated intent. Start reasoning effort at medium and test one level lower.",
      },
    },
    interactionProfiles: ["chat", "codingAgent"],
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
    capabilities: {
      inputModalities: ["text", "image"],
      outputModalities: ["text"],
      contextWindowTokens: 1050000,
      maxOutputTokens: 128000,
      latencyClass: "fast",
      structuredOutput: true,
      toolUse: true,
      nativeSearch: true,
      reasoningTier: 1,
      codingAgentFit: 1,
      taskFit: {
        chat: 2,
        coding: 1,
        codingAgent: 1,
        research: 1,
        longContext: 2,
        multimodal: 1,
        dataExtraction: 2,
        creativeWriting: 1,
        marketing: 2,
        translation: 2,
        summarization: 2,
        tutoring: 1,
        imagePrompts: 1,
        complexReasoning: 1,
        fastLightweight: 3,
      },
      promptGuidance: {
        es: "Mantené el prompt compacto: pasos cortos y ordenados, un ejemplo del resultado esperado y formato de salida explícito. Para tareas realmente difíciles, escalá a Terra o Sol en vez de subirle el esfuerzo de razonamiento a Luna.",
        en: "Keep prompts compact: short ordered steps, one example of the expected result, and an explicit output format. For genuinely hard tasks escalate to Terra or Sol rather than raising Luna's reasoning effort.",
      },
    },
    interactionProfiles: ["chat"],
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
    status: "deprecated",
    strengths: ["reasoning", "coding", "data"],
    notes: {
      es: "Modelo de razonamiento deprecado por OpenAI (se apaga el 2026-12-11). Las capacidades de razonamiento están integradas en GPT-5.6.",
      en: "Reasoning model deprecated by OpenAI (shutdown 2026-12-11). Reasoning capabilities are integrated into GPT-5.6.",
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
    capabilities: {
      inputModalities: ["text", "image", "pdf"],
      outputModalities: ["text"],
      contextWindowTokens: 1000000,
      maxOutputTokens: 128000,
      latencyClass: "slow",
      structuredOutput: true,
      toolUse: true,
      nativeSearch: true,
      reasoningTier: 3,
      codingAgentFit: 3,
      taskFit: {
        chat: 1,
        coding: 3,
        codingAgent: 3,
        research: 3,
        longContext: 3,
        multimodal: 2,
        dataExtraction: 2,
        creativeWriting: 3,
        marketing: 1,
        translation: 1,
        summarization: 1,
        tutoring: 2,
        imagePrompts: 1,
        complexReasoning: 3,
        fastLightweight: 0,
      },
      promptGuidance: {
        es: "Planteá el objetivo, las restricciones y la intención en vez de un paso a paso detallado: los prompts sobre-prescriptivos pensados para modelos anteriores le bajan la calidad. El razonamiento está siempre activo; en corridas largas pedile que audite sus avances contra los resultados reales de las herramientas.",
        en: "State the goal, constraints, and intent instead of step-by-step scaffolding — over-prescriptive prompts written for older models measurably reduce its output quality. Thinking is always on; on long runs require progress claims to be audited against tool results.",
      },
    },
    interactionProfiles: ["chat", "codingAgent"],
  },
  {
    id: "claude-opus-5",
    label: "Claude Opus 5",
    provider: "anthropic",
    target: "claude",
    family: "Claude",
    status: "stable",
    strengths: ["reasoning", "coding", "long_context"],
    notes: {
      es: "El Opus actual de Anthropic: ideal para coding agéntico complejo y trabajo empresarial. Dale la especificación completa en un solo turno y pedile concisión.",
      en: "Anthropic's current Opus: ideal for complex agentic coding and enterprise work. Give the full spec in one turn and ask for conciseness.",
    },
    apiModelId: "claude-opus-5",
    verifiedAt: VERIFIED,
    sourceUrl: SRC.anthropic,
    selectable: true,
    capabilities: {
      inputModalities: ["text", "image", "pdf"],
      outputModalities: ["text"],
      contextWindowTokens: 1000000,
      maxOutputTokens: 128000,
      latencyClass: "balanced",
      structuredOutput: true,
      toolUse: true,
      nativeSearch: true,
      reasoningTier: 3,
      codingAgentFit: 3,
      taskFit: {
        chat: 2,
        coding: 3,
        codingAgent: 3,
        research: 3,
        longContext: 3,
        multimodal: 2,
        dataExtraction: 3,
        creativeWriting: 3,
        marketing: 2,
        translation: 2,
        summarization: 2,
        tutoring: 3,
        imagePrompts: 2,
        complexReasoning: 3,
        fastLightweight: 0,
      },
      promptGuidance: {
        es: "Dale la especificación completa de entrada, en un solo turno bien definido; sacá las instrucciones de 'verificá tu trabajo' (se auto-verifica y tiende a sobre-verificar) y agregá líneas explícitas de concisión y disciplina de alcance.",
        en: "Give the complete task spec up front in one well-specified turn; drop 'double-check your work' instructions (it self-verifies and over-verifies) and add explicit conciseness and scope-discipline lines.",
      },
    },
    interactionProfiles: ["chat", "codingAgent"],
  },
  {
    id: "claude-opus-4.8",
    label: "Claude Opus 4.8",
    provider: "anthropic",
    target: "claude",
    family: "Claude",
    status: "legacy",
    strengths: ["reasoning", "coding", "long_context"],
    notes: {
      es: "Generación anterior de Opus (ahora en la sección Legacy de Anthropic). Usá Claude Opus 5.",
      en: "Previous Opus generation (now in Anthropic's Legacy section). Use Claude Opus 5.",
    },
    apiModelId: "claude-opus-4-8",
    openRouterId: "anthropic/claude-opus-4.8",
    verifiedAt: VERIFIED,
    sourceUrl: SRC.anthropic,
    replacementId: "claude-opus-5",
    selectable: false,
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
    capabilities: {
      inputModalities: ["text", "image", "pdf"],
      outputModalities: ["text"],
      contextWindowTokens: 1000000,
      maxOutputTokens: 128000,
      latencyClass: "fast",
      structuredOutput: true,
      toolUse: true,
      nativeSearch: true,
      reasoningTier: 2,
      codingAgentFit: 3,
      taskFit: {
        chat: 3,
        coding: 3,
        codingAgent: 3,
        research: 2,
        longContext: 3,
        multimodal: 2,
        dataExtraction: 3,
        creativeWriting: 3,
        marketing: 2,
        translation: 2,
        summarization: 3,
        tutoring: 3,
        imagePrompts: 2,
        complexReasoning: 2,
        fastLightweight: 1,
      },
      promptGuidance: {
        es: "Estructurá el prompt con etiquetas XML, poné los documentos largos arriba y la consulta al final, y definí criterios de éxito explícitos. Sigue las instrucciones de forma literal: aclarale el alcance ('aplicalo a todas las secciones') en vez de esperar que generalice.",
        en: "Structure prompts with XML tags, put long documents at the top and the query at the end, and give explicit success criteria. It follows instructions literally — state scope ('apply to every section') rather than expecting generalization.",
      },
    },
    interactionProfiles: ["chat", "codingAgent"],
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
    capabilities: {
      inputModalities: ["text", "image", "pdf"],
      outputModalities: ["text"],
      contextWindowTokens: 200000,
      maxOutputTokens: 64000,
      latencyClass: "fast",
      structuredOutput: true,
      toolUse: true,
      nativeSearch: true,
      reasoningTier: 1,
      codingAgentFit: 2,
      taskFit: {
        chat: 2,
        coding: 2,
        codingAgent: 2,
        research: 1,
        longContext: 1,
        multimodal: 2,
        dataExtraction: 2,
        creativeWriting: 2,
        marketing: 2,
        translation: 2,
        summarization: 3,
        tutoring: 1,
        imagePrompts: 2,
        complexReasoning: 1,
        fastLightweight: 3,
      },
      promptGuidance: {
        es: "Mantené el prompt corto y explícito: tarea clara, formato de salida exacto y 1-2 ejemplos rinden más que instrucciones largas. Activá el extended thinking (budget_tokens) solo para tareas más difíciles.",
        en: "Keep prompts short and explicit: a clear task, an exact output format, and 1-2 examples outperform long instructions. Enable extended thinking (budget_tokens) only for harder tasks.",
      },
    },
    interactionProfiles: ["chat", "codingAgent"],
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
      es: "Alias genérico legacy. Usá Claude Opus 5.",
      en: "Legacy generic alias. Use Claude Opus 5.",
    },
    verifiedAt: VERIFIED,
    sourceUrl: SRC.anthropic,
    replacementId: "claude-opus-5",
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
    id: "gemini-3.6-flash",
    label: "Gemini 3.6 Flash",
    provider: "google",
    target: "gemini",
    family: "Gemini",
    status: "stable",
    strengths: ["speed", "multimodal", "long_context", "coding"],
    notes: {
      es: "El Flash más nuevo de Google (GA jul 2026): el mejor Gemini agéntico y de herramientas, con computer use integrado. Tiende a respuestas cortas; pedile detalle si lo necesitás.",
      en: "Google's newest Flash (GA Jul 2026): the best agentic/tool-use Gemini, with built-in computer use. Defaults to terse answers; ask for detail when you need it.",
    },
    apiModelId: "gemini-3.6-flash",
    verifiedAt: VERIFIED,
    sourceUrl: "https://ai.google.dev/gemini-api/docs/latest-model",
    selectable: true,
    capabilities: {
      inputModalities: ["text", "image", "audio", "video", "pdf"],
      outputModalities: ["text"],
      contextWindowTokens: 1048576,
      maxOutputTokens: 64000,
      latencyClass: "fast",
      structuredOutput: true,
      toolUse: true,
      nativeSearch: true,
      reasoningTier: 2,
      codingAgentFit: 3,
      taskFit: {
        chat: 3,
        coding: 3,
        codingAgent: 3,
        research: 2,
        longContext: 3,
        multimodal: 3,
        dataExtraction: 3,
        creativeWriting: 2,
        marketing: 2,
        translation: 2,
        summarization: 3,
        tutoring: 2,
        imagePrompts: 2,
        complexReasoning: 2,
        fastLightweight: 2,
      },
      promptGuidance: {
        es: "Para inputs largos poné el contexto primero y las instrucciones al final, con un solo estilo de delimitadores. Dejá los parámetros de sampling por defecto y controlá la profundidad con thinking_level; por defecto es escueto, así que pedile prosa detallada de forma explícita.",
        en: "Place context first and instructions at the end for long inputs, using one consistent delimiter style. Leave sampling params at defaults and control depth with thinking_level; it is terse by default, so ask explicitly for detailed prose.",
      },
    },
    interactionProfiles: ["chat", "multimodalAssistant", "codingAgent"],
  },
  {
    id: "gemini-3.5-flash",
    label: "Gemini 3.5 Flash",
    provider: "google",
    target: "gemini",
    family: "Gemini",
    status: "stable",
    strengths: ["speed", "multimodal", "long_context", "coding"],
    notes: {
      es: "Workhorse GA de Gemini para tareas agénticas y de código (contexto 1M, multimodal completo). Pedí formato visible y un ejemplo corto del resultado.",
      en: "Gemini's GA workhorse for agentic and coding tasks (1M context, fully multimodal). Specify a visible output format and add a short result example.",
    },
    apiModelId: "gemini-3.5-flash",
    openRouterId: "google/gemini-3.5-flash",
    verifiedAt: VERIFIED,
    sourceUrl: "https://ai.google.dev/gemini-api/docs/whats-new-gemini-3.5",
    selectable: true,
    defaultForTarget: true,
    capabilities: {
      inputModalities: ["text", "image", "audio", "video", "pdf"],
      outputModalities: ["text"],
      contextWindowTokens: 1048576,
      maxOutputTokens: 65536,
      latencyClass: "fast",
      structuredOutput: true,
      toolUse: true,
      nativeSearch: true,
      reasoningTier: 2,
      codingAgentFit: 3,
      taskFit: {
        chat: 3,
        coding: 3,
        codingAgent: 3,
        research: 2,
        longContext: 3,
        multimodal: 3,
        dataExtraction: 2,
        creativeWriting: 2,
        marketing: 2,
        translation: 2,
        summarization: 3,
        tutoring: 2,
        imagePrompts: 2,
        complexReasoning: 2,
        fastLightweight: 2,
      },
      promptGuidance: {
        es: "Mantené las instrucciones concisas y directas; con datasets grandes poné la pregunta al final del prompt. El esfuerzo de thinking por defecto es medio: subilo a alto solo para razonamiento difícil, y usá structured output para JSON complejo.",
        en: "Keep instructions concise and direct; for large datasets place the question at the end of the prompt. Default thinking effort is medium — raise to high only for hard reasoning, and use structured output for complex JSON.",
      },
    },
    interactionProfiles: ["chat", "multimodalAssistant", "codingAgent"],
  },
  {
    id: "gemini-3.5-flash-lite",
    label: "Gemini 3.5 Flash-Lite",
    provider: "google",
    target: "gemini",
    family: "Gemini",
    status: "stable",
    strengths: ["speed", "multimodal", "data"],
    notes: {
      es: "El más rápido y barato de la familia 3.5. Recomendado por Google para extracción de datos de alto volumen y subagentes.",
      en: "Fastest, lowest-cost model in the 3.5 family. Google's pick for high-volume data extraction and subagent execution.",
    },
    apiModelId: "gemini-3.5-flash-lite",
    verifiedAt: VERIFIED,
    sourceUrl: "https://ai.google.dev/gemini-api/docs/latest-model",
    selectable: true,
    capabilities: {
      inputModalities: ["text", "image", "audio", "video", "pdf"],
      outputModalities: ["text"],
      contextWindowTokens: 1048576,
      maxOutputTokens: 64000,
      latencyClass: "fast",
      structuredOutput: true,
      toolUse: true,
      nativeSearch: true,
      reasoningTier: 1,
      codingAgentFit: 1,
      taskFit: {
        chat: 2,
        coding: 1,
        codingAgent: 1,
        research: 1,
        longContext: 2,
        multimodal: 2,
        dataExtraction: 3,
        creativeWriting: 1,
        marketing: 1,
        translation: 2,
        summarization: 2,
        tutoring: 1,
        imagePrompts: 1,
        complexReasoning: 1,
        fastLightweight: 3,
      },
      promptGuidance: {
        es: "Mantené el prompt compacto, con instrucciones explícitas y un formato o schema de salida exacto; subí thinking_level desde el mínimo por defecto cuando la tarea necesite lógica de varios pasos, y sumá un ejemplo corto del resultado esperado.",
        en: "Keep prompts compact with explicit instructions and an exact output format or schema; raise thinking_level from the minimal default when a task needs multi-step logic, and add one short example of the expected result.",
      },
    },
    interactionProfiles: ["chat", "multimodalAssistant"],
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
    capabilities: {
      inputModalities: ["text", "image", "audio", "video", "pdf"],
      outputModalities: ["text"],
      contextWindowTokens: 1048576,
      maxOutputTokens: 65536,
      latencyClass: "fast",
      structuredOutput: true,
      toolUse: true,
      nativeSearch: true,
      reasoningTier: 1,
      codingAgentFit: 1,
      taskFit: {
        chat: 2,
        coding: 1,
        codingAgent: 1,
        research: 1,
        longContext: 2,
        multimodal: 2,
        dataExtraction: 2,
        creativeWriting: 1,
        marketing: 1,
        translation: 2,
        summarization: 2,
        tutoring: 1,
        imagePrompts: 1,
        complexReasoning: 1,
        fastLightweight: 3,
      },
      promptGuidance: {
        es: "Prompt compacto, instrucciones explícitas, formato de salida exacto y un ejemplo corto. Usá los niveles de thinking para balancear costo y calidad, y structured output en vez de describir el JSON en el prompt.",
        en: "Compact prompts, explicit instructions, an exact output format, and one short example. Use thinking levels to trade cost vs quality, and structured output rather than prompt-described JSON.",
      },
    },
    interactionProfiles: ["chat", "multimodalAssistant"],
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
    apiModelId: "gemini-3.1-pro-preview",
    verifiedAt: VERIFIED,
    sourceUrl: SRC.google,
    selectable: true,
    capabilities: {
      inputModalities: ["text", "image", "audio", "video", "pdf"],
      outputModalities: ["text"],
      contextWindowTokens: 1048576,
      maxOutputTokens: 64000,
      latencyClass: "slow",
      structuredOutput: true,
      toolUse: true,
      nativeSearch: true,
      reasoningTier: 3,
      codingAgentFit: 2,
      taskFit: {
        chat: 2,
        coding: 3,
        codingAgent: 2,
        research: 3,
        longContext: 3,
        multimodal: 3,
        dataExtraction: 2,
        creativeWriting: 2,
        marketing: 2,
        translation: 2,
        summarization: 2,
        tutoring: 3,
        imagePrompts: 2,
        complexReasoning: 3,
        fastLightweight: 0,
      },
      promptGuidance: {
        es: "Pedile que marque supuestos y muestre su razonamiento en problemas complejos; indicarle que 'piense muy bien antes de responder' ayuda de forma medible en prompts exigentes. Contexto primero e instrucciones al final para inputs largos, con delimitadores consistentes.",
        en: "Ask it to state assumptions and show its work on complex problems; 'think very hard before answering' measurably helps on reasoning-heavy prompts. Context first, instructions last for long inputs, with consistent delimiters.",
      },
    },
    interactionProfiles: ["chat", "multimodalAssistant"],
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
    sourceUrl: "https://docs.x.ai/developers/grok-4-5",
    selectable: true,
    defaultForTarget: true,
    capabilities: {
      inputModalities: ["text", "image"],
      outputModalities: ["text"],
      contextWindowTokens: 500000,
      maxOutputTokens: null,
      latencyClass: "balanced",
      structuredOutput: true,
      toolUse: true,
      nativeSearch: true,
      reasoningTier: 3,
      codingAgentFit: 2,
      taskFit: {
        chat: 3,
        coding: 2,
        codingAgent: 2,
        research: 3,
        longContext: 2,
        multimodal: 1,
        dataExtraction: 2,
        creativeWriting: 2,
        marketing: 2,
        translation: 2,
        summarization: 2,
        tutoring: 2,
        imagePrompts: 2,
        complexReasoning: 3,
        fastLightweight: 1,
      },
      promptGuidance: {
        es: "Definí reasoning_effort de forma explícita (por defecto es alto: bajalo si querés velocidad) y separá tarea, restricciones y contexto con etiquetas. Activá las herramientas server-side de búsqueda web/X cuando importe la actualidad, y especificá el tono: por defecto es directo.",
        en: "Set reasoning_effort explicitly (default is high — lower it for speed) and separate task, constraints, and context with labeled tags. Enable the server-side web/X search tools when freshness matters, and specify tone — it is direct by default.",
      },
    },
    interactionProfiles: ["chat", "researchAssistant"],
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
    sourceUrl: "https://docs.x.ai/developers/models/grok-4.3",
    selectable: true,
    capabilities: {
      inputModalities: ["text", "image", "pdf"],
      outputModalities: ["text"],
      contextWindowTokens: 1000000,
      maxOutputTokens: null,
      latencyClass: "fast",
      structuredOutput: true,
      toolUse: true,
      nativeSearch: true,
      reasoningTier: 2,
      codingAgentFit: 2,
      taskFit: {
        chat: 3,
        coding: 2,
        codingAgent: 2,
        research: 2,
        longContext: 3,
        multimodal: 1,
        dataExtraction: 2,
        creativeWriting: 2,
        marketing: 2,
        translation: 2,
        summarization: 3,
        tutoring: 2,
        imagePrompts: 1,
        complexReasoning: 2,
        fastLightweight: 2,
      },
      promptGuidance: {
        es: "Poné reasoning_effort en 'none' para respuestas rápidas y baratas, o subilo cuando haga falta razonar. Con documentos largos, separá el material fuente de las instrucciones con etiquetas XML o títulos, y mantené un prefijo estable para aprovechar el caching implícito.",
        en: "Set reasoning_effort to 'none' for cheap fast replies, or raise it when reasoning is needed. For long documents, separate source material from instructions with XML tags or headings, and keep a stable prefix to exploit implicit caching.",
      },
    },
    interactionProfiles: ["chat"],
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
      es: "Grok especializado en coding agéntico (motor del Grok Build CLI). Pedí criterios de corrección y casos borde.",
      en: "Agentic-coding-specialized Grok (powers the Grok Build CLI). Ask for correctness criteria and edge cases.",
    },
    apiModelId: "grok-build-0.1",
    openRouterId: "x-ai/grok-build-0.1",
    verifiedAt: VERIFIED,
    sourceUrl: "https://docs.x.ai/developers/models/grok-build-0.1",
    selectable: true,
    capabilities: {
      inputModalities: ["text", "image"],
      outputModalities: ["text"],
      contextWindowTokens: 256000,
      maxOutputTokens: null,
      latencyClass: "fast",
      structuredOutput: true,
      toolUse: true,
      nativeSearch: false,
      reasoningTier: 2,
      codingAgentFit: 3,
      taskFit: {
        chat: 1,
        coding: 3,
        codingAgent: 3,
        research: 1,
        longContext: 2,
        multimodal: 1,
        dataExtraction: 2,
        creativeWriting: 0,
        marketing: 0,
        translation: 1,
        summarization: 1,
        tutoring: 1,
        imagePrompts: 0,
        complexReasoning: 2,
        fastLightweight: 1,
      },
      promptGuidance: {
        es: "Señalale los archivos y secciones relevantes en vez de tirarle todo el repo: el contexto irrelevante lo degrada. Estructurá objetivos, restricciones y contexto con títulos o etiquetas XML, definí criterios de corrección explícitos e iterá en diffs chicos.",
        en: "Point it at the specific files and sections relevant to the task instead of dumping the whole repo — irrelevant context degrades it. Structure goals, constraints, and context with headings or XML tags, state explicit correctness criteria, and iterate in small diffs.",
      },
    },
    interactionProfiles: ["codingAgent", "codeSpecialist"],
  },
  {
    id: "grok-2",
    label: "Grok (legacy)",
    provider: "xai",
    target: "grok",
    family: "Grok",
    status: "deprecated",
    strengths: ["writing", "speed"],
    notes: {
      es: "Familia Grok 2 deprecada por xAI (retirada en 2026). Usá Grok 4.5.",
      en: "Grok 2 family deprecated by xAI (retired in 2026). Use Grok 4.5.",
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
    capabilities: {
      inputModalities: ["text"],
      outputModalities: ["text"],
      contextWindowTokens: 1000000,
      maxOutputTokens: 384000,
      latencyClass: "fast",
      structuredOutput: true,
      toolUse: true,
      nativeSearch: false,
      reasoningTier: 2,
      codingAgentFit: 2,
      taskFit: {
        chat: 2,
        coding: 2,
        codingAgent: 2,
        research: 1,
        longContext: 3,
        multimodal: 0,
        dataExtraction: 2,
        creativeWriting: 1,
        marketing: 1,
        translation: 2,
        summarization: 2,
        tutoring: 2,
        imagePrompts: 1,
        complexReasoning: 2,
        fastLightweight: 3,
      },
      promptGuidance: {
        es: "El modo thinking viene activado por defecto: desactivalo para tareas rápidas y baratas. En modo JSON incluí la palabra 'json' y un ejemplo de schema en el prompt con max_tokens generoso, y devolvé el reasoning_content completo en loops de herramientas multi-turno.",
        en: "Thinking is on by default — disable it for quick, cheap tasks. In JSON mode include the word 'json' plus an example schema in the prompt with generous max_tokens, and pass reasoning_content back fully in multi-turn tool loops.",
      },
    },
    interactionProfiles: ["chat", "codeSpecialist"],
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
    capabilities: {
      inputModalities: ["text"],
      outputModalities: ["text"],
      contextWindowTokens: 1000000,
      maxOutputTokens: 384000,
      latencyClass: "balanced",
      structuredOutput: true,
      toolUse: true,
      nativeSearch: false,
      reasoningTier: 3,
      codingAgentFit: 3,
      taskFit: {
        chat: 2,
        coding: 3,
        codingAgent: 3,
        research: 1,
        longContext: 3,
        multimodal: 0,
        dataExtraction: 2,
        creativeWriting: 1,
        marketing: 1,
        translation: 2,
        summarization: 2,
        tutoring: 2,
        imagePrompts: 1,
        complexReasoning: 3,
        fastLightweight: 1,
      },
      promptGuidance: {
        es: "Dale criterios de aceptación, tests y casos borde explícitos para código, y bajá el esfuerzo de thinking (alto por defecto) en tareas simples. En modo thinking ignora los parámetros de sampling: guialo con instrucciones, no con temperature.",
        en: "Give explicit acceptance criteria, tests, and edge cases for code, and dial the default high thinking effort down for simple tasks. Sampling params are ignored in thinking mode — steer with instructions, not temperature.",
      },
    },
    interactionProfiles: ["chat", "codeSpecialist", "codingAgent"],
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
      es: "Alias retirado por DeepSeek el 2026-07-24 (ya no resuelve). Usá DeepSeek V4 Flash.",
      en: "Alias retired by DeepSeek on 2026-07-24 (no longer resolves). Use DeepSeek V4 Flash.",
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
    sourceUrl: "https://docs.perplexity.ai/docs/sonar/models/sonar-pro",
    selectable: true,
    defaultForTarget: true,
    capabilities: {
      inputModalities: ["text", "image"],
      outputModalities: ["text"],
      contextWindowTokens: 200000,
      maxOutputTokens: null,
      latencyClass: "balanced",
      structuredOutput: true,
      toolUse: false,
      nativeSearch: true,
      reasoningTier: 1,
      codingAgentFit: 0,
      taskFit: {
        chat: 2,
        coding: 1,
        codingAgent: 0,
        research: 3,
        longContext: 1,
        multimodal: 1,
        dataExtraction: 2,
        creativeWriting: 0,
        marketing: 1,
        translation: 0,
        summarization: 2,
        tutoring: 1,
        imagePrompts: 0,
        complexReasoning: 1,
        fastLightweight: 1,
      },
      promptGuidance: {
        es: "Solo el mensaje de usuario alimenta la búsqueda web (el system prompt no llega al retrieval): poné ahí todos los datos buscables y usá el system prompt solo para tono y formato. Evitá ejemplos few-shot y expresá restricciones de dominio o actualidad vía parámetros de la API, no en prosa.",
        en: "Only the user message drives the web search (the system prompt never reaches retrieval): put all searchable specifics there and use the system prompt for tone and format only. Avoid few-shot example answers and express domain/recency constraints via API parameters, not prose.",
      },
    },
    interactionProfiles: ["researchAssistant"],
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
    sourceUrl: "https://docs.perplexity.ai/docs/sonar/models/sonar",
    selectable: true,
    capabilities: {
      inputModalities: ["text", "image"],
      outputModalities: ["text"],
      contextWindowTokens: 128000,
      maxOutputTokens: null,
      latencyClass: "fast",
      structuredOutput: true,
      toolUse: false,
      nativeSearch: true,
      reasoningTier: 0,
      codingAgentFit: 0,
      taskFit: {
        chat: 2,
        coding: 0,
        codingAgent: 0,
        research: 2,
        longContext: 1,
        multimodal: 1,
        dataExtraction: 1,
        creativeWriting: 0,
        marketing: 1,
        translation: 0,
        summarization: 2,
        tutoring: 1,
        imagePrompts: 0,
        complexReasoning: 0,
        fastLightweight: 2,
      },
      promptGuidance: {
        es: "El mensaje de usuario es la semilla de la búsqueda: sé específico y sumá 2-3 palabras de contexto para desambiguar, porque una consulta vaga produce búsquedas vagas. Usá response_format para la estructura y los filtros de la API para restricciones de dominio o actualidad.",
        en: "The user message seeds the search, so keep queries specific and add 2-3 disambiguating context words — vague phrasing produces vague searches. Use response_format for structure and API filters for domain/recency constraints.",
      },
    },
    interactionProfiles: ["researchAssistant"],
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
    sourceUrl: "https://docs.perplexity.ai/docs/sonar/models/sonar-reasoning-pro",
    selectable: true,
    capabilities: {
      inputModalities: ["text"],
      outputModalities: ["text"],
      contextWindowTokens: 128000,
      maxOutputTokens: null,
      latencyClass: "balanced",
      structuredOutput: true,
      toolUse: false,
      nativeSearch: true,
      reasoningTier: 2,
      codingAgentFit: 0,
      taskFit: {
        chat: 1,
        coding: 1,
        codingAgent: 0,
        research: 3,
        longContext: 1,
        multimodal: 0,
        dataExtraction: 1,
        creativeWriting: 0,
        marketing: 1,
        translation: 0,
        summarization: 2,
        tutoring: 2,
        imagePrompts: 0,
        complexReasoning: 2,
        fastLightweight: 0,
      },
      promptGuidance: {
        es: "Poné la pregunta analítica completa, con todos los detalles, en el mensaje de usuario: el system prompt no influye en la búsqueda. Si pedís JSON, extraé el bloque <think> inicial antes de parsear, porque los tokens de razonamiento siempre aparecen en la salida.",
        en: "Put the full analytical question with all specifics in the user message — the system prompt does not influence search. When requesting JSON, strip the leading <think> block before parsing: reasoning tokens are always present in the output.",
      },
    },
    interactionProfiles: ["researchAssistant"],
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
    sourceUrl: "https://docs.perplexity.ai/docs/sonar/models/sonar-deep-research",
    selectable: true,
    capabilities: {
      inputModalities: ["text"],
      outputModalities: ["text"],
      contextWindowTokens: 128000,
      maxOutputTokens: null,
      latencyClass: "slow",
      structuredOutput: true,
      toolUse: false,
      nativeSearch: true,
      reasoningTier: 2,
      codingAgentFit: 0,
      taskFit: {
        chat: 0,
        coding: 0,
        codingAgent: 0,
        research: 3,
        longContext: 2,
        multimodal: 0,
        dataExtraction: 1,
        creativeWriting: 0,
        marketing: 1,
        translation: 0,
        summarization: 2,
        tutoring: 1,
        imagePrompts: 0,
        complexReasoning: 2,
        fastLightweight: 0,
      },
      promptGuidance: {
        es: "Tratá el prompt como un brief de investigación, no como una pregunta: definí de entrada alcance, período, geografía, dimensiones de análisis y estructura del informe. Usá reasoning_effort para controlar profundidad y costo.",
        en: "Treat the prompt as a research brief, not a question: define scope, time period, geography, analysis dimensions, and desired report structure upfront. Use reasoning_effort to control depth and cost.",
      },
    },
    interactionProfiles: ["researchAssistant"],
  },

  // ── Moonshot ──────────────────────────────────────────────────────────────
  {
    id: "kimi-k3",
    label: "Kimi K3",
    provider: "moonshot",
    target: "kimi",
    family: "Kimi",
    status: "stable",
    strengths: ["reasoning", "long_context", "multimodal", "coding"],
    notes: {
      es: "El flagship open-weights de Moonshot (contexto 1M; entrada de texto, imagen y video). Ideal para trabajo agéntico y de código de largo aliento.",
      en: "Moonshot's open-weights flagship (1M context; text, image, and video input). Ideal for long-horizon agentic and coding work.",
    },
    apiModelId: "kimi-k3",
    verifiedAt: VERIFIED,
    sourceUrl: "https://platform.kimi.ai/docs/pricing/chat-k3",
    selectable: true,
    capabilities: {
      inputModalities: ["text", "image", "video"],
      outputModalities: ["text"],
      contextWindowTokens: 1048576,
      maxOutputTokens: null,
      latencyClass: "slow",
      structuredOutput: true,
      toolUse: true,
      nativeSearch: true,
      reasoningTier: 3,
      codingAgentFit: 3,
      taskFit: {
        chat: 2,
        coding: 3,
        codingAgent: 3,
        research: 2,
        longContext: 3,
        multimodal: 2,
        dataExtraction: 2,
        creativeWriting: 2,
        marketing: 2,
        translation: 2,
        summarization: 3,
        tutoring: 2,
        imagePrompts: 1,
        complexReasoning: 3,
        fastLightweight: 0,
      },
      promptGuidance: {
        es: "Usá el prefill de Partial Mode para fijar el formato de salida y el JSON Mode pidiendo explícitamente 'respondé en JSON'. Ajustá el esfuerzo de razonamiento según la tarea y separá bien material fuente de instrucciones en trabajos de contexto 1M.",
        en: "Use Partial Mode prefill to lock the output format and JSON Mode with an explicit 'respond in JSON' instruction. Set reasoning effort per task and clearly separate source material from instructions on 1M-context jobs.",
      },
    },
    interactionProfiles: ["chat", "codingAgent", "multimodalAssistant"],
  },
  {
    id: "kimi-k2.6",
    label: "Kimi K2.6",
    provider: "moonshot",
    target: "kimi",
    family: "Kimi",
    status: "stable",
    strengths: ["long_context", "multimodal", "writing"],
    notes: {
      es: "Kimi multimodal de gran relación precio/rendimiento (texto, imagen y video; modos thinking y non-thinking). Separá fuente vs instrucciones y marcá prioridades.",
      en: "Great price/performance multimodal Kimi (text, image, and video input; thinking and non-thinking modes). Split source vs instructions and mark priorities.",
    },
    apiModelId: "kimi-k2.6",
    verifiedAt: VERIFIED,
    sourceUrl: "https://platform.kimi.ai/docs/pricing/chat-k26",
    selectable: true,
    defaultForTarget: true,
    capabilities: {
      inputModalities: ["text", "image", "video"],
      outputModalities: ["text"],
      contextWindowTokens: 262144,
      maxOutputTokens: null,
      latencyClass: "balanced",
      structuredOutput: true,
      toolUse: true,
      nativeSearch: true,
      reasoningTier: 2,
      codingAgentFit: 2,
      taskFit: {
        chat: 2,
        coding: 2,
        codingAgent: 2,
        research: 2,
        longContext: 2,
        multimodal: 2,
        dataExtraction: 2,
        creativeWriting: 2,
        marketing: 2,
        translation: 2,
        summarization: 2,
        tutoring: 2,
        imagePrompts: 1,
        complexReasoning: 2,
        fastLightweight: 1,
      },
      promptGuidance: {
        es: "Elegí explícitamente modo thinking o instantáneo según la tarea (temperaturas oficiales: 1.0 thinking, 0.6 instantáneo). Usá el prefill de Partial Mode para forzar formato, JSON Mode pidiendo JSON explícitamente, y separá el texto fuente de las instrucciones en inputs largos.",
        en: "Choose thinking vs instant mode explicitly per task (official temperatures: 1.0 thinking, 0.6 instant). Use Partial Mode prefill to enforce format, JSON Mode with an explicit JSON request, and split source text from instructions for long inputs.",
      },
    },
    interactionProfiles: ["chat", "multimodalAssistant"],
  },
  {
    id: "kimi-k2.7-code",
    label: "Kimi K2.7 Code",
    provider: "moonshot",
    target: "kimi",
    family: "Kimi",
    status: "stable",
    strengths: ["coding", "speed"],
    notes: {
      es: "Kimi especializado en coding agéntico (~30% menos tokens de razonamiento que K2.6 al mismo precio). Par natural del Kimi Code CLI.",
      en: "Agentic-coding-specialized Kimi (~30% fewer reasoning tokens than K2.6 at the same price). Natural pairing with the Kimi Code CLI.",
    },
    apiModelId: "kimi-k2.7-code",
    verifiedAt: VERIFIED,
    sourceUrl: "https://platform.kimi.ai/docs/pricing/chat-k27-code",
    selectable: true,
    capabilities: {
      inputModalities: ["text", "image", "video"],
      outputModalities: ["text"],
      contextWindowTokens: 262144,
      maxOutputTokens: null,
      latencyClass: "balanced",
      structuredOutput: true,
      toolUse: true,
      nativeSearch: false,
      reasoningTier: 2,
      codingAgentFit: 3,
      taskFit: {
        chat: 1,
        coding: 3,
        codingAgent: 3,
        research: 1,
        longContext: 2,
        multimodal: 2,
        dataExtraction: 1,
        creativeWriting: 1,
        marketing: 1,
        translation: 1,
        summarization: 1,
        tutoring: 1,
        imagePrompts: 0,
        complexReasoning: 2,
        fastLightweight: 1,
      },
      promptGuidance: {
        es: "Tratalo como un modelo de código para loops de agente: dale contexto del repo, criterios de aceptación concretos y comandos de test, y dejalo iterar con herramientas en vez de pedirle todo de una. Usá Partial Mode o JSON Mode para diffs y planes legibles por máquina.",
        en: "Treat it as an agent-loop coding model: give repo context, concrete acceptance criteria, and test commands, and let it iterate with tools rather than one-shotting. Use Partial Mode or JSON Mode for machine-readable diffs and plans.",
      },
    },
    interactionProfiles: ["codingAgent", "codeSpecialist"],
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
    verifiedAt: VERIFIED_PREV,
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

/**
 * v1.3.0: models the matcher may rank. Deprecated/legacy and non-selectable
 * entries are excluded by construction, and an entry without capability data
 * can never be recommended.
 */
export function getMatcherCandidates(): ModelEntry[] {
  return MODEL_REGISTRY.filter(
    (entry) =>
      entry.selectable &&
      (entry.status === "stable" || entry.status === "preview") &&
      entry.capabilities !== undefined
  );
}

/** Sanity export used by tests: all targets covered by the registry. */
export const REGISTRY_TARGETS = TARGETS;
