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
//   #frontier (v1.8.7, moved here from the page) the quick comparison of the
//             leaders of the general benchmark, then the frontier matrix.
//
// State shared by all of them: the selected benchmark and the model under the
// cursor, so hovering a bar lights the same model in the scatter and in the
// table. v1.8.7 adds the model analysis and the comparison:
//   - any model name (bars, table, frontier cards and matrix) or a point of the
//     scatter opens that model's analysis (components/benchmarks/ModelPanel.tsx)
//     in an accessible dialog;
//   - "Compare" checkboxes (table, frontier cards and matrix, the panel) collect
//     up to four models; a bar at the bottom opens the comparison
//     (components/benchmarks/CompareView.tsx).
// The view lives in the URL hash so it can be shared: #b=<benchmark> (v1.7.0),
// #m=<model> opens a model's analysis on load, #c=<a>,<b> keeps a comparison.
// Nothing here fetches: it renders the snapshot the server already validated,
// and no value is ever invented.

import { useCallback, useEffect, useMemo, useState } from "react";
import { expandTables, type CompactTable } from "@/lib/benchmarks/compact";
import { buildBenchHash, buildModelIndex, compareModels, frontierLeaders, MAX_COMPARE, parseBenchHash } from "@/lib/benchmarks/model";
import type { FrontierMatrix as Matrix } from "@/lib/benchmarks/chart";
import BenchDialog from "./BenchDialog";
import ModelPanel, { type BenchmarkTexts, type ModelCopy } from "./ModelPanel";
import CompareView, { type CompareCopy } from "./CompareView";
import FrontierMatrix, { type MatrixCopy } from "./FrontierMatrix";
import FrontierQuick, { type FrontierQuickCopy } from "./FrontierQuick";
import { formatScore } from "@/lib/benchmarks/normalize";
import { CATEGORY_LABELS, CATEGORY_ORDER, SOURCE_INFO, type BenchmarkCategory } from "@/lib/benchmarks/catalog";
import { buildBarChart, pricePoints, providerShare } from "@/lib/benchmarks/chart";
import BenchmarkBars, { type BarsCopy } from "./BenchmarkBars";
import ProviderShareDonut, { type ShareCopy } from "./ProviderShareDonut";
import PriceScoreScatter, { type ScatterCopy } from "./PriceScoreScatter";
import BenchmarkTableView, { type TableCopy } from "./BenchmarkTableView";
import CostCalculator, { type CalcCopy } from "./CostCalculator";
import { type Lang } from "@/lib/domain";

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
  /** v1.8.7 */
  model: ModelCopy;
  compare: CompareCopy;
  frontierQuick: FrontierQuickCopy;
};

/** v1.8.7 — the "Frontier models" section, rendered by the dashboard so its names and checkboxes share its state. */
export type FrontierSection = {
  title: string;
  def: string;
  why: string;
  whyLabel: string;
  more: string; // "Showing {n} of {total} frontier models."
  matrix: Matrix | null;
  total: number;
  copy: MatrixCopy;
};

const TOP_OPTIONS = [5, 10, 15, 25] as const;
/** On phones, more benchmarks than this in a category scroll sideways instead of stacking. */
const PICKER_SCROLL_FROM = 3;

export default function BenchmarkDashboard({
  tables: compact,
  lang,
  copy,
  dateLabel,
  texts,
  frontier,
}: {
  /** Compact wire format (lib/benchmarks/compact.ts): keeps the HTML payload small. */
  tables: CompactTable[];
  lang: Lang;
  copy: DashboardCopy;
  dateLabel: string | null;
  /** v1.8.7 — what each benchmark measures and its limits, in this language (for the model panel). */
  texts: BenchmarkTexts;
  frontier: FrontierSection;
}) {
  const tables = useMemo(() => expandTables(compact), [compact]);
  const index = useMemo(() => buildModelIndex(tables), [tables]);
  const categories = useMemo(
    () => CATEGORY_ORDER.filter((c) => tables.some((t) => t.def.category === c)),
    [tables]
  );
  const first = tables[0];
  const [key, setKey] = useState(first?.def.key ?? "");
  const [topN, setTopN] = useState<number>(10);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  // v1.8.7 — the model whose analysis is open, the models being compared, the comparison dialog.
  const [modelId, setModelId] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);

  // Restore a shared view from the hash once, after hydration (#b=…, #m=…, #c=…).
  useEffect(() => {
    const h = parseBenchHash(window.location.hash);
    queueMicrotask(() => {
      if (h.b && tables.some((t) => t.def.key === h.b)) setKey(h.b);
      const known = h.c.filter((id) => index.has(id));
      if (known.length) setCompareIds(known);
      if (h.m && index.has(h.m)) setModelId(h.m);
    });
  }, [tables, index]);

  // A plain link to "#m=<model>" (from anywhere on the page) opens that analysis too.
  useEffect(() => {
    const onHash = () => {
      const h = parseBenchHash(window.location.hash);
      if (h.m && index.has(h.m)) setModelId(h.m);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [index]);

  /** Writes the current view to the hash without adding history entries. */
  const writeHash = useCallback((next: { b?: string; m?: string | null; c?: string[] }) => {
    try {
      const cur = parseBenchHash(window.location.hash);
      const h = buildBenchHash({ b: next.b ?? cur.b, m: next.m === undefined ? cur.m : next.m, c: next.c ?? cur.c });
      history.replaceState(null, "", `${window.location.pathname}${window.location.search}${h}`);
    } catch {
      /* non-essential */
    }
  }, []);

  const openModel = useCallback(
    (id: string) => {
      setCompareOpen(false);
      setModelId(id);
      writeHash({ m: id });
    },
    [writeHash]
  );
  const closeModel = useCallback(() => {
    setModelId(null);
    writeHash({ m: null });
  }, [writeHash]);
  // The hash is written outside the state updater: Next.js listens to history changes, and a
  // replaceState inside an updater would update the router while this component renders.
  const toggleCompare = useCallback(
    (id: string) => {
      const next = compareIds.includes(id) ? compareIds.filter((x) => x !== id) : compareIds.length >= MAX_COMPARE ? compareIds : [...compareIds, id];
      setCompareIds(next);
      writeHash({ c: next });
    },
    [compareIds, writeHash]
  );
  const setCompare = useCallback(
    (ids: string[]) => {
      const next = ids.slice(0, MAX_COMPARE);
      setCompareIds(next);
      writeHash({ c: next });
    },
    [writeHash]
  );
  const closeCompare = useCallback(() => setCompareOpen(false), []);

  const openModelProfile = modelId ? (index.get(modelId) ?? null) : null;
  const comparison = useMemo(() => compareModels(index, compareIds), [index, compareIds]);
  const leaders = useMemo(() => frontierLeaders(tables, index, 6), [tables, index]);
  const frontierBenchmarks = useMemo(() => tables.filter((t) => t.def.frontier).length, [tables]);
  const leaderLabel = leaders.key ? (tables.find((t) => t.def.key === leaders.key)?.def.label[lang] ?? "") : "";

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
    writeHash({ b: next });
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
              <BenchmarkBars model={bars} def={table.def} lang={lang} copy={copy.bars} highlightId={highlightId} onHighlight={setHighlightId} onOpen={openModel} openLabel={copy.model.open} />
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
            <BenchmarkTableView
              table={table}
              lang={lang}
              copy={copy.table}
              highlightId={highlightId}
              onHighlight={setHighlightId}
              onOpen={openModel}
              openLabel={copy.model.open}
              compareIds={compareIds}
              onToggleCompare={toggleCompare}
              compareLabel={copy.compare.checkbox}
              compareCol={copy.compare.col}
              maxCompare={MAX_COMPARE}
            />
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
            onOpen={openModel}
            openLabel={copy.model.open}
          />
        </div>
      </section>

      {/* ── Cost calculator ─────────────────────────────────────── */}
      <section id="calculator" aria-labelledby="bm-calc-title" className="scroll-mt-24">
        <CostCalculator table={table} lang={lang} copy={copy.calc} highlightId={highlightId} onHighlight={setHighlightId} />
      </section>

      {/* ── Frontier models (v1.8.7: quick comparison + matrix, with the panel and "Compare") ── */}
      <section id="frontier" aria-labelledby="bm-frontier" className="scroll-mt-24">
        <h2 id="bm-frontier" className="font-title text-2xl font-semibold">
          {frontier.title}
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink">{frontier.def}</p>
        <details className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-muted">
          <summary className="cursor-pointer text-ink">{frontier.whyLabel}</summary>
          <p className="mt-2">{frontier.why}</p>
        </details>
        <FrontierQuick
          leaders={leaders.models}
          benchmarkLabel={leaderLabel}
          frontierTotal={frontierBenchmarks}
          lang={lang}
          copy={copy.frontierQuick}
          compareLabel={copy.compare.checkbox}
          compareCol={copy.compare.col}
          compareIds={compareIds}
          onOpen={openModel}
          onToggleCompare={toggleCompare}
          onCompareTop={(ids) => {
            setCompare(ids);
            setModelId(null);
            setCompareOpen(true);
          }}
        />
        {frontier.matrix && frontier.matrix.rows.length > 0 ? (
          <div className="mt-6">
            <FrontierMatrix
              matrix={frontier.matrix}
              lang={lang}
              copy={frontier.copy}
              openLabel={copy.model.open}
              compareLabel={copy.compare.checkbox}
              compareCol={copy.compare.col}
              compareIds={compareIds}
              onOpen={openModel}
              onToggleCompare={toggleCompare}
            />
            {frontier.total > frontier.matrix.rows.length ? (
              <p className="mt-2 text-[11px] text-ink-muted">{frontier.more.replace("{n}", String(frontier.matrix.rows.length)).replace("{total}", String(frontier.total))}</p>
            ) : null}
          </div>
        ) : null}
      </section>

      {/* ── Comparison bar: sticks to the bottom while the dashboard is on screen ── */}
      {compareIds.length > 0 ? (
        <div role="region" aria-label={copy.compare.title} className="bm-compare-bar sticky bottom-3 z-30 mx-auto flex w-fit max-w-full flex-wrap items-center gap-2 rounded-xl border border-line-strong bg-[var(--overlay-fill)] px-3 py-2 shadow-lg">
          <span className="text-sm text-ink" aria-live="polite">
            {copy.compare.bar.replace("{n}", String(compareIds.length)).replace("{max}", String(MAX_COMPARE))}
          </span>
          <button type="button" className="btn btn-primary h-9 px-3.5 text-sm" onClick={() => setCompareOpen(true)} aria-haspopup="dialog" disabled={compareIds.length < 2}>
            {copy.compare.view}
          </button>
          <button type="button" className="btn btn-ghost h-9 px-3 text-sm" onClick={() => setCompare([])}>
            {copy.compare.clear}
          </button>
        </div>
      ) : null}

      {/* ── Dialogs ── */}
      <BenchDialog open={Boolean(openModelProfile)} onClose={closeModel} titleId="bm-model-title">
        {openModelProfile ? (
          <ModelPanel
            model={openModelProfile}
            lang={lang}
            copy={copy.model}
            texts={texts}
            dateLabel={dateLabel}
            inCompare={compareIds.includes(openModelProfile.modelId)}
            compareCount={compareIds.length}
            onToggleCompare={() => toggleCompare(openModelProfile.modelId)}
            onClose={closeModel}
            titleId="bm-model-title"
          />
        ) : null}
      </BenchDialog>
      <BenchDialog open={compareOpen && comparison.models.length > 0} onClose={closeCompare} titleId="bm-compare-title">
        <CompareView comparison={comparison} lang={lang} copy={copy.compare} onRemove={toggleCompare} onAnalyze={openModel} onClose={closeCompare} titleId="bm-compare-title" />
      </BenchDialog>
    </div>
  );
}
