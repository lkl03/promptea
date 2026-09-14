// lib/newsletter/generate.ts
//
// v1.5.0 — derives a weekly newsletter edition from the AI Daily archive.
//
// The digest is not an independent research pipeline. It selects, ranks, and
// summarises stories that AI Daily has already researched and verified. No new
// factual claims are introduced; every story in the newsletter traces back to
// a published article with its sources intact.

import "server-only";

import { listAllPublishedArticles } from "@/lib/blog/server";
import { addDays, editorialDate } from "@/lib/blog/dates";
import type { PublicArticle } from "@/lib/blog/types";
import type { Lang } from "@/lib/domain";
import type {
  NewsletterEdition,
  NewsletterLocaleContent,
  NewsletterStory,
  NewsletterTool,
} from "@/lib/newsletter/types";

/**
 * Determine the Monday delivery date for the current week.
 * If called before Monday, returns the upcoming Monday;
 * if called on or after Monday, returns this week's Monday.
 */
export function nextMonday(from: Date = new Date()): string {
  const today = editorialDate(from);
  const [y, m, d] = today.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const daysUntilMonday = dow === 0 ? 1 : dow === 1 ? 0 : 8 - dow;
  return addDays(today, daysUntilMonday);
}

/**
 * Collect AI Daily articles from the past week (Sunday through Saturday)
 * as candidates for the weekly digest.
 */
export async function collectWeekCandidates(
  weekStart: string,
  weekEnd: string,
  lang: Lang
): Promise<PublicArticle[]> {
  const all = await listAllPublishedArticles(lang, 100);
  return all.filter((a) => {
    if (a.edition === "weekly-recap" || a.edition === "week-ahead") return false;
    return a.eventDate >= weekStart && a.eventDate <= weekEnd;
  });
}

/**
 * Rank articles by importance (P0 > P1 > P2) then by date (newest first).
 */
function rankArticles(articles: PublicArticle[]): PublicArticle[] {
  const importanceOrder: Record<string, number> = { P0: 0, P1: 1, P2: 2 };
  return [...articles].sort((a, b) => {
    const ia = importanceOrder[a.importance] ?? 3;
    const ib = importanceOrder[b.importance] ?? 3;
    if (ia !== ib) return ia - ib;
    return b.eventDate.localeCompare(a.eventDate);
  });
}

function articleToStory(article: PublicArticle): NewsletterStory {
  const primarySource = article.sources.find((s) => s.primary);
  return {
    articleSlug: article.slug,
    headline: article.title,
    summary: article.deck,
    whyItMatters: article.whyItMatters[0] ?? article.deck,
    sourceUrl: primarySource?.url ?? article.sources[0]?.url ?? "https://www.promptea.me",
    category: article.category,
  };
}

/**
 * Pick articles that look like tool/launch stories for the "tools" section.
 */
function extractTools(articles: PublicArticle[]): NewsletterTool[] {
  const toolCategories = new Set(["developer-tools", "product", "open-source", "agents"]);
  return articles
    .filter((a) => toolCategories.has(a.category))
    .slice(0, 5)
    .map((a) => ({
      title: a.title,
      description: a.deck.slice(0, 300),
      url: a.sources.find((s) => s.primary)?.url ?? a.sources[0]?.url ?? "https://www.promptea.me",
    }));
}

function buildLocaleContent(
  articles: PublicArticle[],
  lang: Lang,
  weekStart: string,
  weekEnd: string
): NewsletterLocaleContent {
  const ranked = rankArticles(articles);
  const hero = ranked[0];
  const topStories = ranked.slice(0, 6).map(articleToStory);
  const tools = extractTools(ranked.slice(1));

  const weekLabel = lang === "es"
    ? `${weekStart} – ${weekEnd}`
    : `${weekStart} – ${weekEnd}`;

  const subject = lang === "es"
    ? `Promptea Semanal — ${hero?.title ?? "Lo mejor de la semana en IA"}`
    : `Promptea Weekly — ${hero?.title ?? "Best of the week in AI"}`;

  const preheader = lang === "es"
    ? `${topStories.length} historias verificadas de IA de la semana del ${weekLabel}.`
    : `${topStories.length} verified AI stories from the week of ${weekLabel}.`;

  return {
    subject: subject.slice(0, 200),
    preheader: preheader.slice(0, 300),
    heroHeadline: hero?.title ?? (lang === "es" ? "Lo mejor de la semana en IA" : "Best of the week in AI"),
    heroDeck: hero?.deck ?? (lang === "es" ? "Las historias más importantes de IA de los últimos siete días." : "The most important AI stories from the past seven days."),
    topStories: topStories.length >= 4 ? topStories : padStories(topStories, lang),
    tools: tools.length >= 3 ? tools : padTools(tools, lang),
    editorialTitle: null,
    editorialBody: null,
  };
}

function padStories(stories: NewsletterStory[], lang: Lang): NewsletterStory[] {
  const pad: NewsletterStory = {
    articleSlug: "placeholder",
    headline: lang === "es" ? "Más historias en AI Daily" : "More stories on AI Daily",
    summary: lang === "es"
      ? "Visitá AI Daily para más historias de IA verificadas de esta semana."
      : "Visit AI Daily for more verified AI stories from this week.",
    whyItMatters: lang === "es"
      ? "AI Daily publica historias verificadas todos los días."
      : "AI Daily publishes verified stories every day.",
    sourceUrl: "https://www.promptea.me/en/blog",
    category: "other",
  };
  while (stories.length < 4) stories.push(pad);
  return stories;
}

function padTools(tools: NewsletterTool[], lang: Lang): NewsletterTool[] {
  const pad: NewsletterTool = {
    title: lang === "es" ? "Explorar más en Promptea" : "Explore more on Promptea",
    description: lang === "es"
      ? "Analizá y mejorá tus prompts de IA."
      : "Analyze and improve your AI prompts.",
    url: "https://www.promptea.me",
  };
  while (tools.length < 3) tools.push(pad);
  return tools;
}

/**
 * Generate a newsletter edition from the AI Daily archive for the week
 * ending on the given Saturday (or the most recent Saturday if not provided).
 */
export async function generateWeeklyEdition(opts?: {
  weekEnd?: string;
  now?: Date;
}): Promise<NewsletterEdition | null> {
  const now = opts?.now ?? new Date();
  const today = editorialDate(now);

  const weekEnd = opts?.weekEnd ?? addDays(today, -(parseInt(today.split("-")[2]) % 7 || 7));
  const weekStart = addDays(weekEnd, -6);
  const monday = addDays(weekEnd, 2);

  const [enArticles, esArticles] = await Promise.all([
    collectWeekCandidates(weekStart, weekEnd, "en"),
    collectWeekCandidates(weekStart, weekEnd, "es"),
  ]);

  if (enArticles.length === 0 && esArticles.length === 0) return null;

  const enContent = buildLocaleContent(
    enArticles.length > 0 ? enArticles : esArticles,
    "en",
    weekStart,
    weekEnd
  );
  const esContent = buildLocaleContent(
    esArticles.length > 0 ? esArticles : enArticles,
    "es",
    weekStart,
    weekEnd
  );

  return {
    editionId: `promptea-weekly_${monday}`,
    weekStart,
    weekEnd,
    status: "draft",
    locales: { en: enContent, es: esContent },
    sponsor: null,
    generatedAt: now.toISOString(),
    publishedAt: null,
    sentAt: null,
  };
}
