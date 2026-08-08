// app/sitemap.ts
import type { MetadataRoute } from "next";

import { guides } from "@/lib/seo/content/guides";
import { modelPages } from "@/lib/seo/content/models";
import { glossary } from "@/lib/seo/content/glossary";
import { landings } from "@/lib/seo/content/landings";
import { listAllPublishedArticles } from "@/lib/blog/server";
import type { PublicArticle } from "@/lib/blog/types";

/**
 * The sitemap now enumerates AI Daily, which gains an article every day. Without
 * this it would be prerendered once at build time and every article published
 * after the deploy would stay invisible to crawlers until the next one. The
 * static entries below are unaffected — they are recomputed identically.
 */
export const revalidate = 300;

function getSiteUrl(): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env && env.trim().length > 0) {
    const v = env.trim();
    return v.startsWith("http") ? v : `https://${v}`;
  }
  const vercel = process.env.VERCEL_URL;
  if (vercel && vercel.trim().length > 0) return `https://${vercel.trim()}`;
  return "http://localhost:3000";
}

function joinUrl(siteUrl: string, path: string) {
  const base = siteUrl.replace(/\/+$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

/**
 * Parse an ISO instant, tolerating null and garbage. Firestore server
 * timestamps read back as null until they resolve, so the caller supplies a
 * fallback rather than emitting an Invalid Date into the XML.
 */
function toDate(iso: string | null | undefined, fallback: Date): Date {
  if (!iso) return fallback;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? fallback : d;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl().replace(/\/+$/, "");
  const now = new Date();

  const LOCALES = ["es", "en"] as const;
  const urls: MetadataRoute.Sitemap = [];

  for (const lang of LOCALES) {
    const corePaths = [
      `/${lang}`,
      `/${lang}/best-ai`,
      `/${lang}/changelog`,
      `/${lang}/privacy`,
      `/${lang}/prompts`,
      `/${lang}/prompts/study`,
      `/${lang}/prompts/text`,
      `/${lang}/prompts/data`,
      `/${lang}/prompts/code`,
      `/${lang}/prompts/image`,
      `/${lang}/prompts/marketing`,
      `/${lang}/guides`,
      `/${lang}/models`,
      `/${lang}/glossary`,
      `/${lang}/blog`,
    ];

    for (const p of corePaths) {
      const isHome = p === `/${lang}`;
      const isChangelog = p.includes("/changelog");
      const isPrivacy = p.includes("/privacy");
      // AI Daily is a news index: it gains an article every day.
      const isBlog = p === `/${lang}/blog`;

      urls.push({
        url: joinUrl(siteUrl, p),
        lastModified: now,
        changeFrequency: isHome
          ? "daily"
          : isBlog
            ? "daily"
            : isChangelog
              ? "weekly"
              : isPrivacy
                ? "yearly"
                : "weekly",
        priority: isHome
          ? 1
          : isBlog
            ? 0.8
            : isPrivacy
              ? 0.2
              : isChangelog
                ? 0.6
                : p.includes("/prompts")
                  ? 0.8
                  : 0.7,
      });
    }

    for (const g of guides) {
      urls.push({
        url: joinUrl(siteUrl, `/${lang}/guides/${g.slug}`),
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.7,
      });
    }

    for (const m of modelPages) {
      urls.push({
        url: joinUrl(siteUrl, `/${lang}/models/${m.slug}`),
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }

    for (const t of glossary) {
      urls.push({
        url: joinUrl(siteUrl, `/${lang}/glossary/${t.slug}`),
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }

    for (const page of landings) {
      urls.push({
        url: joinUrl(siteUrl, `/${lang}/landing/${page.slug}`),
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.7,
      });
    }

    // --- AI Daily articles -------------------------------------------------
    // Firestore is optional here: a build with no service-account credentials
    // (or an outage) degrades to "no articles yet" instead of failing the whole
    // sitemap and taking every static URL above down with it.
    // listAllPublishedArticles already filters to published/corrected, so
    // drafts and archived posts can never reach this list.
    let articles: PublicArticle[] = [];
    try {
      articles = await listAllPublishedArticles(lang);
    } catch {
      articles = [];
    }

    for (const article of articles) {
      urls.push({
        url: joinUrl(siteUrl, `/${lang}/blog/${article.slug}`),
        lastModified: toDate(article.updatedAt ?? article.publishedAt, now),
        changeFrequency: "daily",
        priority: 0.7,
      });
    }
  }

  return urls;
}


