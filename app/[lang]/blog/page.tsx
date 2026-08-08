// app/[lang]/blog/page.tsx
//
// v1.4.0 — the AI Daily index.
//
// Two deliberate choices:
//   * Firestore is optional at render time. A missing service account (local
//     `next build`) or an outage degrades to an empty feed, never a 500.
//   * Pagination is a real <Link> to `?cursor=…`, so every older article stays
//     reachable by a crawler with JavaScript disabled. There is no
//     infinite-scroll-only path.

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { getDictionary, hasLocale } from "../dictionaries";
import ArticleCardItem from "@/components/blog/ArticleCardItem";
import { blogFeedPath, blogIndexJsonLd } from "@/lib/blog/jsonld";
import { listPublishedArticles } from "@/lib/blog/server";
import type { ArticleCard } from "@/lib/blog/types";
import { getSiteUrl } from "@/lib/seo/site";

export const revalidate = 300;

const PAGE_SIZE = 21;

type Feed = { cards: ArticleCard[]; nextCursor: string | null };

/** Never let a Firestore problem break the page — an empty feed is a valid state. */
async function loadFeed(lang: "es" | "en", cursor: string | null): Promise<Feed> {
  try {
    return await listPublishedArticles({ lang, limit: PAGE_SIZE, cursorPublishedAt: cursor });
  } catch {
    return { cards: [], nextCursor: null };
  }
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ cursor?: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const { cursor } = await searchParams;
  const l = lang === "en" ? "en" : "es";

  const dict = await getDictionary(l);
  const t = dict.blog;

  const canonical = cursor ? `/${l}/blog?cursor=${encodeURIComponent(cursor)}` : `/${l}/blog`;
  const title = `${t.indexTitle} — ${t.tagline}`;

  return {
    title,
    description: t.indexDescription,
    alternates: {
      canonical,
      languages: { es: "/es/blog", en: "/en/blog" },
      // Emits <link rel="alternate" type="application/rss+xml"> so feed readers
      // and crawlers can discover the locale feed from the index.
      types: { "application/rss+xml": blogFeedPath(l) },
    },
    openGraph: {
      title,
      description: t.indexDescription,
      url: canonical,
      type: "website",
      locale: l === "en" ? "en_US" : "es_AR",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: t.indexDescription,
    },
  };
}

export default async function BlogIndexPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ cursor?: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const l = (lang === "en" ? "en" : "es") as "es" | "en";

  const { cursor } = await searchParams;
  const activeCursor = typeof cursor === "string" && cursor.length > 0 ? cursor : null;

  const dict = await getDictionary(l);
  const t = dict.blog;

  const { cards, nextCursor } = await loadFeed(l, activeCursor);

  const cardDict = {
    featured: t.featured,
    readArticle: t.readArticle,
    readingTime: t.readingTime,
    category: t.category,
  };

  // Only the first page has a lead story; page 2+ is a plain chronological list.
  const featured = activeCursor ? null : (cards[0] ?? null);
  const rest = featured ? cards.slice(1) : cards;

  const indexLd = blogIndexJsonLd({
    lang: l,
    title: t.indexTitle,
    description: t.indexDescription,
    items: cards,
    siteUrl: getSiteUrl(),
  });

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-12 pb-12 3xl:max-w-7xl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(indexLd) }} />

      <div className="mx-auto max-w-3xl text-center space-y-2">
        <h1 className="font-title text-3xl sm:text-4xl font-semibold">{t.indexTitle}</h1>
        <p className="opacity-80 text-sm sm:text-base">{t.indexDescription}</p>

        <p className="pt-1 text-xs opacity-70">{t.editorialNote}</p>

        <div className="pt-2 text-xs opacity-70">
          <Link href={`/${l}`} className="hover:underline underline-offset-2">
            {l === "es" ? "← Volver al inicio" : "← Back to home"}
          </Link>
        </div>
      </div>

      {cards.length === 0 ? (
        <section className="mt-10 surface p-8 sm:p-10 text-center">
          <h2 className="font-title text-xl sm:text-2xl font-semibold">{t.emptyTitle}</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm opacity-80">{t.empty}</p>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <Link className="btn btn-primary h-9 px-4" href={`/${l}/guides`}>
              {t.relatedGuides}
            </Link>
            <Link className="btn h-9 px-4" href={`/${l}/models`}>
              {t.relatedModels}
            </Link>
          </div>

          {activeCursor ? (
            <div className="mt-4 text-xs opacity-70">
              <Link href={`/${l}/blog`} className="hover:underline underline-offset-2">
                {t.backToBlog}
              </Link>
            </div>
          ) : null}
        </section>
      ) : (
        <>
          {featured ? (
            <section aria-label={t.featured} className="mt-10">
              <ArticleCardItem card={featured} lang={l} dict={cardDict} featured />
            </section>
          ) : null}

          {rest.length > 0 ? (
            <section aria-labelledby="blog-latest" className="mt-10">
              <h2 id="blog-latest" className="text-sm font-medium">
                {t.latest}
              </h2>

              <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((card) => (
                  <li key={`${card.canonicalSlug}-${card.slug}`}>
                    <ArticleCardItem card={card} lang={l} dict={cardDict} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <nav
            aria-label={l === "es" ? "Paginación" : "Pagination"}
            className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm"
          >
            {activeCursor ? (
              <Link href={`/${l}/blog`} className="btn h-9 px-4">
                {t.backToBlog}
              </Link>
            ) : null}

            {nextCursor ? (
              <Link
                href={`/${l}/blog?cursor=${encodeURIComponent(nextCursor)}`}
                className="btn btn-primary h-9 px-4"
              >
                {t.loadMore}
              </Link>
            ) : null}
          </nav>
        </>
      )}
    </main>
  );
}
