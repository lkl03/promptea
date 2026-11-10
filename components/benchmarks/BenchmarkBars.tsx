// components/benchmarks/BenchmarkBars.tsx
//
// v1.8.0 — horizontal top-N bar chart for ONE benchmark, in plain HTML/CSS
// (no chart library). Each row names the model and its provider in text and
// prints the value, so colour is never the only cue; the bar and the thin
// error whisker (± stddev between runs, when the source reports one) are
// decoration over that text.
//
// Accessibility: the figure is role="img" with a textual description of every
// bar (the same data as the table below it); the visual rows are aria-hidden
// so a screen reader gets the description once, not twice. Under
// prefers-reduced-motion the bars simply appear.

import type { BarChartModel } from "@/lib/benchmarks/chart";
import { providerColor } from "@/lib/benchmarks/chart";
import { formatScore } from "@/lib/benchmarks/normalize";
import type { BenchmarkDef } from "@/lib/benchmarks/catalog";

export type BarsCopy = {
  title: string; // "Top {n} · {benchmark}"
  desc: string; // "Bar chart: top {n} of {benchmark} ({metric}). {items}"
  axisNote: string; // "Axis starts at {min}…"
  errorNote: string;
  showingOf: string; // "Showing {n} of {total} models"
};

function fmtAxis(v: number, metric: BenchmarkDef["metric"], lang: "es" | "en") {
  const locale = lang === "es" ? "es-AR" : "en-US";
  if (metric === "accuracy" || metric === "f1") return `${v.toLocaleString(locale)}%`;
  return v.toLocaleString(locale);
}

export default function BenchmarkBars({
  model,
  def,
  lang,
  copy,
  highlightId,
  onHighlight,
}: {
  model: BarChartModel;
  def: BenchmarkDef;
  lang: "es" | "en";
  copy: BarsCopy;
  highlightId?: string | null;
  onHighlight?: (id: string | null) => void;
}) {
  const n = model.bars.length;
  const title = copy.title.replace("{n}", String(n)).replace("{benchmark}", def.label[lang]);
  const items = model.bars
    .map((b) => `${b.rank}. ${b.name} (${b.providerLabel}): ${formatScore(def.metric === "accuracy" || def.metric === "f1" ? b.value / 100 : b.value, def.metric, lang)}`)
    .join("; ");
  const desc = copy.desc
    .replace("{n}", String(n))
    .replace("{benchmark}", def.label[lang])
    .replace("{metric}", def.metricLabel[lang])
    .replace("{items}", items);
  const hasError = model.bars.some((b) => b.spread !== null);

  return (
    <figure className="m-0" role="img" aria-label={title} aria-describedby="bm-bars-desc">
      <p id="bm-bars-desc" className="sr-only">
        {desc}
      </p>
      <figcaption className="text-sm font-medium text-ink" aria-hidden="true">
        {title}
      </figcaption>
      <p className="mt-0.5 text-xs text-ink-muted" aria-hidden="true">
        {def.metricLabel[lang]} · {copy.showingOf.replace("{n}", String(n)).replace("{total}", String(model.total))}
      </p>

      <div aria-hidden="true" className="relative mt-3" key={def.key}>
        {/* Grid lines at the axis ticks */}
        <div className="pointer-events-none absolute inset-y-0 left-0 right-0">
          {model.ticks.map((t) => (
            <span
              key={t}
              className="absolute inset-y-0 w-px bg-line"
              style={{ left: `${((t - model.axisMin) / (model.axisMax - model.axisMin || 1)) * 100}%` }}
            />
          ))}
        </div>

        <ol className="relative m-0 grid list-none grid-cols-1 gap-2.5 p-0">
          {model.bars.map((b, i) => {
            const active = highlightId === b.modelId;
            return (
              <li
                key={b.modelId}
                className="rounded-md"
                onMouseEnter={onHighlight ? () => onHighlight(b.modelId) : undefined}
                onMouseLeave={onHighlight ? () => onHighlight(null) : undefined}
              >
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate">
                    <span className="mr-1.5 tabular-nums text-ink-faint">{b.rank}</span>
                    <span className={active ? "font-semibold text-ink" : "font-medium text-ink"}>{b.name}</span>
                    <span className="ml-1.5 text-xs text-ink-muted">{b.providerLabel}</span>
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums text-ink">
                    {formatScore(def.metric === "accuracy" || def.metric === "f1" ? b.value / 100 : b.value, def.metric, lang)}
                  </span>
                </div>
                <div className="relative mt-1 h-3 rounded-sm bg-surface-soft/70">
                  <div
                    className="bm-bar-fill absolute inset-y-0 left-0 rounded-sm"
                    style={{
                      width: `${(b.ratio * 100).toFixed(2)}%`,
                      background: providerColor(b.provider),
                      opacity: highlightId && !active ? 0.45 : 1,
                      animationDelay: `${Math.min(i, 12) * 30}ms`,
                    }}
                  />
                  {b.low !== null && b.high !== null ? (
                    <>
                      <span className="absolute top-1/2 h-px -translate-y-1/2 bg-ink" style={{ left: `${b.low * 100}%`, width: `${(b.high - b.low) * 100}%` }} />
                      <span className="absolute top-[2px] bottom-[2px] w-px bg-ink" style={{ left: `${b.low * 100}%` }} />
                      <span className="absolute top-[2px] bottom-[2px] w-px bg-ink" style={{ left: `${b.high * 100}%` }} />
                    </>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>

        {/* Axis labels */}
        <div className="relative mt-1.5 h-4 text-[10px] tabular-nums text-ink-muted">
          {model.ticks.map((t) => {
            const p = ((t - model.axisMin) / (model.axisMax - model.axisMin || 1)) * 100;
            return (
              <span key={t} className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: `${p}%` }}>
                {fmtAxis(t, def.metric, lang)}
              </span>
            );
          })}
        </div>
      </div>

      {model.truncatedAxis || hasError ? (
        <p className="mt-2 text-[11px] leading-snug text-ink-muted" aria-hidden="true">
          {model.truncatedAxis ? copy.axisNote.replace("{min}", fmtAxis(model.axisMin, def.metric, lang)) : null}
          {model.truncatedAxis && hasError ? " " : null}
          {hasError ? copy.errorNote : null}
        </p>
      ) : null}
    </figure>
  );
}
