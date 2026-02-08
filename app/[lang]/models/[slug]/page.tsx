// app/[lang]/models/[slug]/page.tsx
import Link from "next/link";
import { hasLocale } from "../../dictionaries";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { getModelPage, modelPages } from "@/lib/seo/content/models";

function buildOpenLink(lang: "es" | "en", purpose: string, target: string, prompt: string) {
  const qp = new URLSearchParams();
  qp.set("purpose", purpose);
  qp.set("target", target);
  qp.set("prompt", prompt);
  return `/${lang}?${qp.toString()}`;
}

export function generateStaticParams() {
  const LOCALES = ["es", "en"] as const;
  return LOCALES.flatMap((lang) => modelPages.map((m) => ({ lang, slug: m.slug })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}): Promise<Metadata> {
  const { lang, slug } = await params;
  const l = lang === "en" ? "en" : "es";

  const model = getModelPage(slug);
  if (!model) return {};

  return {
    title: model.title[l],
    description: model.description[l],
    alternates: {
      canonical: `/${l}/models/${slug}`,
      languages: {
        es: `/es/models/${slug}`,
        en: `/en/models/${slug}`,
      },
    },
  };
}

export default async function ModelPage({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}) {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) notFound();
  const l = (lang === "en" ? "en" : "es") as "es" | "en";

  const model = getModelPage(slug);
  if (!model) notFound();

  const faq = model.faq.map((x) => ({ q: x.q[l], a: x.a[l] }));

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((x) => ({
      "@type": "Question",
      name: x.q,
      acceptedAnswer: { "@type": "Answer", text: x.a },
    })),
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-12 pb-12 3xl:max-w-7xl">
      {/* JSON-LD FAQ */}
      {faq.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />}

      <div className="mx-auto max-w-3xl text-center space-y-2">
        <h1 className="font-title text-3xl sm:text-4xl font-semibold">{model.title[l]}</h1>
        <p className="opacity-80 text-sm sm:text-base">{model.description[l]}</p>

        <div className="pt-2 text-xs opacity-70">
          <Link href={`/${l}/models`} className="hover:underline underline-offset-2">
            {l === "es" ? "← Volver a modelos" : "← Back to models"}
          </Link>
        </div>
      </div>

      {/* ✅ SEO editorial block */}
      <section className="mt-8 surface p-5">
        <h2 className="text-sm font-medium">{l === "es" ? "Qué cambia en este modelo" : "What changes with this model"}</h2>
        <div className="mt-2 space-y-2 text-sm opacity-85">
          <p>
            {l === "es"
              ? "Aunque la estructura del prompt sea similar, cada modelo tiene sesgos: algunos siguen mejor instrucciones estrictas, otros son más creativos, otros necesitan ejemplos. Estos templates están pensados para reducir ambigüedad y mejorar consistencia."
              : "Even if prompt structure is similar, each model has biases: some follow strict instructions better, some are more creative, and some need examples. These templates are designed to reduce ambiguity and improve consistency."}
          </p>
          <p>
            {l === "es"
              ? "Recomendación: definí formato de salida (idealmente con checklist), agregá restricciones y, si necesitás precisión, usá few-shot o pedí JSON estricto."
              : "Recommendation: define output format (ideally with a checklist), add constraints, and if you need precision, use few-shot or require strict JSON."}
          </p>

          <div className="flex flex-wrap gap-2 pt-2">
            <Link className="btn h-9 px-4" href={`/${l}/guides/json-output`}>{l === "es" ? "JSON estricto" : "Strict JSON"}</Link>
            <Link className="btn h-9 px-4" href={`/${l}/glossary/few-shot`}>Few-shot</Link>
            <Link className="btn h-9 px-4" href={`/${l}/glossary/hallucinations`}>Hallucinations</Link>
          </div>
        </div>
      </section>


      {/* Tips */}
      <section className="mt-8 surface p-5">
        <div className="text-sm font-medium">{l === "es" ? "Tips rápidos" : "Quick tips"}</div>
        <ul className="mt-3 list-disc pl-5 text-sm opacity-90 space-y-1">
          {model.bullets[l].map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      </section>

      {/* Templates */}
      <section className="mt-10">
        <div className="text-sm font-medium">{l === "es" ? "Templates" : "Templates"}</div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {model.templates.map((t, idx) => {
            // Nota: target lo forzamos al slug del modelo (como sugería tu archivo original)
            // y purpose viene del template (consistente con tus packs).
            const href = buildOpenLink(l, t.purpose, model.slug, t.prompt[l]);

            return (
              <article key={idx} className="surface p-4 space-y-3">
                <div className="text-sm font-medium">{t.title[l]}</div>
                <pre className="surface-soft p-3 text-xs whitespace-pre-wrap max-h-56 overflow-auto">{t.prompt[l]}</pre>

                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs opacity-70">
                    {l === "es"
                      ? "Se abre en la home con el prompt precargado."
                      : "Opens on home with the prompt prefilled."}
                  </div>
                  <Link href={href} className="btn btn-primary h-9 px-4">
                    {l === "es" ? "Abrir en Promptea" : "Open in Promptea"}
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
          <div className="text-sm font-medium">{l === "es" ? "Preguntas frecuentes" : "FAQ"}</div>
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

