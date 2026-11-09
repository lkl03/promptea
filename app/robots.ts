// app/robots.ts
//
// One explicit rule per AI crawler (policy in lib/seo/crawlers.ts, default:
// allow everything) plus the catch-all rule for every other bot.
//
// A crawler that has its own `User-agent` group IGNORES the `*` group, so each
// explicit rule repeats the shared Disallow list. AI Daily needs no rule of its
// own: /[lang]/blog and every published article are enumerated in sitemap.xml,
// and the per-locale RSS feeds are discovered from <link rel="alternate">.

import type { MetadataRoute } from "next";

import { AI_CRAWLERS, DISALLOWED_PATHS, isCrawlerAllowed } from "@/lib/seo/crawlers";
import { getSiteUrl } from "@/lib/seo/site";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();
  const disallow = [...DISALLOWED_PATHS];

  return {
    rules: [
      { userAgent: "*", allow: "/", disallow },
      ...AI_CRAWLERS.map((c) =>
        isCrawlerAllowed(c)
          ? { userAgent: c.userAgent, allow: "/", disallow }
          : { userAgent: c.userAgent, disallow: "/" },
      ),
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
