// app/[lang]/page.tsx
//
// The homepage. v1.8.1 — rebuilt around one question: can a first-time visitor
// tell, in five seconds, what Promptea is and what to do? v1.8.0 stacked eleven
// sections (≈6,300 px on desktop); this is the whole page now, in reading order:
//
//   0. the site header (components/TopBar.tsx, shared with every page): the
//      navigation, centred, next to the language and theme switches;
//   0b. the news marquee: AI Daily headlines from the last 72 hours, one slim
//      strip (hidden when nothing qualifies). Removed in the first v1.8.1 cut
//      and put back at the owner's request;
//   1. the logo with the mascot (the <h1>) + the tagline;
//   2. two quiet action links, each with a one-line description — "Analyze a
//      prompt" and "Find the best AI" — and a clear "How this works" link;
//   3. the main action: paste a prompt -> the analyzer with it loaded, with a
//      short explanation of what comes back;
//   4. two columns from `lg` up:
//        main   "Latest in AI Daily" (the newest stories) and, under it, the
//               compact Benchmarks teaser (the top of one real ranking);
//        side   (sticky) the X feed card and the newsletter sign-up. On phones
//               the side stacks after the main content, with the newsletter
//               right after "Latest in AI Daily".
//   5. the footer.
//
// What left the page, and where it went:
//   - "What Promptea is and how it works" (scoring, supported AIs, FAQ) and the
//     showcase video: /{lang}/how-it-works, one click away from the link in (2).
//     The crawlable text and its HowTo/FAQPage JSON-LD live there now.
//   - the big "Tools" cards: they duplicated the header and the action links.
//   - the loose "Prompts · Guides · Models · Glossary · Library" links: the header.
//
// Everything that needs Firestore or a third party degrades to nothing (or to
// the plain card) when it is unavailable, and the page stays statically
// rendered with a short revalidation window. This page never reads search
// params; legacy deep links (/{lang}?prompt=...) are forwarded to
// /{lang}/analyzer by proxy.ts.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getDictionary, hasLocale } from "./dictionaries";
import BrandLogo from "@/components/BrandLogo";
import NewsMarquee from "@/components/home/NewsMarquee";
import HomePromptBox from "@/components/home/HomePromptBox";
import LatestDaily, { type LatestArticle } from "@/components/home/LatestDaily";
import BenchmarksTeaser from "@/components/home/BenchmarksTeaser";
import XFeed from "@/components/home/XFeed";
import SubscribeForm from "@/components/newsletter/SubscribeForm";
import JsonLd from "@/components/seo/JsonLd";
import { listAllPublishedArticles } from "@/lib/blog/server";
import { selectMarqueeItems, type MarqueeItem } from "@/lib/blog/marquee";
import { getBenchmarks } from "@/lib/benchmarks/server";
import { buildTeaser, type Teaser } from "@/lib/benchmarks/teaser";
import { getXLinks, getXWidgetId } from "@/lib/social";
import { homeAboutDoc } from "@/lib/seo/content/sitePages";
import { homeGraph } from "@/lib/seo/pageGraphs";
import { markdownPathOf } from "@/lib/seo/registry";
import { pageMetadata } from "@/lib/seo/metadata";
import { type Lang, toLang, INTL_LOCALE, contentLangFor } from "@/lib/domain";

export const revalidate = 300;

/** How many stories the "Latest in AI Daily" block shows: one lead + three in a row. */
const LATEST_COUNT = 4;

/** How many recent stories are read to pick the marquee's last-72-hours headlines from. */
const NEWS_WINDOW = 30;

/**
 * Firestore never breaks the home: an outage (or no credentials) hides the news
 * strip and empties the latest-stories block, which then falls back to the plain
 * AI Daily card. One query feeds both.
 */
async function loadNews(lang: Lang): Promise<{ marquee: MarqueeItem[]; latest: LatestArticle[] }> {
  try {
    // AI Daily is written in es/en; /pt shows the English headlines (and says so).
    const articles = await listAllPublishedArticles(contentLangFor(lang), NEWS_WINDOW);
    const latest = articles.slice(0, LATEST_COUNT).map((a) => ({
      slug: a.slug,
      title: a.title,
      deck: a.deck,
      category: a.category,
      edition: a.edition,
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

function fmtDate(iso: string | null, lang: Lang): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat(INTL_LOCALE[lang], { dateStyle: "long", timeZone: "America/Argentina/Buenos_Aires" }).format(d);
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const l: Lang = toLang(lang);
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

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.5M12 7.6v.2" />
    </svg>
  );
}

export default async function HomePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const l: Lang = lang;

  const dict = await getDictionary(l);
  const t = dict.hub;
  const doc = homeAboutDoc(l);
  const [{ marquee, latest }, teaser] = await Promise.all([loadNews(l), loadTeaser()]);
  const x = getXLinks();
  const xWidgetId = getXWidgetId();

  const actions = [
    { href: `/${l}/analyzer`, ...t.actions.analyze },
    { href: `/${l}/best-ai`, ...t.actions.bestAi },
  ];

  const newsletter = (id: string) => (
    <section aria-labelledby={id} className="surface p-4 sm:p-5">
      <h2 id={id} className="font-title text-lg font-semibold leading-snug">
        {t.newsletter.title}
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-ink-muted">{t.newsletter.body}</p>
      <div className="mt-3">
        <SubscribeForm lang={l} dict={dict.newsletter.bar} />
      </div>
    </section>
  );

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-12 pt-2 3xl:max-w-7xl">
      {/* WebPage node of the home: what the page is, tied to the site-wide graph. */}
      <JsonLd data={homeGraph(doc, l)} />

      {/* 0b. News marquee (renders nothing when no story of the last 72 h qualifies) */}
      {marquee.length > 0 ? (
        <div className="mx-auto mt-2 max-w-5xl">
          <NewsMarquee items={marquee} lang={l} dict={{ label: t.marqueeLabel, pause: t.marqueePause, play: t.marqueePlay }} />
        </div>
      ) : null}

      {/* 1. Logo + tagline */}
      <header className="mt-8 flex flex-col items-center text-center sm:mt-10">
        {/* The logo stays the visual element; BrandLogo contributes the text "Promptea" and the
            hidden span completes the heading ("Promptea — analyze, score and optimize your AI prompts"). */}
        <h1 className="m-0">
          <BrandLogo height={56} smHeight={88} priority />
          <span className="sr-only"> {doc.h1.replace(/^Promptea\s*/, "")}</span>
        </h1>
        <p className="mt-4 max-w-xl text-base text-ink-muted sm:text-lg">{t.tagline}</p>
      </header>

      {/* 2. The two things you can do, as quiet links + how it works */}
      <nav aria-label={t.actionsAria} className="mx-auto mt-6 max-w-3xl">
        <ul className="home-actions m-0 grid list-none grid-cols-1 gap-x-8 gap-y-3 p-0 sm:grid-cols-2">
          {actions.map((a) => (
            <li key={a.href} className="min-w-0 text-center sm:text-left">
              <Link href={a.href} className="home-action group inline-flex items-baseline gap-1.5 rounded-md font-medium text-ink">
                <span className="home-action-title">{a.title}</span>
                <span aria-hidden="true" className="home-action-arrow text-accent">
                  →
                </span>
              </Link>
              <p className="mt-0.5 text-sm leading-snug text-ink-muted">{a.body}</p>
            </li>
          ))}
        </ul>
        <p className="mt-4 flex justify-center">
          <Link href={`/${l}/how-it-works`} className="btn btn-ghost h-9 gap-2 px-4">
            <InfoIcon />
            {t.howItWorks}
          </Link>
        </p>
      </nav>

      {/* 3. Main action: paste a prompt, land in the analyzer with it loaded */}
      <div className="mt-6 sm:mt-8">
        <HomePromptBox lang={l} dict={t.promptBox} />
      </div>

      {/* 4. Content (main) + follow / subscribe (side) */}
      <div className="mt-10 grid grid-cols-1 gap-6 sm:mt-12 lg:grid-cols-[minmax(0,1fr)_21.5rem] lg:items-start">
        <div className="grid min-w-0 grid-cols-1 gap-6">
          <LatestDaily
            articles={latest}
            lang={l}
            dict={t.latest}
            categories={dict.blog.category}
            editions={dict.blog.edition}
            readingTime={dict.blog.readingTime}
            fallback={t.cards.daily}
          />

          {/* Phones and tablets: the newsletter right after the stories (the side column carries it from lg up). */}
          <div className="lg:hidden">{newsletter("home-newsletter-title-inline")}</div>

          <BenchmarksTeaser
            teaser={teaser}
            lang={l}
            dict={t.teaser}
            dateLabel={teaser ? (fmtDate(teaser.asOf, l) ?? fmtDate(teaser.fetchedAt, l)) : null}
            fallback={t.cards.benchmarks}
          />
        </div>

        <aside aria-label={t.sideAria} className="home-side grid min-w-0 grid-cols-1 gap-6">
          {/* X feed: the Elfsight widget (lib/social.ts → getXWidgetId) */}
          {xWidgetId ? <XFeed widgetId={xWidgetId} handle={x.handle} profileUrl={x.url} dict={t.xFeed} /> : null}
          <div className="hidden lg:block">{newsletter("home-newsletter-title")}</div>
        </aside>
      </div>
    </main>
  );
}
