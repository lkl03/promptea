// app/[lang]/page.tsx
//
// v1.7.0 — the homepage is a hub; v1.8.0 — it also shows content. Reading order:
//   1. minimal controls (language + theme; no navigation links here),
//   2. the news marquee (AI Daily, last 72 h; hidden when nothing qualifies),
//   3. the logo with the mascot + tagline,
//   4. the main action: paste a prompt -> /{lang}/analyzer with it preloaded,
//   5. "Latest in AI Daily": the newest 3-4 stories (title, deck, category,
//      reading time, direct link),
//   6. tools: Analyze | Best AI cards, then the secondary links
//      (Prompts | Guides | Models | Glossary),
//   7. Benchmarks teaser: the top of one real ranking, with source and date,
//   8. X feed (only when NEXT_PUBLIC_X_HANDLE / NEXT_PUBLIC_X_URL name an
//      account): official timeline behind a click-to-load facade,
//   9. newsletter sign-up,
//  10. the product showcase video,
//  11. (slot) crawlable text content: see the marker at the end of <main>.
//
// Everything that needs Firestore or a third party degrades to nothing (or to
// the plain card) when it is unavailable, and the page stays statically
// rendered with a short revalidation window. This page never reads search
// params; legacy deep links (/{lang}?prompt=...) are forwarded to /{lang}/analyzer
// by proxy.ts.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getDictionary, hasLocale } from "./dictionaries";
import BrandLogo from "@/components/BrandLogo";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import ThemeToggle from "@/components/ThemeToggle";
import NewsMarquee from "@/components/home/NewsMarquee";
import HubCards from "@/components/home/HubCards";
import HomePromptBox from "@/components/home/HomePromptBox";
import LatestDaily, { type LatestArticle } from "@/components/home/LatestDaily";
import BenchmarksTeaser from "@/components/home/BenchmarksTeaser";
import XFeed from "@/components/home/XFeed";
import SubscribeForm from "@/components/newsletter/SubscribeForm";
import ShowcaseVideo from "@/components/home/ShowcaseVideo";
import HomeAbout from "@/components/home/HomeAbout";
import { listAllPublishedArticles } from "@/lib/blog/server";
import { selectMarqueeItems, type MarqueeItem } from "@/lib/blog/marquee";
import { getBenchmarks } from "@/lib/benchmarks/server";
import { buildTeaser, type Teaser } from "@/lib/benchmarks/teaser";
import { getXLinks } from "@/lib/social";
import { homeAboutDoc } from "@/lib/seo/content/sitePages";
import { markdownPathOf } from "@/lib/seo/registry";
import { pageMetadata } from "@/lib/seo/metadata";

export const revalidate = 300;

/** How many stories the "Latest in AI Daily" block shows. */
const LATEST_COUNT = 4;

/**
 * Firestore never breaks the hub: an outage hides the news strip and the
 * latest-stories block (which falls back to the plain AI Daily card). One
 * query feeds both.
 */
async function loadNews(lang: "es" | "en"): Promise<{ marquee: MarqueeItem[]; latest: LatestArticle[] }> {
  try {
    const articles = await listAllPublishedArticles(lang, 30);
    const latest = articles.slice(0, LATEST_COUNT).map((a) => ({
      slug: a.slug,
      title: a.title,
      deck: a.deck,
      category: a.category,
      readingMinutes: a.readingMinutes,
      eventDate: a.eventDate,
      publishedAt: a.publishedAt,
    }));
    return { marquee: selectMarqueeItems(articles, new Date()), latest };
  } catch {
    return { marquee: [], latest: [] };
  }
}

/** The benchmarks teaser degrades to the plain card: no snapshot, no numbers. */
async function loadTeaser(): Promise<Teaser | null> {
  try {
    const result = await getBenchmarks();
    return result.status === "unavailable" ? null : buildTeaser(result.snapshot, 5);
  } catch {
    return null;
  }
}

function fmtDate(iso: string | null, lang: "es" | "en"): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat(lang === "es" ? "es-AR" : "en-US", { dateStyle: "long", timeZone: "America/Argentina/Buenos_Aires" }).format(d);
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const l = lang === "en" ? "en" : "es";
  const doc = homeAboutDoc(l);
  // Search-intent title + description, canonical, hreflang (+ x-default), OG/Twitter
  // and the markdown twin: lib/seo/metadata.ts.
  return pageMetadata({
    lang: l,
    path: `/${l}`,
    title: doc.title,
    absoluteTitle: doc.absoluteTitle,
    description: doc.description,
    markdownPath: markdownPathOf(`/${l}`),
    modifiedTime: doc.updated,
  });
}

export default async function HubPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const l = lang as "es" | "en";

  const dict = await getDictionary(l);
  const t = dict.hub;
  const [{ marquee, latest }, teaser] = await Promise.all([loadNews(l), loadTeaser()]);
  const x = getXLinks();

  const secondary = [
    { href: `/${l}/prompts`, label: t.secondary.prompts },
    { href: `/${l}/guides`, label: t.secondary.guides },
    { href: `/${l}/models`, label: t.secondary.models },
    { href: `/${l}/glossary`, label: t.secondary.glossary },
    { href: `/${l}/library`, label: t.secondary.library },
  ];

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-10 pt-4">
      {/* 1. Minimal controls */}
      <div className="flex items-center justify-end gap-2">
        <LanguageSwitcher lang={l} />
        <ThemeToggle lang={l} />
      </div>

      {/* 2. News marquee (renders nothing when no news qualifies) */}
      {marquee.length > 0 ? (
        <div className="mt-4">
          <NewsMarquee items={marquee} lang={l} dict={{ label: t.marqueeLabel, pause: t.marqueePause, play: t.marqueePlay }} />
        </div>
      ) : null}

      {/* 3. Logo */}
      <header className="mt-10 flex flex-col items-center text-center sm:mt-14">
        {/* The logo stays the visual element; BrandLogo contributes the text "Promptea" and the
            hidden span completes the heading ("Promptea — analyze, score and optimize your AI prompts"). */}
        <h1 className="m-0">
          <BrandLogo height={56} smHeight={96} priority />
          <span className="sr-only"> {homeAboutDoc(l).h1.replace(/^Prompteas*/, "")}</span>
        </h1>
        <p className="mt-4 max-w-xl text-base text-ink-muted sm:text-lg">{t.tagline}</p>
      </header>

      {/* 4. Main action: paste a prompt, land in the analyzer with it loaded */}
      <div className="mt-8 sm:mt-10">
        <HomePromptBox lang={l} dict={t.promptBox} />
      </div>

      {/* 5. Latest in AI Daily */}
      <div className="mt-12 sm:mt-14">
        <LatestDaily
          articles={latest}
          lang={l}
          dict={t.latest}
          categories={dict.blog.category}
          readingTime={dict.blog.readingTime}
          fallback={t.cards.daily}
        />
      </div>

      {/* 6. Tools + secondary links */}
      <section aria-labelledby="tools-title" className="mt-12 sm:mt-14">
        <h2 id="tools-title" className="sr-only">
          {t.toolsTitle}
        </h2>
        <HubCards lang={l} dict={t} only={["analyze", "bestAi"]} />

        <nav aria-label={t.secondaryAria} className="mt-6">
          <ul className="flex flex-wrap items-center justify-center gap-x-1 gap-y-1 text-sm">
            {secondary.map((item, i) => (
              <li key={item.href} className="flex items-center">
                {i > 0 ? (
                  <span aria-hidden="true" className="px-2 text-ink-faint">
                    |
                  </span>
                ) : null}
                <Link href={item.href} className="rounded-lg px-2 py-1 text-ink-muted transition-colors hover:bg-surface-soft hover:text-ink">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </section>

      {/* 7. Benchmarks teaser */}
      <div className="mt-12 sm:mt-14">
        <BenchmarksTeaser
          teaser={teaser}
          lang={l}
          dict={t.teaser}
          dateLabel={teaser ? (fmtDate(teaser.asOf, l) ?? fmtDate(teaser.fetchedAt, l)) : null}
          fallback={t.cards.benchmarks}
        />
      </div>

      {/* 8. X feed: only when an account is configured */}
      {x.handle ? (
        <div className="mt-12 sm:mt-14">
          <XFeed handle={x.handle} profileUrl={x.url} dict={t.xFeed} />
        </div>
      ) : null}

      {/* 9. Newsletter */}
      <section aria-labelledby="home-newsletter-title" className="surface mt-12 grid gap-5 p-5 sm:mt-14 sm:p-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:items-center md:gap-8">
        <div>
          <h2 id="home-newsletter-title" className="font-title text-xl font-semibold sm:text-2xl">
            {t.newsletter.title}
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{t.newsletter.body}</p>
        </div>
        <SubscribeForm lang={l} dict={dict.newsletter.bar} />
      </section>

      {/* 10. Product showcase */}
      <section aria-labelledby="showcase-title" className="mx-auto mt-14 max-w-4xl sm:mt-16">
        <div className="text-center">
          <h2 id="showcase-title" className="font-title text-2xl font-semibold sm:text-3xl">
            {t.showcaseTitle}
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-ink-muted sm:text-base">{t.showcaseBody}</p>
        </div>
        <div className="mt-6">
          <ShowcaseVideo lang={l} caption={t.showcaseCaption} pending={t.showcasePending} title={t.showcaseTitle} />
        </div>
      </section>

      {/* 11. Crawlable text content (SEO/GEO): what it is, how it scores, FAQ, last updated. */}
      <HomeAbout lang={l} dict={t.about} />
    </main>
  );
}
