// components/home/LatestDaily.tsx
//
// v1.8.0 — "Latest in AI Daily" on the homepage: the newest stories with
// title, deck, label, reading time and a direct link. Server component: the
// articles come from one Firestore query. When nothing could be loaded
// (outage, no credentials, empty blog) it degrades to the plain AI Daily card
// — never to an empty box.
//
// v1.8.1:
//   - layout: the top story spans the full width and the rest sit in equal
//     columns below it. (v1.8.0 put the top story next to a taller list, so
//     its card stretched and showed a large empty area under the text.)
//   - the two destinations are buttons with a hierarchy: "See all stories" is
//     the primary (filled), "Weekly digest" the secondary (ghost);
//   - weekly editions show their edition ("Week ahead", "Week in review")
//     instead of their catch-all category ("Other" / "Digest").

import Link from "next/link";
import type { PublicArticle } from "@/lib/blog/types";
import { formatEditorialDate } from "@/lib/blog/dates";
import { cardDisplayDate } from "@/components/blog/ArticleCardItem";
import { LANG_TAG, contentIsFallback, contentLangFor, type Lang } from "@/lib/domain";

type Dict = {
  title: string;
  subtitle: string;
  all: string;
  weekly: string;
  lead: string;
  /** v1.8.3: shown only where the stories are not in the interface language (/pt). */
  langNote: string;
};

export type LatestArticle = Pick<PublicArticle, "slug" | "title" | "deck" | "category" | "edition" | "readingMinutes" | "eventDate" | "publishedAt">;

/**
 * The label of a story in a list. Daily stories are labelled by topic; the two
 * weekly editions are labelled by what they ARE, because their category is a
 * catch-all ("other", "digest") that says nothing to a reader.
 */
export function storyLabel(a: Pick<LatestArticle, "category" | "edition">, categories: Record<string, string>, editions: Record<string, string>): string {
  if (a.edition === "week-ahead" || a.edition === "weekly-recap") return editions[a.edition] ?? categories[a.category] ?? a.category;
  return categories[a.category] ?? a.category;
}

export default function LatestDaily({
  articles,
  lang,
  dict,
  categories,
  editions,
  readingTime,
  fallback,
}: {
  articles: LatestArticle[];
  lang: Lang;
  dict: Dict;
  categories: Record<string, string>;
  editions: Record<string, string>;
  readingTime: string;
  fallback: { title: string; body: string };
}) {
  if (articles.length === 0) {
    return (
      <section aria-labelledby="latest-title">
        <Link href={`/${lang}/blog`} className="hub-card group">
          <h2 id="latest-title" className="font-title text-lg font-semibold leading-snug text-ink sm:text-xl">
            {fallback.title} <span aria-hidden="true" className="hub-card-arrow text-accent">→</span>
          </h2>
          <p className="text-sm leading-relaxed text-ink-muted">{fallback.body}</p>
        </Link>
      </section>
    );
  }

  const [lead, ...rest] = articles;
  // v1.8.3: under /pt the stories are the English edition. The block now says so
  // (the blog pages already did) and marks the English text with its language.
  const fallbackContent = contentIsFallback(lang);
  const contentLangTag = fallbackContent ? LANG_TAG[contentLangFor(lang)] : undefined;
  // The top story shows label, date and reading time; the narrower secondary
  // stories keep label + date so the line never wraps mid-way.
  const meta = (a: LatestArticle, full: boolean) => {
    const date = cardDisplayDate(a);
    return (
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted">
        <span className="badge badge-accent">{storyLabel(a, categories, editions)}</span>
        <time dateTime={date}>{formatEditorialDate(date, lang)}</time>
        {full ? (
          <>
            <span aria-hidden="true">·</span>
            <span>{readingTime.replace("{n}", String(a.readingMinutes))}</span>
          </>
        ) : null}
      </p>
    );
  };
  // 1, 2 or 3 secondary stories: as many equal columns, so the row is always full.
  const cols = rest.length >= 3 ? "sm:grid-cols-3" : rest.length === 2 ? "sm:grid-cols-2" : "";

  return (
    <section aria-labelledby="latest-title" className="surface p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <h2 id="latest-title" className="font-title text-xl font-semibold sm:text-2xl">
            {dict.title}
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            {dict.subtitle}
            {fallbackContent ? <span data-content-lang-notice> {dict.langNote}</span> : null}
          </p>
        </div>
        <p className="flex flex-wrap items-center gap-2">
          <Link href={`/${lang}/blog/weekly`} className="btn btn-ghost h-9 px-4">
            {dict.weekly}
          </Link>
          <Link href={`/${lang}/blog`} className="btn btn-primary h-9 px-4">
            {dict.all} <span aria-hidden="true">→</span>
          </Link>
        </p>
      </div>

      <Link href={`/${lang}/blog/${lead.slug}`} className="blog-lead group mt-5 block rounded-xl border border-line p-4 sm:p-5">
        <span className="sr-only">{dict.lead}: </span>
        {meta(lead, true)}
        <h3 lang={contentLangTag} className="blog-row-title mt-3 font-title text-xl font-semibold leading-snug text-ink sm:text-2xl">{lead.title}</h3>
        {lead.deck ? <p lang={contentLangTag} className="mt-2 line-clamp-3 max-w-3xl text-sm leading-relaxed text-ink-muted">{lead.deck}</p> : null}
      </Link>

      {rest.length > 0 ? (
        <ul className={["m-0 mt-2 grid list-none grid-cols-1 gap-x-2 gap-y-1 p-0", cols].join(" ")}>
          {rest.map((a) => (
            <li key={a.slug} className="min-w-0">
              <Link href={`/${lang}/blog/${a.slug}`} className="blog-row group block h-full rounded-xl px-3 py-3">
                {meta(a, false)}
                <h3 lang={contentLangTag} className="blog-row-title mt-1.5 font-title text-base font-semibold leading-snug text-ink">{a.title}</h3>
                {a.deck ? <p lang={contentLangTag} className="mt-1 line-clamp-2 text-sm leading-relaxed text-ink-muted">{a.deck}</p> : null}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
