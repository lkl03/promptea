// components/blog/BlogFilters.tsx
//
// v1.4.1 — the AI Daily filter panel.
// v1.4.2 — the panel is gone. What is left is a search bar and a facet bar.
//
// This is still a SERVER component rendering a plain `<form method="GET">`, and
// that is still the whole design:
//
//   * Submitting navigates back to /[lang]/blog with the controls as query
//     parameters, so the server does the filtering and the page stays
//     server-rendered. No client bundle, no hydration, no request waterfall.
//   * Every filtered view is therefore a real, shareable, crawlable URL rather
//     than transient client state.
//   * With JavaScript disabled it still works, because there is no JavaScript
//     to disable.
//
// What changed in v1.4.2 is the shape, not the architecture. The old six-select
// panel was the largest object on the page and made the index read as a search
// tool rather than a publication. Now:
//
//   * SEARCH is one input plus one button, the same `.field` the home page
//     editor uses. It is the only thing above the fold besides the masthead.
//   * EDITION — four values, always relevant — is promoted to a row of chips
//     rendered as <Link>s. Zero vertical cost, and each chip is its own
//     crawlable URL rather than a form value.
//   * Everything else lives in a native <details>. Collapsed it costs one line;
//     open it is a small grid. Form controls inside a CLOSED <details> are
//     still submitted with the form, so the disclosure needs no JavaScript and
//     changes nothing about how filtering works.
//
// The two halves must not fight: a chip href carries the current q/company/
// category/date/sort via filtersToQuery, and the form carries the current
// edition back through a hidden input. Whichever one the reader touches, the
// other survives.

import Link from "next/link";

import { BLOG_EDITIONS } from "@/lib/domain";
import type { BlogCategory, BlogEdition } from "@/lib/domain";
import { filtersToQuery, hasActiveFilters } from "@/lib/blog/filters";
import type { BlogFilterState } from "@/lib/blog/filters";

/** Exactly the `blog.filters.*` strings this bar renders, plus the two label maps. */
export type BlogFiltersDict = {
  /** Names the search landmark; never rendered as visible text. */
  heading: string;
  searchLabel: string;
  /** Submit button text. */
  searchAction: string;
  searchPlaceholder: string;
  /** <details> summary label. */
  moreFilters: string;
  /** "{n} filter(s) active" — announced next to the summary. */
  activeCount: string;
  companyLabel: string;
  allCompanies: string;
  editionLabel: string;
  /** Label of the "no edition selected" chip. Short: it sits in a chip row. */
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

const LABEL_CLASS = "block text-xs font-medium text-ink-muted";
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
  // Anything the disclosure owns. Sort counts: it is not "narrowing" (see
  // hasActiveFilters) but it is a deviation the reader should see reflected.
  const secondaryCount =
    [filters.company, filters.category, filters.from, filters.to].filter(Boolean).length +
    (filters.sort !== "newest" ? 1 : 0);

  // Open on arrival only when the reader already has a secondary filter set —
  // otherwise landing on the index would be greeted by the panel we just spent
  // this release collapsing.
  const disclosureOpen = secondaryCount > 0;

  const anythingActive = hasActiveFilters(filters) || filters.sort !== "newest";

  /** Switching edition preserves every other facet and drops back to page 1. */
  const editionHref = (edition: BlogEdition | null) =>
    `/${lang}/blog${filtersToQuery({ ...filters, edition })}`;

  const editionChips: ReadonlyArray<{ value: BlogEdition | null; label: string }> = [
    { value: null, label: dict.allEditions },
    ...BLOG_EDITIONS.map((edition) => ({
      value: edition,
      label: dict.editionLabels[edition] ?? edition,
    })),
  ];

  return (
    <form
      method="GET"
      action={`/${lang}/blog`}
      role="search"
      aria-label={dict.heading}
      className="mt-7 sm:mt-8"
    >
      {/* ── Search: the only prominent control on the page ─────────────────
          Constrained and centred. A full-width search across the container
          would look like a database console, not a masthead. */}
      <div className="mx-auto flex w-full max-w-xl items-center gap-2">
        <label htmlFor="blog-filter-q" className="sr-only">
          {dict.searchLabel}
        </label>

        <div className="relative min-w-0 flex-1">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.4-3.4" />
          </svg>

          <input
            id="blog-filter-q"
            name="q"
            type="search"
            // Mirrors the cap parseFilters() applies, so the browser refuses
            // what the server would truncate anyway.
            maxLength={120}
            defaultValue={filters.q ?? ""}
            placeholder={dict.searchPlaceholder}
            // text-base below `sm` on purpose: iOS Safari zooms the viewport
            // when a focused input is under 16px, and this is the one control
            // on the page a phone user is guaranteed to tap.
            className="field h-11 w-full pl-10 pr-3 text-base placeholder:text-ink-faint sm:text-sm"
          />
        </div>

        <button type="submit" className="btn btn-primary h-11 shrink-0 px-4 sm:px-5">
          {dict.searchAction}
        </button>
      </div>

      {/* The chips below are links, so the edition they carry is not a form
          control. Without this the first search after picking an edition would
          silently drop it. Rendered only when set, so the clean index never
          grows an empty `edition=` parameter. */}
      {filters.edition ? <input type="hidden" name="edition" value={filters.edition} /> : null}

      {/* ── Facet bar ──────────────────────────────────────────────────────
          Edition first because it is the one facet that is always meaningful:
          four values, one line, each a crawlable URL. */}
      <div className="mx-auto mt-5 flex w-full max-w-3xl flex-wrap items-center justify-center gap-x-4 gap-y-2">
        <div
          role="group"
          aria-label={dict.editionLabel}
          className="flex min-w-0 flex-wrap items-center justify-center gap-1.5"
        >
          {editionChips.map((chip) => {
            const active = filters.edition === chip.value;
            return (
              <Link
                key={chip.value ?? "all"}
                href={editionHref(chip.value)}
                aria-current={active ? "page" : undefined}
                className="pill h-9 px-3.5"
              >
                {chip.label}
              </Link>
            );
          })}
        </div>

        {/* A link, not a reset button: clearing must produce the clean URL so
            the reader lands on the canonical, indexable front page. */}
        {anythingActive ? (
          <Link
            href={`/${lang}/blog`}
            className="text-xs text-ink-muted underline-offset-4 transition-colors hover:text-ink hover:underline"
          >
            {dict.clear}
          </Link>
        ) : null}
      </div>

      {/* ── Everything else, folded away ───────────────────────────────────
          A native <details>: no state, no JavaScript, and its controls are
          submitted with the form whether it is open or closed. */}
      <details open={disclosureOpen} className="mx-auto mt-2.5 w-full max-w-3xl text-center">
        <summary className="summary-pill pill h-9 gap-1.5 px-3.5">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3.5 w-3.5"
          >
            <path d="M4 6h16M7 12h10M10 18h4" />
          </svg>

          <span>{dict.moreFilters}</span>

          {secondaryCount > 0 ? (
            <>
              <span aria-hidden="true" className="badge badge-accent px-1.5 tabular-nums">
                {secondaryCount}
              </span>
              <span className="sr-only">
                {dict.activeCount.replace("{n}", String(secondaryCount))}
              </span>
            </>
          ) : null}

          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="summary-chevron h-3.5 w-3.5"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </summary>

        <div className="surface-soft mt-3 grid gap-3 p-4 text-left sm:grid-cols-2 lg:grid-cols-3">
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

          <div className="flex items-end sm:col-span-2 sm:justify-end lg:col-span-1 lg:justify-start">
            <button type="submit" className="btn btn-primary h-9 w-full px-4 sm:w-auto lg:w-full">
              {dict.apply}
            </button>
          </div>
        </div>
      </details>
    </form>
  );
}
