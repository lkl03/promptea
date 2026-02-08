// app/robots.ts
import type { MetadataRoute } from "next";

function getSiteUrl(): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env && env.trim().length > 0) return env.startsWith("http") ? env : `https://${env}`;
  const vercel = process.env.VERCEL_URL;
  if (vercel && vercel.trim().length > 0) return `https://${vercel}`;
  return "http://localhost:3000";
}

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl().replace(/\/+$/, "");

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/_next/"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}

