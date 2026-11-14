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

const tr = (lang: Locale) => <T,>(en: T, es: T, pt: T): T => ({ en, es, pt })[lang];

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
    `Promptea is a free web tool that reads your prompt, scores it from 0 to 100 on six criteria (${SCORE_DIMENSIONS.map((d) => d.label.en.toLowerCase()).join(", ")}), tells you what to fix and writes an improved version for the AI you pick: ${modelFamilyList()}. Works in English, Spanish and Portuguese, no account needed.`,
    `Promptea es una herramienta web gratuita que lee tu prompt, le pone un puntaje de 0 a 100 en seis criterios (${SCORE_DIMENSIONS.map((d) => d.label.es.toLowerCase()).join(", ")}), te dice qué corregir y escribe una versión mejorada para la IA que elijas: ${modelFamilyList()}. Funciona en español, inglés y portugués y no pide cuenta.`,
    `O Promptea é uma ferramenta web gratuita que lê o seu prompt, dá uma pontuação de 0 a 100 em seis critérios (${SCORE_DIMENSIONS.map((d) => d.label.pt.toLowerCase()).join(", ")}), diz o que corrigir e escreve uma versão melhorada para a IA que você escolher: ${modelFamilyList()}. Funciona em português, inglês e espanhol, sem precisar de conta.`,
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
    ),
    absoluteTitle: true,
    description: t(
      "Score any prompt 0–100 on six criteria, see what to fix and get a rewrite tuned for GPT, Claude, Gemini, Grok, Kimi, DeepSeek, Qwen, GLM, MiniMax, Doubao or Perplexity. Free, no account.",
      "Puntuá tu prompt de 0 a 100 en seis criterios, mirá qué corregir y obtené una versión mejorada para GPT, Claude, Gemini, Grok, Kimi, DeepSeek, Qwen, GLM, MiniMax, Doubao o Perplexity. Gratis, sin cuenta.",
      "Pontue qualquer prompt de 0 a 100 em seis critérios, veja o que corrigir e receba uma reescrita ajustada para GPT, Claude, Gemini, Grok, Kimi, DeepSeek, Qwen, GLM, MiniMax, Doubao ou Perplexity. Grátis, sem conta.",
    ),
    h1: t(
      "Promptea — analyze, score and optimize your AI prompts",
      "Promptea — analizá, puntuá y optimizá tus prompts de IA",
      "Promptea — analise, pontue e otimize seus prompts de IA",
    ),
    tldr: prompteaTldr(lang),
    sections: [
      {
        id: "start",
        heading: t("What you can do on Promptea", "Qué podés hacer en Promptea", "O que você pode fazer no Promptea"),
        blocks: [
          {
            type: "dl",
            items: [
              {
                term: t("Analyze a prompt", "Analizar un prompt", "Analisar um prompt"),
                text: t(
                  "Paste a prompt and get a 0–100 score across six criteria, what to fix and a version optimized for the AI you choose. Free, no account.",
                  "Pegá un prompt y recibí un puntaje de 0 a 100 en seis criterios, qué corregir y una versión optimizada para la IA que elijas. Gratis, sin cuenta.",
                  "Cole um prompt e receba uma pontuação de 0 a 100 em seis critérios, o que corrigir e uma versão otimizada para a IA que você escolher. Grátis, sem conta.",
                ),
              },
              {
                term: t("Find the best AI", "Encontrar la mejor IA", "Encontrar a melhor IA"),
                text: t(
                  "Describe your task and get a ranked, explained recommendation of which AI and model fits it.",
                  "Describí tu tarea y recibí una recomendación ordenada y explicada de qué IA y modelo conviene.",
                  "Descreva sua tarefa e receba uma recomendação ordenada e explicada de qual IA e qual modelo combinam com ela.",
                ),
              },
              {
                term: t("AI Daily", "IA al Día", "AI Daily"),
                text: t(
                  "One verified AI story every morning, with its sources, plus a weekly digest.",
                  "Una noticia de IA verificada cada mañana, con sus fuentes, y un resumen semanal.",
                  "Uma notícia de IA verificada todas as manhãs, com as fontes, e um resumo semanal (em inglês e espanhol).",
                ),
              },
              {
                term: t("Benchmarks", "Benchmarks", "Benchmarks"),
                text: t(
                  "Rankings of AI models by category, with the source, date and metric of each benchmark.",
                  "Rankings de modelos de IA por categoría, con la fuente, la fecha y la métrica de cada benchmark.",
                  "Rankings de modelos de IA por categoria, com a fonte, a data e a métrica de cada benchmark.",
                ),
              },
            ],
          },
          {
            type: "links",
            items: [
              { href: `/${lang}/analyzer`, label: t("Prompt analyzer", "Analizador de prompts", "Analisador de prompts") },
              { href: `/${lang}/best-ai`, label: t("Find the best AI", "Encontrar la mejor IA", "Encontrar a melhor IA") },
              { href: `/${lang}/blog`, label: t("AI Daily", "IA al Día", "AI Daily") },
              { href: `/${lang}/benchmarks`, label: t("Benchmarks", "Benchmarks", "Benchmarks") },
              { href: `/${lang}/how-it-works`, label: t("How Promptea works", "Cómo funciona Promptea", "Como o Promptea funciona") },
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
      name: t("Paste your prompt", "Pegá tu prompt", "Cole seu prompt"),
      text: t("Paste the prompt you want to improve in the box on the home page or in the analyzer.", "Pegá el prompt que querés mejorar en el cuadro de la página de inicio o en el analizador.", "Cole o prompt que você quer melhorar na caixa da página inicial ou no analisador."),
    },
    {
      name: t("Choose purpose and AI", "Elegí propósito e IA", "Escolha o propósito e a IA"),
      text: t("Select what the prompt is for and the AI model you will use it with.", "Seleccioná para qué es el prompt y con qué modelo de IA lo vas a usar.", "Selecione para que serve o prompt e o modelo de IA com o qual você vai usá-lo."),
    },
    {
      name: t("Read the score and copy the result", "Leé el puntaje y copiá el resultado", "Leia a pontuação e copie o resultado"),
      text: t("Review the 0–100 score, the findings and the recommendations, then copy the optimized prompt or save it to your library.", "Revisá el puntaje de 0 a 100, los hallazgos y las recomendaciones, y copiá el prompt optimizado o guardalo en tu biblioteca.", "Confira a pontuação de 0 a 100, os achados e as recomendações; depois copie o prompt otimizado ou salve-o na sua biblioteca."),
    },
  ];

  const modelDl = TARGETS.map((target) => {
    const names = currentModels(target).map((m) => m.label);
    return { term: TARGET_SHORT[target], text: names.join(" · ") };
  }).filter((x) => x.text);

  return {
    title: t("How Promptea works: prompt scoring, AIs and FAQ", "Cómo funciona Promptea: puntaje, IAs y preguntas", "Como o Promptea funciona: pontuação, IAs e dúvidas"),
    description: t(
      "What Promptea is, how a prompt gets its 0–100 score on six criteria, how to use the analyzer, which AIs and prompt types it supports, and answers to common questions.",
      "Qué es Promptea, cómo se calcula el puntaje de 0 a 100 en seis criterios, cómo usar el analizador, qué IAs y tipos de prompt soporta, y respuestas a las preguntas frecuentes.",
      "O que é o Promptea, como um prompt recebe a pontuação de 0 a 100 em seis critérios, como usar o analisador, as IAs compatíveis e as dúvidas mais comuns.",
    ),
    h1: t("How Promptea works", "Cómo funciona Promptea", "Como o Promptea funciona"),
    tldr: prompteaTldr(lang),
    sections: [
      {
        id: "what-is-promptea",
        heading: t("What is Promptea?", "¿Qué es Promptea?", "O que é o Promptea?"),
        blocks: [
          {
            type: "p",
            text: t(
              "Promptea is a prompt analyzer and optimizer. You paste a prompt, choose what it is for and which AI you will use, and Promptea returns a score, the specific problems it found, concrete recommendations and an optimized prompt you can copy.",
              "Promptea es un analizador y optimizador de prompts. Pegás un prompt, elegís para qué es y con qué IA lo vas a usar, y Promptea devuelve un puntaje, los problemas concretos que encontró, recomendaciones y un prompt optimizado que podés copiar.",
              "O Promptea é um analisador e otimizador de prompts. Você cola um prompt, escolhe para que ele serve e qual IA vai usar, e o Promptea devolve uma pontuação, os problemas específicos que encontrou, recomendações concretas e um prompt otimizado para copiar.",
            ),
          },
          {
            type: "p",
            text: t(
              "Around the analyzer there are four more tools: Find the best AI for a task, AI Daily (one verified AI story every morning, with its sources), model benchmarks with source and date, and a library of guides, a glossary and per-model prompt templates.",
              "Alrededor del analizador hay cuatro herramientas más: elegir la mejor IA para una tarea, IA al Día (una noticia de IA verificada cada mañana, con sus fuentes), benchmarks de modelos con fuente y fecha, y una biblioteca de guías, glosario y plantillas de prompts por modelo.",
              "Em volta do analisador há mais quatro ferramentas: Encontrar a melhor IA para uma tarefa, o AI Daily (uma notícia de IA verificada todas as manhãs, com as fontes), benchmarks de modelos com fonte e data, e uma biblioteca de guias, um glossário e templates de prompts por modelo.",
            ),
          },
        ],
      },
      {
        id: "score",
        heading: t("How a prompt is scored", "Cómo se puntúa un prompt", "Como um prompt é pontuado"),
        blocks: [
          {
            type: "p",
            text: t(
              "The score runs from 0 to 100 and combines six dimensions. It measures how well specified the prompt is, using fixed rules, so the same prompt always gets the same score.",
              "El puntaje va de 0 a 100 y combina seis dimensiones. Mide qué tan bien especificado está el prompt con reglas fijas, así que el mismo prompt siempre obtiene el mismo puntaje.",
              "A pontuação vai de 0 a 100 e combina seis dimensões. Ela mede o quanto o prompt está bem especificado, usando regras fixas, de modo que o mesmo prompt sempre recebe a mesma pontuação.",
            ),
          },
          { type: "dl", items: SCORE_DIMENSIONS.map((d) => ({ term: d.label[lang], text: d.measures[lang] })) },
          {
            type: "links",
            items: [{ href: `/${lang}/methodology`, label: t("Read the full methodology", "Leer la metodología completa", "Ler a metodologia completa") }],
          },
        ],
      },
      {
        id: "how-to",
        heading: t("How to analyze a prompt with Promptea", "Cómo analizar un prompt con Promptea", "Como analisar um prompt com o Promptea"),
        blocks: [
          { type: "steps", items: howToSteps },
        ],
      },
      {
        id: "supported",
        heading: t("Supported AIs and prompt types", "IAs y tipos de prompt compatibles", "IAs e tipos de prompt compatíveis"),
        blocks: [
          {
            type: "p",
            text: t(
              `Promptea optimizes prompts for ${TARGETS.length} AI families and ${models.length} current models. It does not run the models: it writes prompts that follow each provider's own prompting guidance. The model list was last verified against the providers' documentation on ${verified}.`,
              `Promptea optimiza prompts para ${TARGETS.length} familias de IA y ${models.length} modelos vigentes. No ejecuta los modelos: escribe prompts que siguen la guía de prompting de cada proveedor. La lista de modelos se verificó por última vez contra la documentación de los proveedores el ${verified}.`,
              `O Promptea otimiza prompts para ${TARGETS.length} famílias de IA e ${models.length} modelos atuais. Ele não executa os modelos: escreve prompts que seguem as orientações de prompting de cada provedor. A lista de modelos foi verificada pela última vez na documentação dos provedores em ${verified}.`,
            ),
          },
          { type: "dl", items: modelDl },
          {
            type: "p",
            text: t(`Prompt types: ${purposes.join(", ")}.`, `Tipos de prompt: ${purposes.join(", ")}.`, `Tipos de prompt: ${purposes.join(", ")}.`),
          },
          {
            type: "links",
            items: [
              { href: `/${lang}/models`, label: t("Prompts by model", "Prompts por modelo", "Prompts por modelo") },
              { href: `/${lang}/guides`, label: t("Prompting guides", "Guías de prompting", "Guias de prompting") },
              { href: `/${lang}/glossary`, label: t("Glossary", "Glosario", "Glossário") },
            ],
          },
        ],
      },
    ],
    steps: { name: t("How to analyze and improve a prompt with Promptea", "Cómo analizar y mejorar un prompt con Promptea", "Como analisar e melhorar um prompt com o Promptea"), steps: howToSteps },
    faq: [
      {
        q: t("What is Promptea?", "¿Qué es Promptea?", "O que é o Promptea?"),
        a: t(
          "Promptea is a free web tool that analyzes a prompt, scores it from 0 to 100 on six criteria, lists what to fix and writes an optimized version for the AI model you choose. It also recommends which AI fits a task, publishes a verified AI news story every morning (AI Daily) and shows model benchmarks with their source and date.",
          "Promptea es una herramienta web gratuita que analiza un prompt, lo puntúa de 0 a 100 en seis criterios, lista qué corregir y escribe una versión optimizada para el modelo de IA que elijas. También recomienda qué IA conviene para una tarea, publica cada mañana una noticia de IA verificada (IA al Día) y muestra benchmarks de modelos con su fuente y fecha.",
          "O Promptea é uma ferramenta web gratuita que analisa um prompt, dá uma pontuação de 0 a 100 em seis critérios, lista o que corrigir e escreve uma versão otimizada para o modelo de IA que você escolher. Também recomenda qual IA combina com uma tarefa, publica uma notícia de IA verificada todas as manhãs (AI Daily, em inglês e espanhol) e mostra benchmarks de modelos com fonte e data.",
        ),
      },
      {
        q: t("Is Promptea free? Do I need an account?", "¿Promptea es gratis? ¿Necesito una cuenta?", "O Promptea é gratuito? Preciso de uma conta?"),
        a: t(
          "Analyzing a prompt is free and does not require an account. The weekly newsletter is optional and only asks for an email address if you choose to subscribe.",
          "Analizar un prompt es gratis y no requiere cuenta. El newsletter semanal es opcional y solo pide un email si decidís suscribirte.",
          "Analisar um prompt é gratuito e não exige conta. A newsletter semanal é opcional e só pede um endereço de e-mail se você decidir assinar.",
        ),
      },
      {
        q: t("How does Promptea score a prompt?", "¿Cómo puntúa Promptea un prompt?", "Como o Promptea pontua um prompt?"),
        a: t(
          `It applies fixed, deterministic rules to the text and combines six dimensions: ${SCORE_DIMENSIONS.map((d) => d.label.en.toLowerCase()).join(", ")}. The weight of each dimension depends on the kind of task it detects, and the same prompt always gets the same score. No language model decides the score. The method is public on the methodology page.`,
          `Aplica reglas fijas y determinísticas al texto y combina seis dimensiones: ${SCORE_DIMENSIONS.map((d) => d.label.es.toLowerCase()).join(", ")}. El peso de cada dimensión depende del tipo de tarea que detecta, y el mismo prompt siempre da el mismo puntaje. Ningún modelo de lenguaje decide el puntaje. El método es público en la página de metodología.`,
          `Ele aplica regras fixas e determinísticas ao texto e combina seis dimensões: ${SCORE_DIMENSIONS.map((d) => d.label.pt.toLowerCase()).join(", ")}. O peso de cada dimensão depende do tipo de tarefa detectado, e o mesmo prompt sempre recebe a mesma pontuação. Nenhum modelo de linguagem decide a pontuação. O método é público na página de metodologia.`,
        ),
      },
      {
        q: t("Which AI models does Promptea support?", "¿Qué modelos de IA soporta Promptea?", "Com quais modelos de IA o Promptea é compatível?"),
        a: t(
          `It writes prompts for ${modelFamilyList()}, with ${models.length} current models in its registry (verified against the providers' own documentation, last on ${verified}). Promptea optimizes prompts for these models; it does not run them.`,
          `Escribe prompts para ${modelFamilyList()}, con ${models.length} modelos vigentes en su registro (verificados contra la documentación oficial de cada proveedor, por última vez el ${verified}). Promptea optimiza prompts para esos modelos; no los ejecuta.`,
          `Ele escreve prompts para ${modelFamilyList()}, com ${models.length} modelos atuais no registro (verificados na documentação dos próprios provedores, pela última vez em ${verified}). O Promptea otimiza prompts para esses modelos; ele não os executa.`,
        ),
      },
      {
        q: t("What kinds of prompts can I analyze?", "¿Qué tipos de prompts puedo analizar?", "Que tipos de prompt posso analisar?"),
        a: t(
          `${purposes.length} purposes: ${purposes.join(", ")}. Beyond the purpose you pick, the engine detects ${TASK_TYPES.length} task types (for example debugging, data extraction or customer support) and adapts the rules to them.`,
          `${purposes.length} propósitos: ${purposes.join(", ")}. Además del propósito que elegís, el motor detecta ${TASK_TYPES.length} tipos de tarea (por ejemplo depuración, extracción de datos o atención al cliente) y adapta las reglas a cada uno.`,
          `${purposes.length} propósitos: ${purposes.join(", ")}. Além do propósito que você escolhe, o motor detecta ${TASK_TYPES.length} tipos de tarefa (por exemplo, depuração, extração de dados ou atendimento ao cliente) e adapta as regras a eles.`,
        ),
      },
      {
        q: t("Does Promptea store my prompts?", "¿Promptea guarda mis prompts?", "O Promptea guarda os meus prompts?"),
        a: t(
          "By default, telemetry stores only metadata (score, task type, target model, language, finding IDs), not the text of your prompt. Your prompt library lives in your own browser. Share cards carry numbers only, never the prompt. Details are in the privacy policy.",
          "Por defecto, la telemetría guarda solo metadatos (puntaje, tipo de tarea, modelo destino, idioma, IDs de hallazgos), no el texto de tu prompt. Tu biblioteca de prompts vive en tu propio navegador. Las tarjetas para compartir llevan solo números, nunca el prompt. Los detalles están en la política de privacidad.",
          "Por padrão, a telemetria guarda apenas metadados (pontuação, tipo de tarefa, modelo de destino, idioma, IDs dos achados), não o texto do seu prompt. Sua biblioteca de prompts fica no seu próprio navegador. Os cartões para compartilhar levam só números, nunca o prompt. Os detalhes estão na política de privacidade.",
        ),
      },
      {
        q: t("Does a high score guarantee a better answer?", "¿Un puntaje alto garantiza una mejor respuesta?", "Uma pontuação alta garante uma resposta melhor?"),
        a: t(
          "No. The score measures how completely a prompt is specified (goal, context, limits, output format, checkability, safety). It does not run the prompt and it cannot predict the quality of a model's answer. Use it to find gaps, then test the prompt with your model.",
          "No. El puntaje mide qué tan completo está un prompt (objetivo, contexto, límites, formato de salida, verificabilidad, seguridad). No ejecuta el prompt y no puede predecir la calidad de la respuesta de un modelo. Usalo para encontrar huecos y después probá el prompt con tu modelo.",
          "Não. A pontuação mede o quanto um prompt está completamente especificado (objetivo, contexto, limites, formato de saída, verificabilidade, segurança). Ela não executa o prompt e não consegue prever a qualidade da resposta de um modelo. Use-a para encontrar lacunas e depois teste o prompt com o seu modelo.",
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
    title: t("About Promptea — who builds it and why you can trust it", "Acerca de Promptea — quién la desarrolla y por qué podés confiar", "Sobre o Promptea — quem faz e por que você pode confiar"),
    description: t(
      "Promptea is designed and developed by eterlab. What the product does, how it handles sources, privacy and corrections, and how to cite it.",
      "Promptea está diseñada y desarrollada por eterlab. Qué hace el producto, cómo maneja fuentes, privacidad y correcciones, y cómo citarlo.",
      "O Promptea é projetado e desenvolvido pela eterlab. O que o produto faz, como lida com fontes, privacidade e correções, e como citá-lo.",
    ),
    h1: t("About Promptea", "Acerca de Promptea", "Sobre o Promptea"),
    tldr: t(
      "Promptea is a free prompt analyzer and AI toolkit, designed and developed by eterlab. It scores prompts with public, deterministic rules, publishes one verified AI story a day with its sources, and states the source and date of every dataset it shows.",
      "Promptea es un analizador de prompts gratuito y un conjunto de herramientas de IA, diseñado y desarrollado por eterlab. Puntúa prompts con reglas públicas y determinísticas, publica una noticia de IA verificada por día con sus fuentes y declara la fuente y la fecha de cada conjunto de datos que muestra.",
      "O Promptea é um analisador de prompts e um conjunto de ferramentas de IA gratuito, projetado e desenvolvido pela eterlab. Ele pontua prompts com regras públicas e determinísticas, publica uma notícia de IA verificada por dia com as fontes e informa a fonte e a data de cada conjunto de dados que mostra.",
    ),
    sections: [
      {
        id: "who",
        heading: t("Who is behind Promptea", "Quién está detrás de Promptea", "Quem está por trás do Promptea"),
        blocks: [
          {
            type: "p",
            text: t(
              `Promptea is designed and developed by ${STUDIO_NAME}. Every release is documented in the public changelog.`,
              `Promptea está diseñada y desarrollada por ${STUDIO_NAME}. Cada versión queda documentada en el changelog público.`,
              `O Promptea é projetado e desenvolvido pela ${STUDIO_NAME}. Cada versão é documentada no histórico de versões público.`,
            ),
          },
          { type: "links", items: contactItems },
        ],
      },
      {
        id: "what",
        heading: t("What Promptea does", "Qué hace Promptea", "O que o Promptea faz"),
        blocks: [
          {
            type: "ul",
            items: [
              t("Prompt analyzer: a 0–100 score on six criteria, findings, recommendations and an optimized prompt per AI model.", "Analizador de prompts: puntaje de 0 a 100 en seis criterios, hallazgos, recomendaciones y un prompt optimizado por modelo de IA.", "Analisador de prompts: uma pontuação de 0 a 100 em seis critérios, achados, recomendações e um prompt otimizado por modelo de IA."),
              t("Best AI: describe a task and get a ranked recommendation of which AI and model fits, with the reasons.", "Mejor IA: describí una tarea y recibí una recomendación ordenada de qué IA y modelo conviene, con las razones.", "Melhor IA: descreva uma tarefa e receba uma recomendação ordenada de qual IA e qual modelo combinam, com os motivos."),
              t("AI Daily and the weekly digest: one verified AI story every morning, a weekly recap and a look ahead.", "IA al Día y resumen semanal: una noticia de IA verificada cada mañana, un repaso semanal y un vistazo a la semana que viene.", "AI Daily e o resumo semanal: uma notícia de IA verificada todas as manhãs, um resumo da semana e um olhar para a semana seguinte (em inglês e espanhol)."),
              t("Benchmarks: rankings of AI models by category, with source, date and metric.", "Benchmarks: rankings de modelos de IA por categoría, con fuente, fecha y métrica.", "Benchmarks: rankings de modelos de IA por categoria, com fonte, data e métrica."),
              t("Guides, glossary and per-model templates for prompt engineering.", "Guías, glosario y plantillas por modelo para prompt engineering.", "Guias, glossário e templates por modelo para engenharia de prompt."),
            ],
          },
          {
            type: "links",
            items: [
              { href: `/${lang}/analyzer`, label: t("Prompt analyzer", "Analizador de prompts", "Analisador de prompts") },
              { href: `/${lang}/best-ai`, label: t("Find the best AI", "Elegir la mejor IA", "Encontrar a melhor IA") },
              { href: `/${lang}/blog`, label: "AI Daily" },
              { href: `/${lang}/benchmarks`, label: "Benchmarks" },
            ],
          },
        ],
      },
      {
        id: "principles",
        heading: t("Principles", "Principios", "Princípios"),
        blocks: [
          {
            type: "ul",
            items: [
              t("Public method. How the score and the AI recommendation are computed is documented on the methodology page.", "Método público. Cómo se calcula el puntaje y la recomendación de IA está documentado en la página de metodología.", "Método público. A forma como a pontuação e a recomendação de IA são calculadas está documentada na página de metodologia."),
              t("Sources and dates on everything. News links its sources, model data carries the date it was verified, and benchmarks show their source and update date.", "Fuentes y fechas en todo. Las noticias enlazan sus fuentes, los datos de modelos llevan la fecha en que se verificaron y los benchmarks muestran su fuente y fecha de actualización.", "Fontes e datas em tudo. As notícias trazem links para as fontes, os dados dos modelos levam a data em que foram verificados e os benchmarks mostram a fonte e a data de atualização."),
              t("No invented authorship. AI Daily is signed “Promptea Editorial”, not a made-up person, and says it is researched with AI assistance.", "Sin autoría inventada. IA al Día se firma “Promptea Editorial”, no una persona inventada, y aclara que se investiga con asistencia de IA.", "Sem autoria inventada. O AI Daily é assinado como “Promptea Editorial”, não por uma pessoa fictícia, e informa que é pesquisado com apoio de IA."),
              t("Corrections are visible. A corrected article keeps its URL and shows a correction notice.", "Las correcciones se ven. Un artículo corregido conserva su URL y muestra un aviso de corrección.", "As correções ficam visíveis. Um artigo corrigido mantém a URL e mostra um aviso de correção."),
              t("Privacy by default. Telemetry keeps metadata, not your prompt text.", "Privacidad por defecto. La telemetría guarda metadatos, no el texto de tus prompts.", "Privacidade por padrão. A telemetria guarda metadados, não o texto do seu prompt."),
              t("Honest limits. Promptea says what it does not do (see the methodology).", "Límites honestos. Promptea dice qué no hace (ver la metodología).", "Limites declarados. O Promptea diz o que não faz (veja a metodologia)."),
            ],
          },
        ],
      },
      {
        id: "cite",
        heading: t("How to cite Promptea", "Cómo citar Promptea", "Como citar o Promptea"),
        blocks: [
          {
            type: "p",
            text: t(
              "Cite the page you used, with its title and the date you accessed it, for example: “Promptea. Prompt analyzer methodology. promptea.me/en/methodology (accessed 8 November 2026).” For news, cite the AI Daily article and, wherever possible, the primary sources it links. For benchmark figures, name the original source shown on the page (Artificial Analysis, OpenRouter or Design Arena) and its “as of” date.",
              "Citá la página que usaste, con su título y la fecha de acceso, por ejemplo: “Promptea. Metodología del analizador de prompts. promptea.me/es/methodology (consultado el 8 de noviembre de 2026).” Para noticias, citá el artículo de IA al Día y, siempre que se pueda, las fuentes primarias que enlaza. Para cifras de benchmarks, nombrá la fuente original que muestra la página (Artificial Analysis, OpenRouter o Design Arena) y su fecha de actualización.",
              "Cite a página que você usou, com o título e a data de acesso, por exemplo: “Promptea. Metodologia do analisador de prompts. promptea.me/pt/methodology (acesso em 8 de novembro de 2026).” Para notícias, cite o artigo do AI Daily e, sempre que possível, as fontes primárias que ele indica. Para números de benchmarks, nomeie a fonte original mostrada na página (Artificial Analysis, OpenRouter ou Design Arena) e a data de referência.",
            ),
          },
        ],
      },
      {
        id: "machine-readable",
        heading: t("For search engines and AI assistants", "Para buscadores y asistentes de IA", "Para buscadores e assistentes de IA"),
        blocks: [
          {
            type: "p",
            text: t(
              "Promptea publishes a machine-readable map of its content: an llms.txt index, a full-text llms-full.txt, a markdown version of every guide, glossary term, model page and AI Daily story (add .md to the page URL), an XML sitemap and an RSS feed per language. Public pages are open to search and AI crawlers (see robots.txt).",
              "Promptea publica un mapa legible por máquinas de su contenido: un índice llms.txt, un llms-full.txt con el texto completo, una versión en markdown de cada guía, término del glosario, página de modelo y nota de IA al Día (agregá .md a la URL de la página), un sitemap XML y un feed RSS por idioma. Las páginas públicas están abiertas a rastreadores de búsqueda y de IA (ver robots.txt).",
              "O Promptea publica um mapa do seu conteúdo legível por máquinas: um índice llms.txt, um llms-full.txt com o texto completo, uma versão em markdown de cada guia, termo do glossário e página de modelo (adicione .md à URL da página), um sitemap XML e um feed RSS do AI Daily em inglês e em espanhol. As páginas públicas estão abertas a buscadores e crawlers de IA (veja o robots.txt).",
            ),
          },
          {
            type: "links",
            items: [
              { href: "/llms.txt", label: "llms.txt" },
              { href: "/llms-full.txt", label: "llms-full.txt" },
              { href: "/sitemap.xml", label: "sitemap.xml" },
              { href: `/${lang}/blog/feed.xml`, label: t("AI Daily RSS feed", "Feed RSS de IA al Día", "Feed RSS do AI Daily") },
            ],
          },
        ],
      },
      {
        id: "feedback",
        heading: t("Feedback and corrections", "Feedback y correcciones", "Feedback e correções"),
        blocks: [
          {
            type: "p",
            text: t(
              "Found a mistake in an article, a guide or a model entry? Use the “Feedback” button in the footer of any page. Verified corrections are published with a visible note.",
              "¿Encontraste un error en un artículo, una guía o una ficha de modelo? Usá el botón “Feedback” del pie de cualquier página. Las correcciones verificadas se publican con una nota visible.",
              "Encontrou um erro em um artigo, um guia ou na ficha de um modelo? Use o botão “Feedback” no rodapé de qualquer página. As correções verificadas são publicadas com uma nota visível.",
            ),
          },
        ],
      },
    ],
    faq: [
      {
        q: t("Who makes Promptea?", "¿Quién hace Promptea?", "Quem faz o Promptea?"),
        a: t(`Promptea is designed and developed by ${STUDIO_NAME} (${STUDIO_URL.replace("https://", "")}).`, `Promptea está diseñada y desarrollada por ${STUDIO_NAME} (${STUDIO_URL.replace("https://", "")}).`, `O Promptea é projetado e desenvolvido pela ${STUDIO_NAME} (${STUDIO_URL.replace("https://", "")}).`),
      },
      {
        q: t("Who writes AI Daily?", "¿Quién escribe IA al Día?", "Quem escreve o AI Daily?"),
        a: t(
          "AI Daily is signed “Promptea Editorial”. Each story is researched with AI assistance and verified against primary sources before publishing, and every claim links to its source. There is no individual byline because no individual writes it.",
          "IA al Día se firma “Promptea Editorial”. Cada nota se investiga con asistencia de IA y se verifica contra fuentes primarias antes de publicarse, y cada afirmación enlaza a su fuente. No hay firma personal porque no la escribe una persona en particular.",
          "O AI Daily é assinado como “Promptea Editorial”. Cada notícia é pesquisada com apoio de IA e verificada em fontes primárias antes da publicação, e cada afirmação leva um link para a fonte. Não há assinatura individual porque nenhuma pessoa o escreve sozinha.",
        ),
      },
      {
        q: t("Can I reuse or cite Promptea's content?", "¿Puedo reutilizar o citar el contenido de Promptea?", "Posso reutilizar ou citar o conteúdo do Promptea?"),
        a: t(
          "You can cite and link to any public page. Please name Promptea and link to the page you used. For benchmark figures, also name the original source and date shown on the page.",
          "Podés citar y enlazar cualquier página pública. Nombrá a Promptea y enlazá la página que usaste. Para cifras de benchmarks, nombrá también la fuente original y la fecha que muestra la página.",
          "Você pode citar e linkar qualquer página pública. Nomeie o Promptea e inclua o link da página usada. Para números de benchmarks, nomeie também a fonte original e a data mostradas na página.",
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
    title: t("Methodology: how Promptea scores prompts, picks AIs and builds AI Daily", "Metodología: cómo Promptea puntúa prompts, elige IAs y arma IA al Día", "Metodologia: como o Promptea pontua prompts, escolhe IAs e monta o AI Daily"),
    description: t(
      "How the 0–100 prompt score works, what is deterministic and what uses an LLM, how the best-AI match is made, the editorial policy of AI Daily and how benchmarks are collected.",
      "Cómo funciona el puntaje de 0 a 100, qué es determinístico y qué usa un LLM, cómo se hace la recomendación de IA, la política editorial de IA al Día y cómo se obtienen los benchmarks.",
      "Como funciona a pontuação de 0 a 100 do prompt, o que é determinístico e o que usa um LLM, como é feita a recomendação da melhor IA, a política editorial do AI Daily e como os benchmarks são coletados.",
    ),
    h1: t("Methodology", "Metodología", "Metodologia"),
    tldr: t(
      `Promptea scores prompts with deterministic rules (engine ${ENGINE.version}): the same input always gives the same score, and no language model decides it. An optional LLM step can rewrite the optimized prompt, but it never changes the score. AI recommendations come from a rule-based matcher over a model registry checked against official provider docs. AI Daily stories need sources, and benchmarks are shown per source with their date and never merged into one number.`,
      `Promptea puntúa prompts con reglas determinísticas (motor ${ENGINE.version}): la misma entrada da siempre el mismo puntaje y ningún modelo de lenguaje lo decide. Un paso opcional con LLM puede reescribir el prompt optimizado, pero nunca cambia el puntaje. Las recomendaciones de IA salen de un matcher por reglas sobre un registro de modelos verificado contra la documentación oficial. Las notas de IA al Día exigen fuentes y los benchmarks se muestran por fuente, con su fecha, y nunca se fusionan en un solo número.`,
      `O Promptea pontua prompts com regras determinísticas (motor ${ENGINE.version}): a mesma entrada sempre gera a mesma pontuação, e nenhum modelo de linguagem a decide. Uma etapa opcional com LLM pode reescrever o prompt otimizado, mas nunca altera a pontuação. As recomendações de IA vêm de um comparador baseado em regras sobre um registro de modelos conferido na documentação oficial dos provedores. As notícias do AI Daily exigem fontes, e os benchmarks são mostrados por fonte, com data, e nunca fundidos em um número só.`,
    ),
    sections: [
      {
        id: "pipeline",
        heading: t("How a prompt is analyzed", "Cómo se analiza un prompt", "Como um prompt é analisado"),
        blocks: [
          {
            type: "ol",
            items: [
              t("Normalize the text and separate what you asked for (the core) from any scaffold Promptea generated earlier, so re-analyzing an optimized prompt does not grow it or stack headers.", "Se normaliza el texto y se separa lo que pediste (el núcleo) de cualquier estructura que Promptea haya generado antes, para que re-analizar un prompt optimizado no lo haga crecer ni apile encabezados.", "Normalizar o texto e separar o que você pediu (o núcleo) de qualquer estrutura que o Promptea tenha gerado antes, para que reanalisar um prompt otimizado não o faça crescer nem empilhe cabeçalhos."),
              t(`Classify the task into one of ${TASK_TYPES.length} types (for example coding, debugging, data extraction, translation, marketing) using your chosen purpose and the wording of the prompt.`, `Se clasifica la tarea en uno de ${TASK_TYPES.length} tipos (por ejemplo código, depuración, extracción de datos, traducción, marketing) según el propósito elegido y la redacción del prompt.`, `Classificar a tarefa em um de ${TASK_TYPES.length} tipos (por exemplo, programação, depuração, extração de dados, tradução, marketing), usando o propósito escolhido e a redação do prompt.`),
              t("Detect features: goal, inputs, audience, examples, constraints, tone, length, timeframe, output format, success criteria, error details, reproduction steps, injection-like text and contradictions.", "Se detectan rasgos: objetivo, inputs, audiencia, ejemplos, restricciones, tono, largo, plazo, formato de salida, criterios de éxito, detalle del error, pasos de reproducción, texto con forma de inyección y contradicciones.", "Detectar características: objetivo, insumos, público, exemplos, restrições, tom, tamanho, prazo, formato de saída, critérios de sucesso, detalhes do erro, passos para reproduzir, texto com cara de injeção e contradições."),
              t("Score the six dimensions and combine them with weights that depend on the task type (verifiability weighs more for debugging than for a casual text request).", "Se puntúan las seis dimensiones y se combinan con pesos que dependen del tipo de tarea (la verificabilidad pesa más en depuración que en un pedido de texto cotidiano).", "Pontuar as seis dimensões e combiná-las com pesos que dependem do tipo de tarefa (a verificabilidade pesa mais em depuração do que em um pedido casual de texto)."),
              t("Apply a cap when essential material is missing (for example a translation request with no text to translate cannot score as complete).", "Se aplica un tope cuando falta material esencial (por ejemplo, un pedido de traducción sin el texto a traducir no puede puntuar como completo).", "Aplicar um teto quando falta material essencial (por exemplo, um pedido de tradução sem o texto a traduzir não pode pontuar como completo)."),
              t("Build the optimized prompt for the chosen AI from the findings, and score it again with the same rubric to show a before → after score.", "Se arma el prompt optimizado para la IA elegida a partir de los hallazgos y se vuelve a puntuar con el mismo criterio para mostrar un puntaje antes → después.", "Montar o prompt otimizado para a IA escolhida a partir dos achados e pontuá-lo de novo com a mesma rubrica, para mostrar a pontuação antes → depois."),
            ],
          },
          {
            type: "p",
            text: t(
              "This core runs on the server with no network calls and accepts up to 12,000 characters. Its guarantees (idempotence, stable finding IDs, strict language localization, no amplification of prompt injection, inputs that never crash it) are written down in the engine contract and enforced by automated tests.",
              "Este núcleo corre en el servidor sin llamadas de red y acepta hasta 12.000 caracteres. Sus garantías (idempotencia, IDs de hallazgos estables, localización estricta por idioma, sin amplificar inyecciones de prompt, entradas que nunca lo hacen fallar) están escritas en el contrato del motor y verificadas con tests automáticos.",
              "Esse núcleo roda no servidor, sem chamadas de rede, e aceita até 12.000 caracteres. Suas garantias (idempotência, IDs de achados estáveis, localização estrita por idioma, não amplificar injeção de prompt, entradas que nunca o derrubam) estão escritas no contrato do motor e são verificadas por testes automatizados.",
            ),
          },
        ],
      },
      {
        id: "dimensions",
        heading: t("The six dimensions", "Las seis dimensiones", "As seis dimensões"),
        blocks: [
          { type: "dl", items: SCORE_DIMENSIONS.map((d) => ({ term: d.label[lang], text: d.measures[lang] })) },
          {
            type: "p",
            text: t(
              "Each dimension is scored 0–100 and the weighted total is the prompt's score. Alongside it, Promptea reports a confidence value (0–100) that says how much signal the engine found in the text. It is not a probability of the prompt being good.",
              "Cada dimensión se puntúa de 0 a 100 y el total ponderado es el puntaje del prompt. Junto a él, Promptea informa un valor de confianza (0–100) que indica cuánta señal encontró el motor en el texto. No es la probabilidad de que el prompt sea bueno.",
              "Cada dimensão recebe de 0 a 100, e o total ponderado é a pontuação do prompt. Junto com ela, o Promptea informa um valor de confiança (0–100) que diz quanto sinal o motor encontrou no texto. Não é a probabilidade de o prompt ser bom.",
            ),
          },
        ],
      },
      {
        id: "llm-layer",
        heading: t("Where an LLM is used (and where it is not)", "Dónde se usa un LLM (y dónde no)", "Onde um LLM é usado (e onde não é)"),
        blocks: [
          {
            type: "ul",
            items: [
              t("The score, findings and recommendations are never produced by an LLM.", "El puntaje, los hallazgos y las recomendaciones nunca los produce un LLM.", "A pontuação, os achados e as recomendações nunca são produzidos por um LLM."),
              t("Optional refinement: when a provider is configured, an LLM can rewrite the optimized prompt following a strategy chosen by the engine. Providers are tried in order (by default Groq, then Anthropic’s Claude as failover). The rewrite must pass a quality gate; if it does not, or no provider is available, the deterministic prompt is returned.", "Refinado opcional: cuando hay un proveedor configurado, un LLM puede reescribir el prompt optimizado siguiendo una estrategia elegida por el motor. Los proveedores se prueban en orden (por defecto Groq y, como respaldo, Claude de Anthropic). La reescritura debe pasar un control de calidad; si no lo pasa, o no hay proveedor disponible, se devuelve el prompt determinístico.", "Refinamento opcional: quando há um provedor configurado, um LLM pode reescrever o prompt otimizado seguindo uma estratégia escolhida pelo motor. Os provedores são tentados em ordem (por padrão, Groq e depois o Claude, da Anthropic, como reserva). A reescrita precisa passar por um controle de qualidade; se não passar, ou se não houver provedor disponível, o prompt determinístico é devolvido."),
              t("In that step your prompt is treated as data, not as instructions; text that tries to override the instructions is removed before the rewrite and a rewrite that repeats it is rejected.", "En ese paso tu prompt se trata como dato, no como instrucciones; el texto que intenta anular las instrucciones se elimina antes de la reescritura y una reescritura que lo repite se rechaza.", "Nessa etapa o seu prompt é tratado como dado, não como instrução; texto que tenta sobrepor as instruções é removido antes da reescrita, e uma reescrita que o repita é rejeitada."),
              t("Optional second opinion: an LLM judge can be enabled for low-confidence cases. It can only shift a separately shown blended value by at most ±10 points; the engine’s score itself is never modified.", "Segunda opinión opcional: se puede activar un juez LLM para casos de baja confianza. Solo puede mover un valor combinado que se muestra aparte, como máximo ±10 puntos; el puntaje del motor nunca se modifica.", "Segunda opinião opcional: um LLM avaliador pode ser ativado para casos de baixa confiança. Ele só pode deslocar em até ±10 pontos um valor combinado mostrado à parte; a pontuação do motor nunca é modificada."),
              t("Voice dictation, when you use it, sends audio to a transcription provider only to turn it into text; the audio is not stored.", "El dictado por voz, cuando lo usás, envía el audio a un proveedor de transcripción solo para convertirlo en texto; el audio no se guarda.", "O ditado por voz, quando você o usa, envia o áudio a um provedor de transcrição apenas para convertê-lo em texto; o áudio não é guardado."),
            ],
          },
        ],
      },
      {
        id: "best-ai",
        heading: t("How “Find the best AI” decides", "Cómo decide “Elegir la mejor IA”", "Como o “Encontrar a melhor IA” decide"),
        blocks: [
          {
            type: "p",
            text: t(
              "The matcher is fully deterministic and uses no LLM. It extracts weighted signals from the prompt across 15 task categories (chat, coding, coding agent, research, long context, multimodal, data extraction, creative writing, marketing, translation, summarization, tutoring, image prompts, complex reasoning, fast/lightweight), then scores each candidate model by how well its verified capabilities fit those categories.",
              "El matcher es completamente determinístico y no usa LLM. Extrae señales ponderadas del prompt en 15 categorías de tarea (chat, código, agente de código, investigación, contexto largo, multimodal, extracción de datos, escritura creativa, marketing, traducción, resumen, tutoría, prompts de imagen, razonamiento complejo, rápido/liviano) y puntúa a cada modelo candidato según cuánto encajan sus capacidades verificadas con esas categorías.",
              "O comparador é totalmente determinístico e não usa LLM. Ele extrai do prompt sinais ponderados em 15 categorias de tarefa (chat, programação, agente de programação, pesquisa, contexto longo, multimodal, extração de dados, escrita criativa, marketing, tradução, resumo, tutoria, prompts de imagem, raciocínio complexo, rápido/leve) e depois pontua cada modelo candidato pelo quanto suas capacidades verificadas se encaixam nessas categorias.",
            ),
          },
          {
            type: "ul",
            items: [
              t("Hard capability gates: a model without image input cannot win a multimodal task, one without native search is capped for research, one without structured output is capped for data extraction.", "Compuertas de capacidad: un modelo sin entrada de imagen no puede ganar una tarea multimodal, uno sin búsqueda nativa queda limitado en investigación, uno sin salida estructurada queda limitado en extracción de datos.", "Barreiras rígidas de capacidade: um modelo sem entrada de imagem não pode vencer uma tarefa multimodal, um sem busca nativa tem teto em pesquisa, um sem saída estruturada tem teto em extração de dados."),
              t("Only current models can be recommended; retired models never are.", "Solo se pueden recomendar modelos vigentes; los retirados nunca.", "Só modelos atuais podem ser recomendados; modelos aposentados nunca são."),
              t("Confidence is low, medium or high, and a near-tie says so and names the deciding factor instead of faking certainty.", "La confianza es baja, media o alta, y un casi-empate lo dice y nombra el factor decisivo en lugar de aparentar certeza.", "A confiança é baixa, média ou alta, e um quase empate é informado, com o fator decisivo, em vez de fingir certeza."),
              t("Tools such as Claude Code or Codex are treated as environments, not models.", "Herramientas como Claude Code o Codex se tratan como entornos, no como modelos.", "Ferramentas como Claude Code ou Codex são tratadas como ambientes, não como modelos."),
            ],
          },
        ],
      },
      {
        id: "registry",
        heading: t("The model registry", "El registro de modelos", "O registro de modelos"),
        blocks: [
          {
            type: "p",
            text: t(
              `Promptea’s registry lists ${models.length} current models across ${TARGETS.length} AI families. Model IDs, context windows and capabilities are taken only from each provider’s official documentation; every entry stores the source URL and the date it was verified (latest: ${formatDay(modelsVerifiedAt(), lang)}). Superseded models stay in the registry as legacy, with a pointer to their replacement, so old links keep working but they are no longer offered or recommended.`,
              `El registro de Promptea lista ${models.length} modelos vigentes en ${TARGETS.length} familias de IA. Los IDs de modelo, ventanas de contexto y capacidades se toman solo de la documentación oficial de cada proveedor; cada entrada guarda la URL de la fuente y la fecha de verificación (última: ${formatDay(modelsVerifiedAt(), lang)}). Los modelos reemplazados quedan en el registro como legados, con un puntero a su reemplazo, para que los enlaces viejos sigan funcionando, pero ya no se ofrecen ni se recomiendan.`,
              `O registro do Promptea lista ${models.length} modelos atuais em ${TARGETS.length} famílias de IA. IDs de modelo, janelas de contexto e capacidades são retirados apenas da documentação oficial de cada provedor; cada item guarda a URL da fonte e a data da verificação (a mais recente: ${formatDay(modelsVerifiedAt(), lang)}). Os modelos substituídos ficam no registro como legado, com a indicação do substituto, de modo que os links antigos continuam funcionando, mas eles não são mais oferecidos nem recomendados.`,
            ),
          },
          { type: "links", items: [{ href: `/${lang}/models`, label: t("Models and their capabilities", "Modelos y sus capacidades", "Modelos e suas capacidades") }] },
        ],
      },
      {
        id: "ai-daily",
        heading: t("AI Daily: editorial and sourcing policy", "IA al Día: política editorial y de fuentes", "AI Daily: política editorial e de fontes"),
        blocks: [
          {
            type: "ul",
            items: [
              t("One main story each morning, plus a weekly recap and a look at the week ahead. Weekly editions say which dates they cover.", "Una nota principal cada mañana, más un repaso semanal y un vistazo a la semana que viene. Las ediciones semanales indican qué fechas cubren.", "Uma notícia principal a cada manhã, além de um resumo semanal e de um olhar para a semana seguinte. As edições semanais dizem quais datas cobrem."),
              t("Freshness: a daily story must be about an event of the same editorial day (Buenos Aires time). A story about an earlier event can only be published with a disclosed reason, shown on the article.", "Frescura: una nota diaria debe tratar un hecho del mismo día editorial (hora de Buenos Aires). Una nota sobre un hecho anterior solo puede publicarse con un motivo declarado, visible en el artículo.", "Atualidade: uma notícia diária precisa tratar de um fato do mesmo dia editorial (horário de Buenos Aires). Uma notícia sobre um fato anterior só pode ser publicada com um motivo declarado, mostrado no artigo."),
              t("Sources: every article lists its sources with publisher, type and the date each was accessed. A published article needs at least one primary source (an official announcement, documentation, a model card, a paper). It also needs a second independent source, or an explicit justification shown to readers as a “single-source story” notice.", "Fuentes: cada artículo lista sus fuentes con editor, tipo y fecha de acceso. Un artículo publicado necesita al menos una fuente primaria (un anuncio oficial, documentación, una model card, un paper). Además necesita una segunda fuente independiente o una justificación explícita, que se muestra al lector como aviso de “nota de una sola fuente”.", "Fontes: cada artigo lista suas fontes com veículo, tipo e a data em que cada uma foi consultada. Um artigo publicado precisa de pelo menos uma fonte primária (um anúncio oficial, documentação, um model card, um paper). Também precisa de uma segunda fonte independente ou de uma justificativa explícita, mostrada ao leitor como um aviso de “notícia de fonte única”."),
              t("Method disclosure: stories are researched with AI assistance and verified against primary sources before publishing. They are signed “Promptea Editorial”.", "Transparencia de método: las notas se investigan con asistencia de IA y se verifican contra fuentes primarias antes de publicarse. Se firman “Promptea Editorial”.", "Transparência do método: as notícias são pesquisadas com apoio de IA e verificadas em fontes primárias antes da publicação. São assinadas como “Promptea Editorial”."),
              t("Safety of the format: article bodies are plain typed blocks (paragraphs, headings, lists, quotes) and source links must be https. There is no raw HTML.", "Seguridad del formato: los cuerpos de los artículos son bloques tipados simples (párrafos, títulos, listas, citas) y los enlaces a fuentes deben ser https. No hay HTML crudo.", "Segurança do formato: o corpo dos artigos é feito de blocos tipados simples (parágrafos, títulos, listas, citações) e os links das fontes precisam ser https. Não há HTML bruto."),
              t("Corrections keep the article’s URL and add a visible correction notice.", "Las correcciones conservan la URL del artículo y agregan un aviso de corrección visible.", "As correções mantêm a URL do artigo e acrescentam um aviso de correção visível."),
              t("Images: Promptea generates its own cover illustration; it does not hotlink third-party imagery.", "Imágenes: Promptea genera su propia ilustración de portada; no enlaza imágenes de terceros.", "Imagens: o Promptea gera sua própria ilustração de capa; não usa imagens de terceiros por hotlink."),
            ],
          },
          { type: "links", items: [{ href: `/${lang}/blog`, label: "AI Daily" }] },
        ],
      },
      {
        id: "benchmarks",
        heading: t("Benchmarks: where the numbers come from", "Benchmarks: de dónde salen los números", "Benchmarks: de onde vêm os números"),
        blocks: [
          {
            type: "ul",
            items: [
              t("Source: OpenRouter’s benchmarks API, which republishes results from Artificial Analysis, Design Arena and OpenRouter’s own evaluations. Promptea reads it on the server and shows the source and the “as of” date next to every ranking.", "Fuente: la API de benchmarks de OpenRouter, que republica resultados de Artificial Analysis, Design Arena y evaluaciones propias de OpenRouter. Promptea la lee en el servidor y muestra la fuente y la fecha de actualización junto a cada ranking.", "Fonte: a API de benchmarks da OpenRouter, que republica resultados da Artificial Analysis, da Design Arena e das avaliações da própria OpenRouter. O Promptea a consulta no servidor e mostra a fonte e a data de referência ao lado de cada ranking."),
              t("One benchmark, one ranking. Scores from different benchmarks use different metrics (indices, accuracy, F1, Elo) and are never added, averaged or compared with each other.", "Un benchmark, un ranking. Los puntajes de distintos benchmarks usan métricas diferentes (índices, precisión, F1, Elo) y nunca se suman, promedian ni comparan entre sí.", "Um benchmark, um ranking. As pontuações de benchmarks diferentes usam métricas diferentes (índices, acurácia, F1, Elo) e nunca são somadas, tiradas em média nem comparadas entre si."),
              t("A missing score means “not measured”: the model is left out of that ranking, never counted as zero. A missing price is shown as “—”, never as free.", "Un puntaje ausente significa “sin medición”: el modelo queda fuera de ese ranking, nunca se cuenta como cero. Un precio ausente se muestra como “—”, nunca como gratis.", "Uma pontuação ausente significa “não medido”: o modelo fica de fora daquele ranking, nunca é contado como zero. Um preço ausente aparece como “—”, nunca como gratuito."),
              t("Ranks are by score, best first; ties share a rank. Prices are list prices per million tokens as reported by the source.", "Los puestos se ordenan por puntaje, de mejor a peor; los empates comparten puesto. Los precios son de lista por millón de tokens, según informa la fuente.", "As posições seguem a pontuação, da melhor para a pior; empates dividem a posição. Os preços são de tabela, por milhão de tokens, conforme informados pela fonte."),
              t(`A “frontier model” is one placed in the top ${FRONTIER_TOP_N} of at least one general-capability benchmark in the current snapshot. The list changes when the data changes.`, `Un “modelo de frontera” es uno ubicado entre los ${FRONTIER_TOP_N} primeros de al menos un benchmark de capacidad general del snapshot vigente. La lista cambia cuando cambian los datos.`, `Um “modelo de fronteira” é aquele que fica entre os ${FRONTIER_TOP_N} primeiros de pelo menos um benchmark de capacidade geral no snapshot atual. A lista muda quando os dados mudam.`),
              t("Rows that fail validation are dropped and counted. If the source is unreachable, the last valid snapshot is shown with its age, or an empty state; nothing is invented.", "Las filas que no pasan la validación se descartan y se cuentan. Si la fuente no responde, se muestra el último snapshot válido con su antigüedad, o un estado vacío; nada se inventa.", "As linhas que falham na validação são descartadas e contadas. Se a fonte estiver inacessível, o último snapshot válido é mostrado com sua idade, ou então um estado vazio; nada é inventado."),
              t("Limits: benchmarks measure specific tests, often composite indices that change between versions. They do not predict how a model will do on your task.", "Límites: los benchmarks miden pruebas específicas, a menudo índices compuestos que cambian entre versiones. No predicen cómo le irá a un modelo en tu tarea.", "Limites: os benchmarks medem testes específicos, muitas vezes índices compostos que mudam de uma versão para outra. Eles não preveem como um modelo vai se sair na sua tarefa."),
            ],
          },
          { type: "links", items: [{ href: `/${lang}/benchmarks`, label: "Benchmarks" }] },
        ],
      },
      {
        id: "limits",
        heading: t("What Promptea does not do", "Qué no hace Promptea", "O que o Promptea não faz"),
        blocks: [
          {
            type: "ul",
            items: [
              t("It does not run your prompt on the target model, so it cannot tell how good that model’s answer will be.", "No ejecuta tu prompt en el modelo destino, así que no puede saber qué tan buena será su respuesta.", "Ele não executa o seu prompt no modelo de destino, então não consegue dizer o quanto a resposta desse modelo será boa."),
              t("The score is a measure of specification quality, not a proven predictor of output quality. Its rules are heuristics, calibrated against a labeled set of example prompts for each purpose, in both languages.", "El puntaje mide la calidad de la especificación, no es un predictor probado de la calidad del resultado. Sus reglas son heurísticas, calibradas contra un conjunto de prompts de ejemplo etiquetados para cada propósito, en ambos idiomas.", "A pontuação mede a qualidade da especificação; não é um preditor comprovado da qualidade da resposta. Suas regras são heurísticas, calibradas com um conjunto rotulado de prompts de exemplo para cada propósito, em cada idioma."),
              t("The quality of the optional LLM rewrite is not part of the score and depends on the provider.", "La calidad de la reescritura opcional con LLM no forma parte del puntaje y depende del proveedor.", "A qualidade da reescrita opcional com LLM não faz parte da pontuação e depende do provedor."),
              t("It does not give financial, legal or medical advice; guides on those topics are about how to write prompts, not about the subject.", "No da asesoramiento financiero, legal ni médico; las guías sobre esos temas tratan de cómo escribir prompts, no del tema en sí.", "Ele não dá aconselhamento financeiro, jurídico nem médico; os guias sobre esses temas tratam de como escrever prompts, não do assunto em si."),
            ],
          },
        ],
      },
      {
        id: "privacy",
        heading: t("Privacy in short", "Privacidad en breve", "Privacidade em resumo"),
        blocks: [
          {
            type: "ul",
            items: [
              t("Telemetry stores a pseudonymous session ID and analysis metadata (score, confidence, target, language, task type, finding IDs), not the prompt text.", "La telemetría guarda un ID de sesión seudónimo y metadatos del análisis (puntaje, confianza, destino, idioma, tipo de tarea, IDs de hallazgos), no el texto del prompt.", "A telemetria guarda um ID de sessão pseudônimo e metadados da análise (pontuação, confiança, destino, idioma, tipo de tarefa, IDs dos achados), não o texto do prompt."),
              t("Your prompt library is stored in your browser, on your device.", "Tu biblioteca de prompts se guarda en tu navegador, en tu dispositivo.", "Sua biblioteca de prompts fica guardada no seu navegador, no seu dispositivo."),
              t("Share cards encode only numbers and enum values in the URL; the prompt text is never part of them.", "Las tarjetas para compartir codifican solo números y valores de una lista cerrada en la URL; el texto del prompt nunca forma parte de ellas.", "Os cartões para compartilhar codificam na URL apenas números e valores de enumeração; o texto do prompt nunca faz parte deles."),
              t("The full policy is on the privacy page.", "La política completa está en la página de privacidad.", "A política completa está na página de privacidade."),
            ],
          },
          { type: "links", items: [{ href: `/${lang}/privacy`, label: t("Privacy policy", "Política de privacidad", "Política de privacidade") }] },
        ],
      },
      {
        id: "versioning",
        heading: t("Versioning and changes", "Versionado y cambios", "Versionamento e mudanças"),
        blocks: [
          {
            type: "p",
            text: t(
              `The analysis engine is versioned (currently ${ENGINE.version}). A change to a finding ID or a contract rule is a major version; new heuristics are minor; internal fixes are patches. Every release, including changes to scoring, is listed in the public changelog.`,
              `El motor de análisis está versionado (hoy ${ENGINE.version}). Un cambio en el ID de un hallazgo o en una regla del contrato es una versión mayor; las heurísticas nuevas son menores; los arreglos internos son parches. Cada versión, incluidos los cambios en el puntaje, figura en el changelog público.`,
              `O motor de análise é versionado (atualmente ${ENGINE.version}). Uma mudança em um ID de achado ou em uma regra do contrato é uma versão major; novas heurísticas são minor; correções internas são patches. Cada versão, incluindo as mudanças na pontuação, é listada no histórico de versões público.`,
            ),
          },
          { type: "links", items: [{ href: `/${lang}/changelog`, label: "Changelog" }] },
        ],
      },
    ],
    faq: [
      {
        q: t("Is the Promptea score the same every time?", "¿El puntaje de Promptea es siempre el mismo?", "A pontuação do Promptea é sempre a mesma?"),
        a: t(
          "Yes. The score comes from deterministic rules applied to the text of the prompt, the chosen purpose and the target, so the same input always produces the same score and breakdown.",
          "Sí. El puntaje sale de reglas determinísticas aplicadas al texto del prompt, el propósito elegido y el destino, así que la misma entrada produce siempre el mismo puntaje y desglose.",
          "Sim. A pontuação vem de regras determinísticas aplicadas ao texto do prompt, ao propósito escolhido e ao destino, então a mesma entrada sempre produz a mesma pontuação e o mesmo detalhamento.",
        ),
      },
      {
        q: t("Does Promptea use AI to score prompts?", "¿Promptea usa IA para puntuar prompts?", "O Promptea usa IA para pontuar prompts?"),
        a: t(
          "No. An optional LLM step may rewrite the optimized prompt, and an optional judge can offer a bounded second opinion, but neither changes the engine’s score.",
          "No. Un paso opcional con LLM puede reescribir el prompt optimizado y un juez opcional puede dar una segunda opinión acotada, pero ninguno cambia el puntaje del motor.",
          "Não. Uma etapa opcional com LLM pode reescrever o prompt otimizado, e um avaliador opcional pode oferecer uma segunda opinião limitada, mas nenhum dos dois altera a pontuação do motor.",
        ),
      },
      {
        q: t("How are the benchmark rankings built?", "¿Cómo se arman los rankings de benchmarks?", "Como os rankings de benchmarks são montados?"),
        a: t(
          "Each benchmark is its own ranking with its own metric, read from OpenRouter’s benchmarks API with the source and “as of” date shown. Promptea never merges different benchmarks into a single score.",
          "Cada benchmark es su propio ranking con su propia métrica, leído de la API de benchmarks de OpenRouter, con la fuente y la fecha de actualización a la vista. Promptea nunca fusiona benchmarks distintos en un único puntaje.",
          "Cada benchmark é um ranking próprio, com sua própria métrica, lido da API de benchmarks da OpenRouter, com a fonte e a data de referência à mostra. O Promptea nunca funde benchmarks diferentes em uma única pontuação.",
        ),
      },
      {
        q: t("What sources does AI Daily require?", "¿Qué fuentes exige IA al Día?", "Que fontes o AI Daily exige?"),
        a: t(
          "At least one primary source (official announcement, documentation, model card or paper) and either a second independent source or a stated justification that readers see as a single-source notice.",
          "Al menos una fuente primaria (anuncio oficial, documentación, model card o paper) y, o una segunda fuente independiente, o una justificación declarada que los lectores ven como aviso de nota de una sola fuente.",
          "Pelo menos uma fonte primária (anúncio oficial, documentação, model card ou paper) e uma segunda fonte independente ou uma justificativa declarada, que o leitor vê como um aviso de fonte única.",
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
