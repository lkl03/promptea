// app/[lang]/library/page.tsx — v1.8.0. The local-first prompt library: the page
// itself is static; the list is read from the visitor's own localStorage in the
// browser (components/library/LibraryView.tsx). Private by nature, so it is
// kept out of search indexes.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictionary, hasLocale } from "../dictionaries";
import LibraryView from "@/components/library/LibraryView";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const l = lang === "en" ? "en" : "es";
  const dict = await getDictionary(l);
  return {
    title: dict.library.metaTitle,
    description: dict.library.metaDescription,
    robots: { index: false, follow: true },
    alternates: { canonical: `/${l}/library`, languages: { es: "/es/library", en: "/en/library" } },
  };
}

export default async function LibraryPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const l = lang as "es" | "en";
  const dict = await getDictionary(l);
  const { metaTitle: _a, metaDescription: _b, ...t } = dict.library;
  void _a;
  void _b;

  return (
    <main className="mx-auto w-full max-w-4xl px-4 pb-16 pt-6 sm:pt-8">
      <header className="max-w-2xl">
        <h1 className="font-title text-3xl font-semibold leading-tight sm:text-4xl">{dict.library.title}</h1>
        <p className="mt-3 text-base leading-relaxed text-ink-muted">{dict.library.subtitle}</p>
      </header>
      <div className="mt-6">
        <LibraryView lang={l} t={t} shareDict={dict.share} />
      </div>
    </main>
  );
}
