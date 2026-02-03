// app/[lang]/guides/page.tsx
import Link from "next/link";
import { hasLocale } from "../dictionaries";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { guides } from "@/lib/seo/content/guides";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const l = lang === "en" ? "en" : "es";

  return {
    title: l === "es" ? "Guías de prompting (sin humo)" : "Prompting guides (no fluff)",
    description:
      l === "es"
        ? "Guías cortas y accionables para escribir prompts mejores: checklist, JSON estricto, código y marketing."
        : "Short, actionable guides to write better prompts: checklist, strict JSON, code, and marketing.",
    alternates: {
      canonical: `/${l}/guides`,
      languages: {
        es: "/es/guides",
        en: "/en/guides",
      },
    },
  };
}

export default async function GuidesIndexPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const l = (lang === "en" ? "en" : "es") as "es" | "en";

  const title = l === "es" ? "Guías de prompting" : "Prompting guides";
  const subtitle =
    l === "es"
      ? "Páginas evergreen: intención clara, templates copy-paste y FAQ. Elegí una guía y abrila."
      : "Evergreen pages: clear intent, copy-paste templates and FAQ. Pick a guide and open it.";

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-12 pb-12 3xl:max-w-7xl">
      <div className="mx-auto max-w-3xl text-center space-y-2">
        <h1 className="font-title text-3xl sm:text-4xl font-semibold">{title}</h1>
        <p className="opacity-80 text-sm sm:text-base">{subtitle}</p>

        <div className="pt-2 text-xs opacity-70">
          <Link href={`/${l}`} className="hover:underline underline-offset-2">
            {l === "es" ? "← Volver al inicio" : "← Back to home"}
          </Link>
        </div>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {guides.map((g) => (
          <Link key={g.slug} href={`/${l}/guides/${g.slug}`} className="surface p-4 space-y-2">
            <div className="text-sm font-medium">{g.title[l]}</div>
            <div className="text-sm opacity-80">{g.description[l]}</div>
            <div className="text-xs opacity-70">{l === "es" ? "Abrir guía →" : "Open guide →"}</div>
          </Link>
        ))}
      </div>

      <section className="mt-10 surface p-5">
        <div className="text-sm font-medium">{l === "es" ? "Tip" : "Tip"}</div>
        <p className="mt-2 text-sm opacity-80">
          {l === "es"
            ? "Linkeá estas guías desde Home + Footer (y desde packs relevantes) para acelerar indexación."
            : "Link these guides from Home + Footer (and from relevant prompt packs) to speed up indexing."}
        </p>
      </section>
    </main>
  );
}

