// components/home/BenchmarksTeaser.tsx
//
// v1.8.0 — "Benchmarks at a glance": the top of one real ranking as mini bars,
// with its source and date, and a link to the full page. Server component fed
// by getBenchmarks() (live → last valid snapshot); with no snapshot the home
// shows the plain Benchmarks card instead — never made-up numbers.

import Link from "next/link";
import type { Teaser } from "@/lib/benchmarks/teaser";
import { providerColor } from "@/lib/benchmarks/chart";
import { formatScore } from "@/lib/benchmarks/normalize";
import { SOURCE_INFO } from "@/lib/benchmarks/catalog";

type Dict = { title: string; subtitle: string; cta: string; source: string };

export default function BenchmarksTeaser({
  teaser,
  lang,
  dict,
  dateLabel,
  fallback,
}: {
  teaser: Teaser | null;
  lang: "es" | "en";
  dict: Dict;
  dateLabel: string | null;
  fallback: { title: string; body: string };
}) {
  if (!teaser) {
    return (
      <section aria-labelledby="teaser-title">
        <Link href={`/${lang}/benchmarks`} className="hub-card group">
          <h2 id="teaser-title" className="font-title text-lg font-semibold leading-snug text-ink sm:text-xl">
            {fallback.title} <span aria-hidden="true" className="hub-card-arrow text-accent">→</span>
          </h2>
          <p className="text-sm leading-relaxed text-ink-muted">{fallback.body}</p>
        </Link>
      </section>
    );
  }

  const { def, rows } = teaser;
  const src = SOURCE_INFO[def.source].name;
  return (
    <section aria-labelledby="teaser-title" className="surface p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div>
          <h2 id="teaser-title" className="font-title text-xl font-semibold sm:text-2xl">
            {dict.title}
          </h2>
          <p className="mt-1 text-sm text-ink-muted">{dict.subtitle.replace("{benchmark}", def.label[lang])}</p>
        </div>
        <Link href={`/${lang}/benchmarks`} className="text-sm font-medium text-accent hover:underline">
          {dict.cta} →
        </Link>
      </div>

      <ol className="mt-5 grid list-none gap-3 p-0">
        {rows.map((r) => (
          <li key={r.modelId}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate">
                <span className="mr-1.5 tabular-nums text-ink-faint">{r.rank}</span>
                <span className="font-medium text-ink">{r.name}</span>
                <span className="ml-1.5 text-xs text-ink-muted">{r.providerLabel}</span>
              </span>
              <span className="shrink-0 font-semibold tabular-nums text-ink">{formatScore(r.value, def.metric, lang)}</span>
            </div>
            {r.ratio > 0 ? (
              <div aria-hidden="true" className="mt-1 h-2 rounded-sm bg-surface-soft/70">
                <div className="h-full rounded-sm" style={{ width: `${(r.ratio * 100).toFixed(1)}%`, background: providerColor(r.provider) }} />
              </div>
            ) : null}
          </li>
        ))}
      </ol>

      <p className="mt-4 text-[11px] text-ink-muted">{dict.source.replace("{source}", src).replace("{date}", dateLabel ?? "")}</p>
    </section>
  );
}
