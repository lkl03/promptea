// app/[lang]/how-it-works/page.tsx — v1.8.1.
//
// "How Promptea works": what it is, how a prompt is scored (clarity, context,
// constraints, output, verifiability, safety), how to use the analyzer, which
// AIs and prompt types it supports, the FAQ, and the product tour video.
//
// Until v1.8.0 all of this sat at the bottom of the home page, which made the
// home a 6,000-pixel scroll. It lives here now, one click from the home's "How
// this works" link, and it is still plain server-rendered HTML: crawlable in the
// first response, with the same HowTo + FAQPage JSON-LD (built from the very
// text printed below), its own canonical/hreflang, a sitemap entry, a place in
// llms.txt / llms-full.txt and a markdown twin (/{lang}/how-it-works.md).
// Content: lib/seo/content/sitePages.ts → howItWorksDoc().

import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getDictionary, hasLocale } from "../dictionaries";
import DocSections from "@/components/seo/DocSections";
import JsonLd from "@/components/seo/JsonLd";
import ShowcaseVideo from "@/components/home/ShowcaseVideo";
import { howItWorksDoc } from "@/lib/seo/content/sitePages";
import { markdownPathOf } from "@/lib/seo/registry";
import { pageMetadata } from "@/lib/seo/metadata";
import { docPageGraph } from "@/lib/seo/pageGraphs";
import type { Lang } from "@/lib/domain";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const l: Lang = lang === "en" ? "en" : "es";
  const doc = howItWorksDoc(l);
  const path = `/${l}/how-it-works`;
  return pageMetadata({ lang: l, path, title: doc.title, description: doc.description, markdownPath: markdownPathOf(path), modifiedTime: doc.updated });
}

export default async function HowItWorksPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const l: Lang = lang;
  const dict = await getDictionary(l);
  const t = dict.howItWorksPage;
  const doc = howItWorksDoc(l);
  const path = `/${l}/how-it-works`;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-14 pt-8 sm:pt-10">
      <JsonLd data={docPageGraph({ doc, lang: l, path, kind: "how-it-works", label: doc.h1 })} />
      <nav aria-label={t.breadcrumb} className="text-xs text-ink-muted">
        <Link href={`/${l}`} className="underline-offset-2 hover:underline">
          {t.home}
        </Link>
        <span aria-hidden="true"> / </span>
        <span>{doc.h1}</span>
      </nav>
      <h1 className="mt-3 font-title text-3xl font-semibold sm:text-4xl">{doc.h1}</h1>

      {/* The answer first; then the two ways to start. */}
      <p className="surface-soft mt-4 rounded-2xl p-4 text-sm leading-relaxed sm:text-base">
        <strong className="font-semibold">{t.inShort} </strong>
        {doc.tldr}
      </p>
      <p className="mt-5 flex flex-wrap gap-2">
        <Link href={`/${l}/analyzer`} className="btn btn-primary h-10 px-5">
          {t.ctaAnalyze} <span aria-hidden="true">→</span>
        </Link>
        <Link href={`/${l}/best-ai`} className="btn btn-ghost h-10 px-5">
          {t.ctaBestAi}
        </Link>
      </p>

      {/* The product tour: loads nothing but its poster until it is played or scrolled into view. */}
      <section aria-labelledby="showcase-title" className="mt-10">
        <h2 id="showcase-title" className="font-title text-xl font-semibold sm:text-2xl">
          {t.tourTitle}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted sm:text-base">{t.tourBody}</p>
        <div className="mt-4">
          <ShowcaseVideo lang={l} caption={t.tourCaption} pending={t.tourPending} title={t.tourTitle} />
        </div>
      </section>

      <DocSections doc={doc} lang={l} showTldr={false} />

      <nav aria-label={t.moreAria} className="mt-8 flex flex-wrap gap-2">
        <Link href={`/${l}/methodology`} className="btn btn-ghost h-9 px-4">
          {t.methodology}
        </Link>
        <Link href={`/${l}/about`} className="btn btn-ghost h-9 px-4">
          {t.about}
        </Link>
      </nav>
    </main>
  );
}
