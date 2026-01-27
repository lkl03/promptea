// app/sitemap.ts
import type { MetadataRoute } from "next";

function getSiteUrl(): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env && env.trim().length > 0) return env.startsWith("http") ? env : `https://${env}`;
  const vercel = process.env.VERCEL_URL;
  if (vercel && vercel.trim().length > 0) return `https://${vercel}`;
  return "http://localhost:3000";
}

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const now = new Date();

  const paths = [
    "/es",
    "/en",
    "/es/changelog",
    "/en/changelog",
    "/es/privacy",
    "/en/privacy",
  ];

  return paths.map((p) => ({
    url: `${siteUrl}${p}`,
    lastModified: now,
    changeFrequency: p.includes("changelog") ? "weekly" : "daily",
    priority: p === "/es" || p === "/en" ? 1 : 0.6,
  }));
}
