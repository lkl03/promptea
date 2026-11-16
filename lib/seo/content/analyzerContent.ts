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
      zh: "营销文案：从一句话到一份需求简报",
    },
    purpose: "marketing",
    target: "gpt",
    before: {
      en: "Write a product description for our app.",
      es: "Escribí una descripción de producto para nuestra app.",
      pt: "Escreva uma descrição de produto para o nosso app.",
      zh: "Write a product description for our app.",
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
      zh: `Write a product description for Tasklight, our to-do app for freelancers.
Audience: freelance designers who juggle 5+ clients.
Goal: get them to start the free trial.
Include: the two features that matter most to them (client folders, invoice reminders) and one concrete benefit.
Constraints: 80–100 words, plain language, no superlatives or made-up stats.
Call to action: end with "Start your free 14-day trial".
Output format: a headline (max 8 words), then one paragraph.
Success check: a freelancer can tell in one read what Tasklight does and what to click.`,
    },
    score: { en: { before: 20, after: 64 }, es: { before: 26, after: 70 }, pt: { before: 26, after: 70 }, zh: { before: 19, after: 63 } },
    why: {
      en: "The analyzer flagged a missing audience, context, output format and call to action. The rewrite states all four, plus a length limit and a way to check the result.",
      es: "El analizador marcó que faltaban la audiencia, el contexto, el formato de salida y el llamado a la acción. La versión nueva dice las cuatro cosas, más un límite de largo y una forma de verificar el resultado.",
      pt: "O analisador apontou que faltavam o público, o contexto, o formato de saída e a chamada para ação. A nova versão traz os quatro, além de um limite de tamanho e um jeito de conferir o resultado.",
      zh: "分析器指出缺少受众、背景、输出格式和行动号召。改写后的版本把这四项都写清楚了，还加上了篇幅限制和检验结果的方法。",
    },
  },
  {
    id: "debugging",
    title: {
      en: "Debugging: from \"fix it\" to a reproducible bug report",
      es: "Depuración: de \"arreglalo\" a un reporte de bug reproducible",
      pt: "Depuração: de \"conserta\" a um relato de bug reproduzível",
      zh: "调试：从“帮我修好”到可复现的bug报告",
    },
    purpose: "code",
    target: "claude",
    before: {
      en: "my code doesn't work, fix it",
      es: "mi código no funciona, arreglalo",
      pt: "meu código não funciona, conserta",
      zh: "my code doesn't work, fix it",
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
      zh: `My Python function returns None instead of the total.
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
    },
    score: { en: { before: 19, after: 84 }, es: { before: 19, after: 82 }, pt: { before: 25, after: 82 }, zh: { before: 19, after: 83 } },
    why: {
      en: "A debugging prompt needs what you expected, what happened, the code and how to reproduce it. With those four the model can find the bug instead of guessing it (here, the missing return).",
      es: "Un prompt de depuración necesita qué esperabas, qué pasó, el código y cómo reproducirlo. Con esas cuatro cosas el modelo encuentra el bug en vez de adivinarlo (acá, el return que falta).",
      pt: "Um prompt de depuração precisa do que você esperava, do que aconteceu, do código e de como reproduzir. Com essas quatro coisas o modelo encontra o bug em vez de adivinhar (aqui, o return que falta).",
      zh: "调试类提示词需要写明你预期的结果、实际发生了什么、代码本身以及如何复现。有了这四样，模型就能找到bug，而不是靠猜（这里是漏掉的return）。",
    },
  },
  {
    id: "data",
    title: {
      en: "JSON extraction: a decent score that still misses the schema",
      es: "Extracción a JSON: un puntaje aceptable al que todavía le falta el esquema",
      pt: "Extração para JSON: uma pontuação razoável que ainda não tem o esquema",
      zh: "JSON提取：评分尚可，但仍缺少schema",
    },
    purpose: "data",
    target: "gemini",
    before: {
      en: "Extract the important info from these emails as JSON.",
      es: "Extraé la info importante de estos emails como JSON.",
      pt: "Extraia as informações importantes destes e-mails em JSON.",
      zh: "Extract the important info from these emails as JSON.",
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
      zh: `Context: these are emails from our sales inbox; the result fills our team calendar.
Extract every meeting request from the emails below.
Return only JSON: an array of objects with the fields "sender" (string), "date" (YYYY-MM-DD or null), "time" (HH:MM, 24h, or null) and "topic" (max 10 words).
If an email has no meeting request, skip it. If a field is missing, use null; do not guess.
Example: [{"sender": "Ana Ruiz", "date": "2026-11-20", "time": "15:00", "topic": "Q4 budget review"}]
Emails:
"""
[paste the emails here]
"""`,
    },
    score: { en: { before: 63, after: 78 }, es: { before: 63, after: 75 }, pt: { before: 63, after: 78 }, zh: { before: 62, after: 77 } },
    why: {
      en: "Asking for JSON already earns points for output format, but without fields, types or the input the model invents its own schema every run. Naming the fields, the null rule and one example makes the output parseable.",
      es: "Pedir JSON ya suma puntos de formato de salida, pero sin campos, tipos ni el texto de entrada el modelo inventa su propio esquema en cada corrida. Nombrar los campos, la regla del null y un ejemplo hace que la salida se pueda parsear.",
      pt: "Pedir JSON já rende pontos de formato de saída, mas sem campos, tipos nem o texto de entrada o modelo inventa o próprio esquema a cada execução. Nomear os campos, a regra do null e um exemplo torna a saída analisável.",
      zh: "要求输出JSON已经能在输出格式上得分，但如果没有字段、类型和输入文本，模型每次运行都会自己编一套schema。写明字段、null规则并给出一个示例，输出才能被解析。",
    },
  },
];

/** The long FAQ of /landing/prompt-analyzer (visible text and FAQPage come from here). */
export function analyzerLandingFaq(families: string): Faq[] {
  return [
    {
      q: { en: "What is a prompt analyzer?", es: "¿Qué es un analizador de prompts?", pt: "O que é um analisador de prompts?", zh: "什么是提示词分析器？" },
      a: {
        en: "A tool that reads a prompt before you send it to an AI and tells you what is missing: the goal, the context, the constraints, the output format or a way to check the answer. Promptea also scores the prompt from 0 to 100 and writes an improved version.",
        es: "Una herramienta que lee un prompt antes de que lo mandes a una IA y te dice qué le falta: el objetivo, el contexto, las restricciones, el formato de salida o una forma de verificar la respuesta. Promptea además le pone un puntaje de 0 a 100 y escribe una versión mejorada.",
        pt: "Uma ferramenta que lê um prompt antes de você enviá-lo a uma IA e diz o que falta: o objetivo, o contexto, as restrições, o formato de saída ou um jeito de conferir a resposta. O Promptea também dá uma pontuação de 0 a 100 e escreve uma versão melhorada.",
        zh: "一种在你把提示词发给AI之前先读一遍的工具，它会告诉你缺了什么：目标、上下文、约束条件、输出格式，或者检验回答的方法。Promptea还会按0到100分为提示词评分，并写出改进版本。",
      },
    },
    {
      q: { en: "How is the score calculated?", es: "¿Cómo se calcula el puntaje?", pt: "Como a pontuação é calculada?", zh: "评分是怎么计算的？" },
      a: {
        en: "Six criteria — clarity, context, constraints, output, verifiability and safety — each scored by fixed rules and weighted by the task you pick. Verifiability counts more for debugging than for a casual text request. The same prompt always gets the same score.",
        es: "Seis criterios —claridad, contexto, restricciones, salida, verificabilidad y seguridad—, cada uno puntuado con reglas fijas y ponderado según la tarea que elegís. La verificabilidad pesa más en depuración que en un pedido de texto cotidiano. El mismo prompt siempre obtiene el mismo puntaje.",
        pt: "Seis critérios — clareza, contexto, restrições, saída, verificabilidade e segurança —, cada um pontuado com regras fixas e ponderado pela tarefa que você escolher. A verificabilidade pesa mais em depuração do que em um pedido casual de texto. O mesmo prompt sempre recebe a mesma pontuação.",
        zh: "六项标准——清晰度、上下文、约束条件、输出格式、可验证性和安全性——每一项都按固定规则评分，并根据你选择的任务加权。可验证性在调试任务中比在随意的文本请求中更重要。同一条提示词总是得到相同的评分。",
      },
    },
    {
      q: { en: "Is the prompt analyzer free?", es: "¿El analizador de prompts es gratis?", pt: "O analisador de prompts é grátis?", zh: "提示词分析器免费吗？" },
      a: {
        en: "Yes. It is free and needs no account or sign-up: paste a prompt and analyze it.",
        es: "Sí. Es gratis y no pide cuenta ni registro: pegás un prompt y lo analizás.",
        pt: "Sim. É grátis e não pede conta nem cadastro: cole um prompt e analise.",
        zh: "免费。不需要账号，也不用注册：粘贴提示词就能分析。",
      },
    },
    {
      q: { en: "Does it run my prompt on ChatGPT or Claude?", es: "¿Ejecuta mi prompt en ChatGPT o Claude?", pt: "Ele executa meu prompt no ChatGPT ou no Claude?", zh: "它会在ChatGPT或Claude上运行我的提示词吗？" },
      a: {
        en: "No. Promptea analyzes and rewrites the prompt; you copy the result into the AI you use. The score comes from rules, not from asking another model to grade it.",
        es: "No. Promptea analiza y reescribe el prompt; vos copiás el resultado en la IA que uses. El puntaje sale de reglas, no de pedirle a otro modelo que lo califique.",
        pt: "Não. O Promptea analisa e reescreve o prompt; você copia o resultado na IA que usa. A pontuação vem de regras, não de pedir a outro modelo que a avalie.",
        zh: "不会。Promptea只分析和改写提示词，你再把结果复制到自己使用的AI里。评分来自规则，而不是让另一个模型来打分。",
      },
    },
    {
      q: { en: "Which AI models does it optimize for?", es: "¿Para qué modelos de IA optimiza?", pt: "Para quais modelos de IA ele otimiza?", zh: "它针对哪些AI模型进行优化？" },
      a: {
        en: `${families}. Each one gets the structure its provider documents (for example, long context before the question for Gemini, or explicit acceptance criteria for DeepSeek).`,
        es: `${families}. Cada uno recibe la estructura que documenta su proveedor (por ejemplo, el contexto largo antes de la pregunta en Gemini, o criterios de aceptación explícitos en DeepSeek).`,
        pt: `${families}. Cada um recebe a estrutura que o provedor documenta (por exemplo, o contexto longo antes da pergunta no Gemini, ou critérios de aceitação explícitos no DeepSeek).`,
        zh: `支持${families.replace(/, /g, "、")}。每个模型都会按其提供商文档推荐的结构来编写（例如，Gemini把长上下文放在问题之前，DeepSeek写明明确的验收标准）。`,
      },
    },
    {
      q: { en: "Is my prompt stored?", es: "¿Se guarda mi prompt?", pt: "Meu prompt fica guardado?", zh: "我的提示词会被保存吗？" },
      a: {
        en: "Promptea collects usage metadata, not the text of your prompts. Saving a prompt to your library keeps it in your own browser.",
        es: "Promptea registra metadatos de uso, no el texto de tus prompts. Si guardás un prompt en tu biblioteca, queda en tu propio navegador.",
        pt: "O Promptea coleta metadados de uso, não o texto dos seus prompts. Se você salvar um prompt na sua biblioteca, ele fica no seu próprio navegador.",
        zh: "Promptea收集的是使用元数据，而不是你的提示词文本。把提示词保存到提示词库时，它只存在你自己的浏览器里。",
      },
    },
  ];
}

/** The short FAQ under the tool on /analyzer (different questions from the landing). */
export const ANALYZER_PAGE_FAQ: Faq[] = [
  {
    q: { en: "What makes a prompt score high?", es: "¿Qué hace que un prompt tenga un puntaje alto?", pt: "O que faz um prompt ter pontuação alta?", zh: "什么样的提示词能拿到高分？" },
    a: {
      en: "A clear goal, the context the model cannot guess, explicit constraints, the exact output format and a way to check the answer. A short prompt can score well too, as long as it says what is needed; padding does not add points.",
      es: "Un objetivo claro, el contexto que el modelo no puede adivinar, restricciones explícitas, el formato de salida exacto y una forma de verificar la respuesta. Un prompt corto también puede puntuar bien si dice lo necesario; el relleno no suma puntos.",
      pt: "Um objetivo claro, o contexto que o modelo não consegue adivinhar, restrições explícitas, o formato exato de saída e um jeito de conferir a resposta. Um prompt curto também pode pontuar bem se disser o necessário; enchimento não soma pontos.",
      zh: "明确的目标、模型猜不到的上下文、明确的约束条件、确切的输出格式，以及检验回答的方法。短提示词只要说清所需内容，也能拿到高分；堆砌字数不会加分。",
    },
  },
  {
    q: { en: "Can I check prompts for code, JSON or images?", es: "¿Puedo revisar prompts de código, JSON o imágenes?", pt: "Posso revisar prompts de código, JSON ou imagens?", zh: "我可以检查用于代码、JSON或图像的提示词吗？" },
    a: {
      en: "Yes. Pick the purpose — text, study, code, data/JSON, image, marketing, translation or summary — and the analyzer applies the checks that matter for it, like reproduction steps for a bug or a schema for JSON.",
      es: "Sí. Elegí el propósito —texto, estudio, código, datos/JSON, imagen, marketing, traducción o resumen— y el analizador aplica los controles que importan para eso, como los pasos para reproducir un bug o un esquema para JSON.",
      pt: "Sim. Escolha o propósito — texto, estudo, código, dados/JSON, imagem, marketing, tradução ou resumo — e o analisador aplica as verificações que importam para ele, como os passos para reproduzir um bug ou um esquema para JSON.",
      zh: "可以。选择用途——文本、学习、代码、数据/JSON、图像、营销、翻译或摘要——分析器就会进行与之相关的检查，比如bug的复现步骤或JSON的schema。",
    },
  },
  {
    q: { en: "Why does the same prompt always get the same score?", es: "¿Por qué el mismo prompt siempre obtiene el mismo puntaje?", pt: "Por que o mesmo prompt sempre recebe a mesma pontuação?", zh: "为什么同一条提示词总是得到相同的评分？" },
    a: {
      en: "The score comes from fixed rules, not from a model's opinion, so you can change one line, analyze again and see exactly what that line was worth.",
      es: "El puntaje sale de reglas fijas, no de la opinión de un modelo, así que podés cambiar una línea, volver a analizar y ver exactamente cuánto valía esa línea.",
      pt: "A pontuação vem de regras fixas, não da opinião de um modelo, então você pode mudar uma linha, analisar de novo e ver exatamente quanto aquela linha valia.",
      zh: "评分来自固定规则，而不是模型的主观意见，所以你可以改动一行、重新分析，准确看出这一行值多少分。",
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
    zh: "想知道你的提示词缺了清单上的哪一条？把它粘贴到",
  },
  "prompt-quality-scoring": {
    en: "To score a real prompt with these criteria and see what each fix is worth, use the",
    es: "Para puntuar un prompt real con estos criterios y ver cuánto vale cada corrección, usá el",
    pt: "Para pontuar um prompt real com esses critérios e ver quanto vale cada correção, use o",
    zh: "想用这些标准为真实的提示词评分，并看清每处修改值多少分，请使用",
  },
  "prompt-debugging": {
    en: "Before rewriting a failing prompt by trial and error, find the missing goal, context or format with the",
    es: "Antes de reescribir a prueba y error un prompt que falla, encontrá el objetivo, el contexto o el formato que le faltan con el",
    pt: "Antes de reescrever na tentativa e erro um prompt que falha, encontre o objetivo, o contexto ou o formato que faltam com o",
    zh: "在靠反复试错改写一条失效的提示词之前，先找出缺失的目标、上下文或格式，可以使用",
  },
  "json-output": {
    en: "To check that a JSON prompt names its fields, types and null rule before you run it, use the",
    es: "Para comprobar que un prompt de JSON nombra sus campos, tipos y la regla del null antes de correrlo, usá el",
    pt: "Para conferir se um prompt de JSON nomeia os campos, os tipos e a regra do null antes de rodá-lo, use o",
    zh: "想在运行前确认JSON提示词写明了字段、类型和null规则，请使用",
  },
  "negative-prompting": {
    en: "To see whether your \"don't\" lines are explicit constraints or just noise, run the prompt through the",
    es: "Para ver si tus líneas de \"no hagas\" son restricciones explícitas o solo ruido, pasá el prompt por el",
    pt: "Para ver se as suas linhas de \"não faça\" são restrições explícitas ou só ruído, passe o prompt pelo",
    zh: "想知道你那些“不要……”的句子是明确的约束，还是只是噪音，可以把提示词放进",
  },
  "translation-prompts": {
    en: "To check that a translation prompt states the audience, register and what must stay untranslated, paste it into the",
    es: "Para comprobar que un prompt de traducción dice la audiencia, el registro y qué no se traduce, pegalo en el",
    pt: "Para conferir se um prompt de tradução diz o público, o registro e o que não deve ser traduzido, cole no",
    zh: "想确认翻译提示词写明了受众、语体以及哪些内容不翻译，可以把它粘贴到",
  },
  "ai-prompts-for-learning": {
    en: "To turn a vague study request into one with a level, a goal and a format, start from the",
    es: "Para convertir un pedido de estudio vago en uno con nivel, objetivo y formato, empezá por el",
    pt: "Para transformar um pedido de estudo vago em um com nível, objetivo e formato, comece pelo",
    zh: "想把模糊的学习请求变成写明水平、目标和格式的请求，可以先用",
  },
  "ai-prompts-for-design": {
    en: "To check that a design brief gives the model the audience, constraints and deliverable it needs, use the",
    es: "Para comprobar que un brief de diseño le da al modelo la audiencia, las restricciones y el entregable que necesita, usá el",
    pt: "Para conferir se um briefing de design dá ao modelo o público, as restrições e a entrega de que ele precisa, use o",
    zh: "想确认设计需求说明给了模型所需的受众、约束和交付物，请使用",
  },
  "gemini-prompt-guide": {
    en: "To get a version of your prompt laid out for Gemini (context first, question last), pick Gemini in the",
    es: "Para obtener una versión de tu prompt armada para Gemini (contexto primero, pregunta al final), elegí Gemini en el",
    pt: "Para ter uma versão do seu prompt montada para o Gemini (contexto primeiro, pergunta no final), escolha Gemini no",
    zh: "想得到一版按Gemini习惯编排的提示词（上下文在前，问题在后），请选择Gemini并使用",
  },
  "deepseek-prompt-guide": {
    en: "To check that a DeepSeek prompt has acceptance criteria and a JSON example where it needs them, pick DeepSeek in the",
    es: "Para comprobar que un prompt para DeepSeek tiene criterios de aceptación y un ejemplo de JSON donde hacen falta, elegí DeepSeek en el",
    pt: "Para conferir se um prompt para o DeepSeek tem critérios de aceitação e um exemplo de JSON onde precisa, escolha DeepSeek no",
    zh: "想确认DeepSeek提示词在需要的地方写了验收标准和JSON示例，请选择DeepSeek并使用",
  },
  "kimi-prompt-guide": {
    en: "To check that a long-document prompt separates the source from the instructions, pick Kimi in the",
    es: "Para comprobar que un prompt sobre un documento largo separa la fuente de las instrucciones, elegí Kimi en el",
    pt: "Para conferir se um prompt sobre um documento longo separa a fonte das instruções, escolha Kimi no",
    zh: "想确认长文档提示词把原文和指令分开了，请选择Kimi并使用",
  },
};

/** Link text of GUIDE_ANALYZER_CTA (completes its sentence). */
export const ANALYZER_LINK_TEXT: L = { en: "prompt analyzer", es: "analizador de prompts", pt: "analisador de prompts", zh: "提示词分析器" };
