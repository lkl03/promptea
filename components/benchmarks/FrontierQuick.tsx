"use client";

// components/benchmarks/FrontierQuick.tsx
//
// v1.8.7 — the quick comparison that opens "Frontier models": the models that
// lead the general benchmark (Intelligence Index), one compact card each —
// position and score there, price, in how many general-capability benchmarks
// they are top 5 — with a direct way into each one's analysis, a "Compare"
// checkbox, and one button that compares the first four.

import type { ModelProfile, ModelScore } from "@/lib/benchmarks/model";
import { MAX_COMPARE } from "@/lib/benchmarks/model";
import { formatPrice, formatScore } from "@/lib/benchmarks/normalize";
import { providerColor } from "@/lib/benchmarks/chart";
import { type Lang } from "@/lib/domain";

export type FrontierQuickCopy = {
  title: string; // "The top of the {benchmark}"
  intro: string;
  analyze: string;
  compareTop: string; // "Compare the top {n}"
  qualifiers: string; // "Top 5 in {n} of {total} general benchmarks"
  noPrice: string;
};

export default function FrontierQuick({
  leaders,
  benchmarkLabel,
  frontierTotal,
  lang,
  copy,
  compareLabel,
  compareCol,
  compareIds,
  onOpen,
  onToggleCompare,
  onCompareTop,
}: {
  leaders: Array<{ profile: ModelProfile; score: ModelScore }>;
  benchmarkLabel: string;
  /** How many general-capability (frontier) benchmarks the snapshot has. */
  frontierTotal: number;
  lang: Lang;
  copy: FrontierQuickCopy;
  compareLabel: string;
  compareCol: string;
  compareIds: string[];
  onOpen: (id: string) => void;
  onToggleCompare: (id: string) => void;
  onCompareTop: (ids: string[]) => void;
}) {
  if (!leaders.length) return null;
  const top = leaders.slice(0, MAX_COMPARE).map((l) => l.profile.modelId);
  return (
    <div className="mt-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-title text-lg font-semibold text-ink">{copy.title.replace("{benchmark}", benchmarkLabel)}</h3>
          <p className="mt-0.5 max-w-2xl text-sm text-ink-muted">{copy.intro}</p>
        </div>
        <button type="button" className="btn btn-ghost h-9 px-3.5 text-sm" onClick={() => onCompareTop(top)} aria-haspopup="dialog">
          {copy.compareTop.replace("{n}", String(top.length))}
        </button>
      </div>
      <ol className="m-0 mt-3 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
        {leaders.map(({ profile: m, score }) => {
          const checked = compareIds.includes(m.modelId);
          const full = !checked && compareIds.length >= MAX_COMPARE;
          return (
            <li key={m.modelId} className="surface-soft flex min-w-0 flex-col p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="m-0 min-w-0">
                  <span className="mr-1.5 tabular-nums text-ink-faint">#{score.rank}</span>
                  <span className="font-semibold text-ink [overflow-wrap:anywhere]">{m.name}</span>
                  <span className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-muted">
                    <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full" style={{ background: providerColor(m.provider) }} />
                    {m.providerLabel}
                  </span>
                </p>
                <span className="shrink-0 text-lg font-semibold tabular-nums text-accent">{formatScore(score.value, score.def.metric, lang)}</span>
              </div>
              <p className="mt-2 text-xs text-ink-muted">{copy.qualifiers.replace("{n}", String(m.frontier.length)).replace("{total}", String(frontierTotal))}</p>
              <p className="mt-0.5 text-xs tabular-nums text-ink-muted">{m.price ? `${formatPrice(m.price.inputPerM, lang)} / ${formatPrice(m.price.outputPerM, lang)}` : copy.noPrice}</p>
              <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                <button type="button" className="btn btn-primary h-9 px-3.5 text-sm" onClick={() => onOpen(m.modelId)} aria-haspopup="dialog" aria-label={`${copy.analyze}: ${m.name}`}>
                  {copy.analyze}
                </button>
                <label className="flex cursor-pointer items-center gap-2 text-xs text-ink-muted">
                  <input type="checkbox" className="bm-compare-check h-4 w-4" checked={checked} disabled={full} onChange={() => onToggleCompare(m.modelId)} aria-label={compareLabel.replace("{name}", m.name)} />
                  <span aria-hidden="true">{compareCol}</span>
                </label>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
