// app/[lang]/glossary/[slug]/page.tsx
import Link from "next/link";
import { hasLocale } from "../../dictionaries";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { glossary, getTerm } from "@/lib/seo/content/glossary";
import { guides } from "@/lib/seo/content/guides";
import { pageMetadata } from "@/lib/seo/metadata";
import { markdownPathOf } from "@/lib/seo/registry";
import { CONTENT_UPDATED } from "@/lib/seo/dates";
import JsonLd from "@/components/seo/JsonLd";
import PageMeta from "@/components/seo/PageMeta";
import { glossaryGraph } from "@/lib/seo/pageGraphs";
import { pick, LANGS, toLang, type Lang } from "@/lib/domain";

function buildOpenLink(lang: Lang, purpose: string, target: string, prompt: string) {
  const qp = new URLSearchParams();
  qp.set("purpose", purpose);
  qp.set("target", target);
  qp.set("prompt", prompt);
  return `/${lang}/analyzer?${qp.toString()}`;
}

export function generateStaticParams() {
  return LANGS.flatMap((lang) => glossary.map((t) => ({ lang, slug: t.slug })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}): Promise<Metadata> {
  const { lang, slug } = await params;
  const l = toLang(lang);

  const term = getTerm(slug);
  if (!term) return {};

  const path = `/${l}/glossary/${slug}`;
  return pageMetadata({
    lang: l,
    path,
    title: term.title[l],
    description: term.description[l],
    type: "article",
    markdownPath: markdownPathOf(path),
    modifiedTime: term.updated ?? CONTENT_UPDATED.glossary,
  });
}

export default async function GlossaryTermPage({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}) {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) notFound();
  const l = toLang(lang);

  const term = getTerm(slug);
  if (!term) notFound();

  const href = buildOpenLink(l, term.example.purpose, term.example.target, term.example.prompt[l]);

  const faq = term.faq.map((x) => ({ q: x.q[l], a: x.a[l] }));

  const updated = term.updated ?? CONTENT_UPDATED.glossary;

  const relatedGuides = (term.relatedGuides ?? []).flatMap((s) => guides.filter((g) => g.slug === s));
  const relatedTerms = (term.relatedTerms ?? []).flatMap((s) => glossary.filter((g) => g.slug === s));

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-12 pb-12 3xl:max-w-7xl">
      {/* JSON-LD: one graph (WebPage + DefinedTerm + BreadcrumbList + FAQPage) */}
      <JsonLd data={glossaryGraph(term, l, updated)} />

      <div className="mx-auto max-w-3xl text-center space-y-2">
        <h1 className="font-title text-3xl sm:text-4xl font-semibold">{term.title[l]}</h1>
        <p className="opacity-80 text-sm sm:text-base">{term.description[l]}</p>
        <PageMeta lang={l} updated={updated} markdownPath={markdownPathOf(`/${l}/glossary/${slug}`)} />

        <div className="pt-2 text-xs opacity-70">
          <Link href={`/${l}/glossary`} className="hover:underline underline-offset-2">
            {pick(l, { es: "← Volver al glosario", en: "← Back to glossary", pt: "← Voltar ao glossário" })}
          </Link>
        </div>
      </div>

      {/* ✅ SEO editorial block */}
      <section className="mt-8 surface p-5">
        <h2 className="text-sm font-medium">{pick(l, { es: "Cómo aplicarlo en prompts", en: "How to apply it in prompts", pt: "Como aplicar em prompts" })}</h2>
        <div className="mt-2 space-y-2 text-sm opacity-85">
          <p>
            {pick(l, {
              es: "Usá este concepto para reducir ambigüedad y mejorar consistencia. Si tu output necesita formato estricto, combiná esto con una guía de JSON y un template por modelo.",
              en: "Use this concept to reduce ambiguity and improve consistency. If you need strict formatting, combine it with a JSON guide and a per-model template.",
              pt: "Use este conceito para reduzir a ambiguidade e melhorar a consistência. Se precisar de formato estrito, combine-o com um guia de JSON e um template por modelo.",
            })}
          </p>
          {relatedGuides.length > 0 || relatedTerms.length > 0 ? (
            <div className="space-y-2 pt-2">
              {relatedGuides.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs opacity-70">{pick(l, { es: "Guías relacionadas:", en: "Related guides:", pt: "Guias relacionados:" })}</span>
                  {relatedGuides.map((g) => (
                    <Link key={g.slug} className="btn btn-ghost h-9 px-4" href={`/${l}/guides/${g.slug}`}>
                      {g.title[l]}
                    </Link>
                  ))}
                </div>
              ) : null}
              {relatedTerms.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs opacity-70">{pick(l, { es: "Términos relacionados:", en: "Related terms:", pt: "Termos relacionados:" })}</span>
                  {relatedTerms.map((t) => (
                    <Link key={t.slug} className="btn btn-ghost h-9 px-4" href={`/${l}/glossary/${t.slug}`}>
                      {t.title[l]}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2 pt-2">
            <Link className="btn btn-ghost h-9 px-4" href={`/${l}/guides/json-output`}>
              {pick(l, { es: "JSON estricto", en: "Strict JSON", pt: "JSON estrito" })}
            </Link>
            <Link className="btn btn-ghost h-9 px-4" href={`/${l}/models`}>
              {pick(l, { es: "Modelos", en: "Models", pt: "Modelos" })}
            </Link>
            <Link className="btn btn-ghost h-9 px-4" href={`/${l}/prompts`}>
              {pick(l, { es: "Packs", en: "Packs", pt: "Pacotes" })}
            </Link>
          </div>
        </div>
      </section>

      {/* Qué significa */}
      <section className="mt-10 surface p-5">
        <div className="text-sm font-medium">{pick(l, { es: "Qué significa", en: "What it means", pt: "O que significa" })}</div>
        <ul className="mt-3 list-disc pl-5 text-sm opacity-90 space-y-1">
          {term.body[l].map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      </section>

      {/* Ejemplo */}
      <section className="mt-10">
        <div className="text-sm font-medium">{pick(l, { es: "Ejemplo copy-paste", en: "Copy-paste example", pt: "Exemplo pronto para copiar" })}</div>

        <article className="mt-3 surface p-4 space-y-3">
          <pre className="surface-soft p-3 text-xs whitespace-pre-wrap max-h-56 overflow-auto">{term.example.prompt[l]}</pre>

          <div className="flex items-center justify-between gap-3">
            <div className="text-xs opacity-70">
              {pick(l, {
                es: "Se abre en el analizador con el prompt precargado.",
                en: "Opens the analyzer with the prompt prefilled.",
                pt: "Abre o analisador com o prompt já preenchido.",
              })}
            </div>
            <Link href={href} className="btn btn-primary h-9 px-4">
              {pick(l, { es: "Abrir en Promptea", en: "Open in Promptea", pt: "Abrir no Promptea" })}
            </Link>
          </div>
        </article>
      </section>

      {/* FAQ visible */}
      {faq.length > 0 && (
        <section className="mt-10 surface p-5">
          <div className="text-sm font-medium">{pick(l, { es: "Preguntas frecuentes", en: "FAQ", pt: "Perguntas frequentes" })}</div>
          <div className="mt-3 space-y-2">
            {faq.map((x) => (
              <details key={x.q} className="surface-soft p-3 rounded-2xl">
                <summary className="cursor-pointer text-sm font-medium">{x.q}</summary>
                <div className="mt-2 text-sm opacity-80">{x.a}</div>
              </details>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}


