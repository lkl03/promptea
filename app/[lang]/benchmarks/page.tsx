// app/[lang]/benchmarks/page.tsx
//
// v1.7.0 — AI model benchmarks: leaders by category, frontier models, an
// explorable ranking table, and what each benchmark measures.
//
// Data: OpenRouter's unified benchmarks API, fetched on the server
// (lib/benchmarks). The page states its source, date and metric everywhere,
// keeps non-comparable metrics apart, and degrades honestly: live data →
// last valid snapshot (with its age) → an empty state. Nothing is invented.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { hasLocale } from "../dictionaries";
import BenchmarkDashboard, { type DashboardCopy } from "@/components/benchmarks/BenchmarkDashboard";
import FrontierMatrix from "@/components/benchmarks/FrontierMatrix";
import { getBenchmarks } from "@/lib/benchmarks/server";
import { frontierModels, FRONTIER_TOP_N } from "@/lib/benchmarks/normalize";
import { snapshotAgeHours, type FetchFailure } from "@/lib/benchmarks/load";
import { CATEGORY_LABELS, SOURCE_INFO } from "@/lib/benchmarks/catalog";
import { frontierMatrix } from "@/lib/benchmarks/chart";
import JsonLd from "@/components/seo/JsonLd";
import { benchmarksGraph } from "@/lib/seo/pageGraphs";
import { pageMetadata } from "@/lib/seo/metadata";
import { markdownPathOf } from "@/lib/seo/registry";

export const revalidate = 3600;

/** Rows in the frontier matrix: enough to read at a glance, short enough to scan. */
const MATRIX_MAX_MODELS = 12;

const COPY = {
  es: {
    metaTitle: "Benchmarks de modelos de IA",
    metaDescription: "Rankings de modelos de IA por categoría —inteligencia general, programación, agentes, ciencia, búsqueda y diseño— con fuente, fecha y métrica de cada benchmark.",
    title: "Benchmarks de modelos de IA",
    intro: "Quién lidera cada benchmark hoy, qué modelos están en la frontera y qué mide cada prueba. Cada ranking usa su propia métrica: no hay un puntaje universal.",
    live: "Datos en vivo de OpenRouter",
    asOf: "actualizados el {date}",
    fetched: "consultados el {date}",
    staleTitle: "Mostrando el último snapshot válido",
    staleBody: "No pudimos actualizar los datos ({reason}). Estos rankings son de hace {age}.",
    hours: "{n} h",
    lessThanHour: "menos de una hora",
    emptyTitle: "Los rankings no están disponibles ahora",
    reasons: {
      not_configured: "la conexión con la fuente de datos todavía no está configurada",
      unauthorized: "la fuente rechazó la credencial",
      rate_limited: "la fuente limitó temporalmente las consultas",
      timeout: "la fuente tardó demasiado en responder",
      upstream_error: "la fuente respondió con un error",
      invalid_response: "la fuente devolvió datos con un formato inesperado",
      empty: "la fuente no devolvió resultados",
    } as Record<FetchFailure, string>,
    emptyBody: "Motivo: {reason}. Preferimos no mostrar nada antes que mostrar rankings inventados o desactualizados sin aviso.",
    nav: { label: "En esta página", ranking: "Ranking", value: "Costo vs. rendimiento", frontier: "Modelos de frontera", calculator: "Calculadora de costo", about: "Qué mide cada uno" },
    dash: {
      rankingTitle: "Ranking por benchmark",
      rankingIntro: "Elegí una categoría y un benchmark: el gráfico muestra los mejores modelos de esa prueba. Cada benchmark tiene su propia métrica: compará solo dentro del mismo.",
      category: "Categoría",
      benchmarks: "Benchmarks de la categoría y su líder",
      leader: "Líder",
      topN: "Cantidad de modelos en el gráfico",
      topLabel: "Top {n}",
      fullTable: "Ver la tabla completa ({n} modelos)",
      valueTitle: "Costo vs. rendimiento",
      valueIntro: "Cada punto es un modelo: más arriba, mejor puntaje; más a la izquierda, más barato (precio de entrada, escala logarítmica). La línea punteada une los modelos que ningún otro supera a la vez en precio y puntaje.",
      valueFor: "Benchmark: {benchmark}",
      sourceLine: "{source} · {date}",
      bars: {
        title: "Top {n} · {benchmark}",
        desc: "Gráfico de barras horizontales: los {n} mejores modelos de {benchmark} ({metric}). {items}.",
        axisNote: "El eje empieza en {min}: el Elo no tiene un cero con sentido, así que las barras no son proporcionales al valor total.",
        errorNote: "La línea fina sobre la barra es ± el desvío estándar entre corridas.",
        showingOf: "mostrando {n} de {total} modelos"
      },
      scatter: {
        title: "Puntaje vs. precio de entrada",
        xAxis: "Precio de entrada (US$ por millón de tokens, escala log)",
        yAxis: "Puntaje",
        efficientLegend: "Frontera costo/rendimiento",
        keys: "Con el teclado: enfocá el gráfico y usá las flechas ← → para recorrer los modelos del más barato al más caro.",
        excluded: "{n} modelos sin precio disponible no se grafican.",
        empty: "No hay suficientes precios para graficar este benchmark. La tabla completa sigue disponible arriba.",
        desc: "Gráfico de dispersión: {n} modelos de {benchmark}, precio de entrada contra puntaje. {m} modelos forman la frontera costo/rendimiento: {frontier}.",
        score: "Puntaje",
        inputPrice: "Entrada",
        outputPrice: "Salida",
        rank: "Puesto",
        efficientBadge: "Nadie lo supera en precio y puntaje a la vez",
        perMillion: "por millón de tokens"
      },
      table: {
        search: "Buscar",
        searchPlaceholder: "Modelo o proveedor…",
        provider: "Proveedor",
        allProviders: "Todos",
        sort: "Orden",
        sortScore: "Mejor puntaje primero",
        sortScoreAsc: "Menor puntaje primero",
        sortPrice: "Precio más bajo primero",
        sortName: "Nombre (A–Z)",
        colRank: "#",
        colModel: "Modelo",
        colProvider: "Proveedor",
        colScore: "Puntaje",
        colSource: "Benchmark / fuente",
        colPrice: "Precio entrada / salida",
        priceHint: "Precio en US$ por millón de tokens de entrada / salida, según la fuente. “—” = sin dato.",
        noMatch: "Ningún modelo coincide con la búsqueda.",
        results: "{n} modelos",
        guide: "Guía de prompts",
        stddev: "Desvío estándar entre corridas"
      },
      calc: {
        title: "Calculadora de costo",
        intro: "Estimá cuánto costaría tu uso con cada modelo del benchmark elegido arriba, a precio de lista. “Mejor relación” ordena por dólares por punto de puntaje: cuanto menos, más rinde cada dólar.",
        inputTokens: "Tokens de entrada por solicitud",
        outputTokens: "Tokens de salida por solicitud",
        requests: "Cantidad de solicitudes",
        presets: "Ejemplos",
        presetChat: "Chat corto",
        presetDoc: "Documento largo",
        presetAgent: "Agente",
        sortLabel: "Ordenar por",
        sortValue: "Mejor relación",
        sortCost: "Menor costo",
        sortScore: "Mejor puntaje",
        colModel: "Modelo",
        colScore: "Puntaje",
        colCost: "Costo por solicitud",
        colPerPoint: "US$ por punto",
        colTotal: "Total ({n} solicitudes)",
        summary: "{tokensIn} de entrada y {tokensOut} de salida por solicitud, {n} solicitudes · {benchmark}",
        excluded: "{n} modelos sin precio de entrada y de salida no se incluyen: no los contamos como gratis.",
        empty: "Ningún modelo de este benchmark tiene precios disponibles para calcular el costo.",
        estimate: "Estimación con precios de lista por millón de tokens (sin cachés, lotes ni descuentos); el costo real puede variar. Los puntajes son del benchmark elegido y no son comparables con otros.",
        showAll: "Ver los {n} modelos",
        showLess: "Ver menos",
        bestAiTitle: "¿No sabés cuál elegir para tu tarea? Un benchmark no conoce tu caso.",
        bestAiCta: "Elegir la mejor IA",
        guide: "Guía"
      },
    },
    matrix: {"caption":"Posición de cada modelo de frontera en cada benchmark de capacidad general","model":"Modelo","rankIn":"Posición en {benchmark}","notMeasured":"sin medición","guide":"Guía"},
    aboutSummary: "Qué mide cada benchmark ({n})",
    frontierTitle: "Modelos de frontera",
    frontierDef: `En Promptea, un modelo es “de frontera” si está entre los ${FRONTIER_TOP_N} primeros de al menos un benchmark de capacidad general del snapshot vigente: los índices Intelligence, Coding o Agentic de Artificial Analysis, o las corridas de GPQA Diamond y τ-bench de OpenRouter.`,
    frontierWhy: "Usamos estos porque miden capacidad amplia —razonamiento, programación y trabajo agéntico—. Los rankings especializados (configuraciones de búsqueda, arenas de diseño) se muestran, pero una victoria puntual ahí no alcanza para llamar a un modelo “de frontera”. La lista cambia cuando cambian los datos.",
    frontierWhyLabel: "¿Por qué estos benchmarks?",
    matrixMore: "Mostrando {n} de {total} modelos de frontera.",
    context: "Qué mide cada benchmark",
    measures: "Qué mide",
    limits: "Limitaciones",
    source: "Fuente",
    bestAiTitle: "¿Cuál conviene para tu tarea?",
    bestAiBody: "Un benchmark no conoce tu caso. Describí lo que querés hacer y te recomendamos IA y modelo con el porqué.",
    bestAiCta: "Elegir la mejor IA",
  },
  en: {
    metaTitle: "AI model benchmarks",
    metaDescription: "AI model rankings by category — general intelligence, coding, agents, science, search and design — with the source, date and metric of every benchmark.",
    title: "AI model benchmarks",
    intro: "Who leads each benchmark today, which models are at the frontier, and what each test measures. Every ranking uses its own metric: there is no universal score.",
    live: "Live data from OpenRouter",
    asOf: "updated {date}",
    fetched: "fetched {date}",
    staleTitle: "Showing the last valid snapshot",
    staleBody: "We couldn't refresh the data ({reason}). These rankings are {age} old.",
    hours: "{n} h",
    lessThanHour: "less than an hour",
    emptyTitle: "Rankings are not available right now",
    reasons: {
      not_configured: "the data source connection is not configured yet",
      unauthorized: "the source rejected the credential",
      rate_limited: "the source is temporarily rate-limiting requests",
      timeout: "the source took too long to answer",
      upstream_error: "the source answered with an error",
      invalid_response: "the source returned data in an unexpected format",
      empty: "the source returned no results",
    } as Record<FetchFailure, string>,
    emptyBody: "Reason: {reason}. We'd rather show nothing than show invented or silently outdated rankings.",
    nav: { label: "On this page", ranking: "Ranking", value: "Cost vs. performance", frontier: "Frontier models", calculator: "Cost calculator", about: "What each one measures" },
    dash: {
      rankingTitle: "Ranking by benchmark",
      rankingIntro: "Pick a category and a benchmark: the chart shows the top models of that test. Every benchmark has its own metric: compare only within the same one.",
      category: "Category",
      benchmarks: "Benchmarks in this category and their leader",
      leader: "Leader",
      topN: "Number of models in the chart",
      topLabel: "Top {n}",
      fullTable: "View the full table ({n} models)",
      valueTitle: "Cost vs. performance",
      valueIntro: "Each dot is a model: higher is a better score, further left is cheaper (input price, log scale). The dashed line joins the models no other model beats on price and score at once.",
      valueFor: "Benchmark: {benchmark}",
      sourceLine: "{source} · {date}",
      bars: {
        title: "Top {n} · {benchmark}",
        desc: "Horizontal bar chart: the top {n} models of {benchmark} ({metric}). {items}.",
        axisNote: "The axis starts at {min}: Elo has no meaningful zero, so bar lengths are not proportional to the full value.",
        errorNote: "The thin line over a bar is ± the standard deviation across runs.",
        showingOf: "showing {n} of {total} models"
      },
      scatter: {
        title: "Score vs. input price",
        xAxis: "Input price (US$ per million tokens, log scale)",
        yAxis: "Score",
        efficientLegend: "Cost/performance frontier",
        keys: "With the keyboard: focus the chart and use the ← → arrow keys to step through models from cheapest to priciest.",
        excluded: "{n} models without a price are not plotted.",
        empty: "There are not enough prices to plot this benchmark. The full table above is still available.",
        desc: "Scatter plot: {n} models of {benchmark}, input price against score. {m} models form the cost/performance frontier: {frontier}.",
        score: "Score",
        inputPrice: "Input",
        outputPrice: "Output",
        rank: "Rank",
        efficientBadge: "No model beats it on price and score at once",
        perMillion: "per million tokens"
      },
      table: {
        search: "Search",
        searchPlaceholder: "Model or provider…",
        provider: "Provider",
        allProviders: "All",
        sort: "Sort",
        sortScore: "Best score first",
        sortScoreAsc: "Lowest score first",
        sortPrice: "Lowest price first",
        sortName: "Name (A–Z)",
        colRank: "#",
        colModel: "Model",
        colProvider: "Provider",
        colScore: "Score",
        colSource: "Benchmark / source",
        colPrice: "Input / output price",
        priceHint: "Price in US$ per million input / output tokens, as reported by the source. “—” = no data.",
        noMatch: "No model matches your search.",
        results: "{n} models",
        guide: "Prompt guide",
        stddev: "Standard deviation across runs"
      },
      calc: {
        title: "Cost calculator",
        intro: "Estimate what your usage would cost on each model of the benchmark selected above, at list price. “Best value” sorts by dollars per score point: the lower, the further each dollar goes.",
        inputTokens: "Input tokens per request",
        outputTokens: "Output tokens per request",
        requests: "Number of requests",
        presets: "Examples",
        presetChat: "Short chat",
        presetDoc: "Long document",
        presetAgent: "Agent",
        sortLabel: "Sort by",
        sortValue: "Best value",
        sortCost: "Lowest cost",
        sortScore: "Best score",
        colModel: "Model",
        colScore: "Score",
        colCost: "Cost per request",
        colPerPoint: "US$ per point",
        colTotal: "Total ({n} requests)",
        summary: "{tokensIn} in and {tokensOut} out per request, {n} requests · {benchmark}",
        excluded: "{n} models without both an input and an output price are left out: we do not count them as free.",
        empty: "No model in this benchmark has the prices needed to compute a cost.",
        estimate: "Estimate at list prices per million tokens (no caching, batching or discounts); real cost may differ. Scores come from the selected benchmark and are not comparable with others.",
        showAll: "Show all {n} models",
        showLess: "Show less",
        bestAiTitle: "Not sure which one fits your task? A benchmark doesn't know your use case.",
        bestAiCta: "Find the best AI",
        guide: "Guide"
      },
    },
    matrix: {"caption":"Each frontier model's rank in every general-capability benchmark","model":"Model","rankIn":"Rank in {benchmark}","notMeasured":"not measured","guide":"Guide"},
    aboutSummary: "What each benchmark measures ({n})",
    frontierTitle: "Frontier models",
    frontierDef: `At Promptea, a model is “frontier” when it ranks in the top ${FRONTIER_TOP_N} of at least one general-capability benchmark in the current snapshot: Artificial Analysis' Intelligence, Coding or Agentic index, or OpenRouter's GPQA Diamond and τ-bench runs.`,
    frontierWhy: "We use these because they measure broad capability — reasoning, coding and agentic work. Specialized rankings (search configurations, design arenas) are shown, but a narrow win there is not enough to call a model “frontier”. The list changes when the data does.",
    frontierWhyLabel: "Why these benchmarks?",
    matrixMore: "Showing {n} of {total} frontier models.",
    context: "What each benchmark measures",
    measures: "Measures",
    limits: "Limitations",
    source: "Source",
    bestAiTitle: "Which one fits your task?",
    bestAiBody: "A benchmark doesn't know your use case. Describe what you want to do and we'll recommend an AI and model, with the reasoning.",
    bestAiCta: "Find the best AI",
  },
};

function fmtDate(iso: string | null, lang: "es" | "en"): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat(lang === "es" ? "es-AR" : "en-US", { dateStyle: "long", timeZone: "America/Argentina/Buenos_Aires" }).format(d);
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const l = lang === "en" ? "en" : "es";
  const c = COPY[l];
  const path = `/${l}/benchmarks`;
  return pageMetadata({ lang: l, path, title: c.metaTitle, description: c.metaDescription, markdownPath: markdownPathOf(path) });
}

export default async function BenchmarksPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const l = lang as "es" | "en";
  const c = COPY[l];

  const result = await getBenchmarks();
  const snapshot = result.status === "unavailable" ? null : result.snapshot;
  const frontier = snapshot ? frontierModels(snapshot) : [];
  const matrix = snapshot ? frontierMatrix(snapshot.tables, frontier.slice(0, MATRIX_MAX_MODELS).map((m) => m.modelId)) : null;
  const now = new Date();
  const dateLabel = snapshot ? (fmtDate(snapshot.asOf, l) ?? fmtDate(snapshot.fetchedAt, l)) : null;
  // Dataset JSON-LD only when a snapshot is on the page: it describes the data shown, nothing else.
  const jsonLd = benchmarksGraph({ lang: l, title: c.title, description: c.intro, snapshot });

  const navItems = [
    { id: "ranking", label: c.nav.ranking },
    { id: "value", label: c.nav.value },
    { id: "calculator", label: c.nav.calculator },
    { id: "frontier", label: c.nav.frontier },
    { id: "about", label: c.nav.about },
  ];

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6 sm:pt-8">
      <JsonLd data={jsonLd} />
      <header className="max-w-3xl">
        <h1 className="font-title text-3xl font-semibold leading-tight sm:text-4xl">{c.title}</h1>
        <p className="mt-3 text-base leading-relaxed text-ink-muted sm:text-lg">{c.intro}</p>

        {result.status === "live" ? (
          <p className="mt-4 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
            <span className="badge badge-success">{c.live}</span>
            <span>
              {fmtDate(result.snapshot.asOf, l)
                ? c.asOf.replace("{date}", fmtDate(result.snapshot.asOf, l)!)
                : c.fetched.replace("{date}", fmtDate(result.snapshot.fetchedAt, l) ?? "")}
            </span>
          </p>
        ) : null}
      </header>

      {result.status === "stale" ? (
        <div role="status" className="surface-soft mt-6 max-w-3xl border-l-4 p-4" style={{ borderLeftColor: "var(--warning)" }}>
          <p className="text-sm font-medium text-ink">{c.staleTitle}</p>
          <p className="mt-1 text-sm text-ink-muted">
            {c.staleBody
              .replace("{reason}", c.reasons[result.reason])
              .replace("{age}", snapshotAgeHours(result.snapshot, now) < 1 ? c.lessThanHour : c.hours.replace("{n}", String(snapshotAgeHours(result.snapshot, now))))}
          </p>
        </div>
      ) : null}

      {!snapshot ? (
        <section className="surface mt-10 max-w-3xl p-8">
          <h2 className="font-title text-xl font-semibold">{c.emptyTitle}</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">{c.emptyBody.replace("{reason}", c.reasons[result.status === "unavailable" ? result.reason : "empty"])}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href={`/${l}/best-ai`} className="btn btn-primary h-9 px-4">
              {c.bestAiCta}
            </Link>
            <Link href={`/${l}/models`} className="btn btn-ghost h-9 px-4">
              {l === "es" ? "Guías por modelo" : "Model guides"}
            </Link>
          </div>
        </section>
      ) : (
        <>
          {/* Sticky in-page navigation: one screen of context instead of a long scroll */}
          <nav
            aria-label={c.nav.label}
            className="bm-subnav sticky top-2 z-30 mt-6 -mx-1 overflow-x-auto rounded-xl border border-line bg-[var(--overlay-fill)] px-2 py-1.5 shadow-sm"
          >
            <ul className="m-0 flex min-w-max list-none items-center gap-1 p-0 text-sm">
              {navItems.map((n) => (
                <li key={n.id}>
                  <a href={`#${n.id}`} className="block rounded-lg px-3 py-1.5 text-ink-muted transition-colors hover:bg-surface-soft hover:text-ink">
                    {n.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="mt-10">
            <BenchmarkDashboard tables={snapshot.tables} lang={l} copy={c.dash as DashboardCopy} dateLabel={dateLabel} />
          </div>

          <section id="frontier" aria-labelledby="bm-frontier" className="mt-16 scroll-mt-24">
            <h2 id="bm-frontier" className="font-title text-2xl font-semibold">{c.frontierTitle}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink">{c.frontierDef}</p>
            <details className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-muted">
              <summary className="cursor-pointer text-ink">{c.frontierWhyLabel}</summary>
              <p className="mt-2">{c.frontierWhy}</p>
            </details>
            {matrix && matrix.rows.length > 0 ? (
              <div className="mt-5">
                <FrontierMatrix matrix={matrix} lang={l} copy={c.matrix} />
                {frontier.length > matrix.rows.length ? (
                  <p className="mt-2 text-[11px] text-ink-muted">{c.matrixMore.replace("{n}", String(matrix.rows.length)).replace("{total}", String(frontier.length))}</p>
                ) : null}
              </div>
            ) : null}
          </section>

          <section id="about" aria-labelledby="bm-context" className="mt-16 scroll-mt-24">
            <h2 id="bm-context" className="font-title text-2xl font-semibold">{c.context}</h2>
            <details className="surface-soft mt-4 p-4">
              <summary className="cursor-pointer text-sm font-medium text-ink">{c.aboutSummary.replace("{n}", String(snapshot.tables.length))}</summary>
              <dl className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                {snapshot.tables.map((t) => (
                  <div key={t.def.key} className="rounded-xl border border-line p-5">
                    <dt className="font-title text-base font-semibold text-ink">
                      {t.def.label[l]} <span className="text-xs font-normal text-ink-muted">· {CATEGORY_LABELS[t.def.category][l]}</span>
                    </dt>
                    <dd className="mt-2 space-y-2 text-sm leading-relaxed text-ink-muted">
                      <p>
                        <span className="font-medium text-ink">{c.measures}: </span>
                        {t.def.measures[l]}
                      </p>
                      <p>
                        <span className="font-medium text-ink">{c.limits}: </span>
                        {t.def.limitations[l]}
                      </p>
                      <p className="text-xs">
                        {c.source}:{" "}
                        <a href={SOURCE_INFO[t.def.source].url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-ink">
                          {SOURCE_INFO[t.def.source].name}
                        </a>{" "}
                        · {t.def.metricLabel[l]}
                      </p>
                    </dd>
                  </div>
                ))}
              </dl>
            </details>
          </section>
        </>
      )}

      <section className="surface mt-16 flex flex-col items-start gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-title text-lg font-semibold">{c.bestAiTitle}</h2>
          <p className="mt-1 max-w-xl text-sm text-ink-muted">{c.bestAiBody}</p>
        </div>
        <Link href={`/${l}/best-ai`} className="btn btn-primary h-10 shrink-0 px-5">
          {c.bestAiCta} →
        </Link>
      </section>
    </main>
  );
}
