// app/sitemap.ts
//
// sitemap.xml for both locales, built from the shared content index
// (lib/seo/registry.ts) so it always agrees with llms.txt.
//
//   - <lastmod> is the real date of the content (hand-written copy: the
//     editorial date in lib/seo/dates.ts; model pages: the registry's
//     `verifiedAt`; AI Daily: the article's update/publication time; weekly
//     editions: when they were sent; benchmarks: the snapshot's `asOf`). Never
//     "now": a sitemap that claims everything changed today trains crawlers to
//     ignore <lastmod>.
//   - Every URL lists its alternates: `es`, `en` and `x-default` (hreflang).
//   - AI Daily gains an article every day, so the sitemap revalidates; the
//     database-backed parts degrade to "none yet" without Firestore.

import type { MetadataRoute } from "next";

import { loadArticles, loadBenchmarksAsOf, loadEditions } from "@/lib/seo/dynamic";
import { articleUrl, editionUrl, latestUpdated } from "@/lib/seo/dynamicUrls";
import { newest, toDate } from "@/lib/seo/dates";
import { staticSeoUrls, type SeoUrl } from "@/lib/seo/registry";
import { LOCALES, X_DEFAULT_LOCALE, absUrl, type Locale } from "@/lib/seo/site";

/**
 * Re-generated every thirty minutes so articles published after a deploy reach
 * crawlers without a rebuild. The static entries are recomputed identically.
 */
export const revalidate = 1800;

/** Path of the same page in `lang`: its own `alternates` entry, else the locale swapped. */
function pathIn(u: SeoUrl, lang: Locale): string {
  return u.alternates?.[lang] ?? u.path.replace(/^\/(es|en)(?=\/|$)/, `/${lang}`);
}

function toEntry(u: SeoUrl, fallbackDate: Date): MetadataRoute.Sitemap[number] {
  const languages: Record<string, string> = {};
  for (const l of LOCALES) languages[l] = absUrl(pathIn(u, l));
  languages["x-default"] = absUrl(pathIn(u, X_DEFAULT_LOCALE));

  return {
    url: absUrl(u.path),
    lastModified: toDate(u.updated, fallbackDate),
    changeFrequency: u.changeFrequency,
    priority: u.priority,
    alternates: { languages },
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Only used if a date is somehow unparseable; never the source of a real value.
  const fallbackDate = new Date(0);

  const [articlesByLang, editions, benchmarksAsOf] = await Promise.all([
    Promise.all(LOCALES.map(async (l) => [l, await loadArticles(l)] as const)),
    loadEditions(),
    loadBenchmarksAsOf(),
  ]);

  const entries: MetadataRoute.Sitemap = [];

  for (const [lang, articles] of articlesByLang) {
    const articleUrls = articles.map(articleUrl);
    const editionUrls = editions.map((e) => editionUrl(e, lang));
    const newestArticle = latestUpdated(articleUrls);
    const newestEdition = latestUpdated(editionUrls);

    const urls = staticSeoUrls(lang).map((u): SeoUrl => {
      // Pages whose content is driven by data take the data's date.
      if (u.path === `/${lang}`) return { ...u, updated: newest(u.updated, newestArticle) ?? u.updated };
      if (u.path === `/${lang}/blog`) return { ...u, updated: newest(u.updated, newestArticle) ?? u.updated };
      if (u.path === `/${lang}/blog/weekly`) return { ...u, updated: newest(u.updated, newestEdition) ?? u.updated };
      if (u.path === `/${lang}/benchmarks` && benchmarksAsOf) return { ...u, updated: benchmarksAsOf };
      return u;
    });

    for (const u of [...urls, ...articleUrls, ...editionUrls]) entries.push(toEntry(u, fallbackDate));
  }

  return entries;
}
