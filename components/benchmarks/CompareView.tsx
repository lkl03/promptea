"use client";

// components/benchmarks/CompareView.tsx
//
// v1.8.7 — up to four models side by side, inside <BenchDialog>:
//   - grouped bars for the benchmarks they ALL share: one group per benchmark,
//     one bar per model, each group on its own benchmark's scale (0–100 for the
//     indices, accuracy and F1; Elo on an axis that starts near the lowest value,
//     and the chart says so). role="img" + a text description; the table below
//     is the equivalent;
//   - the table: every benchmark any of them is in (shared ones first), value in
//     that benchmark's metric and rank, the best of the row marked, "—" = not
//     measured; then prices and cost per score point (the calculator's chat
//     workload) for one shared benchmark;
//   - when they share no benchmark, it says so plainly instead of comparing.

import type { Comparison } from "@/lib/benchmarks/model";
import { costPerPoint, MAX_COMPARE } from "@/lib/benchmarks/model";
import { formatPrice, formatScore } from "@/lib/benchmarks/normalize";
import { formatUsd } from "@/lib/benchmarks/chart";
import { INTL_LOCALE, type Lang } from "@/lib/domain";

export type CompareCopy = {
  checkbox: string; // "Compare {name}"
  col: string; // "Compare"
  bar: string; // "Comparing {n} of {max}"
  view: string;
  clear: string;
  title: string;
  close: string;
  intro: string;
  needTwo: string;
  noCommon: string;
  chartTitle: string;
  chartDesc: string; // "{items}"
  eloNote: string;
  colBenchmark: string;
  best: string;
  notMeasured: string;
  priceRow: string;
  costTitle: string;
  costIntro: string; // "{benchmark}"
  noCost: string;
  remove: string; // "Remove {name}"
  analyze: string; // "Analysis"
};

/** Four distinct series colours with ≥3:1 contrast on the light and dark canvases (lib/benchmarks/chart.ts palette). */
export const SERIES = ["#2f7de1", "#d9642b", "#1f9d68", "#c2417e"] as const;

function groupScale(values: number[], metric: string): { min: number; max: number } {
  if (metric === "elo") {
    const lo = Math.min(...values);
    const hi = Math.max(...values);
    const pad = Math.max(25, (hi - lo) * 0.25);
    return { min: Math.max(0, Math.floor((lo - pad) / 50) * 50), max: Math.ceil((hi + pad / 2) / 50) * 50 };
  }
  return { min: 0, max: Math.max(100, ...values) };
}

export default function CompareView({
  comparison,
  lang,
  copy,
  onRemove,
  onAnalyze,
  onClose,
  titleId,
}: {
  comparison: Comparison;
  lang: Lang;
  copy: CompareCopy;
  onRemove: (id: string) => void;
  onAnalyze: (id: string) => void;
  onClose: () => void;
  titleId: string;
}) {
  const locale = INTL_LOCALE[lang];
  const { models, rows, common } = comparison;
  const shared = rows.filter((r) => r.common);
  const costKey = common[0] ?? null;
  const hasElo = shared.some((r) => r.def.metric === "elo");
  const desc = copy.chartDesc.replace(
    "{items}",
    shared
      .map((r) => `${r.def.label[lang]}: ${r.cells.map((c, i) => `${models[i].name} ${c ? formatScore(c.value, r.def.metric, lang) : copy.notMeasured}`).join(", ")}`)
      .join("; ")
  );

  return (
    <>
      <header className="flex items-start justify-between gap-3 border-b border-line px-4 py-3 sm:px-6 sm:py-4">
        <div className="min-w-0">
          <h2 id={titleId} className="font-title text-xl font-semibold leading-tight text-ink">
            {copy.title}
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-ink-muted">{copy.intro}</p>
        </div>
        <button type="button" onClick={onClose} className="btn-icon h-9 w-9 shrink-0" aria-label={copy.close} title={copy.close} data-autofocus>
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
        {/* The models, with their colour */}
        <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
          {models.map((m, i) => (
            <li key={m.modelId} className="flex items-center gap-1.5 rounded-lg border border-line py-1 pl-2.5 pr-1 text-sm">
              <span aria-hidden="true" className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: SERIES[i] }} />
              <button type="button" onClick={() => onAnalyze(m.modelId)} className="max-w-[16rem] truncate font-medium text-ink hover:text-accent" title={copy.analyze}>
                {m.name}
              </button>
              <button type="button" onClick={() => onRemove(m.modelId)} className="btn-icon h-7 w-7 border-transparent bg-transparent" aria-label={copy.remove.replace("{name}", m.name)} title={copy.remove.replace("{name}", m.name)}>
                <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </li>
          ))}
        </ul>

        {models.length < 2 ? (
          <p className="mt-4 text-sm text-ink-muted">{copy.needTwo.replace("{max}", String(MAX_COMPARE))}</p>
        ) : shared.length === 0 ? (
          <p role="note" className="surface-soft mt-4 border-l-4 p-3 text-sm text-ink" style={{ borderLeftColor: "var(--warning)" }}>
            {copy.noCommon}
          </p>
        ) : (
          <figure className="m-0 mt-5" role="img" aria-label={copy.chartTitle} aria-describedby={`${titleId}-desc`}>
            <figcaption className="text-sm font-medium text-ink" aria-hidden="true">
              {copy.chartTitle}
            </figcaption>
            <p id={`${titleId}-desc`} className="sr-only">
              {desc}
            </p>
            <div aria-hidden="true" className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {shared.map((r) => {
                const vals = r.cells.map((c) => (c ? c.display : 0));
                const { min, max } = groupScale(vals, r.def.metric);
                return (
                  <div key={r.key} className="min-w-0">
                    <p className="truncate text-xs font-medium text-ink">
                      {r.def.label[lang]} <span className="font-normal text-ink-muted">· {r.def.metricLabel[lang]}</span>
                    </p>
                    <div className="mt-1.5 space-y-1">
                      {r.cells.map((c, i) => (
                        <div key={models[i].modelId} className="flex items-center gap-2">
                          <svg className="block h-3 min-w-0 flex-1" viewBox="0 0 100 10" preserveAspectRatio="none">
                            <rect x="0" y="0" width="100" height="10" rx="2" fill="var(--surface-soft)" />
                            {c ? <rect x="0" y="0" width={Math.max(1, ((c.display - min) / (max - min || 1)) * 100)} height="10" rx="2" fill={SERIES[i]} /> : null}
                          </svg>
                          <span className={["w-16 shrink-0 text-right text-[11px] tabular-nums", r.best === i ? "font-semibold text-ink" : "text-ink-muted"].join(" ")}>
                            {c ? formatScore(c.value, r.def.metric, lang) : "—"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            {hasElo ? <p className="mt-2 text-[11px] text-ink-muted" aria-hidden="true">{copy.eloNote}</p> : null}
          </figure>
        )}

        {/* The table: every benchmark, shared ones first */}
        {models.length >= 1 ? (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-left text-sm">
              <caption className="sr-only">{copy.title}</caption>
              <thead>
                <tr className="border-b border-line text-xs text-ink-muted">
                  <th scope="col" className="py-2 pr-3 font-medium">{copy.colBenchmark}</th>
                  {models.map((m, i) => (
                    <th key={m.modelId} scope="col" className="py-2 pr-3 text-right font-medium">
                      <span aria-hidden="true" className="mr-1.5 inline-block h-2 w-2 rounded-sm align-middle" style={{ background: SERIES[i] }} />
                      {m.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.key} className="border-b border-line">
                    <th scope="row" className="py-2 pr-3 font-normal text-ink">
                      {r.def.label[lang]}
                      <span className="block text-[11px] text-ink-muted">{r.def.metricLabel[lang]}</span>
                    </th>
                    {r.cells.map((c, i) => (
                      <td key={models[i].modelId} className={["py-2 pr-3 text-right tabular-nums", r.best === i && r.cells.filter(Boolean).length > 1 ? "font-semibold text-ink" : "text-ink"].join(" ")}>
                        {c ? (
                          <>
                            {formatScore(c.value, r.def.metric, lang)}
                            {r.best === i && r.cells.filter(Boolean).length > 1 ? <span className="sr-only"> ({copy.best})</span> : null}
                            <span className="block text-[11px] font-normal text-ink-muted">
                              #{c.rank}/{c.total}
                            </span>
                          </>
                        ) : (
                          <span className="text-ink-faint" aria-label={copy.notMeasured}>
                            —
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="border-b border-line">
                  <th scope="row" className="py-2 pr-3 font-normal text-ink">{copy.priceRow}</th>
                  {models.map((m) => (
                    <td key={m.modelId} className="whitespace-nowrap py-2 pr-3 text-right text-xs tabular-nums text-ink">
                      {m.price ? `${formatPrice(m.price.inputPerM, lang)} / ${formatPrice(m.price.outputPerM, lang)}` : <span className="text-ink-faint">—</span>}
                    </td>
                  ))}
                </tr>
                {costKey ? (
                  <tr>
                    <th scope="row" className="py-2 pr-3 font-normal text-ink">
                      {copy.costTitle}
                      <span className="block text-[11px] text-ink-muted">{copy.costIntro.replace("{benchmark}", rows.find((r) => r.key === costKey)!.def.label[lang])}</span>
                    </th>
                    {models.map((m) => {
                      const v = costPerPoint(m, costKey);
                      return (
                        <td key={m.modelId} className="py-2 pr-3 text-right text-xs tabular-nums text-ink">
                          {v === null ? <span className="text-ink-faint">{copy.noCost}</span> : formatUsd(v, locale)}
                        </td>
                      );
                    })}
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </>
  );
}
