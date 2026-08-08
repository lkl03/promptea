// app/[lang]/blog/feed.xml/route.ts
//
// v1.4.0 — RSS 2.0 for AI Daily, one feed per locale.
//
// Three things this route refuses to do:
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
// Routing note: proxy.ts skips any pathname containing a dot, so
// /en/blog/feed.xml is never locale-redirected and needs no extra matcher.

import { hasLocale } from "../../dictionaries";
import type { Lang } from "@/lib/domain";
import { escapeXml, truncateWords } from "@/lib/blog/render";
import { listAllPublishedArticles } from "@/lib/blog/server";
import { blogArticlePath, blogFeedPath, blogIndexPath } from "@/lib/blog/jsonld";
import { getSiteUrl } from "@/lib/seo/site";
import type { PublicArticle } from "@/lib/blog/types";

export const runtime = "nodejs";
export const revalidate = 300;

/** Newest N articles. An aggregator does not need the full archive. */
const FEED_LIMIT = 50;

const CHANNEL: Record<Lang, { title: string; description: string; language: string }> = {
  es: {
    title: "Promptea · AI Daily",
    description:
      "Una noticia de inteligencia artificial por día, con fuentes verificadas y el contexto que necesitás. Enterate de lo que importa en cinco minutos.",
    language: "es-AR",
  },
  en: {
    title: "Promptea · AI Daily",
    description:
      "One AI story a day, with verified sources and the context you need. The news that matters, in five minutes.",
    language: "en-US",
  },
};

// ---------------------------------------------------------------------------
// RFC-822 dates
// ---------------------------------------------------------------------------

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** `Sat, 08 Aug 2026 09:30:00 GMT` — the only date format RSS 2.0 accepts. */
function rfc822(date: Date): string {
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
  const candidates = [article.publishedAt, article.eventDate];
  for (const raw of candidates) {
    if (!raw) continue;
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return fallback;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ lang: string }> }
): Promise<Response> {
  const { lang } = await params;
  if (!hasLocale(lang)) {
    return new Response("Not found", { status: 404 });
  }
  const l = (lang === "en" ? "en" : "es") as Lang;

  const siteUrl = getSiteUrl().replace(/\/+$/, "");
  const indexUrl = `${siteUrl}${blogIndexPath(l)}`;
  const feedUrl = `${siteUrl}${blogFeedPath(l)}`;
  const now = new Date();

  // Firestore is optional infrastructure from this route's point of view.
  let articles: PublicArticle[] = [];
  try {
    articles = await listAllPublishedArticles(l, FEED_LIMIT);
  } catch {
    articles = [];
  }

  const lastBuild = articles.length > 0 ? itemDate(articles[0], now) : now;
  const channel = CHANNEL[l];

  const items = articles.map((article) => {
    const link = `${siteUrl}${blogArticlePath(l, article.slug)}`;
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

  const xml = [
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

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
