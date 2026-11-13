// components/blog/BlogIndexView.tsx
//
// The AI Daily index — one implementation for both sections (v1.8.3):
//   /{lang}/blog        section "ai"    the AI news desk (both daily slots, the weekly editions)
//   /{lang}/blog/tech   section "tech"  AI Daily Tech (one technology story a day)
// Each route is a thin page that calls blogIndexMetadata() and renders this
// server component. Before v1.8.3 all of this lived in app/[lang]/blog/page.tsx.
//
// Three deliberate choices, unchanged since v1.4.1:
//
//   * Firestore is optional at render time. A missing service account (local
//     `next build`) or an outage degrades to an empty feed, never a 500.
//   * Filtering happens on the server, from the query string. The page loads a
//     bounded window of published articles (FILTER_WINDOW) and narrows it in
//     memory — Firestore has no full-text search, and a feed that grows by a
//     few documents a day does not justify a search index. Every filtered
//     view is a real URL, so it is shareable and it works without JavaScript.
//   * Pagination is real crawlable <Link>s to `?page=N`, so every older article
//     stays reachable by a crawler with JavaScript disabled.
//
// The unfiltered front page and a filtered result set are two different things:
// only the front page can carry a lead story, and only the front page is
// offered to crawlers as indexable (see blogIndexMetadata).

import Link from "next/link";
import type { Metadata } from "next";

import ArticleCardItem from "@/components/blog/ArticleCardItem";
import BlogFilters from "@/components/blog/BlogFilters";
import type { BlogFiltersDict } from "@/components/blog/BlogFilters";
import ContentLangNotice from "@/components/blog/ContentLangNotice";
import DailyTabs from "@/components/blog/DailyTabs";
import XFeed from "@/components/home/XFeed";
import NewsletterDock from "@/components/newsletter/NewsletterDock";
import JsonLd from "@/components/seo/JsonLd";
import { getDictionary } from "@/app/[lang]/dictionaries";
import { blogIndexJsonLd, blogSectionFeedPath, blogSectionIndexPath } from "@/lib/blog/jsonld";
import {
  FILTER_WINDOW,
  applyFilters,
  cardsOfSection,
  collectCategories,
  collectCompanies,
  collectEditions,
  filtersToQuery,
  hasActiveFilters,
  paginate,
  parseFilters,
} from "@/lib/blog/filters";
import type { BlogFilterState } from "@/lib/blog/filters";
import { listAllPublishedArticles } from "@/lib/blog/server";
import type { ArticleCard, PublicArticle } from "@/lib/blog/types";
import { contentIsFallback, contentLangFor, type BlogSection, type ContentLang, type Lang } from "@/lib/domain";
import { pageMetadata } from "@/lib/seo/metadata";
import { getSiteUrl } from "@/lib/seo/site";
import { getXLinks, getXWidgetId } from "@/lib/social";

export const BLOG_PAGE_SIZE = 12;

/**
 * How many published articles must exist before the front page promotes a lead
 * story.
 *
 * A "featured" treatment is a claim about relative importance. With three
 * articles in the archive there is nothing to be relatively more important
 * than, so the promotion reads as a layout accident. Seven is about a week of
 * daily publishing: enough of a list underneath the lead for the promotion to
 * look like an editorial judgement rather than a template. Below the threshold
 * the page is a plain "Latest" list, which is the correct shape for a young
 * feed — exactly what the Tech section is on its first days.
 */
export const FEATURED_MIN_ARTICLES = 7;

export type BlogSearchParams = Record<string, string | string[] | undefined>;

type Dict = Awaited<ReturnType<typeof getDictionary>>;

/** The strings that differ between the two sections. */
export function sectionCopy(dict: Dict, section: BlogSection) {
  const t = dict.blog;
  return section === "tech"
    ? {
        title: t.tech.indexTitle,
        tagline: t.tech.tagline,
        description: t.tech.indexDescription,
        latest: t.tech.latest,
        emptyTitle: t.tech.emptyTitle,
        empty: t.tech.empty,
        langNotice: t.tech.langNotice,
      }
    : {
        title: t.indexTitle,
        tagline: t.tagline,
        description: t.indexDescription,
        latest: t.latest,
        emptyTitle: t.emptyTitle,
        empty: t.empty,
        langNotice: t.langNotice,
      };
}

/**
 * Never let a Firestore problem break the page — an empty feed is a valid
 * state, and `next build` runs without a service account by design.
 */
async function loadCards(lang: ContentLang, section: BlogSection): Promise<ArticleCard[]> {
  try {
    const articles = await listAllPublishedArticles(lang, FILTER_WINDOW);
    return cardsOfSection(articles, section).map(toCard);
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

export function parsePage(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const n = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  // Bounded so a hand-edited `?page=999999999` cannot drive a huge slice index.
  return Math.min(n, 10_000);
}

/**
 * True when the URL asks for anything other than the newest-first full feed.
 * A reordered feed is as much a duplicate of the front page as a filtered one,
 * so sort counts here even though `hasActiveFilters` (correctly) treats it as
 * not narrowing the result set.
 */
function isNarrowed(filters: BlogFilterState): boolean {
  return hasActiveFilters(filters) || filters.sort !== "newest";
}

/**
 * <head> of an index. A narrowed view canonicalizes to the clean index and is
 * `noindex, follow`; an unfiltered page N is its own canonical so the archive
 * stays crawlable page by page. Under /pt the feed is the English one, so the
 * canonical is the English index.
 */
export async function blogIndexMetadata(lang: Lang, sp: BlogSearchParams, section: BlogSection): Promise<Metadata> {
  const filters = parseFilters(sp, section);
  const page = parsePage(sp.page);
  const narrowed = isNarrowed(filters);

  const dict = await getDictionary(lang);
  const copy = sectionCopy(dict, section);

  const cl = contentLangFor(lang);
  const base = blogSectionIndexPath(cl, section);
  const canonical = narrowed || page === 1 ? base : `${base}?page=${page}`;
  const title = `${copy.title} — ${copy.tagline}`;

  // v1.8.4: the Tech index before its first story is an empty listing. It is
  // noindex until then (and out of sitemap.xml and llms.txt, see
  // withoutEmptySectionIndexes), and indexable again with the first story.
  const empty = section === "tech" && (await loadCards(cl, section)).length === 0;

  const meta = pageMetadata({ lang, contentLang: cl, path: blogSectionIndexPath(lang, section), title, description: copy.description });
  return {
    ...meta,
    // Filter permutations are search results, not content: keeping them out of
    // the index avoids thin near-duplicates, while `follow` keeps every article
    // behind them discoverable.
    ...(narrowed || empty ? { robots: { index: false, follow: true } } : {}),
    alternates: {
      ...meta.alternates,
      canonical,
      // <link rel="alternate" type="application/rss+xml">: each index advertises its own feed.
      types: { "application/rss+xml": blogSectionFeedPath(cl, section) },
    },
    openGraph: { ...meta.openGraph, url: canonical },
  };
}

export default async function BlogIndexView({ lang: l, sp, section }: { lang: Lang; sp: BlogSearchParams; section: BlogSection }) {
  const filters = parseFilters(sp, section);
  const requestedPage = parsePage(sp.page);

  const dict = await getDictionary(l);
  const xWidgetId = getXWidgetId();
  const x = getXLinks();
  const t = dict.blog;
  const copy = sectionCopy(dict, section);
  const basePath = blogSectionIndexPath(l, section);

  const all = await loadCards(contentLangFor(l), section);
  const filtered = applyFilters(all, filters);
  const { items, page, pages, total, hasPrev, hasNext } = paginate(filtered, requestedPage, BLOG_PAGE_SIZE);

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
  const featured = isFrontPage && all.length >= FEATURED_MIN_ARTICLES ? (items[0] ?? null) : null;
  const rest = featured ? items.slice(1) : items;

  const resultCount = t.filters.resultCount.replace("{n}", String(total));
  const hrefForPage = (n: number) => `${basePath}${filtersToQuery(filters, n > 1 ? { page: String(n) } : {})}`;

  const indexLd = blogIndexJsonLd({
    lang: l,
    title: copy.title,
    description: copy.description,
    items,
    siteUrl: getSiteUrl(),
    section,
  });

  // In the Tech index every story is the Tech edition: the chip would repeat the page title on each row.
  const hideEdition = section === "tech";

  return (
    // v1.7.0 — two columns from `lg` up: the list keeps a readable measure
    // (~68ch) and the newsletter dock sticks in the side column; below `lg`
    // it is one column and the dock becomes a slim bottom bar.
    <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6 sm:pt-8">
      {/* A /pt view is canonicalised to the English index, which carries the structured data. */}
      {contentIsFallback(l) ? null : <JsonLd data={indexLd} />}

      <DailyTabs lang={l} active={section === "tech" ? "tech" : "news"} dict={dict.dailyTabs} />

      <div className="mt-8 grid grid-cols-1 gap-10 sm:mt-10 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start lg:gap-12">
        <div className="min-w-0">
          {/* ── Masthead ──────────────────────────────────────────────────────
              Name and one-line promise. The editorial disclosure sits under the
              list: it stays on every page without pushing the first headline down. */}
          <header>
            <h1 className="font-title text-3xl font-semibold leading-tight sm:text-4xl">{copy.title}</h1>
            <p className="mt-2 max-w-xl text-base text-ink-muted sm:text-lg">{copy.tagline}</p>
            <ContentLangNotice
              lang={l}
              text={copy.langNotice}
              hrefs={{ es: blogSectionIndexPath("es", section), en: blogSectionIndexPath("en", section) }}
              className="mt-4"
            />
          </header>

          {all.length === 0 ? (
            // Nothing has ever been published in this section (or Firestore is
            // unreachable). A first-run state, not a failed search — no filters, no "clear".
            <section className="surface mt-10 p-8 text-center sm:p-10">
              <h2 className="font-title text-xl font-semibold sm:text-2xl">{copy.emptyTitle}</h2>
              <p className="mx-auto mt-2 max-w-xl text-sm text-ink-muted">{copy.empty}</p>

              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                {section === "tech" ? (
                  <Link className="btn btn-primary h-9 px-4" href={`/${l}/blog`}>
                    {t.tech.emptyCta}
                  </Link>
                ) : (
                  <Link className="btn btn-primary h-9 px-4" href={`/${l}/guides`}>
                    {t.relatedGuides}
                  </Link>
                )}
                <Link className="btn btn-secondary h-9 px-4" href={section === "tech" ? `/${l}/guides` : `/${l}/models`}>
                  {section === "tech" ? t.relatedGuides : t.relatedModels}
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
                editions={collectEditions(all)}
                basePath={basePath}
                dict={filtersDict}
              />

              {items.length === 0 ? (
                // Articles exist, these filters just match none of them.
                <section className="surface-soft mx-auto mt-10 max-w-xl p-6 text-center">
                  <p className="text-sm font-medium">{t.filters.noResults}</p>
                  <p className="mx-auto mt-1.5 max-w-md text-sm text-ink-muted">{t.filters.noResultsHint}</p>

                  <div className="mt-4">
                    <Link className="btn btn-secondary h-9 px-4" href={basePath}>
                      {t.filters.clear}
                    </Link>
                  </div>
                </section>
              ) : (
                <>
                  {featured ? (
                    <section aria-label={t.featured} className="mt-10 sm:mt-12">
                      <ArticleCardItem card={featured} lang={l} dict={cardDict} featured hideEdition={hideEdition} />
                    </section>
                  ) : null}

                  {rest.length > 0 ? (
                    <section aria-labelledby="blog-latest" className={featured ? "mt-10" : "mt-10 sm:mt-12"}>
                      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line pb-3">
                        <h2 id="blog-latest" className="font-title text-lg font-semibold sm:text-xl">
                          {copy.latest}
                        </h2>
                        <p className="text-xs tabular-nums text-ink-muted">{resultCount}</p>
                      </div>

                      <ul>
                        {rest.map((card) => (
                          <li key={`${card.canonicalSlug}-${card.slug}`} className="border-b border-line last:border-b-0">
                            <ArticleCardItem card={card} lang={l} dict={cardDict} hideEdition={hideEdition} />
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : (
                    // Exactly one result, already shown as the lead story.
                    <p className="mt-8 text-xs tabular-nums text-ink-muted">{resultCount}</p>
                  )}

                  {pages > 1 ? (
                    <nav aria-label={t.pagination.label} className="mt-10 flex flex-wrap items-center justify-center gap-3 text-sm">
                      {hasPrev ? (
                        <Link href={hrefForPage(page - 1)} className="btn btn-secondary h-9 px-4">
                          {t.pagination.newer}
                        </Link>
                      ) : null}

                      <span className="text-xs tabular-nums text-ink-muted">
                        {t.pagination.page.replace("{page}", String(page)).replace("{pages}", String(pages))}
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

          <p className="mt-12 border-t border-line pt-5 text-xs leading-relaxed text-ink-muted">
            {t.editorialNote}{" "}
            <Link href={`/${l}/sources`} className="underline underline-offset-2 hover:text-ink">
              {t.sourcesLink}
            </Link>
          </p>
        </div>

        {/* v1.8.1: the side column also carries the X feed card (desktop). */}
        <NewsletterDock lang={l} dict={dict.newsletterDock} formDict={dict.newsletter.bar}>
          {xWidgetId ? <XFeed widgetId={xWidgetId} handle={x.handle} profileUrl={x.url} dict={dict.hub.xFeed} /> : null}
        </NewsletterDock>
      </div>
    </main>
  );
}
