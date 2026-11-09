// app/[lang]/guides/[slug]/page.tsx
import Link from "next/link";
import { hasLocale } from "../../dictionaries";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { getGuide, guides } from "@/lib/seo/content/guides";
import { buildPrefillHref } from "@/lib/seo/prefill";
import { pageMetadata } from "@/lib/seo/metadata";
import { markdownPathOf } from "@/lib/seo/registry";
import { CONTENT_UPDATED } from "@/lib/seo/dates";
import JsonLd from "@/components/seo/JsonLd";
import PageMeta from "@/components/seo/PageMeta";
import { guideGraph } from "@/lib/seo/pageGraphs";

export function generateStaticParams() {
  const LOCALES = ["es", "en"] as const;
  return LOCALES.flatMap((lang) => guides.map((g) => ({ lang, slug: g.slug })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}): Promise<Metadata> {
  const { lang, slug } = await params;
  const l = lang === "en" ? "en" : "es";

  const guide = getGuide(slug);
  if (!guide) return {};

  const path = `/${l}/guides/${slug}`;
  return pageMetadata({
    lang: l,
    path,
    title: guide.title[l],
    description: guide.description[l],
    type: "article",
    markdownPath: markdownPathOf(path),
    modifiedTime: guide.updated ?? CONTENT_UPDATED.guides,
  });
}

export default async function GuidePage({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}) {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) notFound();
  const l = (lang === "en" ? "en" : "es") as "es" | "en";

  const guide = getGuide(slug);
  if (!guide) notFound();

  const updated = guide.updated ?? CONTENT_UPDATED.guides;
  const faq = guide.faq.map((x) => ({ q: x.q[l], a: x.a[l] }));

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-12 pb-12 3xl:max-w-7xl">
      {/* JSON-LD: one graph (WebPage + Article + BreadcrumbList + FAQPage), same text as below */}
      <JsonLd data={guideGraph(guide, l, updated)} />

      <div className="mx-auto max-w-3xl text-center space-y-2">
        <h1 className="font-title text-3xl sm:text-4xl font-semibold">{guide.title[l]}</h1>
        <p className="opacity-80 text-sm sm:text-base">{guide.description[l]}</p>
        <PageMeta lang={l} updated={updated} markdownPath={markdownPathOf(`/${l}/guides/${slug}`)} />

        <div className="pt-2 text-xs opacity-70">
          <Link href={`/${l}/guides`} className="hover:underline underline-offset-2">
            {l === "es" ? "← Volver a guías" : "← Back to guides"}
          </Link>
        </div>
      </div>

      {/* Secciones */}
      <div className="mt-8 grid gap-3">
        {guide.sections.map((s, idx) => (
          <section key={idx} className="surface p-5">
            <h2 className="text-sm font-medium">{s.heading[l]}</h2>
            <ul className="mt-3 list-disc pl-5 text-sm opacity-90 space-y-1">
              {s.bullets[l].map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {/* Templates */}
      <section className="mt-10">
        <h2 className="text-sm font-medium">{l === "es" ? "Plantillas" : "Templates"}</h2>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {guide.templates.map((t, idx) => {
            const href = buildPrefillHref({ lang: l, prompt: t.prompt[l], purpose: t.purpose, target: t.target });
            const openLabel = l === "es" ? "Abrir en Promptea" : "Open in Promptea";
            return (
              <article key={idx} className="surface p-4 space-y-3">
                <h3 className="text-sm font-medium">{t.title[l]}</h3>
                <pre className="surface-soft p-3 text-xs whitespace-pre-wrap max-h-56 overflow-auto">{t.prompt[l]}</pre>

                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs opacity-70">
                    {l === "es"
                      ? "Se abre en el analizador con el prompt precargado."
                      : "Opens the analyzer with the prompt prefilled."}
                  </div>
                  {/* Every card has the same visible label; the accessible name
                      starts with it and adds the template title, so screen-reader
                      link lists can tell the buttons apart (WCAG 2.4.4 / 2.5.3). */}
                  <Link href={href} className="btn btn-primary h-9 px-4" aria-label={`${openLabel}: ${t.title[l]}`}>
                    {openLabel}
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* FAQ visible */}
      <section className="mt-10 surface p-5">
        <h2 className="text-sm font-medium">{l === "es" ? "Preguntas frecuentes" : "FAQ"}</h2>
        <div className="mt-3 space-y-2">
          {faq.map((x) => (
            <details key={x.q} className="surface-soft p-3 rounded-2xl">
              <summary className="cursor-pointer text-sm font-medium">{x.q}</summary>
              <div className="mt-2 text-sm opacity-80">{x.a}</div>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}

