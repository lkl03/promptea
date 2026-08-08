// app/[lang]/blog/[slug]/page.tsx
//
// v1.4.0 — one AI Daily article.
//
// No generateStaticParams: the content is produced daily by a routine, so the
// route is resolved at request time and cached by `revalidate`. Firestore is
// treated as optional — an outage or a missing service account yields a 404,
// never a 500, and never a half-rendered article.
//
// Nothing on this page renders HTML from stored content. The body goes through
// <ArticleBody>, which maps typed blocks to real elements.

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { getDictionary, hasLocale } from "../../dictionaries";
import ArticleBody from "@/components/blog/ArticleBody";
import SourceList from "@/components/blog/SourceList";
import { editorialDate, formatEditorialDate } from "@/lib/blog/dates";
import { blogArticlePath, blogBreadcrumbJsonLd, newsArticleJsonLd } from "@/lib/blog/jsonld";
import { getArticleBySlug } from "@/lib/blog/server";
import type { PublicArticle } from "@/lib/blog/types";
import { getModelPage } from "@/lib/seo/content/models";
import { absUrl, getSiteUrl } from "@/lib/seo/site";

export const revalidate = 300;

/** Firestore is never allowed to break the route: a failure reads as "no article". */
async function loadArticle(lang: "es" | "en", slug: string): Promise<PublicArticle | null> {
  try {
    return await getArticleBySlug(lang, slug);
  } catch {
    return null;
  }
}

/** ISO instant → the calendar day it was in the editorial timezone. */
function toDisplayDate(iso: string | null, fallback: string): string {
  if (!iso) return fallback;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return fallback;
  return editorialDate(d);
}

// Deep links are only offered for model families Promptea actually has a page
// for. `getModelPage` is the gate, so a renamed or removed slug silently drops
// the link instead of producing a 404.
const MODEL_MATCHERS: ReadonlyArray<{ slug: string; label: string; keywords: string[] }> = [
  { slug: "gpt", label: "GPT", keywords: ["gpt", "chatgpt", "openai"] },
  { slug: "claude", label: "Claude", keywords: ["claude", "anthropic"] },
  { slug: "gemini", label: "Gemini", keywords: ["gemini", "deepmind", "google"] },
  { slug: "grok", label: "Grok", keywords: ["grok", "xai", "x.ai"] },
  { slug: "kimi", label: "Kimi", keywords: ["kimi", "moonshot"] },
  { slug: "deepseek", label: "DeepSeek", keywords: ["deepseek"] },
];

function relatedModelLinks(article: PublicArticle): Array<{ slug: string; label: string }> {
  const haystack = [...article.models, ...article.companies].map((v) => v.toLowerCase());
  if (haystack.length === 0) return [];

  const out: Array<{ slug: string; label: string }> = [];
  for (const matcher of MODEL_MATCHERS) {
    if (out.length >= 2) break;
    if (!getModelPage(matcher.slug)) continue;
    const hit = haystack.some((value) => matcher.keywords.some((k) => value.includes(k)));
    if (hit) out.push({ slug: matcher.slug, label: matcher.label });
  }
  return out;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}): Promise<Metadata> {
  const { lang, slug } = await params;
  const l = lang === "en" ? "en" : "es";

  const article = await loadArticle(l, slug);
  if (!article) return {};

  const canonical = `/${l}/blog/${article.slug}`;

  return {
    title: article.seoTitle,
    description: article.metaDescription,
    alternates: {
      canonical,
      languages: {
        es: `/es/blog/${article.alternateSlugs.es}`,
        en: `/en/blog/${article.alternateSlugs.en}`,
      },
    },
    openGraph: {
      title: article.seoTitle,
      description: article.metaDescription,
      url: canonical,
      type: "article",
      locale: l === "en" ? "en_US" : "es_AR",
      publishedTime: article.publishedAt ?? undefined,
      modifiedTime: article.updatedAt ?? article.publishedAt ?? undefined,
      authors: [article.author],
      ...(article.image ? { images: [{ url: article.image.url }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: article.seoTitle,
      description: article.metaDescription,
    },
  };
}

export default async function BlogArticlePage({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}) {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) notFound();
  const l = (lang === "en" ? "en" : "es") as "es" | "en";

  const article = await loadArticle(l, slug);
  if (!article) notFound();

  const dict = await getDictionary(l);
  const t = dict.blog;

  const publishedDay = toDisplayDate(article.publishedAt, article.eventDate);
  const correctedDay = article.correction
    ? toDisplayDate(article.correction.correctedAt ?? article.updatedAt, article.eventDate)
    : null;

  const categoryLabel = t.category[article.category] ?? article.category;
  const importanceLabel = t.importance[article.importance] ?? article.importance;
  const reading = t.readingTime.replace("{n}", String(article.readingMinutes));
  const modelLinks = relatedModelLinks(article);

  const articleUrl = absUrl(blogArticlePath(l, article.slug));
  const newsLd = newsArticleJsonLd(article, {
    url: articleUrl,
    siteUrl: getSiteUrl(),
    // The generated cover from opengraph-image.tsx — an original Promptea
    // illustration, so structured data never points at third-party imagery.
    imageUrl: `${articleUrl}/opengraph-image`,
  });
  const breadcrumbLd = blogBreadcrumbJsonLd({
    lang: l,
    title: article.title,
    slug: article.slug,
    siteUrl: getSiteUrl(),
  });

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-12 pb-12 3xl:max-w-7xl">
      {/* JSON-LD: NewsArticle + BreadcrumbList. Both describe only content that
          is actually rendered below. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(newsLd) }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      <div className="mx-auto max-w-3xl">
        <div className="text-xs opacity-70">
          <Link href={`/${l}/blog`} className="hover:underline underline-offset-2">
            {t.backToBlog}
          </Link>
        </div>

        <article className="mt-4">
          <header className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="badge badge-neutral">{categoryLabel}</span>
              <span className="badge badge-accent">{importanceLabel}</span>
            </div>

            <h1 className="font-title text-3xl sm:text-4xl font-semibold leading-tight">
              {article.title}
            </h1>

            <p className="text-base opacity-80">{article.deck}</p>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs opacity-70">
              <span>{article.author}</span>
              <span aria-hidden="true">·</span>
              <time dateTime={article.publishedAt ?? article.eventDate}>
                {t.publishedOn.replace("{date}", formatEditorialDate(publishedDay, l))}
              </time>
              <span aria-hidden="true">·</span>
              <span>{reading}</span>

              {article.eventDate !== publishedDay ? (
                <>
                  <span aria-hidden="true">·</span>
                  <time dateTime={article.eventDate}>
                    {t.eventDate.replace("{date}", formatEditorialDate(article.eventDate, l))}
                  </time>
                </>
              ) : null}

              {correctedDay ? (
                <>
                  <span aria-hidden="true">·</span>
                  <time dateTime={article.correction?.correctedAt ?? article.updatedAt ?? correctedDay}>
                    {t.updatedOn.replace("{date}", formatEditorialDate(correctedDay, l))}
                  </time>
                </>
              ) : null}
            </div>
          </header>

          {/* A correction is always visible. History is never rewritten silently. */}
          {article.correction ? (
            <aside role="note" className="mt-6 surface-soft p-4 border-l-4">
              <div className="text-sm font-medium">{t.correctionNotice}</div>
              <p className="mt-1 text-sm opacity-85">{article.correction.note}</p>
            </aside>
          ) : null}

          <div className="mt-8">
            <ArticleBody blocks={article.body} />
          </div>

          {article.whyItMatters.length > 0 ? (
            <section aria-labelledby="why-it-matters" className="mt-10 surface p-5">
              <h2 id="why-it-matters" className="text-sm font-medium">
                {t.whyItMatters}
              </h2>
              <ul className="mt-3 list-disc pl-5 space-y-1.5 text-sm opacity-90">
                {article.whyItMatters.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {article.keyTakeaways.length > 0 ? (
            <section aria-labelledby="key-takeaways" className="mt-4 surface p-5">
              <h2 id="key-takeaways" className="text-sm font-medium">
                {t.keyTakeaways}
              </h2>
              <ul className="mt-3 list-disc pl-5 space-y-1.5 text-sm opacity-90">
                {article.keyTakeaways.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* Thin sourcing is disclosed in the article, not hidden in the payload. */}
          {article.singleSourceJustification ? (
            <aside role="note" className="mt-4 surface-soft p-4 border-l-4">
              <div className="text-sm font-medium">{t.singleSourceNotice}</div>
              <p className="mt-1 text-sm opacity-85">{article.singleSourceJustification}</p>
            </aside>
          ) : null}

          {article.digestItems.length > 0 ? (
            <section aria-labelledby="digest-items" className="mt-4 surface p-5">
              <h2 id="digest-items" className="text-sm font-medium">
                {t.digestItems}
              </h2>
              <ul className="mt-3 space-y-2 text-sm opacity-90">
                {article.digestItems.map((item, i) => (
                  <li key={i} className="flex flex-wrap items-baseline gap-2">
                    <span>{l === "es" ? item.titleEs : item.titleEn}</span>
                    <time dateTime={item.eventDate} className="text-xs opacity-70">
                      {formatEditorialDate(item.eventDate, l)}
                    </time>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <div className="mt-4">
            <SourceList
              sources={article.sources}
              lang={l}
              dict={{ sources: t.sources, primarySource: t.primarySource }}
            />
          </div>

          {article.tags.length > 0 || article.companies.length > 0 || article.models.length > 0 ? (
            <section aria-label={t.tags} className="mt-4 space-y-2">
              {[
                { label: t.tags, values: article.tags },
                { label: t.companies, values: article.companies },
                { label: t.mentionedModels, values: article.models },
              ]
                .filter((group) => group.values.length > 0)
                .map((group) => (
                  <div key={group.label} className="flex flex-wrap items-center gap-2">
                    <span className="text-xs opacity-70">{group.label}:</span>
                    <ul className="flex flex-wrap gap-1.5">
                      {group.values.map((value) => (
                        <li key={value} className="badge badge-neutral">
                          {value}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
            </section>
          ) : null}
        </article>

        <section aria-labelledby="blog-related" className="mt-10 surface p-5">
          <h2 id="blog-related" className="text-sm font-medium">
            {t.relatedTitle}
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link className="btn h-9 px-4" href={`/${l}/guides`}>
              {t.relatedGuides}
            </Link>
            <Link className="btn h-9 px-4" href={`/${l}/models`}>
              {t.relatedModels}
            </Link>
            {modelLinks.map((m) => (
              <Link key={m.slug} className="btn h-9 px-4" href={`/${l}/models/${m.slug}`}>
                {t.promptsFor.replace("{model}", m.label)}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
