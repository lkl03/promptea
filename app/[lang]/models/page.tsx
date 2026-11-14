// app/[lang]/models/page.tsx
import JsonLd from "@/components/seo/JsonLd";
import { registryPageGraph } from "@/lib/seo/pageGraphs";
import Link from "next/link";
import { hasLocale } from "../dictionaries";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { modelPages } from "@/lib/seo/content/models";
import { pageMetadata } from "@/lib/seo/metadata";
import { pick, toLang } from "@/lib/domain";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const l = toLang(lang);

  return pageMetadata({
    lang: l,
    path: `/${l}/models`,
    title: pick(l, {
      es: "Prompts por modelo (GPT, Claude, Gemini, Grok…)",
      en: "Prompts by model (GPT, Claude, Gemini, Grok…)",
      pt: "Prompts por modelo (GPT, Claude, Gemini, Grok…)",
    }),
    description:
      pick(l, {
        es: "Guía por modelo: tips concretos, modelos vigentes con sus capacidades verificadas y plantillas para copiar, para GPT, Claude, Gemini, Grok, Kimi, DeepSeek, Qwen, GLM, MiniMax, Doubao y Perplexity.",
        en: "Per-model guide: practical tips, current models with their verified capabilities and copy-paste templates for GPT, Claude, Gemini, Grok, Kimi, DeepSeek, Qwen, GLM, MiniMax, Doubao and Perplexity.",
        pt: "Guia por modelo: dicas práticas, os modelos atuais com suas capacidades verificadas e templates prontos para copiar para GPT, Claude, Gemini, Grok, Kimi, DeepSeek, Qwen, GLM, MiniMax, Doubao e Perplexity.",
      }),
  });
}

export default async function ModelsIndexPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const l = toLang(lang);

  const title = pick(l, { es: "Prompts por modelo", en: "Prompts by model", pt: "Prompts por modelo" });
  const subtitle =
    pick(l, {
      es: "Elegí el modelo y abrí templates listos. Esto ayuda a evitar prompts genéricos y adaptarlos al estilo de cada IA.",
      en: "Pick a model and open copy-ready templates. This helps you avoid generic prompts and tailor them to each model’s style.",
      pt: "Escolha um modelo e abra templates prontos para copiar. Assim você evita prompts genéricos e os adapta ao estilo de cada modelo.",
    });

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-12 pb-12 3xl:max-w-7xl">
      <JsonLd data={registryPageGraph(l, `/${l}/models`, { collection: true })} />
      <div className="mx-auto max-w-3xl text-center space-y-2">
        <h1 className="font-title text-3xl sm:text-4xl font-semibold">{title}</h1>
        <p className="opacity-80 text-sm sm:text-base">{subtitle}</p>

        <div className="pt-2 text-xs opacity-70">
          <Link href={`/${l}`} className="hover:underline underline-offset-2">
            {pick(l, { es: "← Volver al inicio", en: "← Back to home", pt: "← Voltar ao início" })}
          </Link>
        </div>
      </div>

      {/* ✅ SEO body content (H2 + texto + links internos) */}
      <section className="mt-10 surface p-5">
        <h2 className="text-sm font-medium">{pick(l, { es: "Cómo usar estas páginas", en: "How to use these pages", pt: "Como usar estas páginas" })}</h2>
        <div className="mt-2 space-y-2 text-sm opacity-85">
          <p>
            {pick(l, {
              es: "Cada modelo responde distinto. Acá tenés una página por modelo con tips prácticos y templates listos para copiar. Abrí un modelo, elegí un template y se precarga en el analizador para analizarlo y mejorarlo.",
              en: "Each model behaves differently. Here you’ll find one page per model with practical tips and copy-paste templates. Open a model, pick a template, and it will prefill in the analyzer so you can analyze and improve it.",
              pt: "Cada modelo se comporta de um jeito. Aqui você encontra uma página por modelo, com dicas práticas e templates prontos para copiar. Abra um modelo, escolha um template e ele já aparece preenchido no analisador para você analisar e melhorar.",
            })}
          </p>
          <p>
            {pick(l, {
              es: "Si tu objetivo es output estricto, empezá por la guía de JSON. Si querés prompts de estudio, mirá los packs de prompts.",
              en: "If you need strict output, start with the JSON guide. If you’re doing studying/workflows, check the prompt packs.",
              pt: "Se você precisa de saída estrita, comece pelo guia de JSON. Se o foco é estudo ou fluxos de trabalho, veja os pacotes de prompts.",
            })}
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <Link className="btn btn-ghost h-9 px-4" href={`/${l}/guides/json-output`}>
              {pick(l, { es: "Guía: JSON estricto", en: "Guide: Strict JSON", pt: "Guia: JSON estrito" })}
            </Link>
            <Link className="btn btn-ghost h-9 px-4" href={`/${l}/prompts/study`}>
              {pick(l, { es: "Prompts: Estudio", en: "Prompts: Study", pt: "Prompts: Estudo" })}
            </Link>
            <Link className="btn btn-ghost h-9 px-4" href={`/${l}/glossary`}>
              {pick(l, { es: "Glosario", en: "Glossary", pt: "Glossário" })}
            </Link>
          </div>
        </div>
      </section>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {modelPages.map((m) => (
          <Link key={m.slug} href={`/${l}/models/${m.slug}`} className="surface p-4 space-y-2">
            <div className="text-sm font-medium">{m.title[l]}</div>
            <div className="text-sm opacity-80">{m.description[l]}</div>
            <div className="text-xs opacity-70">{pick(l, { es: "Abrir →", en: "Open →", pt: "Abrir →" })}</div>
          </Link>
        ))}
      </div>

      {/* ✅ Extra internal links (reduce “discovered not indexed”) */}
      <section className="mt-10 surface p-5">
        <h2 className="text-sm font-medium">{pick(l, {
          es: "Conceptos que suelen causar problemas",
          en: "Concepts that commonly break prompts",
          pt: "Conceitos que costumam quebrar prompts",
        })}</h2>
        <p className="mt-2 text-sm opacity-85">
          {pick(l, {
            es: "Si tus prompts fallan por salidas inventadas o baja precisión, mirá estos términos del glosario:",
            en: "If your prompts fail due to hallucinations or low precision, check these glossary terms:",
            pt: "Se os seus prompts falham por alucinações ou baixa precisão, veja estes termos do glossário:",
          })}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link className="btn btn-ghost h-9 px-4" href={`/${l}/glossary/hallucinations`}>Hallucinations</Link>
          <Link className="btn btn-ghost h-9 px-4" href={`/${l}/glossary/few-shot`}>Few-shot</Link>
          <Link className="btn btn-ghost h-9 px-4" href={`/${l}/glossary/temperature`}>Temperature</Link>
        </div>
      </section>
    </main>
  );
}


