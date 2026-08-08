// components/blog/ArticleCardItem.tsx
//
// v1.4.0 — one AI Daily feed card.
// v1.4.1 — weekly editions carry a chip; the daily card is untouched.
// v1.4.2 — the default treatment is an editorial ROW, not a grid card.
//
// Why a row: AI Daily is text-first and has no photography. A three-column
// card grid needs a picture to justify its shape, and with two or three
// articles it reads as a broken layout rather than a deliberate one. A single
// column of dated rows reads correctly at two articles and at fifty, and it is
// what an archive actually looks like.
//
// The `featured` branch is the lead-story treatment. It is kept — the index
// gates it behind an article-count threshold rather than deleting it — because
// promoting a story only makes sense once there is a list underneath it.
//
// The whole row is a single Link, so there is exactly one tab stop per article
// and the click target is the full band. Nothing inside is interactive for
// that reason.

import Link from "next/link";

import { editorialDate, formatEditorialDate } from "@/lib/blog/dates";
import type { ArticleCard } from "@/lib/blog/types";

export type ArticleCardDict = {
  featured: string;
  readArticle: string;
  readingTime: string;
  category: Record<string, string>;
  /**
   * v1.4.1 — `dict.blog.edition`. Optional so a caller that has not wired it yet
   * still compiles; when it is missing the raw edition id is shown rather than
   * dropping the chip, because hiding it would let a recap read as today's news.
   */
  edition?: Record<string, string>;
};

/**
 * The calendar day to show on a feed card.
 *
 * This is the EVENT date — the day the development actually happened — not the
 * day we published it. Two reasons it has to be the event date:
 *   1. The feed is sorted by eventDate, so showing publishedAt would let a
 *      backdated story display a later date than the article above it while
 *      still sorting below it, making the ordering look arbitrary.
 *   2. On a news feed the meaningful question is "when did this happen", which
 *      is also what the article page leads with.
 *
 * `eventDate` is already a YYYY-MM-DD editorial-timezone date, so it needs no
 * conversion. `publishedAt` is only a fallback for a malformed document, and it
 * IS converted through editorialDate() rather than sliced — otherwise an
 * article published after 21:00 ART would show tomorrow's date.
 */
export function cardDisplayDate(card: Pick<ArticleCard, "publishedAt" | "eventDate">): string {
  if (card.eventDate) return card.eventDate;
  if (card.publishedAt) {
    const d = new Date(card.publishedAt);
    if (!Number.isNaN(d.getTime())) return editorialDate(d);
  }
  return card.eventDate;
}

export default function ArticleCardItem({
  card,
  lang,
  dict,
  featured = false,
}: {
  card: ArticleCard;
  lang: "es" | "en";
  dict: ArticleCardDict;
  featured?: boolean;
}) {
  const date = cardDisplayDate(card);
  const displayDate = formatEditorialDate(date, lang);
  // The machine-readable value must match what is rendered, so it tracks the
  // same event date rather than the publication instant.
  const machineDate = date;
  const categoryLabel = dict.category[card.category] ?? card.category;
  const reading = dict.readingTime.replace("{n}", String(card.readingMinutes));
  const href = `/${lang}/blog/${card.slug}`;

  // The daily card is unchanged: "daily" is the default cadence. The two weekly
  // editions get a chip so the feed never mixes them up with same-day news.
  const editionLabel =
    card.edition === "daily" ? null : (dict.edition?.[card.edition] ?? card.edition);

  if (featured) {
    const tags = card.tags.slice(0, 4);

    return (
      <article>
        <Link href={href} className="blog-lead surface block p-6 sm:p-8 md:p-10">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="badge badge-accent">{dict.featured}</span>
            {editionLabel ? <span className="badge badge-info">{editionLabel}</span> : null}
            <span className="badge badge-neutral">{categoryLabel}</span>
          </div>

          <h2 className="blog-row-title font-title mt-4 text-2xl font-semibold leading-tight sm:text-3xl md:text-4xl">
            {card.title}
          </h2>

          <p className="mt-3 max-w-[62ch] text-base leading-relaxed text-ink-muted sm:text-lg">
            {card.deck}
          </p>

          {tags.length > 0 ? (
            <ul className="mt-5 flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <li key={tag} className="badge badge-neutral">
                  {tag}
                </li>
              ))}
            </ul>
          ) : null}

          <p className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted">
            <time dateTime={machineDate} className="tabular-nums">
              {displayDate}
            </time>
            <span aria-hidden="true">·</span>
            <span>{reading}</span>
            <span aria-hidden="true">·</span>
            <span className="font-medium text-accent">{dict.readArticle}</span>
            <span className="blog-row-arrow inline-block text-accent" aria-hidden="true">
              →
            </span>
          </p>
        </Link>
      </article>
    );
  }

  return (
    <article>
      <Link
        href={href}
        // The negative margin lets the hover band bleed past the text column
        // while the row's own padding keeps the headline flush with the section
        // rule above it. `main` has matching horizontal padding, so the bleed
        // can never create a horizontal scrollbar.
        className="blog-row -mx-3 grid gap-x-6 gap-y-2 rounded-xl px-3 py-6
                   sm:-mx-4 sm:px-4 sm:py-7 md:grid-cols-[7rem_minmax(0,1fr)]"
      >
        <time dateTime={machineDate} className="text-xs tabular-nums text-ink-muted md:pt-1">
          {displayDate}
        </time>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="badge badge-neutral">{categoryLabel}</span>
            {editionLabel ? <span className="badge badge-info">{editionLabel}</span> : null}
          </div>

          <h3 className="blog-row-title font-title mt-2 text-lg font-semibold leading-snug sm:text-xl md:text-[1.375rem]">
            {card.title}
          </h3>

          <p className="mt-2 line-clamp-2 max-w-[68ch] text-[0.9375rem] leading-relaxed text-ink-muted sm:text-base">
            {card.deck}
          </p>

          <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-muted">
            <span>{reading}</span>
            <span className="blog-row-arrow inline-block" aria-hidden="true">
              →
            </span>
          </p>
        </div>
      </Link>
    </article>
  );
}
