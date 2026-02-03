// app/sitemap.ts
import type { MetadataRoute } from "next";

import { guides } from "@/lib/seo/content/guides";
import { modelPages } from "@/lib/seo/content/models";
import { glossary } from "@/lib/seo/content/glossary";

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

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const now = new Date();

  const LOCALES = ["es", "en"] as const;

  const urls: MetadataRoute.Sitemap = [];

  for (const lang of LOCALES) {
    // Core
    const corePaths = [
      `/${lang}`,
      `/${lang}/changelog`,
      `/${lang}/privacy`,

      // Prompts hub + packs
      `/${lang}/prompts`,
      `/${lang}/prompts/study`,
      `/${lang}/prompts/text`,
      `/${lang}/prompts/data`,

      // New SEO hubs
      `/${lang}/guides`,
      `/${lang}/models`,
      `/${lang}/glossary`,
    ];

    for (const p of corePaths) {
      const isHome = p === `/${lang}`;
      const isChangelog = p.includes("/changelog");
      const isPrivacy = p.includes("/privacy");

      urls.push({
        url: joinUrl(siteUrl, p),
        lastModified: now,
        changeFrequency: isHome ? "daily" : isChangelog ? "weekly" : isPrivacy ? "yearly" : "weekly",
        priority: isHome ? 1 : isPrivacy ? 0.3 : isChangelog ? 0.6 : p.includes("/prompts") ? 0.8 : 0.7,
      });
    }

    // Guides slugs
    for (const g of guides) {
      urls.push({
        url: joinUrl(siteUrl, `/${lang}/guides/${g.slug}`),
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.7,
      });
    }

    // Models slugs
    for (const m of modelPages) {
      urls.push({
        url: joinUrl(siteUrl, `/${lang}/models/${m.slug}`),
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }

    // Glossary slugs
    for (const t of glossary) {
      urls.push({
        url: joinUrl(siteUrl, `/${lang}/glossary/${t.slug}`),
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }
  }

  return urls;
}

