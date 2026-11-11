// app/[lang]/blog/weekly/[date]/page.tsx
//
// v1.7.0 — one Promptea Weekly edition, at a stable shareable URL keyed by
// the Monday it was (or will be) sent: /{lang}/blog/weekly/2026-10-05.
// Drafts and unknown weeks 404; an outage renders the honest "unavailable"
// state instead of a 404 so a temporary failure is never cached as "gone".

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { getDictionary, hasLocale } from "../../../dictionaries";
import DailyTabs from "@/components/blog/DailyTabs";
import WeeklyEditionView from "@/components/newsletter/WeeklyEditionView";
import NewsletterDock from "@/components/newsletter/NewsletterDock";
import ShareLink from "@/components/newsletter/ShareLink";
import { getEditionById } from "@/lib/newsletter/server";
import { editionIdForMonday, weeklyArchivePath, weeklyEditionPath } from "@/lib/newsletter/paths";
import { formatEditorialDate } from "@/lib/blog/dates";
import type { NewsletterEdition } from "@/lib/newsletter/types";
import { clampTitle, pageMetadata } from "@/lib/seo/metadata";
import ContentLangNotice from "@/components/blog/ContentLangNotice";
import JsonLd from "@/components/seo/JsonLd";
import { weeklyEditionGraph } from "@/lib/seo/pageGraphs";
import { toLang, type Lang, contentLangFor } from "@/lib/domain";

export const revalidate = 300;

type Params = Promise<{ lang: string; date: string }>;

async function load(date: string): Promise<NewsletterEdition | null | "unavailable"> {
  const id = editionIdForMonday(date);
  if (!id) return null;
  try {
    return await getEditionById(id);
  } catch {
    return "unavailable";
  }
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang, date } = await params;
  const l = toLang(lang);
  const edition = await load(date);
  if (!edition || edition === "unavailable") return { robots: { index: false, follow: true } };
  const cl = contentLangFor(l);
  const c = edition.locales[cl];
  return pageMetadata({
    lang: l,
    contentLang: cl,
    path: weeklyEditionPath(l, edition.editionId),
    // The hero headline is editorial and often runs past 120 characters: the <title> is
    // clamped at a word boundary; social cards keep the full headline.
    title: clampTitle(c.heroHeadline),
    socialTitle: c.heroHeadline,
    description: c.preheader,
    type: "article",
    publishedTime: edition.publishedAt ?? edition.sentAt ?? undefined,
    modifiedTime: edition.sentAt ?? edition.publishedAt ?? undefined,
  });
}

export default async function WeeklyEditionPage({ params }: { params: Params }) {
  const { lang, date } = await params;
  if (!hasLocale(lang)) notFound();
  const l = lang as Lang;
  const cl = contentLangFor(l);
  const dict = await getDictionary(l);
  const t = dict.weekly;

  const edition = await load(date);
  if (edition === null) notFound();

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6 sm:pt-8">
      <DailyTabs lang={l} active="weekly" dict={dict.dailyTabs} />

      <div className="mt-8 grid grid-cols-1 gap-10 sm:mt-10 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-12">
        <div className="mx-auto w-full min-w-0 max-w-3xl">
          <p className="text-xs">
            <Link href={weeklyArchivePath(l)} className="text-ink-muted underline-offset-4 transition-colors hover:text-ink hover:underline">
              {t.backToArchive}
            </Link>
          </p>

          {edition === "unavailable" ? (
            <section className="surface mt-6 p-8 text-center">
              <p className="text-sm text-ink-muted">{t.unavailable}</p>
            </section>
          ) : (
            <article className="mt-5">
              <ContentLangNotice
                lang={l}
                text={dict.blog.langNotice}
                hrefs={{ es: weeklyEditionPath("es", edition.editionId), en: weeklyEditionPath("en", edition.editionId) }}
                className="mb-6"
              />
              <JsonLd data={weeklyEditionGraph(edition, cl)} />
              <header>
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-accent">{dict.newsletter.title}</p>
                <p className="mt-2 text-sm tabular-nums text-ink-muted">
                  {t.weekOf.replace("{from}", formatEditorialDate(edition.weekStart, l)).replace("{to}", formatEditorialDate(edition.weekEnd, l))}
                </p>
              </header>
              <div className="mt-6">
                <WeeklyEditionView edition={edition} lang={l} dict={dict.newsletter} headingLevel={1} />
              </div>
              <div className="mt-10 flex justify-center">
                <ShareLink label={t.share} copied={t.copied} title={edition.locales[cl].subject} />
              </div>
            </article>
          )}
        </div>

        <NewsletterDock lang={l} dict={dict.newsletterDock} formDict={dict.newsletter.bar} />
      </div>
    </main>
  );
}
