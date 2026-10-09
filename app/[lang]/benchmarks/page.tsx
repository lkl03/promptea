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
import BenchmarkExplorer from "@/components/benchmarks/BenchmarkExplorer";
import { getBenchmarks } from "@/lib/benchmarks/server";
import { frontierModels, formatScore, FRONTIER_TOP_N, type BenchmarksSnapshot } from "@/lib/benchmarks/normalize";
import { snapshotAgeHours, type FetchFailure } from "@/lib/benchmarks/load";
import { CATEGORY_LABELS, CATEGORY_ORDER, PROVIDER_TO_PROMPTEA, SOURCE_INFO } from "@/lib/benchmarks/catalog";

export const revalidate = 3600;

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
    leaders: "Líderes por categoría",
    leadersIntro: "El primer puesto de cada benchmark con datos. Comparalos solo dentro del mismo benchmark.",
    frontierTitle: "Modelos de frontera",
    frontierDef: `En Promptea, un modelo es “de frontera” si está entre los ${FRONTIER_TOP_N} primeros de al menos un benchmark de capacidad general del snapshot vigente: los índices Intelligence, Coding o Agentic de Artificial Analysis, o las corridas de GPQA Diamond y τ-bench de OpenRouter.`,
    frontierWhy: "Usamos estos porque miden capacidad amplia —razonamiento, programación y trabajo agéntico—. Los rankings especializados (configuraciones de búsqueda, arenas de diseño) se muestran, pero una victoria puntual ahí no alcanza para llamar a un modelo “de frontera”. La lista cambia cuando cambian los datos.",
    frontierRank: "#{rank} en {benchmark}",
    explore: "Explorar rankings",
    context: "Qué mide cada benchmark",
    measures: "Qué mide",
    limits: "Limitaciones",
    source: "Fuente",
    bestAiTitle: "¿Cuál conviene para tu tarea?",
    bestAiBody: "Un benchmark no conoce tu caso. Describí lo que querés hacer y te recomendamos IA y modelo con el porqué.",
    bestAiCta: "Elegir la mejor IA",
    explorer: {
      benchmark: "Benchmark",
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
      stddev: "Desvío estándar entre corridas",
    },
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
    leaders: "Leaders by category",
    leadersIntro: "The top spot of every benchmark with data. Compare them only within the same benchmark.",
    frontierTitle: "Frontier models",
    frontierDef: `At Promptea, a model is “frontier” when it ranks in the top ${FRONTIER_TOP_N} of at least one general-capability benchmark in the current snapshot: Artificial Analysis' Intelligence, Coding or Agentic index, or OpenRouter's GPQA Diamond and τ-bench runs.`,
    frontierWhy: "We use these because they measure broad capability — reasoning, coding and agentic work. Specialized rankings (search configurations, design arenas) are shown, but a narrow win there is not enough to call a model “frontier”. The list changes when the data does.",
    frontierRank: "#{rank} in {benchmark}",
    explore: "Explore the rankings",
    context: "What each benchmark measures",
    measures: "Measures",
    limits: "Limitations",
    source: "Source",
    bestAiTitle: "Which one fits your task?",
    bestAiBody: "A benchmark doesn't know your use case. Describe what you want to do and we'll recommend an AI and model, with the reasoning.",
    bestAiCta: "Find the best AI",
    explorer: {
      benchmark: "Benchmark",
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
      stddev: "Standard deviation across runs",
    },
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
  const canonical = `/${l}/benchmarks`;
  return {
    title: c.metaTitle,
    description: c.metaDescription,
    alternates: { canonical, languages: { es: "/es/benchmarks", en: "/en/benchmarks" } },
    openGraph: { title: `${c.metaTitle} · Promptea`, description: c.metaDescription, url: canonical, type: "website", locale: l === "en" ? "en_US" : "es_AR" },
    twitter: { card: "summary_large_image", title: `${c.metaTitle} · Promptea`, description: c.metaDescription },
  };
}

function Leaders({ snapshot, lang }: { snapshot: BenchmarksSnapshot; lang: "es" | "en" }) {
  // One grid, ordered by category; each card names its category so a leader
  // is never read outside its own benchmark.
  const tables = CATEGORY_ORDER.flatMap((cat) => snapshot.tables.filter((t) => t.def.category === cat));
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {tables.map((t) => {
        const top = t.rows[0];
        return (
          <li key={t.def.key} className="surface-soft flex flex-col gap-1 p-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink-muted">{CATEGORY_LABELS[t.def.category][lang]}</p>
            <p className="text-xs text-ink-muted">{t.def.label[lang]}</p>
            <p className="mt-1 font-title text-base font-semibold leading-snug text-ink">{top.name}</p>
            <p className="text-xs text-ink-muted">{top.providerLabel}</p>
            <p className="mt-2 flex items-baseline justify-between gap-2">
              <span className="text-lg font-semibold tabular-nums text-accent">{formatScore(top.value, t.def.metric, lang)}</span>
              <a href={SOURCE_INFO[t.def.source].url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-ink-muted underline-offset-2 hover:text-ink hover:underline">
                {SOURCE_INFO[t.def.source].name}
              </a>
            </p>
            <p className="text-[11px] text-ink-muted">{t.def.metricLabel[lang]}</p>
          </li>
        );
      })}
    </ul>
  );
}

export default async function BenchmarksPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const l = lang as "es" | "en";
  const c = COPY[l];

  const result = await getBenchmarks();
  const snapshot = result.status === "unavailable" ? null : result.snapshot;
  const frontier = snapshot ? frontierModels(snapshot) : [];
  const now = new Date();

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6 sm:pt-8">
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
          <section aria-labelledby="bm-leaders" className="mt-12">
            <h2 id="bm-leaders" className="font-title text-2xl font-semibold">{c.leaders}</h2>
            <p className="mt-1 text-sm text-ink-muted">{c.leadersIntro}</p>
            <div className="mt-6">
              <Leaders snapshot={snapshot} lang={l} />
            </div>
          </section>

          <section aria-labelledby="bm-frontier" className="mt-14">
            <h2 id="bm-frontier" className="font-title text-2xl font-semibold">{c.frontierTitle}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink">{c.frontierDef}</p>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-muted">{c.frontierWhy}</p>
            {frontier.length > 0 ? (
              <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {frontier.map((m) => {
                  const promptea = PROVIDER_TO_PROMPTEA[m.provider];
                  return (
                    <li key={m.modelId} className="surface-soft p-4">
                      <p className="font-medium text-ink">{m.name}</p>
                      <p className="text-xs text-ink-muted">{m.providerLabel}</p>
                      <ul className="mt-2 flex flex-wrap gap-1.5">
                        {m.qualifiers.map((q) => (
                          <li key={q.key} className="badge badge-neutral">
                            {c.frontierRank.replace("{rank}", String(q.rank)).replace("{benchmark}", q.label[l])}
                          </li>
                        ))}
                      </ul>
                      {promptea ? (
                        <p className="mt-3 flex flex-wrap gap-x-3 text-xs">
                          <Link href={`/${l}/models/${promptea.modelPage}`} className="text-accent hover:underline">
                            {c.explorer.guide}
                          </Link>
                          <Link href={`/${l}/best-ai`} className="text-accent hover:underline">
                            {c.bestAiCta}
                          </Link>
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </section>

          <section aria-labelledby="bm-explore" className="mt-14">
            <h2 id="bm-explore" className="font-title text-2xl font-semibold">{c.explore}</h2>
            <div className="mt-5">
              <BenchmarkExplorer tables={snapshot.tables} lang={l} copy={c.explorer} />
            </div>
          </section>

          <section aria-labelledby="bm-context" className="mt-14">
            <h2 id="bm-context" className="font-title text-2xl font-semibold">{c.context}</h2>
            <dl className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
              {snapshot.tables.map((t) => (
                <div key={t.def.key} className="surface-soft p-5">
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
          </section>
        </>
      )}

      <section className="surface mt-14 flex flex-col items-start gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
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
