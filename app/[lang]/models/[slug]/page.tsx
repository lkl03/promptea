// app/[lang]/models/[slug]/page.tsx
import Link from "next/link";
import { hasLocale } from "../../dictionaries";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { getModelPage, modelPages } from "@/lib/seo/content/models";
import { buildPrefillHref } from "@/lib/seo/prefill";
import { pageMetadata } from "@/lib/seo/metadata";
import { markdownPathOf, modelPageUpdated } from "@/lib/seo/registry";
import JsonLd from "@/components/seo/JsonLd";
import PageMeta from "@/components/seo/PageMeta";
import ModelRegistryList from "@/components/seo/ModelRegistryList";
import { modelGraph } from "@/lib/seo/pageGraphs";
import { pick, LANGS, toLang } from "@/lib/domain";

export function generateStaticParams() {
  return LANGS.flatMap((lang) => modelPages.map((m) => ({ lang, slug: m.slug })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}): Promise<Metadata> {
  const { lang, slug } = await params;
  const l = toLang(lang);

  const model = getModelPage(slug);
  if (!model) return {};

  const path = `/${l}/models/${slug}`;
  return pageMetadata({
    lang: l,
    path,
    title: model.title[l],
    description: model.description[l],
    type: "article",
    markdownPath: markdownPathOf(path),
    modifiedTime: modelPageUpdated(slug),
  });
}

export default async function ModelPage({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}) {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) notFound();
  const l = toLang(lang);

  const model = getModelPage(slug);
  if (!model) notFound();

  const faq = model.faq.map((x) => ({ q: x.q[l], a: x.a[l] }));

  const updated = modelPageUpdated(slug);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-12 pb-12 3xl:max-w-7xl">
      {/* JSON-LD: one graph (WebPage + Article + BreadcrumbList + FAQPage) */}
      <JsonLd data={modelGraph(model, l, updated)} />

      <div className="mx-auto max-w-3xl text-center space-y-2">
        <h1 className="font-title text-3xl sm:text-4xl font-semibold">{model.title[l]}</h1>
        <p className="opacity-80 text-sm sm:text-base">{model.description[l]}</p>
        <PageMeta lang={l} updated={updated} markdownPath={markdownPathOf(`/${l}/models/${slug}`)} />

        <div className="pt-2 text-xs opacity-70">
          <Link href={`/${l}/models`} className="hover:underline underline-offset-2">
            {pick(l, { es: "← Volver a modelos", en: "← Back to models", pt: "← Voltar aos modelos" })}
          </Link>
        </div>
      </div>

      {/* ✅ SEO editorial block */}
      <section className="mt-8 surface p-5">
        <h2 className="text-sm font-medium">{pick(l, { es: "Qué cambia en este modelo", en: "What changes with this model", pt: "O que muda com este modelo" })}</h2>
        <div className="mt-2 space-y-2 text-sm opacity-85">
          <p>
            {pick(l, {
              es: "Aunque la estructura del prompt sea similar, cada modelo tiene sesgos: algunos siguen mejor instrucciones estrictas, otros son más creativos, otros necesitan ejemplos. Estos templates están pensados para reducir ambigüedad y mejorar consistencia.",
              en: "Even if prompt structure is similar, each model has biases: some follow strict instructions better, some are more creative, and some need examples. These templates are designed to reduce ambiguity and improve consistency.",
              pt: "Mesmo que a estrutura do prompt seja parecida, cada modelo tem seus vieses: alguns seguem melhor instruções estritas, outros são mais criativos e outros precisam de exemplos. Estes templates foram pensados para reduzir a ambiguidade e melhorar a consistência.",
            })}
          </p>
          <p>
            {pick(l, {
              es: "Recomendación: definí formato de salida (idealmente con checklist), agregá restricciones y, si necesitás precisión, usá few-shot o pedí JSON estricto.",
              en: "Recommendation: define output format (ideally with a checklist), add constraints, and if you need precision, use few-shot or require strict JSON.",
              pt: "Recomendação: defina o formato de saída (de preferência com um checklist), adicione restrições e, se precisar de precisão, use few-shot ou exija JSON estrito.",
            })}
          </p>

          <div className="flex flex-wrap gap-2 pt-2">
            <Link className="btn btn-ghost h-9 px-4" href={`/${l}/guides/json-output`}>{pick(l, { es: "JSON estricto", en: "Strict JSON", pt: "JSON estrito" })}</Link>
            <Link className="btn btn-ghost h-9 px-4" href={`/${l}/glossary/few-shot`}>Few-shot</Link>
            <Link className="btn btn-ghost h-9 px-4" href={`/${l}/glossary/hallucinations`}>Hallucinations</Link>
          </div>
        </div>
      </section>


      {/* Current models of this family, from the verified registry */}
      <ModelRegistryList target={model.slug} lang={l} />

      {/* Tips */}
      <section className="mt-8 surface p-5">
        <div className="text-sm font-medium">{pick(l, { es: "Tips rápidos", en: "Quick tips", pt: "Dicas rápidas" })}</div>
        <ul className="mt-3 list-disc pl-5 text-sm opacity-90 space-y-1">
          {model.bullets[l].map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      </section>

      {/* Templates */}
      <section className="mt-10">
        <div className="text-sm font-medium">{pick(l, { es: "Templates", en: "Templates", pt: "Templates" })}</div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {model.templates.map((t, idx) => {
            // Nota: target lo forzamos al slug del modelo (como sugería tu archivo original)
            // y purpose viene del template (consistente con tus packs).
            const href = buildPrefillHref({ lang: l, prompt: t.prompt[l], purpose: t.purpose, target: model.slug });
            // v1.7.3: every card has the same visible "Open in Promptea" text, so the
            // accessible name adds the template title (visible text first, for voice control).
            const openLabel = pick(l, { es: "Abrir en Promptea", en: "Open in Promptea", pt: "Abrir no Promptea" });

            return (
              <article key={idx} className="surface p-4 space-y-3">
                <div className="text-sm font-medium">{t.title[l]}</div>
                {/* v1.8.3: focusable so the scrollable template can be scrolled from the keyboard (WCAG 2.1.1). */}
                <pre
                  className="surface-soft p-3 text-xs whitespace-pre-wrap max-h-56 overflow-auto"
                  tabIndex={0}
                  role="group"
                  aria-label={`${pick(l, { es: "Prompt de la plantilla", en: "Template prompt", pt: "Prompt do template" })}: ${t.title[l]}`}
                >
                  {t.prompt[l]}
                </pre>

                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs opacity-70">
                    {pick(l, {
                      es: "Se abre en el analizador con el prompt precargado.",
                      en: "Opens the analyzer with the prompt prefilled.",
                      pt: "Abre o analisador com o prompt já preenchido.",
                    })}
                  </div>
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

