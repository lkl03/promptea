// app/[lang]/share/page.tsx
//
// v1.8.0 — the landing page of a shared result card (/{lang}/share?s=…&b=…).
// The URL carries numbers and enums only (lib/share/card.ts); this page shows
// the score and breakdown, states that the prompt text is not part of it, and
// invites the visitor to analyze their own prompt. Its Open Graph image is the
// dynamic /api/share/card image for the same parameters, so the link unfurls
// as a card on X and elsewhere. Not indexed: it is a personal result, not
// content.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary, hasLocale } from "../dictionaries";
import { BREAKDOWN_ORDER, bandColor, decodeCard, encodeCard, qualityBand, targetLabel, type BreakdownKey } from "@/lib/share/card";
import { purposeLabel } from "@/lib/purposes";
import { toLang, type Lang } from "@/lib/domain";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params, searchParams }: { params: Promise<{ lang: string }>; searchParams: SearchParams }): Promise<Metadata> {
  const { lang } = await params;
  const l = toLang(lang);
  const dict = await getDictionary(l);
  const data = decodeCard(await searchParams);
  const image = data
    ? `/api/share/card?${encodeCard({ score: data.score, optimizedScore: data.optimizedScore, breakdown: data.breakdown ? Object.fromEntries(BREAKDOWN_ORDER.map((k, i) => [k, data.breakdown![i]])) : null, purpose: data.purpose, target: data.target })}&lang=${l}`
    : `/api/share/card?lang=${l}`;
  const title = data ? `${dict.share.pageTitle}: ${data.optimizedScore ?? data.score}%` : dict.share.pageTitle;
  return {
    title,
    description: dict.share.pageDescription,
    robots: { index: false, follow: true },
    openGraph: { title, description: dict.share.pageDescription, type: "website", images: [{ url: image, width: 1200, height: 630, alt: title }] },
    twitter: { card: "summary_large_image", title, description: dict.share.pageDescription, images: [image] },
  };
}

export default async function SharePage({ params, searchParams }: { params: Promise<{ lang: string }>; searchParams: SearchParams }) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const l = lang as Lang;
  const dict = await getDictionary(l);
  const t = dict.share;
  const data = decodeCard(await searchParams);

  if (!data) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-16 text-center">
        <h1 className="font-title text-2xl font-semibold">{t.invalidTitle}</h1>
        <p className="mt-2 text-sm text-ink-muted">{t.invalidBody}</p>
        <Link href={`/${l}/analyzer`} className="btn btn-primary mt-6 h-10 px-5">
          {t.cta} →
        </Link>
      </main>
    );
  }

  const main = data.optimizedScore ?? data.score;
  const hasAfter = data.optimizedScore !== null && data.optimizedScore !== data.score;
  const bandKey = { weak: "qualityWeak", fair: "qualityFair", good: "qualityGood", excellent: "qualityExcellent" } as const;
  const bandLabel = dict.results[bandKey[qualityBand(main)]];
  const meta = [data.purpose ? purposeLabel(data.purpose, l) : null, data.target ? targetLabel(data.target) : null].filter(Boolean).join(" · ");

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-16 pt-8 sm:pt-12">
      <section aria-labelledby="share-title" className="surface p-6 sm:p-8">
        <h1 id="share-title" className="sr-only">
          {t.pageTitle}
        </h1>

        <div className="flex flex-col gap-8 sm:flex-row sm:items-center">
          <div className="sm:w-56">
            <p className="text-sm text-ink-muted">{t.score}</p>
            <p className="mt-1 flex items-baseline gap-2 tabular-nums" aria-label={hasAfter ? `${t.before} ${data.score}, ${t.optimized} ${data.optimizedScore}` : `${t.score} ${data.score}`}>
              {hasAfter ? (
                <>
                  <span className="font-title text-3xl font-semibold text-ink-muted">{data.score}</span>
                  <span aria-hidden="true" className="text-xl text-ink-faint">
                    →
                  </span>
                </>
              ) : null}
              <span className="font-title text-6xl font-semibold leading-none" style={{ color: bandColor(main) }}>
                {main}%
              </span>
            </p>
            {bandLabel ? (
              <p className="mt-2 text-sm font-medium" style={{ color: bandColor(main) }}>
                {bandLabel}
              </p>
            ) : null}
            {hasAfter ? (
              <p className="mt-1 text-xs text-ink-muted">
                {t.before} {data.score} · {t.optimized} {data.optimizedScore}
              </p>
            ) : null}
            {meta ? <p className="mt-2 text-xs text-ink-muted">{meta}</p> : null}
          </div>

          {data.breakdown ? (
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-medium text-ink-muted">{t.breakdown}</h2>
              <ul className="mt-3 grid list-none gap-3 p-0">
                {BREAKDOWN_ORDER.map((k: BreakdownKey, i) => (
                  <li key={k}>
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="text-ink">{t.criteria[k]}</span>
                      <span className="font-semibold tabular-nums">{data.breakdown![i]}</span>
                    </div>
                    <div aria-hidden="true" className="mt-1 h-2 rounded-full bg-surface-soft">
                      <div className="h-full rounded-full" style={{ width: `${data.breakdown![i]}%`, background: bandColor(data.breakdown![i]) }} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <p className="mt-8 text-xs text-ink-muted">{t.noPrompt}</p>
      </section>

      <div className="mt-8 text-center">
        <Link href={`/${l}/analyzer`} className="btn btn-primary h-11 px-6">
          {t.cta} →
        </Link>
      </div>
    </main>
  );
}
