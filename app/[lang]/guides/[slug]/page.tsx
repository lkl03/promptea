// app/[lang]/guides/[slug]/page.tsx
import Link from "next/link";
import { getDictionary, hasLocale } from "../../dictionaries";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { getGuide, guideLang, guideLocales, guides } from "@/lib/seo/content/guides";
import { buildPrefillHref } from "@/lib/seo/prefill";
import { pageMetadata } from "@/lib/seo/metadata";
import { markdownPathOf } from "@/lib/seo/registry";
import { CONTENT_UPDATED } from "@/lib/seo/dates";
import JsonLd from "@/components/seo/JsonLd";
import PageMeta from "@/components/seo/PageMeta";
import { guideGraph } from "@/lib/seo/pageGraphs";
import { LANG_TAG, type ContentLang, pick, LANGS, toLang } from "@/lib/domain";
import ContentLangNotice from "@/components/blog/ContentLangNotice";
import { ANALYZER_LINK_TEXT, GUIDE_ANALYZER_CTA } from "@/lib/seo/content/analyzerContent";

export function generateStaticParams() {
  return LANGS.flatMap((lang) => guides.map((g) => ({ lang, slug: g.slug })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}): Promise<Metadata> {
  const { lang, slug } = await params;
  const l = toLang(lang);

  const guide = getGuide(slug);
  if (!guide) return {};

  const path = `/${l}/guides/${slug}`;
  // The language the guide is read in (English under /pt until it is translated).
  const cl = guideLang(guide, l);
  return pageMetadata({
    lang: l,
    path,
    // A guide that does not exist in every locale names only the ones it has.
    ...(guideLocales(guide).length < LANGS.length ? { contentLang: cl as ContentLang } : {}),
    title: guide.title[cl],
    description: guide.description[cl],
    type: "article",
    markdownPath: markdownPathOf(`/${cl}/guides/${slug}`),
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
  const l = toLang(lang);

  const guide = getGuide(slug);
  if (!guide) notFound();

  const updated = guide.updated ?? CONTENT_UPDATED.guides;
  // `l` is the interface language; `cl` the language the guide's text is in.
  const cl = guideLang(guide, l);
  const faq = guide.faq.map((x) => ({ q: x.q[cl], a: x.a[cl] }));
  const dict = await getDictionary(l);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-12 pb-12 3xl:max-w-7xl">
      {/* JSON-LD: one graph (WebPage + Article + BreadcrumbList + FAQPage), same text as below */}
      {/* Structured data describes the canonical page: the guide in the language it is written in. */}
      <JsonLd data={guideGraph(guide, cl, updated)} />

      <div className="mx-auto max-w-3xl text-center space-y-2">
        <h1 className="font-title text-3xl sm:text-4xl font-semibold" lang={cl === l ? undefined : LANG_TAG[cl]}>{guide.title[cl]}</h1>
        <p className="opacity-80 text-sm sm:text-base" lang={cl === l ? undefined : LANG_TAG[cl]}>{guide.description[cl]}</p>
        <PageMeta lang={l} updated={updated} markdownPath={markdownPathOf(`/${cl}/guides/${slug}`)} />
        {cl === l ? null : (
          <ContentLangNotice
            lang={l}
            text={dict.guides.langNotice}
            hrefs={{ es: `/es/guides/${slug}`, en: `/en/guides/${slug}` }}
            className="mt-4 text-left"
          />
        )}

        <div className="pt-2 text-xs opacity-70">
          <Link href={`/${l}/guides`} className="hover:underline underline-offset-2">
            {pick(l, { es: "← Volver a guías", en: "← Back to guides", pt: "← Voltar aos guias" })}
          </Link>
        </div>
      </div>

      {/* Secciones */}
      <div className="mt-8 grid gap-3" lang={cl === l ? undefined : LANG_TAG[cl]}>
        {guide.sections.map((s, idx) => (
          <section key={idx} className="surface p-5">
            <h2 className="text-sm font-medium">{s.heading[cl]}</h2>
            <ul className="mt-3 list-disc pl-5 text-sm opacity-90 space-y-1">
              {s.bullets[cl].map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {/* v1.8.6: contextual link to the analyzer from the most-read guides. */}
      {GUIDE_ANALYZER_CTA[guide.slug] ? (
        <p className="mt-6 surface-soft p-4 text-sm" lang={cl === l ? undefined : LANG_TAG[cl]}>
          {GUIDE_ANALYZER_CTA[guide.slug][cl]}{" "}
          <Link href={`/${l}/analyzer`} className="font-medium underline underline-offset-2">
            {ANALYZER_LINK_TEXT[cl]}
          </Link>
          .
        </p>
      ) : null}

      {/* Templates */}
      <section className="mt-10">
        <h2 className="text-sm font-medium">{pick(l, { es: "Plantillas", en: "Templates", pt: "Templates" })}</h2>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {guide.templates.map((t, idx) => {
            const href = buildPrefillHref({ lang: l, prompt: t.prompt[cl], purpose: t.purpose, target: t.target });
            const openLabel = pick(l, { es: "Abrir en Promptea", en: "Open in Promptea", pt: "Abrir no Promptea" });
            return (
              <article key={idx} className="surface p-4 space-y-3">
                <h3 id={`template-${idx}-title`} className="text-sm font-medium">{t.title[cl]}</h3>
                {/* v1.8.4: scrolls inside; focusable so it can be scrolled from the keyboard (WCAG 2.1.1). */}
                <pre tabIndex={0} role="group" aria-labelledby={`template-${idx}-title`} className="surface-soft p-3 text-xs whitespace-pre-wrap max-h-56 overflow-auto">{t.prompt[cl]}</pre>

                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs opacity-70">
                    {pick(l, {
                      es: "Se abre en el analizador con el prompt precargado.",
                      en: "Opens the analyzer with the prompt prefilled.",
                      pt: "Abre o analisador com o prompt já preenchido.",
                    })}
                  </div>
                  {/* Every card has the same visible label; the accessible name
                      starts with it and adds the template title, so screen-reader
                      link lists can tell the buttons apart (WCAG 2.4.4 / 2.5.3). */}
                  <Link href={href} className="btn btn-primary h-9 px-4" aria-label={`${openLabel}: ${t.title[cl]}`}>
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
        <h2 className="text-sm font-medium">{pick(l, { es: "Preguntas frecuentes", en: "FAQ", pt: "Perguntas frequentes" })}</h2>
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

