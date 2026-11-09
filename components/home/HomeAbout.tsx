// components/home/HomeAbout.tsx — v1.8.0 (SEO/GEO).
//
// The crawlable, answer-first text of the home page: what Promptea is, how a
// prompt is scored, how to use it, which AIs and prompt types it supports, a
// real FAQ and the date it was last updated. Server-rendered plain HTML (no
// client JS), so search engines and AI assistants read it in the first
// response. It also emits the page's JSON-LD (WebPage + HowTo + FAQPage), which
// describes exactly the text printed here.
//
// Content: lib/seo/content/sitePages.ts (shared with /{lang}.md). Kept compact
// on purpose: the long form lives on /about and /methodology.

import Link from "next/link";

import DocSections from "@/components/seo/DocSections";
import JsonLd from "@/components/seo/JsonLd";
import { homeAboutDoc } from "@/lib/seo/content/sitePages";
import { homeGraph } from "@/lib/seo/pageGraphs";
import type { Locale } from "@/lib/seo/site";

export default function HomeAbout({ lang, dict }: { lang: Locale; dict: { title: string; aboutLink: string; methodologyLink: string } }) {
  const doc = homeAboutDoc(lang);

  return (
    <section id="about-promptea" aria-labelledby="home-about-title" className="mx-auto mt-14 max-w-3xl sm:mt-16">
      <JsonLd data={homeGraph(doc, lang)} />
      <h2 id="home-about-title" className="font-title text-2xl font-semibold sm:text-3xl">
        {dict.title}
      </h2>
      <DocSections doc={doc} lang={lang} idPrefix="home-" headingLevel={3} />
      <nav className="mt-6 flex flex-wrap gap-2" aria-label={dict.title}>
        <Link href={`/${lang}/about`} className="btn h-9 px-4">
          {dict.aboutLink}
        </Link>
        <Link href={`/${lang}/methodology`} className="btn h-9 px-4">
          {dict.methodologyLink}
        </Link>
      </nav>
    </section>
  );
}
