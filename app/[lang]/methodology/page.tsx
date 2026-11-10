// app/[lang]/methodology/page.tsx — v1.8.0. The public, honest version of
// docs/engine-contract.md and docs/matcher-methodology.md, plus AI Daily's
// editorial policy and how benchmarks are collected. Content:
// lib/seo/content/sitePages.ts (shared with the markdown twin
// /{lang}/methodology.md).

import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { hasLocale } from "../dictionaries";
import DocSections from "@/components/seo/DocSections";
import JsonLd from "@/components/seo/JsonLd";
import { methodologyDoc } from "@/lib/seo/content/sitePages";
import { markdownPathOf } from "@/lib/seo/registry";
import { pageMetadata } from "@/lib/seo/metadata";
import { docPageGraph } from "@/lib/seo/pageGraphs";
import { pick, toLang, type Lang } from "@/lib/domain";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const l = toLang(lang);
  const doc = methodologyDoc(l);
  const path = `/${l}/methodology`;
  return pageMetadata({ lang: l, path, title: doc.title, description: doc.description, markdownPath: markdownPathOf(path), modifiedTime: doc.updated });
}

export default async function MethodologyPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const l = lang as Lang;
  const doc = methodologyDoc(l);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-12 pt-12">
      <JsonLd data={docPageGraph({ doc, lang: l, path: `/${l}/methodology`, kind: "methodology", label: doc.h1 })} />
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
