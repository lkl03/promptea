// components/home/LatestDaily.tsx
//
// v1.8.0 — "Latest in AI Daily" on the homepage: the 3–4 newest stories with
// title, deck, category, reading time and a direct link, so the blog is no
// longer a click away from any headline. Server component: the articles come
// from the same Firestore query the news marquee already uses. When nothing
// could be loaded (outage, no credentials, empty blog) it degrades to the
// plain AI Daily card — never to an empty box.

import Link from "next/link";
import type { PublicArticle } from "@/lib/blog/types";
import { formatEditorialDate } from "@/lib/blog/dates";
import { cardDisplayDate } from "@/components/blog/ArticleCardItem";

type Dict = {
  title: string;
  subtitle: string;
  all: string;
  weekly: string;
};

export type LatestArticle = Pick<PublicArticle, "slug" | "title" | "deck" | "category" | "readingMinutes" | "eventDate" | "publishedAt">;

export default function LatestDaily({
  articles,
  lang,
  dict,
  categories,
  readingTime,
  fallback,
}: {
  articles: LatestArticle[];
  lang: "es" | "en";
  dict: Dict;
  categories: Record<string, string>;
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
  const meta = (a: LatestArticle) => {
    const date = formatEditorialDate(cardDisplayDate(a), lang);
    return (
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted">
        <span className="badge badge-accent">{categories[a.category] ?? a.category}</span>
        <span>{date}</span>
        <span aria-hidden="true">·</span>
        <span>{readingTime.replace("{n}", String(a.readingMinutes))}</span>
      </p>
    );
  };

  return (
    <section aria-labelledby="latest-title" className="surface p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div>
          <h2 id="latest-title" className="font-title text-xl font-semibold sm:text-2xl">
            {dict.title}
          </h2>
          <p className="mt-1 text-sm text-ink-muted">{dict.subtitle}</p>
        </div>
        <p className="flex items-center gap-4 text-sm">
          <Link href={`/${lang}/blog/weekly`} className="text-ink-muted underline-offset-2 hover:text-ink hover:underline">
            {dict.weekly}
          </Link>
          <Link href={`/${lang}/blog`} className="font-medium text-accent hover:underline">
            {dict.all} →
          </Link>
        </p>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-8">
        <Link href={`/${lang}/blog/${lead.slug}`} className="blog-lead group block rounded-xl border border-line p-4 sm:p-5">
          {meta(lead)}
          <h3 className="blog-row-title mt-3 font-title text-xl font-semibold leading-snug text-ink sm:text-2xl">{lead.title}</h3>
          {lead.deck ? <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink-muted">{lead.deck}</p> : null}
        </Link>

        <ul className="m-0 grid list-none content-start gap-1 p-0">
          {rest.map((a) => (
            <li key={a.slug}>
              <Link href={`/${lang}/blog/${a.slug}`} className="blog-row group block rounded-xl px-3 py-3">
                {meta(a)}
                <h3 className="blog-row-title mt-1.5 font-title text-base font-semibold leading-snug text-ink">{a.title}</h3>
                {a.deck ? <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-ink-muted">{a.deck}</p> : null}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
