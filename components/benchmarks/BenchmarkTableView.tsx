"use client";

// components/benchmarks/BenchmarkTableView.tsx
//
// The accessible table behind the charts (v1.7.0 explorer; v1.8.0: the
// benchmark is chosen by the dashboard, not here). It keeps every row of the
// selected benchmark in the HTML — for crawlers and screen readers too — with
// search (model or provider), provider filter and sorting. Scores from
// different benchmarks are never mixed: one table, one benchmark, one metric.

import Link from "next/link";
import { useMemo, useState } from "react";
import type { BenchmarkTable } from "@/lib/benchmarks/normalize";
import { formatPrice, formatScore } from "@/lib/benchmarks/normalize";
import { PROVIDER_TO_PROMPTEA, SOURCE_INFO } from "@/lib/benchmarks/catalog";
import { providerColor } from "@/lib/benchmarks/chart";

type Sort = "score" | "score-asc" | "price" | "name";

export type TableCopy = {
  search: string;
  searchPlaceholder: string;
  provider: string;
  allProviders: string;
  sort: string;
  sortScore: string;
  sortScoreAsc: string;
  sortPrice: string;
  sortName: string;
  colRank: string;
  colModel: string;
  colProvider: string;
  colScore: string;
  colSource: string;
  colPrice: string;
  priceHint: string;
  noMatch: string;
  results: string;
  guide: string;
  stddev: string;
};

export default function BenchmarkTableView({
  table,
  lang,
  copy,
  highlightId,
  onHighlight,
}: {
  table: BenchmarkTable;
  lang: "es" | "en";
  copy: TableCopy;
  highlightId?: string | null;
  onHighlight?: (id: string | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [provider, setProvider] = useState("");
  const [sort, setSort] = useState<Sort>("score");

  const providers = useMemo(() => {
    const seen = new Map<string, string>();
    for (const r of table.rows) seen.set(r.provider, r.providerLabel);
    return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [table]);

  // A provider missing from the newly selected benchmark must not keep filtering it.
  const effectiveProvider = providers.some(([id]) => id === provider) ? provider : "";

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = table.rows.filter(
      (r) =>
        (!effectiveProvider || r.provider === effectiveProvider) &&
        (!q || r.name.toLowerCase().includes(q) || r.providerLabel.toLowerCase().includes(q) || r.modelId.toLowerCase().includes(q))
    );
    const priceOf = (r: (typeof filtered)[number]) => r.price?.inputPerM ?? Number.POSITIVE_INFINITY;
    return [...filtered].sort((a, b) => {
      if (sort === "score-asc") return a.value - b.value;
      if (sort === "price") return priceOf(a) - priceOf(b) || b.value - a.value;
      if (sort === "name") return a.name.localeCompare(b.name);
      return b.value - a.value;
    });
  }, [table, query, effectiveProvider, sort]);

  return (
    <div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-xs text-ink-muted">
          {copy.search}
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={copy.searchPlaceholder} className="field h-10 px-3 text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-ink-muted">
          {copy.provider}
          <select value={effectiveProvider} onChange={(e) => setProvider(e.target.value)} className="field h-10 px-3 text-sm">
            <option value="">{copy.allProviders}</option>
            {providers.map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-ink-muted">
          {copy.sort}
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="field h-10 px-3 text-sm">
            <option value="score">{copy.sortScore}</option>
            <option value="score-asc">{copy.sortScoreAsc}</option>
            <option value="price">{copy.sortPrice}</option>
            <option value="name">{copy.sortName}</option>
          </select>
        </label>
      </div>

      <p className="mt-4 text-xs text-ink-muted" aria-live="polite">
        {copy.results.replace("{n}", String(shown.length))} · {table.def.metricLabel[lang]} ·{" "}
        <a href={SOURCE_INFO[table.def.source].url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-ink">
          {SOURCE_INFO[table.def.source].name}
        </a>
      </p>

      <div className="surface-soft mt-3 max-h-[34rem] overflow-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <caption className="sr-only">
            {table.def.label[lang]} — {table.def.metricLabel[lang]}
          </caption>
          <thead className="sticky top-0 z-10 bg-[var(--overlay-fill)]">
            <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-muted">
              <th scope="col" className="w-12 px-3 py-3 font-medium">{copy.colRank}</th>
              <th scope="col" className="px-3 py-3 font-medium">{copy.colModel}</th>
              <th scope="col" className="px-3 py-3 font-medium">{copy.colProvider}</th>
              <th scope="col" className="px-3 py-3 text-right font-medium">{copy.colScore}</th>
              <th scope="col" className="px-3 py-3 font-medium">{copy.colSource}</th>
              <th scope="col" className="px-3 py-3 text-right font-medium" title={copy.priceHint}>
                {copy.colPrice}
              </th>
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-ink-muted">
                  {copy.noMatch}
                </td>
              </tr>
            ) : (
              shown.map((r) => {
                const promptea = PROVIDER_TO_PROMPTEA[r.provider];
                const active = highlightId === r.modelId;
                return (
                  <tr
                    key={r.modelId}
                    className={["border-b border-line last:border-b-0", active ? "bg-accent-soft" : ""].join(" ")}
                    onMouseEnter={onHighlight ? () => onHighlight(r.modelId) : undefined}
                    onMouseLeave={onHighlight ? () => onHighlight(null) : undefined}
                  >
                    <td className="px-3 py-3 tabular-nums text-ink-muted">{r.rank}</td>
                    <td className="px-3 py-3">
                      <span aria-hidden="true" className="mr-2 inline-block h-2 w-2 rounded-full align-middle" style={{ background: providerColor(r.provider) }} />
                      <a href={`https://openrouter.ai/${r.modelId}`} target="_blank" rel="noopener noreferrer" className="font-medium text-ink hover:text-accent">
                        {r.name}
                      </a>
                      {promptea ? (
                        <span className="ml-2 whitespace-nowrap text-xs">
                          <Link href={`/${lang}/models/${promptea.modelPage}`} className="text-accent hover:underline">
                            {copy.guide}
                          </Link>
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 text-ink-muted">{r.providerLabel}</td>
                    <td className="px-3 py-3 text-right font-medium tabular-nums">
                      {formatScore(r.value, table.def.metric, lang)}
                      {r.stddev !== null && (table.def.metric === "accuracy" || table.def.metric === "f1") ? (
                        <span className="block text-[11px] font-normal text-ink-muted" title={copy.stddev}>
                          ± {formatScore(r.stddev, table.def.metric, lang)}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 text-xs text-ink-muted">
                      {table.def.label[lang]}
                      <span className="block">{SOURCE_INFO[table.def.source].name}</span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-right text-xs tabular-nums text-ink-muted">
                      {r.price ? `${formatPrice(r.price.inputPerM, lang)} / ${formatPrice(r.price.outputPerM, lang)}` : "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] text-ink-muted">{copy.priceHint}</p>
    </div>
  );
}
