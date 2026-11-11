// app/[lang]/sources/page.tsx — v1.8.3. "How we choose and verify sources": the
// three source tiers of AI Daily and AI Daily Tech, what a story needs before
// it is published, who we read, and how corrections work. In the three
// interface languages (it is a page about Promptea, not an article).
//
// Content: lib/seo/content/sourcesPage.ts, computed from the source registry
// (lib/blog/sources.ts) and shared with the markdown twin /{lang}/sources.md.

import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getDictionary, hasLocale } from "../dictionaries";
import DocSections from "@/components/seo/DocSections";
import JsonLd from "@/components/seo/JsonLd";
import { sourcesDoc } from "@/lib/seo/content/sourcesPage";
import { markdownPathOf } from "@/lib/seo/registry";
import { pageMetadata } from "@/lib/seo/metadata";
import { docPageGraph } from "@/lib/seo/pageGraphs";
import { toLang } from "@/lib/domain";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const l = toLang(lang);
  const doc = sourcesDoc(l);
  const path = `/${l}/sources`;
  return pageMetadata({ lang: l, path, title: doc.title, description: doc.description, markdownPath: markdownPathOf(path), modifiedTime: doc.updated });
}

export default async function SourcesPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const l = toLang(lang);
  const doc = sourcesDoc(l);
  const dict = await getDictionary(l);
  const t = dict.sourcesPage;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-12 pt-12">
      <JsonLd data={docPageGraph({ doc, lang: l, path: `/${l}/sources`, kind: "sources", label: doc.h1 })} />
      <nav aria-label={t.breadcrumb} className="text-xs opacity-70">
        <Link href={`/${l}`} className="hover:underline underline-offset-2">
          {t.home}
        </Link>
        <span aria-hidden="true"> / </span>
        <span>{doc.h1}</span>
      </nav>
      <h1 className="mt-3 font-title text-3xl font-semibold sm:text-4xl">{doc.h1}</h1>
      <DocSections doc={doc} lang={l} />
      <p className="mt-8 flex flex-wrap gap-2">
        <Link href={`/${l}/blog`} className="btn btn-ghost h-9 px-4">
          {t.toDaily}
        </Link>
        <Link href={`/${l}/blog/tech`} className="btn btn-ghost h-9 px-4">
          {t.toTech}
        </Link>
        <Link href={`/${l}/methodology`} className="btn btn-ghost h-9 px-4">
          {t.toMethodology}
        </Link>
      </p>
    </main>
  );
}
