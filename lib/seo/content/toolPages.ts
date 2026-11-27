// lib/seo/content/toolPages.ts
//
// v1.9.0 — markdown twins for the three interactive tools (/analyzer, /best-ai,
// /flow). The tools themselves run in the browser, so an agent that fetches the
// page gets little it can use; the twin says what the tool does, what goes in,
// what comes out and how to send a person there with the form prefilled.
//
// Titles and descriptions come from the registry (the same ones llms.txt uses)
// and the FAQs from the modules the HTML pages render, so nothing here can
// drift from what a visitor reads.

import { PURPOSES, TARGETS, type Lang } from "@/lib/domain";
import { SCORE_DIMENSIONS, TARGET_SHORT } from "../facts";
import { CONTENT_UPDATED } from "../dates";
import { CORE_PAGES } from "../registry";
import { ANALYZER_PAGE_FAQ } from "./analyzerContent";
import { flowFaq } from "./flowContent";
import type { DocSection, PageDoc } from "./sitePages";

export const TOOL_PAGE_IDS = ["analyzer", "best-ai", "flow"] as const;
export type ToolPageId = (typeof TOOL_PAGE_IDS)[number];

export function isToolPageId(x: string): x is ToolPageId {
  return (TOOL_PAGE_IDS as readonly string[]).includes(x);
}

const tr = (lang: Lang) => <T,>(en: T, es: T, pt: T, zh: T): T => ({ en, es, pt, zh })[lang];

function core(id: ToolPageId) {
  const page = CORE_PAGES.find((p) => p.id === id);
  if (!page) throw new Error(`toolPages: no registry entry for ${id}`);
  return page;
}

function analyzerSections(lang: Lang): DocSection[] {
  const t = tr(lang);
  const dims = SCORE_DIMENSIONS.map((d) => d.label[lang]).join(", ");
  return [
    {
      id: "input",
      heading: t("What goes in", "Qué recibe", "O que entra", "输入什么"),
      blocks: [
        {
          type: "ul",
          items: [
            t("The prompt to check, as plain text.", "El prompt a revisar, en texto plano.", "O prompt a revisar, em texto simples.", "要检查的提示词，纯文本。"),
            t(`Its purpose, one of: ${PURPOSES.join(", ")}.`, `Su propósito, uno de: ${PURPOSES.join(", ")}.`, `O propósito, um de: ${PURPOSES.join(", ")}.`, `用途，以下之一：${PURPOSES.join("、")}。`),
            t(
              `The target AI, one of: ${TARGETS.join(", ")} (${TARGETS.map((x) => TARGET_SHORT[x]).join(", ")}).`,
              `La IA destino, una de: ${TARGETS.join(", ")} (${TARGETS.map((x) => TARGET_SHORT[x]).join(", ")}).`,
              `A IA de destino, uma de: ${TARGETS.join(", ")} (${TARGETS.map((x) => TARGET_SHORT[x]).join(", ")}).`,
              `目标AI，以下之一：${TARGETS.join("、")}（${TARGETS.map((x) => TARGET_SHORT[x]).join("、")}）。`,
            ),
          ],
        },
      ],
    },
    {
      id: "output",
      heading: t("What comes out", "Qué devuelve", "O que sai", "输出什么"),
      blocks: [
        {
          type: "ul",
          items: [
            t(`A score from 0 to 100, from six dimensions: ${dims}. Deterministic rules decide it, not an LLM.`, `Un puntaje de 0 a 100, a partir de seis dimensiones: ${dims}. Lo deciden reglas determinísticas, no un LLM.`, `Uma pontuação de 0 a 100, a partir de seis dimensões: ${dims}. Quem decide são regras determinísticas, não um LLM.`, `0到100的评分，来自六个维度：${dims}。评分由确定性规则决定，而不是LLM。`),
            t("The findings: what is missing or ambiguous, each with a recommendation.", "Los hallazgos: qué falta o es ambiguo, cada uno con una recomendación.", "Os achados: o que falta ou está ambíguo, cada um com uma recomendação.", "发现的问题：缺少什么、哪里含糊，每一项都附有建议。"),
            t("An optimized version of the prompt, written for the chosen AI.", "Una versión optimizada del prompt, escrita para la IA elegida.", "Uma versão otimizada do prompt, escrita para a IA escolhida.", "为所选AI编写的提示词优化版本。"),
          ],
        },
      ],
    },
    {
      id: "link",
      heading: t("Open it with a prompt already loaded", "Abrirlo con un prompt ya cargado", "Abrir com um prompt já carregado", "带着提示词直接打开"),
      blocks: [
        {
          type: "p",
          text: t(
            "The page reads three query parameters, so a link can carry the prompt: `/en/analyzer?prompt=<url-encoded text>&purpose=<purpose>&target=<target>`. The analysis runs when the person opens the link; there is no public API that returns it.",
            "La página lee tres parámetros de la URL, así que un enlace puede llevar el prompt: `/es/analyzer?prompt=<texto codificado>&purpose=<propósito>&target=<destino>`. El análisis corre cuando la persona abre el enlace; no hay una API pública que lo devuelva.",
            "A página lê três parâmetros da URL, então um link pode levar o prompt: `/pt/analyzer?prompt=<texto codificado>&purpose=<propósito>&target=<destino>`. A análise roda quando a pessoa abre o link; não há uma API pública que a devolva.",
            "页面会读取三个URL参数，因此链接可以带上提示词：`/zh/analyzer?prompt=<URL编码的文本>&purpose=<用途>&target=<目标>`。分析在用户打开链接时运行；没有返回分析结果的公开API。",
          ),
        },
      ],
    },
  ];
}

function bestAiSections(lang: Lang): DocSection[] {
  const t = tr(lang);
  return [
    {
      id: "how",
      heading: t("How it works", "Cómo funciona", "Como funciona", "工作原理"),
      blocks: [
        {
          type: "ul",
          items: [
            t("You describe a task in your own words.", "Describís una tarea con tus palabras.", "Você descreve uma tarefa com as suas palavras.", "用自己的话描述一项任务。"),
            t("A deterministic matcher reads what the task needs (code, long context, images, search, price, speed) and scores every current model against it. No LLM is called.", "Un matcher determinístico lee qué necesita la tarea (código, contexto largo, imágenes, búsqueda, precio, velocidad) y puntúa cada modelo vigente. No se llama a ningún LLM.", "Um matcher determinístico lê o que a tarefa precisa (código, contexto longo, imagens, busca, preço, velocidade) e pontua cada modelo atual. Nenhum LLM é chamado.", "确定性匹配器读取任务的需求（代码、长上下文、图像、搜索、价格、速度），并据此给每个现有模型打分。不调用任何LLM。"),
            t("You get a ranked list with the reason for each recommendation, and a button that takes the task to the analyzer with that AI selected.", "Recibís una lista ordenada con el motivo de cada recomendación y un botón que lleva la tarea al analizador con esa IA elegida.", "Você recebe uma lista ordenada com o motivo de cada recomendação e um botão que leva a tarefa ao analisador com essa IA escolhida.", "你会得到一份排好序的列表，每条推荐都附有理由，还有一个按钮可以把任务带到分析器并选好该AI。"),
          ],
        },
        {
          type: "links",
          items: [{ href: `/${lang}/methodology`, label: t("Method: how the match is scored", "Método: cómo se puntúa la recomendación", "Método: como a recomendação é pontuada", "方法：匹配如何评分") }],
        },
      ],
    },
  ];
}

function flowSections(lang: Lang): DocSection[] {
  const t = tr(lang);
  return [
    {
      id: "how",
      heading: t("How it works", "Cómo funciona", "Como funciona", "工作原理"),
      blocks: [
        {
          type: "ul",
          items: [
            t("You write one big task (12 to 4,000 characters).", "Escribís una tarea grande (de 12 a 4.000 caracteres).", "Você escreve uma tarefa grande (de 12 a 4.000 caracteres).", "写下一项大任务（12到4000个字符）。"),
            t("It comes back as 2 to 6 steps. Steps that don't need each other sit on the same row and can run in parallel; a step that needs earlier results comes below and says which.", "Vuelve dividida en 2 a 6 pasos. Los pasos que no se necesitan entre sí van en la misma fila y pueden correr en paralelo; el que necesita resultados anteriores va debajo y dice cuáles.", "Ela volta dividida em 2 a 6 etapas. As etapas que não dependem umas das outras ficam na mesma linha e podem rodar em paralelo; a que precisa de resultados anteriores fica abaixo e diz quais.", "任务会被拆成2到6个步骤。互不依赖的步骤排在同一行，可以并行；需要前面结果的步骤排在下面，并说明依赖哪几步。"),
            t("Each step has a ready-to-paste prompt, what it hands over, and the AI that fits it best with the reason.", "Cada paso trae un prompt listo para pegar, qué entrega y la IA que mejor le queda, con el motivo.", "Cada etapa traz um prompt pronto para colar, o que ela entrega e a IA que mais combina com ela, com o motivo.", "每一步都有可直接粘贴的提示词、它交付的内容，以及最合适的AI及其理由。"),
            t("Promptea writes the prompts; it does not run them. You paste each one into the AI you choose.", "Promptea escribe los prompts; no los ejecuta. Pegás cada uno en la IA que elijas.", "O Promptea escreve os prompts; não os executa. Você cola cada um na IA que escolher.", "Promptea只负责编写提示词，不会执行。你把每一条粘贴到自己选择的AI里。"),
          ],
        },
        {
          type: "links",
          items: [{ href: `/${lang}/guides/prompt-chaining`, label: t("Guide: how to chain prompts", "Guía: cómo encadenar prompts", "Guia: como encadear prompts", "指南：如何串联提示词") }],
        },
      ],
    },
  ];
}

const UPDATED: Record<ToolPageId, string> = {
  analyzer: CONTENT_UPDATED.analyzer,
  "best-ai": CONTENT_UPDATED.bestAi,
  flow: CONTENT_UPDATED.flow,
};

/** The document behind `/{lang}/<tool>.md`. */
export function toolPageDoc(id: ToolPageId, lang: Lang): PageDoc {
  const page = core(id);
  const sections = id === "analyzer" ? analyzerSections(lang) : id === "best-ai" ? bestAiSections(lang) : flowSections(lang);
  const faq = id === "analyzer" ? ANALYZER_PAGE_FAQ.map((x) => ({ q: x.q[lang], a: x.a[lang] })) : id === "flow" ? flowFaq(lang) : [];
  return {
    title: page.title[lang],
    description: page.description[lang],
    h1: page.title[lang],
    tldr: page.description[lang],
    sections,
    faq,
    updated: UPDATED[id],
  };
}
