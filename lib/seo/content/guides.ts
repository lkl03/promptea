import type { Locale } from "../site";
import type { Purpose, TargetModel } from "../prefill";

export type Guide = {
  slug: string;
  title: Record<Locale, string>;
  description: Record<Locale, string>;
  sections: Array<{
    heading: Record<Locale, string>;
    bullets: Record<Locale, string[]>;
  }>;
  templates: Array<{
    title: Record<Locale, string>;
    prompt: Record<Locale, string>;
    purpose: Purpose;
    target: TargetModel;
  }>;
  faq: Array<{
    q: Record<Locale, string>;
    a: Record<Locale, string>;
  }>;
};

export const guides: Guide[] = [
  {
    slug: "prompt-checklist",
    title: {
      en: "Prompt checklist (copy-paste) to get better outputs",
      es: "Checklist de prompt (copy-paste) para mejores respuestas",
    },
    description: {
      en: "A practical checklist you can paste into any prompt to reduce ambiguity and improve structure.",
      es: "Un checklist práctico para pegar en cualquier prompt y reducir ambigüedad (más estructura, menos humo).",
    },
    sections: [
      {
        heading: { en: "What to include", es: "Qué incluir" },
        bullets: {
          en: [
            "Goal: what success looks like (1 sentence).",
            "Context: what the model must know (data, constraints, definitions).",
            "Output format: bullets / JSON / table / steps.",
            "Edge cases + what to do when info is missing.",
            "Quality bar: what to avoid + acceptance criteria.",
          ],
          es: [
            "Objetivo: cómo se ve el éxito (1 frase).",
            "Contexto: lo mínimo que la IA tiene que saber (data, restricciones, definiciones).",
            "Formato de salida: bullets / JSON / tabla / pasos.",
            "Casos límite + qué hacer si falta info.",
            "Criterio de calidad: qué evitar + criterios de aceptación.",
          ],
        },
      },
      {
        heading: { en: "Common mistakes", es: "Errores típicos" },
        bullets: {
          en: [
            "Asking for 'the best' without criteria (the model guesses).",
            "No examples of the output format (inconsistent structure).",
            "Mixing goals (e.g., 'be concise' + 'be exhaustive').",
          ],
          es: [
            "Pedir 'lo mejor' sin criterios (la IA adivina).",
            "No mostrar formato esperado (sale todo inconsistente).",
            "Mezclar objetivos (ej: 'sé breve' + 'sé exhaustivo').",
          ],
        },
      },
    ],
    templates: [
      {
        title: { en: "Universal prompt skeleton", es: "Esqueleto universal de prompt" },
        purpose: "text",
        target: "gpt",
        prompt: {
          en: `Task: [what you want]

Goal (success looks like):
- [1 sentence]

Context:
- Audience: [who]
- Constraints: [time/budget/stack/forbidden things]
- Inputs: [paste data or describe]
- Definitions: [terms]

Output format:
- [exact format: bullets / JSON schema / table columns]

Quality bar:
- Must include: [items]
- Must avoid: [items]
If missing info, ask up to 3 questions before answering.`,
          es: `Tarea: [qué querés]

Objetivo (cómo se ve el éxito):
- [1 frase]

Contexto:
- Audiencia: [para quién]
- Restricciones: [tiempo/presupuesto/stack/cosas prohibidas]
- Inputs: [pegá data o describí]
- Definiciones: [términos]

Formato de salida:
- [formato exacto: bullets / JSON schema / columnas de tabla]

Calidad:
- Debe incluir: [items]
- Debe evitar: [items]
Si falta info, haceme hasta 3 preguntas antes de responder.`,
        },
      },
    ],
    faq: [
      {
        q: { en: "Do I need long prompts?", es: "¿Necesito prompts largos?" },
        a: {
          en: "No. The goal is clarity, not length. Add only the context that changes the answer.",
          es: "No. La idea es claridad, no longitud. Sumá solo el contexto que cambia la respuesta.",
        },
      },
      {
        q: { en: "How do I get consistent formatting?", es: "¿Cómo logro formato consistente?" },
        a: {
          en: "Specify the exact format and include a tiny example if needed.",
          es: "Definí el formato exacto y, si hace falta, poné un mini ejemplo.",
        },
      },
    ],
  },
  {
    slug: "json-output",
    title: { en: "How to force valid JSON output (no markdown)", es: "Cómo forzar salida JSON válida (sin markdown)" },
    description: {
      en: "Templates to extract and transform data into strict JSON, with validation rules.",
      es: "Plantillas para extraer/transformar datos a JSON estricto, con reglas de validación.",
    },
    sections: [
      {
        heading: { en: "Rules that work", es: "Reglas que funcionan" },
        bullets: {
          en: [
            "Tell it: 'Output ONLY JSON' and forbid extra text.",
            "Define a schema (keys, types, allowed values).",
            "State what to do on missing fields (null vs omit).",
            "Ask for a second pass: validate + fix JSON.",
          ],
          es: [
            "Decile: 'Devolvé SOLO JSON' y prohibí texto extra.",
            "Definí un esquema (claves, tipos, valores permitidos).",
            "Aclarás qué hacer si falta un campo (null vs omitir).",
            "Pedí una segunda pasada: validar + corregir JSON.",
          ],
        },
      },
    ],
    templates: [
      {
        title: { en: "Extract structured JSON", es: "Extraer JSON estructurado" },
        purpose: "data",
        target: "gpt",
        prompt: {
          en: `Extract data from the text below.
Return ONLY valid JSON (no markdown, no comments).

Schema:
{
  "people": [
    {
      "name": "string",
      "role": "string|null",
      "email": "string|null"
    }
  ],
  "dates": ["YYYY-MM-DD"]
}

Rules:
- If missing, use null (do not invent).
- If a date is ambiguous, omit it.

Text:
"""[paste here]"""

Before finalizing, validate that the output is valid JSON and matches the schema.`,
          es: `Extraé datos del texto de abajo.
Devolvé SOLO JSON válido (sin markdown, sin comentarios).

Esquema:
{
  "people": [
    {
      "name": "string",
      "role": "string|null",
      "email": "string|null"
    }
  ],
  "dates": ["YYYY-MM-DD"]
}

Reglas:
- Si falta, usá null (no inventes).
- Si una fecha es ambigua, omitila.

Texto:
"""[pegá acá]"""

Antes de finalizar, validá que sea JSON válido y que matchee el esquema.`,
        },
      },
      {
        title: { en: "Transform JSON to a new schema", es: "Transformar JSON a un nuevo esquema" },
        purpose: "data",
        target: "gemini",
        prompt: {
          en: `You will receive JSON input. Convert it to the output schema.
Return ONLY valid JSON.

Input JSON:
"""[paste JSON]"""

Output schema:
{
  "items": [
    { "id": "string", "title": "string", "tags": ["string"] }
  ]
}

Rules:
- Preserve meaning; do not invent new items.
- If an input field doesn't map, ignore it.
- Ensure tags are lowercase.

Validate JSON before output.`,
          es: `Vas a recibir un JSON de entrada. Convertilo al esquema de salida.
Devolvé SOLO JSON válido.

JSON de entrada:
"""[pegá JSON]"""

Esquema de salida:
{
  "items": [
    { "id": "string", "title": "string", "tags": ["string"] }
  ]
}

Reglas:
- Mantené el significado; no inventes items.
- Si un campo no mapea, ignoralo.
- Asegurate de que tags estén en minúsculas.

Validá el JSON antes de devolverlo.`,
        },
      },
    ],
    faq: [
      {
        q: { en: "Why does the model still add text?", es: "¿Por qué igual agrega texto?" },
        a: {
          en: "Because you didn't make it costly. Repeat the constraint, provide a schema, and ask for validation.",
          es: "Porque no lo hiciste costoso. Repetí la restricción, poné esquema y pedí validación.",
        },
      },
      {
        q: { en: "Should I use JSON Schema?", es: "¿Conviene usar JSON Schema?" },
        a: {
          en: "Yes for strict integrations. Even a simplified schema (keys + types) helps a lot.",
          es: "Sí si vas a integrar. Aunque sea un esquema simplificado (claves + tipos) mejora mucho.",
        },
      },
    ],
  },
  {
    slug: "code-prompts-that-work",
    title: { en: "Code prompts that actually work (debug, refactor, tests)", es: "Prompts de código que funcionan (debug, refactor, tests)" },
    description: {
      en: "How to stop getting generic answers: force diffs, constraints, and test checklists.",
      es: "Cómo dejar de recibir respuestas genéricas: forzá diff, restricciones y checklist de tests.",
    },
    sections: [
      {
        heading: { en: "Make it concrete", es: "Hacelo concreto" },
        bullets: {
          en: [
            "Provide minimal reproducible snippet + expected vs actual.",
            "Demand an output structure (steps, diff, checklist).",
            "Include environment/version constraints.",
            "Ask for edge cases + tests.",
          ],
          es: [
            "Pegá el snippet mínimo reproducible + expected vs actual.",
            "Exigí estructura de salida (pasos, diff, checklist).",
            "Incluí restricciones (stack/versiones).",
            "Pedí casos límite + tests.",
          ],
        },
      },
    ],
    templates: [
      {
        title: { en: "Refactor with invariants", es: "Refactor con invariantes" },
        purpose: "code",
        target: "claude",
        prompt: {
          en: `Refactor this code while keeping behavior identical.

Constraints:
- Do not change public API.
- Keep runtime complexity <= current.
- Prefer small functions + clearer names.

Code:
"""[paste]"""

Return:
1) brief rationale
2) diff/snippet (only changed parts)
3) test checklist (what to cover)`,
          es: `Refactorizá este código manteniendo el comportamiento idéntico.

Restricciones:
- No cambies la API pública.
- Mantené complejidad <= a la actual.
- Preferí funciones chicas + nombres claros.

Código:
"""[pegá]"""

Devolvé:
1) rationale breve
2) diff/snippet (solo partes cambiadas)
3) checklist de tests (qué cubrir)`,
        },
      },
    ],
    faq: [
      {
        q: { en: "How do I get a real diff?", es: "¿Cómo logro un diff real?" },
        a: {
          en: "Ask for 'only changed parts' and specify the file context. If possible, include filenames.",
          es: "Pedí 'solo partes cambiadas' y especificá contexto de archivo. Si podés, incluí nombres de archivos.",
        },
      },
    ],
  },
  {
    slug: "marketing-prompts-without-hype",
    title: { en: "Marketing prompts without hype (safe claims)", es: "Prompts de marketing sin humo (claims seguros)" },
    description: {
      en: "Templates for landing copy and ads that avoid exaggeration and keep claims realistic.",
      es: "Plantillas para landing y anuncios evitando exageraciones y promesas irreales.",
    },
    sections: [
      {
        heading: { en: "Avoid fake certainty", es: "Evitá la certeza falsa" },
        bullets: {
          en: [
            "Give a list of allowed claims and forbidden claims.",
            "Specify compliance: no guarantees, no medical/financial promises.",
            "Ask for 3 variants with different angles, same facts.",
          ],
          es: [
            "Dale una lista de claims permitidos y prohibidos.",
            "Aclará compliance: sin garantías, sin promesas médicas/financieras.",
            "Pedí 3 variantes con distintos ángulos, mismos hechos.",
          ],
        },
      },
    ],
    templates: [
      {
        title: { en: "Landing page hero (safe)", es: "Hero de landing (seguro)" },
        purpose: "marketing",
        target: "gpt",
        prompt: {
          en: `Write landing page hero copy.

Product: [what it is]
Audience: [who]
Problem: [pain]
Realistic benefit: [benefit you can prove]
Proof: [evidence or 'none']

Rules:
- No guarantees, no exaggerated claims.
- If proof is 'none', use cautious language.
- Output: 5 headlines, 5 subheads, 6 bullets, 3 CTAs.`,
          es: `Escribí copy para el hero de una landing.

Producto: [qué es]
Audiencia: [para quién]
Problema: [dolor]
Beneficio realista: [beneficio demostrable]
Prueba: [evidencia o 'ninguna']

Reglas:
- Sin garantías, sin claims exagerados.
- Si la prueba es 'ninguna', usá lenguaje cuidadoso.
- Salida: 5 headlines, 5 subheads, 6 bullets, 3 CTAs.`,
        },
      },
    ],
    faq: [
      {
        q: { en: "Why is the model making big promises?", es: "¿Por qué inventa promesas grandes?" },
        a: {
          en: "Because marketing prompts bias toward persuasion. You must explicitly forbid guarantees and require proof-based language.",
          es: "Porque marketing tiende a la persuasión. Tenés que prohibir garantías y exigir lenguaje basado en evidencia.",
        },
      },
    ],
  },
];

export function getGuide(slug: string): Guide | undefined {
  return guides.find((g) => g.slug === slug);
}
