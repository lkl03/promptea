// app/[lang]/blog/weekly/page.tsx
//
// v1.7.0 — AI Daily → Weekly digest: the archive of every published Promptea
// Weekly edition, newest first. Replaces the v1.5–v1.6 /weekly preview page,
// which only ever tried to show the latest edition — and, because its query
// needed a Firestore index that never existed, showed none (see
// lib/newsletter/server.ts). /{lang}/weekly now redirects here.
//
// An outage is not "no editions": the two states have different copy.

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { getDictionary, hasLocale } from "../../dictionaries";
import DailyTabs from "@/components/blog/DailyTabs";
import NewsletterDock from "@/components/newsletter/NewsletterDock";
import { listPublicEditions } from "@/lib/newsletter/server";
import { summarizeEdition, type EditionSummary } from "@/lib/newsletter/archive";
import { weeklyArchivePath, weeklyEditionPath } from "@/lib/newsletter/paths";
import { formatEditorialDate } from "@/lib/blog/dates";

export const revalidate = 300;

async function loadArchive(): Promise<{ ok: true; editions: EditionSummary[] } | { ok: false }> {
  try {
    return { ok: true, editions: (await listPublicEditions()).map(summarizeEdition) };
  } catch {
    return { ok: false };
  }
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const l = lang === "en" ? "en" : "es";
  const dict = await getDictionary(l);
  const t = dict.weekly;
  const canonical = weeklyArchivePath(l);
  const title = `${t.archiveTitle} — ${dict.blog.indexTitle}`;
  return {
    title,
    description: t.archiveIntro,
    alternates: { canonical, languages: { es: weeklyArchivePath("es"), en: weeklyArchivePath("en") } },
    openGraph: { title, description: t.archiveIntro, url: canonical, type: "website", locale: l === "en" ? "en_US" : "es_AR" },
    twitter: { card: "summary_large_image", title, description: t.archiveIntro },
  };
}

function weekRange(e: EditionSummary, l: "es" | "en", template: string) {
  return template
    .replace("{from}", formatEditorialDate(e.weekStart, l))
    .replace("{to}", formatEditorialDate(e.weekEnd, l));
}

export default async function WeeklyArchivePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const l = lang as "es" | "en";

  const dict = await getDictionary(l);
  const t = dict.weekly;
  const archive = await loadArchive();
  const editions = archive.ok ? archive.editions : [];
  const [latest, ...past] = editions;

  const count = (e: EditionSummary) => (e.stories[l] === 1 ? t.storyCount : t.storiesCount.replace("{n}", String(e.stories[l])));
  const badge = (e: EditionSummary) =>
    e.status === "sent" ? <span className="badge badge-accent">{t.sentBadge}</span> : <span className="badge badge-neutral">{t.publishedBadge}</span>;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6 sm:pt-8">
      <DailyTabs lang={l} active="weekly" dict={dict.dailyTabs} />

      <div className="mt-8 grid grid-cols-1 gap-10 sm:mt-10 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-12">
        <div className="mx-auto w-full min-w-0 max-w-3xl">
          <header>
            <h1 className="font-title text-3xl font-semibold leading-tight sm:text-4xl">{t.archiveTitle}</h1>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-ink-muted">{t.archiveIntro}</p>
          </header>

          {!archive.ok ? (
            <section className="surface mt-10 p-8 text-center">
              <p className="text-sm text-ink-muted">{t.unavailable}</p>
            </section>
          ) : !latest ? (
            <section className="surface mt-10 p-8 text-center sm:p-10">
              <h2 className="font-title text-xl font-semibold">{t.emptyTitle}</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">{t.empty}</p>
              <Link className="btn btn-primary mt-5 h-9 px-4" href={`/${l}/blog`}>
                {dict.dailyTabs.news}
              </Link>
            </section>
          ) : (
            <>
              <section aria-labelledby="weekly-latest" className="mt-10">
                <h2 id="weekly-latest" className="text-xs font-medium uppercase tracking-[0.14em] text-ink-muted">
                  {t.latestLabel}
                </h2>
                <Link href={weeklyEditionPath(l, latest.editionId)} className="surface blog-lead group mt-3 block p-6 sm:p-8">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                    {badge(latest)}
                    <span className="tabular-nums">{weekRange(latest, l, t.weekOf)}</span>
                    <span aria-hidden="true">·</span>
                    <span>{count(latest)}</span>
                  </div>
                  <h3 className="blog-row-title font-title mt-3 text-2xl font-semibold leading-snug sm:text-3xl">{latest.headline[l]}</h3>
                  <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-muted">{latest.deck[l]}</p>
                  <p className="mt-5 text-sm font-medium text-accent">
                    {t.readEdition} <span aria-hidden="true" className="blog-row-arrow inline-block">→</span>
                  </p>
                </Link>
              </section>

              {past.length > 0 ? (
                <section aria-labelledby="weekly-past" className="mt-12">
                  <h2 id="weekly-past" className="border-b border-line pb-3 font-title text-lg font-semibold">
                    {t.archiveLabel}
                  </h2>
                  <ul>
                    {past.map((e) => (
                      <li key={e.editionId} className="border-b border-line last:border-b-0">
                        <Link href={weeklyEditionPath(l, e.editionId)} className="blog-row group -mx-3 block rounded-xl px-3 py-5">
                          <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                            <span className="tabular-nums">{weekRange(e, l, t.weekOf)}</span>
                            <span aria-hidden="true">·</span>
                            <span>{count(e)}</span>
                          </div>
                          <h3 className="blog-row-title font-title mt-1.5 text-lg font-semibold leading-snug">{e.headline[l]}</h3>
                          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-ink-muted">{e.deck[l]}</p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </>
          )}
        </div>

        <NewsletterDock lang={l} dict={dict.newsletterDock} formDict={dict.newsletter.bar} />
      </div>
    </main>
  );
}
