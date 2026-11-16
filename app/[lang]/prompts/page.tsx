// app/[lang]/prompts/page.tsx
import JsonLd from "@/components/seo/JsonLd";
import { registryPageGraph } from "@/lib/seo/pageGraphs";
import Link from "next/link";
import { hasLocale } from "../dictionaries";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
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
    path: `/${l}/prompts`,
    title: pick(l, { es: "Packs de prompts (plantillas)", en: "Prompt packs (templates)", pt: "Pacotes de prompts (templates)", zh: "提示词合集（模板）" }),
    description:
      pick(l, {
        es: "Packs de prompts listos para copiar: Study, Code, Marketing, Image, Text y Data. Abrilos en Promptea y optimizalos por IA.",
        en: "Copy-ready prompt packs: Study, Code, Marketing, Image, Text and Data. Open in Promptea and optimize per AI.",
        pt: "Pacotes de prompts prontos para copiar: Estudo, Código, Marketing, Imagem, Texto e Dados. Abra no Promptea e otimize para cada IA.",
        zh: "可直接复制的提示词合集：学习、代码、营销、图像、文本和数据。在Promptea中打开，并针对每款AI进行优化。",
      }),
  });
}

export default async function PromptsIndexPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const l = toLang(lang);

  const title = pick(l, { es: "Packs de prompts", en: "Prompt packs", pt: "Pacotes de prompts", zh: "提示词合集" });
  const subtitle =
    pick(l, {
      es: "Plantillas listas para copiar. Elegí un pack y abrí un prompt en Promptea.",
      en: "Copy-ready templates. Pick a pack and open a prompt in Promptea.",
      pt: "Templates prontos para copiar. Escolha um pacote e abra um prompt no Promptea.",
      zh: "可直接复制的模板。选择一个合集，在Promptea中打开其中的提示词。",
    });

  const packs = [
    {
      href: `/${l}/prompts/study`,
      name: pick(l, { es: "Study (estudio)", en: "Study", pt: "Estudo", zh: "学习" }),
      desc:
        pick(l, {
          es: "Explicaciones, resúmenes, ejercicios y planes de estudio.",
          en: "Explanations, summaries, exercises and study plans.",
          pt: "Explicações, resumos, exercícios e planos de estudo.",
          zh: "讲解、总结、练习和学习计划。",
        }),
      count: 6,
    },
    {
      href: `/${l}/prompts/code`,
      name: pick(l, { es: "Code (programación)", en: "Code", pt: "Código", zh: "代码" }),
      desc:
        pick(l, {
          es: "Debugging, code review, refactors y tests.",
          en: "Debugging, code reviews, refactors and tests.",
          pt: "Depuração, code review, refatorações e testes.",
          zh: "调试、代码审查、重构和测试。",
        }),
      count: 6,
    },
    {
      href: `/${l}/prompts/marketing`,
      name: "Marketing",
      desc:
        pick(l, {
          es: "Ads, landings, emails y contenido para redes.",
          en: "Ads, landing pages, emails and social content.",
          pt: "Anúncios, landing pages, e-mails e conteúdo para redes sociais.",
          zh: "广告、落地页、邮件和社交媒体内容。",
        }),
      count: 6,
    },
    {
      href: `/${l}/prompts/image`,
      name: "Image",
      desc:
        pick(l, {
          es: "Prompts para generar imágenes: estilo, composición y variantes.",
          en: "Image generation prompts: style, composition and variations.",
          pt: "Prompts para geração de imagens: estilo, composição e variações.",
          zh: "图像生成提示词：风格、构图和变体。",
        }),
      count: 6,
    },
    {
      href: `/${l}/prompts/text`,
      name: pick(l, { es: "Text (escritura)", en: "Text", pt: "Texto", zh: "文本" }),
      desc:
        pick(l, {
          es: "Reescritura, tono, resúmenes, emails y guiones.",
          en: "Rewriting, tone, summaries, emails and scripts.",
          pt: "Reescrita, tom, resumos, e-mails e roteiros.",
          zh: "改写、语气、摘要、邮件和脚本。",
        }),
      count: 6,
    },
    {
      href: `/${l}/prompts/data`,
      name: "Data",
      desc:
        pick(l, {
          es: "JSON estricto, extracción, limpieza y transformaciones.",
          en: "Strict JSON, extraction, cleaning and transformations.",
          pt: "JSON estrito, extração, limpeza e transformações.",
          zh: "严格JSON、信息提取、数据清洗和转换。",
        }),
      count: 6,
    },
  ];

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-12 pb-12 3xl:max-w-7xl">
      <JsonLd data={registryPageGraph(l, `/${l}/prompts`, { collection: true })} />
      <div className="mx-auto max-w-3xl text-center space-y-2">
        <h1 className="font-title text-3xl sm:text-4xl font-semibold">{title}</h1>
        <p className="opacity-80 text-sm sm:text-base">{subtitle}</p>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {packs.map((p) => (
          <Link key={p.href} href={p.href} className="surface p-5 block hover:opacity-95 transition">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-medium">{p.name}</div>
              <span className="inline-flex items-center rounded-full border border-line bg-surface-soft px-2 py-0.5 text-[11px] text-ink-muted shrink-0">
                {p.count} {pick(l, { es: "prompts", en: "prompts", pt: "prompts", zh: "个提示词" })}
              </span>
            </div>
            <div className="mt-1 text-sm opacity-80">{p.desc}</div>
            <div className="mt-4 text-xs opacity-70">{pick(l, { es: "Ver prompts →", en: "View prompts →", pt: "Ver prompts →", zh: "查看提示词 →" })}</div>
          </Link>
        ))}
      </div>

      <div className="mt-8 text-center text-sm opacity-75">
        <Link href={`/${l}/`} className="hover:underline underline-offset-2">
          {pick(l, { es: "Volver al inicio", en: "Back to home", pt: "Voltar ao início", zh: "返回首页" })}
        </Link>
      </div>
    </main>
  );
}

