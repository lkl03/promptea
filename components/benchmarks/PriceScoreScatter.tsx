"use client";

// components/benchmarks/PriceScoreScatter.tsx
//
// v1.8.0 — price vs. score scatter for ONE benchmark, in plain SVG. X is the
// input price (US$ per million tokens) on a log axis — prices span several
// orders of magnitude — and Y is the benchmark score. The dashed line joins
// the models nobody beats on both axes at once (the cost/performance
// frontier). Models without a price are NOT plotted (they are counted in a
// note): a missing price is never drawn as 0.
//
// Interaction: hover/tap a point for a tooltip; keyboard users focus the
// chart and use ←/→ (or ↑/↓) to step through the models from cheapest to
// priciest, Home/End to jump, Esc to clear. The active model is also written
// into an aria-live status line, and the complete data lives in the table
// below the chart. The plot itself is role="img" with a textual description.

import { useId, useMemo, useRef, useState } from "react";
import { logScale, niceTicks, providerColor, type PricePoint } from "@/lib/benchmarks/chart";
import { formatPrice } from "@/lib/benchmarks/normalize";
import type { BenchmarkDef } from "@/lib/benchmarks/catalog";
import { INTL_LOCALE, type Lang } from "@/lib/domain";

export type ScatterCopy = {
  title: string; // "{benchmark} vs. price"
  xAxis: string;
  yAxis: string;
  efficientLegend: string;
  keys: string;
  excluded: string; // "{n} models without a price are not shown."
  empty: string;
  desc: string; // "Scatter plot: {n} models …"
  score: string;
  inputPrice: string;
  outputPrice: string;
  rank: string;
  efficientBadge: string;
  perMillion: string;
};

const W = 640;
const H = 340;
const M = { l: 46, r: 14, t: 14, b: 44 };

export default function PriceScoreScatter({
  points,
  excluded,
  def,
  lang,
  copy,
  activeId,
  onActive,
}: {
  points: PricePoint[];
  excluded: number;
  def: BenchmarkDef;
  lang: Lang;
  copy: ScatterCopy;
  activeId: string | null;
  onActive: (id: string | null) => void;
}) {
  const uid = useId();
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [focused, setFocused] = useState(false);
  const locale = INTL_LOCALE[lang];

  const model = useMemo(() => {
    if (points.length === 0) return null;
    const x = logScale(points.map((p) => p.inputPerM));
    const scores = points.map((p) => p.score);
    const lo = Math.min(...scores);
    const hi = Math.max(...scores);
    const pad = Math.max((hi - lo) * 0.08, 1);
    const yMin = Math.max(0, lo - pad);
    const yMax = hi + pad;
    const yTicks = niceTicks(yMin, yMax, 4);
    // Rounded: Math.log10 differs in the last digits between Node and the browser, which would
    // otherwise trip a hydration mismatch on the SVG coordinates.
    const r2 = (n: number) => Math.round(n * 100) / 100;
    const px = (v: number) => r2(M.l + x.at(v) * (W - M.l - M.r));
    const py = (v: number) => r2(H - M.b - ((v - yMin) / (yMax - yMin || 1)) * (H - M.t - M.b));
    const byPrice = [...points].sort((a, b) => a.inputPerM - b.inputPerM || b.score - a.score);
    const frontier = byPrice.filter((p) => p.efficient);
    const path = frontier.map((p, i) => `${i ? "L" : "M"}${px(p.inputPerM).toFixed(1)},${py(p.score).toFixed(1)}`).join(" ");
    return { x, yTicks, px, py, byPrice, frontier, path };
  }, [points]);

  if (!model) {
    return <p className="surface-soft p-4 text-sm text-ink-muted">{copy.empty}</p>;
  }

  const { x, yTicks, px, py, byPrice, frontier, path } = model;
  const active = points.find((p) => p.modelId === activeId) ?? null;
  const providers = [...new Map(points.map((p) => [p.provider, p.providerLabel])).entries()];

  const fmtScore = (v: number) =>
    def.metric === "accuracy" || def.metric === "f1" ? `${v.toLocaleString(locale, { maximumFractionDigits: 1, minimumFractionDigits: 1 })}%` : v.toLocaleString(locale, { maximumFractionDigits: def.metric === "elo" ? 0 : 1 });

  function onKeyDown(e: React.KeyboardEvent) {
    const i = active ? byPrice.findIndex((p) => p.modelId === active.modelId) : -1;
    let next: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = Math.min(byPrice.length - 1, i + 1);
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = i <= 0 ? 0 : i - 1;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = byPrice.length - 1;
    else if (e.key === "Escape") {
      onActive(null);
      return;
    } else return;
    e.preventDefault();
    onActive(byPrice[next].modelId);
  }

  const statusText = active
    ? `${active.name}, ${active.providerLabel}. ${copy.score}: ${fmtScore(active.score)}. ${copy.inputPrice}: ${formatPrice(active.inputPerM, lang)}${active.outputPerM !== null ? `, ${copy.outputPrice}: ${formatPrice(active.outputPerM, lang)}` : ""}.${active.efficient ? ` ${copy.efficientBadge}.` : ""}`
    : "";

  const desc = copy.desc
    .replace("{n}", String(points.length))
    .replace("{benchmark}", def.label[lang])
    .replace("{m}", String(frontier.length))
    .replace("{frontier}", frontier.map((p) => `${p.name} (${fmtScore(p.score)}, ${formatPrice(p.inputPerM, lang)})`).join("; "));

  // Tooltip placement as % of the box so it scales with the SVG.
  const tipLeft = active ? (px(active.inputPerM) / W) * 100 : 0;
  const tipTop = active ? (py(active.score) / H) * 100 : 0;
  const flipX = tipLeft > 60;

  return (
    <div>
      <div
        ref={wrapRef}
        tabIndex={0}
        role="group"
        aria-label={`${copy.title}. ${copy.keys}`}
        aria-describedby={`${uid}-status`}
        onKeyDown={onKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
        }}
        className="relative rounded-xl outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
        data-focused={focused || undefined}
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={copy.title} aria-describedby={`${uid}-desc`}>
          <desc id={`${uid}-desc`}>{desc}</desc>

          {/* Grid + axes */}
          {yTicks.map((t) => (
            <g key={`y${t}`}>
              <line x1={M.l} x2={W - M.r} y1={py(t)} y2={py(t)} stroke="var(--line)" strokeWidth="1" />
              <text x={M.l - 6} y={py(t) + 3.5} textAnchor="end" fontSize="10" fill="var(--ink-muted)" className="tabular-nums">
                {t.toLocaleString(locale)}
              </text>
            </g>
          ))}
          {x.ticks.map((t) => (
            <g key={`x${t}`}>
              <line x1={px(t)} x2={px(t)} y1={M.t} y2={H - M.b} stroke="var(--line)" strokeWidth="1" />
              <text x={px(t)} y={H - M.b + 15} textAnchor="middle" fontSize="10" fill="var(--ink-muted)" className="tabular-nums">
                {t >= 1 ? `$${t.toLocaleString(locale)}` : `$${t.toLocaleString(locale, { maximumFractionDigits: 3 })}`}
              </text>
            </g>
          ))}
          <text x={(M.l + W - M.r) / 2} y={H - 6} textAnchor="middle" fontSize="11" fill="var(--ink-muted)">
            {copy.xAxis}
          </text>
          <text transform={`translate(11 ${(M.t + H - M.b) / 2}) rotate(-90)`} textAnchor="middle" fontSize="11" fill="var(--ink-muted)">
            {copy.yAxis}
          </text>

          {/* Frontier line */}
          {frontier.length > 1 ? <path d={path} fill="none" stroke="var(--ink-muted)" strokeWidth="1.25" strokeDasharray="4 4" /> : null}

          {/* Points */}
          {points.map((p) => {
            const isActive = p.modelId === activeId;
            const cx = px(p.inputPerM);
            const cy = py(p.score);
            return (
              <g key={p.modelId}>
                {/* generous hit area for pointer/touch */}
                <circle
                  cx={cx}
                  cy={cy}
                  r="13"
                  fill="transparent"
                  onMouseEnter={() => onActive(p.modelId)}
                  onMouseLeave={() => onActive(null)}
                  onClick={() => onActive(isActive ? null : p.modelId)}
                />
                <circle
                  cx={cx}
                  cy={cy}
                  r={isActive ? 7.5 : p.efficient ? 6 : 4.5}
                  fill={providerColor(p.provider)}
                  fillOpacity={activeId && !isActive ? 0.45 : 0.95}
                  stroke={p.efficient || isActive ? "var(--ink)" : "var(--canvas)"}
                  strokeWidth={p.efficient || isActive ? 1.5 : 1}
                  pointerEvents="none"
                />
              </g>
            );
          })}

          {/* Names for the frontier only, to keep the plot legible */}
          {frontier.map((p) => (
            <text
              key={`l${p.modelId}`}
              x={px(p.inputPerM) + (px(p.inputPerM) > W - 120 ? -9 : 9)}
              y={py(p.score) - 8}
              textAnchor={px(p.inputPerM) > W - 120 ? "end" : "start"}
              fontSize="10"
              fontWeight="600"
              fill="var(--ink)"
              stroke="var(--canvas)"
              strokeWidth="3"
              paintOrder="stroke"
              pointerEvents="none"
            >
              {p.name}
            </text>
          ))}
        </svg>

        {active ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute z-10 w-56 rounded-lg border border-line-strong bg-[var(--overlay-fill)] p-2.5 text-xs shadow-lg"
            style={{
              left: `${tipLeft}%`,
              top: `${tipTop}%`,
              transform: `translate(${flipX ? "calc(-100% - 12px)" : "12px"}, -50%)`,
            }}
          >
            <p className="font-semibold text-ink">{active.name}</p>
            <p className="text-ink-muted">{active.providerLabel}</p>
            <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 tabular-nums">
              <dt className="text-ink-muted">{copy.score}</dt>
              <dd className="text-right font-medium text-ink">{fmtScore(active.score)}</dd>
              <dt className="text-ink-muted">{copy.inputPrice}</dt>
              <dd className="text-right text-ink">{formatPrice(active.inputPerM, lang)}</dd>
              <dt className="text-ink-muted">{copy.outputPrice}</dt>
              <dd className="text-right text-ink">{formatPrice(active.outputPerM, lang)}</dd>
              <dt className="text-ink-muted">{copy.rank}</dt>
              <dd className="text-right text-ink">#{active.rank}</dd>
            </dl>
            {active.efficient ? <p className="mt-1.5 font-medium text-accent">★ {copy.efficientBadge}</p> : null}
          </div>
        ) : null}
      </div>

      <p id={`${uid}-status`} className="sr-only" aria-live="polite">
        {statusText}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-ink-muted">
        <span className="inline-flex items-center gap-1.5">
          <svg width="22" height="8" aria-hidden="true">
            <line x1="0" y1="4" x2="22" y2="4" stroke="var(--ink-muted)" strokeWidth="1.25" strokeDasharray="4 4" />
          </svg>
          {copy.efficientLegend}
        </span>
        {providers.map(([id, label]) => (
          <span key={id} className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: providerColor(id) }} />
            {label}
          </span>
        ))}
      </div>
      <p className="mt-1.5 text-[11px] text-ink-muted">
        {copy.keys}
        {excluded > 0 ? ` ${copy.excluded.replace("{n}", String(excluded))}` : ""}
      </p>
    </div>
  );
}
