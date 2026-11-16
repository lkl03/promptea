// app/[lang]/glossary/page.tsx
import JsonLd from "@/components/seo/JsonLd";
import { registryPageGraph } from "@/lib/seo/pageGraphs";
import Link from "next/link";
import { hasLocale } from "../dictionaries";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { glossary } from "@/lib/seo/content/glossary";
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
    path: `/${l}/glossary`,
    title: pick(l, {
      es: "Glosario de prompt engineering",
      en: "Prompt engineering glossary",
      pt: "Glossário de engenharia de prompt",
      zh: "提示词工程术语表",
    }),
    description:
      pick(l, {
        es: "Definiciones cortas y ejemplos: system prompt, few-shot, delimitadores, JSON schema, prompt injection y más.",
        en: "Short definitions + examples: system prompt, few-shot, delimiters, JSON schema, prompt injection, and more.",
        pt: "Definições curtas + exemplos: system prompt, few-shot, delimitadores, JSON schema, injeção de prompt e mais.",
        zh: "简明定义加示例：系统提示词、少样本示例、分隔符、JSON schema、提示词注入等。",
      }),
  });
}

export default async function GlossaryIndexPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const l = toLang(lang);

  const title = pick(l, {
    es: "Glosario de prompt engineering",
    en: "Prompt engineering glossary",
    pt: "Glossário de engenharia de prompt",
    zh: "提示词工程术语表",
  });
  const subtitle =
    pick(l, {
      es: "Definiciones cortas + ejemplo copy-paste por término. Elegí uno y abrilo.",
      en: "Short definitions + a copy-paste example per term. Pick one and open it.",
      pt: "Definições curtas + um exemplo pronto para copiar por termo. Escolha um e abra.",
      zh: "每个术语都有简明定义和一个可直接复制的示例。选一个打开看看。",
    });

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-12 pb-12 3xl:max-w-7xl">
      <JsonLd data={registryPageGraph(l, `/${l}/glossary`, { collection: true })} />
      <div className="mx-auto max-w-3xl text-center space-y-2">
        <h1 className="font-title text-3xl sm:text-4xl font-semibold">{title}</h1>
        <p className="opacity-80 text-sm sm:text-base">{subtitle}</p>

        <div className="pt-2 text-xs opacity-70">
          <Link href={`/${l}`} className="hover:underline underline-offset-2">
            {pick(l, { es: "← Volver al inicio", en: "← Back to home", pt: "← Voltar ao início", zh: "← 返回首页" })}
          </Link>
        </div>
      </div>

      {/* ✅ SEO editorial block */}
      <section className="mt-10 surface p-5">
        <h2 className="text-sm font-medium">{pick(l, { es: "Start here", en: "Start here", pt: "Comece por aqui", zh: "从这里开始" })}</h2>
        <div className="mt-2 space-y-2 text-sm opacity-85">
          <p>
            {pick(l, {
              es: "Este glosario explica conceptos que suelen romper prompts: ambigüedad, falta de delimitación, outputs inconsistentes o inventados. Cada término incluye definición corta y un ejemplo listo para copiar.",
              en: "This glossary covers concepts that commonly break prompts: ambiguity, missing delimiters, inconsistent output, or hallucinations. Each term includes a short definition and a copy-ready example.",
              pt: "Este glossário cobre os conceitos que mais costumam quebrar prompts: ambiguidade, falta de delimitadores, saída inconsistente ou alucinações. Cada termo traz uma definição curta e um exemplo pronto para copiar.",
              zh: "本术语表涵盖最容易让提示词出问题的概念：歧义、缺少分隔符、输出不一致或幻觉。每个术语都附有简明定义和一个可直接复制的示例。",
            })}
          </p>
          <p>
            {pick(l, {
              es: "Si necesitás outputs estrictos, empezá por JSON estricto. Si querés adaptar prompts a cada IA, mirá prompts por modelo.",
              en: "If you need strict outputs, start with strict JSON. If you want to tailor prompts to each AI, check prompts by model.",
              pt: "Se você precisa de saídas estritas, comece pelo JSON estrito. Se quer adaptar os prompts a cada IA, veja os prompts por modelo.",
              zh: "如果需要严格的输出，先从严格JSON开始。如果想针对每款AI调整提示词，请查看按模型分类的提示词。",
            })}
          </p>

          <div className="flex flex-wrap gap-2 pt-2">
            <Link className="btn btn-ghost h-9 px-4" href={`/${l}/guides/json-output`}>
              {pick(l, { es: "Guía: JSON estricto", en: "Guide: Strict JSON", pt: "Guia: JSON estrito", zh: "指南：严格JSON" })}
            </Link>
            <Link className="btn btn-ghost h-9 px-4" href={`/${l}/models`}>
              {pick(l, { es: "Prompts por modelo", en: "Prompts by model", pt: "Prompts por modelo", zh: "按模型分类的提示词" })}
            </Link>
            <Link className="btn btn-ghost h-9 px-4" href={`/${l}/prompts`}>
              {pick(l, { es: "Packs de prompts", en: "Prompt packs", pt: "Pacotes de prompts", zh: "提示词合集" })}
            </Link>
          </div>
        </div>
      </section>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {glossary.map((t) => (
          <Link key={t.slug} href={`/${l}/glossary/${t.slug}`} className="surface p-4 space-y-2">
            <div className="text-sm font-medium">{t.title[l]}</div>
            <div className="text-sm opacity-80">{t.description[l]}</div>
            <div className="text-xs opacity-70">{pick(l, { es: "Ver término →", en: "View term →", pt: "Ver termo →", zh: "查看术语 →" })}</div>
          </Link>
        ))}
      </div>
    </main>
  );
}


