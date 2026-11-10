// lib/seo/llms.ts
//
// /llms.txt and /llms-full.txt, generated from the real content (the registry,
// the hand-written content modules, AI Daily articles and the benchmarks
// snapshot). Pure: the route handlers load the data, these functions format it.
//
// Format (https://llmstxt.org): an H1 with the site name, a blockquote summary,
// then H2 sections of `- [name](url): notes` links. Links point at the clean
// markdown twin (`.md`) when a page has one.
//
// Extending: to add a section (e.g. a new collection), add an entry to
// SECTIONS below; to add an AI Daily edition ("tech", v1.8.1) nothing is
// needed — articles are grouped by their `edition` and unknown editions get a
// generic heading (see lib/seo/registry.ts EDITION_HEADINGS).

import type { PublicArticle } from "@/lib/blog/types";
import type { NewsletterEdition } from "@/lib/newsletter/types";
import type { BenchmarksSnapshot } from "@/lib/benchmarks/normalize";
import { SOURCE_INFO } from "@/lib/benchmarks/catalog";
import { guides } from "@/lib/seo/content/guides";
import { glossary } from "@/lib/seo/content/glossary";
import { modelPages } from "@/lib/seo/content/models";
import { landings } from "@/lib/seo/content/landings";
import { TARGETS, isContentLang, type ContentLang } from "@/lib/domain";
import { aboutDoc, homeAboutDoc, howItWorksDoc, methodologyDoc } from "./content/sitePages";
import { CONTENT_UPDATED, formatDay, newest, toDay } from "./dates";
import { SCORE_DIMENSIONS, TARGET_SHORT, currentModels, purposeList } from "./facts";
import {
  articleMarkdown,
  benchmarkSections,
  benchmarksMarkdown,
  docMarkdown,
  glossaryMarkdown,
  guideMarkdown,
  landingMarkdown,
  modelMarkdown,
} from "./markdown";
import { articleUpdated, articleUrl, editionUrl } from "./dynamicUrls";
import { editionHeading, editionOrder, markdownPathOf, staticSeoUrls, modelPageUpdated, type SeoSection, type SeoUrl } from "./registry";
import { absUrl, type Locale } from "./site";

export type LlmsInput = {
  lang: Locale;
  articles: PublicArticle[];
  editions: NewsletterEdition[];
  benchmarks: BenchmarksSnapshot | null;
};

const tr = (lang: Locale) => <T,>(en: T, es: T): T => (lang === "es" ? es : en);

/** How many AI Daily stories llms.txt lists (newest first, across editions). */
export const LLMS_MAX_ARTICLES = 30;
/** How many weekly digest editions llms.txt lists. */
export const LLMS_MAX_EDITIONS = 8;
/** Rankings and rows shown in the benchmark summary. */
const BENCH_RANKINGS = 3;
const BENCH_ROWS = 5;
/** AI Daily stories included in full in llms-full.txt. */
export const LLMS_FULL_MAX_ARTICLES = 7;
/**
 * Budget for the AI Daily part of llms-full.txt (bytes of UTF-8). Everything
 * explanatory (product, method, models, glossary, guides) is always included and
 * only changes when someone edits it; AI Daily is the one part that grows every
 * day, so its stories are added newest first only while they fit this budget,
 * and the rest is linked from llms.txt. v1.8.0 measured the static part at about
 * 285 KB (en) / 315 KB (es), down from 405 / 455 KB: guides keep their sections
 * and FAQ but list their templates by title (the prompts live in each page's
 * .md twin), and no document repeats a prompt inside a prefilled link.
 */
export const LLMS_FULL_ARTICLES_BYTES = 60 * 1024;
/**
 * v1.8.1 — hard ceiling for the whole llms-full.txt (bytes of UTF-8).
 *
 * Criterion: the file exists to be fetched ONCE into an assistant's context.
 * Spanish/English prose averages ~3.6–4 bytes per token, so 400 KB is about
 * 100–110 k tokens: it fits the 200 k-token windows of current assistants with
 * room left for the question and the answer. Above that it stops being a
 * single-fetch document and the per-page .md twins (linked from llms.txt) are
 * the right tool instead.
 *
 * The explanatory part (product, method, models, glossary, guides, landings) is
 * always included: ~290 KB (en) / ~320 KB (es), most of it the guides. AI Daily
 * is the only part that grows, so it gets what is left under this ceiling, never
 * more than LLMS_FULL_ARTICLES_BYTES. `npm run seo:check` fails above the
 * ceiling, and a unit test fails if the explanatory part alone gets within
 * 40 KB of it — the signal to move more of the guides to their twins.
 */
export const LLMS_FULL_TOTAL_BYTES = 400 * 1024;

function link(u: SeoUrl): string {
  const target = u.markdown ? markdownPathOf(u.path) : u.path;
  return `- [${u.title.replace(/[[\]]/g, "")}](${absUrl(target)}): ${u.description.replace(/\s+/g, " ").trim()}`;
}

type Section = { section: SeoSection; title: Record<Locale, string> };

/** Static sections, in display order. AI Daily is built separately (it is per-edition). */
const SECTIONS: readonly Section[] = [
  { section: "tools", title: { en: "Tools", es: "Herramientas", pt: "Ferramentas" } },
  { section: "about", title: { en: "About, method and policies", es: "Acerca de, método y políticas", pt: "Sobre, método e políticas" } },
  // "ai-daily" is inserted here by buildLlmsTxt
  { section: "guides", title: { en: "Prompting guides", es: "Guías de prompting", pt: "Guias de prompting" } },
  { section: "models", title: { en: "Prompts by model", es: "Prompts por modelo", pt: "Prompts por modelo" } },
  { section: "glossary", title: { en: "Glossary", es: "Glosario", pt: "Glossário" } },
  { section: "prompts", title: { en: "Prompt packs", es: "Packs de prompts", pt: "Pacotes de prompts" } },
  { section: "landing", title: { en: "Landing pages", es: "Páginas de producto", pt: "Landing pages" } },
];

export function summaryText(lang: Locale): string {
  const t = tr(lang);
  return t(
    "Promptea is a free prompt analyzer and optimizer: it scores a prompt from 0 to 100 on six criteria, lists what to fix and writes an optimized version for the AI model you choose. It also recommends which AI fits a task, publishes one verified AI story a day (AI Daily) and shows AI model benchmarks with source and date. Available in English and Spanish. Designed and developed by eterlab.",
    "Promptea es un analizador y optimizador de prompts gratuito: puntúa un prompt de 0 a 100 en seis criterios, lista qué corregir y escribe una versión optimizada para el modelo de IA que elijas. También recomienda qué IA conviene para una tarea, publica una noticia de IA verificada por día (IA al Día) y muestra benchmarks de modelos con fuente y fecha. Disponible en español e inglés. Diseñada y desarrollada por eterlab.",
  );
}

function keyFacts(lang: Locale): string[] {
  const t = tr(lang);
  const models = currentModels();
  return [
    t(
      `Score: 0–100, from six dimensions — ${SCORE_DIMENSIONS.map((d) => d.label.en.toLowerCase()).join(", ")}. Deterministic rules, no LLM decides the score.`,
      `Puntaje: 0–100, a partir de seis dimensiones — ${SCORE_DIMENSIONS.map((d) => d.label.es.toLowerCase()).join(", ")}. Reglas determinísticas, ningún LLM decide el puntaje.`,
    ),
    t(
      `AI families supported: ${TARGETS.map((x) => TARGET_SHORT[x]).join(", ")} (${models.length} current models, verified against official provider docs up to ${formatDay(newest(...models.map((m) => m.verifiedAt)) ?? CONTENT_UPDATED.models, "en")}).`,
      `Familias de IA soportadas: ${TARGETS.map((x) => TARGET_SHORT[x]).join(", ")} (${models.length} modelos vigentes, verificados contra la documentación oficial hasta el ${formatDay(newest(...models.map((m) => m.verifiedAt)) ?? CONTENT_UPDATED.models, "es")}).`,
    ),
    t(`Prompt types: ${purposeList("en").join(", ")}.`, `Tipos de prompt: ${purposeList("es").join(", ")}.`),
    t("Free to use, no account needed to analyze a prompt.", "Gratis, sin cuenta para analizar un prompt."),
    t(
      "Privacy: telemetry stores metadata (score, task type, finding IDs), not the prompt text; the prompt library lives in the user’s browser.",
      "Privacidad: la telemetría guarda metadatos (puntaje, tipo de tarea, IDs de hallazgos), no el texto del prompt; la biblioteca de prompts vive en el navegador del usuario.",
    ),
  ];
}

function citeBlock(lang: Locale): string[] {
  const t = tr(lang);
  return [
    t(
      "Cite the specific page you used, with its title, the URL (the HTML URL, without .md) and the date you accessed it. Name Promptea as the source and link to it. For benchmark figures also name the original source shown on the page (Artificial Analysis, OpenRouter or Design Arena) and its “as of” date. For news, cite the AI Daily article and, where possible, the primary sources it links.",
      "Citá la página concreta que usaste, con su título, la URL (la URL HTML, sin .md) y la fecha de acceso. Nombrá a Promptea como fuente y enlazala. Para cifras de benchmarks nombrá también la fuente original que muestra la página (Artificial Analysis, OpenRouter o Design Arena) y su fecha de actualización. Para noticias, citá el artículo de IA al Día y, cuando se pueda, las fuentes primarias que enlaza.",
    ),
  ];
}

/** A short, dated summary of the benchmark snapshot, or an honest "not available". */
export function benchmarkSummary(snapshot: BenchmarksSnapshot | null, lang: Locale): string[] {
  const t = tr(lang);
  if (!snapshot || snapshot.tables.length === 0) {
    return [
      t(
        "No benchmark snapshot was available when this file was generated. Live rankings, with their source and date, are on the benchmarks page.",
        "No había un snapshot de benchmarks disponible cuando se generó este archivo. Los rankings en vivo, con su fuente y fecha, están en la página de benchmarks.",
      ),
    ];
  }
  const asOf = snapshot.asOf ?? snapshot.fetchedAt;
  const sources = Array.from(new Set(snapshot.tables.map((tb) => SOURCE_INFO[tb.def.source].name))).join(", ");
  const head = [
    t(
      `Data as of ${formatDay(asOf, "en")}, collected through OpenRouter’s benchmarks API (sources: ${sources}). Each benchmark is its own ranking with its own metric; scores from different benchmarks are never combined, and a missing score means “not measured”. Top ${BENCH_ROWS} of the first ${BENCH_RANKINGS} rankings:`,
      `Datos al ${formatDay(asOf, "es")}, obtenidos de la API de benchmarks de OpenRouter (fuentes: ${sources}). Cada benchmark es su propio ranking con su propia métrica; los puntajes de benchmarks distintos nunca se combinan y un puntaje ausente significa “sin medición”. Top ${BENCH_ROWS} de los primeros ${BENCH_RANKINGS} rankings:`,
    ),
    "",
  ];
  const sliced: BenchmarksSnapshot = { ...snapshot, tables: snapshot.tables.slice(0, BENCH_RANKINGS) };
  return [...head, ...benchmarkSections(sliced, lang, BENCH_ROWS)];
}

function aiDailySections(i: LlmsInput): string[] {
  const t = tr(i.lang);
  const out: string[] = [];

  const blog = staticSeoUrls(i.lang).filter((u) => u.section === "ai-daily");
  out.push(`## ${t("AI Daily and weekly digest", "IA al Día y resumen semanal")}`, "", ...blog.map(link), "");

  // Newest first across editions, capped; then grouped by edition.
  const urls = [...i.articles]
    .sort((a, b) => (articleUpdated(b) > articleUpdated(a) ? 1 : -1))
    .slice(0, LLMS_MAX_ARTICLES)
    .map((a) => ({ a, url: articleUrl(a) }));

  const byEdition = new Map<string, typeof urls>();
  for (const x of urls) byEdition.set(x.a.edition, [...(byEdition.get(x.a.edition) ?? []), x]);
  const editions = Array.from(byEdition.keys()).sort((x, y) => editionOrder(x) - editionOrder(y) || x.localeCompare(y));

  for (const edition of editions) {
    out.push(`## ${editionHeading(edition, i.lang)}`, "");
    for (const { a, url } of byEdition.get(edition) ?? []) {
      out.push(`- [${url.title.replace(/[[\]]/g, "")}](${absUrl(markdownPathOf(url.path))}): ${toDay(articleUpdated(a))} — ${url.description.replace(/\s+/g, " ").trim()}`);
    }
    out.push("");
  }

  const eds = isContentLang(i.lang) ? i.editions.slice(0, LLMS_MAX_EDITIONS).map((e) => editionUrl(e, i.lang as ContentLang)) : [];
  if (eds.length > 0) {
    out.push(`## ${t("Weekly digest editions", "Ediciones del resumen semanal")}`, "", ...eds.map((u) => `- [${u.title.replace(/[[\]]/g, "")}](${absUrl(u.path)}): ${toDay(u.updated)} — ${u.description.replace(/\s+/g, " ").trim()}`), "");
  }
  return out;
}

/** /llms.txt — the index. */
export function buildLlmsTxt(i: LlmsInput): string {
  const t = tr(i.lang);
  const other: Locale = i.lang === "es" ? "en" : "es";
  const urls = staticSeoUrls(i.lang);
  const out: string[] = [];

  out.push("# Promptea", "", `> ${summaryText(i.lang)}`, "");
  out.push(...keyFacts(i.lang).map((f) => `- ${f}`), "");
  out.push(
    t(
      `Links ending in .md are clean markdown versions of the HTML page at the same URL without .md. Full text of everything below: ${absUrl(`/${i.lang}/llms-full.txt`)}. This index is in English; the Spanish one is ${absUrl("/es/llms.txt")}.`,
      `Los enlaces que terminan en .md son versiones limpias en markdown de la página HTML con la misma URL sin .md. Texto completo de todo lo de abajo: ${absUrl(`/${i.lang}/llms-full.txt`)}. Este índice está en español; el de inglés es ${absUrl("/en/llms.txt")}.`,
    ),
    "",
  );

  for (const s of SECTIONS) {
    const items = urls.filter((u) => u.section === s.section);
    if (items.length === 0) continue;
    out.push(`## ${s.title[i.lang]}`, "", ...items.map(link), "");
    if (s.section === "tools") {
      out.push(`### ${t("Benchmarks at a glance", "Benchmarks de un vistazo")}`, "", ...benchmarkSummary(i.benchmarks, i.lang), "");
    }
    if (s.section === "about") {
      out.push(`### ${t("How to cite", "Cómo citar")}`, "", ...citeBlock(i.lang), "");
      out.push(...aiDailySections(i));
    }
  }

  out.push(
    `## Optional`,
    "",
    `- [${t("Spanish index", "Índice en inglés")}](${absUrl(`/${other}/llms.txt`)}): ${other === "es" ? "Índice en español" : "Index in English"}`,
    `- [sitemap.xml](${absUrl("/sitemap.xml")}): ${t("all public URLs with real last-modified dates and hreflang alternates", "todas las URLs públicas con fechas reales de modificación y alternativas hreflang")}`,
    `- [${t("AI Daily RSS feed", "Feed RSS de IA al Día")}](${absUrl(`/${i.lang}/blog/feed.xml`)}): ${t("latest AI Daily stories", "últimas notas de IA al Día")}`,
    `- [robots.txt](${absUrl("/robots.txt")}): ${t("crawler rules, including AI crawlers", "reglas para rastreadores, incluidos los de IA")}`,
    "",
  );

  return out.join("\n").trimEnd() + "\n";
}

// ---------------------------------------------------------------------------
// llms-full.txt
// ---------------------------------------------------------------------------

/** Push every markdown heading down one level (outside code fences) so a document can sit under a section. */
export function demote(md: string, by = 1): string {
  let inFence = false;
  let fenceTicks = "";
  return md
    .split("\n")
    .map((line) => {
      const f = /^(`{3,})/.exec(line);
      if (f) {
        if (!inFence) {
          inFence = true;
          fenceTicks = f[1];
        } else if (line.startsWith(fenceTicks)) {
          inFence = false;
        }
        return line;
      }
      if (inFence) return line;
      const m = /^(#{1,6})\s/.exec(line);
      return m ? `${"#".repeat(Math.min(6, m[1].length + by))}${line.slice(m[1].length)}` : line;
    })
    .join("\n");
}

function sectionTitle(title: string): string {
  return `\n---\n\n# ${title}\n`;
}

/** /llms-full.txt — the content itself, in one file. */
export function buildLlmsFullTxt(i: LlmsInput): string {
  const t = tr(i.lang);
  const lang = i.lang;
  const out: string[] = [];

  out.push("# Promptea — full text", "", `> ${summaryText(lang)}`, "");
  out.push(...keyFacts(lang).map((f) => `- ${f}`), "");
  out.push(
    t(
      `Generated from the live content of ${absUrl("/en")}. Index with links: ${absUrl("/llms.txt")}. Spanish: ${absUrl("/es/llms-full.txt")}.`,
      `Generado a partir del contenido vigente de ${absUrl("/es")}. Índice con enlaces: ${absUrl("/es/llms.txt")}. Inglés: ${absUrl("/en/llms-full.txt")}.`,
    ),
    "",
  );

  // Product + method
  out.push(sectionTitle(t("About Promptea and how it works", "Acerca de Promptea y cómo funciona")));
  const docs: Array<[string, ReturnType<typeof aboutDoc>]> = [
    [`/${lang}`, homeAboutDoc(lang)],
    [`/${lang}/how-it-works`, howItWorksDoc(lang)],
    [`/${lang}/about`, aboutDoc(lang)],
    [`/${lang}/methodology`, methodologyDoc(lang)],
  ];
  for (const [path, doc] of docs) out.push(demote(docMarkdown(doc, lang, absUrl(path), { title: path === `/${lang}` ? "Promptea" : doc.h1 })));

  // Benchmarks
  out.push(sectionTitle(t("Benchmarks", "Benchmarks")));
  out.push(demote(benchmarksMarkdown(i.benchmarks, lang, absUrl(`/${lang}/benchmarks`), CONTENT_UPDATED.benchmarks)));

  // AI Daily goes between Benchmarks and Models, but it is the only part that grows
  // with time, so it is inserted last and only while it fits the budget (below).
  const aiDailyAt = out.length;

  // Models, glossary, guides, landings. Compact: prompts without the prefilled
  // links (each repeats its whole prompt URL-encoded) and, for guides, template
  // titles only; the per-page .md twin carries the full prompts.
  out.push(sectionTitle(t("Prompts by model", "Prompts por modelo")));
  for (const m of modelPages) out.push(demote(modelMarkdown(m, lang, absUrl(`/${lang}/models/${m.slug}`), modelPageUpdated(m.slug), "prompts")), "---", "");

  out.push(sectionTitle(t("Glossary", "Glosario")));
  for (const g of glossary) out.push(demote(glossaryMarkdown(g, lang, absUrl(`/${lang}/glossary/${g.slug}`), g.updated ?? CONTENT_UPDATED.glossary, "prompts")), "---", "");

  out.push(sectionTitle(t("Prompting guides", "Guías de prompting")));
  for (const g of guides) out.push(demote(guideMarkdown(g, lang, absUrl(`/${lang}/guides/${g.slug}`), g.updated ?? CONTENT_UPDATED.guides, "titles")), "---", "");

  out.push(sectionTitle(t("Landing pages", "Páginas de producto")));
  for (const p of landings) out.push(demote(landingMarkdown(p, lang, absUrl(`/${lang}/landing/${p.slug}`), CONTENT_UPDATED.landings)), "---", "");

  out.push(`\n# ${t("How to cite", "Cómo citar")}\n`, ...citeBlock(lang), "");

  // AI Daily: newest first, at most LLMS_FULL_MAX_ARTICLES, and only while they stay
  // inside LLMS_FULL_ARTICLES_BYTES. The rest is linked from llms.txt.
  const recent = [...i.articles].sort((x, y) => (articleUpdated(y) > articleUpdated(x) ? 1 : -1)).slice(0, LLMS_FULL_MAX_ARTICLES);
  if (recent.length > 0) {
    const heading = sectionTitle(t("AI Daily — latest stories", "IA al Día — últimas notas"));
    // Whatever the explanatory part left under the total ceiling, capped by the AI Daily budget.
    const staticBytes = Buffer.byteLength(out.join("\n"));
    const budget = Math.min(LLMS_FULL_ARTICLES_BYTES, LLMS_FULL_TOTAL_BYTES - staticBytes - 1024);
    let used = Buffer.byteLength(heading);
    const stories: string[] = [];
    for (const a of recent) {
      const u = articleUrl(a);
      const chunk = `${demote(articleMarkdown(a, absUrl(u.path), u.updated))}\n---\n`;
      used += Buffer.byteLength(chunk);
      if (used > budget) break;
      stories.push(chunk);
    }
    if (stories.length > 0) out.splice(aiDailyAt, 0, heading, ...stories);
  }

  return out.join("\n").replace(/\n{4,}/g, "\n\n\n").trimEnd() + "\n";
}
