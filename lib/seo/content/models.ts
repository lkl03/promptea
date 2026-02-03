import type { Locale } from "../site";
import type { Purpose, TargetModel } from "../prefill";

export type ModelPage = {
  slug: TargetModel;
  title: Record<Locale, string>;
  description: Record<Locale, string>;
  bullets: Record<Locale, string[]>;
  templates: Array<{
    title: Record<Locale, string>;
    prompt: Record<Locale, string>;
    purpose: Purpose;
  }>;
  faq: Array<{ q: Record<Locale, string>; a: Record<Locale, string> }>;
};

export const modelPages: ModelPage[] = [
  {
    slug: "gpt",
    title: { en: "Prompts for GPT: structure first, ambiguity last", es: "Prompts para GPT: estructura primero, ambigüedad cero" },
    description: {
      en: "Reusable GPT prompt templates: clear constraints, formats, and iteration loops.",
      es: "Plantillas reutilizables para GPT: restricciones claras, formato, e iteración sin vueltas.",
    },
    bullets: {
      en: [
        "Put the instruction first, then context, then output format.",
        "Use delimiters for long context (\\\"\\\"\\\" ... \\\"\\\"\\\").",
        "Ask for questions first if info is missing.",
      ],
      es: [
        "Poné la instrucción primero, después contexto, y al final el formato de salida.",
        "Usá delimitadores si hay mucho texto (\\\"\\\"\\\" ... \\\"\\\"\\\").",
        "Si falta info, pedí preguntas primero (en vez de adivinar).",
      ],
    },
    templates: [
      {
        title: { en: "Clear answer + format", es: "Respuesta clara + formato" },
        purpose: "text",
        prompt: {
          en: `Goal: [what you want]
Context: [key facts]
Output format: bullet list with headings.
If info is missing, ask up to 3 questions first.`,
          es: `Objetivo: [qué querés]
Contexto: [hechos clave]
Formato de salida: lista con headings.
Si falta info, haceme hasta 3 preguntas primero.`,
        },
      },
      {
        title: { en: "Decision memo", es: "Memo de decisión" },
        purpose: "text",
        prompt: {
          en: `Write a decision memo.
Options: [A, B, C]
Constraints: [budget/time]
Return:
- recommendation
- pros/cons per option
- risks
- next steps`,
          es: `Escribí un memo de decisión.
Opciones: [A, B, C]
Restricciones: [presupuesto/tiempo]
Devolvé:
- recomendación
- pros/cons por opción
- riesgos
- próximos pasos`,
        },
      },
    ],
    faq: [
      {
        q: { en: "How do I reduce generic answers?", es: "¿Cómo reduzco respuestas genéricas?" },
        a: {
          en: "Force an output structure and add constraints. Without constraints, the model fills gaps with generic advice.",
          es: "Forzá estructura de salida y meté restricciones. Sin restricciones, la IA rellena con generalidades.",
        },
      },
    ],
  },
  {
    slug: "claude",
    title: { en: "Prompts for Claude: explicit steps and quality bar", es: "Prompts para Claude: pasos explícitos y barra de calidad" },
    description: {
      en: "Templates for Claude that emphasize clear evaluation criteria and careful handling of missing info.",
      es: "Plantillas para Claude con criterios claros y manejo cuidadoso de info faltante.",
    },
    bullets: {
      en: [
        "Give a checklist of what must be covered.",
        "Ask for a short plan before the final answer (when complex).",
        "Add examples of desired tone/format when needed.",
      ],
      es: [
        "Dale un checklist de lo que sí o sí tiene que cubrir.",
        "Para cosas complejas, pedí un mini-plan antes de la respuesta final.",
        "Si querés consistencia, poné ejemplo de tono/formato.",
      ],
    },
    templates: [
      {
        title: { en: "Rubric-based review", es: "Review con rúbrica" },
        purpose: "code",
        prompt: {
          en: `Review this code with a rubric.
Rubric: correctness, security, performance, readability, tests.
Return:
- prioritized issues (P0/P1/P2)
- concrete fixes (snippets)
- test checklist`,
          es: `Revisá este código con una rúbrica.
Rúbrica: correctitud, seguridad, performance, legibilidad, tests.
Devolvé:
- issues priorizados (P0/P1/P2)
- fixes concretos (snippets)
- checklist de tests`,
        },
      },
      {
        title: { en: "Long-context summarizer", es: "Resumen de texto largo" },
        purpose: "text",
        prompt: {
          en: `Summarize the text below.
Output:
1) 10 bullets (key facts)
2) 5 decisions
3) 5 open questions
Text:
"""[paste]"""`,
          es: `Resumí el texto de abajo.
Salida:
1) 10 bullets (hechos clave)
2) 5 decisiones
3) 5 preguntas abiertas
Texto:
"""[pegá]"""`,
        },
      },
    ],
    faq: [
      {
        q: { en: "Should I ask for chain-of-thought?", es: "¿Conviene pedir razonamiento paso a paso?" },
        a: {
          en: "Ask for a brief plan or key steps instead of full hidden reasoning. It keeps output short and useful.",
          es: "Pedí un plan breve o pasos clave (no el razonamiento completo). Te da utilidad sin inflar el texto.",
        },
      },
    ],
  },
  {
    slug: "gemini",
    title: { en: "Prompts for Gemini: specify goal + format, iterate", es: "Prompts para Gemini: objetivo + formato, iteración" },
    description: {
      en: "Practical Gemini prompt templates focused on format, constraints, and iteration loops.",
      es: "Plantillas para Gemini enfocadas en formato, restricciones e iteración.",
    },
    bullets: {
      en: [
        "State the goal and the output format up front.",
        "Use examples when you need strict structure.",
        "Tell it what to do when uncertain (ask questions / say 'unknown').",
      ],
      es: [
        "Decí objetivo y formato de salida al inicio.",
        "Usá ejemplos si necesitás estructura estricta.",
        "Aclarale qué hacer si no está seguro (preguntar / 'desconocido').",
      ],
    },
    templates: [
      {
        title: { en: "Strict JSON extraction", es: "Extracción JSON estricta" },
        purpose: "data",
        prompt: {
          en: `Return ONLY JSON.
Schema: {"items":[{"name":"string","value":"number|null"}]}
Text:
"""[paste]"""`,
          es: `Devolvé SOLO JSON.
Esquema: {"items":[{"name":"string","value":"number|null"}]}
Texto:
"""[pegá]"""`,
        },
      },
      {
        title: { en: "Compare options table", es: "Tabla comparativa de opciones" },
        purpose: "text",
        prompt: {
          en: `Compare these options: [A, B, C]
Output as a table with columns: Option | Pros | Cons | Risks | Best for.`,
          es: `Compará estas opciones: [A, B, C]
Salida: tabla con columnas Opción | Pros | Contras | Riesgos | Mejor para.`,
        },
      },
    ],
    faq: [
      {
        q: { en: "How do I avoid verbose outputs?", es: "¿Cómo evito que se vaya de largo?" },
        a: {
          en: "Set a max length (e.g., '<= 120 words') or fixed number of bullets/rows.",
          es: "Poné límite (ej: '<= 120 palabras') o número fijo de bullets/filas.",
        },
      },
    ],
  },
  {
    slug: "grok",
    title: { en: "Prompts for Grok: be direct, ask for checks", es: "Prompts para Grok: directo y con checks" },
    description: {
      en: "Templates that ask Grok for concrete outputs and quick validation steps.",
      es: "Plantillas que piden outputs concretos y pasos de validación rápidos.",
    },
    bullets: {
      en: [
        "Keep the ask direct: task + constraints + format.",
        "Request a short sanity-check section (assumptions, risks).",
        "Prefer concrete deliverables (bullets, diff, checklist).",
      ],
      es: [
        "Sé directo: tarea + restricciones + formato.",
        "Pedí un sanity-check corto (supuestos, riesgos).",
        "Preferí entregables concretos (bullets, diff, checklist).",
      ],
    },
    templates: [
      {
        title: { en: "Fast critique (assumptions)", es: "Crítica rápida (supuestos)" },
        purpose: "text",
        prompt: {
          en: `Critique this plan.
Return:
- 5 assumptions
- 5 risks
- 3 alternatives
Plan:
"""[paste]"""`,
          es: `Criticá este plan.
Devolvé:
- 5 supuestos
- 5 riesgos
- 3 alternativas
Plan:
"""[pegá]"""`,
        },
      },
      {
        title: { en: "Code bug triage", es: "Triage de bug de código" },
        purpose: "code",
        prompt: {
          en: `Bug report:
Expected:
Actual:
Logs:
Code snippet:

Return:
- most likely cause
- 3 checks to confirm
- fix suggestion`,
          es: `Bug:
Expected:
Actual:
Logs:
Snippet:

Devolvé:
- causa más probable
- 3 checks para confirmar
- fix sugerido`,
        },
      },
    ],
    faq: [
      {
        q: { en: "Why ask for sanity checks?", es: "¿Por qué pedir sanity checks?" },
        a: {
          en: "It forces the model to surface assumptions instead of confidently inventing missing context.",
          es: "Lo obliga a explicitar supuestos en vez de inventar contexto con seguridad falsa.",
        },
      },
    ],
  },
  {
    slug: "kimi",
    title: { en: "Prompts for Kimi: structure + constraints", es: "Prompts para Kimi: estructura + restricciones" },
    description: {
      en: "General prompt templates designed to keep outputs structured and practical.",
      es: "Plantillas generales para mantener outputs estructurados y prácticos.",
    },
    bullets: {
      en: [
        "Use a fixed output structure (headings, bullets, steps).",
        "Add constraints and acceptance criteria.",
        "Ask for questions if critical info is missing.",
      ],
      es: [
        "Usá estructura fija (headings, bullets, pasos).",
        "Sumá restricciones y criterios de aceptación.",
        "Si falta info crítica, pedí preguntas.",
      ],
    },
    templates: [
      {
        title: { en: "Explain + example + pitfalls", es: "Explicación + ejemplo + errores" },
        purpose: "study",
        prompt: {
          en: `Teach me: [topic]
Return:
- intuition
- formal definition
- worked example
- common pitfalls
- 5 practice questions`,
          es: `Enseñame: [tema]
Devolvé:
- intuición
- definición formal
- ejemplo resuelto
- errores comunes
- 5 preguntas de práctica`,
        },
      },
    ],
    faq: [
      {
        q: { en: "Do templates differ by model?", es: "¿Cambian las plantillas según el modelo?" },
        a: {
          en: "Core structure is the same. What changes is how strict you must be about format and validation.",
          es: "La estructura base es la misma. Lo que cambia es cuán estricto tenés que ser con formato y validación.",
        },
      },
    ],
  },
  {
    slug: "deepseek",
    title: { en: "Prompts for DeepSeek: explicit format and tests", es: "Prompts para DeepSeek: formato explícito y tests" },
    description: {
      en: "Templates for engineering tasks: specs, implementations, and test-driven outputs.",
      es: "Plantillas para tareas de ingeniería: specs, implementaciones y salida con tests.",
    },
    bullets: {
      en: [
        "Specify the deliverable (spec, code, tests).",
        "Ask for edge cases and a test checklist.",
        "Prefer smaller steps for complex tasks.",
      ],
      es: [
        "Definí el entregable (spec, código, tests).",
        "Pedí casos límite y checklist de tests.",
        "Para cosas complejas: pasos cortos.",
      ],
    },
    templates: [
      {
        title: { en: "Implement from spec (with tests)", es: "Implementar desde spec (con tests)" },
        purpose: "code",
        prompt: {
          en: `Implement this feature:
[spec]

Constraints:
- language: [x]
- style: [x]
Return:
1) brief plan
2) code
3) tests
4) how to run`,
          es: `Implementá esta feature:
[spec]

Restricciones:
- lenguaje: [x]
- estilo: [x]
Devolvé:
1) plan breve
2) código
3) tests
4) cómo correrlo`,
        },
      },
    ],
    faq: [
      {
        q: { en: "Why insist on tests?", es: "¿Por qué insistir con tests?" },
        a: {
          en: "It forces the solution to be verifiable. Without tests, you get plausible but brittle code.",
          es: "Te obliga a que sea verificable. Sin tests, te da código plausible pero frágil.",
        },
      },
    ],
  },
];

export function getModelPage(slug: string): ModelPage | undefined {
  return modelPages.find((m) => m.slug === slug);
}
