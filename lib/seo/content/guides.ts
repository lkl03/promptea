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
  {
    slug: "prompt-chaining",
    title: {
      en: "Prompt chaining: how to break complex tasks into sequential AI steps",
      es: "Encadenamiento de prompts: cómo dividir tareas complejas en pasos secuenciales",
    },
    description: {
      en: "Prompt chaining feeds the output of one prompt as input to the next, handling tasks too complex for a single round-trip. Learn the core patterns and where they fail.",
      es: "El encadenamiento de prompts usa la salida de un prompt como entrada del siguiente, para tareas demasiado complejas para una sola consulta. Aprendé los patrones clave y dónde fallan.",
    },
    sections: [
      {
        heading: { en: "What prompt chaining is and when to use it", es: "Qué es el encadenamiento de prompts y cuándo usarlo" },
        bullets: {
          en: [
            "A prompt chain is a sequence of prompts where each output becomes part of the next prompt's input.",
            "Use it when a task has distinct phases that benefit from separate focus: research → outline → draft → edit.",
            "Use it when a single prompt would exceed the model's useful context or require too many competing instructions.",
            "Use it when you need to validate or transform data between steps before passing it downstream.",
            "Avoid it for simple tasks — chaining adds complexity and latency that isn't justified unless the task genuinely requires sequential reasoning.",
          ],
          es: [
            "Una cadena de prompts es una secuencia donde cada salida se convierte en parte de la entrada del siguiente prompt.",
            "Usala cuando una tarea tiene fases distintas que se benefician del foco separado: investigar → esquema → borrador → edición.",
            "Usala cuando un solo prompt excedería el contexto útil del modelo o requeriría demasiadas instrucciones en competencia.",
            "Usala cuando necesitás validar o transformar datos entre pasos antes de pasarlos al siguiente.",
            "Evitala para tareas simples — el encadenamiento agrega complejidad y latencia que no se justifica si la tarea no requiere razonamiento secuencial real.",
          ],
        },
      },
      {
        heading: { en: "Three chaining patterns", es: "Tres patrones de encadenamiento" },
        bullets: {
          en: [
            "Sequential: Step A → Step B → Step C. Each step consumes only the prior step's output. Good for linear workflows like extract → validate → format.",
            "Branching: one input generates multiple outputs in parallel, then a final step synthesizes them. Good for competitive drafts or multi-perspective research.",
            "Looping: a step runs repeatedly until a quality condition is met (e.g., a reviewer prompt judges the output and requests a rewrite until passing). Use with a hard iteration cap.",
            "Mix patterns when needed — a sequential chain can have a branching step inside it.",
          ],
          es: [
            "Secuencial: Paso A → Paso B → Paso C. Cada paso consume solo la salida del anterior. Ideal para flujos lineales como extraer → validar → formatear.",
            "Ramificado: una entrada genera múltiples salidas en paralelo y un paso final las sintetiza. Ideal para borradores competitivos o investigación multi-perspectiva.",
            "En bucle: un paso se ejecuta repetidamente hasta cumplir una condición de calidad (ej: un prompt revisor juzga la salida y pide reescritura hasta aprobar). Usalo con un límite máximo de iteraciones.",
            "Combiná patrones según sea necesario — una cadena secuencial puede tener un paso ramificado adentro.",
          ],
        },
      },
      {
        heading: { en: "Common prompt chaining mistakes", es: "Errores comunes en el encadenamiento de prompts" },
        bullets: {
          en: [
            "Passing unvalidated output: if Step A can produce malformed JSON or incomplete data, Step B inherits that problem. Validate or clean outputs between steps.",
            "Accumulating too much context: pasting entire prior outputs into every step bloats the context. Pass only what the next step actually needs.",
            "No stopping condition on loops: always define what 'done' looks like and cap iterations. Without it, a looping chain can run indefinitely.",
            "Skipping intermediate verification: for high-stakes chains, add a quick review step between heavy transforms instead of discovering errors at the final step.",
          ],
          es: [
            "Pasar salidas sin validar: si el Paso A puede producir JSON malformado o datos incompletos, el Paso B hereda ese problema. Validá o limpiá las salidas entre pasos.",
            "Acumular demasiado contexto: pegar salidas previas completas en cada paso infla el contexto. Pasá solo lo que el siguiente paso realmente necesita.",
            "Sin condición de parada en bucles: siempre definí cómo se ve el 'listo' y poné un límite de iteraciones. Sin eso, una cadena en bucle puede ejecutarse indefinidamente.",
            "Saltar la verificación intermedia: en cadenas críticas, agregá un paso de revisión rápida entre transformaciones pesadas en lugar de descubrir errores al final.",
          ],
        },
      },
    ],
    templates: [
      {
        title: { en: "Data extraction pipeline: extract → validate → format", es: "Pipeline de extracción de datos: extraer → validar → formatear" },
        purpose: "data",
        target: "gpt",
        prompt: {
          en: `STEP 1 — EXTRACT
From the raw text below, extract all invoice line items.
Return ONLY JSON: {"items": [{"description": "string", "quantity": number, "unit_price": number}]}
If a field is missing, use null. Do not invent values.

Raw text:
"""[paste invoice text here]"""

---
STEP 2 — VALIDATE (send Step 1 output here)
Review the JSON below for correctness.
- Flag any items where quantity or unit_price is null.
- Flag any descriptions that look like headers or totals, not line items.
- Return: {"valid_items": [...], "flagged": [...], "issues": ["string"]}

JSON from Step 1:
"""[paste Step 1 output here]"""

---
STEP 3 — FORMAT (send Step 2 valid_items here)
Convert the validated items below into a Markdown table with columns: Description | Quantity | Unit Price | Line Total.
Calculate Line Total = quantity × unit_price. If either is null, show "—".
Sort by Line Total descending.

valid_items:
"""[paste valid_items from Step 2 here]"""`,
          es: `PASO 1 — EXTRAER
Del texto sin procesar a continuación, extraé todos los ítems de factura.
Devolvé SOLO JSON: {"items": [{"description": "string", "quantity": número, "unit_price": número}]}
Si falta un campo, usá null. No inventes valores.

Texto sin procesar:
"""[pegá el texto de la factura aquí]"""

---
PASO 2 — VALIDAR (enviá la salida del Paso 1 aquí)
Revisá el JSON de abajo para verificar su corrección.
- Marcá los ítems donde quantity o unit_price sea null.
- Marcá las descripciones que parezcan encabezados o totales, no ítems de línea.
- Devolvé: {"valid_items": [...], "flagged": [...], "issues": ["string"]}

JSON del Paso 1:
"""[pegá la salida del Paso 1 aquí]"""

---
PASO 3 — FORMATEAR (enviá los valid_items del Paso 2 aquí)
Convertí los ítems validados de abajo en una tabla Markdown con columnas: Descripción | Cantidad | Precio unitario | Total de línea.
Calculá Total de línea = quantity × unit_price. Si alguno es null, mostrá "—".
Ordená por Total de línea de mayor a menor.

valid_items:
"""[pegá los valid_items del Paso 2 aquí]"""`,
        },
      },
      {
        title: { en: "Research-to-report chain: gather → outline → draft", es: "Cadena investigación-a-informe: recopilar → esquema → borrador" },
        purpose: "text",
        target: "claude",
        prompt: {
          en: `STEP 1 — GATHER KEY POINTS
Topic: [your topic]
Audience: [who will read this]

List the 5–7 most important things someone in this audience needs to understand about this topic.
For each point, note: (a) why it matters to this audience, (b) a concrete example or evidence.
Format: numbered list. Be direct — no filler sentences.

---
STEP 2 — OUTLINE (send Step 1 output here)
Using the key points below, create a structured outline for a [blog post / report / briefing] of approximately [word count] words.
Each section must map to one or more key points.
Format: ## Section title → bullet list of what each paragraph will cover.

Key points from Step 1:
"""[paste Step 1 output here]"""

---
STEP 3 — DRAFT (send Step 2 outline here)
Write the full [blog post / report / briefing] following the outline below.
Tone: [professional / conversational / technical]
Constraints:
- Stay within [word count] words (±10%).
- Do not add sections not in the outline.
- Do not use filler phrases like "In today's world" or "It's important to note".
- End with a clear takeaway or next step.

Outline:
"""[paste Step 2 outline here]"""`,
          es: `PASO 1 — RECOPILAR PUNTOS CLAVE
Tema: [tu tema]
Audiencia: [quién lo leerá]

Listá los 5–7 puntos más importantes que alguien en esta audiencia necesita entender sobre este tema.
Para cada punto, anotá: (a) por qué importa a esta audiencia, (b) un ejemplo concreto o evidencia.
Formato: lista numerada. Sé directo — sin frases de relleno.

---
PASO 2 — ESQUEMA (enviá la salida del Paso 1 aquí)
Usando los puntos clave de abajo, creá un esquema estructurado para un/una [post de blog / informe / resumen ejecutivo] de aproximadamente [cantidad de palabras] palabras.
Cada sección debe mapear a uno o más puntos clave.
Formato: ## Título de sección → lista de bullets de qué cubrirá cada párrafo.

Puntos clave del Paso 1:
"""[pegá la salida del Paso 1 aquí]"""

---
PASO 3 — BORRADOR (enviá el esquema del Paso 2 aquí)
Escribí el/la [post de blog / informe / resumen ejecutivo] completo siguiendo el esquema de abajo.
Tono: [profesional / conversacional / técnico]
Restricciones:
- Mantenete dentro de [cantidad de palabras] palabras (±10%).
- No agregues secciones que no estén en el esquema.
- No uses frases de relleno como "En el mundo actual" o "Es importante destacar".
- Terminá con una conclusión clara o próximo paso.

Esquema:
"""[pegá el esquema del Paso 2 aquí]"""`,
        },
      },
    ],
    faq: [
      {
        q: { en: "How many steps is too many in a prompt chain?", es: "¿Cuántos pasos son demasiados en una cadena de prompts?" },
        a: {
          en: "There is no fixed maximum, but each step adds latency, cost, and a new failure point. In practice, most tasks resolve well with 2–4 steps. If your chain exceeds 6 steps, reconsider whether some steps can be merged or whether the task should be split into independent sub-tasks with separate chains.",
          es: "No hay un máximo fijo, pero cada paso agrega latencia, costo y un nuevo punto de falla. En la práctica, la mayoría de las tareas se resuelven bien con 2–4 pasos. Si tu cadena supera los 6 pasos, reconsiderá si algunos pueden fusionarse o si la tarea debería dividirse en subtareas independientes con cadenas separadas.",
        },
      },
      {
        q: { en: "Do I need to send all previous outputs to every subsequent step?", es: "¿Necesito enviar todas las salidas previas a cada paso siguiente?" },
        a: {
          en: "No — and you usually should not. Send only what the next step needs to do its job. Passing the full history of every prior step inflates the context, increases cost, and can confuse the model by giving it irrelevant prior reasoning to 'consider'. Extract and pass the relevant subset.",
          es: "No — y generalmente no deberías. Enviá solo lo que el siguiente paso necesita para hacer su trabajo. Pasar el historial completo de todos los pasos anteriores infla el contexto, aumenta el costo y puede confundir al modelo dándole razonamiento previo irrelevante para 'considerar'. Extraé y pasá solo el subconjunto relevante.",
        },
      },
    ],
  },
  {
    slug: "ai-writing-prompts",
    title: {
      en: "AI writing prompts for blogs, emails, and creative content",
      es: "Prompts de redacción con IA para blogs, emails y contenido creativo",
    },
    description: {
      en: "Writing prompts that produce structured, on-brand content — with tone, audience, format, and length controls built in. No generic filler.",
      es: "Prompts de escritura que generan contenido estructurado y alineado con tu voz — con controles de tono, audiencia, formato y extensión. Sin relleno genérico.",
    },
    sections: [
      {
        heading: { en: "What a writing prompt needs beyond the topic", es: "Qué necesita un prompt de escritura más allá del tema" },
        bullets: {
          en: [
            "Audience: who is reading, what they already know, and what they care about. 'Write about productivity' gives you a generic output; 'write for senior engineers who are skeptical of new tools' gives you something useful.",
            "Tone and register: professional, conversational, direct, empathetic. Mixing 'be authoritative' with 'be approachable' without examples leads to inconsistency.",
            "Format: prose, bullet list, numbered steps, Q&A, table. Specify it explicitly or the model picks whatever is convenient.",
            "Length or scope: a target word count (or range) and the number of key ideas to cover. Without this, AI writing tends to pad.",
            "What to avoid: generic openers ('In today's digital world'), corporate buzzwords, unsupported claims, passive voice when you want active.",
          ],
          es: [
            "Audiencia: quién lee, qué ya saben y qué les importa. 'Escribí sobre productividad' da un resultado genérico; 'escribí para ingenieros senior que son escépticos de nuevas herramientas' da algo útil.",
            "Tono y registro: profesional, conversacional, directo, empático. Mezclar 'sé autoridad' con 'sé cercano' sin ejemplos genera inconsistencia.",
            "Formato: prosa, lista de bullets, pasos numerados, preguntas y respuestas, tabla. Especificalo explícitamente o el modelo elige lo que le sea conveniente.",
            "Extensión o alcance: un conteo de palabras objetivo (o rango) y la cantidad de ideas clave a cubrir. Sin esto, la escritura con IA tiende al relleno.",
            "Qué evitar: aperturas genéricas ('En el mundo digital actual'), palabras de jerga corporativa, afirmaciones sin respaldo, voz pasiva cuando querés activa.",
          ],
        },
      },
      {
        heading: { en: "Tone and voice control", es: "Control de tono y voz" },
        bullets: {
          en: [
            "Give examples of the tone, not just labels. 'Tone: like a knowledgeable friend, not a textbook' is more useful than 'tone: informal'.",
            "Specify what the tone is NOT: 'avoid corporate jargon', 'no rhetorical questions', 'don't start sentences with I'.",
            "If you have existing content that matches the voice you want, paste 2–3 sentences and ask the model to match that style.",
            "For brand voice consistency across multiple pieces: describe 3–5 defining characteristics and paste them at the top of every writing prompt.",
          ],
          es: [
            "Dá ejemplos del tono, no solo etiquetas. 'Tono: como un amigo conocedor, no un libro de texto' es más útil que 'tono: informal'.",
            "Especificá lo que el tono NO es: 'evitar jerga corporativa', 'sin preguntas retóricas', 'no empezar oraciones con Yo'.",
            "Si tenés contenido existente que tiene la voz que buscás, pegá 2–3 oraciones y pedí al modelo que iguale ese estilo.",
            "Para consistencia de voz de marca en múltiples piezas: describí 3–5 características definitorias y pegálas al inicio de cada prompt de escritura.",
          ],
        },
      },
      {
        heading: { en: "Common writing prompt mistakes", es: "Errores comunes en prompts de escritura" },
        bullets: {
          en: [
            "Topic without angle: 'write about remote work' gives the model nothing to stand on. Add your specific angle: 'write about why async-first remote teams outperform real-time-first ones for creative work'.",
            "No format constraint: without one, the model defaults to whatever structure feels natural, which changes between runs.",
            "Conflicting length signals: 'be concise but cover everything' is a contradiction. Pick one or set a word count.",
            "Asking for 'creative' without saying what creative means to you: it could mean unexpected analogies, narrative structure, humor, or unusual formatting — specify.",
          ],
          es: [
            "Tema sin ángulo: 'escribí sobre trabajo remoto' no le da nada al modelo en qué apoyarse. Agregá tu ángulo específico: 'escribí sobre por qué los equipos remotos async-first superan a los real-time-first para trabajo creativo'.",
            "Sin restricción de formato: sin ella, el modelo elige la estructura que siente natural, que cambia entre ejecuciones.",
            "Señales de longitud contradictorias: 'sé conciso pero cubrí todo' es una contradicción. Elegí uno o poné un conteo de palabras.",
            "Pedir 'creatividad' sin decir qué significa para vos: puede ser analogías inesperadas, estructura narrativa, humor o formato inusual — especificalo.",
          ],
        },
      },
    ],
    templates: [
      {
        title: { en: "Blog post outline with audience and tone", es: "Esquema de post de blog con audiencia y tono" },
        purpose: "marketing",
        target: "gpt",
        prompt: {
          en: `Create a detailed outline for a blog post on the following topic.

Topic: [your topic]
Target audience: [describe the reader — role, experience level, main concern]
Angle / thesis: [the specific position or insight this post will argue]
Tone: [e.g. direct and opinionated, not neutral / conversational, like a practitioner talking to peers]
Target length: [word count] words
Format for each section: ## Heading → 3–5 bullet points describing what each paragraph will say

Requirements:
- Start with a hook that states the problem or tension directly (no "In today's world" openers).
- Each section must connect to the thesis, not just be loosely related to the topic.
- End with a clear takeaway or call to action — one sentence max.
- Do not include a generic introduction or conclusion — make every section earn its place.

Do not avoid: [word], [buzzword], [phrase to exclude]`,
          es: `Creá un esquema detallado para un post de blog sobre el siguiente tema.

Tema: [tu tema]
Audiencia objetivo: [describí al lector — rol, nivel de experiencia, preocupación principal]
Ángulo / tesis: [la posición o perspectiva específica que argumentará este post]
Tono: [ej. directo y con opinión, no neutral / conversacional, como un practicante hablando con pares]
Extensión objetivo: [cantidad de palabras] palabras
Formato para cada sección: ## Título → 3–5 bullets describiendo qué dirá cada párrafo

Requisitos:
- Empezá con un gancho que exprese el problema o tensión directamente (sin aperturas de "En el mundo actual").
- Cada sección debe conectar con la tesis, no solo estar vagamente relacionada con el tema.
- Terminá con una conclusión clara o llamado a la acción — una oración máximo.
- No incluyas introducción o conclusión genérica — hacé que cada sección se justifique.

Evitar: [palabra], [buzzword], [frase a excluir]`,
        },
      },
      {
        title: { en: "Professional email from bullet notes", es: "Email profesional a partir de notas en bullets" },
        purpose: "text",
        target: "claude",
        prompt: {
          en: `Write a professional email from the notes below.

Sender context: [your role and relationship to the recipient]
Recipient: [their role and what they care about]
Goal of this email: [what you need them to do or understand after reading]
Tone: [e.g. collegial and direct / formal and diplomatic / warm but concise]

Notes (unordered — use your judgment on what to include):
- [note 1]
- [note 2]
- [note 3]

Constraints:
- Subject line: one sentence, action-oriented, under 60 characters.
- Body: no filler phrases like "I hope this email finds you well" or "Please don't hesitate to reach out."
- Length: 3–5 short paragraphs maximum.
- End with a clear single ask or next step, not a list of options.
- Match the tone to the recipient's seniority level.`,
          es: `Escribí un email profesional a partir de las notas de abajo.

Contexto del remitente: [tu rol y relación con el destinatario]
Destinatario: [su rol y qué le importa]
Objetivo del email: [qué necesitás que haga o entienda después de leerlo]
Tono: [ej. colegial y directo / formal y diplomático / cálido pero conciso]

Notas (sin orden — usá tu criterio sobre qué incluir):
- [nota 1]
- [nota 2]
- [nota 3]

Restricciones:
- Asunto: una oración, orientado a la acción, menos de 60 caracteres.
- Cuerpo: sin frases de relleno como "Espero que estés bien" o "No dudes en contactarme".
- Extensión: máximo 3–5 párrafos cortos.
- Terminá con una única solicitud clara o próximo paso, no una lista de opciones.
- Ajustá el tono al nivel de seniority del destinatario.`,
        },
      },
    ],
    faq: [
      {
        q: { en: "How do I stop AI writing from sounding generic?", es: "¿Cómo evito que la escritura de IA suene genérica?" },
        a: {
          en: "Generic output usually comes from under-specified prompts. Add a specific angle (not just a topic), a named audience with a concrete concern, explicit tone examples, and a list of things to avoid. The more constraints you give, the less the model fills gaps with defaults. Pasting 2–3 sentences of your own writing and asking it to match the style also helps significantly.",
          es: "Las salidas genéricas suelen venir de prompts poco especificados. Agregá un ángulo específico (no solo un tema), una audiencia nombrada con una preocupación concreta, ejemplos de tono explícitos y una lista de cosas a evitar. Cuantas más restricciones des, menos el modelo llenará vacíos con valores por defecto. Pegar 2–3 oraciones de tu propia escritura y pedirle que iguale el estilo también ayuda significativamente.",
        },
      },
      {
        q: { en: "Can I get consistent voice across multiple pieces?", es: "¿Puedo lograr voz consistente en múltiples piezas?" },
        a: {
          en: "Yes, with a reusable voice block. Define 3–5 characteristics of your brand voice (e.g. 'direct without being blunt', 'uses concrete examples before abstract claims', 'avoids exclamation marks and buzzwords') and paste them at the start of every writing prompt. Keep this block in a text file and update it as you refine your voice.",
          es: "Sí, con un bloque de voz reutilizable. Definí 3–5 características de tu voz de marca (ej. 'directo sin ser brusco', 'usa ejemplos concretos antes de afirmaciones abstractas', 'evita signos de exclamación y buzzwords') y pegálas al inicio de cada prompt de escritura. Guardá este bloque en un archivo de texto y actualizalo a medida que refinás tu voz.",
        },
      },
    ],
  },
  {
    slug: "multimodal-prompts",
    title: {
      en: "How to write prompts for AI with image and file inputs (multimodal)",
      es: "Cómo escribir prompts para IA con imágenes y archivos (multimodal)",
    },
    description: {
      en: "Multimodal prompts combine text instructions with images, PDFs, or screenshots. Learn how to direct AI attention to what matters and extract structured output reliably.",
      es: "Los prompts multimodales combinan instrucciones de texto con imágenes, PDFs o capturas de pantalla. Aprendé a dirigir la atención de la IA a lo que importa y extraer salida estructurada de forma confiable.",
    },
    sections: [
      {
        heading: { en: "What multimodal AI models can and cannot do", es: "Qué pueden y no pueden hacer los modelos de IA multimodal" },
        bullets: {
          en: [
            "They can: describe image content, read text in images (OCR-like), extract data from tables and forms, analyze charts and diagrams, compare multiple images, and answer questions grounded in what they see.",
            "They cannot: reliably read very small text in low-resolution images, count objects precisely in dense scenes, or guarantee pixel-level accuracy on complex diagrams.",
            "Quality of output depends heavily on image resolution and clarity. Blurry or low-contrast images produce vague descriptions.",
            "For PDFs: some APIs accept PDFs directly; others require converting pages to images first. Check your model's documentation.",
          ],
          es: [
            "Pueden: describir el contenido de imágenes, leer texto en imágenes (tipo OCR), extraer datos de tablas y formularios, analizar gráficos y diagramas, comparar múltiples imágenes y responder preguntas basadas en lo que ven.",
            "No pueden: leer de forma confiable texto muy pequeño en imágenes de baja resolución, contar objetos con precisión en escenas densas, ni garantizar precisión a nivel de píxel en diagramas complejos.",
            "La calidad de la salida depende mucho de la resolución y claridad de la imagen. Las imágenes borrosas o de bajo contraste producen descripciones vagas.",
            "Para PDFs: algunas APIs los aceptan directamente; otras requieren convertir páginas a imágenes primero. Revisá la documentación de tu modelo.",
          ],
        },
      },
      {
        heading: { en: "How to direct AI attention in images", es: "Cómo dirigir la atención de la IA en imágenes" },
        bullets: {
          en: [
            "Name what you want analyzed: 'Focus on the bar chart in the top-right corner' is clearer than 'analyze this image'.",
            "Describe what the image contains if the model might not recognize the context: 'This is a screenshot of a warehouse management dashboard showing inventory levels.'",
            "For documents and forms, specify which fields matter: 'Extract only the vendor name, invoice number, date, and total amount. Ignore line items.'",
            "Use spatial anchors: 'the table in the second column', 'the highlighted row', 'the legend at the bottom'.",
            "If the image has multiple elements, tell the model what to prioritize first and what to skip.",
          ],
          es: [
            "Nombrá lo que querés analizar: 'Enfocate en el gráfico de barras en la esquina superior derecha' es más claro que 'analizá esta imagen'.",
            "Describí qué contiene la imagen si el modelo podría no reconocer el contexto: 'Esta es una captura de pantalla de un dashboard de gestión de almacenes mostrando niveles de inventario.'",
            "Para documentos y formularios, especificá qué campos importan: 'Extraé solo el nombre del proveedor, número de factura, fecha y monto total. Ignorá los ítems de línea.'",
            "Usá anclajes espaciales: 'la tabla en la segunda columna', 'la fila resaltada', 'la leyenda en la parte inferior'.",
            "Si la imagen tiene múltiples elementos, decile al modelo qué priorizar primero y qué omitir.",
          ],
        },
      },
      {
        heading: { en: "Common multimodal prompt mistakes", es: "Errores comunes en prompts multimodales" },
        bullets: {
          en: [
            "No image description: asking 'what does this show?' without context forces the model to guess the purpose. Tell it what kind of document or image you're sending.",
            "Expecting precision on messy inputs: a photo of a handwritten note taken at an angle in dim lighting will produce uncertain results — scan or crop before prompting.",
            "No output format specified: without one, the model might describe the image in prose when you needed JSON, or give you a table when you needed a summary.",
            "Assuming it reads all text: models process images as visual patterns. Very small text, rotated text, or text on complex backgrounds may be missed or misread.",
          ],
          es: [
            "Sin descripción de la imagen: preguntar '¿qué muestra esto?' sin contexto fuerza al modelo a adivinar el propósito. Decile qué tipo de documento o imagen estás enviando.",
            "Esperar precisión en entradas desordenadas: una foto de una nota manuscrita tomada en ángulo con poca luz producirá resultados inciertos — escaneá o recortá antes de hacer el prompt.",
            "Sin formato de salida especificado: sin uno, el modelo podría describir la imagen en prosa cuando necesitabas JSON, o darte una tabla cuando necesitabas un resumen.",
            "Asumir que lee todo el texto: los modelos procesan imágenes como patrones visuales. Texto muy pequeño, rotado o sobre fondos complejos puede ser omitido o mal leído.",
          ],
        },
      },
    ],
    templates: [
      {
        title: { en: "Visual data extraction from an image or screenshot", es: "Extracción de datos visuales de una imagen o captura de pantalla" },
        purpose: "data",
        target: "gpt",
        prompt: {
          en: `I'm sending you [a screenshot of a dashboard / a photo of a form / a chart image].

Context: [describe what the image contains and where it comes from — e.g. "This is a weekly sales report screenshot from our internal reporting tool."]

Extract the following fields:
- [Field 1]: [what it looks like or where it appears]
- [Field 2]: [what it looks like or where it appears]
- [Field 3]: [what it looks like or where it appears]

Return ONLY JSON:
{
  "field_1": "value or null",
  "field_2": "value or null",
  "field_3": "value or null",
  "extraction_notes": "any uncertainty or ambiguity noted"
}

Rules:
- Use null for any field you cannot read clearly.
- Do not guess or infer values not visible in the image.
- Add a note in extraction_notes if any field was difficult to read.`,
          es: `Te envío [una captura de pantalla de un dashboard / una foto de un formulario / una imagen de un gráfico].

Contexto: [describí qué contiene la imagen y de dónde viene — ej. "Esta es una captura de pantalla del reporte semanal de ventas de nuestra herramienta interna de reporting."]

Extraé los siguientes campos:
- [Campo 1]: [cómo se ve o dónde aparece]
- [Campo 2]: [cómo se ve o dónde aparece]
- [Campo 3]: [cómo se ve o dónde aparece]

Devolvé SOLO JSON:
{
  "campo_1": "valor o null",
  "campo_2": "valor o null",
  "campo_3": "valor o null",
  "notas_extraccion": "cualquier incertidumbre o ambigüedad detectada"
}

Reglas:
- Usá null para cualquier campo que no puedas leer claramente.
- No adivines ni infieras valores no visibles en la imagen.
- Agregá una nota en notas_extraccion si algún campo fue difícil de leer.`,
        },
      },
      {
        title: { en: "Document Q&A with source citation", es: "Preguntas y respuestas sobre un documento con cita de fuente" },
        purpose: "text",
        target: "claude",
        prompt: {
          en: `I'm sending you [a PDF / a set of document images / a scanned contract].

Context: [briefly describe what the document is — e.g. "This is a vendor contract for software licensing, approximately 12 pages."]

Answer the following questions based ONLY on the content visible in the document:
1. [Your question 1]
2. [Your question 2]
3. [Your question 3]

For each answer:
- Quote the exact sentence or section that supports your answer.
- If the document does not contain the answer, say "Not found in the document" — do not infer.
- If the answer is ambiguous, explain why and quote the relevant passage.

Format:
**Q1:** [restate the question]
**Answer:** [your answer]
**Source:** "[exact quote from document]" (Page X / Section Y if identifiable)`,
          es: `Te envío [un PDF / un conjunto de imágenes de un documento / un contrato escaneado].

Contexto: [describí brevemente qué es el documento — ej. "Este es un contrato de proveedor para licenciamiento de software, de aproximadamente 12 páginas."]

Respondé las siguientes preguntas basándote SOLO en el contenido visible en el documento:
1. [Tu pregunta 1]
2. [Tu pregunta 2]
3. [Tu pregunta 3]

Para cada respuesta:
- Citá la oración o sección exacta que respalda tu respuesta.
- Si el documento no contiene la respuesta, decí "No encontrado en el documento" — no inferras.
- Si la respuesta es ambigua, explicá por qué y citá el pasaje relevante.

Formato:
**P1:** [replanteá la pregunta]
**Respuesta:** [tu respuesta]
**Fuente:** "[cita textual del documento]" (Página X / Sección Y si es identificable)`,
        },
      },
    ],
    faq: [
      {
        q: { en: "Which AI models support image inputs?", es: "¿Qué modelos de IA soportan entradas de imagen?" },
        a: {
          en: "As of mid-2026, image inputs are supported by GPT-4o and later OpenAI models, Claude 3 and later Anthropic models, Gemini 1.5 and later Google models, and Grok 2 Vision. DeepSeek and Kimi also have multimodal variants. Always verify image support in the model's current documentation, as capabilities vary by API tier and may change.",
          es: "A mediados de 2026, las entradas de imagen son soportadas por GPT-4o y modelos OpenAI posteriores, Claude 3 y modelos Anthropic posteriores, Gemini 1.5 y modelos Google posteriores, y Grok 2 Vision. DeepSeek y Kimi también tienen variantes multimodales. Siempre verificá el soporte de imágenes en la documentación actual del modelo, ya que las capacidades varían por nivel de API y pueden cambiar.",
        },
      },
      {
        q: { en: "How do I extract a table from a PDF using AI?", es: "¿Cómo extraigo una tabla de un PDF usando IA?" },
        a: {
          en: "The most reliable approach: convert the PDF page containing the table to a high-resolution image (300 DPI or higher), then send it with a prompt that specifies the table location, the columns you need, and the output format (JSON or Markdown table). Ask the model to flag cells it cannot read clearly. For native-digital PDFs where text is selectable, copy-paste the table text directly into your prompt instead — text extraction is more reliable than visual OCR.",
          es: "El enfoque más confiable: convertí la página del PDF que contiene la tabla a una imagen de alta resolución (300 DPI o superior), luego enviala con un prompt que especifique la ubicación de la tabla, las columnas que necesitás y el formato de salida (JSON o tabla Markdown). Pedí al modelo que marque las celdas que no puede leer claramente. Para PDFs nativos digitales donde el texto es seleccionable, copiá y pegá el texto de la tabla directamente en tu prompt — la extracción de texto es más confiable que el OCR visual.",
        },
      },
    ],
  },
  {
    slug: "zero-shot-prompting",
    title: {
      en: "Zero-shot prompting: how to get reliable results without providing examples",
      es: "Zero-shot prompting: cómo obtener resultados confiables sin dar ejemplos",
    },
    description: {
      en: "Zero-shot prompting asks the model to solve a task from instructions alone — no examples included. Learn when it works, when to add examples, and the constraints that make zero-shot reliable.",
      es: "El zero-shot prompting le pide al modelo que resuelva una tarea solo con instrucciones — sin ejemplos incluidos. Aprendé cuándo funciona, cuándo agregar ejemplos y las restricciones que lo hacen confiable.",
    },
    sections: [
      {
        heading: { en: "What zero-shot prompting is and when it works", es: "Qué es el zero-shot prompting y cuándo funciona" },
        bullets: {
          en: [
            "Zero-shot means no examples in the prompt — the model uses only the instruction and its training knowledge to produce the output.",
            "It works well for tasks the model has seen many times in training: summarization, translation, classification with clear categories, simple rewrites.",
            "It also works when you can fully specify the output in words: 'a three-column table with columns X, Y, Z' is often enough without a concrete example.",
            "Zero-shot fails when the output pattern is unusual, when format precision is critical, or when the task involves a niche domain the model is unlikely to have seen often.",
            "The practical rule: try zero-shot first. Add examples only when you get inconsistent results across runs.",
          ],
          es: [
            "Zero-shot significa sin ejemplos en el prompt — el modelo usa solo la instrucción y su conocimiento de entrenamiento para producir el output.",
            "Funciona bien para tareas que el modelo vio muchas veces en entrenamiento: resumen, traducción, clasificación con categorías claras, rewrites simples.",
            "También funciona cuando podés especificar completamente el output con palabras: 'una tabla de tres columnas con columnas X, Y, Z' suele ser suficiente sin un ejemplo concreto.",
            "El zero-shot falla cuando el patrón de output es inusual, cuando la precisión de formato es crítica, o cuando la tarea involucra un dominio nicho que el modelo probablemente no vio con frecuencia.",
            "La regla práctica: probá zero-shot primero. Agregá ejemplos solo cuando obtengas resultados inconsistentes entre ejecuciones.",
          ],
        },
      },
      {
        heading: { en: "Why zero-shot fails and how to fix it without adding examples", es: "Por qué falla el zero-shot y cómo arreglarlo sin agregar ejemplos" },
        bullets: {
          en: [
            "Format ambiguity: 'list the main points' can mean bullets, numbered steps, or prose. Add 'as a numbered list, one item per line' to lock it.",
            "No output length constraint: without one, the model calibrates to what it thinks is appropriate — which varies between runs. Add a hard limit.",
            "Missing decision rules for edge cases: if the input has missing data, ambiguous content, or out-of-scope requests, the model will guess. State what to do explicitly.",
            "Vague task framing: 'analyze this text' is under-specified. Replace vague verbs with specific ones: extract, classify, score, rank, summarize to N sentences.",
            "If zero-shot still produces inconsistent results after adding format, length, and edge-case constraints — that's the signal to switch to few-shot with 2–3 targeted examples.",
          ],
          es: [
            "Ambigüedad de formato: 'listá los puntos principales' puede significar bullets, pasos numerados o prosa. Agregá 'como lista numerada, un ítem por línea' para fijarlo.",
            "Sin restricción de longitud de output: sin una, el modelo calibra a lo que cree apropiado — que varía entre ejecuciones. Agregá un límite duro.",
            "Sin reglas de decisión para casos límite: si el input tiene datos faltantes, contenido ambiguo o pedidos fuera de scope, el modelo adivinará. Especificá qué hacer explícitamente.",
            "Formulación vaga de la tarea: 'analizá este texto' está poco especificado. Reemplazá verbos vagos con específicos: extraé, clasificá, puntuá, rankeá, resumí a N oraciones.",
            "Si el zero-shot sigue produciendo resultados inconsistentes después de agregar restricciones de formato, longitud y casos límite — esa es la señal para cambiar a few-shot con 2–3 ejemplos dirigidos.",
          ],
        },
      },
    ],
    templates: [
      {
        title: { en: "Zero-shot task with format and constraints", es: "Tarea zero-shot con formato y restricciones" },
        purpose: "text",
        target: "gpt",
        prompt: {
          en: `[Action verb]: [what you want — be specific]

Input:
"""[paste your content here]"""

Output format:
- [exact structure: numbered list / table with columns X, Y / 3-sentence paragraph]
- Length: [hard limit, e.g. "3 bullets max" or "<= 100 words"]

Rules:
- [constraint 1, e.g. "preserve all numbers and proper nouns"]
- [constraint 2, e.g. "do not add information not present in the input"]
- If the input is missing [edge case], [what to do: "skip it" / "flag it" / "write N/A"]

Return ONLY the output. No preamble, no commentary.`,
          es: `[Verbo de acción]: [qué querés — sé específico]

Input:
"""[pegá tu contenido acá]"""

Formato de salida:
- [estructura exacta: lista numerada / tabla con columnas X, Y / párrafo de 3 oraciones]
- Extensión: [límite duro, ej. "máx 3 bullets" o "<= 100 palabras"]

Reglas:
- [restricción 1, ej. "preservá todos los números y nombres propios"]
- [restricción 2, ej. "no agregues información que no esté en el input"]
- Si el input no tiene [caso límite], [qué hacer: "saltalo" / "marcalo" / "escribí N/A"]

Devolvé SOLO el output. Sin preámbulo, sin comentarios.`,
        },
      },
      {
        title: { en: "Zero-shot classification with decision rules", es: "Clasificación zero-shot con reglas de decisión" },
        purpose: "data",
        target: "claude",
        prompt: {
          en: `Classify each item below into one of the categories: [Category A / Category B / Category C].

Classification rules:
- Category A: [define exactly what belongs here]
- Category B: [define exactly what belongs here]
- Category C: [define exactly what belongs here]
- If an item could belong to more than one category, assign it to [priority category] and add a note.
- If an item clearly fits no category, label it "Uncategorized" and note why.

Return format — one row per item, exactly:
[Item] | [Category] | [Note or "—"]

Items to classify:
- [item 1]
- [item 2]
- [item 3]

No explanation outside the table.`,
          es: `Clasificá cada ítem de abajo en una de las categorías: [Categoría A / Categoría B / Categoría C].

Reglas de clasificación:
- Categoría A: [definí exactamente qué pertenece acá]
- Categoría B: [definí exactamente qué pertenece acá]
- Categoría C: [definí exactamente qué pertenece acá]
- Si un ítem podría pertenecer a más de una categoría, asignalo a [categoría prioritaria] y agregá una nota.
- Si un ítem claramente no encaja en ninguna categoría, etiquetalo como "Sin categoría" y explicá por qué.

Formato de respuesta — una fila por ítem, exactamente:
[Ítem] | [Categoría] | [Nota o "—"]

Ítems a clasificar:
- [ítem 1]
- [ítem 2]
- [ítem 3]

Sin explicación fuera de la tabla.`,
        },
      },
    ],
    faq: [
      {
        q: { en: "What is the difference between zero-shot and few-shot prompting?", es: "¿Cuál es la diferencia entre zero-shot y few-shot prompting?" },
        a: {
          en: "Zero-shot includes only the instruction; the model produces output without seeing any examples. Few-shot includes 2–5 input/output examples before the real task, showing the model exactly what you want. Zero-shot is faster to write and cheaper in tokens; few-shot produces more consistent format and style. Use zero-shot for well-understood tasks, few-shot when the output pattern is unusual or you're getting inconsistent results.",
          es: "El zero-shot incluye solo la instrucción; el modelo produce output sin ver ejemplos. El few-shot incluye 2–5 ejemplos de input/output antes de la tarea real, mostrándole al modelo exactamente qué querés. El zero-shot es más rápido de escribir y más barato en tokens; el few-shot produce formato y estilo más consistentes. Usá zero-shot para tareas bien comprendidas, few-shot cuando el patrón de output es inusual o estás obteniendo resultados inconsistentes.",
        },
      },
      {
        q: { en: "Can zero-shot prompting handle complex tasks?", es: "¿El zero-shot prompting puede manejar tareas complejas?" },
        a: {
          en: "Yes, for tasks where complexity is in the logic rather than the output format — like multi-step analysis, decision trees, or long-form reasoning. The key is breaking the task into explicit steps inside the prompt ('First: X. Then: Y. Finally: Z.') rather than asking for everything at once. For complex formatting or style, few-shot examples work better than trying to describe the pattern in words.",
          es: "Sí, para tareas donde la complejidad está en la lógica y no en el formato de salida — como análisis multi-paso, árboles de decisión o razonamiento de forma larga. La clave es descomponer la tarea en pasos explícitos dentro del prompt ('Primero: X. Luego: Y. Finalmente: Z.') en vez de pedir todo de una vez. Para formateo o estilo complejo, los ejemplos few-shot funcionan mejor que intentar describir el patrón con palabras.",
        },
      },
    ],
  },
  {
    slug: "gpt-prompt-guide",
    title: {
      en: "Prompts for GPT: how to get structured, reliable output from ChatGPT",
      es: "Prompts para GPT: cómo obtener salida estructurada y confiable de ChatGPT",
    },
    description: {
      en: "How to write prompts that get consistent, well-structured output from GPT models — using format templates, output constraints, and instruction placement to reduce variation.",
      es: "Cómo escribir prompts que producen salida consistente y bien estructurada con modelos GPT — usando plantillas de formato, restricciones de salida y posicionamiento de instrucciones para reducir la variación.",
    },
    sections: [
      {
        heading: { en: "What makes GPT respond reliably", es: "Qué hace que GPT responda de forma confiable" },
        bullets: {
          en: [
            "GPT models follow clear imperative instructions well: start with an action verb ('Write', 'Extract', 'Classify', 'List') rather than a description of what you want.",
            "They respond to explicit format specifications — showing the exact structure you want (e.g. a labeled template) reduces format variation more than describing it in prose.",
            "GPT tends to add helpful context and preamble unless you constrain it: 'Return ONLY the output — no explanation' removes commentary reliably.",
            "Instruction placement matters: for most tasks, put the main instruction before the content. For long documents, placing the question at the end (after the context) often improves accuracy.",
            "GPT follows numbered rule lists well — if you have multiple constraints, list them as 1, 2, 3 rather than mixing them into a paragraph.",
          ],
          es: [
            "Los modelos GPT siguen bien las instrucciones imperativas claras: empezá con un verbo de acción ('Escribí', 'Extraé', 'Clasificá', 'Listá') en vez de una descripción de qué querés.",
            "Responden a especificaciones de formato explícitas — mostrar la estructura exacta que querés (ej. una plantilla etiquetada) reduce la variación de formato más que describirla en prosa.",
            "GPT tiende a agregar contexto útil y preámbulo salvo que lo restrinjas: 'Devolvé SOLO el output — sin explicación' elimina el comentario de forma confiable.",
            "La posición de las instrucciones importa: para la mayoría de las tareas, poné la instrucción principal antes del contenido. Para documentos largos, colocar la pregunta al final (después del contexto) suele mejorar la precisión.",
            "GPT sigue bien las listas de reglas numeradas — si tenés múltiples restricciones, listalas como 1, 2, 3 en vez de mezclarlas en un párrafo.",
          ],
        },
      },
      {
        heading: { en: "Patterns that consistently work with GPT models", es: "Patrones que funcionan de forma consistente con modelos GPT" },
        bullets: {
          en: [
            "Show a format template: instead of 'provide a summary with key points', write 'Format: Summary: [1 sentence]. Key points: [3 bullets max].' GPT will follow the labels.",
            "Use a constraint block: group all rules under a 'Rules:' or 'Constraints:' header so they're easy to scan and enforce.",
            "Repeat the most important constraint at the end of the prompt — it gets higher weight in GPT's processing and reduces the chance of being overridden by a long context block.",
            "Ask GPT to check its own work before responding: 'Before returning, verify that all fields are present and match the format.' This catches most structural errors.",
            "For open-ended tasks, narrow the scope explicitly: 'Focus on [specific aspect]. Do not cover [out-of-scope area].' Without a scope, GPT defaults to comprehensive coverage.",
          ],
          es: [
            "Mostrá una plantilla de formato: en vez de 'proporcioná un resumen con puntos clave', escribí 'Formato: Resumen: [1 oración]. Puntos clave: [máx 3 bullets].' GPT seguirá las etiquetas.",
            "Usá un bloque de restricciones: agrupá todas las reglas bajo un encabezado 'Reglas:' o 'Restricciones:' para que sean fáciles de ver y aplicar.",
            "Repetí la restricción más importante al final del prompt — tiene mayor peso en el procesamiento de GPT y reduce la posibilidad de ser sobreescrita por un bloque de contexto largo.",
            "Pedile a GPT que revise su propio trabajo antes de responder: 'Antes de devolver, verificá que todos los campos estén presentes y coincidan con el formato.' Esto detecta la mayoría de los errores estructurales.",
            "Para tareas abiertas, limitá el alcance explícitamente: 'Enfocate en [aspecto específico]. No cubras [área fuera de scope].' Sin un scope, GPT por defecto busca cobertura comprehensiva.",
          ],
        },
      },
    ],
    templates: [
      {
        title: { en: "Structured task with a labeled format template", es: "Tarea estructurada con plantilla de formato etiquetado" },
        purpose: "text",
        target: "gpt",
        prompt: {
          en: `[Task — start with an action verb]: [what you need in one sentence]

Context:
[Audience]: [who will read or use this]
[Background]: [minimum context the model needs — 2-3 sentences max]

Output format (use these labels and structure exactly):
Overview: [1 sentence]
Key points:
- [point 1]
- [point 2]
- [point 3]
Recommendation: [1 sentence, direct]
Open questions: [list, or "None"]

Rules:
1. Keep total output under [N] words.
2. Do not add sections not listed above.
3. If a field cannot be filled from the context provided, write "Insufficient information."

Return ONLY the formatted output above.`,
          es: `[Tarea — empezá con un verbo de acción]: [qué necesitás en una oración]

Contexto:
[Audiencia]: [quién leerá o usará esto]
[Antecedentes]: [contexto mínimo que necesita el modelo — máx 2-3 oraciones]

Formato de salida (usá exactamente estas etiquetas y estructura):
Resumen: [1 oración]
Puntos clave:
- [punto 1]
- [punto 2]
- [punto 3]
Recomendación: [1 oración, directa]
Preguntas abiertas: [lista, o "Ninguna"]

Reglas:
1. Mantené el output total en menos de [N] palabras.
2. No agregues secciones que no estén listadas arriba.
3. Si un campo no puede completarse con el contexto provisto, escribí "Información insuficiente."

Devolvé SOLO el output formateado de arriba.`,
        },
      },
      {
        title: { en: "Constrained data extraction", es: "Extracción de datos con restricciones" },
        purpose: "data",
        target: "gpt",
        prompt: {
          en: `Extract the following fields from the text below.

Fields to extract:
- Name: [person's full name, or "Not found"]
- Date: [date in YYYY-MM-DD format, or "Not found"]
- Amount: [number with currency, or "Not found"]
- Action required: [what needs to happen next, 1 sentence, or "Not stated"]

Rules:
1. Use the exact values from the text — do not rephrase or infer.
2. If a field is ambiguous (multiple possible values), list all of them separated by " / ".
3. If a field is missing, write "Not found" — do not guess.
4. Before returning, check that every field has a value (even if "Not found").

Return ONLY the field list above, no additional text.

Text:
"""[paste your text here]"""`,
          es: `Extraé los siguientes campos del texto de abajo.

Campos a extraer:
- Nombre: [nombre completo de la persona, o "No encontrado"]
- Fecha: [fecha en formato YYYY-MM-DD, o "No encontrado"]
- Monto: [número con moneda, o "No encontrado"]
- Acción requerida: [qué debe pasar a continuación, 1 oración, o "No especificado"]

Reglas:
1. Usá los valores exactos del texto — no reformules ni infieras.
2. Si un campo es ambiguo (múltiples valores posibles), listalos todos separados por " / ".
3. Si falta un campo, escribí "No encontrado" — no adivines.
4. Antes de devolver, verificá que cada campo tenga un valor (aunque sea "No encontrado").

Devolvé SOLO la lista de campos de arriba, sin texto adicional.

Texto:
"""[pegá tu texto acá]"""`,
        },
      },
    ],
    faq: [
      {
        q: { en: "Does prompt placement matter for GPT — should instructions go first or last?", es: "¿Importa la posición del prompt en GPT — las instrucciones van primero o al final?" },
        a: {
          en: "For short prompts, it rarely matters. For long prompts where you paste a large document, placing the question or task at the end (after the content) often improves accuracy — GPT pays more attention to context that directly precedes what it needs to generate. The main instruction should still appear first as a brief header, with the full document in the middle and the specific question repeated at the end.",
          es: "Para prompts cortos, rara vez importa. Para prompts largos donde pegás un documento grande, colocar la pregunta o tarea al final (después del contenido) suele mejorar la precisión — GPT presta más atención al contexto que precede directamente lo que necesita generar. La instrucción principal igual debe aparecer primero como un encabezado breve, con el documento completo en el medio y la pregunta específica repetida al final.",
        },
      },
      {
        q: { en: "How is prompting for GPT different from prompting for Claude or Gemini?", es: "¿En qué se diferencia hacer prompts para GPT de hacerlos para Claude o Gemini?" },
        a: {
          en: "GPT tends to follow numbered rule lists and labeled format templates very reliably. Claude responds particularly well to XML tags for separating context from instructions. Gemini benefits from seeing a concrete output template — even a short one — rather than a description of the format. The core principles (clear task, explicit constraints, defined output format) apply to all three; the syntax and emphasis differ slightly per model.",
          es: "GPT tiende a seguir listas de reglas numeradas y plantillas de formato etiquetado de forma muy confiable. Claude responde particularmente bien a XML tags para separar contexto de instrucciones. Gemini se beneficia de ver una plantilla de output concreta — aunque sea corta — en vez de una descripción del formato. Los principios básicos (tarea clara, restricciones explícitas, formato de salida definido) aplican a los tres; la sintaxis y el énfasis difieren ligeramente por modelo.",
        },
      },
    ],
  },
  {
    slug: "brainstorming-prompts",
    title: {
      en: "AI brainstorming prompts: generate and filter ideas without generic filler",
      es: "Prompts de brainstorming con IA: generá y filtrá ideas sin relleno genérico",
    },
    description: {
      en: "How to use AI for brainstorming without getting obvious, repetitive ideas — covering divergent generation, constraint-based prompting, and structured filtering.",
      es: "Cómo usar IA para brainstorming sin obtener ideas obvias y repetitivas — con generación divergente, prompting basado en restricciones y filtrado estructurado.",
    },
    sections: [
      {
        heading: { en: "Why AI brainstorming often produces generic ideas", es: "Por qué el brainstorming con IA suele producir ideas genéricas" },
        bullets: {
          en: [
            "Vague prompts produce safe, central ideas: 'give me ideas for my app' returns the most common suggestions the model has seen — not the most useful for your specific situation.",
            "No diversity requirement means clusters: without asking for variety, the model generates ideas that are similar to each other in angle and approach.",
            "Asking for 'creative' ideas without constraints isn't enough — creativity needs a constraint to push against. 'Creative' alone defaults to novelty-sounding but structurally ordinary ideas.",
            "Mixing generation and evaluation in the same prompt produces filtered, cautious output. AI self-censors during generation when it knows ideas will be judged immediately.",
            "No domain specificity means generic: the model defaults to industry-standard suggestions without knowing your constraints, audience, or context.",
          ],
          es: [
            "Los prompts vagos producen ideas seguras y centrales: 'dame ideas para mi app' devuelve las sugerencias más comunes que el modelo vio — no las más útiles para tu situación específica.",
            "Sin requisito de diversidad hay clusters: sin pedir variedad, el modelo genera ideas similares entre sí en ángulo y enfoque.",
            "Pedir ideas 'creativas' sin restricciones no es suficiente — la creatividad necesita una restricción contra la cual empujar. 'Creativa' sola produce ideas que suenan novedosas pero son estructuralmente ordinarias.",
            "Mezclar generación y evaluación en el mismo prompt produce output filtrado y cauteloso. La IA se autocensura durante la generación cuando sabe que las ideas serán juzgadas inmediatamente.",
            "Sin especificidad de dominio el resultado es genérico: el modelo por defecto ofrece sugerencias estándar del sector sin conocer tus restricciones, audiencia o contexto.",
          ],
        },
      },
      {
        heading: { en: "Constraints that produce better ideas", es: "Restricciones que producen mejores ideas" },
        bullets: {
          en: [
            "Ban the obvious: list 2–3 categories that are too common and explicitly exclude them. 'Don't suggest social sharing features, gamification, or push notifications' forces the model past the defaults.",
            "Force diversity: ask for ideas from different angles — 'one that reduces cost, one that increases speed, one that changes the target user completely.'",
            "Use cross-domain combinations: 'apply the core mechanic of [unrelated domain] to solve [your problem]' produces ideas that feel genuinely different.",
            "Separate generation from evaluation: run one prompt for raw idea generation (quantity, no filtering), then a separate prompt to evaluate and rank. Mixing them cuts quantity and diversity.",
            "Add a constraint as a creative pressure: 'what would this look like if it had to work with zero budget?' or 'what's the minimum version that still solves the core problem?'",
          ],
          es: [
            "Prohibí lo obvio: listá 2–3 categorías que son demasiado comunes y excluílas explícitamente. 'No sugieras funcionalidades de compartir en redes sociales, gamificación ni notificaciones push' fuerza al modelo a ir más allá de los defaults.",
            "Forzá la diversidad: pedí ideas desde diferentes ángulos — 'una que reduzca costos, una que aumente velocidad, una que cambie completamente el usuario objetivo.'",
            "Usá combinaciones de distintos dominios: 'aplicá la mecánica central de [dominio no relacionado] para resolver [tu problema]' produce ideas que se sienten genuinamente diferentes.",
            "Separás la generación de la evaluación: ejecutá un prompt para generación pura de ideas (cantidad, sin filtrar), luego un prompt separado para evaluar y rankear. Mezclarlos reduce cantidad y diversidad.",
            "Agregá una restricción como presión creativa: '¿cómo se vería esto si tuviera que funcionar con presupuesto cero?' o '¿cuál es la versión mínima que igual resuelve el problema central?'",
          ],
        },
      },
    ],
    templates: [
      {
        title: { en: "Divergent idea generation with forced diversity", es: "Generación divergente de ideas con diversidad forzada" },
        purpose: "text",
        target: "gpt",
        prompt: {
          en: `Generate [N] ideas for [problem or opportunity].

Context:
- What it is: [brief description of the product/project/goal]
- Target user: [who this is for]
- Current constraint: [the main limitation — budget, time, technical, etc.]

Diversity requirement — generate at least one idea in each of these directions:
1. One that reduces cost or complexity.
2. One that completely changes the target user or use case.
3. One borrowed from a different industry or domain.
4. One that is the simplest possible version.
5. [Optional: add your own angle]

Do NOT suggest: [list 2-3 obvious ideas to exclude]

Format: numbered list. For each idea: one-line description + why it fits the constraint.

Do not evaluate or recommend yet — just generate.`,
          es: `Generá [N] ideas para [problema u oportunidad].

Contexto:
- Qué es: [descripción breve del producto/proyecto/objetivo]
- Usuario objetivo: [para quién es]
- Restricción actual: [la limitación principal — presupuesto, tiempo, técnica, etc.]

Requisito de diversidad — generá al menos una idea en cada una de estas direcciones:
1. Una que reduzca costo o complejidad.
2. Una que cambie completamente el usuario objetivo o caso de uso.
3. Una tomada de otro sector o dominio.
4. Una que sea la versión más simple posible.
5. [Opcional: agregá tu propio ángulo]

NO sugieras: [listá 2-3 ideas obvias a excluir]

Formato: lista numerada. Para cada idea: descripción en una línea + por qué encaja con la restricción.

Todavía no evalúes ni recomiendes — solo generá.`,
        },
      },
      {
        title: { en: "Idea evaluation and filtering", es: "Evaluación y filtrado de ideas" },
        purpose: "text",
        target: "claude",
        prompt: {
          en: `Evaluate these ideas and help me prioritize them.

Ideas:
[paste your list of ideas here]

Evaluation criteria (most important first):
1. [Criterion 1, e.g. "feasibility with a 3-person team in 2 weeks"]
2. [Criterion 2, e.g. "solves the core user pain, not just a nice-to-have"]
3. [Criterion 3, e.g. "low reversibility risk — easy to undo if it doesn't work"]

For each idea, return:
- Score: [1-5] for each criterion
- Strongest point: [what makes this idea worth considering]
- Biggest risk: [the main reason it could fail]
- Verdict: [Keep / Develop further / Drop]

End with:
- Top 2 ideas to develop further and why.
- One idea that looks weak but might be worth revisiting with a different constraint.`,
          es: `Evaluá estas ideas y ayudame a priorizarlas.

Ideas:
[pegá tu lista de ideas acá]

Criterios de evaluación (los más importantes primero):
1. [Criterio 1, ej. "factibilidad con un equipo de 3 personas en 2 semanas"]
2. [Criterio 2, ej. "resuelve el dolor central del usuario, no solo un nice-to-have"]
3. [Criterio 3, ej. "bajo riesgo de reversibilidad — fácil de deshacer si no funciona"]

Para cada idea, devolvé:
- Puntaje: [1-5] para cada criterio
- Punto más fuerte: [qué hace que esta idea valga la pena considerar]
- Riesgo principal: [la razón principal por la que podría fallar]
- Veredicto: [Mantener / Desarrollar más / Descartar]

Terminá con:
- Las 2 mejores ideas para desarrollar más y por qué.
- Una idea que parece débil pero podría valer la pena revisitar con una restricción diferente.`,
        },
      },
    ],
    faq: [
      {
        q: { en: "How do I get AI to generate genuinely original ideas?", es: "¿Cómo hago para que la IA genere ideas genuinamente originales?" },
        a: {
          en: "There's no guarantee of true originality, but you can push toward less common territory by banning the obvious categories, asking for cross-domain combinations, forcing diversity requirements, and adding unusual constraints. Originality also depends on your follow-up: use AI-generated ideas as starting points, not final answers. The value is in covering more ground quickly so you can identify the non-obvious angles worth exploring.",
          es: "No hay garantía de originalidad real, pero podés empujar hacia territorio menos común prohibiendo las categorías obvias, pidiendo combinaciones de distintos dominios, forzando requisitos de diversidad y agregando restricciones inusuales. La originalidad también depende de tu seguimiento: usá las ideas generadas por IA como puntos de partida, no como respuestas finales. El valor está en cubrir más terreno rápido para identificar los ángulos no obvios que vale la pena explorar.",
        },
      },
      {
        q: { en: "Should I use AI for all my brainstorming?", es: "¿Debo usar IA para todo mi brainstorming?" },
        a: {
          en: "AI is best for quantity and breadth: quickly covering the idea space and surfacing angles you might not have considered. Use it early in a process to generate a large set of candidates. Human judgment remains essential for filtering — you understand context, stakeholder dynamics, and implementation realities better than the model. A good workflow: AI for generation, you for filtering and developing the best candidates.",
          es: "La IA es mejor para cantidad y amplitud: cubrir rápidamente el espacio de ideas y hacer emerger ángulos que podrías no haber considerado. Usala al inicio de un proceso para generar un gran conjunto de candidatos. El criterio humano sigue siendo esencial para el filtrado — entendés mejor que el modelo el contexto, la dinámica de los stakeholders y las realidades de implementación. Un buen flujo: IA para generación, vos para filtrar y desarrollar los mejores candidatos.",
        },
      },
    ],
  },
  {
    slug: "kimi-prompt-guide",
    title: {
      en: "Prompts for Kimi: long context, document analysis, and deep research",
      es: "Prompts para Kimi: contexto largo, análisis de documentos e investigación profunda",
    },
    description: {
      en: "How to write prompts that get the most out of Kimi's large context window and strong document-understanding capabilities.",
      es: "Cómo escribir prompts que aprovechan la ventana de contexto extensa de Kimi y sus capacidades de comprensión de documentos.",
    },
    sections: [
      {
        heading: { en: "What makes Kimi different", es: "Qué hace diferente a Kimi" },
        bullets: {
          en: [
            "Kimi supports very long context windows — you can paste entire documents, lengthy codebases, or multiple sources without hitting length limits quickly.",
            "It handles long-range dependencies well: questions that require connecting information from different sections of the same document.",
            "Strong at structured document understanding: contracts, research papers, technical specs, and multi-section reports.",
            "For deep research tasks, Kimi can hold a large volume of reference material in context while answering focused questions about it.",
            "It tends to be thorough; set an explicit length limit if you want concise output.",
          ],
          es: [
            "Kimi soporta ventanas de contexto muy largas — podés pegar documentos completos, bases de código extensas o múltiples fuentes sin llegar rápidamente al límite.",
            "Maneja bien las dependencias de largo alcance: preguntas que requieren conectar información de distintas secciones del mismo documento.",
            "Sólido en comprensión de documentos estructurados: contratos, artículos de investigación, specs técnicas y reportes de múltiples secciones.",
            "Para tareas de investigación profunda, Kimi puede mantener un gran volumen de material de referencia en contexto mientras responde preguntas específicas.",
            "Tiende a ser exhaustivo; poné un límite explícito de longitud si querés salida concisa.",
          ],
        },
      },
      {
        heading: { en: "Patterns that work well with Kimi", es: "Patrones que funcionan bien con Kimi" },
        bullets: {
          en: [
            "Paste the full document first, then ask your question at the end — Kimi reads everything before answering.",
            "Use section markers to help Kimi navigate large documents: label sections with '=== Section: [name] ===' for clear anchoring.",
            "For multi-document tasks, separate sources clearly with headers and tell Kimi which source to prioritize if they conflict.",
            "Ask Kimi to cite the specific passage it's drawing from — this surfaces exactly where in the document the answer lives.",
            "For research tasks, give Kimi a list of sources and a specific question; ask it to synthesize across all sources rather than answering from just one.",
            "When accuracy is critical, ask Kimi to flag anything it's uncertain about instead of filling gaps with inference.",
          ],
          es: [
            "Pegá el documento completo primero y luego hacé tu pregunta al final — Kimi lee todo antes de responder.",
            "Usá marcadores de sección para ayudar a Kimi a navegar documentos grandes: etiquetá secciones con '=== Sección: [nombre] ===' para anclar claramente.",
            "Para tareas con múltiples documentos, separalas claramente con encabezados e indicá cuál fuente priorizar si hay conflicto.",
            "Pedile a Kimi que cite el fragmento específico del que extrae la respuesta — esto muestra exactamente dónde vive la respuesta en el documento.",
            "Para tareas de investigación, dale a Kimi una lista de fuentes y una pregunta específica; pedile que sintetice entre todas las fuentes en lugar de responder de una sola.",
            "Cuando la precisión es crítica, pedile a Kimi que marque lo que no está seguro en vez de llenar huecos con inferencia.",
          ],
        },
      },
    ],
    templates: [
      {
        title: { en: "Long-document Q&A with source anchoring", es: "Q&A sobre documento largo con anclaje de fuente" },
        purpose: "text",
        target: "kimi",
        prompt: {
          en: `Answer questions about the document below using ONLY the content in the document.

Rules:
1. For each answer, quote the relevant passage (max 2 sentences) before your response.
2. If the answer is not in the document, say: "Not found in document."
3. If information appears in multiple sections, note each location.
4. Do not add outside knowledge.
5. If a question is ambiguous, ask one clarifying question before answering.

=== Document Start ===
[paste the full document here]
=== Document End ===

Question:
[your question]`,
          es: `Respondé preguntas sobre el documento de abajo usando SOLO el contenido del documento.

Reglas:
1. Para cada respuesta, citá el fragmento relevante (máx 2 oraciones) antes de tu respuesta.
2. Si la respuesta no está en el documento, decí: "No encontrado en el documento."
3. Si la información aparece en múltiples secciones, mencioná cada ubicación.
4. No agregues conocimiento externo.
5. Si una pregunta es ambigua, hacé una pregunta aclaratoria antes de responder.

=== Inicio del documento ===
[pegá el documento completo acá]
=== Fin del documento ===

Pregunta:
[tu pregunta]`,
        },
      },
      {
        title: { en: "Multi-source research synthesis", es: "Síntesis de investigación con múltiples fuentes" },
        purpose: "text",
        target: "kimi",
        prompt: {
          en: `You will receive multiple sources. Synthesize them to answer the research question below.

Research question: [your question]

Sources:
--- Source 1: [title or description] ---
[paste source 1]

--- Source 2: [title or description] ---
[paste source 2]

--- Source 3: [title or description] (optional) ---
[paste source 3 or remove this section]

Instructions:
1. Answer based only on the provided sources — do not add outside knowledge.
2. When sources agree, state the consensus and cite which sources agree.
3. When sources conflict, state the disagreement explicitly and do not pick a side without evidence.
4. End with: gaps — what the sources do NOT cover that would be needed for a complete answer.
5. Keep the total response under 400 words.`,
          es: `Vas a recibir múltiples fuentes. Sintetizalas para responder la pregunta de investigación de abajo.

Pregunta de investigación: [tu pregunta]

Fuentes:
--- Fuente 1: [título o descripción] ---
[pegá fuente 1]

--- Fuente 2: [título o descripción] ---
[pegá fuente 2]

--- Fuente 3: [título o descripción] (opcional) ---
[pegá fuente 3 o eliminá esta sección]

Instrucciones:
1. Respondé basándote solo en las fuentes provistas — no agregues conocimiento externo.
2. Cuando las fuentes coincidan, enunciá el consenso y citá qué fuentes coinciden.
3. Cuando las fuentes contradigan, enunciá el desacuerdo explícitamente y no elijas un lado sin evidencia.
4. Terminá con: brechas — qué NO cubren las fuentes y que haría falta para una respuesta completa.
5. Mantenés el total de la respuesta en menos de 400 palabras.`,
        },
      },
    ],
    faq: [
      {
        q: { en: "How large a document can I paste into Kimi?", es: "¿Qué tan largo puede ser el documento que pego en Kimi?" },
        a: {
          en: "Kimi's context window is large enough to handle book-length documents. For practical accuracy, focused questions on specific sections work better than open-ended 'tell me everything' prompts. If accuracy is critical, split very long documents into logical segments and query each segment separately before synthesizing.",
          es: "La ventana de contexto de Kimi es lo suficientemente grande para manejar documentos del tamaño de un libro. Para precisión práctica, las preguntas enfocadas en secciones específicas funcionan mejor que los prompts abiertos del tipo 'contame todo'. Si la precisión es crítica, dividí documentos muy largos en segmentos lógicos y consultá cada segmento por separado antes de sintetizar.",
        },
      },
      {
        q: { en: "Does Kimi work well for technical research papers?", es: "¿Kimi funciona bien para artículos de investigación técnicos?" },
        a: {
          en: "Yes — Kimi handles technical language well and can track terminology across long academic documents. For research papers, specify exactly what you want: a summary of the methodology, the key findings, limitations, or a comparison with other cited works. 'Summarize this paper' is too vague; 'summarize the methodology section in 3 bullets and list the stated limitations' gives consistent results.",
          es: "Sí — Kimi maneja bien el lenguaje técnico y puede rastrear terminología a lo largo de documentos académicos largos. Para artículos de investigación, especificá exactamente lo que querés: un resumen de la metodología, los hallazgos clave, las limitaciones o una comparación con otras obras citadas. 'Resumí este paper' es demasiado vago; 'resumí la sección de metodología en 3 bullets y listá las limitaciones declaradas' da resultados consistentes.",
        },
      },
    ],
  },
  {
    slug: "data-analysis-prompts",
    title: {
      en: "AI prompts for data analysis: SQL, trends, and interpretation",
      es: "Prompts de IA para análisis de datos: SQL, tendencias e interpretación",
    },
    description: {
      en: "Prompt templates for data analysis tasks — generating SQL queries, interpreting results, spotting trends, and cleaning messy datasets.",
      es: "Plantillas de prompts para tareas de análisis de datos — generación de SQL, interpretación de resultados, detección de tendencias y limpieza de datasets.",
    },
    sections: [
      {
        heading: { en: "Why data analysis prompts fail", es: "Por qué fallan los prompts de análisis de datos" },
        bullets: {
          en: [
            "No schema provided: the model invents column names and table structures it doesn't have.",
            "Underspecified goal: 'analyze this data' can mean dozens of things — specify what decision the analysis should support.",
            "Missing constraints: no row limits, no date ranges, no filter criteria — the model guesses.",
            "No output format: data analysis results need a specific format (table, SQL query, bullet summary) or they become walls of text.",
            "No validation request: SQL can look correct and still have logic errors — always ask for a check step.",
          ],
          es: [
            "Sin schema provisto: el modelo inventa nombres de columnas y estructuras de tablas que no tiene.",
            "Objetivo poco especificado: 'analizá este dato' puede significar docenas de cosas — especificá qué decisión debe apoyar el análisis.",
            "Sin restricciones: sin límites de filas, sin rangos de fechas, sin criterios de filtro — el modelo adivina.",
            "Sin formato de salida: los resultados de análisis de datos necesitan un formato específico (tabla, query SQL, resumen en bullets) o se convierten en paredes de texto.",
            "Sin pedido de validación: el SQL puede verse correcto y tener errores de lógica — siempre pedí un paso de verificación.",
          ],
        },
      },
      {
        heading: { en: "Parameters that make data prompts reliable", es: "Parámetros que hacen los prompts de datos confiables" },
        bullets: {
          en: [
            "Always provide the schema: table name, column names, data types, and a 2-3 row sample.",
            "State the decision: 'The output will be used to decide [X]' gives the model the right level of detail to target.",
            "Specify output format: query only, table, or bullet list with key numbers.",
            "Ask for a logic check: 'Explain what the query does and flag any assumptions you made about the data.'",
            "For trend analysis: specify the time grain (daily/weekly/monthly) and the metric definition explicitly.",
          ],
          es: [
            "Siempre provee el schema: nombre de tabla, nombres de columnas, tipos de datos y una muestra de 2-3 filas.",
            "Enunciá la decisión: 'El output se usará para decidir [X]' le da al modelo el nivel de detalle correcto a apuntar.",
            "Especificá el formato de salida: solo query, tabla o lista de bullets con números clave.",
            "Pedí una verificación de lógica: 'Explicá qué hace el query y marcá los supuestos que hiciste sobre los datos.'",
            "Para análisis de tendencias: especificá el grano temporal (diario/semanal/mensual) y la definición de la métrica explícitamente.",
          ],
        },
      },
    ],
    templates: [
      {
        title: { en: "SQL query from plain-English requirements", es: "Query SQL a partir de requisitos en lenguaje natural" },
        purpose: "data",
        target: "gpt",
        prompt: {
          en: `Write a SQL query for the following requirement.

Database: [PostgreSQL / MySQL / SQLite — specify]

Table schema:
Table name: [name]
Columns: [column_name (type), column_name (type), ...]
Sample rows (2-3):
[paste 2-3 rows]

Requirement:
[describe what the query should return in plain English]

Constraints:
- Filter to: [date range / status / category — specify or remove]
- Limit results to: [number] rows if no specific filter
- Sort by: [column and direction]

Output:
1. The SQL query.
2. A plain-English explanation of what it does (2-3 sentences).
3. Assumptions you made about the data.
4. Any edge cases this query does not handle.`,
          es: `Escribí un query SQL para el siguiente requisito.

Base de datos: [PostgreSQL / MySQL / SQLite — especificá]

Schema de tabla:
Nombre de tabla: [nombre]
Columnas: [nombre_columna (tipo), nombre_columna (tipo), ...]
Filas de muestra (2-3):
[pegá 2-3 filas]

Requisito:
[describí en lenguaje natural qué debe devolver el query]

Restricciones:
- Filtrar por: [rango de fechas / estado / categoría — especificá o eliminá]
- Limitar resultados a: [número] filas si no hay filtro específico
- Ordenar por: [columna y dirección]

Salida:
1. El query SQL.
2. Una explicación en lenguaje natural de qué hace (2-3 oraciones).
3. Supuestos que hiciste sobre los datos.
4. Casos límite que este query no maneja.`,
        },
      },
      {
        title: { en: "Trend analysis and interpretation", es: "Análisis e interpretación de tendencias" },
        purpose: "data",
        target: "claude",
        prompt: {
          en: `Analyze the data below and identify meaningful trends.

Metric: [what is being measured]
Time grain: [daily / weekly / monthly]
Period: [start date] to [end date]
Decision this analysis supports: [one sentence on what you will decide with this]

Data:
[paste data as CSV, table, or bullet list]

Output:
1. The main trend in 1-2 sentences (direction, magnitude, notable changes).
2. Up to 3 specific observations worth investigating (not generic statements — name the exact time period or data point).
3. What the data does NOT tell you (limitations, missing context).
4. One follow-up question to answer before acting on this data.

Constraints:
- Do not speculate about causes unless the data explicitly supports it.
- If a trend has contradictory signals, note the contradiction instead of picking one.
- Keep the total response under 250 words.`,
          es: `Analizá los datos de abajo e identificá tendencias significativas.

Métrica: [qué se está midiendo]
Grano temporal: [diario / semanal / mensual]
Período: [fecha de inicio] al [fecha de fin]
Decisión que apoya este análisis: [una oración sobre qué decidirás con esto]

Datos:
[pegá datos en CSV, tabla o lista de bullets]

Salida:
1. La tendencia principal en 1-2 oraciones (dirección, magnitud, cambios notables).
2. Hasta 3 observaciones específicas que vale la pena investigar (no enunciados genéricos — nombrá el período o punto de dato exacto).
3. Qué NO te dicen los datos (limitaciones, contexto faltante).
4. Una pregunta de seguimiento a responder antes de actuar sobre estos datos.

Restricciones:
- No especules sobre causas salvo que los datos las soporten explícitamente.
- Si una tendencia tiene señales contradictorias, notá la contradicción en vez de elegir una.
- Mantenés el total de la respuesta en menos de 250 palabras.`,
        },
      },
    ],
    faq: [
      {
        q: { en: "Which AI model is best for SQL generation?", es: "¿Qué modelo de IA es mejor para generación de SQL?" },
        a: {
          en: "For SQL generation, GPT and Claude are both strong. GPT tends to write cleaner queries quickly; Claude handles complex multi-step logic well and is more likely to flag ambiguities in the schema. For data interpretation, Claude's tendency to note uncertainty is useful — it will flag when the data doesn't support a strong conclusion instead of speculating.",
          es: "Para generación de SQL, GPT y Claude son ambos sólidos. GPT tiende a escribir queries limpios rápidamente; Claude maneja bien la lógica compleja de múltiples pasos y es más propenso a señalar ambigüedades en el schema. Para interpretación de datos, la tendencia de Claude a notar incertidumbre es útil — señalará cuando los datos no apoyan una conclusión fuerte en vez de especular.",
        },
      },
      {
        q: { en: "How do I avoid hallucinated column names in SQL prompts?", es: "¿Cómo evito nombres de columnas inventados en prompts SQL?" },
        a: {
          en: "Always paste the exact schema — table name, column names, types, and at least 2 sample rows. The model cannot invent a name it can see in front of it. If you add the constraint 'Use only the column names listed in the schema above — do not invent new ones,' most models will respect it. For critical queries, ask it to list all column names it used and verify them against the schema.",
          es: "Siempre pegá el schema exacto — nombre de tabla, nombres de columnas, tipos y al menos 2 filas de muestra. El modelo no puede inventar un nombre que puede ver delante. Si agregás la restricción 'Usá solo los nombres de columnas listados en el schema de arriba — no inventes nuevos', la mayoría de los modelos lo respetará. Para queries críticos, pedile que liste todos los nombres de columnas que usó y verificalos contra el schema.",
        },
      },
    ],
  },
  {
    slug: "ai-prompts-for-learning",
    title: {
      en: "AI prompts for learning: tutoring, concept checks, and study guides",
      es: "Prompts de IA para aprender: tutoría, checks de concepto y guías de estudio",
    },
    description: {
      en: "Prompt templates that turn AI into a patient tutor — for explaining concepts, testing understanding, building study plans, and connecting new material to what you already know.",
      es: "Plantillas de prompts que convierten la IA en un tutor paciente — para explicar conceptos, testear comprensión, construir planes de estudio y conectar material nuevo con lo que ya sabés.",
    },
    sections: [
      {
        heading: { en: "Why AI tutoring prompts fail", es: "Por qué fallan los prompts de tutoría con IA" },
        bullets: {
          en: [
            "No level specified: the model can't calibrate whether 'explain recursion' means explain it to a beginner or a senior developer.",
            "No prior knowledge stated: without knowing what you already understand, the model either over-explains basics or skips foundational steps.",
            "No check step: explanations with no comprehension check leave gaps — you don't know what you missed.",
            "Single pass only: one explanation is rarely enough for hard concepts; prompts that invite follow-up are more effective.",
            "Too broad: 'help me learn machine learning' produces a reading list; a focused topic with a specific question produces understanding.",
          ],
          es: [
            "Sin nivel especificado: el modelo no puede calibrar si 'explicá recursión' significa explicársela a un principiante o a un desarrollador senior.",
            "Sin conocimiento previo declarado: sin saber qué ya entendés, el modelo o sobre-explica conceptos básicos o saltea pasos fundamentales.",
            "Sin paso de verificación: las explicaciones sin check de comprensión dejan huecos — no sabés qué perdiste.",
            "Solo una pasada: una explicación raramente es suficiente para conceptos difíciles; los prompts que invitan al seguimiento son más efectivos.",
            "Demasiado amplio: 'ayudame a aprender machine learning' produce una lista de lecturas; un tema enfocado con una pregunta específica produce comprensión.",
          ],
        },
      },
      {
        heading: { en: "What makes AI tutoring effective", es: "Qué hace efectiva la tutoría con IA" },
        bullets: {
          en: [
            "State your level and what you already know — this is the single most useful signal for calibration.",
            "Ask for examples first, then the principle: concrete cases are easier to reason from than abstract definitions.",
            "Request a comprehension check at the end: 'Give me 2 questions to test whether I understood this correctly.'",
            "Use the Feynman test prompt: ask the model to explain what you just learned as if you need to teach it to someone else — gaps become obvious.",
            "If something doesn't click, describe what is confusing specifically — 'I don't understand X because Y' gets better help than 'explain again'.",
            "For complex topics, ask for a concept map: 'Draw the relationships between these ideas before explaining each one.'",
          ],
          es: [
            "Declarás tu nivel y lo que ya sabés — esta es la señal de calibración más útil.",
            "Pedís ejemplos primero, luego el principio: los casos concretos son más fáciles de razonar que las definiciones abstractas.",
            "Solicitás un check de comprensión al final: 'Dame 2 preguntas para testear si entendí esto correctamente.'",
            "Usás el prompt del test de Feynman: pedile al modelo que explique lo que acabás de aprender como si necesitaras enseñárselo a alguien — los huecos se vuelven obvios.",
            "Si algo no hace click, describís específicamente qué es lo confuso — 'No entiendo X porque Y' obtiene mejor ayuda que 'explicá de nuevo'.",
            "Para temas complejos, pedís un mapa conceptual: 'Dibujá las relaciones entre estas ideas antes de explicar cada una.'",
          ],
        },
      },
    ],
    templates: [
      {
        title: { en: "Calibrated concept explanation", es: "Explicación calibrada de un concepto" },
        purpose: "study",
        target: "claude",
        prompt: {
          en: `Explain [concept] to me.

My level: [complete beginner / familiar with basics / intermediate — pick one]
What I already know: [describe in 1-2 sentences, or 'nothing yet']
Goal: [why you're learning this — e.g. 'to use it in my Python scripts' / 'for a job interview']

Instructions:
1. Start with a concrete real-world example before the formal definition.
2. Explain using analogies to [something I'm already familiar with, e.g. spreadsheets / cooking / building construction].
3. Show a simple worked example.
4. Highlight the 1-2 most common mistakes beginners make.
5. End with: 2 short questions that test whether I actually understood, not just memorized.`,
          es: `Explicame [concepto].

Mi nivel: [principiante completo / familiarizado con los básicos / intermedio — elegí uno]
Lo que ya sé: [describí en 1-2 oraciones, o 'nada todavía']
Objetivo: [por qué estás aprendiendo esto — ej. 'para usarlo en mis scripts de Python' / 'para una entrevista de trabajo']

Instrucciones:
1. Empezás con un ejemplo concreto del mundo real antes de la definición formal.
2. Explicás usando analogías con [algo con lo que ya estoy familiarizado, ej. planillas / cocina / construcción].
3. Mostrás un ejemplo simple resuelto.
4. Destacás los 1-2 errores más comunes que cometen los principiantes.
5. Terminás con: 2 preguntas cortas que testean si realmente lo entendí, no solo lo memoricé.`,
        },
      },
      {
        title: { en: "Study plan for a specific topic", es: "Plan de estudio para un tema específico" },
        purpose: "study",
        target: "gpt",
        prompt: {
          en: `Build a focused study plan for me.

Topic: [what you want to learn]
My current level: [beginner / some familiarity / intermediate]
Time available: [hours per week] for [number of weeks]
Goal: [what you want to be able to DO at the end — specific task, not 'understand it better']

Output format:
1. Learning path: ordered list of sub-topics (most foundational first).
2. For each sub-topic: one practice exercise I can do to confirm I understand it.
3. The 3 resources to prioritize (type only: 'video tutorial', 'hands-on project', 'official docs' — do not recommend specific paid resources).
4. Weekly milestone: what I should be able to do after each week.
5. Warning: one common mistake people make when learning this that delays progress.

Constraints:
- Keep the plan achievable in the time I specified.
- Do not pad with optional 'nice to have' topics.
- If my time is too short for the goal, say so directly and suggest a reduced scope.`,
          es: `Construime un plan de estudio enfocado.

Tema: [qué querés aprender]
Mi nivel actual: [principiante / alguna familiaridad / intermedio]
Tiempo disponible: [horas por semana] durante [número de semanas]
Objetivo: [qué querés poder HACER al final — tarea específica, no 'entenderlo mejor']

Formato de salida:
1. Ruta de aprendizaje: lista ordenada de sub-temas (el más fundamental primero).
2. Por cada sub-tema: un ejercicio práctico que puedo hacer para confirmar que lo entendí.
3. Los 3 recursos a priorizar (solo tipo: 'tutorial en video', 'proyecto práctico', 'documentación oficial' — no recomendés recursos de pago específicos).
4. Hito semanal: qué debería poder hacer después de cada semana.
5. Advertencia: un error común que comete la gente cuando aprende esto y que retrasa el progreso.

Restricciones:
- Mantené el plan alcanzable en el tiempo que especifiqué.
- No rellenes con temas opcionales 'nice to have'.
- Si mi tiempo es demasiado corto para el objetivo, decilo directamente y sugerí un alcance reducido.`,
        },
      },
    ],
    faq: [
      {
        q: { en: "Is AI a good replacement for a human tutor?", es: "¿La IA reemplaza bien a un tutor humano?" },
        a: {
          en: "For structured content that doesn't require hands-on feedback — concepts, worked examples, practice problems — AI tutors are genuinely useful and available at any hour. For skills that need real-time observation (public speaking, physical technique, lab work) or mentorship on career and judgment calls, a human tutor is much better. The highest-value AI tutoring use case is the thing you'd be embarrassed to ask a human 20 times: explaining the same concept differently until it clicks.",
          es: "Para contenido estructurado que no requiere retroalimentación práctica — conceptos, ejemplos resueltos, problemas de práctica — los tutores de IA son genuinamente útiles y están disponibles a cualquier hora. Para habilidades que necesitan observación en tiempo real (oratoria, técnica física, trabajo de laboratorio) o mentoría en carrera y decisiones de criterio, un tutor humano es mucho mejor. El caso de uso de mayor valor en la tutoría con IA es lo que te daría vergüenza preguntarle a un humano 20 veces: explicar el mismo concepto de distintas maneras hasta que haga click.",
        },
      },
      {
        q: { en: "How do I know if AI explanations are accurate?", es: "¿Cómo sé si las explicaciones de la IA son correctas?" },
        a: {
          en: "AI explanations can be wrong, especially on niche topics, cutting-edge research, or precise technical details. Cross-check key claims against official documentation or authoritative sources. Ask the model to flag its uncertainty: 'Mark anything you're not confident about.' For foundational topics in well-established fields (standard algorithms, core language features, classical physics), accuracy is generally high. For anything recent or specialized, verify before relying on it.",
          es: "Las explicaciones de la IA pueden estar equivocadas, especialmente en temas de nicho, investigación de vanguardia o detalles técnicos precisos. Verificá afirmaciones clave contra documentación oficial o fuentes autorizadas. Pedile al modelo que marque su incertidumbre: 'Marcá todo sobre lo que no estés seguro.' Para temas fundamentales en campos bien establecidos (algoritmos estándar, características centrales de lenguajes, física clásica), la precisión generalmente es alta. Para cualquier cosa reciente o especializada, verificá antes de confiar en ello.",
        },
      },
    ],
  },
  {
    slug: "perplexity-prompt-guide",
    title: {
      en: "Prompts for Perplexity: grounded answers from the web",
      es: "Prompts para Perplexity: respuestas respaldadas por la web",
    },
    description: {
      en: "How to write prompts that get the most out of Perplexity Sonar — real-time web search, cited sources, and accurate current information.",
      es: "Cómo escribir prompts que aprovechan al máximo Perplexity Sonar: búsqueda web en tiempo real, fuentes citadas e información actualizada.",
    },
    sections: [
      {
        heading: { en: "What makes Perplexity different", es: "Qué hace diferente a Perplexity" },
        bullets: {
          en: [
            "Perplexity searches the web before answering — every response cites real, recent sources you can verify.",
            "It handles current events, prices, product specs, and rapidly changing facts far better than a model without web access.",
            "Sonar Pro adds deeper research capability: multi-step reasoning over multiple sources before composing the answer.",
            "Use Perplexity when freshness matters: today's news, the latest framework version, current regulations, live pricing.",
            "Avoid it for creative writing, long-form generation, or tasks where web retrieval adds noise rather than grounding.",
          ],
          es: [
            "Perplexity busca en la web antes de responder — cada respuesta cita fuentes reales y recientes que podés verificar.",
            "Maneja eventos actuales, precios, especificaciones de productos y datos que cambian rápido mucho mejor que un modelo sin acceso web.",
            "Sonar Pro agrega capacidad de investigación más profunda: razonamiento en múltiples pasos sobre varias fuentes antes de componer la respuesta.",
            "Usá Perplexity cuando la actualidad importa: noticias de hoy, la última versión de un framework, regulaciones actuales, precios en tiempo real.",
            "Evitalo para escritura creativa, generación de texto largo o tareas donde la recuperación web agrega ruido en lugar de fundamento.",
          ],
        },
      },
      {
        heading: { en: "Patterns that work well with Perplexity", es: "Patrones que funcionan bien con Perplexity" },
        bullets: {
          en: [
            "Ask for a specific date range: 'What changed in [topic] between January and June 2026?' — this focuses the search.",
            "Request source types: 'Only use official announcements, not opinion pieces.' Perplexity respects source-type constraints.",
            "Use it for comparison: 'Compare the current pricing of [A] vs [B] as of today, with sources.' It aggregates across pages.",
            "For research: 'Find 3–5 credible sources that [claim]. Summarize each and note any disagreements.' Great for literature review.",
            "Ask it to flag uncertainty: 'If you can't find a source for a specific claim, say so explicitly.' Reduces confident-sounding gaps.",
            "Combine with follow-up: paste its sourced summary into a more capable model (Claude, GPT) for deeper synthesis or writing.",
          ],
          es: [
            "Pedí un rango de fechas específico: '¿Qué cambió en [tema] entre enero y junio de 2026?' — esto enfoca la búsqueda.",
            "Solicitá tipos de fuentes: 'Usá solo anuncios oficiales, no artículos de opinión.' Perplexity respeta restricciones de tipo de fuente.",
            "Usalo para comparaciones: 'Comparé el precio actual de [A] vs [B] a la fecha de hoy, con fuentes.' Agrega datos de múltiples páginas.",
            "Para investigación: 'Encontrá 3–5 fuentes confiables que [afirmación]. Resumí cada una y anotá los desacuerdos.' Ideal para revisión de literatura.",
            "Pedile que marque la incertidumbre: 'Si no encontrás una fuente para una afirmación específica, decilo explícitamente.' Reduce los huecos que suenan seguros.",
            "Combinalo con seguimiento: pegá su resumen con fuentes en un modelo más potente (Claude, GPT) para síntesis o escritura más profunda.",
          ],
        },
      },
    ],
    templates: [
      {
        title: { en: "Current-state research with sources", es: "Investigación del estado actual con fuentes" },
        purpose: "text",
        target: "perplexity",
        prompt: {
          en: `Research the current state of [topic] as of [month year].

I need:
1. The 3 most important recent developments (last 6 months preferred).
2. For each: what changed, who it affects, and why it matters.
3. One credible source per point — official announcements or primary sources preferred.
4. A brief summary of what is still uncertain or actively debated.

Constraints:
- If a claim has no verifiable source, flag it explicitly.
- Avoid opinion pieces as primary sources.
- Keep each point to 3–4 sentences.`,
          es: `Investigá el estado actual de [tema] a partir de [mes año].

Necesito:
1. Los 3 desarrollos recientes más importantes (últimos 6 meses preferido).
2. Por cada uno: qué cambió, a quién afecta y por qué importa.
3. Una fuente confiable por punto — anuncios oficiales o fuentes primarias preferidas.
4. Un resumen breve de lo que todavía es incierto o está activamente debatido.

Restricciones:
- Si una afirmación no tiene fuente verificable, marcala explícitamente.
- Evitá artículos de opinión como fuentes primarias.
- Mantené cada punto en 3–4 oraciones.`,
        },
      },
      {
        title: { en: "Competitive comparison with live data", es: "Comparación competitiva con datos actuales" },
        purpose: "text",
        target: "perplexity",
        prompt: {
          en: `Compare [Option A] and [Option B] as of today.

Comparison dimensions:
- [dimension 1, e.g., pricing]
- [dimension 2, e.g., feature set]
- [dimension 3, e.g., recent changes or updates]

Format:
- A short paragraph per dimension, noting differences.
- A source for each factual claim.
- A final "best for" sentence: who should choose A vs B based on the data.

If the information is outdated or unavailable for a dimension, say so.`,
          es: `Comparé [Opción A] y [Opción B] a la fecha de hoy.

Dimensiones de comparación:
- [dimensión 1, ej. precios]
- [dimensión 2, ej. características]
- [dimensión 3, ej. cambios o actualizaciones recientes]

Formato:
- Un párrafo corto por dimensión, señalando diferencias.
- Una fuente por cada afirmación factual.
- Una frase final de "mejor para": quién debería elegir A vs B basándose en los datos.

Si la información está desactualizada o no está disponible para una dimensión, decilo.`,
        },
      },
    ],
    faq: [
      {
        q: { en: "When should I use Perplexity instead of ChatGPT or Claude?", es: "¿Cuándo uso Perplexity en vez de ChatGPT o Claude?" },
        a: {
          en: "Use Perplexity when the answer depends on facts that change — current prices, recent product releases, today's news, updated regulations, or anything from the last few weeks. ChatGPT and Claude have training cutoffs and can confidently give you stale information. Use them for tasks where reasoning, long-form generation, or nuanced judgment matter more than factual freshness.",
          es: "Usá Perplexity cuando la respuesta depende de hechos que cambian — precios actuales, lanzamientos recientes de productos, noticias de hoy, regulaciones actualizadas o cualquier cosa de las últimas semanas. ChatGPT y Claude tienen fechas de corte de entrenamiento y pueden darte información desactualizada con confianza. Usalos para tareas donde el razonamiento, la generación de texto largo o el criterio matizado importan más que la actualidad factual.",
        },
      },
      {
        q: { en: "How do I check if Perplexity's sources are reliable?", es: "¿Cómo verifico si las fuentes de Perplexity son confiables?" },
        a: {
          en: "Always click through to the cited sources, especially for important decisions. Perplexity surfaces what ranks well and what it can access — that isn't the same as editorial curation. For medical, legal, or financial decisions, treat the output as a starting point for your own source review, not a final answer. Asking explicitly for 'official announcements or primary sources only' shifts the retrieval toward more authoritative pages.",
          es: "Siempre hacé click en las fuentes citadas, especialmente para decisiones importantes. Perplexity muestra lo que rankea bien y lo que puede acceder — eso no es lo mismo que curaduría editorial. Para decisiones médicas, legales o financieras, tratá el resultado como punto de partida para tu propia revisión de fuentes, no como respuesta final. Pedir explícitamente 'solo anuncios oficiales o fuentes primarias' orienta la recuperación hacia páginas más autorizadas.",
        },
      },
    ],
  },
  {
    slug: "prompt-debugging",
    title: {
      en: "How to debug a prompt that gives bad output",
      es: "Cómo depurar un prompt que da resultados malos",
    },
    description: {
      en: "A systematic method for diagnosing why a prompt fails and fixing it without trial and error.",
      es: "Un método sistemático para diagnosticar por qué falla un prompt y corregirlo sin prueba y error.",
    },
    sections: [
      {
        heading: { en: "The most common failure modes", es: "Los modos de falla más comunes" },
        bullets: {
          en: [
            "Missing goal: you described the task but not what success looks like — the model guesses the acceptance criteria.",
            "Ambiguous scope: 'brief' means 50 words to you and 500 to the model. Specify numbers.",
            "Missing context: the model lacks the constraints, definitions, or background that make the task unambiguous in your head.",
            "Wrong format: you want a table, the model gives prose. You want JSON, the model adds markdown fences.",
            "Conflicting instructions: 'be concise' plus 'cover everything' in the same prompt produce averaged-out garbage.",
            "No anchor for missing info: when the model doesn't know something, it fills the gap. Telling it to flag gaps prevents hallucinations.",
          ],
          es: [
            "Objetivo faltante: describiste la tarea pero no cómo se ve el éxito — el modelo adivina los criterios de aceptación.",
            "Alcance ambiguo: 'breve' significa 50 palabras para vos y 500 para el modelo. Especificá números.",
            "Contexto faltante: el modelo no tiene las restricciones, definiciones o antecedentes que hacen que la tarea sea inequívoca en tu cabeza.",
            "Formato incorrecto: querés una tabla, el modelo da prosa. Querés JSON, el modelo agrega fences de markdown.",
            "Instrucciones contradictorias: 'sé conciso' más 'cubrí todo' en el mismo prompt producen basura promediada.",
            "Sin ancla para información faltante: cuando el modelo no sabe algo, llena el hueco. Decirle que marque los huecos previene alucinaciones.",
          ],
        },
      },
      {
        heading: { en: "The debugging process", es: "El proceso de depuración" },
        bullets: {
          en: [
            "Step 1 — isolate the symptom: write down exactly what went wrong. 'Too long', 'wrong format', 'hallucinated facts', 'missed the point', 'inconsistent across runs'.",
            "Step 2 — find the missing instruction: for each symptom, ask 'what would I need to say to a capable human to prevent this?' That missing instruction is what goes into the prompt.",
            "Step 3 — add one fix at a time: change a single variable per run so you know what actually fixed it. Multiple changes at once make it impossible to know which one worked.",
            "Step 4 — test with edge cases: run the fixed prompt on a harder version of the task, a short input, a long input, and an input with missing data. Real prompts need to handle all of these.",
            "Step 5 — lock what works with a format example: once the output is right, add a one-line example of the exact format you want. It prevents drift when you reuse the prompt.",
          ],
          es: [
            "Paso 1 — aislá el síntoma: anotá exactamente qué salió mal. 'Demasiado largo', 'formato incorrecto', 'hechos inventados', 'se fue por las ramas', 'inconsistente entre corridas'.",
            "Paso 2 — encontrá la instrucción faltante: por cada síntoma, preguntate '¿qué necesitaría decirle a un humano capaz para prevenir esto?' Esa instrucción faltante es lo que va en el prompt.",
            "Paso 3 — agregá un fix a la vez: cambiá una sola variable por corrida para saber qué realmente lo arregló. Múltiples cambios a la vez hacen imposible saber cuál funcionó.",
            "Paso 4 — testeá con casos límite: corrés el prompt corregido en una versión más difícil de la tarea, un input corto, uno largo y uno con datos faltantes. Los prompts reales tienen que manejar todo esto.",
            "Paso 5 — bloqueá lo que funciona con un ejemplo de formato: una vez que el output es correcto, agregá un ejemplo de una línea del formato exacto que querés. Previene la deriva cuando reutilizás el prompt.",
          ],
        },
      },
    ],
    templates: [
      {
        title: { en: "Prompt self-diagnostic", es: "Auto-diagnóstico de prompt" },
        purpose: "text",
        target: "gpt",
        prompt: {
          en: `You are a prompt quality reviewer. Analyze the following prompt and identify the top 3 reasons it might produce bad output.

For each issue:
1. Name the failure mode (e.g., "missing format constraint", "ambiguous scope", "no anchor for missing info").
2. Quote the exact part of the prompt that causes it.
3. Write a 1-sentence fix.

Then rewrite the full prompt with all three fixes applied.

Prompt to review:
"""
[paste the prompt that is giving bad results]
"""`,
          es: `Sos un revisor de calidad de prompts. Analizá el siguiente prompt e identificá las 3 razones principales por las que podría dar resultados malos.

Por cada problema:
1. Nombrá el modo de falla (ej. "restricción de formato faltante", "alcance ambiguo", "sin ancla para información faltante").
2. Citá la parte exacta del prompt que lo causa.
3. Escribí un fix de 1 oración.

Después reescribí el prompt completo con los tres fixes aplicados.

Prompt a revisar:
"""
[pegá el prompt que está dando resultados malos]
"""`,
        },
      },
      {
        title: { en: "Output comparison: what changed?", es: "Comparación de outputs: ¿qué cambió?" },
        purpose: "text",
        target: "claude",
        prompt: {
          en: `Compare these two prompt outputs and explain what instruction change would produce output B instead of output A.

Output A (bad):
"""
[paste the bad output]
"""

Output B (good):
"""
[paste an example of the output you actually want]
"""

Focus on:
- What output format rule was missing in the prompt that generated A?
- What constraint or example would make A impossible and B predictable?
- Write the minimum addition to the original prompt (1–3 lines) that closes the gap.`,
          es: `Comparé estos dos outputs de prompt y explicá qué cambio de instrucción produciría el output B en lugar del output A.

Output A (malo):
"""
[pegá el output malo]
"""

Output B (bueno):
"""
[pegá un ejemplo del output que realmente querés]
"""

Enfocate en:
- ¿Qué regla de formato de output faltaba en el prompt que generó A?
- ¿Qué restricción o ejemplo haría que A fuera imposible y B predecible?
- Escribí el agregado mínimo al prompt original (1–3 líneas) que cierra la brecha.`,
        },
      },
    ],
    faq: [
      {
        q: { en: "Why does my prompt work sometimes but not others?", es: "¿Por qué mi prompt a veces funciona y a veces no?" },
        a: {
          en: "Inconsistent outputs usually mean the prompt has ambiguity the model resolves differently each time — no single correct interpretation, so it picks one at random. The fix is to reduce ambiguity: specify the format with an example, constrain the scope with numbers, and remove conflicting instructions. When strict consistency matters, also lower the model's temperature setting if you control it, or lock the output to a JSON schema where one is available.",
          es: "Los outputs inconsistentes generalmente significan que el prompt tiene ambigüedad que el modelo resuelve de manera diferente cada vez — sin una interpretación correcta única, elige una al azar. El fix es reducir la ambigüedad: especificá el formato con un ejemplo, restringí el alcance con números y eliminá instrucciones contradictorias. Cuando la consistencia estricta importa, también bajá la configuración de temperatura del modelo si la controlás, o bloqueá el output a un JSON schema cuando haya uno disponible.",
        },
      },
      {
        q: { en: "How many iterations does it usually take to fix a prompt?", es: "¿Cuántas iteraciones suele llevar arreglar un prompt?" },
        a: {
          en: "Most prompt problems are fixed in 2–3 iterations when you change one thing at a time. Common mistakes that drag it out: changing multiple things at once (so you can't tell what worked), testing only on the original input (missing edge cases), and fixing symptoms instead of root causes. A prompt that handles 5 diverse test inputs reliably is genuinely fixed. One that passes only the original test case will break in production.",
          es: "La mayoría de los problemas de prompts se arreglan en 2–3 iteraciones cuando cambiás una cosa a la vez. Los errores comunes que lo prolongan: cambiar múltiples cosas a la vez (así no podés saber qué funcionó), testear solo en el input original (sin casos límite), y arreglar síntomas en lugar de causas raíz. Un prompt que maneja de manera confiable 5 inputs diversos está genuinamente arreglado. Uno que pasa solo el caso de test original se va a romper en producción.",
        },
      },
    ],
  },
  {
    slug: "ai-prompts-for-product-managers",
    title: {
      en: "AI prompts for product managers: PRDs, user research, and prioritization",
      es: "Prompts de IA para product managers: PRDs, investigación de usuarios y priorización",
    },
    description: {
      en: "Copy-paste prompt templates for the recurring PM workflows that AI handles well: writing specs, synthesizing research, and structuring prioritization decisions.",
      es: "Plantillas de prompts copy-paste para los flujos de trabajo recurrentes de un PM que la IA maneja bien: escribir specs, sintetizar investigación y estructurar decisiones de priorización.",
    },
    sections: [
      {
        heading: { en: "Where AI saves PMs the most time", es: "Dónde la IA ahorra más tiempo a los PMs" },
        bullets: {
          en: [
            "First-draft specs: a well-structured PRD template takes 30 minutes to fill instead of 3 hours to start from scratch.",
            "User interview synthesis: summarizing 10 interviews into themes, evidence, and gaps is mechanical work — AI handles it well when you give it structure.",
            "Prioritization frameworks: scoring features against RICE, ICE, or a custom rubric is faster when AI fills in the reasoning for each criterion.",
            "Stakeholder communication: translating technical scope into executive summaries or customer-facing notes is a common AI strength.",
            "Competitive landscape: summarizing how competitors address a specific problem saves hours of tab-switching (especially with a web-grounded model).",
          ],
          es: [
            "Borradores de specs: una plantilla de PRD bien estructurada toma 30 minutos de completar en lugar de 3 horas para empezar desde cero.",
            "Síntesis de entrevistas de usuarios: resumir 10 entrevistas en temas, evidencias y huecos es trabajo mecánico — la IA lo maneja bien cuando le das estructura.",
            "Frameworks de priorización: puntuar features contra RICE, ICE o una rúbrica propia es más rápido cuando la IA completa el razonamiento por cada criterio.",
            "Comunicación con stakeholders: traducir el alcance técnico en resúmenes ejecutivos o notas orientadas al cliente es una fortaleza común de la IA.",
            "Panorama competitivo: resumir cómo los competidores abordan un problema específico ahorra horas de cambiar de pestaña (especialmente con un modelo con acceso web).",
          ],
        },
      },
      {
        heading: { en: "How to get reliable output for PM work", es: "Cómo obtener outputs confiables para trabajo de PM" },
        bullets: {
          en: [
            "Always give the model the business context: who the user is, what the product does, and what constraint matters most (time, scope, resources).",
            "Paste raw material in: interview notes, support tickets, data snippets. The model synthesizes better when it has real input rather than invented scenarios.",
            "Ask for structure before prose: 'Give me the 5 themes first, then I'll tell you which to expand.' Reviewing structure is faster than reviewing paragraphs.",
            "Specify the audience: a PRD for engineers needs different depth than a one-pager for the CEO. Name the reader.",
            "Use the model to stress-test: 'Play devil's advocate. What are the strongest objections to this prioritization?' Surfaces gaps before the team meeting.",
          ],
          es: [
            "Siempre dale al modelo el contexto de negocio: quién es el usuario, qué hace el producto y qué restricción importa más (tiempo, alcance, recursos).",
            "Pegá el material crudo: notas de entrevistas, tickets de soporte, fragmentos de datos. El modelo sintetiza mejor cuando tiene input real en lugar de escenarios inventados.",
            "Pedí estructura antes de prosa: 'Dame los 5 temas primero, y luego te digo cuál expandir.' Revisar estructura es más rápido que revisar párrafos.",
            "Especificá la audiencia: un PRD para ingenieros necesita diferente profundidad que un one-pager para el CEO. Nombrá al lector.",
            "Usá el modelo para stress-test: 'Jugá al abogado del diablo. ¿Cuáles son las objeciones más fuertes a esta priorización?' Saca a la luz los huecos antes de la reunión de equipo.",
          ],
        },
      },
    ],
    templates: [
      {
        title: { en: "Lean PRD first draft", es: "Primer borrador de PRD simplificado" },
        purpose: "text",
        target: "claude",
        prompt: {
          en: `Write a lean PRD first draft for this feature.

Feature: [what it does in one sentence]
User problem: [the pain point it solves, from the user's perspective]
Target user: [who specifically — role, context, or user segment]
Business goal: [the metric this is expected to move, and by roughly how much]
Scope constraints: [what is explicitly out of scope for v1]
Key open questions: [2–3 things that need answers before build]

Output format:
## Problem
## Proposed solution (2–3 sentences)
## User stories (3–5, as "As a [user], I want [action] so that [outcome]")
## Success criteria (measurable, not aspirational)
## Out of scope
## Open questions

Keep it under 600 words. This is a first draft for team alignment, not a final spec.`,
          es: `Escribí un primer borrador de PRD simplificado para esta funcionalidad.

Funcionalidad: [qué hace en una oración]
Problema del usuario: [el pain point que resuelve, desde la perspectiva del usuario]
Usuario objetivo: [quién específicamente — rol, contexto o segmento de usuario]
Objetivo de negocio: [la métrica que se espera mover, y en aproximadamente cuánto]
Restricciones de alcance: [qué está explícitamente fuera del alcance para v1]
Preguntas abiertas clave: [2–3 cosas que necesitan respuesta antes de construir]

Formato de salida:
## Problema
## Solución propuesta (2–3 oraciones)
## User stories (3–5, como "Como [usuario], quiero [acción] para [resultado]")
## Criterios de éxito (medibles, no aspiracionales)
## Fuera del alcance
## Preguntas abiertas

Mantené menos de 600 palabras. Este es un primer borrador para alineación del equipo, no una spec final.`,
        },
      },
      {
        title: { en: "User interview synthesis", es: "Síntesis de entrevistas de usuarios" },
        purpose: "text",
        target: "claude",
        prompt: {
          en: `Synthesize the following user interview notes into structured findings.

Interview notes:
"""
[paste raw notes from 3–10 interviews here]
"""

Output:
1. Top 5 themes — each with:
   - Theme name (3–5 words)
   - 1-sentence description
   - 2–3 direct quotes or paraphrases that support it
   - Which user segment mentioned it most

2. Top 3 unmet needs (things users said they wish existed or complained about most)

3. Gaps — what important questions remain unanswered by these interviews?

Constraints:
- Only include themes supported by at least 2 different users.
- Do not invent quotes or add outside assumptions.
- Flag anything where the evidence is thin (only 1 user mentioned it).`,
          es: `Sintetizá las siguientes notas de entrevistas de usuarios en hallazgos estructurados.

Notas de entrevistas:
"""
[pegá notas crudas de 3–10 entrevistas acá]
"""

Output:
1. Top 5 temas — cada uno con:
   - Nombre del tema (3–5 palabras)
   - Descripción de 1 oración
   - 2–3 citas directas o paráfrasis que lo respalden
   - Qué segmento de usuario lo mencionó más

2. Top 3 necesidades no cubiertas (cosas que los usuarios dijeron que desearían que existiera o sobre lo que más se quejaron)

3. Huecos — ¿qué preguntas importantes quedan sin respuesta en estas entrevistas?

Restricciones:
- Incluí solo temas respaldados por al menos 2 usuarios diferentes.
- No inventes citas ni agregues suposiciones externas.
- Marcá cualquier cosa donde la evidencia sea escasa (solo 1 usuario lo mencionó).`,
        },
      },
    ],
    faq: [
      {
        q: { en: "Can AI replace user research?", es: "¿Puede la IA reemplazar la investigación de usuarios?" },
        a: {
          en: "No. AI synthesizes information you give it; it cannot observe behavior, pick up on tone, notice what users avoid saying, or ask follow-up questions in the moment. Where AI genuinely saves time is after the research: transcribing, synthesizing across interviews, grouping themes, and drafting summaries. The judgment about which themes matter for your product and which user quotes reveal something real versus situational still needs a PM who understands the context.",
          es: "No. La IA sintetiza la información que le das; no puede observar comportamiento, captar el tono, notar lo que los usuarios evitan decir, ni hacer preguntas de seguimiento en el momento. Donde la IA realmente ahorra tiempo es después de la investigación: transcribir, sintetizar entre entrevistas, agrupar temas y redactar resúmenes. El criterio sobre qué temas importan para tu producto y qué citas de usuarios revelan algo real versus situacional todavía necesita un PM que entienda el contexto.",
        },
      },
      {
        q: { en: "How do I get AI to write a PRD in our internal format?", es: "¿Cómo hago que la IA escriba un PRD en nuestro formato interno?" },
        a: {
          en: "Paste a real example from your team (anonymized or with sensitive details replaced) and say: 'Use exactly this structure and heading format for the new PRD I'm about to describe.' One well-chosen example is more effective than a detailed description of your format — the model infers section order, tone, depth, and terminology from the example. Keep the example short enough that the new content dominates the context.",
          es: "Pegá un ejemplo real de tu equipo (anonimizado o con detalles sensibles reemplazados) y decí: 'Usá exactamente esta estructura y formato de encabezados para el nuevo PRD que voy a describir.' Un ejemplo bien elegido es más efectivo que una descripción detallada de tu formato — el modelo infiere el orden de secciones, el tono, la profundidad y la terminología del ejemplo. Manté el ejemplo lo suficientemente corto como para que el nuevo contenido domine el contexto.",
        },
      },
    ],
  },
  {
    slug: "prompt-templates-for-summarization",
    title: {
      en: "Prompt templates for summarization: documents, meetings, and research",
      es: "Plantillas de prompt para resumir: documentos, reuniones e investigación",
    },
    description: {
      en: "Copy-paste templates to summarize long documents, meeting notes, and research reliably — with format and length controls built in.",
      es: "Plantillas copy-paste para resumir documentos largos, notas de reuniones e investigaciones de forma confiable, con controles de formato y longitud incluidos.",
    },
    sections: [
      {
        heading: { en: "Why most summarization prompts fail", es: "Por qué la mayoría de los prompts de resumen fallan" },
        bullets: {
          en: [
            "No length constraint: 'summarize this' gets whatever length the model prefers, not what you need.",
            "No format specified: prose summaries and bullet lists carry different information density — pick one explicitly.",
            "No audience specified: a summary for a technical team looks nothing like one for an executive or a customer.",
            "No signal about what matters: the model weights recency and repetition by default, not importance to your actual goal.",
            "No instruction for missing info: when input is ambiguous, the model fills gaps with assumptions rather than flagging them.",
          ],
          es: [
            "Sin restricción de longitud: 'resumí esto' da lo que prefiere el modelo, no lo que necesitás.",
            "Sin formato especificado: los resúmenes en prosa y las listas de bullets tienen diferente densidad de información — elegí uno explícitamente.",
            "Sin audiencia especificada: un resumen para un equipo técnico no se parece al de un ejecutivo o un cliente.",
            "Sin señal sobre qué importa: el modelo pondera recencia y repetición por defecto, no la importancia para tu objetivo real.",
            "Sin instrucción para información faltante: cuando el input es ambiguo, el modelo llena huecos con suposiciones en lugar de marcarlos.",
          ],
        },
      },
      {
        heading: { en: "What makes a reliable summarization prompt", es: "Qué hace confiable a un prompt de resumen" },
        bullets: {
          en: [
            "State the audience and purpose: 'For an executive who will not read the original' produces a different summary than 'For a teammate who needs to take action.'",
            "Set a hard length: '5 bullets max', 'under 150 words', '3 sentences'. The constraint forces prioritization.",
            "Name what to preserve: key decisions, numbers, dates, open questions, action items — whatever must survive the compression.",
            "Name what to skip: background the reader knows, examples that only illustrate a point already made, repeated caveats.",
            "Ask for a structured format: headline + bullets + action items is easier to scan and act on than unbroken prose.",
          ],
          es: [
            "Indicá la audiencia y el propósito: 'Para un ejecutivo que no va a leer el original' produce un resumen diferente que 'Para un colega que necesita tomar acción.'",
            "Poné una longitud fija: '5 bullets como máximo', 'menos de 150 palabras', '3 oraciones'. La restricción fuerza la priorización.",
            "Nombrá qué preservar: decisiones clave, números, fechas, preguntas abiertas, ítems de acción — lo que sea que deba sobrevivir la compresión.",
            "Nombrá qué saltear: contexto que el lector ya conoce, ejemplos que solo ilustran un punto ya hecho, advertencias repetidas.",
            "Pedí un formato estructurado: título + bullets + ítems de acción es más fácil de escanear y actuar que prosa sin cortes.",
          ],
        },
      },
    ],
    templates: [
      {
        title: { en: "Document or article summary", es: "Resumen de documento o artículo" },
        purpose: "text",
        target: "claude",
        prompt: {
          en: `Summarize the following document.

Audience: [who will read this — e.g., a product manager, a non-technical executive, a customer]
Purpose: [what they will do with the summary — e.g., decide whether to read the full doc, prepare for a meeting, share with their team]

Output format:
- Headline (1 sentence): the single most important takeaway
- Key points (3–5 bullets): decisions made, numbers that matter, open questions
- Action items (if any): who needs to do what

Constraints:
- Under 200 words total
- Do not include background the audience already knows
- If something is unclear in the source, flag it rather than guessing

Document:
"""
[paste document here]
"""`,
          es: `Resumí el siguiente documento.

Audiencia: [quién va a leer esto — ej: un product manager, un ejecutivo no técnico, un cliente]
Propósito: [qué va a hacer con el resumen — ej: decidir si leer el doc completo, prepararse para una reunión, compartir con su equipo]

Formato de salida:
- Titular (1 oración): el takeaway más importante
- Puntos clave (3–5 bullets): decisiones tomadas, números que importan, preguntas abiertas
- Ítems de acción (si los hay): quién tiene que hacer qué

Restricciones:
- Menos de 200 palabras en total
- No incluyas contexto que la audiencia ya conoce
- Si algo no está claro en el original, marcalo en lugar de adivinar

Documento:
"""
[pegá el documento acá]
"""`,
        },
      },
      {
        title: { en: "Meeting notes summary", es: "Resumen de notas de reunión" },
        purpose: "text",
        target: "gpt",
        prompt: {
          en: `Summarize the following meeting notes into a concise record.

Output format:
## One-line summary
[What was decided or accomplished in one sentence]

## Decisions made
- [Decision 1 — who decided it, if mentioned]
- [Decision 2]

## Open questions
- [Question that was raised but not resolved]

## Action items
| Owner | Task | Due date |
|-------|------|----------|
| [name] | [task] | [date or "TBD"] |

## What was NOT decided
[Scope, timeline, or resource questions still open]

Constraints:
- Keep the format exactly as above
- If the notes don't mention something (e.g., no due dates), use "not mentioned" — do not invent
- Flag any conflict or unresolved disagreement you see in the notes

Meeting notes:
"""
[paste raw meeting notes here]
"""`,
          es: `Resumí las siguientes notas de reunión en un registro conciso.

Formato de salida:
## Resumen en una línea
[Qué se decidió o logró en una oración]

## Decisiones tomadas
- [Decisión 1 — quién la tomó, si se menciona]
- [Decisión 2]

## Preguntas abiertas
- [Pregunta que se planteó pero no se resolvió]

## Ítems de acción
| Responsable | Tarea | Fecha límite |
|-------------|-------|--------------|
| [nombre] | [tarea] | [fecha o "A definir"] |

## Qué NO se decidió
[Alcance, cronograma o preguntas de recursos aún abiertas]

Restricciones:
- Mantené el formato exactamente como está arriba
- Si las notas no mencionan algo (ej: sin fechas límite), usá "no mencionado" — no inventes
- Marcá cualquier conflicto o desacuerdo no resuelto que veas en las notas

Notas de la reunión:
"""
[pegá las notas crudas de la reunión acá]
"""`,
        },
      },
    ],
    faq: [
      {
        q: { en: "Why does AI miss important details in my summaries?", es: "¿Por qué la IA omite detalles importantes en mis resúmenes?" },
        a: {
          en: "By default, models weight recency and frequency — content that appears late in the document or is mentioned multiple times is more likely to surface. If your key detail appears once, early, or in a footnote, it gets compressed out. The fix is to explicitly tell the model what must survive: 'Preserve all decisions, numbers, and action items.' If a specific detail is critical, name it: 'Do not lose the budget figure, even if the section around it is cut.'",
          es: "Por defecto, los modelos ponderan recencia y frecuencia — el contenido que aparece tarde en el documento o se menciona varias veces tiene más probabilidades de aparecer. Si tu detalle clave aparece una vez, al principio, o en una nota al pie, se comprime. El fix es decirle explícitamente al modelo qué debe sobrevivir: 'Preservá todas las decisiones, números y ítems de acción.' Si un detalle específico es crítico, nombralo: 'No perdás la cifra del presupuesto, aunque se corte la sección que la rodea.'",
        },
      },
      {
        q: { en: "How do I summarize a document that is too long to paste?", es: "¿Cómo resumo un documento que es demasiado largo para pegarlo?" },
        a: {
          en: "If the document fits in the model's context window (which for modern models is typically 128k–200k tokens, or roughly 100k–150k words), paste it in full — models handle long inputs well when given explicit output constraints. If it doesn't fit, divide the document into logical sections, summarize each one with the same template, then ask the model to synthesize the section summaries into a final summary. Keep the section summaries short so the final synthesis step has room to work.",
          es: "Si el documento entra en la ventana de contexto del modelo (que para modelos modernos suele ser 128k–200k tokens, o aproximadamente 100k–150k palabras), pegalo completo — los modelos manejan inputs largos bien cuando se les dan restricciones de output explícitas. Si no entra, dividí el documento en secciones lógicas, resumí cada una con la misma plantilla, y luego pedile al modelo que sintetice los resúmenes de sección en un resumen final. Mantené los resúmenes de sección cortos para que el paso de síntesis final tenga espacio para trabajar.",
        },
      },
    ],
  },
  {
    slug: "claude-prompt-guide",
    title: {
      en: "How to write better prompts for Claude",
      es: "Cómo escribir mejores prompts para Claude",
    },
    description: {
      en: "Practical patterns for getting consistent, high-quality output from Claude — what it excels at, how to structure requests, and where it needs explicit guidance.",
      es: "Patrones prácticos para obtener outputs consistentes y de alta calidad de Claude: en qué es fuerte, cómo estructurar pedidos, y dónde necesita instrucciones explícitas.",
    },
    sections: [
      {
        heading: { en: "Where Claude stands out", es: "Dónde Claude se destaca" },
        bullets: {
          en: [
            "Long, nuanced tasks: Claude handles long-context documents (200k token window) better than most models. Paste the full contract, code file, or research paper and ask precise questions about it.",
            "Following complex instructions: Claude is particularly good at applying a long set of rules simultaneously — a style guide, a review rubric, or a multi-part format constraint — without dropping items from the middle.",
            "Calibrated uncertainty: Claude is more likely than other models to say 'I'm not sure' or flag a confidence limitation rather than confidently hallucinating a fact. Useful for research tasks where knowing what is uncertain matters.",
            "Reasoning through ambiguity: when you say 'think through this carefully before answering', Claude tends to produce genuine reasoning steps rather than superficial filler.",
            "Safe text editing: preserving the author's voice, not adding unsolicited opinions, staying in the requested format — Claude respects editorial boundaries well.",
          ],
          es: [
            "Tareas largas y matizadas: Claude maneja documentos con contexto largo (ventana de 200k tokens) mejor que la mayoría de los modelos. Pegá el contrato completo, el archivo de código o el paper de investigación y hacé preguntas precisas sobre él.",
            "Seguir instrucciones complejas: Claude es particularmente bueno aplicando un conjunto largo de reglas simultáneamente — una guía de estilo, una rúbrica de revisión o una restricción de formato de múltiples partes — sin perder ítems del medio.",
            "Incertidumbre calibrada: Claude es más propenso que otros modelos a decir 'No estoy seguro' o marcar una limitación de confianza en lugar de alucinar un hecho con confianza. Útil para tareas de investigación donde importa saber qué es incierto.",
            "Razonar a través de la ambigüedad: cuando decís 'pensá esto cuidadosamente antes de responder', Claude tiende a producir pasos de razonamiento genuinos en lugar de relleno superficial.",
            "Edición segura de textos: preservar la voz del autor, no agregar opiniones no solicitadas, mantenerse en el formato pedido — Claude respeta bien los límites editoriales.",
          ],
        },
      },
      {
        heading: { en: "How to structure requests for Claude", es: "Cómo estructurar pedidos para Claude" },
        bullets: {
          en: [
            "State the goal before the context: Claude is trained to consider early instructions carefully. Put 'your task is X' before pasting a long document, not after.",
            "Be explicit about format: Claude defaults to well-structured prose with headers. If you want bullets only, no prose, or a specific schema, say so directly.",
            "Use 'think step by step' for reasoning tasks: for analysis, comparisons, or multi-step decisions, this phrase reliably produces more reasoned output.",
            "Tell Claude what to skip: 'Do not add caveats about AI limitations', 'Do not start with a restatement of my request', 'Do not offer alternatives I didn't ask for' — Claude respects these constraints.",
            "For very long inputs, anchor the task at the end too: after pasting a 50-page document, repeat the core instruction in 1 sentence. Claude reads the whole context but the final instruction carries recency weight.",
          ],
          es: [
            "Poné el objetivo antes del contexto: Claude está entrenado para considerar con cuidado las instrucciones tempranas. Poné 'tu tarea es X' antes de pegar un documento largo, no después.",
            "Sé explícito sobre el formato: Claude usa por defecto prosa bien estructurada con encabezados. Si querés solo bullets, sin prosa, o un esquema específico, decilo directamente.",
            "Usá 'pensá paso a paso' para tareas de razonamiento: para análisis, comparaciones o decisiones de múltiples pasos, esta frase produce de manera confiable outputs más razonados.",
            "Decile a Claude qué saltear: 'No agregues advertencias sobre limitaciones de la IA', 'No empieces con una repetición de mi pedido', 'No ofrezcas alternativas que no pedí' — Claude respeta estas restricciones.",
            "Para inputs muy largos, ancorá la tarea al final también: después de pegar un documento de 50 páginas, repetí la instrucción central en 1 oración. Claude lee todo el contexto pero la instrucción final tiene peso de recencia.",
          ],
        },
      },
    ],
    templates: [
      {
        title: { en: "Structured analysis with Claude", es: "Análisis estructurado con Claude" },
        purpose: "text",
        target: "claude",
        prompt: {
          en: `Your task: analyze the document below and answer the specific questions listed.

Think through the document carefully before answering. If a question cannot be answered from the document alone, say so explicitly rather than guessing.

Questions to answer:
1. [Your first specific question]
2. [Your second specific question]
3. [Your third specific question]

Format: answer each question with a label (Q1:, Q2:, Q3:), followed by 2–4 sentences. Use a bullet for evidence when citing a specific part of the document.

Do not include an introduction or conclusion. Start directly with Q1.

Document:
"""
[paste document here]
"""`,
          es: `Tu tarea: analizá el documento de abajo y respondé las preguntas específicas listadas.

Pensá cuidadosamente en el documento antes de responder. Si una pregunta no puede responderse solo con el documento, decilo explícitamente en lugar de adivinar.

Preguntas a responder:
1. [Tu primera pregunta específica]
2. [Tu segunda pregunta específica]
3. [Tu tercera pregunta específica]

Formato: respondé cada pregunta con una etiqueta (P1:, P2:, P3:), seguida de 2–4 oraciones. Usá un bullet para evidencia cuando citás una parte específica del documento.

No incluyas una introducción ni conclusión. Empezá directamente con P1.

Documento:
"""
[pegá el documento acá]
"""`,
        },
      },
      {
        title: { en: "Claude as a writing editor", es: "Claude como editor de escritura" },
        purpose: "text",
        target: "claude",
        prompt: {
          en: `Edit the following text for clarity and concision.

Rules:
- Preserve my voice and phrasing wherever possible — only change what genuinely obscures the meaning
- Do not add information, opinions, or examples I did not include
- Do not convert my sentence structure to yours — if I use short sentences, keep them short
- Flag any sentence you are unsure about rather than silently rewriting it
- Do not add caveats or qualifications I did not write

Output format:
1. The edited text (full version)
2. A brief note on what you changed and why (3–5 bullets max)

Text to edit:
"""
[paste your draft here]
"""`,
          es: `Editá el siguiente texto para mayor claridad y concisión.

Reglas:
- Preservá mi voz y fraseado siempre que sea posible — solo cambiá lo que genuinamente oscurece el significado
- No agregues información, opiniones ni ejemplos que yo no incluí
- No conviertas mi estructura de oraciones a la tuya — si uso oraciones cortas, mantenerlas cortas
- Marcá cualquier oración de la que no estés seguro en lugar de reescribirla silenciosamente
- No agregues advertencias ni calificaciones que yo no escribí

Formato de salida:
1. El texto editado (versión completa)
2. Una nota breve sobre qué cambiaste y por qué (máximo 3–5 bullets)

Texto a editar:
"""
[pegá tu borrador acá]
"""`,
        },
      },
    ],
    faq: [
      {
        q: { en: "Does Claude need a system prompt?", es: "¿Claude necesita un system prompt?" },
        a: {
          en: "Not necessarily, but a clear role and ruleset at the top of your prompt acts like one. Claude respects early instructions carefully, so opening with 'You are a concise editor. Rules: preserve the author's voice, flag uncertainty, no added opinions.' shapes the entire response. For chat interfaces where you can't set a true system prompt, this pattern is the practical equivalent.",
          es: "No necesariamente, pero un rol claro y un conjunto de reglas al principio del prompt actúa como uno. Claude respeta las instrucciones tempranas con cuidado, así que abrir con 'Sos un editor conciso. Reglas: preservá la voz del autor, marcá la incertidumbre, sin opiniones agregadas.' da forma a toda la respuesta. Para interfaces de chat donde no podés establecer un system prompt real, este patrón es el equivalente práctico.",
        },
      },
      {
        q: { en: "When should I use Claude versus GPT or Gemini?", es: "¿Cuándo usar Claude versus GPT o Gemini?" },
        a: {
          en: "Claude tends to perform better for tasks requiring careful instruction-following, long-document analysis, preserving an author's voice during editing, and nuanced reasoning where getting things wrong has real costs (legal, medical, financial). GPT and Gemini have their own strengths — GPT has deep tool-use and plugin ecosystems, Gemini integrates tightly with Google Workspace. For general tasks, the best model is often whichever one you have access to and have already tested with your specific prompts.",
          es: "Claude tiende a rendir mejor para tareas que requieren seguimiento cuidadoso de instrucciones, análisis de documentos largos, preservar la voz de un autor durante la edición, y razonamiento matizado donde equivocarse tiene costos reales (legales, médicos, financieros). GPT y Gemini tienen sus propias fortalezas — GPT tiene ecosistemas profundos de uso de herramientas y plugins, Gemini se integra estrechamente con Google Workspace. Para tareas generales, el mejor modelo suele ser el que ya tenés acceso y ya probaste con tus prompts específicos.",
        },
      },
    ],
  },
  {
    slug: "ai-prompts-for-sales",
    title: {
      en: "AI prompts for sales teams: outreach, discovery, and proposals",
      es: "Prompts de IA para equipos de ventas: outreach, discovery y propuestas",
    },
    description: {
      en: "Copy-paste prompt templates for the recurring sales workflows where AI genuinely saves time — cold outreach, discovery prep, and proposal writing.",
      es: "Plantillas de prompts copy-paste para los flujos de trabajo de ventas donde la IA realmente ahorra tiempo: outreach en frío, preparación de discovery y escritura de propuestas.",
    },
    sections: [
      {
        heading: { en: "Where AI fits in a sales workflow", es: "Dónde encaja la IA en un flujo de trabajo de ventas" },
        bullets: {
          en: [
            "Personalized outreach at scale: drafting a first email tailored to a prospect's role, company, and recent news is faster with AI — but you must give it the specifics, not let it invent them.",
            "Discovery call prep: summarizing a prospect's business from their website, press releases, and LinkedIn before a call saves 30–60 minutes of manual research.",
            "Objection anticipation: 'What are the top 5 objections a [role] at a [company type] would have to adopting [your solution]?' gives you a sharper prep list than guessing.",
            "Proposal first drafts: an executive summary, ROI framing, and scope section from a template is faster to refine than to write from scratch for each deal.",
            "Follow-up sequencing: 'Write a 3-email follow-up sequence for a prospect who went quiet after a positive demo' is a task AI handles well with the right context.",
          ],
          es: [
            "Outreach personalizado a escala: redactar un primer email adaptado al rol, empresa y noticias recientes de un prospecto es más rápido con IA — pero tenés que darle los detalles específicos, no dejar que los invente.",
            "Preparación de llamada de discovery: resumir el negocio de un prospecto desde su sitio web, comunicados de prensa y LinkedIn antes de una llamada ahorra 30–60 minutos de investigación manual.",
            "Anticipación de objeciones: '¿Cuáles son las 5 principales objeciones que tendría un [rol] en una [tipo de empresa] para adoptar [tu solución]?' te da una lista de preparación más precisa que adivinar.",
            "Primeros borradores de propuestas: un resumen ejecutivo, encuadre de ROI y sección de alcance a partir de una plantilla es más rápido de refinar que escribir desde cero para cada deal.",
            "Secuenciación de seguimiento: 'Escribí una secuencia de 3 emails de seguimiento para un prospecto que quedó en silencio después de una demo positiva' es una tarea que la IA maneja bien con el contexto correcto.",
          ],
        },
      },
      {
        heading: { en: "How to get personalized output, not generic filler", es: "Cómo obtener output personalizado, no relleno genérico" },
        bullets: {
          en: [
            "Paste real context: the prospect's job title, company size, industry, a recent news item, or a pain point they've mentioned. AI cannot personalize from nothing.",
            "Specify the tone and relationship: 'We have never spoken' produces a different email than 'We met briefly at SaaStr and they mentioned they were evaluating tools.'",
            "Name the call to action: 'The only goal of this email is to get a 20-minute call. Do not pitch features. Do not over-explain.' Generic outreach pitches the product; good outreach pitches the conversation.",
            "Ask for multiple variations: 'Write 3 versions of this subject line' gives you options without extra prompts.",
            "Review before sending: AI drafts are starting points. Read every word before hitting send — a wrong company name, wrong product feature, or a tone that doesn't fit you is worse than no email at all.",
          ],
          es: [
            "Pegá contexto real: el cargo del prospecto, tamaño de empresa, industria, una noticia reciente, o un pain point que hayan mencionado. La IA no puede personalizar desde la nada.",
            "Especificá el tono y la relación: 'Nunca hablamos' produce un email diferente que 'Nos cruzamos brevemente en SaaStr y mencionaron que estaban evaluando herramientas.'",
            "Nombrá el call to action: 'El único objetivo de este email es conseguir una llamada de 20 minutos. No presentes features. No sobre-expliques.' El outreach genérico presenta el producto; el outreach bueno presenta la conversación.",
            "Pedí múltiples variaciones: 'Escribí 3 versiones de este asunto' te da opciones sin prompts extra.",
            "Revisá antes de enviar: los borradores de IA son puntos de partida. Leé cada palabra antes de enviar — un nombre de empresa incorrecto, una feature incorrecta del producto, o un tono que no te representa es peor que no enviar nada.",
          ],
        },
      },
    ],
    templates: [
      {
        title: { en: "Cold outreach email (first touch)", es: "Email de outreach en frío (primer contacto)" },
        purpose: "text",
        target: "gpt",
        prompt: {
          en: `Write a cold outreach email for a sales first touch.

Context:
- My name: [Your name]
- My role: [Your role, e.g. Account Executive at Acme]
- What we sell: [One sentence — what it does, not features]
- Prospect's name: [Name]
- Prospect's role: [Title]
- Prospect's company: [Company name] — [industry, size if known]
- Specific reason for reaching out: [a recent news item, a trigger event, a role-specific pain point — be specific, do not invent]

Goal of this email: get a 20-minute exploratory call. Nothing else.

Rules:
- Subject line: under 8 words, no clickbait
- Opening: reference the specific reason for reaching out in the first sentence
- Do not list product features
- Do not use words like "synergies", "leverage", "solution", or "game-changer"
- CTA: one specific ask (a call link, a reply, a specific date/time)
- Length: under 120 words total
- Tone: direct and respectful — not casual, not corporate

Output: the subject line, then the email body.`,
          es: `Escribí un email de outreach en frío para un primer contacto de ventas.

Contexto:
- Mi nombre: [Tu nombre]
- Mi rol: [Tu rol, ej. Account Executive en Acme]
- Qué vendemos: [Una oración — qué hace, no features]
- Nombre del prospecto: [Nombre]
- Rol del prospecto: [Cargo]
- Empresa del prospecto: [Nombre de empresa] — [industria, tamaño si se sabe]
- Razón específica para contactar: [una noticia reciente, un evento trigger, un pain point específico del rol — sé específico, no inventes]

Objetivo de este email: conseguir una llamada exploratoria de 20 minutos. Nada más.

Reglas:
- Asunto: menos de 8 palabras, sin clickbait
- Apertura: referenciá la razón específica para contactar en la primera oración
- No listes features del producto
- No uses palabras como "sinergias", "apalancar", "solución integral" o "cambio de juego"
- CTA: un solo pedido específico (link de llamada, respuesta, fecha/hora específica)
- Longitud: menos de 120 palabras en total
- Tono: directo y respetuoso — ni casual, ni corporativo

Output: el asunto, luego el cuerpo del email.`,
        },
      },
      {
        title: { en: "Proposal executive summary", es: "Resumen ejecutivo de propuesta" },
        purpose: "text",
        target: "claude",
        prompt: {
          en: `Write an executive summary section for a sales proposal.

Deal context:
- Prospect: [Company name] — [industry, size]
- Decision maker: [Name, title]
- Problem they described: [In their words if possible — what they said the pain is]
- What we are proposing: [Brief description of scope]
- Key business outcome they want: [The metric or result they care about — not our pitch, their goal]
- Timeline: [Their desired timeline]

Rules for the executive summary:
- Start with their problem, not our product
- Use their language for the problem, not ours
- State the outcome we are committing to (not features we are delivering)
- Under 200 words
- No jargon, no acronyms unless they used them first
- End with one sentence about why we are the right partner for this (specific reason, not generic)

Do not write the full proposal — only the executive summary section.`,
          es: `Escribí una sección de resumen ejecutivo para una propuesta de ventas.

Contexto del deal:
- Prospecto: [Nombre de empresa] — [industria, tamaño]
- Tomador de decisiones: [Nombre, cargo]
- Problema que describieron: [En sus palabras si es posible — qué dijeron que es el dolor]
- Qué estamos proponiendo: [Descripción breve del alcance]
- Resultado de negocio clave que quieren: [La métrica o resultado que les importa — no nuestro pitch, su objetivo]
- Cronograma: [Su cronograma deseado]

Reglas para el resumen ejecutivo:
- Empezá con su problema, no con nuestro producto
- Usá su lenguaje para el problema, no el nuestro
- Indicá el resultado al que nos comprometemos (no las features que entregamos)
- Menos de 200 palabras
- Sin jerga, sin siglas a menos que ellos las hayan usado primero
- Terminá con una oración sobre por qué somos el socio correcto para esto (razón específica, no genérica)

No escribas la propuesta completa — solo la sección de resumen ejecutivo.`,
        },
      },
    ],
    faq: [
      {
        q: { en: "Can AI write follow-up emails that don't sound like AI wrote them?", es: "¿Puede la IA escribir emails de seguimiento que no suenen a que los escribió una IA?" },
        a: {
          en: "Yes, with the right constraints. The reason AI follow-ups sound generic is that the prompt was generic — 'write a follow-up email' with no context. The fix: give the model the prospect's name, what was discussed in the last call, what they said their biggest concern was, and what the agreed next step was. Add 'match my tone exactly — do not add enthusiasm I did not express.' With real context and a tone constraint, the output is much closer to how you actually write.",
          es: "Sí, con las restricciones correctas. La razón por la que los seguimientos de IA suenan genéricos es que el prompt era genérico — 'escribí un email de seguimiento' sin contexto. El fix: darle al modelo el nombre del prospecto, qué se discutió en la última llamada, cuál dijeron que era su mayor preocupación, y cuál fue el siguiente paso acordado. Agregar 'adaptá exactamente mi tono — no agregues entusiasmo que yo no expresé.' Con contexto real y una restricción de tono, el output es mucho más cercano a cómo realmente escribís.",
        },
      },
      {
        q: { en: "What sales tasks should I NOT use AI for?", es: "¿Qué tareas de ventas NO debería usar IA?" },
        a: {
          en: "Live conversations: calls, real-time negotiations, and relationship-building moments where the prospect can sense you are not present. Relationship history: AI does not know the trust and context built over months of relationship — do not let it rewrite an email to a key account without reading it yourself. Reference checks: never use AI to write what appears to be a customer quote or reference. Anything requiring real verification: if the accuracy of a claim matters (pricing, legal terms, technical specs), verify it yourself before it goes to the prospect.",
          es: "Conversaciones en vivo: llamadas, negociaciones en tiempo real y momentos de construcción de relaciones donde el prospecto puede sentir que no estás presente. Historia de relación: la IA no conoce la confianza y el contexto construidos durante meses de relación — no la dejes reescribir un email a una cuenta clave sin leerlo vos mismo. Referencias: nunca uses IA para escribir lo que parece ser una cita o referencia de cliente. Cualquier cosa que requiera verificación real: si la precisión de una afirmación importa (precios, términos legales, specs técnicas), verificala vos mismo antes de que llegue al prospecto.",
        },
      },
    ],
  },
];

export function getGuide(slug: string): Guide | undefined {
  return guides.find((g) => g.slug === slug);
}
