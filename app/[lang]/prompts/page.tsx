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
    title: pick(l, { es: "Packs de prompts (plantillas)", en: "Prompt packs (templates)", pt: "Pacotes de prompts (templates)", zh: "Prompt packs (templates)" }),
    description:
      pick(l, {
        es: "Packs de prompts listos para copiar: Study, Code, Marketing, Image, Text y Data. Abrilos en Promptea y optimizalos por IA.",
        en: "Copy-ready prompt packs: Study, Code, Marketing, Image, Text and Data. Open in Promptea and optimize per AI.",
        pt: "Pacotes de prompts prontos para copiar: Estudo, Código, Marketing, Imagem, Texto e Dados. Abra no Promptea e otimize para cada IA.",
        zh: "Copy-ready prompt packs: Study, Code, Marketing, Image, Text and Data. Open in Promptea and optimize per AI.",
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

  const title = pick(l, { es: "Packs de prompts", en: "Prompt packs", pt: "Pacotes de prompts", zh: "Prompt packs" });
  const subtitle =
    pick(l, {
      es: "Plantillas listas para copiar. Elegí un pack y abrí un prompt en Promptea.",
      en: "Copy-ready templates. Pick a pack and open a prompt in Promptea.",
      pt: "Templates prontos para copiar. Escolha um pacote e abra um prompt no Promptea.",
      zh: "Copy-ready templates. Pick a pack and open a prompt in Promptea.",
    });

  const packs = [
    {
      href: `/${l}/prompts/study`,
      name: pick(l, { es: "Study (estudio)", en: "Study", pt: "Estudo", zh: "Study" }),
      desc:
        pick(l, {
          es: "Explicaciones, resúmenes, ejercicios y planes de estudio.",
          en: "Explanations, summaries, exercises and study plans.",
          pt: "Explicações, resumos, exercícios e planos de estudo.",
          zh: "Explanations, summaries, exercises and study plans.",
        }),
      count: 6,
    },
    {
      href: `/${l}/prompts/code`,
      name: pick(l, { es: "Code (programación)", en: "Code", pt: "Código", zh: "Code" }),
      desc:
        pick(l, {
          es: "Debugging, code review, refactors y tests.",
          en: "Debugging, code reviews, refactors and tests.",
          pt: "Depuração, code review, refatorações e testes.",
          zh: "Debugging, code reviews, refactors and tests.",
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
          zh: "Ads, landing pages, emails and social content.",
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
          zh: "Image generation prompts: style, composition and variations.",
        }),
      count: 6,
    },
    {
      href: `/${l}/prompts/text`,
      name: pick(l, { es: "Text (escritura)", en: "Text", pt: "Texto", zh: "Text" }),
      desc:
        pick(l, {
          es: "Reescritura, tono, resúmenes, emails y guiones.",
          en: "Rewriting, tone, summaries, emails and scripts.",
          pt: "Reescrita, tom, resumos, e-mails e roteiros.",
          zh: "Rewriting, tone, summaries, emails and scripts.",
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
          zh: "Strict JSON, extraction, cleaning and transformations.",
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
                {p.count} {pick(l, { es: "prompts", en: "prompts", pt: "prompts", zh: "prompts" })}
              </span>
            </div>
            <div className="mt-1 text-sm opacity-80">{p.desc}</div>
            <div className="mt-4 text-xs opacity-70">{pick(l, { es: "Ver prompts →", en: "View prompts →", pt: "Ver prompts →", zh: "View prompts →" })}</div>
          </Link>
        ))}
      </div>

      <div className="mt-8 text-center text-sm opacity-75">
        <Link href={`/${l}/`} className="hover:underline underline-offset-2">
          {pick(l, { es: "Volver al inicio", en: "Back to home", pt: "Voltar ao início", zh: "Back to home" })}
        </Link>
      </div>
    </main>
  );
}

