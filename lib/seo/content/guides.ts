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
  {
    slug: "chain-of-thought",
    title: {
      en: "Chain-of-thought prompting: make the model show its reasoning",
      es: "Chain-of-thought: hacé que el modelo muestre su razonamiento",
    },
    description: {
      en: "How to elicit step-by-step reasoning to improve accuracy on complex tasks.",
      es: "Cómo obtener razonamiento paso a paso para mejorar la precisión en tareas complejas.",
    },
    sections: [
      {
        heading: { en: "When it helps", es: "Cuándo ayuda" },
        bullets: {
          en: [
            "Multi-step math, logic, or planning where errors compound.",
            "Any task where intermediate steps matter, not just the final answer.",
            "Debugging decisions: seeing the chain lets you spot exactly where reasoning broke.",
          ],
          es: [
            "Matemáticas, lógica o planificación multi-paso donde los errores se acumulan.",
            "Cualquier tarea donde los pasos intermedios importan, no solo la respuesta final.",
            "Debuguear decisiones: ver la cadena te permite detectar exactamente dónde falló el razonamiento.",
          ],
        },
      },
      {
        heading: { en: "How to trigger it", es: "Cómo dispararlo" },
        bullets: {
          en: [
            "Add 'Think step by step before answering.' to any prompt.",
            "Or ask for a scratchpad: 'First, reason through it. Then give the final answer.'",
            "For structured output, separate the reasoning block from the answer block with tags.",
            "Ask it to check its own reasoning before committing to the answer.",
          ],
          es: [
            "Agregá 'Pensá paso a paso antes de responder.' a cualquier prompt.",
            "O pedí un scratchpad: 'Primero razoná. Luego dá la respuesta final.'",
            "Para salida estructurada, separás el bloque de razonamiento del bloque de respuesta con tags.",
            "Pedile que revise su propio razonamiento antes de confirmar la respuesta.",
          ],
        },
      },
    ],
    templates: [
      {
        title: { en: "Step-by-step reasoning (general)", es: "Razonamiento paso a paso (general)" },
        purpose: "text",
        target: "claude",
        prompt: {
          en: `Problem: [describe the task or question]

Think step by step:
1. Restate what is being asked.
2. Identify what information is known vs. what is missing.
3. Work through the logic in small steps.
4. State your conclusion.

Format:
<reasoning>
[steps here]
</reasoning>
<answer>
[final answer only]
</answer>`,
          es: `Problema: [describí la tarea o pregunta]

Pensá paso a paso:
1. Reformulá qué se está pidiendo.
2. Identificá qué información tenés vs. qué falta.
3. Trabajá la lógica en pasos chicos.
4. Enunciá tu conclusión.

Formato:
<razonamiento>
[pasos acá]
</razonamiento>
<respuesta>
[respuesta final solamente]
</respuesta>`,
        },
      },
      {
        title: { en: "Decision audit (spot the error)", es: "Auditoría de decisión (encontrá el error)" },
        purpose: "text",
        target: "gpt",
        prompt: {
          en: `Review this decision chain and find the first point where the reasoning breaks down.

Decision:
"""[paste reasoning or plan]"""

Do this:
1. Restate each step in one sentence.
2. Mark the first step you believe is wrong or unsupported.
3. Explain why and propose a fix.`,
          es: `Revisá esta cadena de decisiones y encontrá el primer punto donde el razonamiento falla.

Decisión:
"""[pegá razonamiento o plan]"""

Hacé esto:
1. Reformulá cada paso en una oración.
2. Marcá el primer paso que creés incorrecto o sin respaldo.
3. Explicá por qué y proponé un fix.`,
        },
      },
    ],
    faq: [
      {
        q: { en: "Does chain-of-thought always help?", es: "¿El chain-of-thought siempre ayuda?" },
        a: {
          en: "No. For simple tasks it adds noise and wastes tokens. Use it for tasks with multiple logical steps where order matters.",
          es: "No. En tareas simples agrega ruido y desperdicia tokens. Usalo en tareas con múltiples pasos lógicos donde el orden importa.",
        },
      },
      {
        q: { en: "What if I need a short final answer?", es: "¿Qué pasa si necesito una respuesta final corta?" },
        a: {
          en: "Separate reasoning from the answer with tags or sections. Ask for the reasoning first, then a single-sentence conclusion.",
          es: "Separás razonamiento y respuesta con tags o secciones. Pedís el razonamiento primero, luego conclusión en una frase.",
        },
      },
    ],
  },
  {
    slug: "summarization-prompts",
    title: {
      en: "Summarization prompts that preserve meaning (not just reduce length)",
      es: "Prompts de resumen que preservan el significado (no solo reducen longitud)",
    },
    description: {
      en: "Templates to summarize long texts while keeping the right level of detail, key facts, and tone.",
      es: "Plantillas para resumir textos largos conservando el nivel de detalle, hechos clave y tono correcto.",
    },
    sections: [
      {
        heading: { en: "What makes summaries fail", es: "Por qué fallan los resúmenes" },
        bullets: {
          en: [
            "Not specifying the audience: the model guesses who needs the summary.",
            "No output length constraint: it either over-compresses or barely cuts.",
            "Missing 'what to preserve': key facts, decisions, open questions.",
            "No tone guidance: a formal report and a casual Slack message differ significantly.",
          ],
          es: [
            "No especificar la audiencia: el modelo adivina para quién es.",
            "Sin restricción de largo: o comprime de más o apenas recorta.",
            "Falta definir 'qué preservar': hechos clave, decisiones, preguntas abiertas.",
            "Sin guía de tono: un reporte formal y un mensaje casual de Slack son muy distintos.",
          ],
        },
      },
      {
        heading: { en: "Controls that work", es: "Controles que funcionan" },
        bullets: {
          en: [
            "Set a word or sentence limit and make it a hard constraint.",
            "Name the audience and their goal ('a PM who needs to decide quickly').",
            "List what must be preserved ('all numbers, deadlines, open decisions').",
            "Ask for a structured output: TL;DR + key points + action items.",
          ],
          es: [
            "Establecé un límite de palabras u oraciones y hacelo una restricción dura.",
            "Nombrá la audiencia y su objetivo ('un PM que necesita decidir rápido').",
            "Listá qué preservar ('todos los números, fechas límite, decisiones abiertas').",
            "Pedí salida estructurada: TL;DR + puntos clave + acciones.",
          ],
        },
      },
    ],
    templates: [
      {
        title: { en: "Structured document summary", es: "Resumen estructurado de documento" },
        purpose: "summarization",
        target: "claude",
        prompt: {
          en: `Summarize the document below for [audience: e.g. busy executive / junior developer].

Constraints:
- TL;DR: <= 2 sentences.
- Key points: <= 5 bullets (preserve all numbers, dates, and named decisions).
- Open questions: list anything that needs follow-up.
- Tone: [formal / casual / technical].

Document:
"""[paste]"""`,
          es: `Resumí el documento de abajo para [audiencia: ej. ejecutivo ocupado / desarrollador junior].

Restricciones:
- TL;DR: <= 2 oraciones.
- Puntos clave: <= 5 bullets (preservá todos los números, fechas y decisiones nombradas).
- Preguntas abiertas: listá todo lo que requiere seguimiento.
- Tono: [formal / casual / técnico].

Documento:
"""[pegá]"""`,
        },
      },
      {
        title: { en: "Meeting notes → action items", es: "Notas de reunión → acciones" },
        purpose: "summarization",
        target: "gpt",
        prompt: {
          en: `Extract a structured summary from these meeting notes.

Output:
1. Decision log: [decision] (owner, if mentioned)
2. Action items: [action] — [owner] — [deadline or 'no deadline']
3. Blocked items: [what is stuck and why]
4. TL;DR: <= 3 sentences

Notes:
"""[paste]"""`,
          es: `Extraé un resumen estructurado de estas notas de reunión.

Salida:
1. Log de decisiones: [decisión] (responsable, si se menciona)
2. Acciones: [acción] — [responsable] — [fecha límite o 'sin fecha']
3. Bloqueados: [qué está frenado y por qué]
4. TL;DR: <= 3 oraciones

Notas:
"""[pegá]"""`,
        },
      },
    ],
    faq: [
      {
        q: { en: "How do I avoid hallucinated facts in summaries?", es: "¿Cómo evito hechos inventados en los resúmenes?" },
        a: {
          en: "Tell it to preserve only what is in the text and mark anything uncertain. Add: 'If a fact is not stated, omit it.'",
          es: "Decile que preserve solo lo que está en el texto y que marque lo incierto. Sumá: 'Si un hecho no está escrito, omitilo.'",
        },
      },
      {
        q: { en: "What if the document is too long?", es: "¿Qué hago si el documento es muy largo?" },
        a: {
          en: "Split it into sections and summarize each one. Then summarize the summaries. Specify the priority order if sections differ in importance.",
          es: "Dividilo en secciones y resumí cada una. Luego resumís los resúmenes. Especificá el orden de prioridad si las secciones difieren en importancia.",
        },
      },
    ],
  },
  {
    slug: "role-prompting",
    title: {
      en: "Role prompting: how to assign personas for better AI outputs",
      es: "Role prompting: cómo asignar personas para mejores respuestas de la IA",
    },
    description: {
      en: "Use expert roles to unlock specialized behavior in any AI model — and avoid the common mistake of vague titles that change nothing.",
      es: "Usá roles de experto para obtener comportamientos especializados de cualquier modelo de IA — y evitá el error de títulos vagos que no cambian nada.",
    },
    sections: [
      {
        heading: { en: "When role prompting helps", es: "Cuándo ayuda el role prompting" },
        bullets: {
          en: [
            "When you need domain-specific language: legal, medical, engineering, finance.",
            "When the default tone is too generic or too casual for your audience.",
            "When you want consistent behavior across a multi-turn conversation.",
            "When you want the model to flag uncertainty instead of inventing answers.",
          ],
          es: [
            "Cuando necesitás lenguaje de dominio: legal, médico, ingeniería, finanzas.",
            "Cuando el tono genérico es demasiado vago o informal para tu audiencia.",
            "Cuando querés comportamiento consistente en una conversación multi-turno.",
            "Cuando querés que el modelo marque incertidumbre en vez de inventar respuestas.",
          ],
        },
      },
      {
        heading: { en: "How to structure an effective role", es: "Cómo estructurar un rol efectivo" },
        bullets: {
          en: [
            "Define who the model is, what it knows, and how it communicates.",
            "Add constraints: what it won't do, what depth of detail it gives.",
            "Avoid vague titles like 'expert' — specify the domain, years of experience, and context.",
            "Test the role: give a task and check if the persona is consistent in the response.",
          ],
          es: [
            "Definí quién es el modelo, qué sabe y cómo comunica.",
            "Agregá restricciones: qué no hace, qué nivel de detalle da.",
            "Evitá títulos vagos como 'experto' — especificá el dominio, años de experiencia y contexto.",
            "Probá el rol: dá una tarea y verificá si la persona es consistente en la respuesta.",
          ],
        },
      },
    ],
    templates: [
      {
        title: { en: "Domain expert advisor", es: "Asesor experto de dominio" },
        purpose: "text",
        target: "claude",
        prompt: {
          en: `Role: You are a senior [domain, e.g. software engineer / tax consultant / UX researcher] with 10+ years of experience working with [context, e.g. early-stage startups / regulated industries].
Audience: [who you are advising]
Style: [direct / formal / simplified — pick one]
Constraints:
- Avoid jargon unless I ask for it.
- Flag when something is outside your domain instead of guessing.
- If the question is unclear, ask one clarifying question before answering.

Task:
[your question or request]`,
          es: `Rol: Sos un/a [dominio, ej. ingeniero de software senior / consultor tributario / investigador de UX] con 10+ años de experiencia trabajando con [contexto, ej. startups en etapa temprana / industrias reguladas].
Audiencia: [a quién estás asesorando]
Estilo: [directo / formal / simplificado — elegí uno]
Restricciones:
- Evitá la jerga salvo que la pida.
- Avisá cuando algo está fuera de tu dominio en vez de adivinar.
- Si la pregunta no está clara, hacé una pregunta de aclaración antes de responder.

Tarea:
[tu pregunta o pedido]`,
        },
      },
      {
        title: { en: "Rigorous peer reviewer", es: "Revisor riguroso" },
        purpose: "text",
        target: "gpt",
        prompt: {
          en: `Role: You are a rigorous peer reviewer with deep expertise in [field].
Your job: find weaknesses, gaps, and unsupported assumptions — not validate what already works.
Rules:
- Be specific: name the exact line, paragraph, or claim that fails.
- No generic praise. If something is solid, skip it and move on.
- End with three concrete changes that would make this stronger.

Content to review:
"""[paste]"""`,
          es: `Rol: Sos un revisor riguroso con experiencia profunda en [campo].
Tu trabajo: encontrar debilidades, huecos y supuestos sin respaldo — no validar lo que ya funciona.
Reglas:
- Sé específico: nombrá la línea, párrafo o afirmación exacta que falla.
- Cero elogios genéricos. Si algo está sólido, saltealo y seguí.
- Terminá con tres cambios concretos que mejorarían esto.

Contenido a revisar:
"""[pegá]"""`,
        },
      },
    ],
    faq: [
      {
        q: { en: "Does adding a role actually change the output quality?", es: "¿Agregar un rol realmente cambia la calidad del output?" },
        a: {
          en: "Only if the role adds real constraints. 'Act as an expert' without specifics gives the same output as no role. The specifics (domain, style, constraints) are what steer the model.",
          es: "Solo si el rol agrega restricciones reales. 'Actuá como experto' sin especificidades da el mismo output que sin rol. Los detalles (dominio, estilo, restricciones) son lo que guía al modelo.",
        },
      },
      {
        q: { en: "Can I use roles for every task?", es: "¿Puedo usar roles para cualquier tarea?" },
        a: {
          en: "Not always useful. Simple tasks like formatting or translation don't need a persona. Roles help most in advisory, review, or domain-specific writing tasks where tone and expertise matter.",
          es: "No siempre sirve. Tareas simples como formatear o traducir no necesitan persona. Los roles ayudan más en asesoría, revisión o escritura de dominio donde el tono y la experiencia importan.",
        },
      },
    ],
  },
  {
    slug: "chatgpt-prompts-for-work",
    title: {
      en: "ChatGPT prompts for work: email, reports, and meeting templates",
      es: "Prompts de ChatGPT para el trabajo: email, reportes y reuniones",
    },
    description: {
      en: "Reusable ChatGPT prompt templates for common workplace tasks — built to avoid the vague instructions that produce generic, padded output.",
      es: "Plantillas reutilizables para tareas laborales cotidianas con ChatGPT — diseñadas para evitar instrucciones vagas que producen output genérico.",
    },
    sections: [
      {
        heading: { en: "Why work prompts fail", es: "Por qué fallan los prompts de trabajo" },
        bullets: {
          en: [
            "Missing context: the model doesn't know your company, audience, or relationship with the recipient.",
            "No format constraint: 'write an email' defaults to 300 words when you need 5 sentences.",
            "No tone guidance: formal vs. casual vs. assertive produces very different output.",
            "No length cap: without one, the model defaults to comprehensive over useful.",
          ],
          es: [
            "Sin contexto: el modelo no sabe tu empresa, audiencia ni tu relación con el destinatario.",
            "Sin restricción de formato: 'escribí un email' produce 300 palabras cuando necesitás 5 oraciones.",
            "Sin guía de tono: formal vs casual vs asertivo produce output muy diferente.",
            "Sin tope de longitud: sin uno, el modelo prioriza lo comprehensivo sobre lo útil.",
          ],
        },
      },
      {
        heading: { en: "Parameters that make work prompts consistent", es: "Parámetros que hacen los prompts de trabajo consistentes" },
        bullets: {
          en: [
            "Recipient: who is reading and what do they care about most?",
            "Goal: one clear action you want from the reader.",
            "Tone: match the company culture and the relationship level.",
            "Hard length limit: '3 paragraphs max', '5 bullets', '<= 150 words'.",
            "What to avoid: filler phrases, passive voice, generic openers.",
          ],
          es: [
            "Destinatario: ¿quién lee y qué le importa más?",
            "Objetivo: una acción clara que querés del lector.",
            "Tono: que coincida con la cultura de la empresa y el nivel de la relación.",
            "Límite de longitud duro: 'máximo 3 párrafos', '5 bullets', '<= 150 palabras'.",
            "Qué evitar: frases de relleno, voz pasiva, openers genéricos.",
          ],
        },
      },
    ],
    templates: [
      {
        title: { en: "Professional email draft", es: "Borrador de email profesional" },
        purpose: "text",
        target: "gpt",
        prompt: {
          en: `Write a professional email.

Recipient: [name / role / relationship, e.g. client I've worked with for 2 years]
Goal: [one thing you want them to do]
Key points (max 3):
- [point 1]
- [point 2]
- [point 3]
Tone: [formal / casual / assertive]
Length: <= 150 words, 3 paragraphs.
Avoid: filler phrases, passive voice, generic opener like "I hope this finds you well."
Subject line: suggest one.`,
          es: `Escribí un email profesional.

Destinatario: [nombre / rol / relación, ej. cliente con quien trabajo hace 2 años]
Objetivo: [una cosa que querés que haga]
Puntos clave (máx 3):
- [punto 1]
- [punto 2]
- [punto 3]
Tono: [formal / casual / asertivo]
Largo: <= 150 palabras, 3 párrafos.
Evitar: frases de relleno, voz pasiva, apertura genérica como "Espero que te encuentres bien."
Asunto: sugerí uno.`,
        },
      },
      {
        title: { en: "Executive summary of a report", es: "Resumen ejecutivo de un reporte" },
        purpose: "text",
        target: "gpt",
        prompt: {
          en: `Summarize this report for an executive audience.

Output format:
1. TL;DR: 1 sentence (single most important takeaway).
2. Key findings: 3 bullets max — numbers and decisions only, no context padding.
3. Recommended action: 1 concrete next step.

Constraints:
- <= 120 words total.
- No passive voice, no filler phrases ("it is important that", "in conclusion").
- If data is missing from the report, say so — do not fill in gaps.

Report:
"""[paste]"""`,
          es: `Resumí este reporte para una audiencia ejecutiva.

Formato de salida:
1. TL;DR: 1 oración (el takeaway más importante).
2. Hallazgos clave: máximo 3 bullets — solo números y decisiones, sin relleno.
3. Acción recomendada: 1 próximo paso concreto.

Restricciones:
- <= 120 palabras en total.
- Sin voz pasiva, sin frases de relleno ("es importante que", "en conclusión").
- Si faltan datos en el reporte, decilo — no inventés información.

Reporte:
"""[pegá]"""`,
        },
      },
    ],
    faq: [
      {
        q: { en: "Can I use these templates with Claude or Gemini instead of ChatGPT?", es: "¿Puedo usar estas plantillas con Claude o Gemini en vez de ChatGPT?" },
        a: {
          en: "Yes. The structure works with any instruction-following model. ChatGPT handles professional tone well, but Claude and Gemini produce equally strong results for writing tasks.",
          es: "Sí. La estructura funciona con cualquier modelo que siga instrucciones. ChatGPT maneja bien el tono profesional, pero Claude y Gemini dan resultados igual de sólidos para tareas de escritura.",
        },
      },
      {
        q: { en: "What if the output is still too long?", es: "¿Qué hago si el output sigue siendo muy largo?" },
        a: {
          en: "Make the length constraint a hard rule and add a consequence: 'If your output exceeds 150 words, cut it before returning.' Repeating the constraint at the end of the prompt reinforces it.",
          es: "Hacé la restricción de longitud una regla dura y agregá una consecuencia: 'Si tu output supera 150 palabras, recortalo antes de devolverlo.' Repetir la restricción al final del prompt la refuerza.",
        },
      },
    ],
  },
  {
    slug: "claude-prompt-guide",
    title: {
      en: "Prompts for Claude: XML tags, extended context, and structured reasoning",
      es: "Prompts para Claude: XML tags, contexto extendido y razonamiento estructurado",
    },
    description: {
      en: "How to write prompts that take advantage of Claude's XML tag support, large context window, and careful, citation-aware reasoning.",
      es: "Cómo escribir prompts que aprovechen el soporte de XML tags de Claude, su ventana de contexto extensa y su razonamiento cuidadoso.",
    },
    sections: [
      {
        heading: { en: "What makes Claude different", es: "Qué hace diferente a Claude" },
        bullets: {
          en: [
            "Claude responds well to XML tags for structure: <instructions>, <context>, <output>, <rules>.",
            "Large context window: you can paste long documents and ask questions at the end without truncation.",
            "Tends to be careful about uncertainty — it flags when something is unclear rather than guessing.",
            "Follows nuanced instructions well: numbered lists of rules, precedence between rules, exceptions.",
          ],
          es: [
            "Claude responde bien a XML tags para estructurar: <instructions>, <context>, <output>, <rules>.",
            "Ventana de contexto grande: podés pegar documentos largos y hacer preguntas al final sin truncamiento.",
            "Tiende a ser cuidadoso con la incertidumbre — señala cuando algo no está claro en vez de adivinar.",
            "Sigue instrucciones matizadas: listas numeradas de reglas, precedencia entre reglas, excepciones.",
          ],
        },
      },
      {
        heading: { en: "Patterns that work well with Claude", es: "Patrones que funcionan bien con Claude" },
        bullets: {
          en: [
            "Use XML tags to separate context from instructions — this reduces confusion on long prompts.",
            "Put the task at the end, after all context — Claude processes what it has before answering.",
            "Number your rules (1, 2, 3...) and state which takes priority if they conflict.",
            "Ask Claude to think step by step before giving a final answer on complex tasks.",
            "Request citations or quotes from the pasted document to ground answers in the source.",
          ],
          es: [
            "Usá XML tags para separar contexto de instrucciones — reduce confusión en prompts largos.",
            "Poné la tarea al final, después de todo el contexto — Claude procesa lo que tiene antes de responder.",
            "Numerá tus reglas (1, 2, 3...) e indicá cuál tiene prioridad si hay conflicto.",
            "Pedile que piense paso a paso antes de dar la respuesta final en tareas complejas.",
            "Pedí citas o fragmentos del documento pegado para anclar las respuestas en la fuente.",
          ],
        },
      },
    ],
    templates: [
      {
        title: { en: "Document Q&A with citations", es: "Preguntas sobre documento con citas" },
        purpose: "text",
        target: "claude",
        prompt: {
          en: `<instructions>
Answer questions about the document below. Follow these rules:
1. Base every answer strictly on the document — do not add outside knowledge.
2. Quote the relevant passage (max 2 sentences) before each answer.
3. If the answer is not in the document, say "Not found in document."
4. If the question is ambiguous, ask one clarifying question before answering.
</instructions>

<document>
[paste document here]
</document>

<question>
[your question]
</question>`,
          es: `<instrucciones>
Respondé preguntas sobre el documento de abajo. Seguí estas reglas:
1. Basá cada respuesta estrictamente en el documento — no agregues conocimiento externo.
2. Citá el fragmento relevante (máx 2 oraciones) antes de cada respuesta.
3. Si la respuesta no está en el documento, decí "No encontrado en el documento."
4. Si la pregunta es ambigua, hacé una pregunta aclaratoria antes de responder.
</instrucciones>

<documento>
[pegá el documento acá]
</documento>

<pregunta>
[tu pregunta]
</pregunta>`,
        },
      },
      {
        title: { en: "Structured analysis with competing viewpoints", es: "Análisis estructurado con perspectivas opuestas" },
        purpose: "text",
        target: "claude",
        prompt: {
          en: `<instructions>
Analyze the topic below from two opposing perspectives.
Rules:
1. Steel-man both sides — represent each as its best advocate would.
2. Do not express a personal preference.
3. End with: the single most important fact a decision-maker needs.
Output format: use the XML tags below.
</instructions>

<topic>
[describe the decision, question, or situation]
</topic>

<output_format>
<perspective_a>
[strongest case for position A]
</perspective_a>
<perspective_b>
[strongest case for position B]
</perspective_b>
<key_fact>
[the one thing that matters most]
</key_fact>
</output_format>`,
          es: `<instrucciones>
Analizá el tema de abajo desde dos perspectivas opuestas.
Reglas:
1. Steel-man ambos lados — representá cada uno como lo haría su mejor defensor.
2. No expresés preferencia personal.
3. Terminá con: el único hecho más importante para quien tiene que decidir.
Formato de salida: usá los XML tags de abajo.
</instrucciones>

<tema>
[describí la decisión, pregunta o situación]
</tema>

<formato_de_salida>
<perspectiva_a>
[el argumento más fuerte para la posición A]
</perspectiva_a>
<perspectiva_b>
[el argumento más fuerte para la posición B]
</perspectiva_b>
<hecho_clave>
[la única cosa que más importa]
</hecho_clave>
</formato_de_salida>`,
        },
      },
    ],
    faq: [
      {
        q: { en: "Do I need to use XML tags with Claude?", es: "¿Necesito usar XML tags con Claude?" },
        a: {
          en: "No, but they help on longer prompts. When context and instructions are mixed in plain text, Claude may blend them. XML tags create clear boundaries the model respects reliably.",
          es: "No, pero ayudan en prompts largos. Cuando el contexto y las instrucciones se mezclan en texto plano, Claude puede mezclarlos. Los XML tags crean límites claros que el modelo respeta de forma consistente.",
        },
      },
      {
        q: { en: "How long a document can I paste into a Claude prompt?", es: "¿Qué tan largo puede ser el documento que pego en un prompt de Claude?" },
        a: {
          en: "Claude's context window supports hundreds of pages. For practical accuracy on Q&A, shorter focused documents work better than dumping an entire book. If you have a large document, extract the relevant sections first.",
          es: "La ventana de contexto de Claude soporta cientos de páginas. Para precisión práctica en Q&A, documentos cortos y enfocados funcionan mejor que un libro completo. Si el documento es largo, extraé primero las secciones relevantes.",
        },
      },
    ],
  },
  {
    slug: "gemini-prompt-guide",
    title: {
      en: "Prompts for Gemini: format control, grounding, and structured output",
      es: "Prompts para Gemini: control de formato, grounding y salida estructurada",
    },
    description: {
      en: "How to write prompts that get consistent, well-structured output from Gemini — including format examples, grounding constraints, and multimodal tips.",
      es: "Cómo escribir prompts que producen salidas consistentes y estructuradas con Gemini — con ejemplos de formato, restricciones de grounding y tips multimodal.",
    },
    sections: [
      {
        heading: { en: "What makes Gemini different", es: "Qué hace diferente a Gemini" },
        bullets: {
          en: [
            "Gemini responds well to a visible output template — showing the exact format you expect reduces variation.",
            "It benefits from an explicit example of the final structure, even a short one.",
            "For grounded tasks, specify the source: 'Base your answer only on the text below — do not add outside knowledge.'",
            "Gemini tends to be verbose; set a hard word or sentence limit to prevent padding.",
            "For multimodal prompts (image + text), state what role the image plays before the question.",
          ],
          es: [
            "Gemini responde bien a una plantilla de salida visible — mostrar el formato exacto que esperás reduce la variación.",
            "Se beneficia de un ejemplo corto del resultado esperado.",
            "Para tareas de grounding, especificá la fuente: 'Basá tu respuesta solo en el texto de abajo — no agregues conocimiento externo.'",
            "Gemini tiende a ser verboso; poné un límite duro de palabras u oraciones para evitar relleno.",
            "Para prompts multimodal (imagen + texto), aclarás qué rol cumple la imagen antes de la pregunta.",
          ],
        },
      },
      {
        heading: { en: "Patterns that work well with Gemini", es: "Patrones que funcionan bien con Gemini" },
        bullets: {
          en: [
            "Show a mini template: 'Return your answer in this format: [field]: [value]'.",
            "Separate context from instruction with a header line (e.g., '--- Context ---', '--- Task ---').",
            "Ask it to list assumptions before the final answer on ambiguous tasks.",
            "For long inputs, use a priority hint: 'Focus on the sections marked [PRIORITY]'.",
            "If you need JSON, define the schema inline and add 'Return ONLY valid JSON, no explanation'.",
          ],
          es: [
            "Mostrá una mini plantilla: 'Devolvé tu respuesta en este formato: [campo]: [valor]'.",
            "Separás contexto de instrucción con una línea de encabezado (ej: '--- Contexto ---', '--- Tarea ---').",
            "Pedile que liste supuestos antes de la respuesta final en tareas ambiguas.",
            "Para inputs largos, usá un hint de prioridad: 'Enfocate en las secciones marcadas [PRIORIDAD]'.",
            "Si necesitás JSON, definí el esquema inline y agregá 'Devolvé SOLO JSON válido, sin explicación'.",
          ],
        },
      },
    ],
    templates: [
      {
        title: { en: "Structured analysis with format template", es: "Análisis estructurado con plantilla de formato" },
        purpose: "text",
        target: "gemini",
        prompt: {
          en: `Analyze the topic below and return your answer in the exact format shown.

Topic: [describe the topic or question]

Format (use exactly this structure):
Summary: [1 sentence]
Key points:
- [point 1]
- [point 2]
- [point 3]
Assumptions I'm making: [list any assumptions]
Confidence: [high / medium / low] — [reason in 1 sentence]

Constraints:
- Max 200 words total.
- If a field cannot be filled, write 'N/A' — do not omit it.`,
          es: `Analizá el tema de abajo y devolvé tu respuesta en el formato exacto mostrado.

Tema: [describí el tema o pregunta]

Formato (usá exactamente esta estructura):
Resumen: [1 oración]
Puntos clave:
- [punto 1]
- [punto 2]
- [punto 3]
Supuestos que estoy haciendo: [listá los supuestos]
Confianza: [alta / media / baja] — [razón en 1 oración]

Restricciones:
- Máximo 200 palabras en total.
- Si no podés completar un campo, escribí 'N/A' — no lo omitas.`,
        },
      },
      {
        title: { en: "Grounded Q&A (source-only answers)", es: "Q&A con grounding (respuestas solo de la fuente)" },
        purpose: "text",
        target: "gemini",
        prompt: {
          en: `Answer the question below using ONLY the source text provided.

Rules:
1. Do not add facts from outside the source.
2. If the answer is not in the source, say: "Not found in source."
3. Quote the relevant sentence (max 1 sentence) before your answer.
4. Keep the answer to 2-3 sentences.

--- Source ---
[paste source text here]
--- End source ---

Question: [your question]`,
          es: `Respondé la pregunta de abajo usando SOLO el texto fuente provisto.

Reglas:
1. No agregues hechos de afuera de la fuente.
2. Si la respuesta no está en la fuente, decí: "No encontrado en la fuente."
3. Citá la oración relevante (máx 1 oración) antes de tu respuesta.
4. Mantené la respuesta en 2-3 oraciones.

--- Fuente ---
[pegá el texto fuente acá]
--- Fin de la fuente ---

Pregunta: [tu pregunta]`,
        },
      },
    ],
    faq: [
      {
        q: { en: "Why does Gemini ignore my format instructions?", es: "¿Por qué Gemini ignora mis instrucciones de formato?" },
        a: {
          en: "Usually because the format was described in words but not shown. Add a literal template — even a 2-line example — and Gemini follows it much more reliably.",
          es: "Generalmente porque el formato fue descrito con palabras pero no mostrado. Agregá una plantilla literal — incluso de 2 líneas — y Gemini lo sigue mucho más consistentemente.",
        },
      },
      {
        q: { en: "How do I stop Gemini from adding extra commentary?", es: "¿Cómo evito que Gemini agregue comentarios extra?" },
        a: {
          en: "End the prompt with an explicit constraint: 'Return ONLY the structured output above — no extra text, no preamble.' Repeating it at the end reinforces it.",
          es: "Terminá el prompt con una restricción explícita: 'Devolvé SOLO la salida estructurada de arriba — sin texto extra, sin preámbulo.' Repetirla al final la refuerza.",
        },
      },
    ],
  },
  {
    slug: "grok-prompt-guide",
    title: {
      en: "Prompts for Grok: directness, real-time context, and structured responses",
      es: "Prompts para Grok: directness, contexto en tiempo real y respuestas estructuradas",
    },
    description: {
      en: "How to write prompts that get direct, high-signal responses from Grok — including tone controls, real-time awareness, and structuring tips.",
      es: "Cómo escribir prompts que producen respuestas directas y de alta señal con Grok — con controles de tono, conciencia de tiempo real y tips de estructura.",
    },
    sections: [
      {
        heading: { en: "What makes Grok different", es: "Qué hace diferente a Grok" },
        bullets: {
          en: [
            "Grok defaults to a direct, confident style — it cuts filler and gets to the point faster than most models.",
            "It has real-time awareness for current events; use this with a date constraint when recency matters.",
            "Tone is more flexible than other models — you can push it toward casual, sharp, or formal and it follows well.",
            "On ambiguous questions, it picks an interpretation and commits; specify if you want alternatives.",
            "Works best when the task is concrete — vague prompts get short, sometimes shallow responses.",
          ],
          es: [
            "Grok tiene un estilo directo y seguro por defecto — corta el relleno y va al punto más rápido que la mayoría.",
            "Tiene conciencia de eventos en tiempo real; usá esto con una restricción de fecha cuando la actualidad importa.",
            "El tono es más flexible que otros modelos — podés empujarlo hacia casual, directo o formal y lo sigue bien.",
            "En preguntas ambiguas, elige una interpretación y se compromete; especificá si querés alternativas.",
            "Funciona mejor cuando la tarea es concreta — prompts vagos producen respuestas cortas y a veces superficiales.",
          ],
        },
      },
      {
        heading: { en: "Patterns that work well with Grok", es: "Patrones que funcionan bien con Grok" },
        bullets: {
          en: [
            "State the exact output you want: 'Give me 3 options, each on a new line, no explanation.'",
            "Use a tone instruction: 'Be direct. Skip the preamble. No hedging unless the uncertainty is real.'",
            "For real-time tasks: 'As of [date], what is the current status of [topic]?'",
            "Ask for alternatives explicitly: 'Give me two versions — one formal, one casual.'",
            "For complex tasks, add a brief structure: 'First: [X]. Then: [Y]. Finally: [Z].'",
          ],
          es: [
            "Especificá el output exacto que querés: 'Dame 3 opciones, cada una en una línea nueva, sin explicación.'",
            "Usá una instrucción de tono: 'Sé directo. Saltate el preámbulo. Sin rodeos salvo que la incertidumbre sea real.'",
            "Para tareas en tiempo real: 'A partir de [fecha], ¿cuál es el estado actual de [tema]?'",
            "Pedí alternativas explícitamente: 'Dame dos versiones — una formal, una casual.'",
            "Para tareas complejas, agregá una estructura breve: 'Primero: [X]. Luego: [Y]. Finalmente: [Z].'",
          ],
        },
      },
    ],
    templates: [
      {
        title: { en: "Direct opinion with trade-offs", es: "Opinión directa con trade-offs" },
        purpose: "text",
        target: "grok",
        prompt: {
          en: `Give me your direct assessment of this decision or topic.

Topic: [describe the decision or question]
Context: [brief background, 2-3 sentences max]

I want:
1. Your direct recommendation (1-2 sentences, no hedging unless uncertainty is real).
2. The main trade-off I should know.
3. One thing most people miss about this.

Tone: direct and concise. No filler phrases.`,
          es: `Dame tu evaluación directa de esta decisión o tema.

Tema: [describí la decisión o pregunta]
Contexto: [contexto breve, máx 2-3 oraciones]

Quiero:
1. Tu recomendación directa (1-2 oraciones, sin rodeos salvo que la incertidumbre sea real).
2. El trade-off principal que debo conocer.
3. Una cosa que la mayoría pasa por alto.

Tono: directo y conciso. Sin frases de relleno.`,
        },
      },
      {
        title: { en: "Quick structured comparison", es: "Comparación estructurada rápida" },
        purpose: "text",
        target: "grok",
        prompt: {
          en: `Compare these options directly.

Options:
- Option A: [describe]
- Option B: [describe]

Format:
Option A pros (max 3): [bullets]
Option A cons (max 2): [bullets]
Option B pros (max 3): [bullets]
Option B cons (max 2): [bullets]
Pick for [my use case: describe in 1 sentence]: [your direct pick and a 1-sentence reason]

No preamble. No conclusion paragraph.`,
          es: `Compará estas opciones directamente.

Opciones:
- Opción A: [describí]
- Opción B: [describí]

Formato:
Pros de Opción A (máx 3): [bullets]
Contras de Opción A (máx 2): [bullets]
Pros de Opción B (máx 3): [bullets]
Contras de Opción B (máx 2): [bullets]
Elección para [mi caso de uso: describí en 1 oración]: [tu elección directa y una razón en 1 oración]

Sin preámbulo. Sin párrafo de conclusión.`,
        },
      },
    ],
    faq: [
      {
        q: { en: "Does Grok work for technical tasks like code or data?", es: "¿Grok funciona para tareas técnicas como código o datos?" },
        a: {
          en: "Yes, but it shines most on opinion, analysis, and writing tasks. For code and data extraction, DeepSeek or Claude may produce more careful, verifiable answers. Use Grok when you want speed and directness over exhaustive detail.",
          es: "Sí, pero brilla más en tareas de opinión, análisis y escritura. Para código y extracción de datos, DeepSeek o Claude pueden producir respuestas más cuidadosas y verificables. Usá Grok cuando priorizás velocidad y directness sobre detalle exhaustivo.",
        },
      },
      {
        q: { en: "How do I get Grok to slow down and be more thorough?", es: "¿Cómo hago que Grok sea más exhaustivo?" },
        a: {
          en: "Ask for a step-by-step breakdown and specify the number of points: 'Walk me through this in 5 steps. Don't skip steps.' Without a structure constraint, Grok tends to compress.",
          es: "Pedí un desglose paso a paso y especificá el número de puntos: 'Guiame por esto en 5 pasos. No saltees pasos.' Sin restricción de estructura, Grok tiende a comprimir.",
        },
      },
    ],
  },
  {
    slug: "ai-prompt-templates-for-business",
    title: {
      en: "AI prompt templates for business: planning, reports, and customer support",
      es: "Templates de prompts de IA para negocios: planificación, reportes y soporte al cliente",
    },
    description: {
      en: "Ready-to-use AI prompt templates for common business workflows — from project planning and status reports to customer support scripts and decision memos.",
      es: "Templates de prompts de IA listos para usar en flujos de trabajo empresariales comunes — desde planificación de proyectos y reportes de estado hasta scripts de soporte al cliente y memos de decisión.",
    },
    sections: [
      {
        heading: { en: "Why generic business prompts fail", es: "Por qué fallan los prompts de negocio genéricos" },
        bullets: {
          en: [
            "They omit stakeholder context: the model doesn't know who reads this or what they care about.",
            "No format or length constraint: business docs need consistent structure, not creative flair.",
            "Missing decision criteria: 'help me decide' without criteria produces balanced-but-useless analysis.",
            "No tone guidance: the right tone for a board memo differs from a team standup update.",
            "Scope creep: without a clear boundary, the model adds sections nobody asked for.",
          ],
          es: [
            "Omiten el contexto del stakeholder: el modelo no sabe quién lee esto ni qué le importa.",
            "Sin restricción de formato o largo: los documentos de negocio necesitan estructura consistente, no creatividad.",
            "Sin criterios de decisión: 'ayudame a decidir' sin criterios produce análisis equilibrado pero inútil.",
            "Sin guía de tono: el tono correcto para un memo de directorio difiere de una actualización de standup.",
            "Scope creep: sin un límite claro, el modelo agrega secciones que nadie pidió.",
          ],
        },
      },
      {
        heading: { en: "Business prompt parameters that work", es: "Parámetros de prompts de negocio que funcionan" },
        bullets: {
          en: [
            "Audience + their goal: 'For the CFO, who needs to decide whether to approve budget.'",
            "Hard format: specify exactly the sections, their order, and word limits per section.",
            "Decision criteria: list what makes an option better or worse before asking for a recommendation.",
            "Tone: 'formal and precise' / 'short and direct for async team reading' / 'reassuring but honest'.",
            "What to omit: 'Do not include background I already know. Focus on [specific gap].'",
          ],
          es: [
            "Audiencia + su objetivo: 'Para el CFO, que necesita decidir si aprobar presupuesto.'",
            "Formato duro: especificá exactamente las secciones, su orden y límites de palabras por sección.",
            "Criterios de decisión: listá qué hace mejor o peor a una opción antes de pedir recomendación.",
            "Tono: 'formal y preciso' / 'corto y directo para lectura asincrónica del equipo' / 'tranquilizador pero honesto'.",
            "Qué omitir: 'No incluyas contexto que ya sé. Enfocate en [gap específico].'",
          ],
        },
      },
    ],
    templates: [
      {
        title: { en: "Project status report", es: "Reporte de estado de proyecto" },
        purpose: "text",
        target: "gpt",
        prompt: {
          en: `Write a project status report.

Audience: [team / manager / executive — pick one]
Project: [name and one-line description]
Reporting period: [e.g. Week of July 7]

Sections (use exactly these, in order):
1. Status: [On track / At risk / Blocked] — 1 sentence why.
2. Completed this period: 3 bullets max.
3. In progress: 3 bullets max, each with % done if known.
4. Blockers: [list or 'None'] — for each blocker: what it is, who owns removing it.
5. Next period goals: 3 bullets max.

Constraints:
- Total: <= 200 words.
- No passive voice.
- If data is missing, write '[TBD]' — do not fill in with estimates unless told to.`,
          es: `Escribí un reporte de estado de proyecto.

Audiencia: [equipo / manager / ejecutivo — elegí uno]
Proyecto: [nombre y descripción en una línea]
Período reportado: [ej. Semana del 7 de julio]

Secciones (usá exactamente estas, en orden):
1. Estado: [En camino / En riesgo / Bloqueado] — 1 oración explicando por qué.
2. Completado este período: máx 3 bullets.
3. En progreso: máx 3 bullets, cada uno con % completado si se conoce.
4. Bloqueadores: [lista o 'Ninguno'] — por cada bloqueador: qué es, quién lo resuelve.
5. Objetivos del próximo período: máx 3 bullets.

Restricciones:
- Total: <= 200 palabras.
- Sin voz pasiva.
- Si falta un dato, escribí '[POR DEFINIR]' — no rellenes con estimaciones salvo que se indique.`,
        },
      },
      {
        title: { en: "Decision memo with criteria", es: "Memo de decisión con criterios" },
        purpose: "text",
        target: "claude",
        prompt: {
          en: `Write a decision memo.

Decision to make: [describe what needs to be decided]
Audience: [who will read and decide]
Options being considered:
- Option A: [brief description]
- Option B: [brief description]
Decision criteria (most important first):
1. [criterion 1]
2. [criterion 2]
3. [criterion 3]

Output format:
1. One-line recommendation (most important first).
2. Why this option scores better on the top criteria.
3. The main risk of this choice and how to mitigate it.
4. What we'd need to change our minds (trigger condition).

Constraints: <= 250 words. No hedging on the recommendation — be direct.`,
          es: `Escribí un memo de decisión.

Decisión a tomar: [describí qué hay que decidir]
Audiencia: [quién leerá y decidirá]
Opciones consideradas:
- Opción A: [descripción breve]
- Opción B: [descripción breve]
Criterios de decisión (los más importantes primero):
1. [criterio 1]
2. [criterio 2]
3. [criterio 3]

Formato de salida:
1. Recomendación en una línea (lo más importante primero).
2. Por qué esta opción puntúa mejor en los criterios principales.
3. El riesgo principal de esta elección y cómo mitigarlo.
4. Qué tendría que cambiar para reconsiderar (condición de cambio).

Restricciones: <= 250 palabras. Sin rodeos en la recomendación — sé directo.`,
        },
      },
    ],
    faq: [
      {
        q: { en: "Can I use these templates with any AI model?", es: "¿Puedo usar estos templates con cualquier modelo de IA?" },
        a: {
          en: "Yes. The structure works across GPT, Claude, Gemini, and Grok. For sensitive or confidential business content, check your organization's AI usage policy before pasting internal data into any model.",
          es: "Sí. La estructura funciona con GPT, Claude, Gemini y Grok. Para contenido empresarial sensible o confidencial, verificá la política de uso de IA de tu organización antes de pegar datos internos en cualquier modelo.",
        },
      },
      {
        q: { en: "The model keeps adding sections I didn't ask for. How do I stop it?", es: "El modelo sigue agregando secciones que no pedí. ¿Cómo lo paro?" },
        a: {
          en: "Add an explicit closing instruction: 'Return ONLY the sections listed above, in that order. Do not add an introduction, conclusion, or any section not listed.' Listing what to exclude is often more effective than just listing what to include.",
          es: "Agregá una instrucción de cierre explícita: 'Devolvé SOLO las secciones listadas arriba, en ese orden. No agregues introducción, conclusión ni ninguna sección que no esté listada.' Listar qué excluir suele ser más efectivo que solo listar qué incluir.",
        },
      },
    ],
  },
  {
    slug: "deepseek-prompt-guide",
    title: {
      en: "Prompts for DeepSeek: code, data extraction, and analytical reasoning",
      es: "Prompts para DeepSeek: código, extracción de datos y razonamiento analítico",
    },
    description: {
      en: "How to write prompts that get precise, well-structured output from DeepSeek — including code tasks, strict JSON extraction, and multi-step analytical reasoning.",
      es: "Cómo escribir prompts que producen salidas precisas y estructuradas con DeepSeek — incluyendo tareas de código, extracción de JSON estricto y razonamiento analítico multi-paso.",
    },
    sections: [
      {
        heading: { en: "What makes DeepSeek different", es: "Qué hace diferente a DeepSeek" },
        bullets: {
          en: [
            "DeepSeek excels at analytical and reasoning-heavy tasks — it handles multi-step logic with high precision.",
            "Strong code generation and debugging: it reads constraints carefully and tends to produce tighter, less padded code than general-purpose models.",
            "Reliable JSON extraction: state the schema explicitly and it follows it closely, with fewer hallucinated fields.",
            "Works well with numbered rules and explicit step-by-step instructions.",
            "Responds better to direct task framing than to narrative-style prompts.",
          ],
          es: [
            "DeepSeek sobresale en tareas analíticas y de razonamiento — maneja lógica multi-paso con alta precisión.",
            "Fuerte en generación y debugging de código: lee restricciones cuidadosamente y tiende a producir código más ajustado y con menos relleno.",
            "Extracción de JSON confiable: especificá el esquema explícitamente y lo sigue de cerca, con menos campos inventados.",
            "Funciona bien con reglas numeradas e instrucciones explícitas paso a paso.",
            "Responde mejor a tareas formuladas directamente que a prompts en estilo narrativo.",
          ],
        },
      },
      {
        heading: { en: "Patterns that work well with DeepSeek", es: "Patrones que funcionan bien con DeepSeek" },
        bullets: {
          en: [
            "Number your steps: 'Step 1: analyze. Step 2: extract. Step 3: format as JSON.'",
            "For code: include the language, version, and constraints before the task.",
            "For data: define the schema inline and add 'Return ONLY the JSON — no explanation, no markdown.'",
            "Ask it to verify its own output: 'Before returning, check that all required fields are present and match the schema.'",
            "On complex reasoning: ask it to state its assumptions before drawing conclusions.",
          ],
          es: [
            "Numerá tus pasos: 'Paso 1: analizá. Paso 2: extraé. Paso 3: formateá como JSON.'",
            "Para código: incluí el lenguaje, la versión y las restricciones antes de la tarea.",
            "Para datos: definí el esquema inline y agregá 'Devolvé SOLO el JSON — sin explicación, sin markdown.'",
            "Pedile que verifique su propio output: 'Antes de devolver, verificá que todos los campos requeridos están presentes y coinciden con el esquema.'",
            "En razonamiento complejo: pedile que enuncie sus supuestos antes de sacar conclusiones.",
          ],
        },
      },
    ],
    templates: [
      {
        title: { en: "Code task with strict constraints", es: "Tarea de código con restricciones estrictas" },
        purpose: "code",
        target: "deepseek",
        prompt: {
          en: `Language: [e.g. TypeScript / Python 3.12]
Task: [what to implement or fix]

Constraints:
- Do not use external libraries unless listed here: [list or 'none'].
- Keep the solution under [N] lines.
- Maintain the existing public API — only change internals.
- Handle edge cases: [list, e.g. empty input, null, out-of-range].

Return:
1. The implementation (code only, no markdown fences unless asked).
2. A brief list of edge cases covered.
3. Any assumption you made that could affect the output.`,
          es: `Lenguaje: [ej. TypeScript / Python 3.12]
Tarea: [qué implementar o corregir]

Restricciones:
- No uses librerías externas salvo las listadas aquí: [lista o 'ninguna'].
- Mantené la solución en menos de [N] líneas.
- Conservá la API pública existente — solo cambiá los internos.
- Manejá casos límite: [lista, ej. input vacío, null, fuera de rango].

Devolvé:
1. La implementación (solo código, sin markdown fence salvo que se pida).
2. Una lista breve de casos límite cubiertos.
3. Cualquier supuesto que hayas hecho que pueda afectar el output.`,
        },
      },
      {
        title: { en: "Analytical reasoning with explicit steps", es: "Razonamiento analítico con pasos explícitos" },
        purpose: "data",
        target: "deepseek",
        prompt: {
          en: `Analyze the following and return structured output.

Input:
"""[paste your data or problem description]"""

Step 1 — Parse: identify the key entities, numbers, and relationships.
Step 2 — Reason: work through the logic step by step. State each inference.
Step 3 — Conclude: state your conclusion and confidence level (high / medium / low).
Step 4 — Flag: list anything that is ambiguous or requires additional input.

Format:
Entities: [bullet list]
Reasoning: [numbered steps]
Conclusion: [1-2 sentences]
Confidence: [high / medium / low] — [reason]
Flags: [list or 'None']

Return ONLY this structure. No preamble.`,
          es: `Analizá lo siguiente y devolvé salida estructurada.

Input:
"""[pegá tus datos o descripción del problema]"""

Paso 1 — Parsear: identificá las entidades clave, números y relaciones.
Paso 2 — Razonar: trabajá la lógica paso a paso. Enunciá cada inferencia.
Paso 3 — Concluir: enunciá tu conclusión y nivel de confianza (alto / medio / bajo).
Paso 4 — Marcar: listá todo lo que es ambiguo o requiere input adicional.

Formato:
Entidades: [lista de bullets]
Razonamiento: [pasos numerados]
Conclusión: [1-2 oraciones]
Confianza: [alta / media / baja] — [razón]
Flags: [lista o 'Ninguno']

Devolvé SOLO esta estructura. Sin preámbulo.`,
        },
      },
    ],
    faq: [
      {
        q: { en: "Is DeepSeek better than GPT or Claude for coding tasks?", es: "¿DeepSeek es mejor que GPT o Claude para tareas de código?" },
        a: {
          en: "It depends on the task. DeepSeek is particularly strong on analytical reasoning and code tasks with explicit constraints. For nuanced writing or long document Q&A, Claude and GPT tend to produce more polished results. Test on your specific use case.",
          es: "Depende de la tarea. DeepSeek es especialmente fuerte en razonamiento analítico y tareas de código con restricciones explícitas. Para escritura matizada o Q&A sobre documentos largos, Claude y GPT tienden a producir resultados más pulidos. Probalo en tu caso de uso específico.",
        },
      },
      {
        q: { en: "Do I need to change my prompts significantly to use DeepSeek?", es: "¿Necesito cambiar mucho mis prompts para usar DeepSeek?" },
        a: {
          en: "Not fundamentally. The core principles — clear task, explicit constraints, defined output format — work across all models. With DeepSeek, you get better results by being more explicit about steps and schema, and by avoiding narrative-style framing.",
          es: "No fundamentalmente. Los principios básicos — tarea clara, restricciones explícitas, formato de salida definido — funcionan en todos los modelos. Con DeepSeek, obtenés mejores resultados siendo más explícito sobre pasos y esquema, y evitando el estilo narrativo.",
        },
      },
    ],
  },
  {
    slug: "few-shot-prompting",
    title: {
      en: "Few-shot prompting: how to show examples instead of just explaining",
      es: "Few-shot prompting: cómo mostrar ejemplos en vez de solo explicar",
    },
    description: {
      en: "Few-shot prompting uses examples inside the prompt to show the model exactly what you want — more reliable than verbal instructions alone for formatting, tone, and structure.",
      es: "El few-shot prompting usa ejemplos dentro del prompt para mostrarle al modelo exactamente qué querés — más confiable que solo instrucciones verbales para formato, tono y estructura.",
    },
    sections: [
      {
        heading: { en: "When few-shot beats plain instructions", es: "Cuándo few-shot supera a las instrucciones normales" },
        bullets: {
          en: [
            "When the format is hard to describe but easy to show: tables, structured labels, custom JSON shapes.",
            "When tone needs to be precise: formal vs. casual, technical vs. plain — examples anchor the register.",
            "When the task has unusual patterns the model hasn't seen in training (niche domains, internal formats).",
            "When you've tried zero-shot and the output is inconsistent across runs.",
            "When the model keeps misunderstanding the instruction despite rewording it.",
          ],
          es: [
            "Cuando el formato es difícil de describir pero fácil de mostrar: tablas, etiquetas estructuradas, JSON personalizado.",
            "Cuando el tono necesita ser preciso: formal vs casual, técnico vs simple — los ejemplos anclan el registro.",
            "Cuando la tarea tiene patrones inusuales que el modelo no vio en entrenamiento (dominios nicho, formatos internos).",
            "Cuando probaste zero-shot y el output es inconsistente entre ejecuciones.",
            "Cuando el modelo sigue malinterpretando la instrucción a pesar de reescribirla.",
          ],
        },
      },
      {
        heading: { en: "How to write effective few-shot examples", es: "Cómo escribir ejemplos few-shot efectivos" },
        bullets: {
          en: [
            "Use 2-5 examples — enough to show the pattern, not so many that you burn tokens.",
            "Keep examples diverse: cover different lengths, edge cases, or content types the task might encounter.",
            "Show the exact input-output format you want — not a paraphrase of it.",
            "Use consistent delimiter markers (e.g. Input: / Output: or --- Example --- blocks) so the model sees structure.",
            "Place examples before the actual task, and mark the end of examples clearly.",
          ],
          es: [
            "Usá 2-5 ejemplos — suficientes para mostrar el patrón, no tantos como para desperdiciar tokens.",
            "Hacé los ejemplos diversos: cubrí distintas longitudes, casos límite o tipos de contenido que puede encontrar la tarea.",
            "Mostrá el formato de input-output exacto que querés — no una paráfrasis.",
            "Usá marcadores delimitadores consistentes (ej. Entrada: / Salida: o bloques --- Ejemplo ---) para que el modelo vea estructura.",
            "Poné los ejemplos antes de la tarea real, y marcá claramente el fin de los ejemplos.",
          ],
        },
      },
    ],
    templates: [
      {
        title: { en: "Classify text with examples", es: "Clasificar texto con ejemplos" },
        purpose: "data",
        target: "gpt",
        prompt: {
          en: `Classify the sentiment of each text as: Positive, Negative, or Neutral.

Examples:
Input: "The delivery was fast and the product works great."
Output: Positive

Input: "Arrived damaged and customer support didn't help."
Output: Negative

Input: "Package arrived on Tuesday."
Output: Neutral

---

Now classify these:
Input: "[text 1]"
Output:

Input: "[text 2]"
Output:

Return ONLY the classification label for each. No explanation.`,
          es: `Clasificá el sentimiento de cada texto como: Positivo, Negativo o Neutro.

Ejemplos:
Entrada: "La entrega fue rápida y el producto funciona genial."
Salida: Positivo

Entrada: "Llegó dañado y el soporte no ayudó."
Salida: Negativo

Entrada: "El paquete llegó el martes."
Salida: Neutro

---

Ahora clasificá estos:
Entrada: "[texto 1]"
Salida:

Entrada: "[texto 2]"
Salida:

Devolvé SOLO la etiqueta de clasificación para cada uno. Sin explicación.`,
        },
      },
      {
        title: { en: "Rewrite in a specific style using examples", es: "Reescribir en un estilo específico con ejemplos" },
        purpose: "text",
        target: "claude",
        prompt: {
          en: `Rewrite the text in the style shown by the examples below.

Style characteristics shown in examples:
- [e.g. short sentences, active voice, no jargon, direct address]

Example 1:
Original: "The implementation of the new feature requires coordination between multiple stakeholders."
Rewritten: "This feature needs three teams to sync. Set up a kickoff this week."

Example 2:
Original: "There are several considerations that must be taken into account before proceeding."
Rewritten: "Check these three things before you start: [list them]."

---

Now rewrite this text:
"""[paste your text]"""`,
          es: `Reescribí el texto en el estilo que muestran los ejemplos de abajo.

Características del estilo mostradas en los ejemplos:
- [ej. oraciones cortas, voz activa, sin jerga, apelación directa]

Ejemplo 1:
Original: "La implementación de la nueva funcionalidad requiere coordinación entre múltiples stakeholders."
Reescrito: "Esta feature necesita que tres equipos se sincronicen. Organizá un kickoff esta semana."

Ejemplo 2:
Original: "Existen varias consideraciones que deben tenerse en cuenta antes de proceder."
Reescrito: "Revisá estas tres cosas antes de empezar: [listalas]."

---

Ahora reescribí este texto:
"""[pegá tu texto]"""`,
        },
      },
    ],
    faq: [
      {
        q: { en: "How many examples should I include?", es: "¿Cuántos ejemplos debo incluir?" },
        a: {
          en: "2-3 examples cover most cases. More than 5 rarely improves results and burns token budget. The quality of examples matters more than quantity — diverse, representative examples beat many similar ones.",
          es: "2-3 ejemplos cubren la mayoría de los casos. Más de 5 raramente mejora los resultados y consume tokens. La calidad de los ejemplos importa más que la cantidad — ejemplos diversos y representativos son mejores que muchos similares.",
        },
      },
      {
        q: { en: "Can few-shot prompting fix hallucinations?", es: "¿El few-shot prompting corrige las alucinaciones?" },
        a: {
          en: "Not directly, but it helps with format hallucinations — cases where the model invents fields, adds extra text, or uses the wrong structure. For factual accuracy, you still need grounding (citing sources or providing reference data).",
          es: "No directamente, pero ayuda con alucinaciones de formato — casos donde el modelo inventa campos, agrega texto extra o usa la estructura incorrecta. Para precisión factual, igual necesitás grounding (citar fuentes o proveer datos de referencia).",
        },
      },
    ],
  },
  {
    slug: "prompt-quality-scoring",
    title: {
      en: "How to score and improve your prompt quality before sending it",
      es: "Cómo puntuar y mejorar la calidad de tu prompt antes de enviarlo",
    },
    description: {
      en: "A self-evaluation framework to score prompt quality before running it — covering goal clarity, context completeness, format constraints, and common failure modes.",
      es: "Un framework de autoevaluación para puntuar la calidad de un prompt antes de ejecutarlo — con claridad del objetivo, completitud del contexto, restricciones de formato y modos de falla comunes.",
    },
    sections: [
      {
        heading: { en: "The five dimensions of prompt quality", es: "Las cinco dimensiones de calidad de un prompt" },
        bullets: {
          en: [
            "Goal clarity: is the success condition unambiguous? Could two people read this and expect the same output?",
            "Context completeness: does the model have the minimum information needed to answer correctly?",
            "Output format: is the structure, length, and format explicitly specified?",
            "Constraint coverage: are the key 'do not' rules stated? Missing constraints are the most common source of unwanted output.",
            "Edge case handling: what should happen on missing data, ambiguity, or an out-of-scope request?",
          ],
          es: [
            "Claridad del objetivo: ¿la condición de éxito es inequívoca? ¿Dos personas leyendo esto esperarían el mismo output?",
            "Completitud del contexto: ¿el modelo tiene la información mínima necesaria para responder correctamente?",
            "Formato de salida: ¿la estructura, longitud y formato están especificados explícitamente?",
            "Cobertura de restricciones: ¿las reglas de 'no hacer' están enunciadas? Las restricciones faltantes son la fuente más común de output no deseado.",
            "Manejo de casos límite: ¿qué debería pasar con datos faltantes, ambigüedad o un pedido fuera de scope?",
          ],
        },
      },
      {
        heading: { en: "Common patterns that lower prompt scores", es: "Patrones comunes que bajan el score de un prompt" },
        bullets: {
          en: [
            "No output format: 'Write a summary' without length or structure guidance.",
            "Conflicting instructions: 'Be concise' and 'cover everything in detail' in the same prompt.",
            "Missing audience: the model can't calibrate depth or tone without knowing who will read the output.",
            "Asking for 'the best' without criteria: the model picks criteria and the result feels arbitrary.",
            "Vague scope: 'help me with my project' — what kind of help, what project constraints?",
          ],
          es: [
            "Sin formato de salida: 'Escribí un resumen' sin guía de longitud o estructura.",
            "Instrucciones contradictorias: 'Sé conciso' y 'cubrí todo en detalle' en el mismo prompt.",
            "Sin audiencia: el modelo no puede calibrar profundidad o tono sin saber quién leerá el output.",
            "Pedir 'lo mejor' sin criterios: el modelo elige los criterios y el resultado se siente arbitrario.",
            "Scope vago: 'ayudame con mi proyecto' — ¿qué tipo de ayuda, qué restricciones del proyecto?",
          ],
        },
      },
    ],
    templates: [
      {
        title: { en: "Self-review checklist prompt", es: "Prompt de checklist de autorevisión" },
        purpose: "text",
        target: "gpt",
        prompt: {
          en: `Review this prompt and score it on a scale of 1-10 for each dimension below.

Prompt to review:
"""[paste your prompt here]"""

Score each dimension:
1. Goal clarity (1-10): [is the success condition unambiguous?]
2. Context completeness (1-10): [does the model have what it needs?]
3. Output format (1-10): [is structure/length/format specified?]
4. Constraint coverage (1-10): [are 'do not' rules stated?]
5. Edge case handling (1-10): [what happens on missing data or ambiguity?]

Overall score: [average]
Top 2 improvements: [specific, actionable fixes only — no generic advice]
Rewritten version: [the improved prompt, ready to copy-paste]`,
          es: `Revisá este prompt y puntualo del 1 al 10 en cada dimensión de abajo.

Prompt a revisar:
"""[pegá tu prompt acá]"""

Puntúa cada dimensión:
1. Claridad del objetivo (1-10): [¿la condición de éxito es inequívoca?]
2. Completitud del contexto (1-10): [¿el modelo tiene lo que necesita?]
3. Formato de salida (1-10): [¿estructura/longitud/formato están especificados?]
4. Cobertura de restricciones (1-10): [¿las reglas de 'no hacer' están enunciadas?]
5. Manejo de casos límite (1-10): [¿qué pasa con datos faltantes o ambigüedad?]

Score general: [promedio]
Top 2 mejoras: [fixes específicos y accionables — sin consejos genéricos]
Versión mejorada: [el prompt mejorado, listo para copiar-pegar]`,
        },
      },
      {
        title: { en: "Rapid prompt debug — find the weak spot", es: "Debug rápido de prompt — encontrá el punto débil" },
        purpose: "text",
        target: "claude",
        prompt: {
          en: `Diagnose what is wrong with this prompt. Be specific.

Prompt:
"""[paste prompt here]"""

Do this:
1. Identify the single most likely cause of inconsistent or low-quality output.
2. Quote the exact phrase or omission causing the problem.
3. Rewrite only the problematic part (not the whole prompt).
4. Add one constraint that would prevent the most common failure.

Do not give generic writing advice. Focus on the structural issue.`,
          es: `Diagnosticá qué está mal con este prompt. Sé específico.

Prompt:
"""[pegá el prompt acá]"""

Hacé esto:
1. Identificá la causa más probable de output inconsistente o de baja calidad.
2. Citá la frase exacta u omisión que causa el problema.
3. Reescribí solo la parte problemática (no el prompt completo).
4. Agregá una restricción que prevendría el fallo más común.

No des consejos genéricos de escritura. Enfocate en el problema estructural.`,
        },
      },
    ],
    faq: [
      {
        q: { en: "Can I use Promptea to score my prompts automatically?", es: "¿Puedo usar Promptea para puntuar mis prompts automáticamente?" },
        a: {
          en: "Yes — that's what Promptea does. Paste your prompt, select the AI model and task type, and Promptea scores it across multiple dimensions, flags specific issues, and generates an optimized version ready to copy-paste.",
          es: "Sí — eso es lo que hace Promptea. Pegá tu prompt, seleccioná el modelo de IA y tipo de tarea, y Promptea lo puntúa en múltiples dimensiones, señala problemas específicos y genera una versión optimizada lista para copiar-pegar.",
        },
      },
      {
        q: { en: "Is a higher score always better?", es: "¿Un score más alto siempre es mejor?" },
        a: {
          en: "Not always. Simple tasks don't need long, structured prompts — a lean prompt that fits the task scores better in practice than an over-specified one. The goal is the minimum prompt that gets consistent, correct output. Use the score as a diagnostic, not a target to maximize.",
          es: "No siempre. Las tareas simples no necesitan prompts largos y estructurados — un prompt ajustado que encaja con la tarea funciona mejor en práctica que uno sobre-especificado. El objetivo es el prompt mínimo que produce output consistente y correcto. Usá el score como diagnóstico, no como objetivo a maximizar.",
        },
      },
    ],
  },
  {
    slug: "system-prompts",
    title: {
      en: "System prompts: how to set persistent instructions for ChatGPT, Claude, and Gemini",
      es: "System prompts: cómo configurar instrucciones persistentes para ChatGPT, Claude y Gemini",
    },
    description: {
      en: "How to write system prompts (custom instructions) that shape every response without repeating yourself — covering persona, constraints, output format, and escalation rules.",
      es: "Cómo escribir system prompts (instrucciones personalizadas) que moldean cada respuesta sin repetirse — con persona, restricciones, formato de salida y reglas de escalado.",
    },
    sections: [
      {
        heading: { en: "What system prompts are and when to use them", es: "Qué son los system prompts y cuándo usarlos" },
        bullets: {
          en: [
            "A system prompt is persistent context that runs before every user message — it shapes tone, persona, constraints, and behavior across the whole conversation.",
            "Use system prompts when you need consistent behavior across many interactions: a support bot, a writing assistant, a code reviewer, an internal tool.",
            "Without a system prompt, each request starts from scratch — you lose consistent tone, format, and safety rules between turns.",
            "System prompts are available natively in ChatGPT (Custom Instructions or GPT system prompt), Claude (system parameter), and Gemini (system instruction).",
          ],
          es: [
            "Un system prompt es contexto persistente que corre antes de cada mensaje del usuario — moldea el tono, la persona, las restricciones y el comportamiento en toda la conversación.",
            "Usá system prompts cuando necesitás comportamiento consistente en muchas interacciones: un bot de soporte, un asistente de escritura, un revisor de código, una herramienta interna.",
            "Sin system prompt, cada pedido empieza de cero — perdés tono consistente, formato y reglas de seguridad entre turnos.",
            "Los system prompts están disponibles nativamente en ChatGPT (Custom Instructions o system prompt de GPT), Claude (parámetro system) y Gemini (system instruction).",
          ],
        },
      },
      {
        heading: { en: "What to put in a system prompt", es: "Qué poner en un system prompt" },
        bullets: {
          en: [
            "Persona: who the model is, what domain it knows, and how it communicates (tone, formality, length defaults).",
            "Scope: what it helps with and — equally important — what it does not help with.",
            "Output format defaults: if every answer should use bullets, a specific structure, or a length limit, state it here so you don't repeat it each turn.",
            "Escalation rules: what to do when a request is out of scope, ambiguous, or requires information the model doesn't have.",
            "Safety constraints: what claims to avoid, what disclaimers to add, what topics require caution.",
          ],
          es: [
            "Persona: quién es el modelo, qué dominio conoce y cómo comunica (tono, formalidad, extensión por defecto).",
            "Alcance: con qué ayuda y — igualmente importante — con qué no ayuda.",
            "Formato de salida por defecto: si cada respuesta debe usar bullets, una estructura específica o un límite de longitud, especificalo acá para no repetirlo en cada turno.",
            "Reglas de escalado: qué hacer cuando un pedido está fuera de scope, es ambiguo o requiere info que el modelo no tiene.",
            "Restricciones de seguridad: qué afirmaciones evitar, qué disclaimers agregar, qué temas requieren cuidado.",
          ],
        },
      },
      {
        heading: { en: "Common system prompt mistakes", es: "Errores comunes en system prompts" },
        bullets: {
          en: [
            "Overloading with rules: a 2000-word system prompt buries the most important constraints. Keep it focused — prioritize the 5-7 rules that matter most.",
            "Contradicting the user prompt: if the system prompt says 'be concise' and the user asks for exhaustive detail, the model will blend them unpredictably. Resolve conflicts in the system prompt explicitly.",
            "Forgetting format defaults: not setting a default format means every response varies unless the user specifies one each time.",
            "Vague persona: 'be helpful and professional' gives the model nothing to distinguish its behavior from a default response. Specify domain, audience, and what helpful means here.",
          ],
          es: [
            "Sobrecarga de reglas: un system prompt de 2000 palabras entierra las restricciones más importantes. Mantenelo enfocado — priorizá las 5-7 reglas que más importan.",
            "Contradecir el user prompt: si el system prompt dice 'sé conciso' y el usuario pide detalle exhaustivo, el modelo los mezclará de forma impredecible. Resolvé conflictos en el system prompt explícitamente.",
            "Olvidar el formato por defecto: no definir un formato por defecto hace que cada respuesta varíe salvo que el usuario especifique uno cada vez.",
            "Persona vaga: 'sé útil y profesional' no le da al modelo nada que diferencie su comportamiento de una respuesta por defecto. Especificá dominio, audiencia y qué significa ser útil aquí.",
          ],
        },
      },
    ],
    templates: [
      {
        title: { en: "Customer support assistant system prompt", es: "System prompt para asistente de soporte al cliente" },
        purpose: "text",
        target: "gpt",
        prompt: {
          en: `You are a customer support assistant for [Company Name], a [brief description of the product/service].

Persona:
- Tone: friendly, direct, and patient.
- Domain: [product area, e.g. "SaaS billing and account management"].
- Audience: [e.g. "paying customers who may not be technical"].

What you help with:
- Answering questions about [specific topics].
- Troubleshooting [specific issues].
- Explaining pricing and plan details.

What you do NOT do:
- Make promises about future features or timelines.
- Process refunds or account changes directly — redirect to [e.g. "the billing team at billing@company.com"].
- Give legal or financial advice.

When you don't know the answer:
- Say "I don't have that information, but I can connect you with someone who does."
- Never invent facts or policies.

Output format defaults:
- Keep answers to 3-5 sentences unless the issue requires more detail.
- Use numbered steps when explaining a process.
- End every response with a clear next action for the user.`,
          es: `Sos un asistente de soporte al cliente para [Nombre de la empresa], un/a [descripción breve del producto/servicio].

Persona:
- Tono: amigable, directo y paciente.
- Dominio: [área del producto, ej. "facturación y gestión de cuentas SaaS"].
- Audiencia: [ej. "clientes pagadores que pueden no ser técnicos"].

Con qué ayudás:
- Responder preguntas sobre [temas específicos].
- Resolver problemas de [problemas específicos].
- Explicar precios y detalles de planes.

Con qué NO ayudás:
- Hacer promesas sobre funcionalidades futuras o plazos.
- Procesar reembolsos o cambios de cuenta directamente — derivar a [ej. "el equipo de facturación en facturacion@empresa.com"].
- Dar asesoramiento legal o financiero.

Cuando no sabés la respuesta:
- Decí "No tengo esa información, pero puedo conectarte con alguien que sí la tiene."
- Nunca inventes hechos o políticas.

Formato de salida por defecto:
- Mantené las respuestas en 3-5 oraciones salvo que el problema requiera más detalle.
- Usá pasos numerados cuando expliques un proceso.
- Terminá cada respuesta con una acción clara para el usuario.`,
        },
      },
      {
        title: { en: "Writing assistant with style constraints", es: "Asistente de escritura con restricciones de estilo" },
        purpose: "text",
        target: "claude",
        prompt: {
          en: `You are a writing assistant. Your job is to help improve, edit, and write content.

Style constraints (apply to every response):
- Prefer short sentences (under 20 words each).
- Active voice only — flag passive voice when you see it.
- No filler words: remove "very", "just", "really", "basically", "essentially".
- No hedge phrases: "it could be argued", "one might say", "in some ways".
- Word count ceiling: unless asked otherwise, keep suggestions under 150 words.

When reviewing text:
1. Quote the specific phrase that needs improvement.
2. Explain the problem in one sentence.
3. Provide a rewritten version.

When writing from scratch:
- Ask one clarifying question about audience and goal before starting.
- Deliver 2 variants when the tone is ambiguous.

What you do not do:
- Write in a style that violates the constraints above, even if asked.
- Pad responses with encouragement or summaries nobody asked for.`,
          es: `Sos un asistente de escritura. Tu trabajo es ayudar a mejorar, editar y escribir contenido.

Restricciones de estilo (aplicar en cada respuesta):
- Preferí oraciones cortas (menos de 20 palabras cada una).
- Solo voz activa — marcá la voz pasiva cuando la veas.
- Sin palabras de relleno: eliminá "muy", "básicamente", "realmente", "simplemente", "esencialmente".
- Sin frases de rodeo: "podría argumentarse", "en cierta forma", "de algún modo".
- Techo de palabras: salvo que se indique, mantené las sugerencias en menos de 150 palabras.

Al revisar texto:
1. Citá la frase específica que necesita mejora.
2. Explicá el problema en una oración.
3. Proporcioná una versión reescrita.

Al escribir desde cero:
- Hacé una pregunta de aclaración sobre audiencia y objetivo antes de empezar.
- Entregá 2 variantes cuando el tono sea ambiguo.

Qué no hacés:
- Escribir en un estilo que viole las restricciones anteriores, aunque se te pida.
- Rellenar respuestas con elogios o resúmenes que nadie pidió.`,
        },
      },
    ],
    faq: [
      {
        q: { en: "Is a system prompt the same as a custom instruction in ChatGPT?", es: "¿Un system prompt es lo mismo que una instrucción personalizada en ChatGPT?" },
        a: {
          en: "Functionally yes. ChatGPT's Custom Instructions are injected as a system-level message before each conversation. In the API, you pass it explicitly as the 'system' role message. In Claude and Gemini it's the 'system' parameter. Same concept, different surface.",
          es: "Funcionalmente sí. Las Custom Instructions de ChatGPT se inyectan como un mensaje de nivel sistema antes de cada conversación. En la API, lo pasás explícitamente como el mensaje de rol 'system'. En Claude y Gemini es el parámetro 'system'. El mismo concepto, diferente superficie.",
        },
      },
      {
        q: { en: "Can a user override the system prompt in their message?", es: "¿Puede un usuario anular el system prompt en su mensaje?" },
        a: {
          en: "In most models, yes — a strong user instruction can override system-level guidance, especially if there's a direct conflict. To make a constraint stick, state it explicitly and repeat it near the end of the system prompt. For critical safety rules, test edge cases before deploying.",
          es: "En la mayoría de los modelos, sí — una instrucción fuerte del usuario puede anular la guía del sistema, especialmente si hay un conflicto directo. Para que una restricción se mantenga, enunciala explícitamente y repetila cerca del final del system prompt. Para reglas de seguridad críticas, probá casos límite antes de desplegar.",
        },
      },
      {
        q: { en: "How long should a system prompt be?", es: "¿Qué tan largo debe ser un system prompt?" },
        a: {
          en: "As short as it can be while covering what matters. A 200-400 word system prompt with 5-7 clear rules outperforms a 2000-word one where important constraints are buried. Add detail only when a rule is ambiguous enough that the model will interpret it differently without it.",
          es: "Lo más corto posible cubriendo lo que importa. Un system prompt de 200-400 palabras con 5-7 reglas claras supera a uno de 2000 palabras donde las restricciones importantes están enterradas. Agregá detalle solo cuando una regla es tan ambigua que el modelo la interpretará de forma diferente sin él.",
        },
      },
    ],
  },
  {
    slug: "translation-prompts",
    title: {
      en: "AI translation prompts that preserve meaning, tone, and register",
      es: "Prompts de traducción para IA que preservan significado, tono y registro",
    },
    description: {
      en: "Templates for translating content with AI — with tone matching, register controls, domain glossaries, and constraints to prevent common translation failures.",
      es: "Plantillas para traducir contenido con IA — con coincidencia de tono, controles de registro, glosarios de dominio y restricciones para evitar fallos comunes de traducción.",
    },
    sections: [
      {
        heading: { en: "Why AI translation fails without constraints", es: "Por qué la traducción con IA falla sin restricciones" },
        bullets: {
          en: [
            "No register guidance: a formal legal document and a casual marketing email require different registers — without guidance, the model picks one arbitrarily.",
            "Missing domain glossary: industry terms (legal, medical, technical) often have established translations the model may not default to. Provide the glossary explicitly.",
            "No handling rules for untranslatable terms: brand names, product names, acronyms, and proper nouns often should not be translated — state what to preserve.",
            "No format preservation constraint: line breaks, bullet points, and HTML tags in the source often get mangled without an explicit 'preserve formatting' instruction.",
            "Length drift: translations can be 20-30% longer or shorter than the source without a length constraint — this matters for UI strings, subtitles, and print.",
          ],
          es: [
            "Sin guía de registro: un documento legal formal y un email de marketing casual requieren registros distintos — sin guía, el modelo elige uno arbitrariamente.",
            "Sin glosario de dominio: los términos del sector (legal, médico, técnico) suelen tener traducciones establecidas que el modelo puede no usar por defecto. Proveé el glosario explícitamente.",
            "Sin reglas para términos intraducibles: nombres de marca, nombres de producto, acrónimos y nombres propios a menudo no deberían traducirse — especificá qué preservar.",
            "Sin restricción de preservación de formato: saltos de línea, bullets y etiquetas HTML en el fuente suelen distorsionarse sin una instrucción explícita de 'preservar formato'.",
            "Deriva de longitud: las traducciones pueden ser 20-30% más largas o cortas que el fuente sin restricción de longitud — esto importa para strings de UI, subtítulos e impresión.",
          ],
        },
      },
      {
        heading: { en: "Controls that improve translation quality", es: "Controles que mejoran la calidad de la traducción" },
        bullets: {
          en: [
            "Name the target language and region variant: 'Spanish (Mexico)' vs 'Spanish (Spain)' produce different vocabulary and formality conventions.",
            "Specify register: formal / informal / technical / conversational — one word adds significant consistency.",
            "Give a domain glossary for 3-10 key terms — it prevents the most common errors without overloading the prompt.",
            "State what not to translate: brand names, code snippets, proper nouns, and UI labels often must stay in the source language.",
            "Ask for a confidence note: 'Flag any phrase where the meaning is ambiguous or there is no direct equivalent.'",
          ],
          es: [
            "Nombrá el idioma destino y la variante regional: 'Español (México)' vs 'Español (España)' producen vocabulario y convenciones de formalidad diferentes.",
            "Especificá el registro: formal / informal / técnico / conversacional — una palabra agrega consistencia significativa.",
            "Dá un glosario de dominio para 3-10 términos clave — previene los errores más comunes sin sobrecargar el prompt.",
            "Indicá qué no traducir: nombres de marca, fragmentos de código, nombres propios y etiquetas de UI a menudo deben quedar en el idioma fuente.",
            "Pedí una nota de confianza: 'Marcá cualquier frase donde el significado sea ambiguo o no haya equivalente directo.'",
          ],
        },
      },
    ],
    templates: [
      {
        title: { en: "Document translation with register and glossary", es: "Traducción de documento con registro y glosario" },
        purpose: "translation",
        target: "claude",
        prompt: {
          en: `Translate the document below from [source language] to [target language, e.g. Spanish (Spain)].

Register: [formal / informal / technical — pick one]
Audience: [who will read this, e.g. "legal professionals" / "general public"]

Glossary (use these translations exactly):
- [source term 1] → [target term 1]
- [source term 2] → [target term 2]

Do not translate:
- Brand names and product names (keep as-is).
- Proper nouns and place names (unless there is a standard established translation).
- Acronyms: [list, e.g. "API, URL, SLA"].

Formatting rules:
- Preserve all line breaks, bullet points, and heading structure.
- Do not add or remove paragraphs.

Ambiguity handling:
- If a phrase has no direct equivalent, translate the meaning and add a footnote: [Translator note: ...].

Document:
"""[paste source document here]"""`,
          es: `Traducí el documento de abajo del [idioma fuente] al [idioma destino, ej. inglés (EE. UU.)].

Registro: [formal / informal / técnico — elegí uno]
Audiencia: [quién leerá esto, ej. "profesionales legales" / "público general"]

Glosario (usá estas traducciones exactamente):
- [término fuente 1] → [término destino 1]
- [término fuente 2] → [término destino 2]

No traducir:
- Nombres de marca y productos (mantener tal cual).
- Nombres propios y lugares (salvo que haya una traducción estándar establecida).
- Acrónimos: [lista, ej. "API, URL, SLA"].

Reglas de formato:
- Preservá todos los saltos de línea, bullets y estructura de encabezados.
- No agregues ni elimines párrafos.

Manejo de ambigüedad:
- Si una frase no tiene equivalente directo, traducí el significado y agregá una nota: [Nota del traductor: ...].

Documento:
"""[pegá el documento fuente acá]"""`,
        },
      },
      {
        title: { en: "UI strings batch translation (short texts)", es: "Traducción en lote de strings de UI (textos cortos)" },
        purpose: "translation",
        target: "gpt",
        prompt: {
          en: `Translate the following UI strings from English to [target language].

Rules:
1. Each string must be translated individually — do not merge or reorder.
2. Keep translations short: UI labels must fit the same space as the original.
3. Do not translate: variables in {curly_braces}, HTML tags, and brand names.
4. Preserve capitalization style: if the source is Title Case, the translation should match it.
5. Register: [formal / informal].

Return format (JSON array, same order as input):
[
  { "key": "source_key", "original": "source string", "translation": "translated string" }
]

Strings to translate:
[
  { "key": "btn_save", "original": "Save changes" },
  { "key": "error_required", "original": "This field is required" },
  { "key": "label_email", "original": "Email address" }
]`,
          es: `Traducí los siguientes strings de UI del inglés al [idioma destino].

Reglas:
1. Cada string debe traducirse individualmente — no fusiones ni reordenes.
2. Mantené las traducciones cortas: las etiquetas de UI deben caber en el mismo espacio que el original.
3. No traducir: variables en {llaves_rizadas}, etiquetas HTML y nombres de marca.
4. Preservá el estilo de mayúsculas: si el fuente usa Title Case, la traducción debe coincidir.
5. Registro: [formal / informal].

Formato de retorno (array JSON, en el mismo orden que el input):
[
  { "key": "clave_fuente", "original": "string fuente", "translation": "string traducido" }
]

Strings a traducir:
[
  { "key": "btn_save", "original": "Save changes" },
  { "key": "error_required", "original": "This field is required" },
  { "key": "label_email", "original": "Email address" }
]`,
        },
      },
    ],
    faq: [
      {
        q: { en: "Is AI translation good enough for professional use?", es: "¿La traducción con IA es suficientemente buena para uso profesional?" },
        a: {
          en: "It depends on the domain and risk level. For internal documents, UI strings, and low-stakes content, well-constrained AI translation is fast and accurate. For legal contracts, medical content, or published materials, use AI as a first draft and have a professional translator review it. The templates above reduce errors significantly but don't eliminate the need for human review on high-stakes text.",
          es: "Depende del dominio y el nivel de riesgo. Para documentos internos, strings de UI y contenido de bajo riesgo, la traducción con IA bien restringida es rápida y precisa. Para contratos legales, contenido médico o materiales publicados, usá la IA como primer borrador y hacé que un traductor profesional lo revise. Las plantillas anteriores reducen errores significativamente pero no eliminan la necesidad de revisión humana en textos de alto riesgo.",
        },
      },
      {
        q: { en: "Which model is best for translation tasks?", es: "¿Qué modelo es mejor para tareas de traducción?" },
        a: {
          en: "Claude and GPT-4 class models both produce strong translation results. Claude tends to follow nuanced register and glossary instructions reliably. GPT handles batch and structured-output translation well. For languages with less training data (non-Latin scripts, regional variants), test both and compare the result on a sample before committing.",
          es: "Los modelos de la clase Claude y GPT-4 producen resultados de traducción sólidos. Claude tiende a seguir instrucciones de registro y glosario con matices de manera confiable. GPT maneja bien la traducción en lote y con salida estructurada. Para idiomas con menos datos de entrenamiento (escrituras no latinas, variantes regionales), probá ambos y compará el resultado en una muestra antes de comprometerte.",
        },
      },
    ],
  },
  {
    slug: "image-generation-prompts",
    title: {
      en: "Image generation prompts: structure, style, and composition for better AI images",
      es: "Prompts de generación de imágenes: estructura, estilo y composición para mejores imágenes de IA",
    },
    description: {
      en: "How to write image prompts that get consistent, intentional results — covering subject, style, composition, lighting, and negative constraints for DALL-E, Gemini Imagen, and similar models.",
      es: "Cómo escribir prompts de imagen que producen resultados consistentes e intencionales — con sujeto, estilo, composición, iluminación y restricciones negativas para DALL-E, Gemini Imagen y modelos similares.",
    },
    sections: [
      {
        heading: { en: "The anatomy of an effective image prompt", es: "La anatomía de un prompt de imagen efectivo" },
        bullets: {
          en: [
            "Subject: who or what is in the scene — be specific (not 'a person' but 'a woman in her 30s reading at a café table').",
            "Style: the visual look — photography, illustration, oil painting, flat design, 3D render, watercolor, line art.",
            "Composition: where things are placed — close-up, wide shot, overhead, rule of thirds, centered.",
            "Lighting: the mood and time of day — soft morning light, dramatic side lighting, overcast, golden hour, studio lighting.",
            "Color palette: restrict or guide the colors — muted earth tones, high contrast black and white, pastel, vivid primaries.",
            "Negative constraints: what to exclude — 'no text', 'no watermarks', 'no extra limbs', 'no cluttered background'.",
          ],
          es: [
            "Sujeto: quién o qué hay en la escena — sé específico (no 'una persona' sino 'una mujer de unos 30 años leyendo en una mesa de café').",
            "Estilo: el aspecto visual — fotografía, ilustración, pintura al óleo, diseño plano, render 3D, acuarela, arte de línea.",
            "Composición: dónde se ubican las cosas — primer plano, plano abierto, cenital, regla de los tercios, centrado.",
            "Iluminación: el ambiente y hora del día — luz suave de mañana, iluminación lateral dramática, nublado, hora dorada, iluminación de estudio.",
            "Paleta de colores: restringí o guiá los colores — tonos tierra apagados, blanco y negro de alto contraste, pastel, primarios vívidos.",
            "Restricciones negativas: qué excluir — 'sin texto', 'sin marcas de agua', 'sin extremidades extra', 'sin fondo recargado'.",
          ],
        },
      },
      {
        heading: { en: "Common image prompt mistakes", es: "Errores comunes en prompts de imagen" },
        bullets: {
          en: [
            "Too vague: 'a nice landscape' gives you a random result every time. Describe the scene, season, time of day, and mood.",
            "Conflicting style cues: mixing 'photorealistic' with 'cartoon' confuses the model — pick one primary style.",
            "No composition guidance: without it, the subject placement is random. Add 'centered', 'rule of thirds', or a framing hint.",
            "Missing negative constraints: asking for 'a clean background' works better than hoping the model avoids clutter by default.",
            "Prompt too long: the most important elements should come first — image models weight earlier tokens more heavily.",
          ],
          es: [
            "Demasiado vago: 'un paisaje lindo' te da un resultado diferente cada vez. Describí la escena, estación, hora del día y ambiente.",
            "Señales de estilo conflictivas: mezclar 'fotorrealista' con 'caricatura' confunde al modelo — elegí un estilo principal.",
            "Sin guía de composición: sin ella, la ubicación del sujeto es aleatoria. Agregá 'centrado', 'regla de los tercios' o un hint de encuadre.",
            "Sin restricciones negativas: pedir 'un fondo limpio' funciona mejor que esperar que el modelo evite el desorden por defecto.",
            "Prompt demasiado largo: los elementos más importantes deben ir primero — los modelos de imagen ponderan más los tokens al inicio.",
          ],
        },
      },
    ],
    templates: [
      {
        title: { en: "Photorealistic product image prompt", es: "Prompt para imagen de producto fotorrealista" },
        purpose: "image",
        target: "gpt",
        prompt: {
          en: `Photorealistic product photography of [product name and brief description].

Setting: [e.g. clean white studio background / wooden table surface / outdoor natural setting]
Lighting: [e.g. soft diffused studio lighting / natural window light from the left / dramatic side lighting]
Composition: [e.g. centered, slight 3/4 angle / overhead flat lay / close-up on the main feature]
Color palette: [e.g. neutral whites and grays / warm earth tones / brand colors: navy and gold]
Camera style: [e.g. macro lens for fine detail / wide product shot / lifestyle context shot]

Additional details:
- [any props or context elements to include, or 'none']
- [specific textures or materials to emphasize]

Exclude: watermarks, text overlays, shadows on white background, extra objects not listed above.`,
          es: `Fotografía de producto fotorrealista de [nombre del producto y descripción breve].

Escenario: [ej. fondo de estudio blanco limpio / superficie de mesa de madera / ambiente natural al aire libre]
Iluminación: [ej. iluminación de estudio difusa suave / luz natural de ventana desde la izquierda / iluminación lateral dramática]
Composición: [ej. centrado, ligero ángulo de 3/4 / flat lay cenital / primer plano del elemento principal]
Paleta de colores: [ej. blancos y grises neutros / tonos tierra cálidos / colores de marca: navy y dorado]
Estilo de cámara: [ej. lente macro para detalle fino / plano abierto del producto / plano de contexto lifestyle]

Detalles adicionales:
- [props o elementos de contexto a incluir, o 'ninguno']
- [texturas o materiales específicos a enfatizar]

Excluir: marcas de agua, texto superpuesto, sombras sobre fondo blanco, objetos extra no listados arriba.`,
        },
      },
      {
        title: { en: "Illustrated explainer diagram prompt", es: "Prompt para diagrama explicativo ilustrado" },
        purpose: "image",
        target: "gemini",
        prompt: {
          en: `Flat design illustration explaining [concept or process in 1 sentence].

Style: clean flat design, minimal detail, bold readable icons.
Color palette: [e.g. 3-4 colors maximum: blue, white, light gray, and one accent color]
Layout: [e.g. left-to-right flow with 4 steps / circular diagram / comparison: before vs after]
Text in image: [e.g. include short labels on each step (max 3 words each) / no text — labels will be added later]
Icons: simple geometric shapes, no photorealism, consistent line weight.
Background: solid [color] or transparent.

Exclude: gradients, drop shadows, 3D effects, decorative borders, watermarks, photographic elements.`,
          es: `Ilustración de diseño plano que explica [concepto o proceso en 1 oración].

Estilo: diseño plano limpio, mínimo detalle, íconos grandes y legibles.
Paleta de colores: [ej. máximo 3-4 colores: azul, blanco, gris claro y un color de acento]
Layout: [ej. flujo de izquierda a derecha con 4 pasos / diagrama circular / comparación: antes vs después]
Texto en imagen: [ej. incluir etiquetas cortas en cada paso (máx 3 palabras cada una) / sin texto — las etiquetas se agregarán después]
Íconos: formas geométricas simples, sin fotorrealismo, peso de línea consistente.
Fondo: sólido [color] o transparente.

Excluir: degradados, sombras, efectos 3D, bordes decorativos, marcas de agua, elementos fotográficos.`,
        },
      },
    ],
    faq: [
      {
        q: { en: "Do these templates work with Midjourney and Stable Diffusion, or only DALL-E and Gemini?", es: "¿Estos templates funcionan con Midjourney y Stable Diffusion, o solo con DALL-E y Gemini?" },
        a: {
          en: "The core structure — subject, style, composition, lighting, negative constraints — works across all image generation models. Syntax differs: Midjourney uses parameters like --style, --ar, and --no; Stable Diffusion uses separate positive and negative prompt fields. Adapt the structure to the model's expected format, but the concepts are universal.",
          es: "La estructura base — sujeto, estilo, composición, iluminación, restricciones negativas — funciona en todos los modelos de generación de imágenes. La sintaxis difiere: Midjourney usa parámetros como --style, --ar y --no; Stable Diffusion usa campos separados de prompt positivo y negativo. Adaptá la estructura al formato esperado del modelo, pero los conceptos son universales.",
        },
      },
      {
        q: { en: "How do I get consistent results across multiple image generations?", es: "¿Cómo logro resultados consistentes en múltiples generaciones de imágenes?" },
        a: {
          en: "Consistency comes from locking the variables that matter most: style, color palette, and composition. Save your prompt exactly as-is when you get a good result and reuse it. For character or product consistency across multiple images, some models support reference images or seed locking — check the model's documentation for this feature.",
          es: "La consistencia viene de fijar las variables que más importan: estilo, paleta de colores y composición. Guardá tu prompt exactamente tal cual cuando obtenés un buen resultado y reutilizalo. Para consistencia de personaje o producto en múltiples imágenes, algunos modelos soportan imágenes de referencia o fijación de seed — revisá la documentación del modelo para esta función.",
        },
      },
    ],
  },
];

export function getGuide(slug: string): Guide | undefined {
  return guides.find((g) => g.slug === slug);
}
