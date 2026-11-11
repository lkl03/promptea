// app/[lang]/guides/page.tsx
import JsonLd from "@/components/seo/JsonLd";
import { registryPageGraph } from "@/lib/seo/pageGraphs";
import Link from "next/link";
import { getDictionary, hasLocale } from "../dictionaries";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { guideLang, guides } from "@/lib/seo/content/guides";
import { pageMetadata } from "@/lib/seo/metadata";
import { LANG_TAG, pick, toLang } from "@/lib/domain";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const l = toLang(lang);

  return pageMetadata({
    lang: l,
    path: `/${l}/guides`,
    title: pick(l, {
      es: "Guías de prompting (sin humo)",
      en: "Prompting guides (no fluff)",
      pt: "Guias de prompting (sem enrolação)",
    }),
    description:
      pick(l, {
        es: "Guías prácticas para escribir mejores prompts: estructura, salida JSON, código, roles, few-shot, consejos por modelo (GPT, Claude, Gemini, Grok, Kimi, DeepSeek, Perplexity) y casos de uso por área.",
        en: "Practical guides to write better prompts: structure, JSON output, code, roles, few-shot, per-model advice (GPT, Claude, Gemini, Grok, Kimi, DeepSeek, Perplexity) and use cases by job.",
        pt: "Guias práticos para escrever prompts melhores: estrutura, saída em JSON, código, papéis, few-shot, dicas por modelo (GPT, Claude, Gemini, Grok, Kimi, DeepSeek, Perplexity) e casos de uso por profissão.",
      }),
  });
}

export default async function GuidesIndexPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const l = toLang(lang);
  const dict = await getDictionary(l);

  const title = pick(l, { es: "Guías de prompting", en: "Prompting guides", pt: "Guias de prompting" });
  const subtitle =
    pick(l, {
      es: "Guías evergreen con intención clara, templates copy-paste y FAQ.",
      en: "Evergreen guides with clear intent, copy-paste templates and FAQs.",
      pt: "Guias atemporais, com intenção clara, templates prontos para copiar e perguntas frequentes.",
    });

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-12 pb-12 3xl:max-w-7xl">
      <JsonLd data={registryPageGraph(l, `/${l}/guides`, { collection: true })} />
      <div className="mx-auto max-w-3xl text-center space-y-2">
        <h1 className="font-title text-3xl sm:text-4xl font-semibold">{title}</h1>
        <p className="opacity-80 text-sm sm:text-base">{subtitle}</p>

        <div className="pt-2 text-xs opacity-70">
          <Link href={`/${l}`} className="hover:underline underline-offset-2">
            {pick(l, { es: "← Volver al inicio", en: "← Back to home", pt: "← Voltar ao início" })}
          </Link>
        </div>
      </div>

      {/* ✅ SEO body content */}
      <section className="mt-10 surface p-5">
        <h2 className="text-sm font-medium">{pick(l, { es: "Por dónde empezar", en: "Start here", pt: "Comece por aqui" })}</h2>
        <div className="mt-2 space-y-2 text-sm opacity-85">
          <p>
            {pick(l, {
              es: "Si tus resultados varían mucho entre modelos o te devuelve cosas vagas, estas guías te ayudan a estructurar prompts con objetivos medibles: formato, restricciones, ejemplos y criterios de calidad.",
              en: "If your results vary across models or you get vague outputs, these guides help you structure prompts with measurable goals: format, constraints, examples, and quality criteria.",
              pt: "Se os seus resultados variam de um modelo para outro ou as respostas saem vagas, estes guias ajudam a estruturar prompts com objetivos mensuráveis: formato, restrições, exemplos e critérios de qualidade.",
            })}
          </p>
          <p>
            {pick(l, {
              es: "Tip: combiná una guía + un template por modelo. Eso acelera el aprendizaje y mejora consistencia.",
              en: "Tip: combine one guide + one model template. That speeds up learning and improves consistency.",
              pt: "Dica: combine um guia com um template por modelo. Isso acelera o aprendizado e melhora a consistência.",
            })}
          </p>

          <div className="flex flex-wrap gap-2 pt-2">
            <Link className="btn btn-ghost h-9 px-4" href={`/${l}/guides/json-output`}>
              {pick(l, { es: "Guía: JSON estricto", en: "Guide: Strict JSON", pt: "Guia: JSON estrito" })}
            </Link>
            <Link className="btn btn-ghost h-9 px-4" href={`/${l}/models`}>
              {pick(l, { es: "Prompts por modelo", en: "Prompts by model", pt: "Prompts por modelo" })}
            </Link>
            <Link className="btn btn-ghost h-9 px-4" href={`/${l}/prompts`}>
              {pick(l, { es: "Packs de prompts", en: "Prompt packs", pt: "Pacotes de prompts" })}
            </Link>
          </div>
        </div>
      </section>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {guides.map((g) => (
          <Link key={g.slug} href={`/${l}/guides/${g.slug}`} className="surface p-4 space-y-2">
            <div className="text-sm font-medium" lang={guideLang(g, l) === l ? undefined : LANG_TAG[guideLang(g, l)]}>
              {g.title[guideLang(g, l)]}
              {guideLang(g, l) === l ? null : <span className="badge badge-neutral ml-2 align-middle" lang={LANG_TAG[l]}>{dict.guides.inEnglish}</span>}
            </div>
            <div className="text-sm opacity-80" lang={guideLang(g, l) === l ? undefined : LANG_TAG[guideLang(g, l)]}>{g.description[guideLang(g, l)]}</div>
            <div className="text-xs opacity-70">{pick(l, { es: "Abrir guía →", en: "Open guide →", pt: "Abrir guia →" })}</div>
          </Link>
        ))}
      </div>

      {/* Internal note (not rendered):
          Link guides from Home + Footer and from model/pack pages.
          More internal links = fewer “Discovered: not indexed” URLs.
      */}
    </main>
  );
}


