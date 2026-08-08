// lib/blog/filters.ts
//
// v1.4.1 — reader-facing filtering for the AI Daily index.
//
// Deliberately pure and synchronous so it is trivially testable and so the
// index page stays server-rendered: filters live in the query string, the
// server applies them, and every filtered view is a real crawlable URL. There
// is no client-side search index and no request waterfall.
//
// Firestore has no full-text search, and adding one for a feed that grows by
// one or two documents a day would be disproportionate. The page fetches a
// bounded window of published articles and filters it in memory — see
// FILTER_WINDOW for the ceiling and what happens beyond it.

import { BLOG_CATEGORIES, BLOG_EDITIONS } from "@/lib/domain";
import type { BlogCategory, BlogEdition } from "@/lib/domain";
import { isEditorialDate } from "@/lib/blog/dates";
import type { ArticleCard } from "@/lib/blog/types";

/**
 * How many published articles the index loads before filtering.
 * At roughly two posts a day this is about two years of archive. Beyond it the
 * oldest articles stop being reachable through filters (they remain reachable
 * by direct URL, via the sitemap and in the feed); at that point this should
 * move to a real search index rather than growing the window.
 */
export const FILTER_WINDOW = 400;

export type BlogSort = "newest" | "oldest";

export type BlogFilterState = {
  q: string | null;
  company: string | null;
  edition: BlogEdition | null;
  category: BlogCategory | null;
  from: string | null;
  to: string | null;
  sort: BlogSort;
};

export const EMPTY_FILTERS: BlogFilterState = {
  q: null,
  company: null,
  edition: null,
  category: null,
  from: null,
  to: null,
  sort: "newest",
};

/** Fold case and strip diacritics so "compañía" matches "compania". */
export function normalizeText(input: string): string {
  return input
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function firstParam(v: string | string[] | undefined): string | null {
  const raw = Array.isArray(v) ? v[0] : v;
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Read filter state out of searchParams, discarding anything invalid.
 *
 * Unknown or malformed values fall back to "no filter" rather than erroring —
 * a hand-edited URL should degrade to the unfiltered feed, never to a 500.
 */
export function parseFilters(
  searchParams: Record<string, string | string[] | undefined>
): BlogFilterState {
  const q = firstParam(searchParams.q);
  const company = firstParam(searchParams.company);
  const editionRaw = firstParam(searchParams.edition);
  const categoryRaw = firstParam(searchParams.category);
  const from = firstParam(searchParams.from);
  const to = firstParam(searchParams.to);
  const sortRaw = firstParam(searchParams.sort);

  return {
    // Cap the query so a pathological URL cannot drive a huge scan.
    q: q ? q.slice(0, 120) : null,
    company: company ? company.slice(0, 60) : null,
    edition: (BLOG_EDITIONS as readonly string[]).includes(editionRaw ?? "")
      ? (editionRaw as BlogEdition)
      : null,
    category: (BLOG_CATEGORIES as readonly string[]).includes(categoryRaw ?? "")
      ? (categoryRaw as BlogCategory)
      : null,
    from: from && isEditorialDate(from) ? from : null,
    to: to && isEditorialDate(to) ? to : null,
    sort: sortRaw === "oldest" ? "oldest" : "newest",
  };
}

/** True when any filter narrows the feed (sort alone does not count as narrowing). */
export function hasActiveFilters(f: BlogFilterState): boolean {
  return Boolean(f.q || f.company || f.edition || f.category || f.from || f.to);
}

/** Serialize back to a query string, omitting defaults. Always returns "" or "?…". */
export function filtersToQuery(f: BlogFilterState, extra: Record<string, string> = {}): string {
  const params = new URLSearchParams();
  if (f.q) params.set("q", f.q);
  if (f.company) params.set("company", f.company);
  if (f.edition) params.set("edition", f.edition);
  if (f.category) params.set("category", f.category);
  if (f.from) params.set("from", f.from);
  if (f.to) params.set("to", f.to);
  if (f.sort !== "newest") params.set("sort", f.sort);
  for (const [k, v] of Object.entries(extra)) if (v) params.set(k, v);
  const s = params.toString();
  return s ? `?${s}` : "";
}

/** Every searchable string on a card, pre-normalized. */
function haystack(card: ArticleCard): string {
  return normalizeText(
    [card.title, card.deck, ...card.tags, ...card.companies, ...card.models].join(" ")
  );
}

/**
 * Apply the filter state to a list of cards.
 *
 * Search terms are AND-ed: every whitespace-separated token must appear
 * somewhere on the card. That matches how people actually narrow a feed
 * ("openai pricing") better than OR-ing would.
 */
export function applyFilters(cards: readonly ArticleCard[], f: BlogFilterState): ArticleCard[] {
  const tokens = f.q ? normalizeText(f.q).split(/\s+/).filter(Boolean) : [];
  const company = f.company ? normalizeText(f.company) : null;

  const out = cards.filter((card) => {
    if (f.edition && card.edition !== f.edition) return false;
    if (f.category && card.category !== f.category) return false;

    // Date bounds compare YYYY-MM-DD lexicographically, which is ordering-safe.
    if (f.from && card.eventDate < f.from) return false;
    if (f.to && card.eventDate > f.to) return false;

    if (company && !card.companies.some((c) => normalizeText(c) === company)) return false;

    if (tokens.length > 0) {
      const hay = haystack(card);
      if (!tokens.every((t) => hay.includes(t))) return false;
    }

    return true;
  });

  out.sort((a, b) => {
    const cmp = a.eventDate === b.eventDate
      ? (a.publishedAt ?? "").localeCompare(b.publishedAt ?? "")
      : a.eventDate.localeCompare(b.eventDate);
    return f.sort === "oldest" ? cmp : -cmp;
  });

  return out;
}

/** Distinct companies across the loaded window, for the facet dropdown. */
export function collectCompanies(cards: readonly ArticleCard[]): string[] {
  const seen = new Map<string, string>();
  for (const card of cards) {
    for (const c of card.companies) {
      const key = normalizeText(c);
      if (key && !seen.has(key)) seen.set(key, c);
    }
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}

/** Distinct categories present in the window, so the dropdown never offers an empty filter. */
export function collectCategories(cards: readonly ArticleCard[]): BlogCategory[] {
  const seen = new Set<BlogCategory>();
  for (const card of cards) seen.add(card.category);
  return BLOG_CATEGORIES.filter((c) => seen.has(c));
}

/** Simple offset pagination over an already-filtered list. */
export function paginate<T>(items: readonly T[], page: number, perPage: number) {
  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / perPage));
  const current = Math.min(Math.max(1, page), pages);
  const start = (current - 1) * perPage;
  return {
    items: items.slice(start, start + perPage),
    page: current,
    pages,
    total,
    hasPrev: current > 1,
    hasNext: current < pages,
  };
}
