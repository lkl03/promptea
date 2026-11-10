// lib/prompts/daily.ts
//
// Deterministic "Prompt of the Day" rotation.
// No database required — index is derived from the date so the same
// prompt is shown to every visitor on the same calendar day.

import type { Lang } from "@/lib/domain";
import type { Locale } from "@/lib/seo/site";
import type { Purpose, TargetModel } from "@/lib/seo/prefill";

export type DailyPrompt = {
  category: "coding" | "marketing" | "study" | "analysis" | "data" | "image" | "business" | "writing" | "creativity";
  purpose: Purpose;
  target: TargetModel;
  title: Record<Lang, string>;
  prompt: Record<Lang, string>;
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
      pt: "Consultor de produto brutalmente honesto",
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
      pt: `Aja como um consultor de produto brutalmente honesto.
Analise esta ideia de landing page e me diga por que os usuários a ignorariam — sem dourar a pílula.
Liste 5 motivos específicos, ordenados por impacto, e uma correção prática para cada um.

Ideia de landing:
"""[cole sua ideia aqui]"""`,
    },
  },
  {
    category: "coding",
    purpose: "code",
    target: "claude",
    title: {
      es: "Idea suelta → issue de GitHub listo para devs",
      en: "Messy idea → developer-ready GitHub issue",
      pt: "Ideia bagunçada → issue do GitHub pronta para o dev",
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
      pt: `Transforme esta ideia bagunçada de funcionalidade em uma issue do GitHub pronta para o desenvolvedor.
Inclua:
- Resumo de 1 a 2 linhas.
- Critérios de aceitação claros (Dado/Quando/Então).
- Casos de borda e como tratá-los.
- Testes sugeridos (unitários + um de ponta a ponta).
- Riscos e dependências.

Ideia bruta:
"""[cole a ideia aqui]"""`,
    },
  },
  {
    category: "study",
    purpose: "study",
    target: "gpt",
    title: {
      es: "Explicame esto al 80/20",
      en: "Explain this to me 80/20 style",
      pt: "Explique para mim no estilo 80/20",
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
      pt: `Explique [assunto] como se eu fosse inteligente, mas impaciente.
Quero:
- O 80/20 — só o que realmente importa.
- Um exemplo concreto que faça a ficha cair.
- Uma armadilha comum para evitar.
- Uma pergunta que eu deveria conseguir responder depois de ler você.`,
    },
  },
  {
    category: "creativity",
    purpose: "text",
    target: "claude",
    title: {
      es: "Anti-vaguedad para prompts",
      en: "Anti-vagueness prompt rewrite",
      pt: "Reescrita de prompt antivagueza",
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
      pt: `Reescreva meu prompt para que uma IA não consiga responder de forma vaga nem alucinar.
Obrigue-a a fazer perguntas quando faltar contexto.
Retorne:
- O prompt reescrito.
- 3 perguntas que a IA deveria fazer se o contexto for insuficiente.
- 1 exemplo de resposta aceitável e 1 exemplo de resposta inaceitável.

Meu prompt atual:
"""[cole seu prompt aqui]"""`,
    },
  },
  {
    category: "business",
    purpose: "text",
    target: "gpt",
    title: {
      es: "Idea de negocio → plan de validación de 1 página",
      en: "Business idea → one-page validation plan",
      pt: "Ideia de negócio → plano de validação de uma página",
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
      pt: `Transforme esta ideia de negócio em um plano de validação de uma página.
Estrutura:
- Hipótese central e suposições arriscadas.
- Público inicial e onde encontrá-lo.
- 3 experimentos baratos para validar (cada um com custo, duração e métrica de sucesso).
- Os 3 principais riscos.
- Decisão clara: manter / pivotar / encerrar.

Ideia:
"""[cole a ideia aqui]"""`,
    },
  },
  {
    category: "data",
    purpose: "data",
    target: "gemini",
    title: {
      es: "Schema JSON con ejemplos buenos y malos",
      en: "JSON schema with good and bad examples",
      pt: "JSON Schema com exemplos bons e ruins",
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
      pt: `Gere um JSON Schema (draft 2020-12) para este fluxo de trabalho:
"""[descreva o fluxo de trabalho]"""

Retorne:
- O schema completo e válido.
- 3 exemplos válidos e variados.
- 1 exemplo inválido com o motivo exato da falha.

Entregue em blocos separados, sem texto extra fora de cada bloco.`,
    },
  },
  {
    category: "image",
    purpose: "image",
    target: "gemini",
    title: {
      es: "Prompt de imagen cinematográfico",
      en: "Cinematic image prompt",
      pt: "Prompt de imagem cinematográfica",
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
      pt: `Crie um prompt de imagem cinematográfica para este conceito:
"""[descreva o conceito]"""

Inclua:
- Sujeito principal e ação.
- Estilo (lente, tipo de filme, referência visual).
- Composição e enquadramento.
- Iluminação (horário, direção, intensidade).
- Clima / paleta.
- Proporção sugerida.
- Negativos (o que NÃO deve aparecer).

Retorne o prompt pronto para copiar e colar em uma IA generativa.`,
    },
  },
  {
    category: "marketing",
    purpose: "marketing",
    target: "gpt",
    title: {
      es: "Hook que detiene el scroll",
      en: "Scroll-stopping hook",
      pt: "Gancho que faz parar de rolar a tela",
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
      pt: `Gere 5 ganchos que façam parar de rolar a tela para [produto/serviço], voltados para [público].
Regras:
- Sem clichês ("transforme sua vida", "o nº 1" etc.).
- Cada gancho deve tocar em uma dor específica, não genérica.
- Diga qual emoção cada um desperta.
- Ranking final do mais forte ao mais fraco, com uma justificativa de 1 linha.`,
    },
  },
  {
    category: "analysis",
    purpose: "text",
    target: "claude",
    title: {
      es: "Pre-mortem en 10 minutos",
      en: "10-minute pre-mortem",
      pt: "Pre-mortem de 10 minutos",
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
      pt: `Faça um pre-mortem deste projeto:
"""[descreva o projeto e o prazo]"""

Imagine que ele já fracassou e reconstrua o porquê.
Retorne:
- 5 modos de falha plausíveis, ordenados por probabilidade.
- Para cada um: um sinal precoce que poderíamos detectar e uma ação preventiva concreta.
- 1 suposição do projeto que provavelmente está errada, mas ninguém questiona.`,
    },
  },
  {
    category: "writing",
    purpose: "text",
    target: "claude",
    title: {
      es: "Reescritura con menos palabras y más impacto",
      en: "Rewrite with fewer words and more impact",
      pt: "Reescreva com menos palavras e mais impacto",
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
      pt: `Reescreva este texto usando metade das palavras, sem perder clareza.
Regras:
- Mantenha o sentido e os fatos intactos.
- Corte enrolação, advérbios fracos e voz passiva desnecessária.
- Retorne 2 versões: uma mais profissional e uma mais natural.
- Termine com 3 pontos concretos que ainda podem melhorar.

Texto:
"""[cole o texto aqui]"""`,
    },
  },
  {
    category: "coding",
    purpose: "code",
    target: "deepseek",
    title: {
      es: "Bug-hunt con tests primero",
      en: "Tests-first bug hunt",
      pt: "Caça ao bug com testes primeiro",
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
      pt: `Tenho um bug que não consigo reproduzir de forma consistente:
"""[descrição do bug + ambiente]"""

Antes de propor uma correção:
1. Liste 5 hipóteses de causa raiz, ordenadas por probabilidade.
2. Para cada uma, escreva um teste (com código) que a confirme ou descarte.
3. Só então proponha a correção mínima, assumindo a hipótese mais provável.
4. Termine dizendo como evitar um bug assim no futuro.`,
    },
  },
  {
    category: "creativity",
    purpose: "text",
    target: "grok",
    title: {
      es: "5 explicaciones para el mismo concepto",
      en: "5 explanations for the same concept",
      pt: "5 explicações para o mesmo conceito",
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
      pt: `Explique [assunto] de 5 maneiras diferentes:
1. Para uma criança de 10 anos.
2. Como uma analogia esportiva.
3. Como um meme.
4. Como um parágrafo técnico para um especialista.
5. Como um conto de 3 frases.

Termine dizendo qual das cinco capta melhor o conceito e por quê.`,
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
  const map: Record<DailyPrompt["category"], Record<Lang, string>> = {
    coding: { es: "Código", en: "Coding", pt: "Programação" },
    marketing: { es: "Marketing", en: "Marketing", pt: "Marketing" },
    study: { es: "Estudio", en: "Study", pt: "Estudo" },
    analysis: { es: "Análisis", en: "Analysis", pt: "Análise" },
    data: { es: "Data / JSON", en: "Data / JSON", pt: "Dados / JSON" },
    image: { es: "Imagen", en: "Image", pt: "Imagem" },
    business: { es: "Negocio", en: "Business", pt: "Negócios" },
    writing: { es: "Escritura", en: "Writing", pt: "Escrita" },
    creativity: { es: "Creatividad", en: "Creativity", pt: "Criatividade" },
  };
  return map[category][lang];
}
