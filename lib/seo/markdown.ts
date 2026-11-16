// lib/seo/markdown.ts
//
// Clean markdown twins of the public pages. They are generated from the SAME
// data the HTML pages render (guides, glossary, models, landing copy, the
// about/methodology docs, AI Daily articles, the benchmarks snapshot), so they
// cannot say anything the page does not. No navigation, no scripts, no
// styling: just the content, with absolute links, a title, the language, the
// canonical URL and the date of the last change.
//
// Served at `<page URL>.md` (see app/md/[lang]/[[...path]]/route.ts and the
// rewrites in next.config.ts) and linked from llms.txt.

import { glossary, type GlossaryTerm } from "@/lib/seo/content/glossary";
import { guides, type Guide } from "@/lib/seo/content/guides";
import type { ModelPage } from "@/lib/seo/content/models";
import type { LandingPage } from "@/lib/seo/content/landings";
import { ANALYZER_LINK_TEXT, GUIDE_ANALYZER_CTA } from "@/lib/seo/content/analyzerContent";
import type { PublicArticle } from "@/lib/blog/types";
import type { BenchmarksSnapshot } from "@/lib/benchmarks/normalize";
import { CATEGORY_LABELS, SOURCE_INFO } from "@/lib/benchmarks/catalog";
import { buildPrefillHref } from "@/lib/seo/prefill";
import { currentModels, modelSummary } from "./facts";
import { formatDay, toDay } from "./dates";
import type { DocBlock, PageDoc } from "./content/sitePages";
import { SITE_NAME, absUrl, type Locale } from "./site";
import { LANG_NAME } from "@/lib/domain";

// v1.8.7: zh is optional while the Chinese text is written; it falls back to English.
const tr = (lang: Locale) => <T,>(en: T, es: T, pt: T, zh: T = en): T => ({ en, es, pt, zh })[lang];

/** Make a site-relative href absolute; leave full URLs alone. */
export function href(h: string): string {
  return /^https?:\/\//i.test(h) ? h : absUrl(h);
}

/** Collapse whitespace so a value is safe on one markdown line. */
function oneLine(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/** A fenced code block that cannot be closed early by the prompt it contains. */
function fence(text: string): string {
  const longest = (text.match(/`+/g) ?? []).reduce((m, r) => Math.max(m, r.length), 0);
  const ticks = "`".repeat(Math.max(3, longest + 1));
  return `${ticks}text\n${text.trim()}\n${ticks}`;
}

export function header(i: { title: string; description?: string; url: string; lang: Locale; updated?: string }): string {
  const t = tr(i.lang);
  const lines = [`# ${oneLine(i.title)}`, ""];
  if (i.description) lines.push(`> ${oneLine(i.description)}`, "");
  const meta = [
    `${t("Source", "Fuente", "Fonte", "来源")}: ${SITE_NAME} — ${i.url}`,
    `${t("Language", "Idioma", "Idioma", "语言")}: ${LANG_NAME[i.lang]}`,
  ];
  if (i.updated) meta.push(`${t("Last updated", "Última actualización", "Última atualização", "最后更新")}: ${toDay(i.updated)}`);
  lines.push(meta.join(" · "), "");
  return lines.join("\n");
}

function blockToMarkdown(b: DocBlock): string {
  switch (b.type) {
    case "p":
      return b.text;
    case "ul":
      return b.items.map((x) => `- ${oneLine(x)}`).join("\n");
    case "ol":
      return b.items.map((x, i) => `${i + 1}. ${oneLine(x)}`).join("\n");
    case "steps":
      return b.items.map((x, i) => `${i + 1}. **${oneLine(x.name)}.** ${oneLine(x.text)}`).join("\n");
    case "dl":
      return b.items.map((x) => `- **${oneLine(x.term)}**: ${oneLine(x.text)}`).join("\n");
    case "links":
      return b.items.map((x) => `- [${oneLine(x.label)}](${href(x.href)})`).join("\n");
  }
}

/** The about / methodology / home-about documents. */
export function docMarkdown(doc: PageDoc, lang: Locale, url: string, opts: { title?: string } = {}): string {
  const t = tr(lang);
  const out: string[] = [header({ title: opts.title ?? doc.h1, description: doc.description, url, lang, updated: doc.updated })];
  out.push(`**${t("In short", "En breve", "Em resumo", "简而言之")}:** ${doc.tldr}`, "");
  for (const s of doc.sections) {
    out.push(`## ${s.heading}`, "");
    for (const b of s.blocks) out.push(blockToMarkdown(b), "");
  }
  if (doc.faq.length > 0) {
    out.push(`## ${t("Frequently asked questions", "Preguntas frecuentes", "Perguntas frequentes", "常见问题")}`, "");
    for (const f of doc.faq) out.push(`### ${oneLine(f.q)}`, "", f.a, "");
  }
  return out.join("\n").trimEnd() + "\n";
}

/**
 * How much of a page's copy-paste templates a document carries.
 *   full    — the prompts and a prefilled "Open in Promptea" link (the page's own .md twin)
 *   prompts — the prompts, no prefilled link (the link repeats the whole prompt, URL-encoded)
 *   titles  — only the titles, pointing at the twin that has them (llms-full.txt guides)
 */
export type TemplateMode = "full" | "prompts" | "titles";

function templatesMarkdown(
  lang: Locale,
  templates: Array<{ title: Record<Locale, string>; prompt: Record<Locale, string>; purpose: Parameters<typeof buildPrefillHref>[0]["purpose"]; target?: Parameters<typeof buildPrefillHref>[0]["target"] }>,
  defaultTarget: Parameters<typeof buildPrefillHref>[0]["target"],
  mode: TemplateMode = "full",
  twinUrl?: string,
): string[] {
  const t = tr(lang);
  if (templates.length === 0) return [];
  const out = [`## ${t("Templates", "Plantillas", "Templates", "模板")}`, ""];
  if (mode === "titles") {
    out.push(...templates.map((tpl) => `- ${oneLine(tpl.title[lang])}`), "");
    if (twinUrl) out.push(t(`The prompts themselves: ${twinUrl}`, `Los prompts completos: ${twinUrl}`, `Os prompts em si: ${twinUrl}`, `完整提示词：${twinUrl}`), "");
    return out;
  }
  for (const tpl of templates) {
    out.push(`### ${oneLine(tpl.title[lang])}`, "", fence(tpl.prompt[lang]), "");
    if (mode === "full") {
      const open = absUrl(buildPrefillHref({ lang, prompt: tpl.prompt[lang], purpose: tpl.purpose, target: tpl.target ?? defaultTarget }));
      out.push(`[${t("Open in Promptea", "Abrir en Promptea", "Abrir no Promptea", "在Promptea中打开")}](${open})`, "");
    }
  }
  return out;
}

function faqMarkdown(lang: Locale, faq: Array<{ q: Record<Locale, string>; a: Record<Locale, string> }>): string[] {
  if (faq.length === 0) return [];
  const t = tr(lang);
  const out = [`## ${t("Frequently asked questions", "Preguntas frecuentes", "Perguntas frequentes", "常见问题")}`, ""];
  for (const f of faq) out.push(`### ${oneLine(f.q[lang])}`, "", f.a[lang], "");
  return out;
}

export function guideMarkdown(g: Guide, lang: Locale, url: string, updated: string, templates: TemplateMode = "full"): string {
  const out = [header({ title: g.title[lang], description: g.description[lang], url, lang, updated })];
  for (const s of g.sections) {
    out.push(`## ${oneLine(s.heading[lang])}`, "", ...s.bullets[lang].map((b) => `- ${oneLine(b)}`), "");
  }
  const cta = GUIDE_ANALYZER_CTA[g.slug];
  if (cta) out.push(`${cta[lang]} [${ANALYZER_LINK_TEXT[lang]}](${absUrl(`/${lang}/analyzer`)}).`, "");
  out.push(...templatesMarkdown(lang, g.templates, "gpt", templates, `${url}.md`));
  if (templates === "titles" && g.faq.length > 0) {
    // v1.8.6 (llms-full.txt): the questions only; the answers live in the page's twin,
    // like the template prompts. Keeps the explanatory part inside its budget.
    const t = tr(lang);
    out.push(`## ${t("Frequently asked questions", "Preguntas frecuentes", "Perguntas frequentes", "常见问题")}`, "");
    out.push(...g.faq.map((f) => `- ${oneLine(f.q[lang])}`), "");
    out.push(t(`The answers: ${url}.md`, `Las respuestas: ${url}.md`, `As respostas: ${url}.md`, `答案：${url}.md`), "");
  } else {
    out.push(...faqMarkdown(lang, g.faq));
  }
  return out.join("\n").trimEnd() + "\n";
}

export function glossaryMarkdown(term: GlossaryTerm, lang: Locale, url: string, updated: string, templates: TemplateMode = "full"): string {
  const t = tr(lang);
  const out = [header({ title: term.title[lang], description: term.description[lang], url, lang, updated })];
  out.push(`## ${t("What it means", "Qué significa", "O que significa", "含义")}`, "", ...term.body[lang].map((b) => `- ${oneLine(b)}`), "");
  out.push(`## ${t("Example", "Ejemplo", "Exemplo", "示例")}`, "", fence(term.example.prompt[lang]), "");
  if (templates === "full") {
    out.push(
      `[${t("Open in Promptea", "Abrir en Promptea", "Abrir no Promptea", "在Promptea中打开")}](${absUrl(buildPrefillHref({ lang, prompt: term.example.prompt[lang], purpose: term.example.purpose, target: term.example.target }))})`,
      "",
    );
  }
  out.push(...faqMarkdown(lang, term.faq));
  const guideLinks = (term.relatedGuides ?? []).flatMap((slug) =>
    guides.filter((g) => g.slug === slug).map((g) => `- [${oneLine(g.title[lang])}](${absUrl(`/${lang}/guides/${g.slug}`)})`),
  );
  const termLinks = (term.relatedTerms ?? []).flatMap((slug) =>
    glossary.filter((g) => g.slug === slug).map((g) => `- [${oneLine(g.title[lang])}](${absUrl(`/${lang}/glossary/${g.slug}`)})`),
  );
  if (guideLinks.length + termLinks.length > 0) out.push(`## ${t("Related", "Relacionado", "Relacionados", "相关内容")}`, "", ...guideLinks, ...termLinks, "");
  return out.join("\n").trimEnd() + "\n";
}

/** `compact` (llms-full.txt): the before → after examples are linked, not inlined. */
export function landingMarkdown(p: LandingPage, lang: Locale, url: string, updated: string, opts: { compact?: boolean } = {}): string {
  const out = [header({ title: p.h1[lang], description: p.description[lang], url, lang, updated })];
  out.push(...p.intro[lang].flatMap((x) => [x, ""]));
  out.push(...p.bullets[lang].map((b) => `- ${oneLine(b)}`), "");
  if (p.examples && p.examples.length > 0 && opts.compact) {
    const t = tr(lang);
    out.push(t(`Before → after examples with their scores: ${url}.md`, `Ejemplos antes → después con su puntaje: ${url}.md`, `Exemplos antes → depois com a pontuação: ${url}.md`, `修改前→修改后示例及其评分：${url}.md`), "");
  } else if (p.examples && p.examples.length > 0) {
    const t = tr(lang);
    out.push(`## ${t("Before → after examples", "Ejemplos antes → después", "Exemplos antes → depois", "修改前→修改后示例")}`, "");
    for (const ex of p.examples) {
      const s = ex.score[lang];
      out.push(`### ${oneLine(ex.title[lang])}`, "");
      out.push(`${t("Before", "Antes", "Antes", "修改前")} (${t("score", "puntaje", "pontuação", "评分")} ${s.before}/100):`, "", fence(ex.before[lang]), "");
      out.push(`${t("After", "Después", "Depois", "修改后")} (${t("score", "puntaje", "pontuação", "评分")} ${s.after}/100):`, "", fence(ex.after[lang]), "");
      out.push(ex.why[lang], "");
    }
  }
  if (p.faq) out.push(...faqMarkdown(lang, p.faq));
  const links = p.internalLinks.map((l) => `- [${oneLine(l.label[lang])}](${absUrl(l.href(lang))})`);
  if (links.length > 0) out.push(...links, "");
  return out.join("\n").trimEnd() + "\n";
}

export function modelMarkdown(m: ModelPage, lang: Locale, url: string, updated: string, templates: TemplateMode = "full"): string {
  const t = tr(lang);
  const out = [header({ title: m.title[lang], description: m.description[lang], url, lang, updated })];
  out.push(`## ${t("Quick tips", "Tips rápidos", "Dicas rápidas", "快速提示")}`, "", ...m.bullets[lang].map((b) => `- ${oneLine(b)}`), "");

  const models = currentModels(m.slug);
  if (models.length > 0) {
    out.push(`## ${t("Current models Promptea supports", "Modelos vigentes que soporta Promptea", "Modelos atuais compatíveis com o Promptea", "Promptea支持的当前模型")}`, "");
    out.push(
      t(
        "Capabilities come from the provider’s official documentation; each entry shows the date it was last verified.",
        "Las capacidades salen de la documentación oficial del proveedor; cada entrada muestra la fecha de su última verificación.",
        "As capacidades vêm da documentação oficial do provedor; cada item mostra a data da última verificação.",
        "能力信息来自提供商的官方文档；每个条目都标明了最后一次核实的日期。",
      ),
      "",
    );
    for (const entry of models) {
      const s = modelSummary(entry, lang);
      out.push(`### ${s.label}${s.default ? ` (${t("default", "por defecto", "padrão", "默认")})` : ""}`, "", s.note, "");
      out.push(
        `- ${t("Context window", "Ventana de contexto", "Janela de contexto", "上下文窗口")}: ${s.context} tokens · ${t("max output", "salida máxima", "saída máxima", "最大输出")}: ${s.maxOutput}`,
        `- ${t("Input", "Entrada", "Entrada", "输入")}: ${s.inputs} · ${t("output", "salida", "saída", "输出")}: ${s.outputs}`,
        `- ${t("Latency", "Latencia", "Latência", "延迟")}: ${s.latency} · ${t("structured output", "salida estructurada", "saída estruturada", "结构化输出")}: ${s.structuredOutput ? t("yes", "sí", "sim", "是") : t("no", "no", "não", "否")} · ${t("tool use", "uso de herramientas", "uso de ferramentas", "工具调用")}: ${s.toolUse ? t("yes", "sí", "sim", "是") : t("no", "no", "não", "否")} · ${t("native search", "búsqueda nativa", "busca nativa", "原生搜索")}: ${s.nativeSearch ? t("yes", "sí", "sim", "是") : t("no", "no", "não", "否")}`,
      );
      if (s.strengths.length > 0) out.push(`- ${t("Strengths", "Fortalezas", "Pontos fortes", "优势")}: ${s.strengths.join(", ")}`);
      if (s.promptGuidance) out.push(`- ${t("How to prompt it", "Cómo promptearlo", "Como escrever o prompt", "提示词写法")}: ${oneLine(s.promptGuidance)}`);
      out.push(`- ${t("Verified", "Verificado", "Verificado", "已核实")}: ${s.verifiedAt} — [${t("source", "fuente", "fonte", "来源")}](${s.sourceUrl})`, "");
    }
  }

  // v1.8.6: "titles" (llms-full.txt) lists the templates by title and points at the twin, like guides.
  out.push(...templatesMarkdown(lang, m.templates, m.slug, templates, `${url}.md`));
  out.push(...faqMarkdown(lang, m.faq));
  return out.join("\n").trimEnd() + "\n";
}

// ---------------------------------------------------------------------------
// AI Daily
// ---------------------------------------------------------------------------

export function articleMarkdown(a: PublicArticle, url: string, updated: string): string {
  const lang = a.lang;
  const t = tr(lang);
  const out = [header({ title: a.title, description: a.deck, url, lang, updated })];

  const facts = [
    `${t("Published", "Publicada", "Publicado", "发布日期")}: ${a.publishedAt ? toDay(a.publishedAt) : a.eventDate}`,
    `${t("Event date", "Fecha del hecho", "Data do fato", "事件日期")}: ${a.eventDate}`,
    `${t("Category", "Categoría", "Categoria", "类别")}: ${a.category}`,
    `${t("Author", "Autoría", "Autor", "作者")}: ${a.author}`,
  ];
  if (a.coveredFrom && a.coveredTo) facts.push(`${t("Covers", "Cubre", "Cobre", "涵盖时段")}: ${a.coveredFrom} – ${a.coveredTo}`);
  out.push(facts.join(" · "), "");

  if (a.correction?.note) out.push(`> **${t("Correction", "Corrección", "Correção", "更正")}:** ${oneLine(a.correction.note)}`, "");
  out.push(`**${t("Summary", "Resumen", "Resumo", "摘要")}:** ${a.summary}`, "");

  for (const b of a.body) {
    if (b.type === "paragraph") out.push(b.text, "");
    else if (b.type === "heading") out.push(`${b.level === 2 ? "##" : "###"} ${oneLine(b.text)}`, "");
    else if (b.type === "list") out.push(...b.items.map((x, i) => (b.ordered ? `${i + 1}. ${oneLine(x)}` : `- ${oneLine(x)}`)), "");
    else if (b.type === "quote") out.push(`> ${oneLine(b.text)}${b.attribution ? ` — ${oneLine(b.attribution)}` : ""}`, "");
  }

  if (a.keyTakeaways.length > 0) out.push(`## ${t("Key takeaways", "Puntos clave", "Pontos principais", "要点")}`, "", ...a.keyTakeaways.map((x) => `- ${oneLine(x)}`), "");
  if (a.whyItMatters.length > 0) out.push(`## ${t("Why this matters", "Por qué importa", "Por que isso importa", "为什么重要")}`, "", ...a.whyItMatters.map((x) => `- ${oneLine(x)}`), "");

  if (a.sources.length > 0) {
    out.push(`## ${t("Sources", "Fuentes", "Fontes", "来源")}`, "");
    for (const s of a.sources) {
      out.push(`- [${oneLine(s.title)}](${s.url}) — ${oneLine(s.publisher)}${s.primary ? ` (${t("primary source", "fuente primaria", "fonte primária", "一手来源")})` : ""}, ${t("accessed", "consultada el", "acesso em", "访问于")} ${s.accessedAt}`);
    }
    out.push("");
  }
  if (a.singleSourceJustification) out.push(`> ${t("Single-source story", "Nota de una sola fuente", "Notícia de fonte única", "单一来源报道")}: ${oneLine(a.singleSourceJustification)}`, "");

  out.push(
    `*${t(
      "Researched with AI assistance and verified against primary sources before publishing. Every claim links to where it came from.",
      "Investigada con asistencia de IA y verificada contra fuentes primarias antes de publicarse. Cada afirmación enlaza a su origen.",
      "Pesquisado com apoio de IA e verificado em fontes primárias antes da publicação. Cada afirmação leva um link para a origem.",
      "在AI辅助下完成调研，发布前已对照一手来源核实。每一条说法都链接到它的出处。",
    )}*`,
    "",
  );
  return out.join("\n").trimEnd() + "\n";
}

// ---------------------------------------------------------------------------
// Benchmarks
// ---------------------------------------------------------------------------

/** "Name — 87.2" lines for the top `n` of each ranking, with the metric spelled out. */
export function benchmarkSections(snapshot: BenchmarksSnapshot, lang: Locale, n: number): string[] {
  const t = tr(lang);
  const out: string[] = [];
  for (const table of snapshot.tables) {
    const src = SOURCE_INFO[table.def.source];
    out.push(
      `### ${table.def.label[lang]} — ${CATEGORY_LABELS[table.def.category][lang]}`,
      "",
      `${t("Source", "Fuente", "Fonte", "来源")}: ${src.name} (${src.url}) · ${t("Metric", "Métrica", "Métrica", "指标")}: ${table.def.metricLabel[lang]}`,
      "",
      oneLine(table.def.measures[lang]),
      "",
    );
    const rows = table.rows.slice(0, n);
    rows.forEach((r) => out.push(`${r.rank}. ${r.name} (${r.providerLabel}) — ${Math.round(r.value * 100) / 100}`));
    out.push("");
  }
  return out;
}

/**
 * The benchmarks twin. Without a snapshot (no upstream key, an outage) it still
 * exists — llms.txt and the sitemap link to it — and says so plainly, exactly
 * like the page's own empty state, instead of 404ing or inventing rankings.
 */
export function benchmarksMarkdown(snapshot: BenchmarksSnapshot | null, lang: Locale, url: string, fallbackUpdated: string): string {
  const t = tr(lang);
  const description = t(
    "Rankings of AI models by benchmark, with the source, date and metric of each. Each benchmark is its own ranking: scores from different benchmarks are never combined.",
    "Rankings de modelos de IA por benchmark, con la fuente, fecha y métrica de cada uno. Cada benchmark es su propio ranking: los puntajes de benchmarks distintos nunca se combinan.",
    "Rankings de modelos de IA por benchmark, com a fonte, a data e a métrica de cada um. Cada benchmark é um ranking próprio: pontuações de benchmarks diferentes nunca são combinadas.",
    "按基准测试列出的AI模型排行榜，注明每项的来源、日期和指标。每项基准测试都是独立的排行榜：不同基准测试的分数从不合并。",
  );
  if (!snapshot || snapshot.tables.length === 0) {
    return [
      header({ title: t("AI model benchmarks", "Benchmarks de modelos de IA", "Benchmarks de modelos de IA", "AI模型基准测试"), description, url, lang, updated: fallbackUpdated }),
      t(
        "The rankings are not available right now. Promptea prefers showing nothing to showing invented or silently outdated rankings; the live page shows them, with their source and date, as soon as the data source answers.",
        "Los rankings no están disponibles ahora. Promptea prefiere no mostrar nada antes que mostrar rankings inventados o desactualizados sin aviso; la página en vivo los muestra, con su fuente y fecha, apenas la fuente de datos responda.",
        "Os rankings não estão disponíveis agora. O Promptea prefere não mostrar nada a mostrar rankings inventados ou desatualizados sem aviso; a página os exibe, com fonte e data, assim que a fonte de dados responde.",
        "排行榜目前无法显示。Promptea宁可什么都不显示，也不会显示编造的或悄悄过时的排行榜；数据源一旦响应，实时页面就会显示排行榜及其来源和日期。",
      ),
      "",
      `[${t("Methodology", "Metodología", "Metodologia", "方法论")}](${absUrl(`/${lang}/methodology`)})`,
      "",
    ].join("\n");
  }
  const asOf = snapshot.asOf ?? snapshot.fetchedAt;
  const out = [
    header({
      title: t("AI model benchmarks", "Benchmarks de modelos de IA", "Benchmarks de modelos de IA", "AI模型基准测试"),
      description,
      url,
      lang,
      updated: asOf || fallbackUpdated,
    }),
    `${t("Data as of", "Datos al", "Dados de", "数据截至")} ${formatDay(asOf, lang)} · ${t("collected through", "obtenidos de", "coletados via", "收集自")} OpenRouter’s benchmarks API (${snapshot.sourceUrl ?? "https://openrouter.ai/benchmarks"}).`,
    "",
    t(
      "How to read it: compare models only within the same benchmark. A missing score means “not measured”, never zero.",
      "Cómo leerlo: comparé modelos solo dentro del mismo benchmark. Un puntaje ausente significa “sin medición”, nunca cero.",
      "Como ler: compare modelos apenas dentro do mesmo benchmark. Uma pontuação ausente significa “não medido”, nunca zero.",
      "阅读方式：只在同一项基准测试内比较模型。缺失的分数表示“未测量”，绝不表示零分。",
    ),
    "",
    ...benchmarkSections(snapshot, lang, 10),
    `[${t("Methodology", "Metodología", "Metodologia", "方法论")}](${absUrl(`/${lang}/methodology`)})`,
    "",
  ];
  return out.join("\n").trimEnd() + "\n";
}

export const MARKDOWN_CONTENT_TYPE = "text/markdown; charset=utf-8";
