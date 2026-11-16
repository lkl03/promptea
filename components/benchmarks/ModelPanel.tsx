"use client";

// components/benchmarks/ModelPanel.tsx
//
// v1.8.7 — the analysis of one model, inside <BenchDialog>: who makes it, its
// price, whether it is "frontier" and why, its position in EVERY benchmark it
// appears in (a chart + the equivalent table), where it stands out, what those
// benchmarks measure and their limits, and the next steps (Promptea's guide for
// the family, "Find the best AI", compare, copy a link).
//
// The chart shows positions, not scores: each bar is the share of the measured
// models this one ranks at or above, inside ONE benchmark; the score next to it
// is in that benchmark's own metric. Metrics are never mixed (lib/benchmarks/model.ts).

import { useState } from "react";
import Link from "next/link";
import type { ModelProfile, ModelScore } from "@/lib/benchmarks/model";
import { buildBenchHash, MAX_COMPARE } from "@/lib/benchmarks/model";
import { CATEGORY_LABELS, SOURCE_INFO } from "@/lib/benchmarks/catalog";
import { formatPrice, formatScore } from "@/lib/benchmarks/normalize";
import { providerColor } from "@/lib/benchmarks/chart";
import { INTL_LOCALE, PUNCT, type Lang } from "@/lib/domain";

export type ModelCopy = {
  open: string; // "Analysis of {name}" (accessible name of the buttons that open the panel)
  close: string;
  kicker: string; // "Model analysis"
  provider: string;
  price: string;
  priceUnit: string;
  noPrice: string;
  measuredIn: string; // "Measured in {n} benchmarks"
  frontierLabel: string; // "Frontier model"
  notFrontier: string;
  positionsTitle: string;
  positionsDesc: string; // "{name} … {n} … {items}"
  positionsNote: string;
  rankOf: string; // "#{rank} of {total}"
  beats: string; // "at or above {pct} of the models measured"
  viewTable: string;
  colBenchmark: string;
  colCategory: string;
  colScore: string;
  colRank: string;
  strengthsTitle: string;
  strengthsEmpty: string;
  topN: string; // "Top {n}"
  topShare: string; // "Top 10%"
  limitsTitle: string;
  measures: string;
  limitations: string;
  nextTitle: string;
  modelPage: string; // "Prompting guide for {family}"
  bestAi: string;
  compareAdd: string;
  compareRemove: string;
  compareFull: string; // "You already picked {max} models…"
  copyLink: string;
  copied: string;
  sources: string; // "Sources: {sources} · {date}"
  notFound: string;
};

export type BenchmarkTexts = Record<string, { measures: string; limitations: string }>;

const pct = (v: number, locale: string) => new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 }).format(v);

export function scoreText(s: ModelScore, lang: Lang): string {
  return formatScore(s.value, s.def.metric, lang);
}

export default function ModelPanel({
  model,
  lang,
  copy,
  texts,
  dateLabel,
  inCompare,
  compareCount,
  onToggleCompare,
  onClose,
  titleId,
}: {
  model: ModelProfile;
  lang: Lang;
  copy: ModelCopy;
  texts: BenchmarkTexts;
  dateLabel: string | null;
  inCompare: boolean;
  compareCount: number;
  onToggleCompare: () => void;
  onClose: () => void;
  titleId: string;
}) {
  const locale = INTL_LOCALE[lang];
  const [copied, setCopied] = useState(false);
  const n = model.scores.length;
  const items = model.scores.map((s) => `${s.def.label[lang]}: ${copy.rankOf.replace("{rank}", String(s.rank)).replace("{total}", String(s.total))}, ${scoreText(s, lang)}`).join("; ");
  const positionsDesc = copy.positionsDesc.replace("{name}", model.name).replace("{n}", String(n)).replace("{items}", items);
  const sources = [...new Set(model.scores.map((s) => SOURCE_INFO[s.def.source].name))].join(", ");
  const full = !inCompare && compareCount >= MAX_COMPARE;
  const familyLabel = model.promptea ? model.providerLabel : null;

  async function copyLink() {
    try {
      const url = `${window.location.origin}${window.location.pathname}${buildBenchHash({ m: model.modelId })}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked: the address bar already carries the link */
    }
  }

  return (
    <>
      <header className="flex items-start justify-between gap-3 border-b border-line px-4 py-3 sm:px-6 sm:py-4">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">{copy.kicker}</p>
          <h2 id={titleId} className="mt-0.5 flex items-center gap-2 font-title text-xl font-semibold leading-tight text-ink">
            <span aria-hidden="true" className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: providerColor(model.provider) }} />
            <span className="min-w-0 break-words">{model.name}</span>
          </h2>
          <p className="mt-0.5 text-sm text-ink-muted">
            {copy.provider}
            {PUNCT[lang].colon}
            {model.providerLabel} · <span className="font-mono text-xs">{model.modelId}</span>
          </p>
        </div>
        <button type="button" onClick={onClose} className="btn-icon h-9 w-9 shrink-0" aria-label={copy.close} title={copy.close} data-autofocus>
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
        {/* Summary */}
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
          <div className="surface-soft p-3">
            <dt className="text-xs text-ink-muted">{copy.price}</dt>
            <dd className="mt-1 text-sm font-semibold tabular-nums text-ink">
              {model.price ? `${formatPrice(model.price.inputPerM, lang)} / ${formatPrice(model.price.outputPerM, lang)}` : copy.noPrice}
              {model.price ? <span className="block text-[11px] font-normal text-ink-muted">{copy.priceUnit}</span> : null}
            </dd>
          </div>
          <div className="surface-soft p-3">
            <dt className="text-xs text-ink-muted">{copy.measuredIn.replace("{n}", String(n))}</dt>
            <dd className="mt-1 text-sm text-ink">{[...new Set(model.scores.map((s) => CATEGORY_LABELS[s.def.category][lang]))].join(" · ")}</dd>
          </div>
          <div className="surface-soft col-span-2 p-3 sm:col-span-1">
            <dt className="text-xs text-ink-muted">{model.frontier.length ? <span className="badge badge-success">{copy.frontierLabel}</span> : copy.frontierLabel}</dt>
            <dd className="mt-1 text-sm text-ink">
              {model.frontier.length
                ? model.frontier.map((f) => `${f.label[lang]} #${f.rank}`).join(" · ")
                : <span className="text-ink-muted">{copy.notFrontier}</span>}
            </dd>
          </div>
        </dl>

        {/* Positions chart + equivalent table */}
        <section aria-labelledby={`${titleId}-pos`} className="mt-6">
          <h3 id={`${titleId}-pos`} className="font-title text-base font-semibold text-ink">
            {copy.positionsTitle}
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-ink-muted">{copy.positionsNote}</p>
          <figure className="m-0 mt-3" role="img" aria-label={copy.positionsTitle} aria-describedby={`${titleId}-pos-desc`}>
            <p id={`${titleId}-pos-desc`} className="sr-only">
              {positionsDesc}
            </p>
            <ol aria-hidden="true" className="m-0 grid list-none grid-cols-1 gap-2.5 p-0">
              {model.scores.map((s) => (
                <li key={s.key}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate text-ink">
                      {s.def.label[lang]} <span className="text-xs text-ink-muted">· {CATEGORY_LABELS[s.def.category][lang]}</span>
                    </span>
                    <span className="shrink-0 tabular-nums text-ink">
                      <span className="font-semibold">{copy.rankOf.replace("{rank}", String(s.rank)).replace("{total}", String(s.total))}</span>
                      <span className="ml-2 text-xs text-ink-muted">{scoreText(s, lang)}</span>
                    </span>
                  </div>
                  <svg className="mt-1 block h-2.5 w-full" viewBox="0 0 100 10" preserveAspectRatio="none">
                    <rect x="0" y="0" width="100" height="10" rx="2" fill="var(--surface-soft)" />
                    <rect x="0" y="0" width={Math.max(1.5, s.beats * 100)} height="10" rx="2" fill={s.strong ? "var(--accent)" : providerColor(model.provider)} fillOpacity={s.strong ? 1 : 0.75} />
                  </svg>
                </li>
              ))}
            </ol>
          </figure>
          <details className="mt-3 text-sm">
            <summary className="cursor-pointer text-ink-muted hover:text-ink">{copy.viewTable}</summary>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[480px] border-collapse text-left text-sm">
                <caption className="sr-only">{copy.positionsTitle}</caption>
                <thead>
                  <tr className="border-b border-line text-xs text-ink-muted">
                    <th scope="col" className="py-2 pr-3 font-medium">{copy.colBenchmark}</th>
                    <th scope="col" className="py-2 pr-3 font-medium">{copy.colCategory}</th>
                    <th scope="col" className="py-2 pr-3 text-right font-medium">{copy.colScore}</th>
                    <th scope="col" className="py-2 text-right font-medium">{copy.colRank}</th>
                  </tr>
                </thead>
                <tbody>
                  {model.scores.map((s) => (
                    <tr key={s.key} className="border-b border-line last:border-b-0">
                      <th scope="row" className="py-2 pr-3 font-normal text-ink">
                        {s.def.label[lang]}
                        <span className="block text-[11px] text-ink-muted">{s.def.metricLabel[lang]}</span>
                      </th>
                      <td className="py-2 pr-3 text-ink-muted">{CATEGORY_LABELS[s.def.category][lang]}</td>
                      <td className="py-2 pr-3 text-right tabular-nums text-ink">{scoreText(s, lang)}</td>
                      <td className="py-2 text-right tabular-nums text-ink">
                        {copy.rankOf.replace("{rank}", String(s.rank)).replace("{total}", String(s.total))}
                        <span className="block text-[11px] text-ink-muted">{copy.beats.replace("{pct}", pct(s.beats, locale))}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </section>

        {/* Strengths */}
        <section aria-labelledby={`${titleId}-str`} className="mt-6">
          <h3 id={`${titleId}-str`} className="font-title text-base font-semibold text-ink">
            {copy.strengthsTitle}
          </h3>
          {model.strengths.length ? (
            <ul className="m-0 mt-2 flex list-none flex-wrap gap-2 p-0">
              {model.strengths.map((s) => (
                <li key={s.key} className="rounded-lg border border-line px-2.5 py-1.5 text-sm">
                  <span className="font-medium text-ink">{s.def.label[lang]}</span>{" "}
                  <span className="text-xs text-ink-muted">
                    · {s.rank <= 5 ? copy.topN.replace("{n}", "5") : copy.topShare} · #{s.rank}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-ink-muted">{copy.strengthsEmpty}</p>
          )}
        </section>

        {/* What the benchmarks measure, and their limits */}
        <details className="surface-soft mt-6 p-3">
          <summary className="cursor-pointer text-sm font-medium text-ink">{copy.limitsTitle}</summary>
          <dl className="m-0 mt-3 space-y-3 text-sm">
            {model.scores
              .filter((s, i, all) => texts[s.key] && all.findIndex((x) => x.key === s.key) === i)
              .map((s) => (
                <div key={s.key}>
                  <dt className="font-medium text-ink">{s.def.label[lang]}</dt>
                  <dd className="m-0 mt-1 space-y-1 text-ink-muted">
                    <p className="m-0">
                      <span className="font-medium text-ink">
                        {copy.measures}
                        {PUNCT[lang].colon}
                      </span>
                      {texts[s.key].measures}
                    </p>
                    <p className="m-0">
                      <span className="font-medium text-ink">
                        {copy.limitations}
                        {PUNCT[lang].colon}
                      </span>
                      {texts[s.key].limitations}
                    </p>
                  </dd>
                </div>
              ))}
          </dl>
        </details>

        <p className="mt-4 text-[11px] text-ink-muted">{copy.sources.replace("{sources}", sources).replace("{date}", dateLabel ?? "")}</p>
      </div>

      {/* Next steps */}
      <footer className="flex flex-wrap items-center gap-1.5 border-t border-line px-4 py-2.5 sm:gap-2 sm:px-6 sm:py-3">
        <button
          type="button"
          onClick={onToggleCompare}
          disabled={full}
          aria-pressed={inCompare}
          className={["btn h-8 px-3 text-xs sm:h-9 sm:px-3.5 sm:text-sm", inCompare ? "btn-primary" : "btn-ghost"].join(" ")}
          title={full ? copy.compareFull.replace("{max}", String(MAX_COMPARE)) : undefined}
        >
          {inCompare ? copy.compareRemove : copy.compareAdd}
        </button>
        {model.promptea && familyLabel ? (
          <Link href={`/${lang}/models/${model.promptea.modelPage}`} className="btn btn-ghost h-8 px-3 text-xs sm:h-9 sm:px-3.5 sm:text-sm">
            {copy.modelPage.replace("{family}", familyLabel)}
          </Link>
        ) : null}
        <Link href={`/${lang}/best-ai`} className="btn btn-ghost h-8 px-3 text-xs sm:h-9 sm:px-3.5 sm:text-sm">
          {copy.bestAi}
        </Link>
        <button type="button" onClick={copyLink} className="btn btn-ghost h-8 px-3 text-xs sm:ml-auto sm:h-9 sm:px-3.5 sm:text-sm">
          {copied ? copy.copied : copy.copyLink}
        </button>
        <span className="sr-only" aria-live="polite">
          {copied ? copy.copied : ""}
        </span>
        {full ? <p className="w-full text-[11px] text-ink-muted">{copy.compareFull.replace("{max}", String(MAX_COMPARE))}</p> : null}
      </footer>
    </>
  );
}
