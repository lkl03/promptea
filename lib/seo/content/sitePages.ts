// lib/seo/content/sitePages.ts
//
// The public "who we are / how it works" copy: the crawlable block on the home
// page, /{lang}/about and /{lang}/methodology.
//
// One typed document per page feeds BOTH the HTML (components/seo/DocSections)
// and the markdown twin (lib/seo/markdown.ts, linked from llms.txt), so the two
// can never drift. Every claim is something the code does today; where a number
// or a list exists in code (scoring dimensions, purposes, model registry,
// engine version, frontier cut-off) it is read from there, not typed here.
// Sources for the method: docs/engine-contract.md, docs/matcher-methodology.md,
// lib/blog/types.ts (publication rules), lib/benchmarks/* (benchmark pipeline).

import { TARGETS, TASK_TYPES } from "@/lib/domain";
import { FRONTIER_TOP_N } from "@/lib/benchmarks/normalize";
import { getXLinks } from "@/lib/social";
import { CONTENT_UPDATED, formatDay, modelsVerifiedAt } from "../dates";
import { ENGINE, SCORE_DIMENSIONS, TARGET_SHORT, currentModels, purposeList } from "../facts";
import { STUDIO_NAME, STUDIO_URL, type Locale } from "../site";

export type DocBlock =
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  /** Numbered procedure with a short name per step; the same data feeds the HowTo JSON-LD. */
  | { type: "steps"; items: DocStep[] }
  | { type: "dl"; items: Array<{ term: string; text: string }> }
  | { type: "links"; items: Array<{ href: string; label: string }> };

export type DocSection = { id: string; heading: string; blocks: DocBlock[] };

export type DocFaq = { q: string; a: string };

export type DocStep = { name: string; text: string };

export type PageDoc = {
  /** <title> (the layout template appends " · Promptea" unless `absoluteTitle`). */
  title: string;
  absoluteTitle?: boolean;
  description: string;
  h1: string;
  /** Answer-first summary shown right under the heading. */
  tldr: string;
  sections: DocSection[];
  faq: DocFaq[];
  /** Ordered how-to steps, when the page teaches a procedure (becomes HowTo JSON-LD). */
  steps?: { name: string; steps: DocStep[] };
  updated: string;
};

// v1.8.7: zh is optional while the Chinese text is written; it falls back to English.
const tr = (lang: Locale) => <T,>(en: T, es: T, pt: T, zh: T = en): T => ({ en, es, pt, zh })[lang];

function modelFamilyList(): string {
  return TARGETS.map((t) => TARGET_SHORT[t]).join(", ");
}

// ---------------------------------------------------------------------------
// Home (v1.8.1: compact) and "How it works" (the long form that used to sit
// under the home page)
// ---------------------------------------------------------------------------

/** One-paragraph answer to "what is Promptea?", shared by the home page and /how-it-works. */
function prompteaTldr(lang: Locale): string {
  const t = tr(lang);
  return t(
    `Promptea is a free web tool that reads your prompt, scores it from 0 to 100 on six criteria (${SCORE_DIMENSIONS.map((d) => d.label.en.toLowerCase()).join(", ")}), tells you what to fix and writes an improved version for the AI you pick: ${modelFamilyList()}. Works in English, Spanish, Portuguese and Chinese, no account needed.`,
    `Promptea es una herramienta web gratuita que lee tu prompt, le pone un puntaje de 0 a 100 en seis criterios (${SCORE_DIMENSIONS.map((d) => d.label.es.toLowerCase()).join(", ")}), te dice qué corregir y escribe una versión mejorada para la IA que elijas: ${modelFamilyList()}. Funciona en español, inglés, portugués y chino, y no pide cuenta.`,
    `O Promptea é uma ferramenta web gratuita que lê o seu prompt, dá uma pontuação de 0 a 100 em seis critérios (${SCORE_DIMENSIONS.map((d) => d.label.pt.toLowerCase()).join(", ")}), diz o que corrigir e escreve uma versão melhorada para a IA que você escolher: ${modelFamilyList()}. Funciona em português, inglês, espanhol e chinês, sem precisar de conta.`,
    `Promptea是一款免费的网页工具：它会读取你的提示词，按六项标准（${SCORE_DIMENSIONS.map((d) => d.label.zh).join("、")}）给出0到100分的评分，告诉你该改哪里，并为你选择的AI写出改进版本：${modelFamilyList().replace(/, /g, "、")}。支持中文、英语、西班牙语和葡萄牙语，无需注册账号。`,
  );
}

/**
 * The home page. v1.8.1: the page itself is short (logo, the two actions, the
 * prompt box, the latest stories), so its document is short too — the summary
 * and where to go. Its <title>, description and <h1> are unchanged. Everything
 * that explains the product in depth is howItWorksDoc(), one click away.
 */
export function homeAboutDoc(lang: Locale): PageDoc {
  const t = tr(lang);
  return {
    title: t(
      "Promptea — Free prompt analyzer & optimizer for ChatGPT, Claude, Gemini",
      "Promptea — Analizador de prompts gratis para ChatGPT, Claude, Gemini",
      "Promptea — Analisador e otimizador de prompts grátis para ChatGPT, Claude, Gemini",
      "Promptea——免费的提示词分析与优化工具，支持ChatGPT、Claude、Gemini",
    ),
    absoluteTitle: true,
    description: t(
      "Score any prompt 0–100 on six criteria, see what to fix and get a rewrite tuned for GPT, Claude, Gemini, Grok, Kimi, DeepSeek, Qwen, GLM, MiniMax, Doubao or Perplexity. Free, no account.",
      "Puntuá tu prompt de 0 a 100 en seis criterios, mirá qué corregir y obtené una versión mejorada para GPT, Claude, Gemini, Grok, Kimi, DeepSeek, Qwen, GLM, MiniMax, Doubao o Perplexity. Gratis, sin cuenta.",
      "Pontue qualquer prompt de 0 a 100 em seis critérios, veja o que corrigir e receba uma reescrita ajustada para GPT, Claude, Gemini, Grok, Kimi, DeepSeek, Qwen, GLM, MiniMax, Doubao ou Perplexity. Grátis, sem conta.",
      "按六项标准为任意提示词打出0到100分，看清该改哪里，并获得针对GPT、Claude、Gemini、Grok、Kimi、DeepSeek、Qwen、GLM、MiniMax、Doubao或Perplexity调整过的改写版本。免费，无需注册。",
    ),
    h1: t(
      "Promptea — analyze, score and optimize your AI prompts",
      "Promptea — analizá, puntuá y optimizá tus prompts de IA",
      "Promptea — analise, pontue e otimize seus prompts de IA",
      "Promptea——分析、评分并优化你的AI提示词",
    ),
    tldr: prompteaTldr(lang),
    sections: [
      {
        id: "start",
        heading: t("What you can do on Promptea", "Qué podés hacer en Promptea", "O que você pode fazer no Promptea", "在Promptea上你可以做什么"),
        blocks: [
          {
            type: "dl",
            items: [
              {
                term: t("Analyze a prompt", "Analizar un prompt", "Analisar um prompt", "分析提示词"),
                text: t(
                  "Paste a prompt and get a 0–100 score across six criteria, what to fix and a version optimized for the AI you choose. Free, no account.",
                  "Pegá un prompt y recibí un puntaje de 0 a 100 en seis criterios, qué corregir y una versión optimizada para la IA que elijas. Gratis, sin cuenta.",
                  "Cole um prompt e receba uma pontuação de 0 a 100 em seis critérios, o que corrigir e uma versão otimizada para a IA que você escolher. Grátis, sem conta.",
                  "粘贴一条提示词，即可获得按六项标准给出的0到100分评分、需要修改的地方，以及针对你所选AI优化后的版本。免费，无需注册。",
                ),
              },
              {
                term: t("Find the best AI", "Encontrar la mejor IA", "Encontrar a melhor IA", "找到最合适的AI"),
                text: t(
                  "Describe your task and get a ranked, explained recommendation of which AI and model fits it.",
                  "Describí tu tarea y recibí una recomendación ordenada y explicada de qué IA y modelo conviene.",
                  "Descreva sua tarefa e receba uma recomendação ordenada e explicada de qual IA e qual modelo combinam com ela.",
                  "描述你的任务，获得一份排好序、附带解释的推荐，告诉你哪个AI、哪个模型最适合。",
                ),
              },
              {
                term: t("AI Daily", "IA al Día", "AI Daily", "AI Daily（AI日报）"),
                text: t(
                  "One verified AI story every morning, with its sources, plus a weekly digest.",
                  "Una noticia de IA verificada cada mañana, con sus fuentes, y un resumen semanal.",
                  "Uma notícia de IA verificada todas as manhãs, com as fontes, e um resumo semanal (em inglês e espanhol).",
                  "每天早上一条经过核实的AI新闻，附带来源，另有每周摘要（仅提供英文和西班牙文版本）。",
                ),
              },
              {
                term: t("Benchmarks", "Benchmarks", "Benchmarks", "基准测试"),
                text: t(
                  "Rankings of AI models by category, with the source, date and metric of each benchmark.",
                  "Rankings de modelos de IA por categoría, con la fuente, la fecha y la métrica de cada benchmark.",
                  "Rankings de modelos de IA por categoria, com a fonte, a data e a métrica de cada benchmark.",
                  "按类别排列的AI模型排名，注明每项基准测试的来源、日期和指标。",
                ),
              },
            ],
          },
          {
            type: "links",
            items: [
              { href: `/${lang}/analyzer`, label: t("Prompt analyzer", "Analizador de prompts", "Analisador de prompts", "提示词分析器") },
              { href: `/${lang}/best-ai`, label: t("Find the best AI", "Encontrar la mejor IA", "Encontrar a melhor IA", "找到最合适的AI") },
              { href: `/${lang}/flow`, label: t("Prompt flow", "Flujo de prompts", "Fluxo de prompts", "提示词流程") },
              { href: `/${lang}/blog`, label: t("AI Daily", "IA al Día", "AI Daily", "AI Daily") },
              { href: `/${lang}/benchmarks`, label: t("Benchmarks", "Benchmarks", "Benchmarks", "基准测试") },
              { href: `/${lang}/how-it-works`, label: t("How Promptea works", "Cómo funciona Promptea", "Como o Promptea funciona", "Promptea的工作原理") },
            ],
          },
        ],
      },
    ],
    faq: [],
    updated: CONTENT_UPDATED.home,
  };
}

/**
 * /{lang}/how-it-works — what Promptea is, how a prompt is scored, how to use
 * it, which AIs and prompt types it supports, and the FAQ. Until v1.8.0 this
 * was the long block at the bottom of the home page; the text is the same, and
 * so are the HowTo and FAQPage JSON-LD built from it (lib/seo/pageGraphs.ts).
 */
export function howItWorksDoc(lang: Locale): PageDoc {
  const t = tr(lang);
  const purposes = purposeList(lang);
  const models = currentModels();
  const verified = formatDay(modelsVerifiedAt(), lang);
  const howToSteps: DocStep[] = [
    {
      name: t("Paste your prompt", "Pegá tu prompt", "Cole seu prompt", "粘贴你的提示词"),
      text: t("Paste the prompt you want to improve in the box on the home page or in the analyzer.", "Pegá el prompt que querés mejorar en el cuadro de la página de inicio o en el analizador.", "Cole o prompt que você quer melhorar na caixa da página inicial ou no analisador.", "把你想改进的提示词粘贴到首页或分析器的输入框中。"),
    },
    {
      name: t("Choose purpose and AI", "Elegí propósito e IA", "Escolha o propósito e a IA", "选择用途和AI"),
      text: t("Select what the prompt is for and the AI model you will use it with.", "Seleccioná para qué es el prompt y con qué modelo de IA lo vas a usar.", "Selecione para que serve o prompt e o modelo de IA com o qual você vai usá-lo.", "选择这条提示词的用途，以及你要搭配使用的AI模型。"),
    },
    {
      name: t("Read the score and copy the result", "Leé el puntaje y copiá el resultado", "Leia a pontuação e copie o resultado", "查看评分并复制结果"),
      text: t("Review the 0–100 score, the findings and the recommendations, then copy the optimized prompt or save it to your library.", "Revisá el puntaje de 0 a 100, los hallazgos y las recomendaciones, y copiá el prompt optimizado o guardalo en tu biblioteca.", "Confira a pontuação de 0 a 100, os achados e as recomendações; depois copie o prompt otimizado ou salve-o na sua biblioteca.", "查看0到100分的评分、发现的问题和建议，然后复制优化后的提示词，或把它保存到你的提示词库。"),
    },
  ];

  const modelDl = TARGETS.map((target) => {
    const names = currentModels(target).map((m) => m.label);
    return { term: TARGET_SHORT[target], text: names.join(" · ") };
  }).filter((x) => x.text);

  return {
    title: t("How Promptea works: prompt scoring, AIs and FAQ", "Cómo funciona Promptea: puntaje, IAs y preguntas", "Como o Promptea funciona: pontuação, IAs e dúvidas", "Promptea的工作原理：提示词评分、支持的AI和常见问题"),
    description: t(
      "What Promptea is, how a prompt gets its 0–100 score on six criteria, how to use the analyzer, which AIs and prompt types it supports, and answers to common questions.",
      "Qué es Promptea, cómo se calcula el puntaje de 0 a 100 en seis criterios, cómo usar el analizador, qué IAs y tipos de prompt soporta, y respuestas a las preguntas frecuentes.",
      "O que é o Promptea, como um prompt recebe a pontuação de 0 a 100 em seis critérios, como usar o analisador, as IAs compatíveis e as dúvidas mais comuns.",
      "Promptea是什么，提示词如何按六项标准获得0到100分的评分，如何使用分析器，支持哪些AI和提示词类型，以及常见问题解答。",
    ),
    h1: t("How Promptea works", "Cómo funciona Promptea", "Como o Promptea funciona", "Promptea的工作原理"),
    tldr: prompteaTldr(lang),
    sections: [
      {
        id: "what-is-promptea",
        heading: t("What is Promptea?", "¿Qué es Promptea?", "O que é o Promptea?", "Promptea是什么？"),
        blocks: [
          {
            type: "p",
            text: t(
              "Promptea is a prompt analyzer and optimizer. You paste a prompt, choose what it is for and which AI you will use, and Promptea returns a score, the specific problems it found, concrete recommendations and an optimized prompt you can copy.",
              "Promptea es un analizador y optimizador de prompts. Pegás un prompt, elegís para qué es y con qué IA lo vas a usar, y Promptea devuelve un puntaje, los problemas concretos que encontró, recomendaciones y un prompt optimizado que podés copiar.",
              "O Promptea é um analisador e otimizador de prompts. Você cola um prompt, escolhe para que ele serve e qual IA vai usar, e o Promptea devolve uma pontuação, os problemas específicos que encontrou, recomendações concretas e um prompt otimizado para copiar.",
              "Promptea是一款提示词分析和优化工具。你粘贴一条提示词，选择它的用途和你要使用的AI，Promptea就会返回评分、它发现的具体问题、可操作的建议，以及一条可以直接复制的优化后的提示词。",
            ),
          },
          {
            type: "p",
            text: t(
              "Around the analyzer there are four more tools: Find the best AI for a task, AI Daily (one verified AI story every morning, with its sources), model benchmarks with source and date, and a library of guides, a glossary and per-model prompt templates.",
              "Alrededor del analizador hay cuatro herramientas más: elegir la mejor IA para una tarea, IA al Día (una noticia de IA verificada cada mañana, con sus fuentes), benchmarks de modelos con fuente y fecha, y una biblioteca de guías, glosario y plantillas de prompts por modelo.",
              "Em volta do analisador há mais quatro ferramentas: Encontrar a melhor IA para uma tarefa, o AI Daily (uma notícia de IA verificada todas as manhãs, com as fontes), benchmarks de modelos com fonte e data, e uma biblioteca de guias, um glossário e templates de prompts por modelo.",
              "除了分析器，Promptea还有四个工具：为任务找到最合适的AI；AI Daily（AI日报，每天早上一条经过核实的AI新闻，附带来源）；注明来源和日期的模型基准测试；以及由指南、术语表和按模型分类的提示词模板组成的资料库。",
            ),
          },
        ],
      },
      {
        id: "score",
        heading: t("How a prompt is scored", "Cómo se puntúa un prompt", "Como um prompt é pontuado", "提示词如何评分"),
        blocks: [
          {
            type: "p",
            text: t(
              "The score runs from 0 to 100 and combines six dimensions. It measures how well specified the prompt is, using fixed rules, so the same prompt always gets the same score.",
              "El puntaje va de 0 a 100 y combina seis dimensiones. Mide qué tan bien especificado está el prompt con reglas fijas, así que el mismo prompt siempre obtiene el mismo puntaje.",
              "A pontuação vai de 0 a 100 e combina seis dimensões. Ela mede o quanto o prompt está bem especificado, usando regras fixas, de modo que o mesmo prompt sempre recebe a mesma pontuação.",
              "评分范围为0到100，综合六个维度。它用固定规则衡量提示词描述得是否充分，因此同一条提示词总是得到相同的评分。",
            ),
          },
          { type: "dl", items: SCORE_DIMENSIONS.map((d) => ({ term: d.label[lang], text: d.measures[lang] })) },
          {
            type: "links",
            items: [{ href: `/${lang}/methodology`, label: t("Read the full methodology", "Leer la metodología completa", "Ler a metodologia completa", "阅读完整的方法论") }],
          },
        ],
      },
      {
        id: "how-to",
        heading: t("How to analyze a prompt with Promptea", "Cómo analizar un prompt con Promptea", "Como analisar um prompt com o Promptea", "如何用Promptea分析提示词"),
        blocks: [
          { type: "steps", items: howToSteps },
        ],
      },
      {
        id: "supported",
        heading: t("Supported AIs and prompt types", "IAs y tipos de prompt compatibles", "IAs e tipos de prompt compatíveis", "支持的AI和提示词类型"),
        blocks: [
          {
            type: "p",
            text: t(
              `Promptea optimizes prompts for ${TARGETS.length} AI families and ${models.length} current models. It does not run the models: it writes prompts that follow each provider's own prompting guidance. The model list was last verified against the providers' documentation on ${verified}.`,
              `Promptea optimiza prompts para ${TARGETS.length} familias de IA y ${models.length} modelos vigentes. No ejecuta los modelos: escribe prompts que siguen la guía de prompting de cada proveedor. La lista de modelos se verificó por última vez contra la documentación de los proveedores el ${verified}.`,
              `O Promptea otimiza prompts para ${TARGETS.length} famílias de IA e ${models.length} modelos atuais. Ele não executa os modelos: escreve prompts que seguem as orientações de prompting de cada provedor. A lista de modelos foi verificada pela última vez na documentação dos provedores em ${verified}.`,
              `Promptea为${TARGETS.length}个AI系列、${models.length}个当前模型优化提示词。它不运行这些模型，而是按照每家提供商自己的提示词指南来编写提示词。模型列表最近一次对照提供商文档核实是在${verified}。`,
            ),
          },
          { type: "dl", items: modelDl },
          {
            type: "p",
            text: t(`Prompt types: ${purposes.join(", ")}.`, `Tipos de prompt: ${purposes.join(", ")}.`, `Tipos de prompt: ${purposes.join(", ")}.`, `提示词类型：${purposes.join("、")}。`),
          },
          {
            type: "links",
            items: [
              { href: `/${lang}/models`, label: t("Prompts by model", "Prompts por modelo", "Prompts por modelo", "按模型分类的提示词") },
              { href: `/${lang}/guides`, label: t("Prompting guides", "Guías de prompting", "Guias de prompting", "提示词指南") },
              { href: `/${lang}/glossary`, label: t("Glossary", "Glosario", "Glossário", "术语表") },
            ],
          },
        ],
      },
    ],
    steps: { name: t("How to analyze and improve a prompt with Promptea", "Cómo analizar y mejorar un prompt con Promptea", "Como analisar e melhorar um prompt com o Promptea", "如何用Promptea分析并改进提示词"), steps: howToSteps },
    faq: [
      {
        q: t("What is Promptea?", "¿Qué es Promptea?", "O que é o Promptea?", "Promptea是什么？"),
        a: t(
          "Promptea is a free web tool that analyzes a prompt, scores it from 0 to 100 on six criteria, lists what to fix and writes an optimized version for the AI model you choose. It also recommends which AI fits a task, publishes a verified AI news story every morning (AI Daily) and shows model benchmarks with their source and date.",
          "Promptea es una herramienta web gratuita que analiza un prompt, lo puntúa de 0 a 100 en seis criterios, lista qué corregir y escribe una versión optimizada para el modelo de IA que elijas. También recomienda qué IA conviene para una tarea, publica cada mañana una noticia de IA verificada (IA al Día) y muestra benchmarks de modelos con su fuente y fecha.",
          "O Promptea é uma ferramenta web gratuita que analisa um prompt, dá uma pontuação de 0 a 100 em seis critérios, lista o que corrigir e escreve uma versão otimizada para o modelo de IA que você escolher. Também recomenda qual IA combina com uma tarefa, publica uma notícia de IA verificada todas as manhãs (AI Daily, em inglês e espanhol) e mostra benchmarks de modelos com fonte e data.",
          "Promptea是一款免费的网页工具：它会分析提示词，按六项标准给出0到100分的评分，列出需要修改的地方，并为你选择的AI模型写出优化版本。它还会推荐适合某项任务的AI，每天早上发布一条经过核实的AI新闻（AI Daily，仅提供英文和西班牙文版本），并展示注明来源和日期的模型基准测试。",
        ),
      },
      {
        q: t("Is Promptea free? Do I need an account?", "¿Promptea es gratis? ¿Necesito una cuenta?", "O Promptea é gratuito? Preciso de uma conta?", "Promptea免费吗？需要注册账号吗？"),
        a: t(
          "Analyzing a prompt is free and does not require an account. The weekly newsletter is optional and only asks for an email address if you choose to subscribe.",
          "Analizar un prompt es gratis y no requiere cuenta. El newsletter semanal es opcional y solo pide un email si decidís suscribirte.",
          "Analisar um prompt é gratuito e não exige conta. A newsletter semanal é opcional e só pede um endereço de e-mail se você decidir assinar.",
          "分析提示词是免费的，也不需要账号。每周的邮件通讯是可选的，只有你决定订阅时才需要填写电子邮箱地址。",
        ),
      },
      {
        q: t("How does Promptea score a prompt?", "¿Cómo puntúa Promptea un prompt?", "Como o Promptea pontua um prompt?", "Promptea如何给提示词评分？"),
        a: t(
          `It applies fixed, deterministic rules to the text and combines six dimensions: ${SCORE_DIMENSIONS.map((d) => d.label.en.toLowerCase()).join(", ")}. The weight of each dimension depends on the kind of task it detects, and the same prompt always gets the same score. No language model decides the score. The method is public on the methodology page.`,
          `Aplica reglas fijas y determinísticas al texto y combina seis dimensiones: ${SCORE_DIMENSIONS.map((d) => d.label.es.toLowerCase()).join(", ")}. El peso de cada dimensión depende del tipo de tarea que detecta, y el mismo prompt siempre da el mismo puntaje. Ningún modelo de lenguaje decide el puntaje. El método es público en la página de metodología.`,
          `Ele aplica regras fixas e determinísticas ao texto e combina seis dimensões: ${SCORE_DIMENSIONS.map((d) => d.label.pt.toLowerCase()).join(", ")}. O peso de cada dimensão depende do tipo de tarefa detectado, e o mesmo prompt sempre recebe a mesma pontuação. Nenhum modelo de linguagem decide a pontuação. O método é público na página de metodologia.`,
          `它对文本应用固定的确定性规则，并综合六个维度：${SCORE_DIMENSIONS.map((d) => d.label.zh).join("、")}。每个维度的权重取决于识别出的任务类型，同一条提示词总是得到相同的评分。评分不由任何语言模型决定。具体方法公开在方法论页面上。`,
        ),
      },
      {
        q: t("Which AI models does Promptea support?", "¿Qué modelos de IA soporta Promptea?", "Com quais modelos de IA o Promptea é compatível?", "Promptea支持哪些AI模型？"),
        a: t(
          `It writes prompts for ${modelFamilyList()}, with ${models.length} current models in its registry (verified against the providers' own documentation, last on ${verified}). Promptea optimizes prompts for these models; it does not run them.`,
          `Escribe prompts para ${modelFamilyList()}, con ${models.length} modelos vigentes en su registro (verificados contra la documentación oficial de cada proveedor, por última vez el ${verified}). Promptea optimiza prompts para esos modelos; no los ejecuta.`,
          `Ele escreve prompts para ${modelFamilyList()}, com ${models.length} modelos atuais no registro (verificados na documentação dos próprios provedores, pela última vez em ${verified}). O Promptea otimiza prompts para esses modelos; ele não os executa.`,
          `它为${modelFamilyList().replace(/, /g, "、")}编写提示词，模型注册表中收录了${models.length}个当前模型（均对照各提供商自己的文档核实，最近一次核实于${verified}）。Promptea为这些模型优化提示词，但不运行它们。`,
        ),
      },
      {
        q: t("What kinds of prompts can I analyze?", "¿Qué tipos de prompts puedo analizar?", "Que tipos de prompt posso analisar?", "我可以分析哪些类型的提示词？"),
        a: t(
          `${purposes.length} purposes: ${purposes.join(", ")}. Beyond the purpose you pick, the engine detects ${TASK_TYPES.length} task types (for example debugging, data extraction or customer support) and adapts the rules to them.`,
          `${purposes.length} propósitos: ${purposes.join(", ")}. Además del propósito que elegís, el motor detecta ${TASK_TYPES.length} tipos de tarea (por ejemplo depuración, extracción de datos o atención al cliente) y adapta las reglas a cada uno.`,
          `${purposes.length} propósitos: ${purposes.join(", ")}. Além do propósito que você escolhe, o motor detecta ${TASK_TYPES.length} tipos de tarefa (por exemplo, depuração, extração de dados ou atendimento ao cliente) e adapta as regras a eles.`,
          `${purposes.length}种用途：${purposes.join("、")}。除了你选择的用途，引擎还能识别${TASK_TYPES.length}种任务类型（例如调试、数据提取或客户支持），并据此调整规则。`,
        ),
      },
      {
        q: t("Does Promptea store my prompts?", "¿Promptea guarda mis prompts?", "O Promptea guarda os meus prompts?", "Promptea会保存我的提示词吗？"),
        a: t(
          "By default, telemetry stores only metadata (score, task type, target model, language, finding IDs), not the text of your prompt. Your prompt library lives in your own browser. Share cards carry numbers only, never the prompt. Details are in the privacy policy.",
          "Por defecto, la telemetría guarda solo metadatos (puntaje, tipo de tarea, modelo destino, idioma, IDs de hallazgos), no el texto de tu prompt. Tu biblioteca de prompts vive en tu propio navegador. Las tarjetas para compartir llevan solo números, nunca el prompt. Los detalles están en la política de privacidad.",
          "Por padrão, a telemetria guarda apenas metadados (pontuação, tipo de tarefa, modelo de destino, idioma, IDs dos achados), não o texto do seu prompt. Sua biblioteca de prompts fica no seu próprio navegador. Os cartões para compartilhar levam só números, nunca o prompt. Os detalhes estão na política de privacidade.",
          "默认情况下，遥测只保存元数据（评分、任务类型、目标模型、语言、问题ID），不保存你的提示词文本。你的提示词库保存在你自己的浏览器里。分享卡片只包含数字，从不包含提示词。详情请见隐私政策。",
        ),
      },
      {
        q: t("Does a high score guarantee a better answer?", "¿Un puntaje alto garantiza una mejor respuesta?", "Uma pontuação alta garante uma resposta melhor?", "评分高就能保证得到更好的回答吗？"),
        a: t(
          "No. The score measures how completely a prompt is specified (goal, context, limits, output format, checkability, safety). It does not run the prompt and it cannot predict the quality of a model's answer. Use it to find gaps, then test the prompt with your model.",
          "No. El puntaje mide qué tan completo está un prompt (objetivo, contexto, límites, formato de salida, verificabilidad, seguridad). No ejecuta el prompt y no puede predecir la calidad de la respuesta de un modelo. Usalo para encontrar huecos y después probá el prompt con tu modelo.",
          "Não. A pontuação mede o quanto um prompt está completamente especificado (objetivo, contexto, limites, formato de saída, verificabilidade, segurança). Ela não executa o prompt e não consegue prever a qualidade da resposta de um modelo. Use-a para encontrar lacunas e depois teste o prompt com o seu modelo.",
          "不能。评分衡量的是提示词描述得是否完整（目标、上下文、限制、输出格式、可验证性、安全性）。它不会运行提示词，也无法预测模型回答的质量。用它找出遗漏，然后再用你的模型测试这条提示词。",
        ),
      },
    ],
    updated: CONTENT_UPDATED.howItWorks,
  };
}

// ---------------------------------------------------------------------------
// About
// ---------------------------------------------------------------------------

export function aboutDoc(lang: Locale): PageDoc {
  const t = tr(lang);
  const x = getXLinks();

  const contactItems: Array<{ href: string; label: string }> = [
    { href: STUDIO_URL, label: `${STUDIO_NAME} (${STUDIO_URL.replace("https://", "")})` },
  ];
  if (x.handle) contactItems.push({ href: x.url, label: `X: @${x.handle}` });

  return {
    title: t("About Promptea — who builds it and why you can trust it", "Acerca de Promptea — quién la desarrolla y por qué podés confiar", "Sobre o Promptea — quem faz e por que você pode confiar", "关于Promptea：谁在开发它，为什么值得信任"),
    description: t(
      "Promptea is designed and developed by eterlab. What the product does, how it handles sources, privacy and corrections, and how to cite it.",
      "Promptea está diseñada y desarrollada por eterlab. Qué hace el producto, cómo maneja fuentes, privacidad y correcciones, y cómo citarlo.",
      "O Promptea é projetado e desenvolvido pela eterlab. O que o produto faz, como lida com fontes, privacidade e correções, e como citá-lo.",
      "Promptea由eterlab设计和开发。了解这款产品能做什么、如何处理来源、隐私和更正，以及如何引用它。",
    ),
    h1: t("About Promptea", "Acerca de Promptea", "Sobre o Promptea", "关于Promptea"),
    tldr: t(
      "Promptea is a free prompt analyzer and AI toolkit, designed and developed by eterlab. It scores prompts with public, deterministic rules, publishes one verified AI story a day with its sources, and states the source and date of every dataset it shows.",
      "Promptea es un analizador de prompts gratuito y un conjunto de herramientas de IA, diseñado y desarrollado por eterlab. Puntúa prompts con reglas públicas y determinísticas, publica una noticia de IA verificada por día con sus fuentes y declara la fuente y la fecha de cada conjunto de datos que muestra.",
      "O Promptea é um analisador de prompts e um conjunto de ferramentas de IA gratuito, projetado e desenvolvido pela eterlab. Ele pontua prompts com regras públicas e determinísticas, publica uma notícia de IA verificada por dia com as fontes e informa a fonte e a data de cada conjunto de dados que mostra.",
      "Promptea是一款免费的提示词分析器和AI工具集，由eterlab设计和开发。它用公开、确定性的规则为提示词评分，每天发布一条经过核实并附带来源的AI新闻，并为展示的每一组数据注明来源和日期。",
    ),
    sections: [
      {
        id: "who",
        heading: t("Who is behind Promptea", "Quién está detrás de Promptea", "Quem está por trás do Promptea", "谁在打造Promptea"),
        blocks: [
          {
            type: "p",
            text: t(
              `Promptea is designed and developed by ${STUDIO_NAME}. Every release is documented in the public changelog.`,
              `Promptea está diseñada y desarrollada por ${STUDIO_NAME}. Cada versión queda documentada en el changelog público.`,
              `O Promptea é projetado e desenvolvido pela ${STUDIO_NAME}. Cada versão é documentada no histórico de versões público.`,
              `Promptea由${STUDIO_NAME}设计和开发。每次发布都记录在公开的更新日志中。`,
            ),
          },
          { type: "links", items: contactItems },
        ],
      },
      {
        id: "what",
        heading: t("What Promptea does", "Qué hace Promptea", "O que o Promptea faz", "Promptea能做什么"),
        blocks: [
          {
            type: "ul",
            items: [
              t("Prompt analyzer: a 0–100 score on six criteria, findings, recommendations and an optimized prompt per AI model.", "Analizador de prompts: puntaje de 0 a 100 en seis criterios, hallazgos, recomendaciones y un prompt optimizado por modelo de IA.", "Analisador de prompts: uma pontuação de 0 a 100 em seis critérios, achados, recomendações e um prompt otimizado por modelo de IA.", "提示词分析器：按六项标准给出0到100分的评分、发现的问题、建议，以及针对每个AI模型优化后的提示词。"),
              t("Best AI: describe a task and get a ranked recommendation of which AI and model fits, with the reasons.", "Mejor IA: describí una tarea y recibí una recomendación ordenada de qué IA y modelo conviene, con las razones.", "Melhor IA: descreva uma tarefa e receba uma recomendação ordenada de qual IA e qual modelo combinam, com os motivos.", "最佳AI：描述一项任务，获得一份排好序的推荐，告诉你哪个AI和模型最合适，并说明理由。"),
              t("AI Daily and the weekly digest: one verified AI story every morning, a weekly recap and a look ahead.", "IA al Día y resumen semanal: una noticia de IA verificada cada mañana, un repaso semanal y un vistazo a la semana que viene.", "AI Daily e o resumo semanal: uma notícia de IA verificada todas as manhãs, um resumo da semana e um olhar para a semana seguinte (em inglês e espanhol).", "AI Daily和每周摘要：每天早上一条经过核实的AI新闻，外加每周回顾和下周展望（仅提供英文和西班牙文版本）。"),
              t("Benchmarks: rankings of AI models by category, with source, date and metric.", "Benchmarks: rankings de modelos de IA por categoría, con fuente, fecha y métrica.", "Benchmarks: rankings de modelos de IA por categoria, com fonte, data e métrica.", "基准测试：按类别排列的AI模型排名，注明来源、日期和指标。"),
              t("Guides, glossary and per-model templates for prompt engineering.", "Guías, glosario y plantillas por modelo para prompt engineering.", "Guias, glossário e templates por modelo para engenharia de prompt.", "提示词工程指南、术语表和按模型分类的模板。"),
            ],
          },
          {
            type: "links",
            items: [
              { href: `/${lang}/analyzer`, label: t("Prompt analyzer", "Analizador de prompts", "Analisador de prompts", "提示词分析器") },
              { href: `/${lang}/best-ai`, label: t("Find the best AI", "Elegir la mejor IA", "Encontrar a melhor IA", "找到最合适的AI") },
              { href: `/${lang}/flow`, label: t("Prompt flow", "Flujo de prompts", "Fluxo de prompts", "提示词流程") },
              { href: `/${lang}/blog`, label: "AI Daily" },
              { href: `/${lang}/benchmarks`, label: t("Benchmarks", "Benchmarks", "Benchmarks", "基准测试") },
            ],
          },
        ],
      },
      {
        id: "principles",
        heading: t("Principles", "Principios", "Princípios", "原则"),
        blocks: [
          {
            type: "ul",
            items: [
              t("Public method. How the score and the AI recommendation are computed is documented on the methodology page.", "Método público. Cómo se calcula el puntaje y la recomendación de IA está documentado en la página de metodología.", "Método público. A forma como a pontuação e a recomendação de IA são calculadas está documentada na página de metodologia.", "方法公开。评分和AI推荐如何计算，都写在方法论页面上。"),
              t("Sources and dates on everything. News links its sources, model data carries the date it was verified, and benchmarks show their source and update date.", "Fuentes y fechas en todo. Las noticias enlazan sus fuentes, los datos de modelos llevan la fecha en que se verificaron y los benchmarks muestran su fuente y fecha de actualización.", "Fontes e datas em tudo. As notícias trazem links para as fontes, os dados dos modelos levam a data em que foram verificados e os benchmarks mostram a fonte e a data de atualização.", "处处注明来源和日期。新闻附有来源链接，模型数据标明核实日期，基准测试显示来源和更新日期。"),
              t("No invented authorship. AI Daily is signed “Promptea Editorial”, not a made-up person, and says it is researched with AI assistance.", "Sin autoría inventada. IA al Día se firma “Promptea Editorial”, no una persona inventada, y aclara que se investiga con asistencia de IA.", "Sem autoria inventada. O AI Daily é assinado como “Promptea Editorial”, não por uma pessoa fictícia, e informa que é pesquisado com apoio de IA.", "不虚构作者。AI Daily的署名是“Promptea Editorial”，而不是一个虚构的人，并说明它是在AI协助下调研完成的。"),
              t("Corrections are visible. A corrected article keeps its URL and shows a correction notice.", "Las correcciones se ven. Un artículo corregido conserva su URL y muestra un aviso de corrección.", "As correções ficam visíveis. Um artigo corrigido mantém a URL e mostra um aviso de correção.", "更正公开可见。更正后的文章保留原有URL，并显示更正说明。"),
              t("Privacy by default. Telemetry keeps metadata, not your prompt text.", "Privacidad por defecto. La telemetría guarda metadatos, no el texto de tus prompts.", "Privacidade por padrão. A telemetria guarda metadados, não o texto do seu prompt.", "默认保护隐私。遥测只保存元数据，不保存你的提示词文本。"),
              t("Honest limits. Promptea says what it does not do (see the methodology).", "Límites honestos. Promptea dice qué no hace (ver la metodología).", "Limites declarados. O Promptea diz o que não faz (veja a metodologia).", "坦诚说明局限。Promptea会说明自己不做什么（见方法论）。"),
            ],
          },
        ],
      },
      {
        id: "cite",
        heading: t("How to cite Promptea", "Cómo citar Promptea", "Como citar o Promptea", "如何引用Promptea"),
        blocks: [
          {
            type: "p",
            text: t(
              "Cite the page you used, with its title and the date you accessed it, for example: “Promptea. Prompt analyzer methodology. promptea.me/en/methodology (accessed 8 November 2026).” For news, cite the AI Daily article and, wherever possible, the primary sources it links. For benchmark figures, name the original source shown on the page (Artificial Analysis, OpenRouter or Design Arena) and its “as of” date.",
              "Citá la página que usaste, con su título y la fecha de acceso, por ejemplo: “Promptea. Metodología del analizador de prompts. promptea.me/es/methodology (consultado el 8 de noviembre de 2026).” Para noticias, citá el artículo de IA al Día y, siempre que se pueda, las fuentes primarias que enlaza. Para cifras de benchmarks, nombrá la fuente original que muestra la página (Artificial Analysis, OpenRouter o Design Arena) y su fecha de actualización.",
              "Cite a página que você usou, com o título e a data de acesso, por exemplo: “Promptea. Metodologia do analisador de prompts. promptea.me/pt/methodology (acesso em 8 de novembro de 2026).” Para notícias, cite o artigo do AI Daily e, sempre que possível, as fontes primárias que ele indica. Para números de benchmarks, nomeie a fonte original mostrada na página (Artificial Analysis, OpenRouter ou Design Arena) e a data de referência.",
              "引用时请注明你使用的页面、页面标题和访问日期，例如：“Promptea。提示词分析器方法论。promptea.me/zh/methodology（访问日期：2026年11月8日）。”引用新闻时，请引用AI Daily的文章，并尽可能同时引用文章所链接的一手来源。引用基准测试数据时，请注明页面上显示的原始来源（Artificial Analysis、OpenRouter或Design Arena）及其数据截至日期。",
            ),
          },
        ],
      },
      {
        id: "machine-readable",
        heading: t("For search engines and AI assistants", "Para buscadores y asistentes de IA", "Para buscadores e assistentes de IA", "面向搜索引擎和AI助手"),
        blocks: [
          {
            type: "p",
            text: t(
              "Promptea publishes a machine-readable map of its content: an llms.txt index, a full-text llms-full.txt, a markdown version of every guide, glossary term, model page and AI Daily story (add .md to the page URL), an XML sitemap and an RSS feed per language. Public pages are open to search and AI crawlers (see robots.txt).",
              "Promptea publica un mapa legible por máquinas de su contenido: un índice llms.txt, un llms-full.txt con el texto completo, una versión en markdown de cada guía, término del glosario, página de modelo y nota de IA al Día (agregá .md a la URL de la página), un sitemap XML y un feed RSS por idioma. Las páginas públicas están abiertas a rastreadores de búsqueda y de IA (ver robots.txt).",
              "O Promptea publica um mapa do seu conteúdo legível por máquinas: um índice llms.txt, um llms-full.txt com o texto completo, uma versão em markdown de cada guia, termo do glossário e página de modelo (adicione .md à URL da página), um sitemap XML e um feed RSS do AI Daily em inglês e em espanhol. As páginas públicas estão abertas a buscadores e crawlers de IA (veja o robots.txt).",
              "Promptea发布了一份机器可读的内容地图：llms.txt索引、包含全文的llms-full.txt、每篇指南、术语表词条和模型页面的Markdown版本（在页面URL后加上“.md”）、XML站点地图，以及AI Daily的英文和西班牙文RSS订阅源。公开页面向搜索引擎和AI爬虫开放（见robots.txt）。",
            ),
          },
          {
            type: "links",
            items: [
              { href: "/llms.txt", label: "llms.txt" },
              { href: "/llms-full.txt", label: "llms-full.txt" },
              { href: "/sitemap.xml", label: "sitemap.xml" },
              { href: `/${lang}/blog/feed.xml`, label: t("AI Daily RSS feed", "Feed RSS de IA al Día", "Feed RSS do AI Daily", "AI Daily RSS订阅源") },
            ],
          },
        ],
      },
      {
        id: "feedback",
        heading: t("Feedback and corrections", "Feedback y correcciones", "Feedback e correções", "反馈和更正"),
        blocks: [
          {
            type: "p",
            text: t(
              "Found a mistake in an article, a guide or a model entry? Use the “Feedback” button in the footer of any page. Verified corrections are published with a visible note.",
              "¿Encontraste un error en un artículo, una guía o una ficha de modelo? Usá el botón “Feedback” del pie de cualquier página. Las correcciones verificadas se publican con una nota visible.",
              "Encontrou um erro em um artigo, um guia ou na ficha de um modelo? Use o botão “Feedback” no rodapé de qualquer página. As correções verificadas são publicadas com uma nota visível.",
              "在文章、指南或模型条目中发现了错误？请使用任意页面页脚的“反馈”按钮。经过核实的更正会附上醒目的说明后发布。",
            ),
          },
        ],
      },
    ],
    faq: [
      {
        q: t("Who makes Promptea?", "¿Quién hace Promptea?", "Quem faz o Promptea?", "Promptea是谁开发的？"),
        a: t(`Promptea is designed and developed by ${STUDIO_NAME} (${STUDIO_URL.replace("https://", "")}).`, `Promptea está diseñada y desarrollada por ${STUDIO_NAME} (${STUDIO_URL.replace("https://", "")}).`, `O Promptea é projetado e desenvolvido pela ${STUDIO_NAME} (${STUDIO_URL.replace("https://", "")}).`, `Promptea由${STUDIO_NAME}（${STUDIO_URL.replace("https://", "")}）设计和开发。`),
      },
      {
        q: t("Who writes AI Daily?", "¿Quién escribe IA al Día?", "Quem escreve o AI Daily?", "AI Daily由谁撰写？"),
        a: t(
          "AI Daily is signed “Promptea Editorial”. Each story is researched with AI assistance and verified against primary sources before publishing, and every claim links to its source. There is no individual byline because no individual writes it.",
          "IA al Día se firma “Promptea Editorial”. Cada nota se investiga con asistencia de IA y se verifica contra fuentes primarias antes de publicarse, y cada afirmación enlaza a su fuente. No hay firma personal porque no la escribe una persona en particular.",
          "O AI Daily é assinado como “Promptea Editorial”. Cada notícia é pesquisada com apoio de IA e verificada em fontes primárias antes da publicação, e cada afirmação leva um link para a fonte. Não há assinatura individual porque nenhuma pessoa o escreve sozinha.",
          "AI Daily的署名是“Promptea Editorial”。每条新闻都在AI协助下完成调研，并在发布前对照一手来源核实，每一项说法都链接到出处。没有个人署名，因为它并不是由某一个人撰写的。",
        ),
      },
      {
        q: t("Can I reuse or cite Promptea's content?", "¿Puedo reutilizar o citar el contenido de Promptea?", "Posso reutilizar ou citar o conteúdo do Promptea?", "我可以使用或引用Promptea的内容吗？"),
        a: t(
          "You can cite and link to any public page. Please name Promptea and link to the page you used. For benchmark figures, also name the original source and date shown on the page.",
          "Podés citar y enlazar cualquier página pública. Nombrá a Promptea y enlazá la página que usaste. Para cifras de benchmarks, nombrá también la fuente original y la fecha que muestra la página.",
          "Você pode citar e linkar qualquer página pública. Nomeie o Promptea e inclua o link da página usada. Para números de benchmarks, nomeie também a fonte original e a data mostradas na página.",
          "你可以引用和链接任何公开页面。请注明Promptea，并附上你所用页面的链接。引用基准测试数据时，还请注明页面上显示的原始来源和日期。",
        ),
      },
    ],
    updated: CONTENT_UPDATED.about,
  };
}

// ---------------------------------------------------------------------------
// Methodology
// ---------------------------------------------------------------------------

export function methodologyDoc(lang: Locale): PageDoc {
  const t = tr(lang);
  const models = currentModels();

  return {
    title: t("Methodology: how Promptea scores prompts, picks AIs and builds AI Daily", "Metodología: cómo Promptea puntúa prompts, elige IAs y arma IA al Día", "Metodologia: como o Promptea pontua prompts, escolhe IAs e monta o AI Daily", "方法论：Promptea如何为提示词评分、选择AI和编写AI Daily"),
    description: t(
      "How the 0–100 prompt score works, what is deterministic and what uses an LLM, how the best-AI match is made, the editorial policy of AI Daily and how benchmarks are collected.",
      "Cómo funciona el puntaje de 0 a 100, qué es determinístico y qué usa un LLM, cómo se hace la recomendación de IA, la política editorial de IA al Día y cómo se obtienen los benchmarks.",
      "Como funciona a pontuação de 0 a 100 do prompt, o que é determinístico e o que usa um LLM, como é feita a recomendação da melhor IA, a política editorial do AI Daily e como os benchmarks são coletados.",
      "0到100分的提示词评分如何计算，哪些环节是确定性的、哪些用到LLM，最佳AI推荐如何得出，AI Daily的编辑方针，以及基准测试数据如何收集。",
    ),
    h1: t("Methodology", "Metodología", "Metodologia", "方法论"),
    tldr: t(
      `Promptea scores prompts with deterministic rules (engine ${ENGINE.version}): the same input always gives the same score, and no language model decides it. An optional LLM step can rewrite the optimized prompt, but it never changes the score. AI recommendations come from a rule-based matcher over a model registry checked against official provider docs. AI Daily stories need sources, and benchmarks are shown per source with their date and never merged into one number.`,
      `Promptea puntúa prompts con reglas determinísticas (motor ${ENGINE.version}): la misma entrada da siempre el mismo puntaje y ningún modelo de lenguaje lo decide. Un paso opcional con LLM puede reescribir el prompt optimizado, pero nunca cambia el puntaje. Las recomendaciones de IA salen de un matcher por reglas sobre un registro de modelos verificado contra la documentación oficial. Las notas de IA al Día exigen fuentes y los benchmarks se muestran por fuente, con su fecha, y nunca se fusionan en un solo número.`,
      `O Promptea pontua prompts com regras determinísticas (motor ${ENGINE.version}): a mesma entrada sempre gera a mesma pontuação, e nenhum modelo de linguagem a decide. Uma etapa opcional com LLM pode reescrever o prompt otimizado, mas nunca altera a pontuação. As recomendações de IA vêm de um comparador baseado em regras sobre um registro de modelos conferido na documentação oficial dos provedores. As notícias do AI Daily exigem fontes, e os benchmarks são mostrados por fonte, com data, e nunca fundidos em um número só.`,
      `Promptea用确定性规则为提示词评分（引擎${ENGINE.version}）：相同的输入总是得到相同的评分，评分不由任何语言模型决定。一个可选的LLM步骤可以改写优化后的提示词，但永远不会改变评分。AI推荐来自一个基于规则的匹配器，它所依据的模型注册表已对照各提供商的官方文档核实。AI Daily的报道必须有来源；基准测试按来源分别展示并注明日期，绝不合并成一个数字。`,
    ),
    sections: [
      {
        id: "pipeline",
        heading: t("How a prompt is analyzed", "Cómo se analiza un prompt", "Como um prompt é analisado", "提示词如何被分析"),
        blocks: [
          {
            type: "ol",
            items: [
              t("Normalize the text and separate what you asked for (the core) from any scaffold Promptea generated earlier, so re-analyzing an optimized prompt does not grow it or stack headers.", "Se normaliza el texto y se separa lo que pediste (el núcleo) de cualquier estructura que Promptea haya generado antes, para que re-analizar un prompt optimizado no lo haga crecer ni apile encabezados.", "Normalizar o texto e separar o que você pediu (o núcleo) de qualquer estrutura que o Promptea tenha gerado antes, para que reanalisar um prompt otimizado não o faça crescer nem empilhe cabeçalhos.", "规范化文本，并把你真正要求的内容（核心）与Promptea之前生成的框架区分开，这样重新分析一条优化后的提示词时，它不会越变越长，也不会叠加标题。"),
              t(`Classify the task into one of ${TASK_TYPES.length} types (for example coding, debugging, data extraction, translation, marketing) using your chosen purpose and the wording of the prompt.`, `Se clasifica la tarea en uno de ${TASK_TYPES.length} tipos (por ejemplo código, depuración, extracción de datos, traducción, marketing) según el propósito elegido y la redacción del prompt.`, `Classificar a tarefa em um de ${TASK_TYPES.length} tipos (por exemplo, programação, depuração, extração de dados, tradução, marketing), usando o propósito escolhido e a redação do prompt.`, `结合你选择的用途和提示词的措辞，把任务归入${TASK_TYPES.length}种类型之一（例如编程、调试、数据提取、翻译、营销）。`),
              t("Detect features: goal, inputs, audience, examples, constraints, tone, length, timeframe, output format, success criteria, error details, reproduction steps, injection-like text and contradictions.", "Se detectan rasgos: objetivo, inputs, audiencia, ejemplos, restricciones, tono, largo, plazo, formato de salida, criterios de éxito, detalle del error, pasos de reproducción, texto con forma de inyección y contradicciones.", "Detectar características: objetivo, insumos, público, exemplos, restrições, tom, tamanho, prazo, formato de saída, critérios de sucesso, detalhes do erro, passos para reproduzir, texto com cara de injeção e contradições.", "识别特征：目标、输入、受众、示例、约束、语气、篇幅、时间范围、输出格式、成功标准、错误详情、复现步骤、类似注入的文本以及相互矛盾之处。"),
              t("Score the six dimensions and combine them with weights that depend on the task type (verifiability weighs more for debugging than for a casual text request).", "Se puntúan las seis dimensiones y se combinan con pesos que dependen del tipo de tarea (la verificabilidad pesa más en depuración que en un pedido de texto cotidiano).", "Pontuar as seis dimensões e combiná-las com pesos que dependem do tipo de tarefa (a verificabilidade pesa mais em depuração do que em um pedido casual de texto).", "为六个维度评分，并按随任务类型而变的权重进行合并（可验证性在调试任务中比在随意的文本请求中更重要）。"),
              t("Apply a cap when essential material is missing (for example a translation request with no text to translate cannot score as complete).", "Se aplica un tope cuando falta material esencial (por ejemplo, un pedido de traducción sin el texto a traducir no puede puntuar como completo).", "Aplicar um teto quando falta material essencial (por exemplo, um pedido de tradução sem o texto a traduzir não pode pontuar como completo).", "缺少关键材料时设置上限（例如，没有附上待翻译文本的翻译请求，不可能得到完整的评分）。"),
              t("Build the optimized prompt for the chosen AI from the findings, and score it again with the same rubric to show a before → after score.", "Se arma el prompt optimizado para la IA elegida a partir de los hallazgos y se vuelve a puntuar con el mismo criterio para mostrar un puntaje antes → después.", "Montar o prompt otimizado para a IA escolhida a partir dos achados e pontuá-lo de novo com a mesma rubrica, para mostrar a pontuação antes → depois.", "根据发现的问题，为所选AI构建优化后的提示词，再用同一套标准重新评分，展示优化前→优化后的评分。"),
            ],
          },
          {
            type: "p",
            text: t(
              "This core runs on the server with no network calls and accepts up to 12,000 characters. Its guarantees (idempotence, stable finding IDs, strict language localization, no amplification of prompt injection, inputs that never crash it) are written down in the engine contract and enforced by automated tests.",
              "Este núcleo corre en el servidor sin llamadas de red y acepta hasta 12.000 caracteres. Sus garantías (idempotencia, IDs de hallazgos estables, localización estricta por idioma, sin amplificar inyecciones de prompt, entradas que nunca lo hacen fallar) están escritas en el contrato del motor y verificadas con tests automáticos.",
              "Esse núcleo roda no servidor, sem chamadas de rede, e aceita até 12.000 caracteres. Suas garantias (idempotência, IDs de achados estáveis, localização estrita por idioma, não amplificar injeção de prompt, entradas que nunca o derrubam) estão escritas no contrato do motor e são verificadas por testes automatizados.",
              "这一核心在服务器上运行，不发出任何网络请求，最多接受12,000个字符。它的各项保证（幂等性、稳定的问题ID、严格按语言本地化、不放大提示词注入、任何输入都不会使其崩溃）都写在引擎契约中，并由自动化测试强制执行。",
            ),
          },
        ],
      },
      {
        id: "dimensions",
        heading: t("The six dimensions", "Las seis dimensiones", "As seis dimensões", "六个维度"),
        blocks: [
          { type: "dl", items: SCORE_DIMENSIONS.map((d) => ({ term: d.label[lang], text: d.measures[lang] })) },
          {
            type: "p",
            text: t(
              "Each dimension is scored 0–100 and the weighted total is the prompt's score. Alongside it, Promptea reports a confidence value (0–100) that says how much signal the engine found in the text. It is not a probability of the prompt being good.",
              "Cada dimensión se puntúa de 0 a 100 y el total ponderado es el puntaje del prompt. Junto a él, Promptea informa un valor de confianza (0–100) que indica cuánta señal encontró el motor en el texto. No es la probabilidad de que el prompt sea bueno.",
              "Cada dimensão recebe de 0 a 100, e o total ponderado é a pontuação do prompt. Junto com ela, o Promptea informa um valor de confiança (0–100) que diz quanto sinal o motor encontrou no texto. Não é a probabilidade de o prompt ser bom.",
              "每个维度的得分为0到100，加权总分就是提示词的评分。除此之外，Promptea还会给出一个置信度（0–100），表示引擎在文本中找到了多少信号。它并不是提示词质量好的概率。",
            ),
          },
        ],
      },
      {
        id: "llm-layer",
        heading: t("Where an LLM is used (and where it is not)", "Dónde se usa un LLM (y dónde no)", "Onde um LLM é usado (e onde não é)", "哪些环节使用LLM（哪些不用）"),
        blocks: [
          {
            type: "ul",
            items: [
              t("The score, findings and recommendations are never produced by an LLM.", "El puntaje, los hallazgos y las recomendaciones nunca los produce un LLM.", "A pontuação, os achados e as recomendações nunca são produzidos por um LLM.", "评分、发现的问题和建议从不由LLM生成。"),
              t("Optional refinement: when a provider is configured, an LLM can rewrite the optimized prompt following a strategy chosen by the engine. Providers are tried in order (by default Groq, then Anthropic’s Claude as failover). The rewrite must pass a quality gate; if it does not, or no provider is available, the deterministic prompt is returned.", "Refinado opcional: cuando hay un proveedor configurado, un LLM puede reescribir el prompt optimizado siguiendo una estrategia elegida por el motor. Los proveedores se prueban en orden (por defecto Groq y, como respaldo, Claude de Anthropic). La reescritura debe pasar un control de calidad; si no lo pasa, o no hay proveedor disponible, se devuelve el prompt determinístico.", "Refinamento opcional: quando há um provedor configurado, um LLM pode reescrever o prompt otimizado seguindo uma estratégia escolhida pelo motor. Os provedores são tentados em ordem (por padrão, Groq e depois o Claude, da Anthropic, como reserva). A reescrita precisa passar por um controle de qualidade; se não passar, ou se não houver provedor disponível, o prompt determinístico é devolvido.", "可选的润色：配置了提供商时，LLM可以按照引擎选定的策略改写优化后的提示词。提供商按顺序尝试（默认先用Groq，再以Anthropic的Claude作为备用）。改写结果必须通过质量检查；如果没有通过，或者没有可用的提供商，就返回确定性生成的提示词。"),
              t("In that step your prompt is treated as data, not as instructions; text that tries to override the instructions is removed before the rewrite and a rewrite that repeats it is rejected.", "En ese paso tu prompt se trata como dato, no como instrucciones; el texto que intenta anular las instrucciones se elimina antes de la reescritura y una reescritura que lo repite se rechaza.", "Nessa etapa o seu prompt é tratado como dado, não como instrução; texto que tenta sobrepor as instruções é removido antes da reescrita, e uma reescrita que o repita é rejeitada.", "在这一步中，你的提示词被当作数据而不是指令；试图覆盖指令的文本会在改写前被移除，重复这类文本的改写会被拒绝。"),
              t("Optional second opinion: an LLM judge can be enabled for low-confidence cases. It can only shift a separately shown blended value by at most ±10 points; the engine’s score itself is never modified.", "Segunda opinión opcional: se puede activar un juez LLM para casos de baja confianza. Solo puede mover un valor combinado que se muestra aparte, como máximo ±10 puntos; el puntaje del motor nunca se modifica.", "Segunda opinião opcional: um LLM avaliador pode ser ativado para casos de baixa confiança. Ele só pode deslocar em até ±10 pontos um valor combinado mostrado à parte; a pontuação do motor nunca é modificada.", "可选的第二意见：低置信度时可以启用LLM评审。它最多只能把一个单独显示的综合值调整±10分；引擎本身的评分永远不会被修改。"),
              t("Voice dictation, when you use it, sends audio to a transcription provider only to turn it into text; the audio is not stored.", "El dictado por voz, cuando lo usás, envía el audio a un proveedor de transcripción solo para convertirlo en texto; el audio no se guarda.", "O ditado por voz, quando você o usa, envia o áudio a um provedor de transcrição apenas para convertê-lo em texto; o áudio não é guardado.", "使用语音输入时，音频会发送给转写服务提供商，仅用于转换成文字；音频不会被保存。"),
            ],
          },
        ],
      },
      {
        id: "best-ai",
        heading: t("How “Find the best AI” decides", "Cómo decide “Elegir la mejor IA”", "Como o “Encontrar a melhor IA” decide", "“找到最合适的AI”如何做出判断"),
        blocks: [
          {
            type: "p",
            text: t(
              "The matcher is fully deterministic and uses no LLM. It extracts weighted signals from the prompt across 15 task categories (chat, coding, coding agent, research, long context, multimodal, data extraction, creative writing, marketing, translation, summarization, tutoring, image prompts, complex reasoning, fast/lightweight), then scores each candidate model by how well its verified capabilities fit those categories.",
              "El matcher es completamente determinístico y no usa LLM. Extrae señales ponderadas del prompt en 15 categorías de tarea (chat, código, agente de código, investigación, contexto largo, multimodal, extracción de datos, escritura creativa, marketing, traducción, resumen, tutoría, prompts de imagen, razonamiento complejo, rápido/liviano) y puntúa a cada modelo candidato según cuánto encajan sus capacidades verificadas con esas categorías.",
              "O comparador é totalmente determinístico e não usa LLM. Ele extrai do prompt sinais ponderados em 15 categorias de tarefa (chat, programação, agente de programação, pesquisa, contexto longo, multimodal, extração de dados, escrita criativa, marketing, tradução, resumo, tutoria, prompts de imagem, raciocínio complexo, rápido/leve) e depois pontua cada modelo candidato pelo quanto suas capacidades verificadas se encaixam nessas categorias.",
              "匹配器完全是确定性的，不使用LLM。它从提示词中提取15个任务类别（聊天、编程、编程智能体、调研、长上下文、多模态、数据提取、创意写作、营销、翻译、摘要、辅导、图像提示词、复杂推理、快速/轻量）的加权信号，然后根据每个候选模型经过核实的能力与这些类别的契合程度为其打分。",
            ),
          },
          {
            type: "ul",
            items: [
              t("Hard capability gates: a model without image input cannot win a multimodal task, one without native search is capped for research, one without structured output is capped for data extraction.", "Compuertas de capacidad: un modelo sin entrada de imagen no puede ganar una tarea multimodal, uno sin búsqueda nativa queda limitado en investigación, uno sin salida estructurada queda limitado en extracción de datos.", "Barreiras rígidas de capacidade: um modelo sem entrada de imagem não pode vencer uma tarefa multimodal, um sem busca nativa tem teto em pesquisa, um sem saída estruturada tem teto em extração de dados.", "硬性能力门槛：不支持图像输入的模型不可能在多模态任务中胜出；没有原生搜索的模型在调研任务中有上限；没有结构化输出的模型在数据提取任务中有上限。"),
              t("Only current models can be recommended; retired models never are.", "Solo se pueden recomendar modelos vigentes; los retirados nunca.", "Só modelos atuais podem ser recomendados; modelos aposentados nunca são.", "只推荐当前模型；已退役的模型永远不会被推荐。"),
              t("Confidence is low, medium or high, and a near-tie says so and names the deciding factor instead of faking certainty.", "La confianza es baja, media o alta, y un casi-empate lo dice y nombra el factor decisivo en lugar de aparentar certeza.", "A confiança é baixa, média ou alta, e um quase empate é informado, com o fator decisivo, em vez de fingir certeza.", "置信度分为低、中、高；几乎打平时会如实说明，并指出决定性因素，而不是假装很确定。"),
              t("Tools such as Claude Code or Codex are treated as environments, not models.", "Herramientas como Claude Code o Codex se tratan como entornos, no como modelos.", "Ferramentas como Claude Code ou Codex são tratadas como ambientes, não como modelos.", "Claude Code或Codex这类工具被视为环境，而不是模型。"),
            ],
          },
        ],
      },
      {
        // v1.8.9
        id: "flow",
        heading: t("How the Prompt flow is built", "Cómo se arma el Flujo de prompts", "Como o Fluxo de prompts é montado", "提示词流程是如何生成的"),
        blocks: [
          {
            type: "p",
            text: t(
              "The Prompt flow splits a main task into 2 to 6 steps. Claude (Anthropic’s Claude Haiku 5.5 by default) writes the steps and their prompts, and says which earlier steps each one needs; steps that need nothing from each other sit on the same row and can be done in parallel. The AI suggested for each step is then chosen by the same deterministic matcher as “Find the best AI”, so routing involves no LLM.",
              "El Flujo de prompts divide una tarea principal en 2 a 6 pasos. Claude (Claude Haiku 5.5 de Anthropic, por defecto) escribe los pasos y sus prompts, y dice qué pasos anteriores necesita cada uno; los pasos que no necesitan nada entre sí quedan en la misma fila y se pueden hacer en paralelo. Después, la IA sugerida para cada paso la elige el mismo matcher determinístico de “Elegir la mejor IA”, así que el ruteo no usa ningún LLM.",
              "O Fluxo de prompts divide uma tarefa principal em 2 a 6 etapas. O Claude (por padrão, o Claude Haiku 5.5, da Anthropic) escreve as etapas e seus prompts e indica de quais etapas anteriores cada uma precisa; as etapas que não precisam umas das outras ficam na mesma linha e podem ser feitas em paralelo. Depois, a IA sugerida para cada etapa é escolhida pelo mesmo comparador determinístico do “Encontrar a melhor IA”, então o roteamento não usa nenhum LLM.",
              "提示词流程会把一项主任务拆成2到6个步骤。由Claude（默认是Anthropic的Claude Haiku 5.5）编写各个步骤及其提示词，并说明每一步需要哪些前面的步骤；彼此互不依赖的步骤放在同一行，可以并行完成。随后，每一步推荐的AI由与“找到最合适的AI”相同的确定性匹配器挑选，因此分配过程不使用任何LLM。",
            ),
          },
          {
            type: "ul",
            items: [
              t("The task is treated as data: sentences that try to override the instructions are removed before it is sent, and the planner is told to keep every name, number and constraint as written and to invent nothing.", "La tarea se trata como dato: las frases que intentan anular las instrucciones se eliminan antes de enviarla, y al planificador se le pide conservar cada nombre, número y restricción tal como están y no inventar nada.", "A tarefa é tratada como dado: frases que tentam sobrepor as instruções são removidas antes do envio, e o planejador é instruído a manter cada nome, número e restrição como estão e a não inventar nada.", "任务被当作数据处理：试图覆盖指令的句子会在发送前被移除；规划器被要求原样保留每个名称、数字和限制条件，不得编造任何内容。"),
              t("Claude use has a hard monthly spending cap, a daily cap and a per-visitor daily limit. Crawlers and automated clients never trigger it. When AI is not available, Promptea’s own engine builds a basic plan from templates for the detected kind of task, so the tool always answers.", "El uso de Claude tiene un tope de gasto mensual estricto, un tope diario y un límite diario por visitante. Los crawlers y los clientes automatizados nunca lo activan. Cuando la IA no está disponible, el motor propio de Promptea arma un plan básico con plantillas para el tipo de tarea detectado, así que la herramienta siempre responde.", "O uso do Claude tem um teto de gasto mensal rígido, um teto diário e um limite diário por visitante. Crawlers e clientes automatizados nunca o acionam. Quando a IA não está disponível, o motor do próprio Promptea monta um plano básico com templates para o tipo de tarefa detectado, então a ferramenta sempre responde.", "Claude的使用设有严格的每月支出上限、每日上限和每位访客的每日次数限制。爬虫和自动化客户端永远不会触发它。AI不可用时，Promptea自己的引擎会按检测到的任务类型用模板生成基础方案，因此工具总能给出结果。"),
              t("Promptea does not store the task or the plan: they live in your browser tab. Only counters are kept (spend, requests, tokens, and a daily count per anonymous connection hash).", "Promptea no guarda la tarea ni el plan: quedan en la pestaña de tu navegador. Solo se guardan contadores (gasto, pedidos, tokens y un conteo diario por hash anónimo de conexión).", "O Promptea não guarda a tarefa nem o plano: eles ficam na aba do seu navegador. Só são guardados contadores (gasto, pedidos, tokens e uma contagem diária por hash anônimo de conexão).", "Promptea不会存储任务或方案：它们只保存在你的浏览器标签页中。只记录计数（支出、请求数、token数，以及按匿名连接哈希统计的每日次数）。"),
            ],
          },
          { type: "links", items: [{ href: `/${lang}/flow`, label: t("Prompt flow", "Flujo de prompts", "Fluxo de prompts", "提示词流程") }] },
        ],
      },
      {
        id: "registry",
        heading: t("The model registry", "El registro de modelos", "O registro de modelos", "模型注册表"),
        blocks: [
          {
            type: "p",
            text: t(
              `Promptea’s registry lists ${models.length} current models across ${TARGETS.length} AI families. Model IDs, context windows and capabilities are taken only from each provider’s official documentation; every entry stores the source URL and the date it was verified (latest: ${formatDay(modelsVerifiedAt(), lang)}). Superseded models stay in the registry as legacy, with a pointer to their replacement, so old links keep working but they are no longer offered or recommended.`,
              `El registro de Promptea lista ${models.length} modelos vigentes en ${TARGETS.length} familias de IA. Los IDs de modelo, ventanas de contexto y capacidades se toman solo de la documentación oficial de cada proveedor; cada entrada guarda la URL de la fuente y la fecha de verificación (última: ${formatDay(modelsVerifiedAt(), lang)}). Los modelos reemplazados quedan en el registro como legados, con un puntero a su reemplazo, para que los enlaces viejos sigan funcionando, pero ya no se ofrecen ni se recomiendan.`,
              `O registro do Promptea lista ${models.length} modelos atuais em ${TARGETS.length} famílias de IA. IDs de modelo, janelas de contexto e capacidades são retirados apenas da documentação oficial de cada provedor; cada item guarda a URL da fonte e a data da verificação (a mais recente: ${formatDay(modelsVerifiedAt(), lang)}). Os modelos substituídos ficam no registro como legado, com a indicação do substituto, de modo que os links antigos continuam funcionando, mas eles não são mais oferecidos nem recomendados.`,
              `Promptea的模型注册表收录了${TARGETS.length}个AI系列的${models.length}个当前模型。模型ID、上下文窗口和能力只取自各提供商的官方文档；每个条目都保存了来源URL和核实日期（最近一次：${formatDay(modelsVerifiedAt(), lang)}）。被取代的模型以旧版身份留在注册表中，并指向替代它的模型，这样旧链接仍然有效，但这些模型不再提供，也不再被推荐。`,
            ),
          },
          { type: "links", items: [{ href: `/${lang}/models`, label: t("Models and their capabilities", "Modelos y sus capacidades", "Modelos e suas capacidades", "模型及其能力") }] },
        ],
      },
      {
        id: "ai-daily",
        heading: t("AI Daily: editorial and sourcing policy", "IA al Día: política editorial y de fuentes", "AI Daily: política editorial e de fontes", "AI Daily：编辑和来源方针"),
        blocks: [
          {
            type: "ul",
            items: [
              t("One main story each morning, plus a weekly recap and a look at the week ahead. Weekly editions say which dates they cover.", "Una nota principal cada mañana, más un repaso semanal y un vistazo a la semana que viene. Las ediciones semanales indican qué fechas cubren.", "Uma notícia principal a cada manhã, além de um resumo semanal e de um olhar para a semana seguinte. As edições semanais dizem quais datas cobrem.", "每天早上一篇主要报道，外加每周回顾和下周展望。每周版会注明涵盖的日期。"),
              t("Freshness: a daily story must be about an event of the same editorial day (Buenos Aires time). A story about an earlier event can only be published with a disclosed reason, shown on the article.", "Frescura: una nota diaria debe tratar un hecho del mismo día editorial (hora de Buenos Aires). Una nota sobre un hecho anterior solo puede publicarse con un motivo declarado, visible en el artículo.", "Atualidade: uma notícia diária precisa tratar de um fato do mesmo dia editorial (horário de Buenos Aires). Uma notícia sobre um fato anterior só pode ser publicada com um motivo declarado, mostrado no artigo.", "时效性：每日报道必须关于同一编辑日（布宜诺斯艾利斯时间）发生的事件。关于更早事件的报道只能在说明理由的情况下发布，理由会显示在文章中。"),
              t("Sources: every article lists its sources with publisher, type and the date each was accessed. A published article needs at least one primary source (an official announcement, documentation, a model card, a paper). It also needs a second independent source, or an explicit justification shown to readers as a “single-source story” notice.", "Fuentes: cada artículo lista sus fuentes con editor, tipo y fecha de acceso. Un artículo publicado necesita al menos una fuente primaria (un anuncio oficial, documentación, una model card, un paper). Además necesita una segunda fuente independiente o una justificación explícita, que se muestra al lector como aviso de “nota de una sola fuente”.", "Fontes: cada artigo lista suas fontes com veículo, tipo e a data em que cada uma foi consultada. Um artigo publicado precisa de pelo menos uma fonte primária (um anúncio oficial, documentação, um model card, um paper). Também precisa de uma segunda fonte independente ou de uma justificativa explícita, mostrada ao leitor como um aviso de “notícia de fonte única”.", "来源：每篇文章都列出来源，注明发布方、类型和每个来源的访问日期。发布的文章至少需要一个一手来源（官方公告、文档、模型卡或论文）。它还需要第二个独立来源，或者一个明确的理由，并以“单一来源报道”提示的形式展示给读者。"),
              t("Method disclosure: stories are researched with AI assistance and verified against primary sources before publishing. They are signed “Promptea Editorial”.", "Transparencia de método: las notas se investigan con asistencia de IA y se verifican contra fuentes primarias antes de publicarse. Se firman “Promptea Editorial”.", "Transparência do método: as notícias são pesquisadas com apoio de IA e verificadas em fontes primárias antes da publicação. São assinadas como “Promptea Editorial”.", "方法披露：报道在AI协助下完成调研，并在发布前对照一手来源核实。署名为“Promptea Editorial”。"),
              t("Safety of the format: article bodies are plain typed blocks (paragraphs, headings, lists, quotes) and source links must be https. There is no raw HTML.", "Seguridad del formato: los cuerpos de los artículos son bloques tipados simples (párrafos, títulos, listas, citas) y los enlaces a fuentes deben ser https. No hay HTML crudo.", "Segurança do formato: o corpo dos artigos é feito de blocos tipados simples (parágrafos, títulos, listas, citações) e os links das fontes precisam ser https. Não há HTML bruto.", "格式安全：文章正文由简单的类型化区块（段落、标题、列表、引文）组成，来源链接必须是https。不使用原始HTML。"),
              t("Corrections keep the article’s URL and add a visible correction notice.", "Las correcciones conservan la URL del artículo y agregan un aviso de corrección visible.", "As correções mantêm a URL do artigo e acrescentam um aviso de correção visível.", "更正会保留文章的URL，并添加醒目的更正说明。"),
              t("Images: Promptea generates its own cover illustration; it does not hotlink third-party imagery.", "Imágenes: Promptea genera su propia ilustración de portada; no enlaza imágenes de terceros.", "Imagens: o Promptea gera sua própria ilustração de capa; não usa imagens de terceiros por hotlink.", "图片：Promptea自行生成封面插图，不盗链第三方图片。"),
            ],
          },
          { type: "links", items: [{ href: `/${lang}/blog`, label: "AI Daily" }] },
        ],
      },
      {
        id: "benchmarks",
        heading: t("Benchmarks: where the numbers come from", "Benchmarks: de dónde salen los números", "Benchmarks: de onde vêm os números", "基准测试：数据从哪里来"),
        blocks: [
          {
            type: "ul",
            items: [
              t("Source: OpenRouter’s benchmarks API, which republishes results from Artificial Analysis, Design Arena and OpenRouter’s own evaluations. Promptea reads it on the server and shows the source and the “as of” date next to every ranking.", "Fuente: la API de benchmarks de OpenRouter, que republica resultados de Artificial Analysis, Design Arena y evaluaciones propias de OpenRouter. Promptea la lee en el servidor y muestra la fuente y la fecha de actualización junto a cada ranking.", "Fonte: a API de benchmarks da OpenRouter, que republica resultados da Artificial Analysis, da Design Arena e das avaliações da própria OpenRouter. O Promptea a consulta no servidor e mostra a fonte e a data de referência ao lado de cada ranking.", "来源：OpenRouter的基准测试API，它转载Artificial Analysis、Design Arena以及OpenRouter自身评测的结果。Promptea在服务器端读取这些数据，并在每个排名旁边显示来源和数据截至日期。"),
              t("One benchmark, one ranking. Scores from different benchmarks use different metrics (indices, accuracy, F1, Elo) and are never added, averaged or compared with each other.", "Un benchmark, un ranking. Los puntajes de distintos benchmarks usan métricas diferentes (índices, precisión, F1, Elo) y nunca se suman, promedian ni comparan entre sí.", "Um benchmark, um ranking. As pontuações de benchmarks diferentes usam métricas diferentes (índices, acurácia, F1, Elo) e nunca são somadas, tiradas em média nem comparadas entre si.", "一个基准测试，一个排名。不同基准测试的分数使用不同的指标（指数、准确率、F1、Elo），从不相加、平均或相互比较。"),
              t("A missing score means “not measured”: the model is left out of that ranking, never counted as zero. A missing price is shown as “—”, never as free.", "Un puntaje ausente significa “sin medición”: el modelo queda fuera de ese ranking, nunca se cuenta como cero. Un precio ausente se muestra como “—”, nunca como gratis.", "Uma pontuação ausente significa “não medido”: o modelo fica de fora daquele ranking, nunca é contado como zero. Um preço ausente aparece como “—”, nunca como gratuito.", "缺少分数表示“未测量”：该模型不会出现在这个排名中，绝不按零分计算。缺少价格时显示为“—”，绝不显示为免费。"),
              t("Ranks are by score, best first; ties share a rank. Prices are list prices per million tokens as reported by the source.", "Los puestos se ordenan por puntaje, de mejor a peor; los empates comparten puesto. Los precios son de lista por millón de tokens, según informa la fuente.", "As posições seguem a pontuação, da melhor para a pior; empates dividem a posição. Os preços são de tabela, por milhão de tokens, conforme informados pela fonte.", "按分数排名，最高者在前；分数相同则名次并列。价格是来源报告的每百万token标价。"),
              t(`A “frontier model” is one placed in the top ${FRONTIER_TOP_N} of at least one general-capability benchmark in the current snapshot. The list changes when the data changes.`, `Un “modelo de frontera” es uno ubicado entre los ${FRONTIER_TOP_N} primeros de al menos un benchmark de capacidad general del snapshot vigente. La lista cambia cuando cambian los datos.`, `Um “modelo de fronteira” é aquele que fica entre os ${FRONTIER_TOP_N} primeiros de pelo menos um benchmark de capacidade geral no snapshot atual. A lista muda quando os dados mudam.`, `“前沿模型”是指在当前快照中，至少在一项通用能力基准测试里排进前${FRONTIER_TOP_N}名的模型。数据变化时，这份名单也会随之变化。`),
              t("Rows that fail validation are dropped and counted. If the source is unreachable, the last valid snapshot is shown with its age, or an empty state; nothing is invented.", "Las filas que no pasan la validación se descartan y se cuentan. Si la fuente no responde, se muestra el último snapshot válido con su antigüedad, o un estado vacío; nada se inventa.", "As linhas que falham na validação são descartadas e contadas. Se a fonte estiver inacessível, o último snapshot válido é mostrado com sua idade, ou então um estado vazio; nada é inventado.", "未通过验证的数据行会被剔除并计数。如果来源无法访问，就显示最近一次有效的快照并注明其时效，或显示空状态；不会编造任何数据。"),
              t("Limits: benchmarks measure specific tests, often composite indices that change between versions. They do not predict how a model will do on your task.", "Límites: los benchmarks miden pruebas específicas, a menudo índices compuestos que cambian entre versiones. No predicen cómo le irá a un modelo en tu tarea.", "Limites: os benchmarks medem testes específicos, muitas vezes índices compostos que mudam de uma versão para outra. Eles não preveem como um modelo vai se sair na sua tarefa.", "局限：基准测试衡量的是特定测试，往往是会随版本变化的综合指数。它们无法预测某个模型在你的任务上表现如何。"),
            ],
          },
          { type: "links", items: [{ href: `/${lang}/benchmarks`, label: t("Benchmarks", "Benchmarks", "Benchmarks", "基准测试") }] },
        ],
      },
      {
        id: "limits",
        heading: t("What Promptea does not do", "Qué no hace Promptea", "O que o Promptea não faz", "Promptea不做什么"),
        blocks: [
          {
            type: "ul",
            items: [
              t("It does not run your prompt on the target model, so it cannot tell how good that model’s answer will be.", "No ejecuta tu prompt en el modelo destino, así que no puede saber qué tan buena será su respuesta.", "Ele não executa o seu prompt no modelo de destino, então não consegue dizer o quanto a resposta desse modelo será boa.", "它不会在目标模型上运行你的提示词，因此无法判断该模型的回答会有多好。"),
              t("The score is a measure of specification quality, not a proven predictor of output quality. Its rules are heuristics, calibrated against a labeled set of example prompts for each purpose, in every language of the site.", "El puntaje mide la calidad de la especificación, no es un predictor probado de la calidad del resultado. Sus reglas son heurísticas, calibradas contra un conjunto de prompts de ejemplo etiquetados para cada propósito, en cada idioma del sitio.", "A pontuação mede a qualidade da especificação; não é um preditor comprovado da qualidade da resposta. Suas regras são heurísticas, calibradas com um conjunto rotulado de prompts de exemplo para cada propósito, em cada idioma.", "评分衡量的是提示词描述的质量，而不是经过验证的输出质量预测指标。它的规则是启发式的，依据每种用途下一组带标注的示例提示词校准，覆盖本站的每一种语言。"),
              t("The quality of the optional LLM rewrite is not part of the score and depends on the provider.", "La calidad de la reescritura opcional con LLM no forma parte del puntaje y depende del proveedor.", "A qualidade da reescrita opcional com LLM não faz parte da pontuação e depende do provedor.", "可选的LLM改写质量不计入评分，并取决于提供商。"),
              t("It does not give financial, legal or medical advice; guides on those topics are about how to write prompts, not about the subject.", "No da asesoramiento financiero, legal ni médico; las guías sobre esos temas tratan de cómo escribir prompts, no del tema en sí.", "Ele não dá aconselhamento financeiro, jurídico nem médico; os guias sobre esses temas tratam de como escrever prompts, não do assunto em si.", "它不提供财务、法律或医疗建议；关于这些主题的指南讲的是如何编写提示词，而不是主题本身。"),
            ],
          },
        ],
      },
      {
        id: "privacy",
        heading: t("Privacy in short", "Privacidad en breve", "Privacidade em resumo", "隐私要点"),
        blocks: [
          {
            type: "ul",
            items: [
              t("Telemetry stores a pseudonymous session ID and analysis metadata (score, confidence, target, language, task type, finding IDs), not the prompt text.", "La telemetría guarda un ID de sesión seudónimo y metadatos del análisis (puntaje, confianza, destino, idioma, tipo de tarea, IDs de hallazgos), no el texto del prompt.", "A telemetria guarda um ID de sessão pseudônimo e metadados da análise (pontuação, confiança, destino, idioma, tipo de tarefa, IDs dos achados), não o texto do prompt.", "遥测保存一个假名化的会话ID和分析元数据（评分、置信度、目标、语言、任务类型、问题ID），不保存提示词文本。"),
              t("Your prompt library is stored in your browser, on your device.", "Tu biblioteca de prompts se guarda en tu navegador, en tu dispositivo.", "Sua biblioteca de prompts fica guardada no seu navegador, no seu dispositivo.", "你的提示词库保存在你的浏览器里，也就是你自己的设备上。"),
              t("Share cards encode only numbers and enum values in the URL; the prompt text is never part of them.", "Las tarjetas para compartir codifican solo números y valores de una lista cerrada en la URL; el texto del prompt nunca forma parte de ellas.", "Os cartões para compartilhar codificam na URL apenas números e valores de enumeração; o texto do prompt nunca faz parte deles.", "分享卡片在URL中只编码数字和枚举值；提示词文本从不包含在内。"),
              t("The full policy is on the privacy page.", "La política completa está en la página de privacidad.", "A política completa está na página de privacidade.", "完整政策请见隐私页面。"),
            ],
          },
          { type: "links", items: [{ href: `/${lang}/privacy`, label: t("Privacy policy", "Política de privacidad", "Política de privacidade", "隐私政策") }] },
        ],
      },
      {
        id: "versioning",
        heading: t("Versioning and changes", "Versionado y cambios", "Versionamento e mudanças", "版本管理和变更"),
        blocks: [
          {
            type: "p",
            text: t(
              `The analysis engine is versioned (currently ${ENGINE.version}). A change to a finding ID or a contract rule is a major version; new heuristics are minor; internal fixes are patches. Every release, including changes to scoring, is listed in the public changelog.`,
              `El motor de análisis está versionado (hoy ${ENGINE.version}). Un cambio en el ID de un hallazgo o en una regla del contrato es una versión mayor; las heurísticas nuevas son menores; los arreglos internos son parches. Cada versión, incluidos los cambios en el puntaje, figura en el changelog público.`,
              `O motor de análise é versionado (atualmente ${ENGINE.version}). Uma mudança em um ID de achado ou em uma regra do contrato é uma versão major; novas heurísticas são minor; correções internas são patches. Cada versão, incluindo as mudanças na pontuação, é listada no histórico de versões público.`,
              `分析引擎有版本号（当前为${ENGINE.version}）。修改问题ID或契约规则属于主版本更新；新增启发式规则属于次版本更新；内部修复属于补丁版本。每次发布，包括评分方面的变更，都会列在公开的更新日志中。`,
            ),
          },
          { type: "links", items: [{ href: `/${lang}/changelog`, label: t("Changelog", "Changelog", "Changelog", "更新日志") }] },
        ],
      },
    ],
    faq: [
      {
        q: t("Is the Promptea score the same every time?", "¿El puntaje de Promptea es siempre el mismo?", "A pontuação do Promptea é sempre a mesma?", "Promptea的评分每次都一样吗？"),
        a: t(
          "Yes. The score comes from deterministic rules applied to the text of the prompt, the chosen purpose and the target, so the same input always produces the same score and breakdown.",
          "Sí. El puntaje sale de reglas determinísticas aplicadas al texto del prompt, el propósito elegido y el destino, así que la misma entrada produce siempre el mismo puntaje y desglose.",
          "Sim. A pontuação vem de regras determinísticas aplicadas ao texto do prompt, ao propósito escolhido e ao destino, então a mesma entrada sempre produz a mesma pontuação e o mesmo detalhamento.",
          "是的。评分来自应用于提示词文本、所选用途和目标的确定性规则，因此相同的输入总是得到相同的评分和细分结果。",
        ),
      },
      {
        q: t("Does Promptea use AI to score prompts?", "¿Promptea usa IA para puntuar prompts?", "O Promptea usa IA para pontuar prompts?", "Promptea会用AI给提示词评分吗？"),
        a: t(
          "No. An optional LLM step may rewrite the optimized prompt, and an optional judge can offer a bounded second opinion, but neither changes the engine’s score.",
          "No. Un paso opcional con LLM puede reescribir el prompt optimizado y un juez opcional puede dar una segunda opinión acotada, pero ninguno cambia el puntaje del motor.",
          "Não. Uma etapa opcional com LLM pode reescrever o prompt otimizado, e um avaliador opcional pode oferecer uma segunda opinião limitada, mas nenhum dos dois altera a pontuação do motor.",
          "不会。一个可选的LLM步骤可能会改写优化后的提示词，一个可选的评审也可以给出有限度的第二意见，但两者都不会改变引擎的评分。",
        ),
      },
      {
        q: t("How are the benchmark rankings built?", "¿Cómo se arman los rankings de benchmarks?", "Como os rankings de benchmarks são montados?", "基准测试排名是如何生成的？"),
        a: t(
          "Each benchmark is its own ranking with its own metric, read from OpenRouter’s benchmarks API with the source and “as of” date shown. Promptea never merges different benchmarks into a single score.",
          "Cada benchmark es su propio ranking con su propia métrica, leído de la API de benchmarks de OpenRouter, con la fuente y la fecha de actualización a la vista. Promptea nunca fusiona benchmarks distintos en un único puntaje.",
          "Cada benchmark é um ranking próprio, com sua própria métrica, lido da API de benchmarks da OpenRouter, com a fonte e a data de referência à mostra. O Promptea nunca funde benchmarks diferentes em uma única pontuação.",
          "每项基准测试都是独立的排名，使用自己的指标，数据读取自OpenRouter的基准测试API，并显示来源和数据截至日期。Promptea从不把不同的基准测试合并成一个分数。",
        ),
      },
      {
        q: t("What sources does AI Daily require?", "¿Qué fuentes exige IA al Día?", "Que fontes o AI Daily exige?", "AI Daily要求哪些来源？"),
        a: t(
          "At least one primary source (official announcement, documentation, model card or paper) and either a second independent source or a stated justification that readers see as a single-source notice.",
          "Al menos una fuente primaria (anuncio oficial, documentación, model card o paper) y, o una segunda fuente independiente, o una justificación declarada que los lectores ven como aviso de nota de una sola fuente.",
          "Pelo menos uma fonte primária (anúncio oficial, documentação, model card ou paper) e uma segunda fonte independente ou uma justificativa declarada, que o leitor vê como um aviso de fonte única.",
          "至少一个一手来源（官方公告、文档、模型卡或论文），外加第二个独立来源，或者一个公开说明的理由，读者会看到“单一来源报道”的提示。",
        ),
      },
    ],
    updated: CONTENT_UPDATED.methodology,
  };
}

/** Kept in one place so the registry, the md router and the pages agree on ids. */
export const SITE_PAGE_IDS = ["about", "methodology", "how-it-works"] as const;
export type SitePageId = (typeof SITE_PAGE_IDS)[number];

export function sitePageDoc(id: SitePageId, lang: Locale): PageDoc {
  if (id === "about") return aboutDoc(lang);
  if (id === "how-it-works") return howItWorksDoc(lang);
  return methodologyDoc(lang);
}
