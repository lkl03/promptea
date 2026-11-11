// lib/seo/registry.ts
//
// THE INDEX OF PUBLIC CONTENT. sitemap.xml, llms.txt, llms-full.txt and the
// markdown routes all read from here, so a page added once shows up in all of
// them with the same title, description, date and priority.
//
// How to extend (the AI Daily "Tech" edition of v1.8.3 was added exactly this way):
//   - A new kind of article (another `edition` value, another category) needs
//     nothing here: articles are enumerated from the blog store whatever their
//     edition, and llms.txt groups them by `edition` using `editionHeading()`,
//     which falls back to a generic heading for an edition it has not heard of.
//     Add a heading to EDITION_HEADINGS to name it nicely.
//   - A new static page: add it to CORE_PAGES.
//   - A new collection of hand-written pages (like guides): add a function
//     returning SeoUrl[] and push it in `staticSeoUrls`, and a section in
//     lib/seo/llms.ts SECTIONS.
// Nothing in this file reads Firestore; dynamic content lives in lib/seo/dynamic.ts.

import type { MetadataRoute } from "next";

import { guideLang, guideLocales, guides } from "@/lib/seo/content/guides";
import { glossary } from "@/lib/seo/content/glossary";
import { modelPages } from "@/lib/seo/content/models";
import { landings } from "@/lib/seo/content/landings";
import { CONTENT_UPDATED, modelsVerifiedAt } from "./dates";
import { pick, contentIsFallback } from "@/lib/domain";
import { LOCALES, type Locale } from "./site";

export type ChangeFrequency = NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;

export type SeoSection =
  | "tools"
  | "about"
  | "ai-daily"
  | "guides"
  | "models"
  | "glossary"
  | "prompts"
  | "landing";

export type SeoUrl = {
  lang: Locale;
  /** Locale-prefixed path, e.g. `/en/guides/json-output`. */
  path: string;
  section: SeoSection;
  title: string;
  description: string;
  /** ISO day or instant of the last real change of this URL's content. */
  updated: string;
  changeFrequency: ChangeFrequency;
  priority: number;
  /** The same page in each locale, when the paths are not just the locale swapped (articles). */
  alternates?: Partial<Record<Locale, string>>;
  /** True when `<path>.md` serves a markdown twin. */
  markdown?: boolean;
  /**
   * The locales this page exists in, when that is not all of them (a guide not
   * yet translated to Portuguese). hreflang lists only these.
   */
  locales?: readonly Locale[];
};

/** `/en/guides/x` → `/en/guides/x.md`; the locale home `/en` → `/en.md`. */
export function markdownPathOf(path: string): string {
  return `${path}.md`;
}

type L<T = string> = Record<Locale, T>;

type CorePage = {
  id: string;
  /** Path without the locale prefix: "" is the home page. */
  slug: string;
  section: SeoSection;
  title: L;
  description: L;
  updated: string;
  changeFrequency: ChangeFrequency;
  priority: number;
  markdown?: boolean;
};

/**
 * Static pages. Titles/descriptions are the short, factual ones used in
 * llms.txt; each page keeps its own (search-oriented) <title> in its metadata.
 */
export const CORE_PAGES: readonly CorePage[] = [
  {
    id: "home",
    slug: "",
    section: "tools",
    title: { en: "Promptea — prompt analyzer and optimizer", es: "Promptea — analizador y optimizador de prompts", pt: "Promptea — analisador e otimizador de prompts" },
    description: {
      en: "Score a prompt 0–100 on six criteria, see what to fix and get an optimized version for GPT, Claude, Gemini, Grok, Kimi, DeepSeek or Perplexity. Free, no account.",
      es: "Puntuá un prompt de 0 a 100 en seis criterios, mirá qué corregir y obtené una versión optimizada para GPT, Claude, Gemini, Grok, Kimi, DeepSeek o Perplexity. Gratis, sin cuenta.",
      pt: "Pontue um prompt de 0 a 100 em seis critérios, veja o que corrigir e receba uma versão otimizada para GPT, Claude, Gemini, Grok, Kimi, DeepSeek ou Perplexity. Grátis, sem conta.",
    },
    updated: CONTENT_UPDATED.home,
    changeFrequency: "daily",
    priority: 1,
    markdown: true,
  },
  {
    id: "analyzer",
    slug: "analyzer",
    section: "tools",
    title: { en: "Prompt analyzer", es: "Analizador de prompts", pt: "Analisador de prompts" },
    description: {
      en: "Paste a prompt, pick its purpose and target AI, and get a score, findings, recommendations and an optimized prompt.",
      es: "Pegá un prompt, elegí su propósito y la IA destino, y obtené un puntaje, hallazgos, recomendaciones y un prompt optimizado.",
      pt: "Cole um prompt, escolha o propósito e a IA de destino e receba uma pontuação, achados, recomendações e um prompt otimizado.",
    },
    updated: CONTENT_UPDATED.analyzer,
    changeFrequency: "weekly",
    priority: 0.9,
  },
  {
    id: "best-ai",
    slug: "best-ai",
    section: "tools",
    title: { en: "Find the best AI for your prompt", es: "Elegir la mejor IA para tu prompt", pt: "Encontre a melhor IA para o seu prompt" },
    description: {
      en: "Describe a task and get a ranked, explained recommendation of which AI and model fits it best.",
      es: "Describí una tarea y recibí una recomendación ordenada y explicada de qué IA y modelo le queda mejor.",
      pt: "Descreva uma tarefa e receba uma recomendação ordenada e explicada de qual IA e qual modelo combinam mais com ela.",
    },
    updated: CONTENT_UPDATED.bestAi,
    changeFrequency: "weekly",
    priority: 0.8,
  },
  {
    id: "benchmarks",
    slug: "benchmarks",
    section: "tools",
    title: { en: "AI model benchmarks", es: "Benchmarks de modelos de IA", pt: "Benchmarks de modelos de IA" },
    description: {
      en: "Rankings of AI models by category (general intelligence, coding, agents, science, search, design) with the source, date and metric of each benchmark.",
      es: "Rankings de modelos de IA por categoría (inteligencia general, programación, agentes, ciencia, búsqueda, diseño) con la fuente, fecha y métrica de cada benchmark.",
      pt: "Rankings de modelos de IA por categoria (inteligência geral, programação, agentes, ciência, busca, design) com a fonte, a data e a métrica de cada benchmark.",
    },
    updated: CONTENT_UPDATED.benchmarks,
    changeFrequency: "daily",
    priority: 0.8,
    markdown: true,
  },
  {
    id: "how-it-works",
    slug: "how-it-works",
    section: "about",
    title: { en: "How Promptea works", es: "Cómo funciona Promptea", pt: "Como o Promptea funciona" },
    description: {
      en: "What Promptea is, how a prompt is scored 0–100 on six criteria, how to use the analyzer, supported AIs and prompt types, and the FAQ.",
      es: "Qué es Promptea, cómo se puntúa un prompt de 0 a 100 en seis criterios, cómo usar el analizador, IAs y tipos de prompt soportados, y las preguntas frecuentes.",
      pt: "O que é o Promptea, como um prompt é pontuado de 0 a 100 em seis critérios, como usar o analisador, as IAs e os tipos de prompt compatíveis e as perguntas frequentes.",
    },
    updated: CONTENT_UPDATED.howItWorks,
    changeFrequency: "monthly",
    priority: 0.7,
    markdown: true,
  },
  {
    id: "about",
    slug: "about",
    section: "about",
    title: { en: "About Promptea", es: "Acerca de Promptea", pt: "Sobre o Promptea" },
    description: {
      en: "Who is behind Promptea (eterlab), what the product does, its sourcing and privacy principles, and how to cite it.",
      es: "Quién está detrás de Promptea (eterlab), qué hace el producto, sus principios de fuentes y privacidad, y cómo citarlo.",
      pt: "Quem está por trás do Promptea (eterlab), o que o produto faz, seus princípios de fontes e privacidade e como citá-lo.",
    },
    updated: CONTENT_UPDATED.about,
    changeFrequency: "monthly",
    priority: 0.6,
    markdown: true,
  },
  {
    id: "methodology",
    slug: "methodology",
    section: "about",
    title: { en: "Methodology", es: "Metodología", pt: "Metodologia" },
    description: {
      en: "How the prompt score is computed, what is deterministic and what uses an LLM, how the best-AI match works, AI Daily's editorial policy and how benchmarks are collected.",
      es: "Cómo se calcula el puntaje, qué es determinístico y qué usa un LLM, cómo funciona la recomendación de IA, la política editorial de IA al Día y cómo se obtienen los benchmarks.",
      pt: "Como a pontuação do prompt é calculada, o que é determinístico e o que usa um LLM, como funciona a recomendação da melhor IA, a política editorial do AI Daily e como os benchmarks são coletados.",
    },
    updated: CONTENT_UPDATED.methodology,
    changeFrequency: "monthly",
    priority: 0.7,
    markdown: true,
  },
  {
    id: "changelog",
    slug: "changelog",
    section: "about",
    title: { en: "Changelog", es: "Historial de versiones", pt: "Histórico de versões" },
    description: {
      en: "Version history of Promptea: product changes, analyzer improvements and fixes.",
      es: "Historial de versiones de Promptea: cambios de producto, mejoras del analizador y correcciones.",
      pt: "Histórico de versões do Promptea: mudanças no produto, melhorias no analisador e correções.",
    },
    updated: CONTENT_UPDATED.changelog,
    changeFrequency: "weekly",
    priority: 0.4,
  },
  {
    id: "privacy",
    slug: "privacy",
    section: "about",
    title: { en: "Privacy policy", es: "Política de privacidad", pt: "Política de privacidade" },
    description: {
      en: "What Promptea collects (metadata, not prompt text), what it does not, voice dictation and feedback handling.",
      es: "Qué recolecta Promptea (metadatos, no el texto de los prompts), qué no, el dictado por voz y el manejo del feedback.",
      pt: "O que o Promptea coleta (metadados, não o texto do prompt), o que não coleta e como trata o ditado por voz e o feedback.",
    },
    updated: CONTENT_UPDATED.privacy,
    changeFrequency: "yearly",
    priority: 0.2,
  },
  {
    id: "blog",
    slug: "blog",
    section: "ai-daily",
    title: { en: "AI Daily", es: "IA al Día", pt: "AI Daily" },
    description: {
      en: "One verified AI story every morning, cross-checked against primary sources, with the sources attached.",
      es: "Una noticia de IA verificada cada mañana, contrastada con fuentes primarias, con las fuentes a la vista.",
      pt: "Uma notícia de IA verificada todas as manhãs, conferida em fontes primárias, com as fontes junto.",
    },
    updated: CONTENT_UPDATED.blogIndex,
    changeFrequency: "daily",
    priority: 0.8,
  },
  {
    // v1.8.3 — how AI Daily chooses and verifies its sources (all three locales).
    id: "sources",
    slug: "sources",
    section: "about",
    title: { en: "How we choose and verify sources", es: "Cómo elegimos y verificamos las fuentes", pt: "Como escolhemos e verificamos as fontes" },
    description: {
      en: "The three source tiers behind AI Daily and AI Daily Tech, what a story needs before it is published, who we read, and how corrections work.",
      es: "Los tres niveles de fuentes de IA al Día e IA al Día Tech, qué necesita una nota para publicarse, a quién leemos y cómo funcionan las correcciones.",
      pt: "Os três níveis de fontes do AI Daily e do AI Daily Tech, o que uma notícia precisa para ser publicada, quem lemos e como funcionam as correções.",
    },
    updated: CONTENT_UPDATED.sources,
    changeFrequency: "monthly",
    priority: 0.4,
    markdown: true,
  },
  {
    // v1.8.3 — the Tech section of AI Daily.
    id: "blog-tech",
    slug: "blog/tech",
    section: "ai-daily",
    title: { en: "AI Daily Tech", es: "IA al Día Tech", pt: "AI Daily Tech" },
    description: {
      en: "One verified technology story a day — cloud platforms, web frameworks, developer tools, hardware — told through what it changes for AI and for people who build software.",
      es: "Una nota de tecnología verificada por día (nube, frameworks web, herramientas para desarrollar, hardware), contada por lo que cambia para la IA y para quienes desarrollan software.",
      pt: "Uma notícia de tecnologia verificada por dia (nuvem, frameworks web, ferramentas de desenvolvimento, hardware), contada pelo que muda para a IA e para quem desenvolve software.",
    },
    updated: CONTENT_UPDATED.blogTech,
    changeFrequency: "daily",
    priority: 0.7,
  },
  {
    id: "weekly",
    slug: "blog/weekly",
    section: "ai-daily",
    title: { en: "Weekly digest archive", es: "Archivo del resumen semanal", pt: "Arquivo do resumo semanal" },
    description: {
      en: "Every edition of Promptea's weekly digest: the AI stories that mattered, week by week.",
      es: "Todas las ediciones del resumen semanal de Promptea: las noticias de IA que importaron, semana a semana.",
      pt: "Todas as edições do resumo semanal do Promptea: as notícias de IA que importaram, semana a semana.",
    },
    updated: CONTENT_UPDATED.weeklyArchive,
    changeFrequency: "weekly",
    priority: 0.6,
  },
  {
    id: "guides",
    slug: "guides",
    section: "guides",
    title: { en: "Prompting guides", es: "Guías de prompting", pt: "Guias de prompting" },
    description: {
      en: "Practical guides to write better prompts: structure, JSON output, code, roles, few-shot, per-model advice and use cases by job.",
      es: "Guías prácticas para escribir mejores prompts: estructura, salida JSON, código, roles, few-shot, consejos por modelo y casos de uso por área.",
      pt: "Guias práticos para escrever prompts melhores: estrutura, saída em JSON, código, papéis, few-shot, dicas por modelo e casos de uso por profissão.",
    },
    updated: CONTENT_UPDATED.guides,
    changeFrequency: "weekly",
    priority: 0.7,
  },
  {
    id: "models",
    slug: "models",
    section: "models",
    title: { en: "Prompts by model", es: "Prompts por modelo", pt: "Prompts por modelo" },
    description: {
      en: "How to prompt GPT, Claude, Gemini, Grok, Kimi, DeepSeek and Perplexity, with the current models of each, their verified capabilities and templates.",
      es: "Cómo promptear GPT, Claude, Gemini, Grok, Kimi, DeepSeek y Perplexity, con los modelos vigentes de cada uno, sus capacidades verificadas y plantillas.",
      pt: "Como escrever prompts para GPT, Claude, Gemini, Grok, Kimi, DeepSeek e Perplexity, com os modelos atuais de cada um, suas capacidades verificadas e templates.",
    },
    updated: CONTENT_UPDATED.models,
    changeFrequency: "weekly",
    priority: 0.7,
  },
  {
    id: "glossary",
    slug: "glossary",
    section: "glossary",
    title: { en: "Prompt engineering glossary", es: "Glosario de prompt engineering", pt: "Glossário de engenharia de prompt" },
    description: {
      en: "Short definitions with copy-paste examples of the terms behind good prompts.",
      es: "Definiciones breves con ejemplos para copiar de los términos detrás de un buen prompt.",
      pt: "Definições curtas, com exemplos prontos para copiar, dos termos por trás de bons prompts.",
    },
    updated: CONTENT_UPDATED.glossary,
    changeFrequency: "monthly",
    priority: 0.6,
  },
  {
    id: "prompts",
    slug: "prompts",
    section: "prompts",
    title: { en: "Prompt packs", es: "Packs de prompts", pt: "Pacotes de prompts" },
    description: {
      en: "Copy-ready prompt packs by purpose: study, text, code, data, image and marketing. Open any template in the analyzer.",
      es: "Packs de prompts listos para copiar por propósito: estudio, texto, código, datos, imagen y marketing. Abrí cualquier plantilla en el analizador.",
      pt: "Pacotes de prompts prontos para copiar, por propósito: estudo, texto, código, dados, imagem e marketing. Abra qualquer template no analisador.",
    },
    updated: CONTENT_UPDATED.prompts,
    changeFrequency: "monthly",
    priority: 0.8,
  },
  ...(
    [
      ["study", { en: "Study prompts", es: "Prompts para estudiar", pt: "Prompts para estudar" }, { en: "Templates for learning a topic, practice questions and study plans.", es: "Plantillas para aprender un tema, preguntas de práctica y planes de estudio.", pt: "Templates para aprender um assunto, questões para praticar e planos de estudo." }],
      ["text", { en: "Text prompts", es: "Prompts de texto", pt: "Prompts de texto" }, { en: "Templates to write, rewrite and summarize: emails, posts, tone and structure.", es: "Plantillas para escribir, reescribir y resumir: emails, posts, tono y estructura.", pt: "Templates para escrever, reescrever e resumir: e-mails, posts, tom e estrutura." }],
      ["data", { en: "Data prompts", es: "Prompts de datos", pt: "Prompts de dados" }, { en: "Templates to extract data, return strict JSON, validate schemas and normalize text or CSV.", es: "Plantillas para extraer datos, devolver JSON estricto, validar esquemas y normalizar texto o CSV.", pt: "Templates para extrair dados, retornar JSON estrito, validar esquemas e normalizar texto ou CSV." }],
      ["code", { en: "Coding prompts", es: "Prompts para código", pt: "Prompts para código" }, { en: "Templates for debugging, code review, refactors and tests.", es: "Plantillas para depuración, code review, refactors y tests.", pt: "Templates para depuração, code review, refatorações e testes." }],
      ["image", { en: "Image prompts", es: "Prompts para imágenes", pt: "Prompts para imagens" }, { en: "Templates for image generation: style, composition, lighting and variations.", es: "Plantillas para generar imágenes: estilo, composición, iluminación y variantes.", pt: "Templates para geração de imagens: estilo, composição, iluminação e variações." }],
      ["marketing", { en: "Marketing prompts", es: "Prompts de marketing", pt: "Prompts de marketing" }, { en: "Templates for copy, ads, landing pages and emails.", es: "Plantillas para copy, ads, landings y emails.", pt: "Templates para copy, anúncios, landing pages e e-mails." }],
    ] as const
  ).map(
    ([slug, title, description]): CorePage => ({
      id: `prompts-${slug}`,
      slug: `prompts/${slug}`,
      section: "prompts",
      title,
      description,
      updated: CONTENT_UPDATED.prompts,
      changeFrequency: "monthly",
      priority: 0.7,
    }),
  ),
];

export function corePage(id: string): CorePage {
  const p = CORE_PAGES.find((x) => x.id === id);
  if (!p) throw new Error(`unknown core page: ${id}`);
  return p;
}

export function corePath(id: string, lang: Locale): string {
  const p = corePage(id);
  return p.slug ? `/${lang}/${p.slug}` : `/${lang}`;
}

/**
 * AI Daily and the weekly summary are written in Spanish and English. Under a
 * locale without an edition of its own (pt) those pages are views of the English
 * original (canonical → /en/…), so they are not part of that locale's index:
 * not in the sitemap, not in llms.txt, no markdown twin.
 */
export function inLocaleIndex(section: SeoSection, lang: Locale): boolean {
  return section !== "ai-daily" || !contentIsFallback(lang);
}

function coreUrls(lang: Locale): SeoUrl[] {
  return CORE_PAGES.filter((p) => inLocaleIndex(p.section, lang)).map((p) => ({
    lang,
    path: p.slug ? `/${lang}/${p.slug}` : `/${lang}`,
    section: p.section,
    title: p.title[lang],
    description: p.description[lang],
    updated: p.updated,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
    ...(p.markdown ? { markdown: true } : {}),
  }));
}

/** Newest `verifiedAt` of the registry models behind a model page. */
export function modelPageUpdated(slug: string): string {
  const v = modelsVerifiedAt(slug as Parameters<typeof modelsVerifiedAt>[0]);
  return v > CONTENT_UPDATED.models ? v : CONTENT_UPDATED.models;
}

/** Every hand-written, always-present URL for one locale. */
export function staticSeoUrls(lang: Locale): SeoUrl[] {
  const urls: SeoUrl[] = coreUrls(lang);

  for (const g of guides) {
    // An untranslated guide is not part of this locale's index (see guideLang()).
    if (guideLang(g, lang) !== lang) continue;
    const locales = guideLocales(g);
    urls.push({
      lang,
      ...(locales.length < LOCALES.length ? { locales } : {}),
      path: `/${lang}/guides/${g.slug}`,
      section: "guides",
      title: g.title[lang],
      description: g.description[lang],
      updated: g.updated ?? CONTENT_UPDATED.guides,
      changeFrequency: "monthly",
      priority: 0.6,
      markdown: true,
    });
  }

  for (const m of modelPages) {
    urls.push({
      lang,
      path: `/${lang}/models/${m.slug}`,
      section: "models",
      title: m.title[lang],
      description: m.description[lang],
      updated: modelPageUpdated(m.slug),
      changeFrequency: "monthly",
      priority: 0.6,
      markdown: true,
    });
  }

  for (const t of glossary) {
    urls.push({
      lang,
      path: `/${lang}/glossary/${t.slug}`,
      section: "glossary",
      title: t.title[lang],
      description: t.description[lang],
      updated: t.updated ?? CONTENT_UPDATED.glossary,
      changeFrequency: "monthly",
      priority: 0.5,
      markdown: true,
    });
  }

  for (const p of landings) {
    urls.push({
      lang,
      path: `/${lang}/landing/${p.slug}`,
      section: "landing",
      title: p.title[lang],
      description: p.description[lang],
      updated: CONTENT_UPDATED.landings,
      changeFrequency: "monthly",
      priority: 0.6,
      markdown: true,
    });
  }

  return urls;
}

export function allStaticSeoUrls(): SeoUrl[] {
  return LOCALES.flatMap((l) => staticSeoUrls(l));
}

// ---------------------------------------------------------------------------
// AI Daily editions: headings for llms.txt
// ---------------------------------------------------------------------------

/**
 * Heading per article `edition` in llms.txt, in display order. An edition that
 * is not listed (e.g. a future "tech") is still published, under a generic
 * heading derived from its id, after the listed ones — nothing has to be
 * changed here for it to appear.
 */
export const EDITION_HEADINGS: ReadonlyArray<{ edition: string; title: L }> = [
  { edition: "daily", title: { en: "AI Daily — latest stories", es: "IA al Día — últimas notas", pt: "AI Daily — últimas notícias" } },
  { edition: "daily-morning", title: { en: "AI Daily — morning edition", es: "IA al Día — edición de la mañana", pt: "AI Daily — edição da manhã" } },
  { edition: "weekly-recap", title: { en: "AI Daily — week in review", es: "IA al Día — resumen de la semana", pt: "AI Daily — resumo da semana" } },
  { edition: "week-ahead", title: { en: "AI Daily — week ahead", es: "IA al Día — la semana que viene", pt: "AI Daily — a semana que vem" } },
  // v1.8.3 — the Tech edition (one technology story a day, tied to AI and software development).
  { edition: "tech-daily", title: { en: "AI Daily Tech — latest stories", es: "IA al Día Tech — últimas notas", pt: "AI Daily Tech — últimas notícias" } },
];

export function editionHeading(edition: string, lang: Locale): string {
  const known = EDITION_HEADINGS.find((h) => h.edition === edition);
  if (known) return known.title[lang];
  const label = edition.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return pick(lang, { es: `IA al Día — ${label}`, en: `AI Daily — ${label}`, pt: `AI Daily — ${label}` });
}

/** Position of an edition in the display order (unknown editions go last, by name). */
export function editionOrder(edition: string): number {
  const i = EDITION_HEADINGS.findIndex((h) => h.edition === edition);
  return i === -1 ? EDITION_HEADINGS.length : i;
}
