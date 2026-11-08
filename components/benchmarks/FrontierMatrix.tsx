// components/benchmarks/FrontierMatrix.tsx
//
// v1.8.0 — "Frontier models" as a compact matrix (models × the general-
// capability benchmarks) instead of a dozen cards. Each cell is the model's
// rank in that benchmark with its score under it; a top-N cell is tinted, a
// missing one reads "—" (not measured, never zero). Plain server markup: a
// real <table> with row and column headers, scrollable on small screens with
// a sticky model column.

import Link from "next/link";
import type { FrontierMatrix as Matrix } from "@/lib/benchmarks/chart";
import { PROVIDER_TO_PROMPTEA } from "@/lib/benchmarks/catalog";
import { formatScore, FRONTIER_TOP_N } from "@/lib/benchmarks/normalize";
import { providerColor } from "@/lib/benchmarks/chart";

export type MatrixCopy = {
  caption: string;
  model: string;
  rankIn: string; // "Rank in {benchmark}" (title)
  notMeasured: string;
  guide: string;
};

export default function FrontierMatrix({ matrix, lang, copy }: { matrix: Matrix; lang: "es" | "en"; copy: MatrixCopy }) {
  return (
    <div className="surface-soft overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-left text-sm">
        <caption className="sr-only">{copy.caption}</caption>
        <thead>
          <tr className="border-b border-line text-xs text-ink-muted">
            <th scope="col" className="sticky left-0 z-10 bg-[var(--overlay-fill)] px-3 py-3 font-medium">
              {copy.model}
            </th>
            {matrix.columns.map((c) => (
              <th key={c.key} scope="col" className="px-3 py-3 text-center font-medium">
                {c.label[lang]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.rows.map((r) => {
            const promptea = PROVIDER_TO_PROMPTEA[r.provider];
            return (
              <tr key={r.modelId} className="border-b border-line last:border-b-0">
                <th scope="row" className="sticky left-0 z-10 bg-[var(--overlay-fill)] px-3 py-2.5 font-normal">
                  <span className="flex items-center gap-2">
                    <span aria-hidden="true" className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: providerColor(r.provider) }} />
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-ink">{r.name}</span>
                      <span className="block text-[11px] text-ink-muted">
                        {r.providerLabel}
                        {promptea ? (
                          <>
                            {" · "}
                            <Link href={`/${lang}/models/${promptea.modelPage}`} className="text-accent hover:underline">
                              {copy.guide}
                            </Link>
                          </>
                        ) : null}
                      </span>
                    </span>
                  </span>
                </th>
                {r.cells.map((cell, i) => {
                  const col = matrix.columns[i];
                  const top = cell !== null && cell.rank <= FRONTIER_TOP_N;
                  return (
                    <td
                      key={col.key}
                      title={cell ? copy.rankIn.replace("{benchmark}", col.label[lang]) : copy.notMeasured}
                      className={["px-3 py-2.5 text-center tabular-nums", top ? "bg-accent-soft" : ""].join(" ")}
                    >
                      {cell ? (
                        <>
                          <span className={top ? "font-semibold text-ink" : "text-ink"}>#{cell.rank}</span>
                          <span className="block text-[11px] text-ink-muted">{formatScore(cell.value, col.metric, lang)}</span>
                        </>
                      ) : (
                        <span className="text-ink-faint" aria-label={copy.notMeasured}>
                          —
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

