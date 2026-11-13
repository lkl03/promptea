// lib/blog/feed.ts
//
// RSS 2.0 for AI Daily, one feed per locale AND per section (v1.8.3):
//   /{lang}/blog/feed.xml        the AI section (what this feed has always carried)
//   /{lang}/blog/tech/feed.xml   the Tech section
// Moved here from app/[lang]/blog/feed.xml/route.ts so both routes build their
// document with the same code.
//
// Three things a feed refuses to do:
//
//   * Crash. Firestore being unavailable (no credentials during a local build,
//     an outage in production) yields an EMPTY but structurally valid feed, not
//     a 500. A reader's aggregator sees "no new items", which is the honest and
//     recoverable outcome.
//   * Emit unescaped text. Every interpolated value goes through escapeXml().
//     A single raw `&` in a headline — "Anthropic & OpenAI…" — makes the whole
//     document unparseable for every subscriber at once.
//   * Invent dates. pubDate is RFC-822, built from explicit UTC components with
//     English day/month names, because RFC-822 is not ISO-8601 and toISOString()
//     would produce a date no strict aggregator accepts.
//
// Why the AI feed does not include Tech stories: its subscribers signed up for
// AI news, and the feed is advertised from the AI index, which does not list
// Tech stories either. Each index and its feed carry the same stories.

import { sectionOfEdition, type BlogSection, type ContentLang } from "@/lib/domain";
import { escapeXml, truncateWords } from "@/lib/blog/render";
import { blogArticlePath, blogSectionFeedPath, blogSectionIndexPath } from "@/lib/blog/jsonld";
import type { PublicArticle } from "@/lib/blog/types";

/** Newest N articles. An aggregator does not need the full archive. */
export const FEED_LIMIT = 50;

/**
 * How many recent articles are read to fill one section's feed. Larger than
 * FEED_LIMIT because the other section's stories are filtered out afterwards.
 */
export const FEED_READ_WINDOW = 150;

export const FEED_CHANNEL: Record<BlogSection, Record<ContentLang, { title: string; description: string; language: string }>> = {
  ai: {
    es: {
      title: "Promptea · AI Daily",
      description:
        "Una noticia de inteligencia artificial por día, con fuentes verificadas y el contexto que necesitás. Enterate de lo que importa en cinco minutos.",
      language: "es-AR",
    },
    en: {
      title: "Promptea · AI Daily",
      description: "One AI story a day, with verified sources and the context you need. The news that matters, in five minutes.",
      language: "en-US",
    },
  },
  tech: {
    es: {
      title: "Promptea · AI Daily Tech",
      description:
        "Una nota de tecnología por día (nube, plataformas, frameworks web, herramientas para desarrollar, hardware), contada por lo que cambia para la IA y para quienes desarrollan software. Con fuentes verificadas.",
      language: "es-AR",
    },
    en: {
      title: "Promptea · AI Daily Tech",
      description:
        "One technology story a day — cloud, platforms, web frameworks, developer tools, hardware — told through what it changes for AI and for people who build software. With verified sources.",
      language: "en-US",
    },
  },
};

// ---------------------------------------------------------------------------
// RFC-822 dates
// ---------------------------------------------------------------------------

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** `Sat, 08 Aug 2026 09:30:00 GMT` — the only date format RSS 2.0 accepts. */
export function rfc822(date: Date): string {
  const day = DAYS[date.getUTCDay()];
  const month = MONTHS[date.getUTCMonth()];
  return (
    `${day}, ${pad(date.getUTCDate())} ${month} ${date.getUTCFullYear()} ` +
    `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())} GMT`
  );
}

/**
 * Best available instant for an item: the publication timestamp when Firestore
 * has resolved it, otherwise midnight UTC on the editorial date.
 */
function itemDate(article: PublicArticle, fallback: Date): Date {
  for (const raw of [article.publishedAt, article.eventDate]) {
    if (!raw) continue;
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return fallback;
}

/** The stories of one section, newest first, capped at FEED_LIMIT. */
export function feedArticles(articles: readonly PublicArticle[], section: BlogSection): PublicArticle[] {
  return articles.filter((a) => sectionOfEdition(a.edition) === section).slice(0, FEED_LIMIT);
}

/** The RSS document. Pure: the same articles and `now` always give the same bytes. */
export function buildFeedXml(input: { lang: ContentLang; section: BlogSection; articles: readonly PublicArticle[]; siteUrl: string; now: Date }): string {
  const { lang, section, now } = input;
  const siteUrl = input.siteUrl.replace(/\/+$/, "");
  const articles = feedArticles(input.articles, section);
  const indexUrl = `${siteUrl}${blogSectionIndexPath(lang, section)}`;
  const feedUrl = `${siteUrl}${blogSectionFeedPath(lang, section)}`;
  const channel = FEED_CHANNEL[section][lang];
  const lastBuild = articles.length > 0 ? itemDate(articles[0], now) : now;

  const items = articles.map((article) => {
    const link = `${siteUrl}${blogArticlePath(lang, article.slug)}`;
    const categories = Array.from(new Set([article.category, ...article.tags]));

    return [
      "    <item>",
      `      <title>${escapeXml(article.title)}</title>`,
      `      <link>${escapeXml(link)}</link>`,
      `      <guid isPermaLink="true">${escapeXml(link)}</guid>`,
      `      <pubDate>${escapeXml(rfc822(itemDate(article, now)))}</pubDate>`,
      `      <description>${escapeXml(truncateWords(article.summary, 500))}</description>`,
      ...categories.map((c) => `      <category>${escapeXml(c)}</category>`),
      "    </item>",
    ].join("\n");
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "  <channel>",
    `    <title>${escapeXml(channel.title)}</title>`,
    `    <link>${escapeXml(indexUrl)}</link>`,
    `    <description>${escapeXml(channel.description)}</description>`,
    `    <language>${escapeXml(channel.language)}</language>`,
    `    <lastBuildDate>${escapeXml(rfc822(lastBuild))}</lastBuildDate>`,
    `    <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml" />`,
    ...items,
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");
}
