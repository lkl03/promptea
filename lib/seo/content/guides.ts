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
];

export function getGuide(slug: string): Guide | undefined {
  return guides.find((g) => g.slug === slug);
}
