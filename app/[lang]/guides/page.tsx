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
        ? "Guías accionables para escribir prompts mejores: checklist, JSON estricto, código y marketing."
        : "Actionable guides to write better prompts: checklist, strict JSON, code, and marketing.",
    alternates: {
      canonical: `/${l}/guides`,
      languages: { es: "/es/guides", en: "/en/guides" },
    },
  };
}

export default async function GuidesIndexPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const l = (lang === "en" ? "en" : "es") as "es" | "en";

  const title = l === "es" ? "Guías de prompting" : "Prompting guides";
  const subtitle =
    l === "es"
      ? "Guías evergreen con intención clara, templates copy-paste y FAQ."
      : "Evergreen guides with clear intent, copy-paste templates and FAQs.";

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

      {/* ✅ SEO body content */}
      <section className="mt-10 surface p-5">
        <h2 className="text-sm font-medium">{l === "es" ? "Start here" : "Start here"}</h2>
        <div className="mt-2 space-y-2 text-sm opacity-85">
          <p>
            {l === "es"
              ? "Si tus resultados varían mucho entre modelos o te devuelve cosas vagas, estas guías te ayudan a estructurar prompts con objetivos medibles: formato, restricciones, ejemplos y criterios de calidad."
              : "If your results vary across models or you get vague outputs, these guides help you structure prompts with measurable goals: format, constraints, examples, and quality criteria."}
          </p>
          <p>
            {l === "es"
              ? "Tip: combiná una guía + un template por modelo. Eso acelera el aprendizaje y mejora consistencia."
              : "Tip: combine one guide + one model template. That speeds up learning and improves consistency."}
          </p>

          <div className="flex flex-wrap gap-2 pt-2">
            <Link className="btn h-9 px-4" href={`/${l}/guides/json-output`}>
              {l === "es" ? "Guía: JSON estricto" : "Guide: Strict JSON"}
            </Link>
            <Link className="btn h-9 px-4" href={`/${l}/models`}>
              {l === "es" ? "Prompts por modelo" : "Prompts by model"}
            </Link>
            <Link className="btn h-9 px-4" href={`/${l}/prompts`}>
              {l === "es" ? "Packs de prompts" : "Prompt packs"}
            </Link>
          </div>
        </div>
      </section>

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
        <h2 className="text-sm font-medium">{l === "es" ? "Para acelerar indexación" : "To speed up indexing"}</h2>
        <p className="mt-2 text-sm opacity-85">
          {l === "es"
            ? "Linkeá estas guías desde Home + Footer, y también desde páginas de modelos y packs relevantes. Más enlaces internos = menos “Descubierta: sin indexar”."
            : "Link these guides from Home + Footer, and also from model pages and relevant packs. More internal links = fewer “Discovered: not indexed” URLs."}
        </p>
      </section>
    </main>
  );
}


