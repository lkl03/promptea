"use client";

// components/benchmarks/CostCalculator.tsx
//
// v1.8.0 — "what would this workload cost?" for the models of the SELECTED
// benchmark. Input and output tokens per request (and how many requests) turn
// the normalized per-million prices into a cost per model, and the table can be
// ranked by value (US$ per score point), by cost, or by score.
//
// Honest by construction (maths in lib/benchmarks/chart.ts, tested):
//   - only models with BOTH an input and an output price are listed; the rest
//     are counted in a note, never priced at 0;
//   - "value" divides by the score of the benchmark chosen above — scores of
//     different benchmarks are never mixed;
//   - the cost is an estimate from list prices (no caching, batching or
//     discounts), and the page says so.
// Hovering a row highlights the same model in the scatter above (shared state
// with the dashboard), and vice versa.

import Link from "next/link";
import { useMemo, useState } from "react";
import type { BenchmarkTable } from "@/lib/benchmarks/normalize";
import { PROVIDER_TO_PROMPTEA } from "@/lib/benchmarks/catalog";
import { costRows, formatTokens, formatUsd, providerColor, sortCostRows, type CostSort } from "@/lib/benchmarks/chart";
import { formatScore } from "@/lib/benchmarks/normalize";

export type CalcCopy = {
  title: string;
  intro: string;
  inputTokens: string;
  outputTokens: string;
  requests: string;
  presets: string;
  presetChat: string;
  presetDoc: string;
  presetAgent: string;
  sortLabel: string;
  sortValue: string;
  sortCost: string;
  sortScore: string;
  colModel: string;
  colScore: string;
  colCost: string;
  colPerPoint: string;
  colTotal: string; // "Total for {n} requests"
  summary: string; // "{tokensIn} in + {tokensOut} out per request, {n} requests — {benchmark}"
  excluded: string;
  empty: string;
  estimate: string;
  showAll: string; // "Show all {n}"
  showLess: string;
  bestAiTitle: string;
  bestAiCta: string;
  guide: string;
};

const PRESETS = {
  chat: { input: 1_000, output: 500, requests: 1_000 },
  doc: { input: 20_000, output: 2_000, requests: 200 },
  agent: { input: 120_000, output: 8_000, requests: 100 },
} as const;

const MAX_TOKENS = 10_000_000;
const MAX_REQUESTS = 100_000_000;
const SHOWN = 10;

function parse(v: string, max: number): number {
  const n = Number(v.replace(/[^\d]/g, ""));
  return Number.isFinite(n) ? Math.min(max, Math.max(0, Math.floor(n))) : 0;
}

export default function CostCalculator({
  table,
  lang,
  copy,
  highlightId,
  onHighlight,
}: {
  table: BenchmarkTable;
  lang: "es" | "en";
  copy: CalcCopy;
  highlightId: string | null;
  onHighlight: (id: string | null) => void;
}) {
  const locale = lang === "es" ? "es-AR" : "en-US";
  const [inTok, setInTok] = useState<number>(PRESETS.chat.input);
  const [outTok, setOutTok] = useState<number>(PRESETS.chat.output);
  const [requests, setRequests] = useState<number>(PRESETS.chat.requests);
  const [sort, setSort] = useState<CostSort>("value");
  const [all, setAll] = useState(false);

  const { rows, excluded } = useMemo(() => costRows(table, inTok, outTok), [table, inTok, outTok]);
  const sorted = useMemo(() => sortCostRows(rows, sort), [rows, sort]);
  const visible = all ? sorted : sorted.slice(0, SHOWN);

  function applyPreset(p: keyof typeof PRESETS) {
    setInTok(PRESETS[p].input);
    setOutTok(PRESETS[p].output);
    setRequests(PRESETS[p].requests);
  }

  const summary = copy.summary
    .replace("{tokensIn}", formatTokens(inTok, locale))
    .replace("{tokensOut}", formatTokens(outTok, locale))
    .replace("{n}", requests.toLocaleString(locale))
    .replace("{benchmark}", table.def.label[lang]);

  const field = "field h-10 w-full px-3 text-sm tabular-nums";

  return (
    <div>
      <h2 id="bm-calc-title" className="font-title text-2xl font-semibold">
        {copy.title}
      </h2>
      <p className="mt-1 max-w-3xl text-sm text-ink-muted">{copy.intro}</p>

      <div className="surface mt-4 p-4 sm:p-5">
        <div role="group" aria-label={copy.presets} className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-xs text-ink-muted">{copy.presets}:</span>
          <button type="button" className="pill !h-7 !px-2.5" onClick={() => applyPreset("chat")}>
            {copy.presetChat}
          </button>
          <button type="button" className="pill !h-7 !px-2.5" onClick={() => applyPreset("doc")}>
            {copy.presetDoc}
          </button>
          <button type="button" className="pill !h-7 !px-2.5" onClick={() => applyPreset("agent")}>
            {copy.presetAgent}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-xs text-ink-muted">
            {copy.inputTokens}
            <input inputMode="numeric" value={inTok.toLocaleString(locale)} onChange={(e) => setInTok(parse(e.target.value, MAX_TOKENS))} className={field} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-ink-muted">
            {copy.outputTokens}
            <input inputMode="numeric" value={outTok.toLocaleString(locale)} onChange={(e) => setOutTok(parse(e.target.value, MAX_TOKENS))} className={field} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-ink-muted">
            {copy.requests}
            <input inputMode="numeric" value={requests.toLocaleString(locale)} onChange={(e) => setRequests(parse(e.target.value, MAX_REQUESTS))} className={field} />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-ink-muted" aria-live="polite">
            {summary}
          </p>
          <div role="group" aria-label={copy.sortLabel} className="flex flex-wrap items-center gap-1.5">
            {(
              [
                ["value", copy.sortValue],
                ["cost", copy.sortCost],
                ["score", copy.sortScore],
              ] as const
            ).map(([k, label]) => (
              <button key={k} type="button" className="pill !h-7 !px-2.5" aria-pressed={sort === k} onClick={() => setSort(k)}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {rows.length === 0 ? (
          <p className="surface-soft mt-4 p-4 text-sm text-ink-muted">{copy.empty}</p>
        ) : (
          <div className="surface-soft mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <caption className="sr-only">{summary}</caption>
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-muted">
                  <th scope="col" className="px-3 py-3 font-medium">{copy.colModel}</th>
                  <th scope="col" className="px-3 py-3 text-right font-medium">{copy.colScore}</th>
                  <th scope="col" className="px-3 py-3 text-right font-medium">{copy.colCost}</th>
                  <th scope="col" className="px-3 py-3 text-right font-medium">{copy.colPerPoint}</th>
                  <th scope="col" className="px-3 py-3 text-right font-medium">{copy.colTotal.replace("{n}", requests.toLocaleString(locale))}</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => {
                  const promptea = PROVIDER_TO_PROMPTEA[r.provider];
                  const active = highlightId === r.modelId;
                  return (
                    <tr
                      key={r.modelId}
                      className={["border-b border-line last:border-b-0", active ? "bg-accent-soft" : ""].join(" ")}
                      onMouseEnter={() => onHighlight(r.modelId)}
                      onMouseLeave={() => onHighlight(null)}
                    >
                      <th scope="row" className="px-3 py-2.5 font-normal">
                        <span aria-hidden="true" className="mr-2 inline-block h-2 w-2 rounded-full align-middle" style={{ background: providerColor(r.provider) }} />
                        <span className="font-medium text-ink">{r.name}</span>
                        <span className="ml-1.5 text-xs text-ink-muted">{r.providerLabel}</span>
                        {promptea ? (
                          <Link href={`/${lang}/models/${promptea.modelPage}`} className="ml-2 text-xs text-accent hover:underline">
                            {copy.guide}
                          </Link>
                        ) : null}
                      </th>
                      <td className="px-3 py-2.5 text-right tabular-nums">{formatScore(table.def.metric === "accuracy" || table.def.metric === "f1" ? r.score / 100 : r.score, table.def.metric, lang)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{formatUsd(r.cost, locale)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-ink-muted">{r.costPerPoint === null ? "—" : formatUsd(r.costPerPoint, locale)}</td>
                      <td className="px-3 py-2.5 text-right font-medium tabular-nums">{formatUsd(r.cost * requests, locale)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {sorted.length > SHOWN ? (
          <button type="button" className="mt-3 text-sm text-accent hover:underline" onClick={() => setAll((v) => !v)} aria-expanded={all}>
            {all ? copy.showLess : copy.showAll.replace("{n}", String(sorted.length))}
          </button>
        ) : null}

        <p className="mt-3 text-[11px] leading-snug text-ink-muted">
          {copy.estimate}
          {excluded > 0 ? ` ${copy.excluded.replace("{n}", String(excluded))}` : ""}
        </p>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line p-3">
          <p className="text-sm text-ink">{copy.bestAiTitle}</p>
          <Link href={`/${lang}/best-ai`} className="btn btn-ghost h-8 px-3 text-xs">
            {copy.bestAiCta} →
          </Link>
        </div>
      </div>
    </div>
  );
}
