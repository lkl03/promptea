// app/[lang]/weekly/page.tsx
//
// Promptea Weekly preview page.
//
// A single-column editorial preview of the latest newsletter edition. When no
// edition exists yet (first-run or Firestore unreachable), the page degrades
// to an empty state with the subscribe CTA — same principle as the blog index.
//
// Server component: the SubscribeCTA is the only client island.

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { getDictionary, hasLocale } from "../dictionaries";
import { getLatestEdition } from "@/lib/newsletter/server";
import { formatEditorialDate } from "@/lib/blog/dates";
import WeeklyEditionView from "@/components/newsletter/WeeklyEditionView";
import SubscribeCTA from "@/components/newsletter/SubscribeCTA";
import type { NewsletterEdition } from "@/lib/newsletter/types";

export const revalidate = 300;

/**
 * Firestore is never allowed to break the page: a failure reads as "no edition
 * yet", and the empty state with the subscribe CTA is the correct shape for
 * that scenario.
 */
async function loadEdition(): Promise<NewsletterEdition | null> {
  try {
    return await getLatestEdition();
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const l = lang === "en" ? "en" : "es";

  const dict = await getDictionary(l);
  const t = dict.newsletter;

  const canonical = `/${l}/weekly`;
  const title = `${t.title} — Promptea`;

  return {
    title,
    description: t.subtitle,
    alternates: {
      canonical,
      languages: { es: "/es/weekly", en: "/en/weekly" },
    },
    openGraph: {
      title,
      description: t.subtitle,
      url: canonical,
      type: "website",
      locale: l === "en" ? "en_US" : "es_AR",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: t.subtitle,
    },
  };
}

export default async function WeeklyPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const l = (lang === "en" ? "en" : "es") as "es" | "en";

  const dict = await getDictionary(l);
  const t = dict.newsletter;

  const edition = await loadEdition();

  return (
    <main className="mx-auto w-full max-w-[680px] px-4 pt-8 pb-16 sm:pt-10">
      <p className="text-xs">
        <Link
          href={`/${l}`}
          className="text-ink-muted underline-offset-4 transition-colors hover:text-ink hover:underline"
        >
          {l === "es" ? "← Volver al inicio" : "← Back to home"}
        </Link>
      </p>

      {/* ── Masthead ────────────────────────────────────────────────── */}
      <header className="mt-5 text-center sm:mt-10">
        <h1 className="font-title text-4xl font-semibold leading-[1.06] sm:text-5xl">
          {t.title}
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-base text-ink-muted sm:mt-3 sm:text-lg">
          {t.subtitle}
        </p>

        {edition ? (
          <p className="mt-3 text-xs tabular-nums text-ink-faint">
            {t.editionLabel}: {formatEditorialDate(edition.weekStart, l)} —{" "}
            {formatEditorialDate(edition.weekEnd, l)}
          </p>
        ) : null}
      </header>

      {edition ? (
        <>
          {/* ── Edition content ────────────────────────────────────── */}
          <div className="mt-10 sm:mt-12">
            <WeeklyEditionView edition={edition} lang={l} dict={t} />
          </div>

          {/* ── Subscribe CTA at the bottom ────────────────────────── */}
          <div className="mt-12">
            <SubscribeCTA lang={l} dict={t.subscribe} />
          </div>
        </>
      ) : (
        /* ── Empty state: no edition published yet ────────────────── */
        <>
          <section className="surface mt-10 p-8 text-center sm:p-10">
            <h2 className="font-title text-xl font-semibold sm:text-2xl">
              {t.emptyTitle}
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-ink-muted">
              {t.empty}
            </p>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <Link className="btn btn-primary h-9 px-4" href={`/${l}/blog`}>
                {l === "es" ? "Explorar AI Daily" : "Explore AI Daily"}
              </Link>
            </div>
          </section>

          <div className="mt-10">
            <SubscribeCTA lang={l} dict={t.subscribe} />
          </div>
        </>
      )}
    </main>
  );
}
