"use client";

// components/benchmarks/BenchmarkDashboard.tsx
//
// v1.8.0 — the interactive part of /benchmarks, replacing the wall of cards:
//
//   #ranking  category pills → compact "leader of each benchmark" cards (pick
//             one) → top-N bar chart of the selected benchmark, next to a
//             donut of how that top-N splits by provider (v1.8.1) → the full
//             table (collapsed, still in the HTML).
//   #value    price vs. score scatter for the SAME benchmark, with the
//             cost/performance frontier, tooltip, keyboard and a note about
//             models left out for lack of a price.
//   #calculator  token volumes → cost per model for the same benchmark, ranked by
//             value (US$ per score point); linked to the scatter by hover.
//
// State shared by both: the selected benchmark and the model under the cursor,
// so hovering a bar lights the same model in the scatter and in the table.
// The selected benchmark lives in the URL hash (#b=aa:coding) like in v1.7.0,
// so a view can be shared. Nothing here fetches: it renders the snapshot the
// server already validated, and no value is ever invented.

import { useEffect, useMemo, useState } from "react";
import { expandTables, type CompactTable } from "@/lib/benchmarks/compact";
import { formatScore } from "@/lib/benchmarks/normalize";
import { CATEGORY_LABELS, CATEGORY_ORDER, SOURCE_INFO, type BenchmarkCategory } from "@/lib/benchmarks/catalog";
import { buildBarChart, pricePoints, providerShare } from "@/lib/benchmarks/chart";
import BenchmarkBars, { type BarsCopy } from "./BenchmarkBars";
import ProviderShareDonut, { type ShareCopy } from "./ProviderShareDonut";
import PriceScoreScatter, { type ScatterCopy } from "./PriceScoreScatter";
import BenchmarkTableView, { type TableCopy } from "./BenchmarkTableView";
import CostCalculator, { type CalcCopy } from "./CostCalculator";

export type DashboardCopy = {
  rankingTitle: string;
  rankingIntro: string;
  category: string;
  benchmarks: string; // aria label of the leader list
  leader: string;
  topN: string;
  topLabel: string; // "Top {n}"
  fullTable: string; // "Full table ({n} models)"
  valueTitle: string;
  valueIntro: string;
  valueFor: string; // "Showing: {benchmark}"
  sourceLine: string; // "{source} · {date}"
  bars: BarsCopy;
  share: ShareCopy;
  scatter: ScatterCopy;
  table: TableCopy;
  calc: CalcCopy;
};

const TOP_OPTIONS = [5, 10, 15, 25] as const;
/** On phones, more benchmarks than this in a category scroll sideways instead of stacking. */
const PICKER_SCROLL_FROM = 3;

export default function BenchmarkDashboard({
  tables: compact,
  lang,
  copy,
  dateLabel,
}: {
  /** Compact wire format (lib/benchmarks/compact.ts): keeps the HTML payload small. */
  tables: CompactTable[];
  lang: "es" | "en";
  copy: DashboardCopy;
  dateLabel: string | null;
}) {
  const tables = useMemo(() => expandTables(compact), [compact]);
  const categories = useMemo(
    () => CATEGORY_ORDER.filter((c) => tables.some((t) => t.def.category === c)),
    [tables]
  );
  const first = tables[0];
  const [key, setKey] = useState(first?.def.key ?? "");
  const [topN, setTopN] = useState<number>(10);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  // Restore a shared view from the hash once, after hydration.
  useEffect(() => {
    const m = /(?:^|[#&])b=([^&]+)/.exec(window.location.hash);
    const wanted = m ? decodeURIComponent(m[1]) : null;
    if (wanted && tables.some((t) => t.def.key === wanted)) queueMicrotask(() => setKey(wanted));
  }, [tables]);

  const table = tables.find((t) => t.def.key === key) ?? first;
  const category: BenchmarkCategory = table?.def.category ?? categories[0];

  const bars = useMemo(() => (table ? buildBarChart(table, topN) : null), [table, topN]);
  const scatter = useMemo(() => (table ? pricePoints(table) : { points: [], excluded: 0 }), [table]);

  const share = useMemo(() => (bars ? providerShare(bars.bars) : []), [bars]);

  if (!table || !bars) return null;
  const highlightProvider = highlightId ? (bars.bars.find((b) => b.modelId === highlightId)?.provider ?? null) : null;

  function choose(next: string) {
    setKey(next);
    setHighlightId(null);
    try {
      history.replaceState(null, "", `#b=${encodeURIComponent(next)}`);
    } catch {
      /* non-essential */
    }
  }

  function chooseCategory(c: BenchmarkCategory) {
    const t = tables.find((x) => x.def.category === c);
    if (t) choose(t.def.key);
  }

  const inCategory = tables.filter((t) => t.def.category === category);
  const sourceLine = copy.sourceLine.replace("{source}", SOURCE_INFO[table.def.source].name).replace("{date}", dateLabel ?? "");

  return (
    <div className="space-y-16">
      {/* ── Ranking ─────────────────────────────────────────────── */}
      <section id="ranking" aria-labelledby="bm-ranking-title" className="scroll-mt-24">
        <h2 id="bm-ranking-title" className="font-title text-2xl font-semibold">
          {copy.rankingTitle}
        </h2>
        <p className="mt-1 max-w-3xl text-sm text-ink-muted">{copy.rankingIntro}</p>

        <div role="group" aria-label={copy.category} className="mt-5 flex flex-wrap gap-2">
          {categories.map((c) => (
            <button key={c} type="button" className="pill" aria-pressed={c === category} onClick={() => chooseCategory(c)}>
              {CATEGORY_LABELS[c][lang]}
            </button>
          ))}
        </div>

        {/* Benchmarks of the category, one compact card each. v1.8.1: a real grid of
            equal tracks ABOVE the chart (it used to be a 19rem side column whose
            cards grew past their track and slid under the chart, leaving a tall
            empty column below). minmax(0,1fr) + min-w-0 let long model names
            truncate instead of widening the card; 1, 2 or 6 benchmarks all fit.
            On phones a category with many benchmarks (Design has a dozen-plus)
            becomes one horizontally scrollable row, so the chart stays near. */}
        <ul aria-label={copy.benchmarks} data-many={inCategory.length > PICKER_SCROLL_FROM ? "" : undefined} className="bm-picker m-0 mt-5 grid list-none gap-2 p-0">
          {inCategory.map((t) => {
            const top = t.rows[0];
            const selected = t.def.key === table.def.key;
            return (
              <li key={t.def.key} className="min-w-0">
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => choose(t.def.key)}
                  className={[
                    "surface-soft block h-full w-full min-w-0 p-3 text-left transition-colors",
                    selected ? "!border-accent !bg-accent-soft" : "hover:border-line-strong",
                  ].join(" ")}
                >
                  <span className="block truncate text-sm font-medium text-ink">{t.def.label[lang]}</span>
                  <span className="mt-1 flex min-w-0 items-baseline justify-between gap-2 text-xs text-ink-muted">
                    <span className="min-w-0 flex-1 truncate">
                      {copy.leader}: <span className="font-medium text-ink">{top.name}</span>
                    </span>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-accent">{formatScore(top.value, t.def.metric, lang)}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {/* The chart (bars) + who those models belong to (donut) */}
        <div className="surface mt-4 min-w-0 p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-ink-muted">{sourceLine}</p>
            <div role="group" aria-label={copy.topN} className="flex flex-wrap items-center gap-1.5">
              {TOP_OPTIONS.filter((n) => n <= Math.max(5, table.rows.length) || n === 5).map((n) => (
                <button key={n} type="button" className="pill !h-7 !px-2.5" aria-pressed={n === topN} onClick={() => setTopN(n)}>
                  {copy.topLabel.replace("{n}", String(n))}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,19rem)] lg:gap-8">
            <div className="min-w-0">
              <BenchmarkBars model={bars} def={table.def} lang={lang} copy={copy.bars} highlightId={highlightId} onHighlight={setHighlightId} />
            </div>
            <div className="min-w-0 border-t border-line pt-5 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
              <ProviderShareDonut
                slices={share}
                total={bars.bars.length}
                lang={lang}
                copy={copy.share}
                sourceLine={`${table.def.label[lang]} · ${sourceLine}`}
                highlightProvider={highlightProvider}
              />
            </div>
          </div>
        </div>

        <details className="surface-soft mt-5 p-4">
          <summary className="cursor-pointer text-sm font-medium text-ink">{copy.fullTable.replace("{n}", String(table.rows.length))}</summary>
          <div className="mt-4">
            <BenchmarkTableView table={table} lang={lang} copy={copy.table} highlightId={highlightId} onHighlight={setHighlightId} />
          </div>
        </details>
      </section>

      {/* ── Cost / performance ──────────────────────────────────── */}
      <section id="value" aria-labelledby="bm-value-title" className="scroll-mt-24">
        <h2 id="bm-value-title" className="font-title text-2xl font-semibold">
          {copy.valueTitle}
        </h2>
        <p className="mt-1 max-w-3xl text-sm text-ink-muted">{copy.valueIntro}</p>
        <p className="mt-3 text-xs text-ink-muted">
          {copy.valueFor.replace("{benchmark}", table.def.label[lang])} · {sourceLine}
        </p>
        <div className="surface mt-3 p-4 sm:p-5">
          <PriceScoreScatter
            points={scatter.points}
            excluded={scatter.excluded}
            def={table.def}
            lang={lang}
            copy={copy.scatter}
            activeId={highlightId}
            onActive={setHighlightId}
          />
        </div>
      </section>

      {/* ── Cost calculator ─────────────────────────────────────── */}
      <section id="calculator" aria-labelledby="bm-calc-title" className="scroll-mt-24">
        <CostCalculator table={table} lang={lang} copy={copy.calc} highlightId={highlightId} onHighlight={setHighlightId} />
      </section>
    </div>
  );
}
