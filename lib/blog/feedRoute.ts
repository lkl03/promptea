// lib/blog/feedRoute.ts
//
// v1.8.3 — the request handler behind both feed routes
// (app/[lang]/blog/feed.xml and app/[lang]/blog/tech/feed.xml). Server-only: it
// reads the article store. The document itself is built by lib/blog/feed.ts.
//
// Routing note: proxy.ts skips any pathname containing a dot, so
// /en/blog/feed.xml is never locale-redirected and needs no extra matcher.

import "server-only";

import { contentLangFor, isContentLang, isLang, type BlogSection } from "@/lib/domain";
import { FEED_READ_WINDOW, buildFeedXml } from "@/lib/blog/feed";
import { blogSectionFeedPath } from "@/lib/blog/jsonld";
import { listAllPublishedArticles } from "@/lib/blog/server";
import type { PublicArticle } from "@/lib/blog/types";
import { getSiteUrl } from "@/lib/seo/site";

export async function feedResponse(lang: string, section: BlogSection): Promise<Response> {
  if (!isLang(lang)) return new Response("Not found", { status: 404 });

  const siteUrl = getSiteUrl().replace(/\/+$/, "");
  // AI Daily is written in Spanish and English: a locale without an edition of
  // its own (pt) has no feed of its own either — it points at the English one.
  if (!isContentLang(lang)) {
    return Response.redirect(`${siteUrl}${blogSectionFeedPath(contentLangFor(lang), section)}`, 308);
  }

  // Firestore is optional infrastructure from this route's point of view.
  let articles: PublicArticle[] = [];
  try {
    articles = await listAllPublishedArticles(lang, FEED_READ_WINDOW);
  } catch {
    articles = [];
  }

  return new Response(buildFeedXml({ lang, section, articles, siteUrl, now: new Date() }), {
    status: 200,
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
