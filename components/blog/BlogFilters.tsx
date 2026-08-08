// components/blog/BlogFilters.tsx
//
// v1.4.1 — the AI Daily filter panel.
//
// This is a SERVER component rendering a plain `<form method="GET">`, and that
// is the whole design:
//
//   * Submitting navigates back to /[lang]/blog with the controls as query
//     parameters, so the server does the filtering and the page stays
//     server-rendered. No client bundle, no hydration, no request waterfall.
//   * Every filtered view is therefore a real, shareable, crawlable URL rather
//     than transient client state.
//   * With JavaScript disabled it still works, because there is no JavaScript
//     to disable.
//
// The one obligation that buys is round-tripping: each control must render the
// value currently in the URL, or applying a second filter would silently drop
// the first.

import Link from "next/link";

import { BLOG_EDITIONS } from "@/lib/domain";
import type { BlogCategory } from "@/lib/domain";
import { hasActiveFilters } from "@/lib/blog/filters";
import type { BlogFilterState } from "@/lib/blog/filters";

/** Exactly the `blog.filters.*` strings this panel renders, plus the two label maps. */
export type BlogFiltersDict = {
  heading: string;
  searchLabel: string;
  searchPlaceholder: string;
  companyLabel: string;
  allCompanies: string;
  editionLabel: string;
  allEditions: string;
  categoryLabel: string;
  allCategories: string;
  fromLabel: string;
  toLabel: string;
  sortLabel: string;
  sortNewest: string;
  sortOldest: string;
  apply: string;
  clear: string;
  /** `blog.edition.*` — one label per BlogEdition. */
  editionLabels: Record<string, string>;
  /** `blog.category.*` — one label per BlogCategory. */
  categoryLabels: Record<string, string>;
};

const LABEL_CLASS = "block text-xs font-medium opacity-70";
const CONTROL_CLASS = "field mt-1.5 h-9 w-full px-3";

export default function BlogFilters({
  lang,
  filters,
  companies,
  categories,
  dict,
}: {
  lang: "es" | "en";
  filters: BlogFilterState;
  /** Distinct companies across the loaded window, already sorted. */
  companies: readonly string[];
  /** Categories actually present in the window, in domain order. */
  categories: readonly BlogCategory[];
  dict: BlogFiltersDict;
}) {
  const active = hasActiveFilters(filters);

  return (
    <form
      method="GET"
      action={`/${lang}/blog`}
      role="search"
      aria-labelledby="blog-filters-heading"
      className="surface mt-8 p-4 sm:p-5"
    >
      <h2 id="blog-filters-heading" className="text-sm font-medium">
        {dict.heading}
      </h2>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="sm:col-span-2 lg:col-span-3">
          <label htmlFor="blog-filter-q" className={LABEL_CLASS}>
            {dict.searchLabel}
          </label>
          <input
            id="blog-filter-q"
            name="q"
            type="search"
            // Mirrors the cap parseFilters() applies, so the browser refuses
            // what the server would truncate anyway.
            maxLength={120}
            defaultValue={filters.q ?? ""}
            placeholder={dict.searchPlaceholder}
            className={CONTROL_CLASS}
          />
        </div>

        <div>
          <label htmlFor="blog-filter-company" className={LABEL_CLASS}>
            {dict.companyLabel}
          </label>
          <select
            id="blog-filter-company"
            name="company"
            defaultValue={filters.company ?? ""}
            className={CONTROL_CLASS}
          >
            <option value="">{dict.allCompanies}</option>
            {companies.map((company) => (
              <option key={company} value={company}>
                {company}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="blog-filter-edition" className={LABEL_CLASS}>
            {dict.editionLabel}
          </label>
          <select
            id="blog-filter-edition"
            name="edition"
            defaultValue={filters.edition ?? ""}
            className={CONTROL_CLASS}
          >
            <option value="">{dict.allEditions}</option>
            {BLOG_EDITIONS.map((edition) => (
              <option key={edition} value={edition}>
                {dict.editionLabels[edition] ?? edition}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="blog-filter-category" className={LABEL_CLASS}>
            {dict.categoryLabel}
          </label>
          <select
            id="blog-filter-category"
            name="category"
            defaultValue={filters.category ?? ""}
            className={CONTROL_CLASS}
          >
            <option value="">{dict.allCategories}</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {dict.categoryLabels[category] ?? category}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="blog-filter-from" className={LABEL_CLASS}>
            {dict.fromLabel}
          </label>
          <input
            id="blog-filter-from"
            name="from"
            type="date"
            defaultValue={filters.from ?? ""}
            className={CONTROL_CLASS}
          />
        </div>

        <div>
          <label htmlFor="blog-filter-to" className={LABEL_CLASS}>
            {dict.toLabel}
          </label>
          <input
            id="blog-filter-to"
            name="to"
            type="date"
            defaultValue={filters.to ?? ""}
            className={CONTROL_CLASS}
          />
        </div>

        <div>
          <label htmlFor="blog-filter-sort" className={LABEL_CLASS}>
            {dict.sortLabel}
          </label>
          <select
            id="blog-filter-sort"
            name="sort"
            defaultValue={filters.sort}
            className={CONTROL_CLASS}
          >
            <option value="newest">{dict.sortNewest}</option>
            <option value="oldest">{dict.sortOldest}</option>
          </select>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="submit" className="btn btn-primary h-9 px-4">
          {dict.apply}
        </button>

        {/* A link, not a reset button: clearing must produce the clean URL so
            the reader lands on the canonical, indexable front page. */}
        {active ? (
          <Link href={`/${lang}/blog`} className="btn h-9 px-4">
            {dict.clear}
          </Link>
        ) : null}
      </div>
    </form>
  );
}
