// lib/seo/content/analyzerContent.ts
//
// v1.8.6 — the explanatory copy around the prompt analyzer, aimed at people who
// search for a "prompt analyzer" (US English first; es/pt keep the same
// structure). Two places use it, with different text so they do not compete:
//
//   - /{lang}/landing/prompt-analyzer: before → after examples and the long FAQ;
//   - /{lang}/analyzer (below the tool): what it checks, a short FAQ, links.
//
// The scores of the examples are not written by hand: they are what the
// deterministic engine returns for each prompt in each language, and
// lib/__tests__/seo.analyzer.test.ts fails when an engine change moves them, so
// the page never shows a number the tool would not reproduce.

import type { Locale } from "../site";
import type { Purpose, TargetModel } from "../prefill";

type L<T = string> = Record<Locale, T>;

export type AnalyzerExample = {
  id: string;
  title: L;
  purpose: Purpose;
  target: TargetModel;
  before: L;
  after: L;
  /** Engine score of `before` / `after`, per language (test-enforced). */
  score: L<{ before: number; after: number }>;
  /** What changed, in one or two sentences. */
  why: L;
};

export type Faq = { q: L; a: L };

export const ANALYZER_EXAMPLES: AnalyzerExample[] = [
  {
    id: "marketing",
    title: {
      en: "Marketing copy: from a one-liner to a brief",
      es: "Copy de marketing: de una línea a un brief",
      pt: "Copy de marketing: de uma linha a um briefing",
    },
    purpose: "marketing",
    target: "gpt",
    before: {
      en: "Write a product description for our app.",
      es: "Escribí una descripción de producto para nuestra app.",
      pt: "Escreva uma descrição de produto para o nosso app.",
    },
    after: {
      en: `Write a product description for Tasklight, our to-do app for freelancers.
Audience: freelance designers who juggle 5+ clients.
Goal: get them to start the free trial.
Include: the two features that matter most to them (client folders, invoice reminders) and one concrete benefit.
Constraints: 80–100 words, plain language, no superlatives or made-up stats.
Call to action: end with "Start your free 14-day trial".
Output format: a headline (max 8 words), then one paragraph.
Success check: a freelancer can tell in one read what Tasklight does and what to click.`,
      es: `Escribí una descripción de producto para Tasklight, nuestra app de tareas para freelancers.
Audiencia: diseñadores freelance que manejan 5 o más clientes.
Objetivo: que empiecen la prueba gratis.
Incluí: las dos funciones que más les importan (carpetas por cliente, recordatorios de facturas) y un beneficio concreto.
Restricciones: 80–100 palabras, lenguaje simple, sin superlativos ni datos inventados.
Llamado a la acción: cerrá con "Empezá tu prueba gratis de 14 días".
Formato de salida: un título (máximo 8 palabras) y después un párrafo.
Criterio de éxito: un freelancer entiende en una lectura qué hace Tasklight y dónde hacer clic.`,
      pt: `Escreva uma descrição de produto para o Tasklight, nosso app de tarefas para freelancers.
Público: designers freelancers que atendem 5 ou mais clientes.
Objetivo: fazer com que comecem o teste grátis.
Inclua: as duas funções que mais importam para eles (pastas por cliente, lembretes de fatura) e um benefício concreto.
Restrições: 80–100 palavras, linguagem simples, sem superlativos nem dados inventados.
Chamada para ação: termine com "Comece seu teste grátis de 14 dias".
Formato de saída: um título (no máximo 8 palavras) e depois um parágrafo.
Critério de sucesso: um freelancer entende em uma leitura o que o Tasklight faz e onde clicar.`,
    },
    score: { en: { before: 20, after: 64 }, es: { before: 26, after: 70 }, pt: { before: 26, after: 70 } },
    why: {
      en: "The analyzer flagged a missing audience, context, output format and call to action. The rewrite states all four, plus a length limit and a way to check the result.",
      es: "El analizador marcó que faltaban la audiencia, el contexto, el formato de salida y el llamado a la acción. La versión nueva dice las cuatro cosas, más un límite de largo y una forma de verificar el resultado.",
      pt: "O analisador apontou que faltavam o público, o contexto, o formato de saída e a chamada para ação. A nova versão traz os quatro, além de um limite de tamanho e um jeito de conferir o resultado.",
    },
  },
  {
    id: "debugging",
    title: {
      en: "Debugging: from \"fix it\" to a reproducible bug report",
      es: "Depuración: de \"arreglalo\" a un reporte de bug reproducible",
      pt: "Depuração: de \"conserta\" a um relato de bug reproduzível",
    },
    purpose: "code",
    target: "claude",
    before: {
      en: "my code doesn't work, fix it",
      es: "mi código no funciona, arreglalo",
      pt: "meu código não funciona, conserta",
    },
    after: {
      en: `My Python function returns None instead of the total.
Expected: sum_prices([{"price": 2}, {"price": 3}]) returns 5.
Actual: it returns None. No error is raised.
Code:
def sum_prices(items):
    total = 0
    for item in items:
        total += item["price"]
Constraints: keep the signature; Python 3.11; no new dependencies.
Steps to reproduce: call sum_prices([{"price": 2}, {"price": 3}]) in a Python 3.11 shell.
Output format: 1) the cause in one sentence, 2) the fixed function in a code block, 3) one pytest test that would have caught it.`,
      es: `Mi función de Python devuelve None en vez del total.
Esperado: sum_prices([{"price": 2}, {"price": 3}]) devuelve 5.
Real: devuelve None. No tira ningún error.
Código:
def sum_prices(items):
    total = 0
    for item in items:
        total += item["price"]
Restricciones: mantené la firma; Python 3.11; sin dependencias nuevas.
Pasos para reproducir: llamá sum_prices([{"price": 2}, {"price": 3}]) en una consola de Python 3.11.
Formato de salida: 1) la causa en una oración, 2) la función corregida en un bloque de código, 3) un test de pytest que lo habría detectado.`,
      pt: `Minha função em Python retorna None em vez do total.
Esperado: sum_prices([{"price": 2}, {"price": 3}]) retorna 5.
Real: retorna None. Nenhum erro é lançado.
Código:
def sum_prices(items):
    total = 0
    for item in items:
        total += item["price"]
Restrições: mantenha a assinatura; Python 3.11; sem dependências novas.
Passos para reproduzir: chame sum_prices([{"price": 2}, {"price": 3}]) em um terminal do Python 3.11.
Formato de saída: 1) a causa em uma frase, 2) a função corrigida em um bloco de código, 3) um teste de pytest que teria pegado o erro.`,
    },
    score: { en: { before: 19, after: 84 }, es: { before: 19, after: 82 }, pt: { before: 25, after: 82 } },
    why: {
      en: "A debugging prompt needs what you expected, what happened, the code and how to reproduce it. With those four the model can find the bug instead of guessing it (here, the missing return).",
      es: "Un prompt de depuración necesita qué esperabas, qué pasó, el código y cómo reproducirlo. Con esas cuatro cosas el modelo encuentra el bug en vez de adivinarlo (acá, el return que falta).",
      pt: "Um prompt de depuração precisa do que você esperava, do que aconteceu, do código e de como reproduzir. Com essas quatro coisas o modelo encontra o bug em vez de adivinhar (aqui, o return que falta).",
    },
  },
  {
    id: "data",
    title: {
      en: "JSON extraction: a decent score that still misses the schema",
      es: "Extracción a JSON: un puntaje aceptable al que todavía le falta el esquema",
      pt: "Extração para JSON: uma pontuação razoável que ainda não tem o esquema",
    },
    purpose: "data",
    target: "gemini",
    before: {
      en: "Extract the important info from these emails as JSON.",
      es: "Extraé la info importante de estos emails como JSON.",
      pt: "Extraia as informações importantes destes e-mails em JSON.",
    },
    after: {
      en: `Context: these are emails from our sales inbox; the result fills our team calendar.
Extract every meeting request from the emails below.
Return only JSON: an array of objects with the fields "sender" (string), "date" (YYYY-MM-DD or null), "time" (HH:MM, 24h, or null) and "topic" (max 10 words).
If an email has no meeting request, skip it. If a field is missing, use null; do not guess.
Example: [{"sender": "Ana Ruiz", "date": "2026-11-20", "time": "15:00", "topic": "Q4 budget review"}]
Emails:
"""
[paste the emails here]
"""`,
      es: `Contexto: son emails de nuestra casilla de ventas; el resultado carga el calendario del equipo.
Extraé cada pedido de reunión de los emails de abajo.
Devolvé solo JSON: un array de objetos con los campos "sender" (string), "date" (AAAA-MM-DD o null), "time" (HH:MM, 24 h, o null) y "topic" (máximo 10 palabras).
Si un email no pide una reunión, salteálo. Si falta un campo, usá null; no adivines.
Ejemplo: [{"sender": "Ana Ruiz", "date": "2026-11-20", "time": "15:00", "topic": "Revisión del presupuesto del Q4"}]
Emails:
"""
[pegá los emails acá]
"""`,
      pt: `Contexto: são e-mails da nossa caixa de vendas; o resultado alimenta o calendário da equipe.
Extraia cada pedido de reunião dos e-mails abaixo.
Retorne só JSON: um array de objetos com os campos "sender" (string), "date" (AAAA-MM-DD ou null), "time" (HH:MM, 24 h, ou null) e "topic" (no máximo 10 palavras).
Se um e-mail não pedir reunião, pule. Se faltar um campo, use null; não invente.
Exemplo: [{"sender": "Ana Ruiz", "date": "2026-11-20", "time": "15:00", "topic": "Revisão do orçamento do Q4"}]
E-mails:
"""
[cole os e-mails aqui]
"""`,
    },
    score: { en: { before: 63, after: 78 }, es: { before: 63, after: 75 }, pt: { before: 63, after: 78 } },
    why: {
      en: "Asking for JSON already earns points for output format, but without fields, types or the input the model invents its own schema every run. Naming the fields, the null rule and one example makes the output parseable.",
      es: "Pedir JSON ya suma puntos de formato de salida, pero sin campos, tipos ni el texto de entrada el modelo inventa su propio esquema en cada corrida. Nombrar los campos, la regla del null y un ejemplo hace que la salida se pueda parsear.",
      pt: "Pedir JSON já rende pontos de formato de saída, mas sem campos, tipos nem o texto de entrada o modelo inventa o próprio esquema a cada execução. Nomear os campos, a regra do null e um exemplo torna a saída analisável.",
    },
  },
];

/** The long FAQ of /landing/prompt-analyzer (visible text and FAQPage come from here). */
export function analyzerLandingFaq(families: string): Faq[] {
  return [
    {
      q: { en: "What is a prompt analyzer?", es: "¿Qué es un analizador de prompts?", pt: "O que é um analisador de prompts?" },
      a: {
        en: "A tool that reads a prompt before you send it to an AI and tells you what is missing: the goal, the context, the constraints, the output format or a way to check the answer. Promptea also scores the prompt from 0 to 100 and writes an improved version.",
        es: "Una herramienta que lee un prompt antes de que lo mandes a una IA y te dice qué le falta: el objetivo, el contexto, las restricciones, el formato de salida o una forma de verificar la respuesta. Promptea además le pone un puntaje de 0 a 100 y escribe una versión mejorada.",
        pt: "Uma ferramenta que lê um prompt antes de você enviá-lo a uma IA e diz o que falta: o objetivo, o contexto, as restrições, o formato de saída ou um jeito de conferir a resposta. O Promptea também dá uma pontuação de 0 a 100 e escreve uma versão melhorada.",
      },
    },
    {
      q: { en: "How is the score calculated?", es: "¿Cómo se calcula el puntaje?", pt: "Como a pontuação é calculada?" },
      a: {
        en: "Six criteria — clarity, context, constraints, output, verifiability and safety — each scored by fixed rules and weighted by the task you pick. Verifiability counts more for debugging than for a casual text request. The same prompt always gets the same score.",
        es: "Seis criterios —claridad, contexto, restricciones, salida, verificabilidad y seguridad—, cada uno puntuado con reglas fijas y ponderado según la tarea que elegís. La verificabilidad pesa más en depuración que en un pedido de texto cotidiano. El mismo prompt siempre obtiene el mismo puntaje.",
        pt: "Seis critérios — clareza, contexto, restrições, saída, verificabilidade e segurança —, cada um pontuado com regras fixas e ponderado pela tarefa que você escolher. A verificabilidade pesa mais em depuração do que em um pedido casual de texto. O mesmo prompt sempre recebe a mesma pontuação.",
      },
    },
    {
      q: { en: "Is the prompt analyzer free?", es: "¿El analizador de prompts es gratis?", pt: "O analisador de prompts é grátis?" },
      a: {
        en: "Yes. It is free and needs no account or sign-up: paste a prompt and analyze it.",
        es: "Sí. Es gratis y no pide cuenta ni registro: pegás un prompt y lo analizás.",
        pt: "Sim. É grátis e não pede conta nem cadastro: cole um prompt e analise.",
      },
    },
    {
      q: { en: "Does it run my prompt on ChatGPT or Claude?", es: "¿Ejecuta mi prompt en ChatGPT o Claude?", pt: "Ele executa meu prompt no ChatGPT ou no Claude?" },
      a: {
        en: "No. Promptea analyzes and rewrites the prompt; you copy the result into the AI you use. The score comes from rules, not from asking another model to grade it.",
        es: "No. Promptea analiza y reescribe el prompt; vos copiás el resultado en la IA que uses. El puntaje sale de reglas, no de pedirle a otro modelo que lo califique.",
        pt: "Não. O Promptea analisa e reescreve o prompt; você copia o resultado na IA que usa. A pontuação vem de regras, não de pedir a outro modelo que a avalie.",
      },
    },
    {
      q: { en: "Which AI models does it optimize for?", es: "¿Para qué modelos de IA optimiza?", pt: "Para quais modelos de IA ele otimiza?" },
      a: {
        en: `${families}. Each one gets the structure its provider documents (for example, long context before the question for Gemini, or explicit acceptance criteria for DeepSeek).`,
        es: `${families}. Cada uno recibe la estructura que documenta su proveedor (por ejemplo, el contexto largo antes de la pregunta en Gemini, o criterios de aceptación explícitos en DeepSeek).`,
        pt: `${families}. Cada um recebe a estrutura que o provedor documenta (por exemplo, o contexto longo antes da pergunta no Gemini, ou critérios de aceitação explícitos no DeepSeek).`,
      },
    },
    {
      q: { en: "Is my prompt stored?", es: "¿Se guarda mi prompt?", pt: "Meu prompt fica guardado?" },
      a: {
        en: "Promptea collects usage metadata, not the text of your prompts. Saving a prompt to your library keeps it in your own browser.",
        es: "Promptea registra metadatos de uso, no el texto de tus prompts. Si guardás un prompt en tu biblioteca, queda en tu propio navegador.",
        pt: "O Promptea coleta metadados de uso, não o texto dos seus prompts. Se você salvar um prompt na sua biblioteca, ele fica no seu próprio navegador.",
      },
    },
  ];
}

/** The short FAQ under the tool on /analyzer (different questions from the landing). */
export const ANALYZER_PAGE_FAQ: Faq[] = [
  {
    q: { en: "What makes a prompt score high?", es: "¿Qué hace que un prompt tenga un puntaje alto?", pt: "O que faz um prompt ter pontuação alta?" },
    a: {
      en: "A clear goal, the context the model cannot guess, explicit constraints, the exact output format and a way to check the answer. A short prompt can score well too, as long as it says what is needed; padding does not add points.",
      es: "Un objetivo claro, el contexto que el modelo no puede adivinar, restricciones explícitas, el formato de salida exacto y una forma de verificar la respuesta. Un prompt corto también puede puntuar bien si dice lo necesario; el relleno no suma puntos.",
      pt: "Um objetivo claro, o contexto que o modelo não consegue adivinhar, restrições explícitas, o formato exato de saída e um jeito de conferir a resposta. Um prompt curto também pode pontuar bem se disser o necessário; enchimento não soma pontos.",
    },
  },
  {
    q: { en: "Can I check prompts for code, JSON or images?", es: "¿Puedo revisar prompts de código, JSON o imágenes?", pt: "Posso revisar prompts de código, JSON ou imagens?" },
    a: {
      en: "Yes. Pick the purpose — text, study, code, data/JSON, image, marketing, translation or summary — and the analyzer applies the checks that matter for it, like reproduction steps for a bug or a schema for JSON.",
      es: "Sí. Elegí el propósito —texto, estudio, código, datos/JSON, imagen, marketing, traducción o resumen— y el analizador aplica los controles que importan para eso, como los pasos para reproducir un bug o un esquema para JSON.",
      pt: "Sim. Escolha o propósito — texto, estudo, código, dados/JSON, imagem, marketing, tradução ou resumo — e o analisador aplica as verificações que importam para ele, como os passos para reproduzir um bug ou um esquema para JSON.",
    },
  },
  {
    q: { en: "Why does the same prompt always get the same score?", es: "¿Por qué el mismo prompt siempre obtiene el mismo puntaje?", pt: "Por que o mesmo prompt sempre recebe a mesma pontuação?" },
    a: {
      en: "The score comes from fixed rules, not from a model's opinion, so you can change one line, analyze again and see exactly what that line was worth.",
      es: "El puntaje sale de reglas fijas, no de la opinión de un modelo, así que podés cambiar una línea, volver a analizar y ver exactamente cuánto valía esa línea.",
      pt: "A pontuação vem de regras fixas, não da opinião de um modelo, então você pode mudar uma linha, analisar de novo e ver exatamente quanto aquela linha valia.",
    },
  },
];

/**
 * v1.8.6 — a contextual link to the analyzer from the most-read guides (the
 * English guides that bring readers from the US and Asia, Search Console and
 * Vercel Analytics, Oct–Nov 2026). One sentence per guide, tied to what the
 * guide teaches; the link text is always "prompt analyzer" in the page language.
 */
export const GUIDE_ANALYZER_CTA: Readonly<Record<string, L>> = {
  "prompt-checklist": {
    en: "Want to know which line of the checklist your prompt is missing? Paste it into the",
    es: "¿Querés saber qué línea del checklist le falta a tu prompt? Pegalo en el",
    pt: "Quer saber qual linha do checklist falta no seu prompt? Cole no",
  },
  "prompt-quality-scoring": {
    en: "To score a real prompt with these criteria and see what each fix is worth, use the",
    es: "Para puntuar un prompt real con estos criterios y ver cuánto vale cada corrección, usá el",
    pt: "Para pontuar um prompt real com esses critérios e ver quanto vale cada correção, use o",
  },
  "prompt-debugging": {
    en: "Before rewriting a failing prompt by trial and error, find the missing goal, context or format with the",
    es: "Antes de reescribir a prueba y error un prompt que falla, encontrá el objetivo, el contexto o el formato que le faltan con el",
    pt: "Antes de reescrever na tentativa e erro um prompt que falha, encontre o objetivo, o contexto ou o formato que faltam com o",
  },
  "json-output": {
    en: "To check that a JSON prompt names its fields, types and null rule before you run it, use the",
    es: "Para comprobar que un prompt de JSON nombra sus campos, tipos y la regla del null antes de correrlo, usá el",
    pt: "Para conferir se um prompt de JSON nomeia os campos, os tipos e a regra do null antes de rodá-lo, use o",
  },
  "negative-prompting": {
    en: "To see whether your \"don't\" lines are explicit constraints or just noise, run the prompt through the",
    es: "Para ver si tus líneas de \"no hagas\" son restricciones explícitas o solo ruido, pasá el prompt por el",
    pt: "Para ver se as suas linhas de \"não faça\" são restrições explícitas ou só ruído, passe o prompt pelo",
  },
  "translation-prompts": {
    en: "To check that a translation prompt states the audience, register and what must stay untranslated, paste it into the",
    es: "Para comprobar que un prompt de traducción dice la audiencia, el registro y qué no se traduce, pegalo en el",
    pt: "Para conferir se um prompt de tradução diz o público, o registro e o que não deve ser traduzido, cole no",
  },
  "ai-prompts-for-learning": {
    en: "To turn a vague study request into one with a level, a goal and a format, start from the",
    es: "Para convertir un pedido de estudio vago en uno con nivel, objetivo y formato, empezá por el",
    pt: "Para transformar um pedido de estudo vago em um com nível, objetivo e formato, comece pelo",
  },
  "ai-prompts-for-design": {
    en: "To check that a design brief gives the model the audience, constraints and deliverable it needs, use the",
    es: "Para comprobar que un brief de diseño le da al modelo la audiencia, las restricciones y el entregable que necesita, usá el",
    pt: "Para conferir se um briefing de design dá ao modelo o público, as restrições e a entrega de que ele precisa, use o",
  },
  "gemini-prompt-guide": {
    en: "To get a version of your prompt laid out for Gemini (context first, question last), pick Gemini in the",
    es: "Para obtener una versión de tu prompt armada para Gemini (contexto primero, pregunta al final), elegí Gemini en el",
    pt: "Para ter uma versão do seu prompt montada para o Gemini (contexto primeiro, pergunta no final), escolha Gemini no",
  },
  "deepseek-prompt-guide": {
    en: "To check that a DeepSeek prompt has acceptance criteria and a JSON example where it needs them, pick DeepSeek in the",
    es: "Para comprobar que un prompt para DeepSeek tiene criterios de aceptación y un ejemplo de JSON donde hacen falta, elegí DeepSeek en el",
    pt: "Para conferir se um prompt para o DeepSeek tem critérios de aceitação e um exemplo de JSON onde precisa, escolha DeepSeek no",
  },
  "kimi-prompt-guide": {
    en: "To check that a long-document prompt separates the source from the instructions, pick Kimi in the",
    es: "Para comprobar que un prompt sobre un documento largo separa la fuente de las instrucciones, elegí Kimi en el",
    pt: "Para conferir se um prompt sobre um documento longo separa a fonte das instruções, escolha Kimi no",
  },
};

/** Link text of GUIDE_ANALYZER_CTA (completes its sentence). */
export const ANALYZER_LINK_TEXT: L = { en: "prompt analyzer", es: "analizador de prompts", pt: "analisador de prompts" };
