// components/blog/ArticleCardItem.tsx
//
// v1.4.0 — one AI Daily feed card.
// v1.4.1 — weekly editions carry a chip; the daily card is untouched.
//
// The whole card is a single Link, so there is exactly one tab stop per
// article and the click target is the full surface. Nothing inside is
// interactive for that reason.

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
 * The calendar day to show. `publishedAt` is a UTC instant, so it is converted
 * back to the editorial timezone rather than sliced — otherwise an article
 * published after 21:00 ART would display tomorrow's date.
 */
export function cardDisplayDate(card: Pick<ArticleCard, "publishedAt" | "eventDate">): string {
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
  const categoryLabel = dict.category[card.category] ?? card.category;
  const reading = dict.readingTime.replace("{n}", String(card.readingMinutes));
  const tags = card.tags.slice(0, featured ? 4 : 3);

  // The daily card is unchanged: "daily" is the default cadence. The two weekly
  // editions get a chip so the feed never mixes them up with same-day news.
  const editionLabel =
    card.edition === "daily" ? null : (dict.edition?.[card.edition] ?? card.edition);

  return (
    <article className="h-full">
      <Link
        href={`/${lang}/blog/${card.slug}`}
        className={[
          "surface flex h-full flex-col gap-2 transition-colors hover:border-line-strong",
          featured ? "p-6 sm:p-8" : "p-5",
        ].join(" ")}
      >
        <div className="flex flex-wrap items-center gap-2">
          {featured ? <span className="badge badge-accent">{dict.featured}</span> : null}
          {editionLabel ? <span className="badge badge-info">{editionLabel}</span> : null}
          <span className="badge badge-neutral">{categoryLabel}</span>
          <time dateTime={card.publishedAt ?? card.eventDate} className="text-xs opacity-70">
            {formatEditorialDate(date, lang)}
          </time>
          <span className="text-xs opacity-70" aria-hidden="true">
            ·
          </span>
          <span className="text-xs opacity-70">{reading}</span>
        </div>

        {featured ? (
          <h2 className="font-title font-semibold text-2xl sm:text-3xl leading-tight">{card.title}</h2>
        ) : (
          <h3 className="font-title font-semibold text-base sm:text-lg leading-snug">{card.title}</h3>
        )}

        <p
          className={[
            "opacity-80",
            featured ? "text-sm sm:text-base" : "text-sm line-clamp-3",
          ].join(" ")}
        >
          {card.deck}
        </p>

        {tags.length > 0 ? (
          <ul className="mt-auto flex flex-wrap gap-1.5 pt-2">
            {tags.map((tag) => (
              <li key={tag} className="badge badge-neutral">
                {tag}
              </li>
            ))}
          </ul>
        ) : null}

        <span className={["text-xs opacity-70", tags.length > 0 ? "pt-1" : "mt-auto pt-2"].join(" ")}>
          {dict.readArticle} →
        </span>
      </Link>
    </article>
  );
}
