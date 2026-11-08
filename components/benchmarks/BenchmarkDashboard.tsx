"use client";

// components/benchmarks/BenchmarkDashboard.tsx
//
// v1.8.0 — the interactive part of /benchmarks, replacing the wall of cards:
//
//   #ranking  category pills → compact "leader of each benchmark" list (pick
//             one) → top-N bar chart of the selected benchmark → the full
//             table (collapsed, still in the HTML).
//   #value    price vs. score scatter for the SAME benchmark, with the
//             cost/performance frontier, tooltip, keyboard and a note about
//             models left out for lack of a price.
//
// State shared by both: the selected benchmark and the model under the cursor,
// so hovering a bar lights the same model in the scatter and in the table.
// The selected benchmark lives in the URL hash (#b=aa:coding) like in v1.7.0,
// so a view can be shared. Nothing here fetches: it renders the snapshot the
// server already validated, and no value is ever invented.

import { useEffect, useMemo, useState } from "react";
import type { BenchmarkTable } from "@/lib/benchmarks/normalize";
import { formatScore } from "@/lib/benchmarks/normalize";
import { CATEGORY_LABELS, CATEGORY_ORDER, SOURCE_INFO, type BenchmarkCategory } from "@/lib/benchmarks/catalog";
import { buildBarChart, pricePoints } from "@/lib/benchmarks/chart";
import BenchmarkBars, { type BarsCopy } from "./BenchmarkBars";
import PriceScoreScatter, { type ScatterCopy } from "./PriceScoreScatter";
import BenchmarkTableView, { type TableCopy } from "./BenchmarkTableView";

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
  scatter: ScatterCopy;
  table: TableCopy;
};

const TOP_OPTIONS = [5, 10, 15, 25] as const;

export default function BenchmarkDashboard({
  tables,
  lang,
  copy,
  dateLabel,
}: {
  tables: BenchmarkTable[];
  lang: "es" | "en";
  copy: DashboardCopy;
  dateLabel: string | null;
}) {
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

  if (!table || !bars) return null;

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

        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[19rem_minmax(0,1fr)]">
          {/* Leaders of the category: one compact row per benchmark */}
          <ul aria-label={copy.benchmarks} className="m-0 grid list-none content-start gap-2 p-0">
            {inCategory.map((t) => {
              const top = t.rows[0];
              const selected = t.def.key === table.def.key;
              return (
                <li key={t.def.key}>
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => choose(t.def.key)}
                    className={[
                      "surface-soft block w-full p-3 text-left transition-colors",
                      selected ? "!border-accent !bg-accent-soft" : "hover:border-line-strong",
                    ].join(" ")}
                  >
                    <span className="block text-sm font-medium text-ink">{t.def.label[lang]}</span>
                    <span className="mt-1 flex items-baseline justify-between gap-2 text-xs text-ink-muted">
                      <span className="min-w-0 truncate">
                        {copy.leader}: <span className="font-medium text-ink">{top.name}</span>
                      </span>
                      <span className="shrink-0 text-sm font-semibold tabular-nums text-accent">{formatScore(top.value, t.def.metric, lang)}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {/* The chart */}
          <div className="surface min-w-0 p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-ink-muted">{sourceLine}</p>
              <div role="group" aria-label={copy.topN} className="flex items-center gap-1.5">
                {TOP_OPTIONS.filter((n) => n <= Math.max(5, table.rows.length) || n === 5).map((n) => (
                  <button key={n} type="button" className="pill !h-7 !px-2.5" aria-pressed={n === topN} onClick={() => setTopN(n)}>
                    {copy.topLabel.replace("{n}", String(n))}
                  </button>
                ))}
              </div>
            </div>
            <BenchmarkBars model={bars} def={table.def} lang={lang} copy={copy.bars} highlightId={highlightId} onHighlight={setHighlightId} />
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
    </div>
  );
}
