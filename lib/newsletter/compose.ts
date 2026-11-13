// lib/newsletter/compose.ts
//
// v1.6.0 — pure edition builder (no Firestore, no network).
//
// The digest is not an independent research pipeline: it selects and ranks
// stories AI Daily has already researched and verified, and every item links
// back to its published article. No new factual claims are introduced.
//
// Quiet weeks are sent as they are — no placeholder stories. (v1.5.0 padded
// the list to four with a "placeholder" slug whose link 404ed.)

import { isWeeklyEdition, sectionOfEdition, type ContentLang } from "@/lib/domain";
import type { PublicArticle } from "@/lib/blog/types";
import type { NewsletterEdition, NewsletterLocaleContent, NewsletterStory, NewsletterTool } from "./types";
import type { EditionWindow } from "./dates";

const MAX_STORIES = 6;
const MAX_TOOLS = 5;
/** v1.8.3 — how many AI Daily Tech stories the "Tech" block of the digest carries. */
export const MAX_TECH_STORIES = 3;
const TOOL_CATEGORIES = new Set(["developer-tools", "product", "open-source", "agents"]);

/**
 * AI stories inside the covered window. Weekly editions are summaries, not
 * stories; Tech stories (v1.8.3) have their own block — see techCandidates —
 * so the main list, the hero and the subject line stay what the digest has
 * always been: the week in AI.
 */
export function weekCandidates(articles: PublicArticle[], window: EditionWindow): PublicArticle[] {
  return articles.filter((a) => {
    if (isWeeklyEdition(a.edition)) return false;
    if (sectionOfEdition(a.edition) !== "ai") return false;
    return a.eventDate >= window.weekStart && a.eventDate <= window.weekEnd;
  });
}

/** v1.8.3 — AI Daily Tech stories inside the covered window. */
export function techCandidates(articles: PublicArticle[], window: EditionWindow): PublicArticle[] {
  return articles.filter((a) => sectionOfEdition(a.edition) === "tech" && a.eventDate >= window.weekStart && a.eventDate <= window.weekEnd);
}

/** Importance first (P0 > P1 > P2), then newest event first, then slug for stability. */
export function rankArticles(articles: PublicArticle[]): PublicArticle[] {
  const order: Record<string, number> = { P0: 0, P1: 1, P2: 2 };
  return [...articles].sort((a, b) => {
    const ia = order[a.importance] ?? 3;
    const ib = order[b.importance] ?? 3;
    if (ia !== ib) return ia - ib;
    const byDate = b.eventDate.localeCompare(a.eventDate);
    if (byDate !== 0) return byDate;
    return a.slug.localeCompare(b.slug);
  });
}

function articleUrl(siteUrl: string, lang: ContentLang, slug: string): string {
  return `${siteUrl}/${lang}/blog/${slug}`;
}

function sourceUrlOf(article: PublicArticle, siteUrl: string): string {
  const primary = article.sources.find((s) => s.primary)?.url ?? article.sources[0]?.url;
  return primary ?? articleUrl(siteUrl, article.lang, article.slug);
}

function toStory(article: PublicArticle, siteUrl: string): NewsletterStory {
  return {
    articleSlug: article.slug,
    headline: article.title.slice(0, 160),
    summary: article.deck.slice(0, 600),
    whyItMatters: (article.whyItMatters[0] ?? article.deck).slice(0, 400),
    sourceUrl: sourceUrlOf(article, siteUrl),
    category: article.category,
  };
}

function toTool(article: PublicArticle, siteUrl: string): NewsletterTool {
  return {
    title: article.title.slice(0, 120),
    description: article.deck.slice(0, 300),
    url: sourceUrlOf(article, siteUrl),
  };
}

function localeContent(articles: PublicArticle[], tech: PublicArticle[], lang: ContentLang, window: EditionWindow, siteUrl: string): NewsletterLocaleContent {
  const ranked = rankArticles(articles);
  const hero = ranked[0];
  const stories = ranked.slice(0, MAX_STORIES);
  // Tools come from launch-type stories NOT already listed above, so the same
  // article never appears twice in one email.
  const tools = ranked
    .slice(stories.length)
    .filter((a) => TOOL_CATEGORIES.has(a.category))
    .slice(0, MAX_TOOLS);

  const es = lang === "es";
  const range = `${window.weekStart} – ${window.weekEnd}`;
  const count = stories.length;

  return {
    subject: (es ? `Promptea Semanal — ${hero.title}` : `Promptea Weekly — ${hero.title}`).slice(0, 200),
    preheader: (es
      ? `${count} ${count === 1 ? "historia verificada" : "historias verificadas"} de IA de la semana del ${range}.`
      : `${count} verified AI ${count === 1 ? "story" : "stories"} from the week of ${range}.`
    ).slice(0, 300),
    heroHeadline: hero.title.slice(0, 200),
    heroDeck: hero.deck.slice(0, 400),
    topStories: stories.map((a) => toStory(a, siteUrl)),
    tools: tools.map((a) => toTool(a, siteUrl)),
    // v1.8.3 — the "Tech" block: the week's Tech stories by the same ranking.
    // Empty in a week without Tech stories (the block is then not rendered).
    techStories: rankArticles(tech).slice(0, MAX_TECH_STORIES).map((a) => toStory(a, siteUrl)),
    editorialTitle: null,
    editorialBody: null,
  };
}

/**
 * Build the edition for `window` from each locale's published articles.
 * Returns null when the week has no eligible AI Daily story in either locale
 * (nothing is sent rather than an empty or padded email).
 */
export function buildEdition(input: {
  window: EditionWindow;
  en: PublicArticle[];
  es: PublicArticle[];
  now: Date;
  siteUrl: string;
}): NewsletterEdition | null {
  const en = weekCandidates(input.en, input.window);
  const es = weekCandidates(input.es, input.window);
  // A week with Tech stories but no AI story still produces no edition: the
  // digest is the week in AI, and Tech is a block inside it, never the whole email.
  if (en.length === 0 && es.length === 0) return null;
  const techEn = techCandidates(input.en, input.window);
  const techEs = techCandidates(input.es, input.window);

  return {
    editionId: input.window.editionId,
    weekStart: input.window.weekStart,
    weekEnd: input.window.weekEnd,
    status: "draft",
    locales: {
      en: localeContent(en.length ? en : es, techEn.length ? techEn : techEs, "en", input.window, input.siteUrl),
      es: localeContent(es.length ? es : en, techEs.length ? techEs : techEn, "es", input.window, input.siteUrl),
    },
    sponsor: null,
    generatedAt: input.now.toISOString(),
    publishedAt: null,
    sentAt: null,
  };
}
