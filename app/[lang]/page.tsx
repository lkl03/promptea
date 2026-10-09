// app/[lang]/page.tsx
//
// v1.7.0 — the homepage is a hub. Reading order:
//   1. minimal controls (language + theme; no navigation links here),
//   2. the news marquee (AI Daily, last 72 h; hidden when nothing qualifies),
//   3. the logo with the mascot,
//   4. four primary cards — Analyze | Best AI on the first row,
//      AI Daily | Benchmarks on the second (stacked in that order on mobile),
//   5. secondary links: Prompts | Guides | Models | Glossary,
//   6. the product showcase video.
//
// The analyzer that used to live here moved to /{lang}/analyzer, unchanged.
// Legacy deep links (/{lang}?prompt=…) are forwarded there by proxy.ts, so
// this page never reads search params and stays statically rendered with a
// short revalidation window (the 72 h marquee cut-off is at most 5 min late).

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getDictionary, hasLocale } from "./dictionaries";
import BrandLogo from "@/components/BrandLogo";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import ThemeToggle from "@/components/ThemeToggle";
import NewsMarquee from "@/components/home/NewsMarquee";
import HubCards from "@/components/home/HubCards";
import ShowcaseVideo from "@/components/home/ShowcaseVideo";
import { listAllPublishedArticles } from "@/lib/blog/server";
import { selectMarqueeItems, type MarqueeItem } from "@/lib/blog/marquee";

export const revalidate = 300;

/** Firestore never breaks the hub: an outage simply hides the news strip. */
async function loadMarquee(lang: "es" | "en"): Promise<MarqueeItem[]> {
  try {
    return selectMarqueeItems(await listAllPublishedArticles(lang, 30), new Date());
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const l = lang === "en" ? "en" : "es";
  return {
    alternates: { canonical: `/${l}`, languages: { es: "/es", en: "/en" } },
  };
}

export default async function HubPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const l = lang as "es" | "en";

  const dict = await getDictionary(l);
  const t = dict.hub;
  const marquee = await loadMarquee(l);

  const secondary = [
    { href: `/${l}/prompts`, label: t.secondary.prompts },
    { href: `/${l}/guides`, label: t.secondary.guides },
    { href: `/${l}/models`, label: t.secondary.models },
    { href: `/${l}/glossary`, label: t.secondary.glossary },
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
        <h1 className="m-0">
          <BrandLogo height={56} smHeight={96} priority />
        </h1>
        <p className="mt-4 max-w-xl text-base text-ink-muted sm:text-lg">{t.tagline}</p>
      </header>

      {/* 4. Primary cards */}
      <div className="mt-10 sm:mt-12">
        <HubCards lang={l} dict={t} />
      </div>

      {/* 5. Secondary links */}
      <nav aria-label={t.secondaryAria} className="mt-8">
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

      {/* 6. Product showcase */}
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
    </main>
  );
}
