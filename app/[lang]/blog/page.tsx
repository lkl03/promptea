// app/[lang]/blog/page.tsx
//
// v1.4.1 — the AI Daily index, now filterable.
// v1.4.2 — rebuilt so it reads as a publication instead of a query console.
//
// Three deliberate choices, unchanged since v1.4.1:
//
//   * Firestore is optional at render time. A missing service account (local
//     `next build`) or an outage degrades to an empty feed, never a 500.
//   * Filtering happens on the server, from the query string. The page loads a
//     bounded window of published articles (FILTER_WINDOW) and narrows it in
//     memory — Firestore has no full-text search, and a feed that grows by one
//     or two documents a day does not justify a search index. Every filtered
//     view is a real URL, so it is shareable and it works without JavaScript.
//   * Pagination is real crawlable <Link>s to `?page=N`, so every older article
//     stays reachable by a crawler with JavaScript disabled. There is no
//     infinite-scroll-only path.
//
// The unfiltered front page and a filtered result set are two different things
// and are treated as such: only the front page can carry a lead story, and only
// the front page is offered to crawlers as indexable (see generateMetadata).
//
// The v1.4.2 layout, in reading order: a masthead (eyebrow, title, one-line
// promise, the editorial disclosure), one search bar, a one-line facet bar over
// a collapsed disclosure, then the articles. Everything above the list fits in
// roughly the height of two article rows — the list is the page.

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { getDictionary, hasLocale } from "../dictionaries";
import ArticleCardItem from "@/components/blog/ArticleCardItem";
import BlogFilters from "@/components/blog/BlogFilters";
import type { BlogFiltersDict } from "@/components/blog/BlogFilters";
import { blogFeedPath, blogIndexJsonLd } from "@/lib/blog/jsonld";
import {
  FILTER_WINDOW,
  applyFilters,
  collectCategories,
  collectCompanies,
  filtersToQuery,
  hasActiveFilters,
  paginate,
  parseFilters,
} from "@/lib/blog/filters";
import type { BlogFilterState } from "@/lib/blog/filters";
import { listAllPublishedArticles } from "@/lib/blog/server";
import type { ArticleCard, PublicArticle } from "@/lib/blog/types";
import { getSiteUrl } from "@/lib/seo/site";

export const revalidate = 300;

const PAGE_SIZE = 12;

/**
 * How many published articles must exist before the front page promotes a lead
 * story.
 *
 * A "featured" treatment is a claim about relative importance. With three
 * articles in the archive there is nothing to be relatively more important
 * than, so the promotion reads as a layout accident — the lead is visibly just
 * "the newest one, but bigger". Seven is about a week of daily publishing:
 * enough of a list underneath the lead for the promotion to look like an
 * editorial judgement rather than a template.
 *
 * Below the threshold the page is a plain "Latest" list, which is the correct
 * shape for a young feed. The lead-story code path is kept, not deleted — this
 * threshold is the only thing standing between today and that layout.
 */
const FEATURED_MIN_ARTICLES = 7;

type SearchParams = Record<string, string | string[] | undefined>;

/**
 * Never let a Firestore problem break the page — an empty feed is a valid
 * state, and `next build` runs without a service account by design.
 */
async function loadCards(lang: "es" | "en"): Promise<ArticleCard[]> {
  try {
    const articles = await listAllPublishedArticles(lang, FILTER_WINDOW);
    return articles.map(toCard);
  } catch {
    return [];
  }
}

/**
 * Project the full article down to the feed card. `ArticleCard` is a structural
 * subset of `PublicArticle`, so passing the article straight through would
 * compile — but it would also ship the body and the sources into every list
 * render. The projection is explicit for that reason.
 */
function toCard(article: PublicArticle): ArticleCard {
  return {
    canonicalSlug: article.canonicalSlug,
    slug: article.slug,
    lang: article.lang,
    title: article.title,
    deck: article.deck,
    edition: article.edition,
    eventDate: article.eventDate,
    publishedAt: article.publishedAt,
    category: article.category,
    importance: article.importance,
    tags: article.tags,
    companies: article.companies,
    models: article.models,
    readingMinutes: article.readingMinutes,
    image: article.image,
  };
}

function parsePage(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const n = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  // Bounded so a hand-edited `?page=999999999` cannot drive a huge slice index.
  return Math.min(n, 10_000);
}

/**
 * True when the URL asks for anything other than the newest-first full feed.
 *
 * A reordered feed is as much a duplicate of the front page as a filtered one,
 * so sort counts here even though `hasActiveFilters` (correctly) treats it as
 * not narrowing the result set.
 */
function isNarrowed(filters: BlogFilterState): boolean {
  return hasActiveFilters(filters) || filters.sort !== "newest";
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const { lang } = await params;
  const l = lang === "en" ? "en" : "es";

  const sp = await searchParams;
  const filters = parseFilters(sp);
  const page = parsePage(sp.page);
  const narrowed = isNarrowed(filters);

  const dict = await getDictionary(l);
  const t = dict.blog;

  // A narrowed view canonicalizes to the clean index; an unfiltered page N is
  // its own canonical so the archive stays crawlable page by page.
  const canonical = narrowed || page === 1 ? `/${l}/blog` : `/${l}/blog?page=${page}`;
  const title = `${t.indexTitle} — ${t.tagline}`;

  return {
    title,
    description: t.indexDescription,
    // Filter permutations are search results, not content: keeping them out of
    // the index avoids thin near-duplicates, while `follow` keeps every article
    // behind them discoverable.
    ...(narrowed ? { robots: { index: false, follow: true } } : {}),
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
  searchParams: Promise<SearchParams>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const l = (lang === "en" ? "en" : "es") as "es" | "en";

  const sp = await searchParams;
  const filters = parseFilters(sp);
  const requestedPage = parsePage(sp.page);

  const dict = await getDictionary(l);
  const t = dict.blog;

  const all = await loadCards(l);
  const filtered = applyFilters(all, filters);
  const { items, page, pages, total, hasPrev, hasNext } = paginate(
    filtered,
    requestedPage,
    PAGE_SIZE
  );

  const cardDict = {
    featured: t.featured,
    readArticle: t.readArticle,
    readingTime: t.readingTime,
    category: t.category,
    // v1.4.1 — lets the card label a weekly edition instead of showing its id.
    edition: t.edition,
  };

  // Explicit rather than `{...t.filters}` so the bar's contract stays visible:
  // it receives the strings it renders and nothing else.
  const filtersDict: BlogFiltersDict = {
    heading: t.filters.heading,
    searchLabel: t.filters.searchLabel,
    searchAction: t.filters.searchAction,
    searchPlaceholder: t.filters.searchPlaceholder,
    moreFilters: t.filters.moreFilters,
    activeCount: t.filters.activeCount,
    companyLabel: t.filters.companyLabel,
    allCompanies: t.filters.allCompanies,
    editionLabel: t.filters.editionLabel,
    allEditions: t.filters.allEditions,
    categoryLabel: t.filters.categoryLabel,
    allCategories: t.filters.allCategories,
    fromLabel: t.filters.fromLabel,
    toLabel: t.filters.toLabel,
    sortLabel: t.filters.sortLabel,
    sortNewest: t.filters.sortNewest,
    sortOldest: t.filters.sortOldest,
    apply: t.filters.apply,
    clear: t.filters.clear,
    editionLabels: t.edition,
    categoryLabels: t.category,
  };

  // The lead-story treatment belongs to the edition front page only. A filtered
  // or reordered list is a result set, and promoting its first row would claim
  // an editorial judgement nobody made. It is additionally gated on the archive
  // being big enough for a promotion to mean anything — see the constant.
  const isFrontPage = page === 1 && !isNarrowed(filters);
  const featured =
    isFrontPage && all.length >= FEATURED_MIN_ARTICLES ? (items[0] ?? null) : null;
  const rest = featured ? items.slice(1) : items;

  const resultCount = t.filters.resultCount.replace("{n}", String(total));
  const hrefForPage = (n: number) =>
    `/${l}/blog${filtersToQuery(filters, n > 1 ? { page: String(n) } : {})}`;

  const indexLd = blogIndexJsonLd({
    lang: l,
    title: t.indexTitle,
    description: t.indexDescription,
    items,
    siteUrl: getSiteUrl(),
  });

  return (
    // max-w-4xl, not 6xl: this is a text-first archive with no photography, so
    // the container is sized to the measure of the prose rather than leaving a
    // narrow column stranded in a wide frame.
    <main className="mx-auto w-full max-w-4xl px-4 pt-8 pb-16 sm:pt-10 3xl:max-w-5xl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(indexLd) }} />

      <p className="text-xs">
        <Link
          href={`/${l}`}
          className="text-ink-muted underline-offset-4 transition-colors hover:text-ink hover:underline"
        >
          {l === "es" ? "← Volver al inicio" : "← Back to home"}
        </Link>
      </p>

      {/* ── Masthead ──────────────────────────────────────────────────────
          Eyebrow, name, one-line promise, disclosure. Four lines total: the
          reader should be able to see the first article without scrolling. */}
      <header className="mt-5 text-center sm:mt-10">
        <p>
          <span className="pill h-7 px-3 text-[11px] uppercase tracking-[0.14em]">
            {t.eyebrow}
          </span>
        </p>

        <h1 className="font-title mt-3 text-4xl font-semibold leading-[1.06] sm:mt-4 sm:text-5xl">
          {t.indexTitle}
        </h1>

        <p className="mx-auto mt-2 max-w-xl text-base text-ink-muted sm:mt-3 sm:text-lg">
          {t.tagline}
        </p>

        {/* Transparency note. It has to stay discoverable, but on a phone it
            wraps to three lines and pushes the first headline off-screen, so it
            is hidden below `sm` and repeated under the list instead. */}
        <p className="mx-auto mt-3 hidden max-w-xl text-xs leading-relaxed text-ink-muted sm:block">
          {t.editorialNote}
        </p>
      </header>

      {all.length === 0 ? (
        // Nothing has ever been published (or Firestore is unreachable). This is
        // a first-run state, not a failed search — no filters, no "clear".
        <section className="surface mt-10 p-8 text-center sm:p-10">
          <h2 className="font-title text-xl font-semibold sm:text-2xl">{t.emptyTitle}</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-ink-muted">{t.empty}</p>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <Link className="btn btn-primary h-9 px-4" href={`/${l}/guides`}>
              {t.relatedGuides}
            </Link>
            <Link className="btn btn-secondary h-9 px-4" href={`/${l}/models`}>
              {t.relatedModels}
            </Link>
          </div>
        </section>
      ) : (
        <>
          <BlogFilters
            lang={l}
            filters={filters}
            companies={collectCompanies(all)}
            categories={collectCategories(all)}
            dict={filtersDict}
          />

          {items.length === 0 ? (
            // Articles exist, these filters just match none of them.
            <section className="surface-soft mx-auto mt-10 max-w-xl p-6 text-center">
              <p className="text-sm font-medium">{t.filters.noResults}</p>
              <p className="mx-auto mt-1.5 max-w-md text-sm text-ink-muted">
                {t.filters.noResultsHint}
              </p>

              <div className="mt-4">
                <Link className="btn btn-secondary h-9 px-4" href={`/${l}/blog`}>
                  {t.filters.clear}
                </Link>
              </div>
            </section>
          ) : (
            <>
              {featured ? (
                <section aria-label={t.featured} className="mt-10 sm:mt-12">
                  <ArticleCardItem card={featured} lang={l} dict={cardDict} featured />
                </section>
              ) : null}

              {rest.length > 0 ? (
                <section
                  aria-labelledby="blog-latest"
                  className={featured ? "mt-10" : "mt-10 sm:mt-12"}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line pb-3">
                    <h2 id="blog-latest" className="font-title text-lg font-semibold sm:text-xl">
                      {t.latest}
                    </h2>
                    <p className="text-xs tabular-nums text-ink-muted">{resultCount}</p>
                  </div>

                  <ul>
                    {rest.map((card) => (
                      <li
                        key={`${card.canonicalSlug}-${card.slug}`}
                        className="border-b border-line last:border-b-0"
                      >
                        <ArticleCardItem card={card} lang={l} dict={cardDict} />
                      </li>
                    ))}
                  </ul>
                </section>
              ) : (
                // Exactly one result, already shown as the lead story.
                <p className="mt-8 text-xs tabular-nums text-ink-muted">{resultCount}</p>
              )}

              {pages > 1 ? (
                <nav
                  aria-label={l === "es" ? "Paginación" : "Pagination"}
                  className="mt-10 flex flex-wrap items-center justify-center gap-3 text-sm"
                >
                  {hasPrev ? (
                    <Link href={hrefForPage(page - 1)} className="btn btn-secondary h-9 px-4">
                      {l === "es" ? "← Notas más recientes" : "← Newer articles"}
                    </Link>
                  ) : null}

                  <span className="text-xs tabular-nums text-ink-muted">
                    {l === "es" ? `Página ${page} de ${pages}` : `Page ${page} of ${pages}`}
                  </span>

                  {hasNext ? (
                    <Link href={hrefForPage(page + 1)} className="btn btn-primary h-9 px-4">
                      {t.loadMore}
                    </Link>
                  ) : null}
                </nav>
              ) : null}
            </>
          )}
        </>
      )}

      {/* Mobile counterpart of the masthead disclosure. Hidden from `sm` up,
          where the header already carries it — so it is never duplicated. */}
      <p className="mt-10 border-t border-line pt-5 text-xs leading-relaxed text-ink-muted sm:hidden">
        {t.editorialNote}
      </p>
    </main>
  );
}
