// lib/prompts/daily.ts
//
// Deterministic "Prompt of the Day" rotation.
// No database required — index is derived from the date so the same
// prompt is shown to every visitor on the same calendar day.

import type { Locale } from "@/lib/seo/site";
import type { Purpose, TargetModel } from "@/lib/seo/prefill";

export type DailyPrompt = {
  category: "coding" | "marketing" | "study" | "analysis" | "data" | "image" | "business" | "writing" | "creativity";
  purpose: Purpose;
  target: TargetModel;
  title: { es: string; en: string };
  prompt: { es: string; en: string };
};

// Curated to be specific, fun, and actionable. Each prompt should make
// the user curious enough to click "Try this prompt".
export const DAILY_PROMPTS: DailyPrompt[] = [
  {
    category: "business",
    purpose: "text",
    target: "claude",
    title: {
      es: "Asesor de producto sin filtros",
      en: "Brutally honest product advisor",
    },
    prompt: {
      es: `Actuá como un asesor de producto brutalmente honesto.
Revisá esta idea de landing page y decime sin vueltas por qué los usuarios la van a ignorar.
Lista 5 razones específicas, ordenadas por impacto, y una recomendación accionable para cada una.

Idea de landing:
"""[pegá la idea aquí]"""`,
      en: `Act as a brutally honest product advisor.
Review this landing page idea and tell me why users would ignore it — no sugarcoating.
List 5 specific reasons, ordered by impact, and one actionable fix per reason.

Landing idea:
"""[paste your idea here]"""`,
    },
  },
  {
    category: "coding",
    purpose: "code",
    target: "claude",
    title: {
      es: "Idea suelta → issue de GitHub listo para devs",
      en: "Messy idea → developer-ready GitHub issue",
    },
    prompt: {
      es: `Convertí esta idea de feature en un issue de GitHub listo para que un dev lo tome.
Incluí:
- Resumen en 1-2 líneas.
- Criterios de aceptación claros (Given/When/Then).
- Casos borde y cómo manejarlos.
- Tests sugeridos (unitarios + un end-to-end).
- Riesgos y dependencias.

Idea bruta:
"""[pegá la idea aquí]"""`,
      en: `Turn this messy feature idea into a developer-ready GitHub issue.
Include:
- 1-2 line summary.
- Clear acceptance criteria (Given/When/Then).
- Edge cases and how to handle them.
- Suggested tests (unit + one end-to-end).
- Risks and dependencies.

Raw idea:
"""[paste the idea here]"""`,
    },
  },
  {
    category: "study",
    purpose: "study",
    target: "gpt",
    title: {
      es: "Explicame esto al 80/20",
      en: "Explain this to me 80/20 style",
    },
    prompt: {
      es: `Explicame [tema] como si fuera inteligente pero impaciente.
Quiero:
- El 80/20 (lo único que importa de verdad).
- Un solo ejemplo concreto que lo deje clarísimo.
- Una sola trampa común que evitar.
- Una pregunta que debería poder contestar después de leerte.`,
      en: `Explain [topic] like I'm smart but impatient.
I want:
- The 80/20 — only what really matters.
- One concrete example that makes it click.
- One common trap to avoid.
- One question I should be able to answer after reading you.`,
    },
  },
  {
    category: "creativity",
    purpose: "text",
    target: "claude",
    title: {
      es: "Anti-vaguedad para prompts",
      en: "Anti-vagueness prompt rewrite",
    },
    prompt: {
      es: `Reescribí mi prompt para que una IA no pueda contestar de forma vaga ni inventar.
Forzala a hacer preguntas si falta contexto.
Devolvé:
- El prompt reescrito.
- 3 preguntas que la IA debería hacer si el contexto es insuficiente.
- 1 ejemplo de respuesta aceptable y 1 de respuesta inaceptable.

Mi prompt actual:
"""[pegá tu prompt acá]"""`,
      en: `Rewrite my prompt so an AI can't answer vaguely or hallucinate.
Force it to ask questions when context is missing.
Return:
- The rewritten prompt.
- 3 questions the AI should ask if context is insufficient.
- 1 acceptable answer example and 1 unacceptable example.

My current prompt:
"""[paste your prompt here]"""`,
    },
  },
  {
    category: "business",
    purpose: "text",
    target: "gpt",
    title: {
      es: "Idea de negocio → plan de validación de 1 página",
      en: "Business idea → one-page validation plan",
    },
    prompt: {
      es: `Convertí esta idea de negocio en un plan de validación de 1 página.
Estructura:
- Hipótesis principal y supuestos riesgosos.
- Audiencia inicial y dónde encontrarla.
- 3 experimentos baratos para validar (cada uno con costo, duración y métrica de éxito).
- Riesgos top 3.
- Decisión clara: seguir / pivotar / matar.

Idea:
"""[pegá la idea acá]"""`,
      en: `Turn this business idea into a one-page validation plan.
Structure:
- Core hypothesis and risky assumptions.
- Initial audience and where to find them.
- 3 cheap experiments to validate (each with cost, duration, success metric).
- Top 3 risks.
- Clear decision: keep / pivot / kill.

Idea:
"""[paste the idea here]"""`,
    },
  },
  {
    category: "data",
    purpose: "data",
    target: "gemini",
    title: {
      es: "Schema JSON con ejemplos buenos y malos",
      en: "JSON schema with good and bad examples",
    },
    prompt: {
      es: `Generá un JSON Schema (draft 2020-12) para este workflow:
"""[describí el workflow]"""

Devolvé:
- El schema completo y válido.
- 3 ejemplos válidos diversos.
- 1 ejemplo inválido con la razón exacta del fallo.

Salida en bloques separados, sin texto fuera de cada bloque.`,
      en: `Generate a JSON Schema (draft 2020-12) for this workflow:
"""[describe the workflow]"""

Return:
- The complete, valid schema.
- 3 diverse valid examples.
- 1 invalid example with the exact reason it fails.

Output in separate blocks, no extra text outside each block.`,
    },
  },
  {
    category: "image",
    purpose: "image",
    target: "gemini",
    title: {
      es: "Prompt de imagen cinematográfico",
      en: "Cinematic image prompt",
    },
    prompt: {
      es: `Creá un prompt cinematográfico para este concepto:
"""[describí el concepto]"""

Incluí:
- Sujeto principal y acción.
- Estilo (lente, película, referencia visual).
- Composición y encuadre.
- Iluminación (hora, dirección, intensidad).
- Mood / paleta.
- Aspect ratio sugerido.
- Negativos (qué no debe aparecer).

Devolvé el prompt listo para copiar y pegar en una IA generativa.`,
      en: `Create a cinematic image prompt for this concept:
"""[describe the concept]"""

Include:
- Main subject and action.
- Style (lens, film stock, visual reference).
- Composition and framing.
- Lighting (time, direction, intensity).
- Mood / palette.
- Suggested aspect ratio.
- Negatives (what should NOT appear).

Return the prompt ready to copy-paste into a generative AI.`,
    },
  },
  {
    category: "marketing",
    purpose: "marketing",
    target: "gpt",
    title: {
      es: "Hook que detiene el scroll",
      en: "Scroll-stopping hook",
    },
    prompt: {
      es: `Generá 5 hooks que detengan el scroll para [producto/servicio] dirigido a [audiencia].
Reglas:
- Sin clichés ("transformá tu vida", "el #1", etc.).
- Cada hook tiene que apuntar a un dolor específico, no genérico.
- Indicar qué emoción dispara cada uno.
- Ranking final del más fuerte al más débil con justificación de 1 línea.`,
      en: `Generate 5 scroll-stopping hooks for [product/service] aimed at [audience].
Rules:
- No clichés ("transform your life", "the #1", etc.).
- Each hook must hit a specific pain point, not a generic one.
- State which emotion each one triggers.
- Final ranking from strongest to weakest with a 1-line justification.`,
    },
  },
  {
    category: "analysis",
    purpose: "text",
    target: "claude",
    title: {
      es: "Pre-mortem en 10 minutos",
      en: "10-minute pre-mortem",
    },
    prompt: {
      es: `Hacé un pre-mortem para este proyecto:
"""[describí el proyecto y la fecha de entrega]"""

Imaginá que ya falló y reconstruí por qué.
Devolvé:
- 5 razones plausibles del fracaso, ordenadas por probabilidad.
- Para cada una: señal temprana detectable y acción preventiva concreta.
- 1 supuesto del proyecto que probablemente esté roto y nadie cuestiona.`,
      en: `Run a pre-mortem on this project:
"""[describe the project and the deadline]"""

Imagine it already failed and reconstruct why.
Return:
- 5 plausible failure modes, ordered by likelihood.
- For each: an early signal we could detect, and a concrete preventive action.
- 1 project assumption that's probably broken but no one questions.`,
    },
  },
  {
    category: "writing",
    purpose: "text",
    target: "claude",
    title: {
      es: "Reescritura con menos palabras y más impacto",
      en: "Rewrite with fewer words and more impact",
    },
    prompt: {
      es: `Reescribí este texto con la mitad de palabras sin perder claridad.
Reglas:
- Mantené el sentido y los hechos.
- Eliminá relleno, adverbios débiles y voz pasiva innecesaria.
- Devolvé 2 versiones: una más profesional, otra más natural.
- Cerrá con 3 cosas concretas que se pueden mejorar todavía más.

Texto:
"""[pegá el texto acá]"""`,
      en: `Rewrite this text using half the words without losing clarity.
Rules:
- Keep meaning and facts intact.
- Cut filler, weak adverbs, and unnecessary passive voice.
- Return 2 versions: one more professional, one more natural.
- End with 3 concrete things that can still be improved.

Text:
"""[paste the text here]"""`,
    },
  },
  {
    category: "coding",
    purpose: "code",
    target: "deepseek",
    title: {
      es: "Bug-hunt con tests primero",
      en: "Tests-first bug hunt",
    },
    prompt: {
      es: `Tengo un bug que no logro reproducir consistentemente:
"""[descripción del bug + entorno]"""

Antes de proponer un fix:
1. Listá 5 hipótesis de causa raíz, ordenadas por probabilidad.
2. Para cada una, escribí un test (con código) que la confirme o descarte.
3. Recién después, proponé el fix mínimo asumiendo la hipótesis más probable.
4. Cerrá con cómo prevenir un bug así en el futuro.`,
      en: `I have a bug I can't reproduce consistently:
"""[bug description + environment]"""

Before proposing a fix:
1. List 5 root-cause hypotheses, ordered by likelihood.
2. For each one, write a test (with code) that confirms or rules it out.
3. Only then, propose the minimal fix assuming the most likely hypothesis.
4. End with how to prevent a bug like this in the future.`,
    },
  },
  {
    category: "creativity",
    purpose: "text",
    target: "grok",
    title: {
      es: "5 explicaciones para el mismo concepto",
      en: "5 explanations for the same concept",
    },
    prompt: {
      es: `Explicame [tema] de 5 formas distintas:
1. Para un nene de 10 años.
2. Como una analogía con un deporte.
3. Como un meme.
4. Como un párrafo técnico para un experto.
5. Como una historia corta de 3 frases.

Cerrá diciendo cuál de las cinco entiende mejor el concepto y por qué.`,
      en: `Explain [topic] in 5 different ways:
1. To a 10-year-old.
2. As a sports analogy.
3. As a meme.
4. As a technical paragraph for an expert.
5. As a 3-sentence short story.

End by saying which of the five captures the concept best, and why.`,
    },
  },
];

// Day-of-year index, deterministic worldwide because we use UTC.
export function dayOfYearUTC(date: Date): number {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const current = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return Math.floor((current - start) / (1000 * 60 * 60 * 24));
}

export function getDailyPrompt(date: Date = new Date()): DailyPrompt {
  if (DAILY_PROMPTS.length === 0) {
    throw new Error("DAILY_PROMPTS is empty");
  }
  const idx = dayOfYearUTC(date) % DAILY_PROMPTS.length;
  return DAILY_PROMPTS[idx]!;
}

export function categoryLabel(category: DailyPrompt["category"], lang: Locale): string {
  const map: Record<DailyPrompt["category"], { es: string; en: string }> = {
    coding: { es: "Código", en: "Coding" },
    marketing: { es: "Marketing", en: "Marketing" },
    study: { es: "Estudio", en: "Study" },
    analysis: { es: "Análisis", en: "Analysis" },
    data: { es: "Data / JSON", en: "Data / JSON" },
    image: { es: "Imagen", en: "Image" },
    business: { es: "Negocio", en: "Business" },
    writing: { es: "Escritura", en: "Writing" },
    creativity: { es: "Creatividad", en: "Creativity" },
  };
  return map[category][lang];
}
