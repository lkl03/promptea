// components/benchmarks/ProviderShareDonut.tsx
//
// v1.8.1 — a donut of how the top-N of the selected benchmark splits by
// provider (count of models; it describes the ranking next to it, it is not a
// market-share claim). Plain SVG, no chart library.
//
// Colour is never the only cue: every slice is listed in a real table with the
// provider name, its model count and its percentage, in the same order the
// slices are drawn (clockwise from the top), and slices are separated by a
// gap. The figure is role="img" with a full text description; the table is the
// equivalent data. Nothing animates.

import type { ProviderSlice } from "@/lib/benchmarks/chart";
import { donutArcs, providerColor } from "@/lib/benchmarks/chart";
import { type Lang, INTL_LOCALE } from "@/lib/domain";

export type ShareCopy = {
  title: string; // "Providers in the top {n}"
  intro: string;
  desc: string; // "Donut chart: … {items}."
  item: string; // "{provider}: {count} ({pct})"
  other: string;
  colProvider: string;
  colModels: string;
  colShare: string;
  center: string; // "models"
};

const SIZE = 168;
const R = 62;
const STROKE = 26;
const C = 2 * Math.PI * R;
/** Neutral tone for the grouped tail: it is not a provider, so it gets no provider hue. */
const OTHER_COLOR = "var(--ink-faint)";

function pct(share: number, lang: Lang): string {
  return new Intl.NumberFormat(INTL_LOCALE[lang], { style: "percent", maximumFractionDigits: 0 }).format(share);
}

export default function ProviderShareDonut({
  slices,
  total,
  lang,
  copy,
  sourceLine,
  highlightProvider,
}: {
  slices: ProviderSlice[];
  total: number;
  lang: Lang;
  copy: ShareCopy;
  sourceLine: string;
  highlightProvider?: string | null;
}) {
  if (slices.length === 0 || total === 0) return null;
  const arcs = donutArcs(slices.map((s) => s.share));
  const name = (s: ProviderSlice) => (s.grouped ? copy.other : s.label);
  const title = copy.title.replace("{n}", String(total));
  const items = slices
    .map((s) => copy.item.replace("{provider}", name(s)).replace("{count}", String(s.count)).replace("{pct}", pct(s.share, lang)))
    .join("; ");
  const desc = copy.desc.replace("{n}", String(total)).replace("{items}", items);
  // A visible gap between slices (skipped when one provider holds everything).
  const gap = slices.length > 1 ? 3 : 0;

  return (
    <div className="min-w-0">
      <h3 className="text-sm font-medium text-ink">{title}</h3>
      <p className="mt-0.5 text-xs leading-snug text-ink-muted">{copy.intro}</p>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-4">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          width={SIZE}
          height={SIZE}
          role="img"
          aria-label={title}
          aria-describedby="bm-share-desc"
          className="mx-auto h-auto w-[9.5rem] max-w-full shrink-0"
        >
          <desc id="bm-share-desc">{desc}</desc>
          <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="var(--line)" strokeWidth={STROKE} opacity="0.35" />
          <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
            {slices.map((s, i) => {
              const len = Math.max(0, (arcs[i].end - arcs[i].start) * C - gap);
              const dim = Boolean(highlightProvider) && highlightProvider !== s.provider;
              return (
                <circle
                  key={s.provider}
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={R}
                  fill="none"
                  stroke={s.grouped ? OTHER_COLOR : providerColor(s.provider)}
                  strokeWidth={STROKE}
                  strokeDasharray={`${len.toFixed(2)} ${(C - len).toFixed(2)}`}
                  strokeDashoffset={(-(arcs[i].start * C) - gap / 2).toFixed(2)}
                  opacity={dim ? 0.35 : 1}
                />
              );
            })}
          </g>
          <text x="50%" y="47%" textAnchor="middle" dominantBaseline="middle" fill="var(--ink)" fontSize="30" fontWeight="600">
            {total}
          </text>
          <text x="50%" y="63%" textAnchor="middle" dominantBaseline="middle" fill="var(--ink-muted)" fontSize="11">
            {copy.center}
          </text>
        </svg>

        <table className="min-w-[11rem] flex-1 border-collapse text-xs">
          <caption className="sr-only">{title}</caption>
          <thead>
            <tr className="text-left text-[11px] text-ink-muted">
              <th scope="col" className="pb-1.5 pr-2 font-medium">
                {copy.colProvider}
              </th>
              <th scope="col" className="pb-1.5 pr-2 text-right font-medium">
                {copy.colModels}
              </th>
              <th scope="col" className="pb-1.5 text-right font-medium">
                {copy.colShare}
              </th>
            </tr>
          </thead>
          <tbody>
            {slices.map((s) => (
              <tr key={s.provider} className="border-t border-line">
                <th scope="row" className="py-1.5 pr-2 text-left font-medium text-ink">
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
                      style={{ background: s.grouped ? OTHER_COLOR : providerColor(s.provider) }}
                    />
                    <span className="min-w-0 break-words">{name(s)}</span>
                  </span>
                </th>
                <td className="py-1.5 pr-2 text-right tabular-nums text-ink">{s.count}</td>
                <td className="py-1.5 text-right tabular-nums text-ink-muted">{pct(s.share, lang)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[11px] leading-snug text-ink-muted">{sourceLine}</p>
    </div>
  );
}
