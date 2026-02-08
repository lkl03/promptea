// app/[lang]/models/page.tsx
import Link from "next/link";
import { hasLocale } from "../dictionaries";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { modelPages } from "@/lib/seo/content/models";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const l = lang === "en" ? "en" : "es";

  return {
    title: l === "es" ? "Prompts por modelo (GPT, Claude, Gemini, Grok…)" : "Prompts by model (GPT, Claude, Gemini, Grok…)",
    description:
      l === "es"
        ? "Guía por modelo: tips concretos + templates copy-paste para GPT, Claude, Gemini, Grok, Kimi y DeepSeek."
        : "Per-model guide: practical tips + copy-paste templates for GPT, Claude, Gemini, Grok, Kimi, and DeepSeek.",
    alternates: {
      canonical: `/${l}/models`,
      languages: { es: "/es/models", en: "/en/models" },
    },
  };
}

export default async function ModelsIndexPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const l = (lang === "en" ? "en" : "es") as "es" | "en";

  const title = l === "es" ? "Prompts por modelo" : "Prompts by model";
  const subtitle =
    l === "es"
      ? "Elegí el modelo y abrí templates listos. Esto ayuda a evitar prompts genéricos y adaptarlos al estilo de cada IA."
      : "Pick a model and open copy-ready templates. This helps you avoid generic prompts and tailor them to each model’s style.";

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

      {/* ✅ SEO body content (H2 + texto + links internos) */}
      <section className="mt-10 surface p-5">
        <h2 className="text-sm font-medium">{l === "es" ? "Cómo usar estas páginas" : "How to use these pages"}</h2>
        <div className="mt-2 space-y-2 text-sm opacity-85">
          <p>
            {l === "es"
              ? "Cada modelo responde distinto. Acá tenés una página por modelo con tips prácticos y templates listos para copiar. Abrí un modelo, elegí un template y se precarga en la home para analizarlo y mejorarlo."
              : "Each model behaves differently. Here you’ll find one page per model with practical tips and copy-paste templates. Open a model, pick a template, and it will prefill on the homepage so you can analyze and improve it."}
          </p>
          <p>
            {l === "es"
              ? "Si tu objetivo es output estricto, empezá por la guía de JSON. Si querés prompts de estudio, mirá los packs de prompts."
              : "If you need strict output, start with the JSON guide. If you’re doing studying/workflows, check the prompt packs."}
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <Link className="btn h-9 px-4" href={`/${l}/guides/json-output`}>
              {l === "es" ? "Guía: JSON estricto" : "Guide: Strict JSON"}
            </Link>
            <Link className="btn h-9 px-4" href={`/${l}/prompts/study`}>
              {l === "es" ? "Prompts: Estudio" : "Prompts: Study"}
            </Link>
            <Link className="btn h-9 px-4" href={`/${l}/glossary`}>
              {l === "es" ? "Glosario" : "Glossary"}
            </Link>
          </div>
        </div>
      </section>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {modelPages.map((m) => (
          <Link key={m.slug} href={`/${l}/models/${m.slug}`} className="surface p-4 space-y-2">
            <div className="text-sm font-medium">{m.title[l]}</div>
            <div className="text-sm opacity-80">{m.description[l]}</div>
            <div className="text-xs opacity-70">{l === "es" ? "Abrir →" : "Open →"}</div>
          </Link>
        ))}
      </div>

      {/* ✅ Extra internal links (reduce “discovered not indexed”) */}
      <section className="mt-10 surface p-5">
        <h2 className="text-sm font-medium">{l === "es" ? "Conceptos que suelen causar problemas" : "Concepts that commonly break prompts"}</h2>
        <p className="mt-2 text-sm opacity-85">
          {l === "es"
            ? "Si tus prompts fallan por salidas inventadas o baja precisión, mirá estos términos del glosario:"
            : "If your prompts fail due to hallucinations or low precision, check these glossary terms:"}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link className="btn h-9 px-4" href={`/${l}/glossary/hallucinations`}>Hallucinations</Link>
          <Link className="btn h-9 px-4" href={`/${l}/glossary/few-shot`}>Few-shot</Link>
          <Link className="btn h-9 px-4" href={`/${l}/glossary/temperature`}>Temperature</Link>
        </div>
      </section>
    </main>
  );
}


