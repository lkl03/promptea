// app/[lang]/about/page.tsx — v1.8.0. Who is behind Promptea and why it can be
// trusted (E-E-A-T): the studio, the product, the sourcing/privacy principles
// and how to cite it. Content: lib/seo/content/sitePages.ts (shared with the
// markdown twin /{lang}/about.md).

import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { hasLocale } from "../dictionaries";
import DocSections from "@/components/seo/DocSections";
import JsonLd from "@/components/seo/JsonLd";
import { aboutDoc } from "@/lib/seo/content/sitePages";
import { markdownPathOf } from "@/lib/seo/registry";
import { pageMetadata } from "@/lib/seo/metadata";
import { docPageGraph } from "@/lib/seo/pageGraphs";
import { pick, toLang, type Lang } from "@/lib/domain";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const l = toLang(lang);
  const doc = aboutDoc(l);
  const path = `/${l}/about`;
  return pageMetadata({ lang: l, path, title: doc.title, description: doc.description, markdownPath: markdownPathOf(path), modifiedTime: doc.updated });
}

export default async function AboutPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const l = lang as Lang;
  const doc = aboutDoc(l);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-12 pt-12">
      <JsonLd data={docPageGraph({ doc, lang: l, path: `/${l}/about`, kind: "about", label: doc.h1 })} />
      <nav aria-label={pick(l, { es: "Ruta de navegación", en: "Breadcrumb", pt: "Trilha de navegação" })} className="text-xs opacity-70">
        <Link href={`/${l}`} className="hover:underline underline-offset-2">
          {pick(l, { es: "Inicio", en: "Home", pt: "Início" })}
        </Link>
        <span aria-hidden="true"> / </span>
        <span>{doc.h1}</span>
      </nav>
      <h1 className="mt-3 font-title text-3xl font-semibold sm:text-4xl">{doc.h1}</h1>
      <DocSections doc={doc} lang={l} />
    </main>
  );
}
