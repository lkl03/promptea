// app/robots.txt/route.ts
//
// One explicit rule per AI crawler (policy in lib/seo/crawlers.ts, default:
// allow everything) plus the catch-all rule for every other bot, each with the
// site's Content-Signal (v1.9.0). AI Daily needs no rule of its own:
// /[lang]/blog and every published article are enumerated in sitemap.xml, and
// the per-locale RSS feeds are discovered from <link rel="alternate">.

import { robotsTxt } from "@/lib/seo/robotsTxt";
import { getSiteUrl } from "@/lib/seo/site";

export const dynamic = "force-static";

export function GET() {
  return new Response(robotsTxt(getSiteUrl()), {
    headers: { "Content-Type": "text/plain; charset=utf-8", "X-Content-Type-Options": "nosniff" },
  });
}
