// Shared fixtures for the SEO/GEO tests: a published article, a weekly edition
// and a benchmarks snapshot. Plain data, no network, no Firestore.

import { buildSnapshot, type BenchmarksSnapshot } from "@/lib/benchmarks/normalize";
import type { PublicArticle } from "@/lib/blog/types";
import type { NewsletterEdition } from "@/lib/newsletter/types";

export const NOW = new Date("2026-11-09T12:00:00.000Z");

export function makeArticle(o: Partial<PublicArticle> & { slug: string; eventDate: string }): PublicArticle {
  const lang = o.lang ?? "en";
  return {
    canonicalSlug: o.slug,
    slug: o.slug,
    lang,
    status: "published",
    title: o.title ?? `Headline for ${o.slug} that is long enough`,
    deck: o.deck ?? `A deck for ${o.slug} that comfortably clears the minimum length.`,
    summary: o.summary ?? `Summary of ${o.slug}.`,
    body: o.body ?? [{ type: "paragraph", text: `Body paragraph of ${o.slug}.` }],
    whyItMatters: [`Why ${o.slug} matters.`],
    keyTakeaways: [`Takeaway of ${o.slug}.`],
    seoTitle: `SEO title ${o.slug}`,
    metaDescription: `Meta description of ${o.slug}.`,
    edition: o.edition ?? "daily",
    eventDate: o.eventDate,
    coveredFrom: null,
    coveredTo: null,
    backdateReason: null,
    publishedAt: o.publishedAt === undefined ? `${o.eventDate}T11:00:00.000Z` : o.publishedAt,
    updatedAt: o.updatedAt ?? null,
    category: o.category ?? "model-release",
    importance: "P1",
    tags: ["ai"],
    companies: [],
    models: [],
    author: "Promptea Editorial",
    sources: [
      { title: "Primary", publisher: "Lab", url: `https://example.com/${o.slug}`, sourceType: "announcement", primary: true, accessedAt: "2026-11-01T00:00:00.000Z" },
    ],
    image: null,
    digestItems: [],
    singleSourceJustification: null,
    correction: null,
    readingMinutes: 3,
    alternateSlugs: o.alternateSlugs ?? { en: o.slug, es: o.slug },
  } as unknown as PublicArticle;
}

export function makeEdition(monday = "2026-11-02"): NewsletterEdition {
  const story = (n: string) => ({ title: `Story ${n} headline`, summary: `Summary of story ${n} for the week.`, url: `https://example.com/${n}`, source: "Lab" });
  const loc = (l: string) => ({
    subject: `Promptea Weekly ${l} subject`,
    preheader: `Preheader ${l} for the week of ${monday}`,
    heroHeadline: `Hero headline ${l} ${monday}`,
    heroDeck: `Hero deck ${l} that is long enough to pass.`,
    topStories: [story("a")],
    tools: [],
    editorialTitle: null,
    editorialBody: null,
  });
  return {
    editionId: `promptea-weekly_${monday}`,
    weekStart: monday,
    weekEnd: "2026-11-08",
    status: "sent",
    locales: { en: loc("en"), es: loc("es") },
    sponsor: null,
    generatedAt: "2026-11-09T09:00:00.000Z",
    publishedAt: "2026-11-09T09:30:00.000Z",
    sentAt: "2026-11-09T10:00:00.000Z",
  } as unknown as NewsletterEdition;
}

const GPQA = (slug: string, name: string, accuracy: number) => ({
  source: "openrouter",
  model_permaslug: slug,
  display_name: name,
  benchmark_type: "gpqa_diamond",
  accuracy,
  accuracy_stddev: 0.03,
  avg_cost_per_task: 0.002,
  total_tasks: 300,
  last_run_timestamp: "2026-11-01T12:00:00Z",
});

export function makeSnapshot(): BenchmarksSnapshot {
  return buildSnapshot(
    {
      data: [GPQA("acme/alpha", "Alpha 1", 0.82), GPQA("acme/beta", "Beta 2", 0.74), GPQA("zeta/gamma", "Gamma 3", 0.66)],
      meta: { as_of: "2026-11-03T00:00:00Z" } as never,
    },
    new Date("2026-11-05T08:00:00.000Z"),
  );
}
