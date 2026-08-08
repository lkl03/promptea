// lib/__tests__/blog.filters.test.ts
//
// v1.4.1 — reader-facing filtering for the AI Daily index.
//
// The filter layer is deliberately pure: filters live in the query string, the
// server applies them, and every filtered view is a real crawlable URL. That
// design makes exactly two things load-bearing, and both are tested here:
//
//   1. parseFilters is a TRUST BOUNDARY. Its input is a hand-editable URL, so
//      anything unknown, malformed, oversized or array-shaped must degrade to
//      "no filter" rather than throwing — a bad link renders the plain feed,
//      never a 500.
//   2. applyFilters is the whole search experience. Accent folding, AND-ed
//      tokens and exact (not substring) company matching are what separate
//      "the filter works" from "the filter looks like it works": a substring
//      company match would quietly fold Metabase into Meta, and OR-ed tokens
//      would make a two-word query wider than a one-word query.
//
// Fixtures are built locally so each assertion states the exact card shape it
// depends on.

import { describe, expect, test } from "vitest";
import {
  applyFilters,
  collectCategories,
  collectCompanies,
  EMPTY_FILTERS,
  FILTER_WINDOW,
  filtersToQuery,
  hasActiveFilters,
  normalizeText,
  paginate,
  parseFilters,
} from "@/lib/blog/filters";
import type { BlogFilterState } from "@/lib/blog/filters";
import { BLOG_CATEGORIES } from "@/lib/domain";
import type { ArticleCard } from "@/lib/blog/types";

// ---------------------------------------------------------------------------
// Local fixtures
// ---------------------------------------------------------------------------

let cardSeq = 0;

function makeCard(overrides: Partial<ArticleCard> = {}): ArticleCard {
  cardSeq += 1;
  const slug = overrides.slug ?? `card-${cardSeq}`;
  return {
    canonicalSlug: overrides.canonicalSlug ?? slug,
    slug,
    lang: "en",
    title: "Example Labs ships Orion",
    deck: "A 400k-token context window and lower output pricing.",
    edition: "daily",
    eventDate: "2026-08-07",
    publishedAt: "2026-08-07T12:00:00.000Z",
    category: "model-release",
    importance: "P1",
    tags: [],
    companies: [],
    models: [],
    readingMinutes: 3,
    image: null,
    ...overrides,
  };
}

/** Slugs of the result, in result order — the shortest way to state an expectation. */
function slugs(cards: readonly ArticleCard[]): string[] {
  return cards.map((c) => c.slug);
}

function filters(overrides: Partial<BlogFilterState> = {}): BlogFilterState {
  return { ...EMPTY_FILTERS, ...overrides };
}

/** Serialize then re-parse, the way a real link round-trips through the browser. */
function roundTrip(state: BlogFilterState): BlogFilterState {
  const query = filtersToQuery(state);
  const params = Object.fromEntries(new URLSearchParams(query.replace(/^\?/, "")));
  return parseFilters(params);
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe("FILTER_WINDOW", () => {
  test("is the documented bounded window, not an unbounded scan", () => {
    expect(FILTER_WINDOW).toBe(400);
    expect(Number.isInteger(FILTER_WINDOW)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// normalizeText
// ---------------------------------------------------------------------------

describe("normalizeText", () => {
  test("folds case", () => {
    expect(normalizeText("OpenAI")).toBe("openai");
    expect(normalizeText("MODEL RELEASE")).toBe("model release");
  });

  test("strips diacritics", () => {
    expect(normalizeText("Compañía")).toBe("compania");
    expect(normalizeText("Órion")).toBe("orion");
    expect(normalizeText("investigación")).toBe("investigacion");
    expect(normalizeText("Über")).toBe("uber");
  });

  test("trims surrounding whitespace but keeps interior spacing", () => {
    expect(normalizeText("  Example Labs  ")).toBe("example labs");
  });

  test("is idempotent — normalizing twice changes nothing", () => {
    const once = normalizeText("Compañía Ejemplo");
    expect(normalizeText(once)).toBe(once);
  });

  test("an accented and an unaccented spelling collapse to the same key", () => {
    expect(normalizeText("Compañía")).toBe(normalizeText("compania"));
    expect(normalizeText("DeepSeek")).toBe(normalizeText("deepseek"));
  });
});

// ---------------------------------------------------------------------------
// parseFilters — the trust boundary
// ---------------------------------------------------------------------------

describe("parseFilters", () => {
  test("an empty query yields the empty state", () => {
    expect(parseFilters({})).toEqual(EMPTY_FILTERS);
  });

  test("valid values pass through unchanged", () => {
    expect(
      parseFilters({
        q: "orion",
        company: "Example Labs",
        edition: "weekly-recap",
        category: "policy",
        from: "2026-08-01",
        to: "2026-08-31",
        sort: "oldest",
      })
    ).toEqual({
      q: "orion",
      company: "Example Labs",
      edition: "weekly-recap",
      category: "policy",
      from: "2026-08-01",
      to: "2026-08-31",
      sort: "oldest",
    });
  });

  test("every edition and every category is accepted", () => {
    expect(parseFilters({ edition: "daily" }).edition).toBe("daily");
    expect(parseFilters({ edition: "week-ahead" }).edition).toBe("week-ahead");
    for (const category of BLOG_CATEGORIES) {
      expect(parseFilters({ category }).category).toBe(category);
    }
  });

  test("an unknown edition is dropped rather than kept or thrown", () => {
    expect(parseFilters({ edition: "monthly" }).edition).toBeNull();
    expect(parseFilters({ edition: "DAILY" }).edition).toBeNull(); // case-sensitive union
    expect(parseFilters({ edition: "__proto__" }).edition).toBeNull();
  });

  test("an unknown category is dropped", () => {
    expect(parseFilters({ category: "gossip" }).category).toBeNull();
    expect(parseFilters({ category: "Policy" }).category).toBeNull();
  });

  test("malformed dates are dropped, real ones survive", () => {
    expect(parseFilters({ from: "2026-13-01" }).from).toBeNull(); // month 13
    expect(parseFilters({ from: "2026-02-30" }).from).toBeNull(); // February 30
    expect(parseFilters({ from: "07/08/2026" }).from).toBeNull();
    expect(parseFilters({ from: "2026-8-1" }).from).toBeNull(); // unpadded
    expect(parseFilters({ to: "yesterday" }).to).toBeNull();
    expect(parseFilters({ to: "2026-08-07T00:00:00Z" }).to).toBeNull();

    expect(parseFilters({ from: "2026-08-07", to: "2024-02-29" })).toMatchObject({
      from: "2026-08-07",
      to: "2024-02-29", // 2024 is a leap year
    });
  });

  test("one malformed value does not poison the rest of the query", () => {
    expect(parseFilters({ q: "orion", from: "not-a-date", category: "policy" })).toEqual({
      ...EMPTY_FILTERS,
      q: "orion",
      category: "policy",
    });
  });

  test("array-valued params take the first entry", () => {
    expect(parseFilters({ q: ["orion", "gemini"] }).q).toBe("orion");
    expect(parseFilters({ edition: ["week-ahead", "daily"] }).edition).toBe("week-ahead");
    expect(parseFilters({ sort: ["oldest", "newest"] }).sort).toBe("oldest");
    expect(parseFilters({ category: ["nonsense", "policy"] }).category).toBeNull();
  });

  test("empty and whitespace-only values become null", () => {
    expect(parseFilters({ q: "", company: "", from: "", to: "" })).toEqual(EMPTY_FILTERS);
    expect(parseFilters({ q: "   " }).q).toBeNull();
    expect(parseFilters({ q: [] }).q).toBeNull();
    expect(parseFilters({ q: undefined }).q).toBeNull();
  });

  test("values are trimmed", () => {
    expect(parseFilters({ q: "  orion  " }).q).toBe("orion");
    expect(parseFilters({ company: "  Example Labs " }).company).toBe("Example Labs");
  });

  test("q is capped at 120 characters", () => {
    const long = "x".repeat(500);
    const parsed = parseFilters({ q: long });
    expect(parsed.q).toHaveLength(120);
    expect(parsed.q).toBe("x".repeat(120));

    // A query at the cap is untouched.
    const exact = "y".repeat(120);
    expect(parseFilters({ q: exact }).q).toBe(exact);
  });

  test("company is capped at 60 characters", () => {
    expect(parseFilters({ company: "z".repeat(200) }).company).toHaveLength(60);
  });

  test("sort defaults to newest and only 'oldest' overrides it", () => {
    expect(parseFilters({}).sort).toBe("newest");
    expect(parseFilters({ sort: "newest" }).sort).toBe("newest");
    expect(parseFilters({ sort: "oldest" }).sort).toBe("oldest");
    expect(parseFilters({ sort: "Oldest" }).sort).toBe("newest");
    expect(parseFilters({ sort: "random" }).sort).toBe("newest");
    expect(parseFilters({ sort: "" }).sort).toBe("newest");
  });

  test("unrelated params are ignored", () => {
    expect(parseFilters({ page: "3", utm_source: "newsletter" })).toEqual(EMPTY_FILTERS);
  });
});

describe("hasActiveFilters", () => {
  test("the empty state is not active", () => {
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false);
  });

  test("sort alone does not count as narrowing", () => {
    expect(hasActiveFilters(filters({ sort: "oldest" }))).toBe(false);
  });

  test("any narrowing filter counts", () => {
    expect(hasActiveFilters(filters({ q: "orion" }))).toBe(true);
    expect(hasActiveFilters(filters({ company: "Example Labs" }))).toBe(true);
    expect(hasActiveFilters(filters({ edition: "weekly-recap" }))).toBe(true);
    expect(hasActiveFilters(filters({ category: "policy" }))).toBe(true);
    expect(hasActiveFilters(filters({ from: "2026-08-01" }))).toBe(true);
    expect(hasActiveFilters(filters({ to: "2026-08-31" }))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// applyFilters — text search
// ---------------------------------------------------------------------------

describe("applyFilters — text search", () => {
  const inTitle = makeCard({ slug: "in-title", title: "Northwind ships a new runtime" });
  const inDeck = makeCard({ slug: "in-deck", deck: "The Northwind team documented the change." });
  const inTags = makeCard({ slug: "in-tags", tags: ["northwind", "runtime"] });
  const inCompanies = makeCard({ slug: "in-companies", companies: ["Northwind Compute"] });
  const inModels = makeCard({ slug: "in-models", models: ["Northwind-1"] });
  const unrelated = makeCard({ slug: "unrelated", title: "Example Labs ships Orion" });

  const all = [inTitle, inDeck, inTags, inCompanies, inModels, unrelated];

  test("matches the title, the deck, tags, companies and models", () => {
    const found = applyFilters(all, filters({ q: "northwind" }));
    expect(slugs(found).sort()).toEqual(
      ["in-companies", "in-deck", "in-models", "in-tags", "in-title"].sort()
    );
    expect(slugs(found)).not.toContain("unrelated");
  });

  test("search is case-insensitive", () => {
    expect(applyFilters(all, filters({ q: "NORTHWIND" }))).toHaveLength(5);
    expect(applyFilters(all, filters({ q: "NorthWind" }))).toHaveLength(5);
  });

  test("search is accent-insensitive in both directions", () => {
    const accented = makeCard({
      slug: "accented",
      title: "La Compañía Ejemplo lanza Órion",
      deck: "Una ventana de contexto más grande y un precio más bajo.",
    });

    expect(slugs(applyFilters([accented], filters({ q: "compania orion" })))).toEqual(["accented"]);
    expect(slugs(applyFilters([accented], filters({ q: "Compañía" })))).toEqual(["accented"]);

    const unaccented = makeCard({ slug: "unaccented", title: "Compania Ejemplo lanza Orion" });
    expect(slugs(applyFilters([unaccented], filters({ q: "compañía" })))).toEqual(["unaccented"]);
  });

  test("multiple tokens are AND-ed, not OR-ed", () => {
    // Each card carries a neutral deck so the only occurrences of the two
    // tokens are the ones the test puts there on purpose.
    const neutralDeck = "The vendor documented the change in its changelog.";
    const onlyOpenTerm = makeCard({
      slug: "only-openai",
      title: "OpenAI ships a new model",
      deck: neutralDeck,
    });
    const onlyPricing = makeCard({
      slug: "only-pricing",
      title: "Anthropic changes pricing",
      deck: neutralDeck,
    });
    const both = makeCard({
      slug: "both",
      title: "OpenAI changes pricing for its API",
      deck: neutralDeck,
    });
    const pool = [onlyOpenTerm, onlyPricing, both];

    expect(slugs(applyFilters(pool, filters({ q: "openai pricing" })))).toEqual(["both"]);

    // Each token alone is wider — proving the AND is doing the narrowing.
    expect(applyFilters(pool, filters({ q: "openai" }))).toHaveLength(2);
    expect(applyFilters(pool, filters({ q: "pricing" }))).toHaveLength(2);
  });

  test("tokens may match across different fields of the same card", () => {
    // "release" only exists in the title, "pricing" only in the tags.
    const split = makeCard({
      slug: "split",
      title: "A quiet release",
      deck: "The vendor documented the change in its changelog.",
      tags: ["pricing"],
    });
    expect(slugs(applyFilters([split], filters({ q: "release pricing" })))).toEqual(["split"]);
  });

  test("extra whitespace between tokens is harmless", () => {
    const card = makeCard({ slug: "spaced", title: "OpenAI changes pricing" });
    expect(applyFilters([card], filters({ q: "  openai   pricing  " }))).toHaveLength(1);
  });

  test("matching is substring-based within the haystack", () => {
    const card = makeCard({ slug: "substring", title: "Example Labs ships Orion" });
    expect(applyFilters([card], filters({ q: "rion" }))).toHaveLength(1);
  });

  test("a whitespace-only query narrows nothing", () => {
    expect(applyFilters(all, filters({ q: "   " }))).toHaveLength(all.length);
  });

  test("a query that matches nothing returns an empty list, not everything", () => {
    expect(applyFilters(all, filters({ q: "zzzz-no-such-token" }))).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// applyFilters — facets
// ---------------------------------------------------------------------------

describe("applyFilters — company facet", () => {
  const meta = makeCard({ slug: "meta", companies: ["Meta"] });
  const metabase = makeCard({ slug: "metabase", companies: ["Metabase"] });
  const both = makeCard({ slug: "both", companies: ["Metabase", "Meta"] });
  const pool = [meta, metabase, both];

  test("is an EXACT normalized match, never a substring match", () => {
    // The bug this prevents: "Meta" quietly dragging in "Metabase".
    expect(slugs(applyFilters(pool, filters({ company: "Meta" }))).sort()).toEqual(
      ["both", "meta"].sort()
    );
    expect(slugs(applyFilters(pool, filters({ company: "Metabase" }))).sort()).toEqual(
      ["both", "metabase"].sort()
    );
  });

  test("matches regardless of case and accents", () => {
    const accented = makeCard({ slug: "accented", companies: ["Compañía Ejemplo"] });
    expect(applyFilters([accented], filters({ company: "compania ejemplo" }))).toHaveLength(1);
    expect(applyFilters([accented], filters({ company: "COMPAÑÍA EJEMPLO" }))).toHaveLength(1);
    expect(applyFilters([accented], filters({ company: "  Compañía Ejemplo  " }))).toHaveLength(1);
  });

  test("a card with no companies never matches a company filter", () => {
    const none = makeCard({ slug: "none", companies: [] });
    expect(applyFilters([none], filters({ company: "Meta" }))).toEqual([]);
  });

  test("a partial company name does not match", () => {
    expect(applyFilters(pool, filters({ company: "Met" }))).toEqual([]);
  });
});

describe("applyFilters — edition and category facets", () => {
  const daily = makeCard({ slug: "daily", edition: "daily", category: "model-release" });
  const recap = makeCard({ slug: "recap", edition: "weekly-recap", category: "digest" });
  const ahead = makeCard({ slug: "ahead", edition: "week-ahead", category: "digest" });
  const pool = [daily, recap, ahead];

  test("edition selects exactly one edition", () => {
    expect(slugs(applyFilters(pool, filters({ edition: "daily" })))).toEqual(["daily"]);
    expect(slugs(applyFilters(pool, filters({ edition: "weekly-recap" })))).toEqual(["recap"]);
    expect(slugs(applyFilters(pool, filters({ edition: "week-ahead" })))).toEqual(["ahead"]);
  });

  test("category selects every card in that category", () => {
    expect(slugs(applyFilters(pool, filters({ category: "digest" }))).sort()).toEqual(
      ["ahead", "recap"].sort()
    );
    expect(slugs(applyFilters(pool, filters({ category: "policy" })))).toEqual([]);
  });

  test("edition and category intersect", () => {
    expect(
      slugs(applyFilters(pool, filters({ edition: "weekly-recap", category: "digest" })))
    ).toEqual(["recap"]);
    expect(
      applyFilters(pool, filters({ edition: "weekly-recap", category: "model-release" }))
    ).toEqual([]);
  });
});

describe("applyFilters — date range", () => {
  const pool = [
    makeCard({ slug: "aug-01", eventDate: "2026-08-01" }),
    makeCard({ slug: "aug-05", eventDate: "2026-08-05" }),
    makeCard({ slug: "aug-10", eventDate: "2026-08-10" }),
    makeCard({ slug: "sep-02", eventDate: "2026-09-02" }),
  ];

  test("from is inclusive of its own day", () => {
    expect(slugs(applyFilters(pool, filters({ from: "2026-08-05", sort: "oldest" })))).toEqual([
      "aug-05",
      "aug-10",
      "sep-02",
    ]);
  });

  test("to is inclusive of its own day", () => {
    expect(slugs(applyFilters(pool, filters({ to: "2026-08-05", sort: "oldest" })))).toEqual([
      "aug-01",
      "aug-05",
    ]);
  });

  test("a single-day range returns exactly that day", () => {
    expect(
      slugs(applyFilters(pool, filters({ from: "2026-08-05", to: "2026-08-05" })))
    ).toEqual(["aug-05"]);
  });

  test("both bounds together select the closed interval", () => {
    expect(
      slugs(applyFilters(pool, filters({ from: "2026-08-01", to: "2026-08-10", sort: "oldest" })))
    ).toEqual(["aug-01", "aug-05", "aug-10"]);
  });

  test("the range compares dates, not strings-that-look-like-dates", () => {
    // Crossing a month boundary is where a naive lexicographic comparison of a
    // non-padded format would break; YYYY-MM-DD is safe and this pins it.
    expect(slugs(applyFilters(pool, filters({ from: "2026-08-11" })))).toEqual(["sep-02"]);
  });

  test("an inverted range returns nothing rather than everything", () => {
    expect(applyFilters(pool, filters({ from: "2026-09-01", to: "2026-08-01" }))).toEqual([]);
  });
});

describe("applyFilters — combined filters intersect", () => {
  // Every card below satisfies the whole filter EXCEPT the one dimension its
  // slug names, so relaxing that one dimension is what lets it back in.
  const base: Partial<ArticleCard> = {
    title: "Northwind publishes a disclosure rule",
    edition: "daily",
    category: "policy",
    companies: ["Northwind Compute"],
    eventDate: "2026-08-05",
  };

  const pool = [
    makeCard({ ...base, slug: "hit" }),
    makeCard({ ...base, slug: "wrong-category", category: "product" }),
    makeCard({ ...base, slug: "wrong-date", eventDate: "2026-07-01" }),
    makeCard({ ...base, slug: "wrong-company", companies: ["Example Labs"] }),
    makeCard({ ...base, slug: "wrong-edition", edition: "weekly-recap" }),
  ];

  const narrow = filters({
    q: "disclosure rule",
    company: "Northwind Compute",
    edition: "daily",
    category: "policy",
    from: "2026-08-01",
    to: "2026-08-31",
  });

  test("only the card satisfying every condition survives", () => {
    expect(slugs(applyFilters(pool, narrow))).toEqual(["hit"]);
  });

  test("relaxing one condition at a time widens the result", () => {
    expect(applyFilters(pool, { ...narrow, category: null }).length).toBeGreaterThan(1);
    expect(applyFilters(pool, { ...narrow, company: null }).length).toBeGreaterThan(1);
    expect(applyFilters(pool, { ...narrow, edition: null }).length).toBeGreaterThan(1);
    expect(applyFilters(pool, { ...narrow, from: null, to: null }).length).toBeGreaterThan(1);
  });

  test("the empty state returns everything", () => {
    expect(applyFilters(pool, EMPTY_FILTERS)).toHaveLength(pool.length);
  });
});

// ---------------------------------------------------------------------------
// applyFilters — ordering
// ---------------------------------------------------------------------------

describe("applyFilters — sorting", () => {
  const pool = [
    makeCard({ slug: "middle", eventDate: "2026-08-05" }),
    makeCard({ slug: "oldest", eventDate: "2026-08-01" }),
    makeCard({ slug: "newest", eventDate: "2026-08-10" }),
  ];

  test("newest is the default direction", () => {
    expect(slugs(applyFilters(pool, EMPTY_FILTERS))).toEqual(["newest", "middle", "oldest"]);
  });

  test("oldest reverses it exactly", () => {
    expect(slugs(applyFilters(pool, filters({ sort: "oldest" })))).toEqual([
      "oldest",
      "middle",
      "newest",
    ]);
  });

  test("two cards on the same event date fall back to publishedAt", () => {
    const sameDay = [
      makeCard({
        slug: "published-second",
        eventDate: "2026-08-07",
        publishedAt: "2026-08-07T18:00:00.000Z",
      }),
      makeCard({
        slug: "published-first",
        eventDate: "2026-08-07",
        publishedAt: "2026-08-07T09:00:00.000Z",
      }),
    ];

    expect(slugs(applyFilters(sameDay, EMPTY_FILTERS))).toEqual([
      "published-second",
      "published-first",
    ]);
    expect(slugs(applyFilters(sameDay, filters({ sort: "oldest" })))).toEqual([
      "published-first",
      "published-second",
    ]);
  });

  test("the tiebreak only applies within an event date, never across it", () => {
    const pool2 = [
      makeCard({
        slug: "old-event-published-late",
        eventDate: "2026-08-01",
        publishedAt: "2026-08-09T23:00:00.000Z",
      }),
      makeCard({
        slug: "new-event-published-early",
        eventDate: "2026-08-08",
        publishedAt: "2026-08-08T01:00:00.000Z",
      }),
    ];

    expect(slugs(applyFilters(pool2, EMPTY_FILTERS))).toEqual([
      "new-event-published-early",
      "old-event-published-late",
    ]);
  });

  test("a missing publishedAt sorts as the earliest, and never throws", () => {
    const sameDay = [
      makeCard({ slug: "unpublished", eventDate: "2026-08-07", publishedAt: null }),
      makeCard({
        slug: "published",
        eventDate: "2026-08-07",
        publishedAt: "2026-08-07T09:00:00.000Z",
      }),
    ];

    expect(slugs(applyFilters(sameDay, filters({ sort: "oldest" })))).toEqual([
      "unpublished",
      "published",
    ]);
  });

  test("the input array is not mutated", () => {
    const input = [...pool];
    const before = slugs(input);
    applyFilters(input, EMPTY_FILTERS);
    expect(slugs(input)).toEqual(before);
  });

  test("an empty input stays empty", () => {
    expect(applyFilters([], filters({ q: "anything" }))).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Facet collection
// ---------------------------------------------------------------------------

describe("collectCompanies", () => {
  test("dedupes case and accent variants, keeping the first-seen display form", () => {
    const cards = [
      makeCard({ slug: "a", companies: ["OpenAI"] }),
      makeCard({ slug: "b", companies: ["openai", "Anthropic"] }),
      makeCard({ slug: "c", companies: ["Compañía Ejemplo"] }),
      makeCard({ slug: "d", companies: ["compania ejemplo", "OPENAI"] }),
    ];

    // Sorted, deduped, and each entry is the spelling first encountered.
    expect(collectCompanies(cards)).toEqual(["Anthropic", "Compañía Ejemplo", "OpenAI"]);
  });

  test("is sorted, not insertion-ordered", () => {
    const cards = [
      makeCard({ slug: "a", companies: ["Zeta Systems"] }),
      makeCard({ slug: "b", companies: ["Alpha Labs"] }),
      makeCard({ slug: "c", companies: ["Midway AI"] }),
    ];
    expect(collectCompanies(cards)).toEqual(["Alpha Labs", "Midway AI", "Zeta Systems"]);
  });

  test("skips blank company names instead of offering an empty facet", () => {
    const cards = [
      makeCard({ slug: "a", companies: ["  ", "Example Labs"] }),
      makeCard({ slug: "b", companies: [] }),
    ];
    expect(collectCompanies(cards)).toEqual(["Example Labs"]);
  });

  test("an empty window yields an empty facet list", () => {
    expect(collectCompanies([])).toEqual([]);
  });

  test("every collected value round-trips back through the company filter", () => {
    const cards = [
      makeCard({ slug: "a", companies: ["Compañía Ejemplo"] }),
      makeCard({ slug: "b", companies: ["Northwind Compute"] }),
    ];

    for (const company of collectCompanies(cards)) {
      expect(applyFilters(cards, filters({ company })).length).toBeGreaterThan(0);
    }
  });
});

describe("collectCategories", () => {
  test("returns only categories present, in BLOG_CATEGORIES order", () => {
    const cards = [
      makeCard({ slug: "a", category: "digest" }),
      makeCard({ slug: "b", category: "security" }),
      makeCard({ slug: "c", category: "model-release" }),
      makeCard({ slug: "d", category: "security" }),
    ];

    expect(collectCategories(cards)).toEqual(["model-release", "security", "digest"]);
  });

  test("never offers a category with no articles behind it", () => {
    const cards = [makeCard({ slug: "a", category: "policy" })];
    const collected = collectCategories(cards);

    expect(collected).toEqual(["policy"]);
    expect(collected).not.toContain("funding");
  });

  test("an empty window yields an empty facet list", () => {
    expect(collectCategories([])).toEqual([]);
  });

  test("the full set comes back in the canonical domain order", () => {
    const cards = [...BLOG_CATEGORIES]
      .reverse()
      .map((category, i) => makeCard({ slug: `cat-${i}`, category }));

    expect(collectCategories(cards)).toEqual([...BLOG_CATEGORIES]);
  });
});

// ---------------------------------------------------------------------------
// paginate
// ---------------------------------------------------------------------------

describe("paginate", () => {
  const items = Array.from({ length: 25 }, (_, i) => i + 1);

  test("the first page reports the right counts and neighbours", () => {
    expect(paginate(items, 1, 10)).toEqual({
      items: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      page: 1,
      pages: 3,
      total: 25,
      hasPrev: false,
      hasNext: true,
    });
  });

  test("a middle page has both neighbours", () => {
    const result = paginate(items, 2, 10);
    expect(result.items).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
    expect(result).toMatchObject({ page: 2, hasPrev: true, hasNext: true });
  });

  test("the last page is short and has no next", () => {
    const result = paginate(items, 3, 10);
    expect(result.items).toEqual([21, 22, 23, 24, 25]);
    expect(result).toMatchObject({ page: 3, hasPrev: true, hasNext: false });
  });

  test("a page below 1 clamps to the first page", () => {
    for (const page of [0, -1, -99]) {
      expect(paginate(items, page, 10)).toMatchObject({ page: 1, hasPrev: false, hasNext: true });
    }
  });

  test("a page beyond the end clamps to the last page", () => {
    for (const page of [4, 99, 1_000]) {
      const result = paginate(items, page, 10);
      expect(result.page).toBe(3);
      expect(result.items).toEqual([21, 22, 23, 24, 25]);
      expect(result.hasNext).toBe(false);
    }
  });

  test("an exact multiple does not produce a trailing empty page", () => {
    const twenty = items.slice(0, 20);
    expect(paginate(twenty, 2, 10)).toMatchObject({ pages: 2, hasNext: false });
    expect(paginate(twenty, 2, 10).items).toHaveLength(10);
  });

  test("a page size larger than the list yields a single page", () => {
    expect(paginate(items, 1, 100)).toMatchObject({
      page: 1,
      pages: 1,
      total: 25,
      hasPrev: false,
      hasNext: false,
    });
  });

  test("an empty list still reports one page, with no next", () => {
    expect(paginate([], 1, 10)).toEqual({
      items: [],
      page: 1,
      pages: 1,
      total: 0,
      hasPrev: false,
      hasNext: false,
    });

    // ...and an out-of-range page on an empty list still clamps to 1.
    expect(paginate([], 5, 10)).toMatchObject({ page: 1, pages: 1, hasNext: false });
  });

  test("pages tile the whole list without loss or overlap", () => {
    const seen = [
      ...paginate(items, 1, 10).items,
      ...paginate(items, 2, 10).items,
      ...paginate(items, 3, 10).items,
    ];
    expect(seen).toEqual(items);
  });
});

// ---------------------------------------------------------------------------
// filtersToQuery
// ---------------------------------------------------------------------------

describe("filtersToQuery", () => {
  test("returns an empty string when nothing is set", () => {
    expect(filtersToQuery(EMPTY_FILTERS)).toBe("");
  });

  test("omits the default sort, and only the default sort", () => {
    expect(filtersToQuery(filters({ sort: "newest" }))).toBe("");
    expect(filtersToQuery(filters({ sort: "oldest" }))).toBe("?sort=oldest");
  });

  test("serializes each filter it is given", () => {
    const query = filtersToQuery(
      filters({
        q: "orion",
        company: "Example Labs",
        edition: "weekly-recap",
        category: "policy",
        from: "2026-08-01",
        to: "2026-08-31",
      })
    );

    const params = new URLSearchParams(query.replace(/^\?/, ""));
    expect(params.get("q")).toBe("orion");
    expect(params.get("company")).toBe("Example Labs");
    expect(params.get("edition")).toBe("weekly-recap");
    expect(params.get("category")).toBe("policy");
    expect(params.get("from")).toBe("2026-08-01");
    expect(params.get("to")).toBe("2026-08-31");
    expect(params.get("sort")).toBeNull();
    expect(query.startsWith("?")).toBe(true);
  });

  test("round-trips through parseFilters", () => {
    const states: BlogFilterState[] = [
      EMPTY_FILTERS,
      filters({ q: "orion" }),
      filters({ sort: "oldest" }),
      filters({ company: "Compañía Ejemplo" }),
      filters({ edition: "week-ahead", category: "digest" }),
      filters({ from: "2026-08-01", to: "2026-08-31" }),
      filters({
        q: "orion pricing",
        company: "Example Labs",
        edition: "daily",
        category: "model-release",
        from: "2026-01-01",
        to: "2026-12-31",
        sort: "oldest",
      }),
    ];

    for (const state of states) {
      expect(roundTrip(state)).toEqual(state);
    }
  });

  test("values needing encoding survive the round trip", () => {
    const state = filters({ q: "orion & pricing?", company: "A/B Labs" });
    expect(filtersToQuery(state)).not.toContain(" ");
    expect(roundTrip(state)).toEqual(state);
  });

  test("extra params are appended, and empty extras are skipped", () => {
    expect(filtersToQuery(EMPTY_FILTERS, { page: "2" })).toBe("?page=2");
    expect(filtersToQuery(EMPTY_FILTERS, { page: "" })).toBe("");

    const params = new URLSearchParams(
      filtersToQuery(filters({ q: "orion", sort: "oldest" }), { page: "3" }).replace(/^\?/, "")
    );
    expect(params.get("q")).toBe("orion");
    expect(params.get("sort")).toBe("oldest");
    expect(params.get("page")).toBe("3");
  });

  test("the query a filtered page links to reproduces the same result set", () => {
    const pool = [
      makeCard({ slug: "policy-aug", category: "policy", eventDate: "2026-08-05" }),
      makeCard({ slug: "policy-jul", category: "policy", eventDate: "2026-07-05" }),
      makeCard({ slug: "product-aug", category: "product", eventDate: "2026-08-05" }),
    ];
    const state = filters({ category: "policy", from: "2026-08-01" });

    const direct = applyFilters(pool, state);
    const viaUrl = applyFilters(pool, roundTrip(state));

    expect(slugs(viaUrl)).toEqual(slugs(direct));
    expect(slugs(direct)).toEqual(["policy-aug"]);
  });
});
