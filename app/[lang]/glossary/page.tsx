// app/[lang]/glossary/page.tsx
import Link from "next/link";
import { hasLocale } from "../dictionaries";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { glossary } from "@/lib/seo/content/glossary";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const l = lang === "en" ? "en" : "es";

  return {
    title: l === "es" ? "Glosario de prompt engineering" : "Prompt engineering glossary",
    description:
      l === "es"
        ? "Definiciones cortas y ejemplos: system prompt, few-shot, delimitadores, JSON schema, prompt injection y más."
        : "Short definitions + examples: system prompt, few-shot, delimiters, JSON schema, prompt injection, and more.",
    alternates: {
      canonical: `/${l}/glossary`,
      languages: {
        es: "/es/glossary",
        en: "/en/glossary",
      },
    },
  };
}

export default async function GlossaryIndexPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const l = (lang === "en" ? "en" : "es") as "es" | "en";

  const title = l === "es" ? "Glosario de prompt engineering" : "Prompt engineering glossary";
  const subtitle =
    l === "es"
      ? "Definiciones cortas + ejemplo copy-paste por término. Elegí uno y abrilo."
      : "Short definitions + a copy-paste example per term. Pick one and open it.";

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

      {/* ✅ SEO editorial block */}
      <section className="mt-10 surface p-5">
        <h2 className="text-sm font-medium">{l === "es" ? "Start here" : "Start here"}</h2>
        <div className="mt-2 space-y-2 text-sm opacity-85">
          <p>
            {l === "es"
              ? "Este glosario explica conceptos que suelen romper prompts: ambigüedad, falta de delimitación, outputs inconsistentes o inventados. Cada término incluye definición corta y un ejemplo listo para copiar."
              : "This glossary covers concepts that commonly break prompts: ambiguity, missing delimiters, inconsistent output, or hallucinations. Each term includes a short definition and a copy-ready example."}
          </p>
          <p>
            {l === "es"
              ? "Si necesitás outputs estrictos, empezá por JSON estricto. Si querés adaptar prompts a cada IA, mirá prompts por modelo."
              : "If you need strict outputs, start with strict JSON. If you want to tailor prompts to each AI, check prompts by model."}
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
        {glossary.map((t) => (
          <Link key={t.slug} href={`/${l}/glossary/${t.slug}`} className="surface p-4 space-y-2">
            <div className="text-sm font-medium">{t.title[l]}</div>
            <div className="text-sm opacity-80">{t.description[l]}</div>
            <div className="text-xs opacity-70">{l === "es" ? "Ver término →" : "View term →"}</div>
          </Link>
        ))}
      </div>
    </main>
  );
}


