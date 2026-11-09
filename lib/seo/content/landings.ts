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
        "How it works: paste the prompt, choose its purpose and the AI you will use, and the analyzer applies fixed rules — the same prompt always gets the same score. It lists the findings in order of impact, writes an optimized version and scores that version again, so you see a before → after score. Promptea optimizes prompts; it does not run them on a model.",
      ],
      es: [
        "Promptea revisa tu prompt con los criterios que importan para la tarea que elegís: código, datos, marketing, estudio, imagen, traducción o resumen.",
        "Obtenés un puntaje, lo que falta, por dónde empezar y una versión optimizada lista para copiar.",
        "Cómo funciona: pegás el prompt, elegís su propósito y la IA que vas a usar, y el analizador aplica reglas fijas: el mismo prompt siempre obtiene el mismo puntaje. Lista los hallazgos por orden de impacto, escribe una versión optimizada y la vuelve a puntuar, así ves un puntaje antes → después. Promptea optimiza prompts; no los ejecuta en un modelo.",
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
      en: "Optimize prompts for GPT, Claude, Gemini, Grok, DeepSeek, Kimi and Perplexity. Reduce ambiguity, define formats, and tailor structure per model.",
      es: "Optimizá prompts para GPT, Claude, Gemini, Grok, DeepSeek, Kimi y Perplexity. Reducí ambigüedad, definí formato y ajustá la estructura por modelo.",
    },
    h1: { en: "AI prompt optimizer", es: "Optimizador de prompts de IA" },
    intro: {
      en: [
        "The optimizer rewrites your prompt with clear sections, explicit constraints, and a model-aware structure.",
        "Every model has different strengths — Promptea picks the right hints automatically when you select a target.",
        "Start from a rough idea or from a prompt you already use. The optimizer keeps your intent, adds what is missing (context, constraints, output format) and writes the result for the AI you select. You stay in control: copy it, edit it or save it to your library.",
      ],
      es: [
        "El optimizador reescribe tu prompt con secciones claras, restricciones explícitas y estructura adaptada al modelo.",
        "Cada modelo tiene fortalezas distintas: Promptea elige los hints adecuados según el target que seleccionás.",
        "Partí de una idea suelta o de un prompt que ya usás. El optimizador conserva tu intención, agrega lo que falta (contexto, restricciones, formato de salida) y escribe el resultado para la IA que elijas. Vos tenés el control: copialo, editalo o guardalo en tu biblioteca.",
      ],
    },
    bullets: {
      en: [
        "Per-model hints (GPT, Claude, Gemini, Grok, DeepSeek, Kimi, Perplexity).",
        "Choose checklist or pure JSON output, depending on your workflow.",
        "Attachments treated as context, not as instructions.",
      ],
      es: [
        "Hints por modelo (GPT, Claude, Gemini, Grok, DeepSeek, Kimi, Perplexity).",
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
        "The score combines six dimensions: clarity, context, constraints, output format, verifiability and safety. Their weights depend on the type of task the analyzer detects (verifiability counts for more in debugging than in a casual text request), and a cap applies when essential material is missing, such as a translation request with no text to translate. The full method is on the methodology page.",
      ],
      es: [
        "Promptea puntúa tu prompt con un desglose transparente para saber qué arreglar primero.",
        "También marca qué ya funciona, para no romper un buen prompt por sobre-editar.",
        "El puntaje combina seis dimensiones: claridad, contexto, restricciones, formato de salida, verificabilidad y seguridad. Sus pesos dependen del tipo de tarea que detecta el analizador (la verificabilidad pesa más en depuración que en un pedido de texto cotidiano) y se aplica un tope cuando falta material esencial, como un pedido de traducción sin el texto a traducir. El método completo está en la página de metodología.",
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
        "Open the analyzer with Claude selected, paste your draft and pick the model. The result follows Anthropic's own prompting guidance for the Claude models in Promptea's registry; the Claude page lists the current ones and the date each was last verified against the provider's documentation.",
      ],
      es: [
        "Claude rinde mejor con secciones explícitas, delimitadores tipo XML para input largo y criterios de éxito definidos.",
        "Promptea aplica esas convenciones automáticamente cuando elegís Claude (Sonnet, Opus o Haiku).",
        "Abrí el analizador con Claude seleccionado, pegá tu borrador y elegí el modelo. El resultado sigue la guía de prompting de Anthropic para los modelos Claude del registro de Promptea; la página de Claude lista los vigentes y la fecha en que se verificó cada uno contra la documentación del proveedor.",
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
      en: "Prompt generator for ChatGPT — GPT-6 Astra, Sol, Luna",
      es: "Generador de prompts para ChatGPT — GPT-6 Astra, Sol, Luna",
    },
    description: {
      en: "Generate ChatGPT-ready prompts with role, decomposed task, constraints, examples, and explicit evaluation criteria.",
      es: "Generá prompts listos para ChatGPT con rol, tarea descompuesta, restricciones, ejemplos y criterios de evaluación explícitos.",
    },
    h1: { en: "Prompt generator for ChatGPT", es: "Generador de prompts para ChatGPT" },
    intro: {
      en: [
        "ChatGPT (GPT-6 Astra, Sol, Luna) benefits from instruction-first prompts with delimiters and clear acceptance criteria. Astra does best with the goal and constraints; Sol and Luna do best with explicit steps and an exact format.",
        "Promptea structures prompts the way GPT expects them and adapts the depth to the use case you pick.",
        "Open the analyzer with GPT selected, paste your draft and choose the GPT model you will use. Promptea optimizes the prompt for it; it does not run it. The GPT page lists the current models with their verified capabilities and the date of that verification.",
      ],
      es: [
        "ChatGPT (GPT-6 Astra, Sol, Luna) rinde mejor con prompts que ponen la instrucción primero, usan delimitadores y tienen criterios de aceptación claros. Astra rinde mejor con objetivo y restricciones; Sol y Luna, con pasos explícitos y formato exacto.",
        "Promptea estructura los prompts como GPT los espera y adapta la profundidad al caso de uso que elijas.",
        "Abrí el analizador con GPT seleccionado, pegá tu borrador y elegí el modelo GPT que vas a usar. Promptea optimiza el prompt para ese modelo; no lo ejecuta. La página de GPT lista los modelos vigentes con sus capacidades verificadas y la fecha de esa verificación.",
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
        "Open the analyzer with Gemini selected, paste your draft and choose the Gemini model. If you need a strict format, the output-format and unknowns rules above are added for you. The Gemini page lists the current models and when their capabilities were last verified.",
      ],
      es: [
        "Gemini rinde mejor con un formato exacto y visible y con instrucciones claras sobre qué hacer ante incertidumbre.",
        "Promptea incluye un ejemplo estructural corto cuando hace falta consistencia.",
        "Abrí el analizador con Gemini seleccionado, pegá tu borrador y elegí el modelo Gemini. Si necesitás un formato estricto, se agregan por vos las reglas de formato de salida y de incertidumbre de arriba. La página de Gemini lista los modelos vigentes y cuándo se verificaron sus capacidades por última vez.",
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
        "A good prompt makes valid JSON likely, not certain. Parse and validate the response in your code and retry on failure; the guide on forcing valid JSON output shows the schema, validation and retry pattern, and the glossary explains JSON schema and structured output.",
      ],
      es: [
        "Cuando necesitás output procesable por máquina, la ambigüedad es el enemigo. El modo JSON produce un prompt estricto y parseable.",
        "Además podés exportar el prompt optimizado en JSON puro para automatizaciones y APIs.",
        "Un buen prompt hace probable el JSON válido, no seguro. Parseá y validá la respuesta en tu código y reintentá si falla; la guía para forzar salida JSON válida muestra el patrón de esquema, validación y reintento, y el glosario explica JSON schema y salida estructurada.",
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
        "Give it the smallest snippet that reproduces the problem, the environment and what you expected versus what happened. Ask for a diff and a test, then run both before trusting the change. The code prompts guide has a debugging template you can start from.",
      ],
      es: [
        "Las tareas de código fallan cuando la IA tiene que adivinar: stack, alcance, edge cases o cómo verificar el cambio.",
        "Promptea obliga a explicitar esas decisiones antes de que la IA escriba una sola línea.",
        "Dale el fragmento más chico que reproduce el problema, el entorno y qué esperabas versus qué pasó. Pedí un diff y un test, y corré ambos antes de confiar en el cambio. La guía de prompts de código tiene una plantilla de depuración para arrancar.",
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
