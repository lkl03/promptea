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
import type { PublicArticle } from "@/lib/blog/types";
import type { BenchmarksSnapshot } from "@/lib/benchmarks/normalize";
import { CATEGORY_LABELS, SOURCE_INFO } from "@/lib/benchmarks/catalog";
import { buildPrefillHref } from "@/lib/seo/prefill";
import { currentModels, modelSummary } from "./facts";
import { formatDay, toDay } from "./dates";
import type { DocBlock, PageDoc } from "./content/sitePages";
import { SITE_NAME, absUrl, type Locale } from "./site";

const tr = (lang: Locale) => <T,>(en: T, es: T): T => (lang === "es" ? es : en);

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
    `${t("Source", "Fuente")}: ${SITE_NAME} — ${i.url}`,
    `${t("Language", "Idioma")}: ${i.lang === "es" ? "Español" : "English"}`,
  ];
  if (i.updated) meta.push(`${t("Last updated", "Última actualización")}: ${toDay(i.updated)}`);
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
  out.push(`**${t("In short", "En breve")}:** ${doc.tldr}`, "");
  for (const s of doc.sections) {
    out.push(`## ${s.heading}`, "");
    for (const b of s.blocks) out.push(blockToMarkdown(b), "");
  }
  if (doc.faq.length > 0) {
    out.push(`## ${t("Frequently asked questions", "Preguntas frecuentes")}`, "");
    for (const f of doc.faq) out.push(`### ${oneLine(f.q)}`, "", f.a, "");
  }
  return out.join("\n").trimEnd() + "\n";
}

function templatesMarkdown(
  lang: Locale,
  templates: Array<{ title: Record<Locale, string>; prompt: Record<Locale, string>; purpose: Parameters<typeof buildPrefillHref>[0]["purpose"]; target?: Parameters<typeof buildPrefillHref>[0]["target"] }>,
  defaultTarget: Parameters<typeof buildPrefillHref>[0]["target"],
): string[] {
  const t = tr(lang);
  if (templates.length === 0) return [];
  const out = [`## ${t("Templates", "Plantillas")}`, ""];
  for (const tpl of templates) {
    out.push(`### ${oneLine(tpl.title[lang])}`, "", fence(tpl.prompt[lang]), "");
    const open = absUrl(buildPrefillHref({ lang, prompt: tpl.prompt[lang], purpose: tpl.purpose, target: tpl.target ?? defaultTarget }));
    out.push(`[${t("Open in Promptea", "Abrir en Promptea")}](${open})`, "");
  }
  return out;
}

function faqMarkdown(lang: Locale, faq: Array<{ q: Record<Locale, string>; a: Record<Locale, string> }>): string[] {
  if (faq.length === 0) return [];
  const t = tr(lang);
  const out = [`## ${t("Frequently asked questions", "Preguntas frecuentes")}`, ""];
  for (const f of faq) out.push(`### ${oneLine(f.q[lang])}`, "", f.a[lang], "");
  return out;
}

export function guideMarkdown(g: Guide, lang: Locale, url: string, updated: string): string {
  const out = [header({ title: g.title[lang], description: g.description[lang], url, lang, updated })];
  for (const s of g.sections) {
    out.push(`## ${oneLine(s.heading[lang])}`, "", ...s.bullets[lang].map((b) => `- ${oneLine(b)}`), "");
  }
  out.push(...templatesMarkdown(lang, g.templates, "gpt"));
  out.push(...faqMarkdown(lang, g.faq));
  return out.join("\n").trimEnd() + "\n";
}

export function glossaryMarkdown(term: GlossaryTerm, lang: Locale, url: string, updated: string): string {
  const t = tr(lang);
  const out = [header({ title: term.title[lang], description: term.description[lang], url, lang, updated })];
  out.push(`## ${t("What it means", "Qué significa")}`, "", ...term.body[lang].map((b) => `- ${oneLine(b)}`), "");
  out.push(`## ${t("Example", "Ejemplo")}`, "", fence(term.example.prompt[lang]), "");
  out.push(
    `[${t("Open in Promptea", "Abrir en Promptea")}](${absUrl(buildPrefillHref({ lang, prompt: term.example.prompt[lang], purpose: term.example.purpose, target: term.example.target }))})`,
    "",
  );
  out.push(...faqMarkdown(lang, term.faq));
  const guideLinks = (term.relatedGuides ?? []).flatMap((slug) =>
    guides.filter((g) => g.slug === slug).map((g) => `- [${oneLine(g.title[lang])}](${absUrl(`/${lang}/guides/${g.slug}`)})`),
  );
  const termLinks = (term.relatedTerms ?? []).flatMap((slug) =>
    glossary.filter((g) => g.slug === slug).map((g) => `- [${oneLine(g.title[lang])}](${absUrl(`/${lang}/glossary/${g.slug}`)})`),
  );
  if (guideLinks.length + termLinks.length > 0) out.push(`## ${t("Related", "Relacionado")}`, "", ...guideLinks, ...termLinks, "");
  return out.join("\n").trimEnd() + "\n";
}

export function landingMarkdown(p: LandingPage, lang: Locale, url: string, updated: string): string {
  const out = [header({ title: p.h1[lang], description: p.description[lang], url, lang, updated })];
  out.push(...p.intro[lang].flatMap((x) => [x, ""]));
  out.push(...p.bullets[lang].map((b) => `- ${oneLine(b)}`), "");
  const links = p.internalLinks.map((l) => `- [${oneLine(l.label[lang])}](${absUrl(l.href(lang))})`);
  if (links.length > 0) out.push(...links, "");
  return out.join("\n").trimEnd() + "\n";
}

export function modelMarkdown(m: ModelPage, lang: Locale, url: string, updated: string): string {
  const t = tr(lang);
  const out = [header({ title: m.title[lang], description: m.description[lang], url, lang, updated })];
  out.push(`## ${t("Quick tips", "Tips rápidos")}`, "", ...m.bullets[lang].map((b) => `- ${oneLine(b)}`), "");

  const models = currentModels(m.slug);
  if (models.length > 0) {
    out.push(`## ${t("Current models Promptea supports", "Modelos vigentes que soporta Promptea")}`, "");
    out.push(
      t(
        "Capabilities come from the provider’s official documentation; each entry shows the date it was last verified.",
        "Las capacidades salen de la documentación oficial del proveedor; cada entrada muestra la fecha de su última verificación.",
      ),
      "",
    );
    for (const entry of models) {
      const s = modelSummary(entry, lang);
      out.push(`### ${s.label}${s.default ? ` (${t("default", "por defecto")})` : ""}`, "", s.note, "");
      out.push(
        `- ${t("Context window", "Ventana de contexto")}: ${s.context} tokens · ${t("max output", "salida máxima")}: ${s.maxOutput}`,
        `- ${t("Input", "Entrada")}: ${s.inputs} · ${t("output", "salida")}: ${s.outputs}`,
        `- ${t("Latency", "Latencia")}: ${s.latency} · ${t("structured output", "salida estructurada")}: ${s.structuredOutput ? t("yes", "sí") : t("no", "no")} · ${t("tool use", "uso de herramientas")}: ${s.toolUse ? t("yes", "sí") : t("no", "no")} · ${t("native search", "búsqueda nativa")}: ${s.nativeSearch ? t("yes", "sí") : t("no", "no")}`,
      );
      if (s.strengths.length > 0) out.push(`- ${t("Strengths", "Fortalezas")}: ${s.strengths.join(", ")}`);
      if (s.promptGuidance) out.push(`- ${t("How to prompt it", "Cómo promptearlo")}: ${oneLine(s.promptGuidance)}`);
      out.push(`- ${t("Verified", "Verificado")}: ${s.verifiedAt} — [${t("source", "fuente")}](${s.sourceUrl})`, "");
    }
  }

  out.push(...templatesMarkdown(lang, m.templates, m.slug));
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
    `${t("Published", "Publicada")}: ${a.publishedAt ? toDay(a.publishedAt) : a.eventDate}`,
    `${t("Event date", "Fecha del hecho")}: ${a.eventDate}`,
    `${t("Category", "Categoría")}: ${a.category}`,
    `${t("Author", "Autoría")}: ${a.author}`,
  ];
  if (a.coveredFrom && a.coveredTo) facts.push(`${t("Covers", "Cubre")}: ${a.coveredFrom} – ${a.coveredTo}`);
  out.push(facts.join(" · "), "");

  if (a.correction?.note) out.push(`> **${t("Correction", "Corrección")}:** ${oneLine(a.correction.note)}`, "");
  out.push(`**${t("Summary", "Resumen")}:** ${a.summary}`, "");

  for (const b of a.body) {
    if (b.type === "paragraph") out.push(b.text, "");
    else if (b.type === "heading") out.push(`${b.level === 2 ? "##" : "###"} ${oneLine(b.text)}`, "");
    else if (b.type === "list") out.push(...b.items.map((x, i) => (b.ordered ? `${i + 1}. ${oneLine(x)}` : `- ${oneLine(x)}`)), "");
    else if (b.type === "quote") out.push(`> ${oneLine(b.text)}${b.attribution ? ` — ${oneLine(b.attribution)}` : ""}`, "");
  }

  if (a.keyTakeaways.length > 0) out.push(`## ${t("Key takeaways", "Puntos clave")}`, "", ...a.keyTakeaways.map((x) => `- ${oneLine(x)}`), "");
  if (a.whyItMatters.length > 0) out.push(`## ${t("Why this matters", "Por qué importa")}`, "", ...a.whyItMatters.map((x) => `- ${oneLine(x)}`), "");

  if (a.sources.length > 0) {
    out.push(`## ${t("Sources", "Fuentes")}`, "");
    for (const s of a.sources) {
      out.push(`- [${oneLine(s.title)}](${s.url}) — ${oneLine(s.publisher)}${s.primary ? ` (${t("primary source", "fuente primaria")})` : ""}, ${t("accessed", "consultada el")} ${s.accessedAt}`);
    }
    out.push("");
  }
  if (a.singleSourceJustification) out.push(`> ${t("Single-source story", "Nota de una sola fuente")}: ${oneLine(a.singleSourceJustification)}`, "");

  out.push(
    `*${t(
      "Researched with AI assistance and verified against primary sources before publishing. Every claim links to where it came from.",
      "Investigada con asistencia de IA y verificada contra fuentes primarias antes de publicarse. Cada afirmación enlaza a su origen.",
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
      `${t("Source", "Fuente")}: ${src.name} (${src.url}) · ${t("Metric", "Métrica")}: ${table.def.metricLabel[lang]}`,
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
  );
  if (!snapshot || snapshot.tables.length === 0) {
    return [
      header({ title: t("AI model benchmarks", "Benchmarks de modelos de IA"), description, url, lang, updated: fallbackUpdated }),
      t(
        "The rankings are not available right now. Promptea prefers showing nothing to showing invented or silently outdated rankings; the live page shows them, with their source and date, as soon as the data source answers.",
        "Los rankings no están disponibles ahora. Promptea prefiere no mostrar nada antes que mostrar rankings inventados o desactualizados sin aviso; la página en vivo los muestra, con su fuente y fecha, apenas la fuente de datos responda.",
      ),
      "",
      `[${t("Methodology", "Metodología")}](${absUrl(`/${lang}/methodology`)})`,
      "",
    ].join("\n");
  }
  const asOf = snapshot.asOf ?? snapshot.fetchedAt;
  const out = [
    header({
      title: t("AI model benchmarks", "Benchmarks de modelos de IA"),
      description,
      url,
      lang,
      updated: asOf || fallbackUpdated,
    }),
    `${t("Data as of", "Datos al")} ${formatDay(asOf, lang)} · ${t("collected through", "obtenidos de")} OpenRouter’s benchmarks API (${snapshot.sourceUrl ?? "https://openrouter.ai/benchmarks"}).`,
    "",
    t(
      "How to read it: compare models only within the same benchmark. A missing score means “not measured”, never zero.",
      "Cómo leerlo: comparé modelos solo dentro del mismo benchmark. Un puntaje ausente significa “sin medición”, nunca cero.",
    ),
    "",
    ...benchmarkSections(snapshot, lang, 10),
    `[${t("Methodology", "Metodología")}](${absUrl(`/${lang}/methodology`)})`,
    "",
  ];
  return out.join("\n").trimEnd() + "\n";
}

export const MARKDOWN_CONTENT_TYPE = "text/markdown; charset=utf-8";
