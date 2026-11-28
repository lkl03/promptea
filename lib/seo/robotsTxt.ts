// lib/seo/robotsTxt.ts
//
// v1.9.0 — robots.txt as text. Next's MetadataRoute.Robots cannot carry the
// `Content-Signal` line (contentsignals.org), so the file is written here and
// served by app/robots.txt/route.ts. The rules are the same as before: one
// explicit group per AI crawler (policy in ./crawlers.ts) plus the catch-all.
//
// A crawler that has its own `User-agent` group IGNORES the `*` group, so each
// explicit group repeats the shared Disallow list and the content signal.

import { AI_CRAWLERS, CONTENT_SIGNALS, DISALLOWED_PATHS, isCrawlerAllowed } from "./crawlers";

export type RobotsRule = { userAgent: string; allow?: string; disallow: string | string[] };

/** `search=yes, ai-input=yes, ai-train=yes` */
export function contentSignalValue(): string {
  return (Object.entries(CONTENT_SIGNALS) as Array<[string, boolean]>).map(([k, v]) => `${k}=${v ? "yes" : "no"}`).join(", ");
}

/** The catch-all group first, then one group per AI crawler. */
export function robotsRules(): RobotsRule[] {
  const disallow = [...DISALLOWED_PATHS];
  return [
    { userAgent: "*", allow: "/", disallow },
    ...AI_CRAWLERS.map((c) => (isCrawlerAllowed(c) ? { userAgent: c.userAgent, allow: "/", disallow } : { userAgent: c.userAgent, disallow: "/" })),
  ];
}

export function robotsTxt(siteUrl: string): string {
  const signal = `Content-Signal: ${contentSignalValue()}`;
  const groups = robotsRules().map((r) =>
    r.allow
      ? [`User-Agent: ${r.userAgent}`, signal, `Allow: ${r.allow}`, ...[r.disallow].flat().map((p) => `Disallow: ${p}`)]
      : [`User-Agent: ${r.userAgent}`, ...[r.disallow].flat().map((p) => `Disallow: ${p}`)],
  );
  return [...groups.map((g) => g.join("\n")), `Host: ${siteUrl}`, `Sitemap: ${siteUrl}/sitemap.xml`].join("\n\n") + "\n";
}
