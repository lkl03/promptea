// lib/seo/content/landings.ts
//
// SEO landing pages registry. Each entry produces a unique route under
// /{lang}/landing/<slug> with its own metadata, intro copy, and CTAs back
// to the analyzer. Content is intentionally short and useful — no keyword stuffing.

import type { Locale } from "../site";
import type { Purpose, TargetModel } from "../prefill";

export type LandingPage = {
  slug: string;
  title: Record<Locale, string>;
  description: Record<Locale, string>;
  h1: Record<Locale, string>;
  intro: Record<Locale, string[]>;
  bullets: Record<Locale, string[]>;
  ctaLabel: Record<Locale, string>;
  prefill?: { purpose: Purpose; target: TargetModel };
  internalLinks: Array<{
    href: (lang: Locale) => string;
    label: Record<Locale, string>;
  }>;
};

const HUB_LINKS: LandingPage["internalLinks"] = [
  {
    href: (l) => `/${l}/prompts`,
    label: { es: "Packs de prompts", en: "Prompt packs" },
  },
  {
    href: (l) => `/${l}/guides`,
    label: { es: "Guías", en: "Guides" },
  },
  {
    href: (l) => `/${l}/models`,
    label: { es: "Prompts por modelo", en: "Prompts by model" },
  },
];

export const landings: LandingPage[] = [
  {
    slug: "prompt-analyzer",
    title: {
      en: "Prompt analyzer — review and score any AI prompt",
      es: "Analizador de prompts — revisá y puntuá cualquier prompt de IA",
    },
    description: {
      en: "Free prompt analyzer. Detects missing context, output format, constraints, and gives a per-task score with concrete fixes.",
      es: "Analizador de prompts gratuito. Detecta contexto faltante, formato, restricciones y da un puntaje por tarea con correcciones concretas.",
    },
    h1: {
      en: "Prompt analyzer",
      es: "Analizador de prompts",
    },
    intro: {
      en: [
        "Promptea reviews your prompt against criteria that matter for the task you pick — coding, data, marketing, study, image, translation, or summary.",
        "You get a score, the missing pieces, what to fix first, and an optimized version ready to copy.",
      ],
      es: [
        "Promptea revisa tu prompt con los criterios que importan para la tarea que elegís: código, datos, marketing, estudio, imagen, traducción o resumen.",
        "Obtenés un puntaje, lo que falta, por dónde empezar y una versión optimizada lista para copiar.",
      ],
    },
    bullets: {
      en: [
        "Score breakdown by clarity, context, constraints, output, and verifiability.",
        "Targeted follow-up questions when the prompt is too ambiguous.",
        "Optimized output as a human-readable checklist or strict JSON.",
      ],
      es: [
        "Puntaje desglosado por claridad, contexto, restricciones, formato y verificabilidad.",
        "Preguntas de seguimiento puntuales cuando el prompt es ambiguo.",
        "Salida optimizada como checklist legible o JSON estricto.",
      ],
    },
    ctaLabel: { en: "Analyze a prompt", es: "Analizar un prompt" },
    internalLinks: HUB_LINKS,
  },
  {
    slug: "ai-prompt-optimizer",
    title: {
      en: "AI prompt optimizer — make any prompt work better",
      es: "Optimizador de prompts de IA — mejorá cualquier prompt",
    },
    description: {
      en: "Optimize prompts for GPT, Claude, Gemini, Grok, DeepSeek, and Kimi. Reduce ambiguity, define formats, and tailor structure per model.",
      es: "Optimizá prompts para GPT, Claude, Gemini, Grok, DeepSeek y Kimi. Reducí ambigüedad, definí formato y ajustá la estructura por modelo.",
    },
    h1: { en: "AI prompt optimizer", es: "Optimizador de prompts de IA" },
    intro: {
      en: [
        "The optimizer rewrites your prompt with clear sections, explicit constraints, and a model-aware structure.",
        "Every model has different strengths — Promptea picks the right hints automatically when you select a target.",
      ],
      es: [
        "El optimizador reescribe tu prompt con secciones claras, restricciones explícitas y estructura adaptada al modelo.",
        "Cada modelo tiene fortalezas distintas: Promptea elige los hints adecuados según el target que seleccionás.",
      ],
    },
    bullets: {
      en: [
        "Per-model hints (GPT, Claude, Gemini, Grok, DeepSeek, Kimi).",
        "Choose checklist or pure JSON output, depending on your workflow.",
        "Attachments treated as context, not as instructions.",
      ],
      es: [
        "Hints por modelo (GPT, Claude, Gemini, Grok, DeepSeek, Kimi).",
        "Elegí salida tipo checklist o JSON puro, según tu flujo de trabajo.",
        "Los adjuntos se tratan como contexto, no como instrucciones.",
      ],
    },
    ctaLabel: { en: "Optimize my prompt", es: "Optimizar mi prompt" },
    internalLinks: HUB_LINKS,
  },
  {
    slug: "prompt-scoring",
    title: {
      en: "Prompt scoring — see what's missing in any prompt",
      es: "Score de prompts — ver qué le falta a cualquier prompt",
    },
    description: {
      en: "Quantitative score across clarity, context, constraints, output format, verifiability, and safety. With reasoning and quick wins.",
      es: "Score cuantitativo de claridad, contexto, restricciones, formato, verificabilidad y seguridad. Con explicación y quick wins.",
    },
    h1: { en: "Prompt scoring", es: "Score de prompts" },
    intro: {
      en: [
        "Promptea scores your prompt with a transparent breakdown so you know what to fix first.",
        "It also tells you what's already working, so you don't break a good prompt by over-editing.",
      ],
      es: [
        "Promptea puntúa tu prompt con un desglose transparente para saber qué arreglar primero.",
        "También marca qué ya funciona, para no romper un buen prompt por sobre-editar.",
      ],
    },
    bullets: {
      en: [
        "Transparent score breakdown with confidence level.",
        "Critical issues, quick wins, and missing information separated.",
        "Task-aware criteria (debugging, data, marketing, study, image, etc.).",
      ],
      es: [
        "Desglose transparente con nivel de confianza.",
        "Problemas críticos, quick wins e información faltante separados.",
        "Criterios por tarea (debugging, datos, marketing, estudio, imagen, etc.).",
      ],
    },
    ctaLabel: { en: "Score my prompt", es: "Puntuar mi prompt" },
    internalLinks: HUB_LINKS,
  },
  {
    slug: "prompt-generator-for-claude",
    title: {
      en: "Prompt generator for Claude — Sonnet, Opus, Haiku",
      es: "Generador de prompts para Claude — Sonnet, Opus, Haiku",
    },
    description: {
      en: "Generate Claude-style prompts with explicit context, structured instructions, examples, and a clear output format.",
      es: "Generá prompts estilo Claude con contexto explícito, instrucciones estructuradas, ejemplos y formato de salida claro.",
    },
    h1: { en: "Prompt generator for Claude", es: "Generador de prompts para Claude" },
    intro: {
      en: [
        "Claude responds best with explicit sections, XML-style delimiters for long input, and well-defined success criteria.",
        "Promptea applies these conventions automatically when you target Claude (Sonnet, Opus, or Haiku).",
      ],
      es: [
        "Claude rinde mejor con secciones explícitas, delimitadores tipo XML para input largo y criterios de éxito definidos.",
        "Promptea aplica esas convenciones automáticamente cuando elegís Claude (Sonnet, Opus o Haiku).",
      ],
    },
    bullets: {
      en: [
        "Wraps long source material in <context> / <source_text> tags.",
        "Adds explicit success criteria when relevant.",
        "Picks structure that matches Claude's preferred input style.",
      ],
      es: [
        "Envuelve material fuente largo en tags <context> / <source_text>.",
        "Agrega criterios de éxito explícitos cuando aplica.",
        "Estructura adaptada al estilo de input que prefiere Claude.",
      ],
    },
    ctaLabel: { en: "Generate a Claude prompt", es: "Generar prompt para Claude" },
    prefill: { purpose: "text", target: "claude" },
    internalLinks: [
      ...HUB_LINKS,
      {
        href: (l) => `/${l}/models/claude`,
        label: { es: "Tips y plantillas para Claude", en: "Tips and templates for Claude" },
      },
    ],
  },
  {
    slug: "prompt-generator-for-chatgpt",
    title: {
      en: "Prompt generator for ChatGPT — GPT-4.1, GPT-4o, o3",
      es: "Generador de prompts para ChatGPT — GPT-4.1, GPT-4o, o3",
    },
    description: {
      en: "Generate ChatGPT-ready prompts with role, decomposed task, constraints, examples, and explicit evaluation criteria.",
      es: "Generá prompts listos para ChatGPT con rol, tarea descompuesta, restricciones, ejemplos y criterios de evaluación explícitos.",
    },
    h1: { en: "Prompt generator for ChatGPT", es: "Generador de prompts para ChatGPT" },
    intro: {
      en: [
        "ChatGPT (GPT-4.1, GPT-4o, o3) benefits from instruction-first prompts with delimiters, decomposed steps, and clear acceptance criteria.",
        "Promptea structures prompts the way GPT expects them and adapts the depth to the use case you pick.",
      ],
      es: [
        "ChatGPT (GPT-4.1, GPT-4o, o3) rinde mejor con prompts que ponen la instrucción primero, usan delimitadores y tienen criterios de aceptación claros.",
        "Promptea estructura los prompts como GPT los espera y adapta la profundidad al caso de uso que elijas.",
      ],
    },
    bullets: {
      en: [
        "Instruction-first ordering with explicit delimiters.",
        "Acceptance criteria block when the task benefits from it.",
        "Sub-model awareness for reasoning vs general models.",
      ],
      es: [
        "Instrucción primero, con delimitadores explícitos.",
        "Bloque de criterios de aceptación cuando aporta valor.",
        "Considera el submodelo (razonamiento vs general).",
      ],
    },
    ctaLabel: { en: "Generate a ChatGPT prompt", es: "Generar prompt para ChatGPT" },
    prefill: { purpose: "text", target: "gpt" },
    internalLinks: [
      ...HUB_LINKS,
      {
        href: (l) => `/${l}/models/gpt`,
        label: { es: "Tips y plantillas para GPT", en: "Tips and templates for GPT" },
      },
    ],
  },
  {
    slug: "prompt-generator-for-gemini",
    title: {
      en: "Prompt generator for Gemini — Pro and Flash",
      es: "Generador de prompts para Gemini — Pro y Flash",
    },
    description: {
      en: "Generate Gemini prompts with exact output format, short examples, and explicit handling of unknowns.",
      es: "Generá prompts para Gemini con formato exacto, ejemplos cortos y manejo explícito de la incertidumbre.",
    },
    h1: { en: "Prompt generator for Gemini", es: "Generador de prompts para Gemini" },
    intro: {
      en: [
        "Gemini benefits from a visible, exact output format and from being told what to do under uncertainty.",
        "Promptea includes a short structural example when consistency matters.",
      ],
      es: [
        "Gemini rinde mejor con un formato exacto y visible y con instrucciones claras sobre qué hacer ante incertidumbre.",
        "Promptea incluye un ejemplo estructural corto cuando hace falta consistencia.",
      ],
    },
    bullets: {
      en: [
        "Exact output format with optional mini-template.",
        "Explicit fallback when info is missing.",
        "Length caps to avoid verbose answers.",
      ],
      es: [
        "Formato exacto con mini plantilla opcional.",
        "Fallback explícito cuando falta información.",
        "Límite de largo para evitar respuestas verbosas.",
      ],
    },
    ctaLabel: { en: "Generate a Gemini prompt", es: "Generar prompt para Gemini" },
    prefill: { purpose: "text", target: "gemini" },
    internalLinks: [
      ...HUB_LINKS,
      {
        href: (l) => `/${l}/models/gemini`,
        label: { es: "Tips y plantillas para Gemini", en: "Tips and templates for Gemini" },
      },
    ],
  },
  {
    slug: "json-prompt-generator",
    title: {
      en: "JSON prompt generator — strict schema-friendly prompts",
      es: "Generador de prompts JSON — prompts estrictos para schemas",
    },
    description: {
      en: "Generate prompts that return valid JSON only — fields, types, missing-value rules, and post-validation steps.",
      es: "Generá prompts que devuelven SOLO JSON válido: campos, tipos, reglas para faltantes y validación posterior.",
    },
    h1: { en: "JSON prompt generator", es: "Generador de prompts JSON" },
    intro: {
      en: [
        "When you need machine-readable output, ambiguity is the enemy. Promptea's JSON mode produces a strict, parseable optimized prompt.",
        "It also exposes a JSON output mode for the optimized prompt itself, so you can pipe it into automations and APIs.",
      ],
      es: [
        "Cuando necesitás output procesable por máquina, la ambigüedad es el enemigo. El modo JSON produce un prompt estricto y parseable.",
        "Además podés exportar el prompt optimizado en JSON puro para automatizaciones y APIs.",
      ],
    },
    bullets: {
      en: [
        "Strict schema with field types and missing-value policy.",
        "Output that parses cleanly with JSON.parse.",
        "Optional checklist mode if you need to edit by hand first.",
      ],
      es: [
        "Schema estricto con tipos y política de valores faltantes.",
        "Salida parseable con JSON.parse sin texto extra.",
        "Modo checklist opcional si querés editarlo a mano primero.",
      ],
    },
    ctaLabel: { en: "Generate a JSON prompt", es: "Generar prompt JSON" },
    prefill: { purpose: "data", target: "gemini" },
    internalLinks: [
      ...HUB_LINKS,
      {
        href: (l) => `/${l}/prompts/data`,
        label: { es: "Pack: Data / JSON", en: "Pack: Data / JSON" },
      },
    ],
  },
  {
    slug: "coding-prompt-generator",
    title: {
      en: "Coding prompt generator — repo context, tests, and acceptance criteria",
      es: "Generador de prompts para código — contexto, tests y criterios",
    },
    description: {
      en: "Generate coding prompts with repo context, task boundaries, acceptance criteria, test commands, and expected diff format.",
      es: "Generá prompts para código con contexto del repo, límites de la tarea, criterios de aceptación, comandos de test y formato de diff esperado.",
    },
    h1: { en: "Coding prompt generator", es: "Generador de prompts para código" },
    intro: {
      en: [
        "Coding tasks fail when the model has to guess: stack, scope, edge cases, or how to verify the change.",
        "Promptea forces those decisions to be explicit before the model writes a line of code.",
      ],
      es: [
        "Las tareas de código fallan cuando la IA tiene que adivinar: stack, alcance, edge cases o cómo verificar el cambio.",
        "Promptea obliga a explicitar esas decisiones antes de que la IA escriba una sola línea.",
      ],
    },
    bullets: {
      en: [
        "Repo context block with stack, versions, and constraints.",
        "Acceptance criteria and test commands.",
        "Expected output: diff vs full file vs step-by-step.",
      ],
      es: [
        "Bloque de contexto del repo con stack, versiones y restricciones.",
        "Criterios de aceptación y comandos de test.",
        "Salida esperada: diff vs archivo completo vs paso a paso.",
      ],
    },
    ctaLabel: { en: "Generate a coding prompt", es: "Generar prompt de código" },
    prefill: { purpose: "code", target: "claude" },
    internalLinks: [
      ...HUB_LINKS,
      {
        href: (l) => `/${l}/prompts/code`,
        label: { es: "Pack: Código", en: "Pack: Code" },
      },
    ],
  },
];

export function getLanding(slug: string): LandingPage | undefined {
  return landings.find((l) => l.slug === slug);
}
