// app/[lang]/glossary/[slug]/page.tsx
import Link from "next/link";
import { hasLocale } from "../../dictionaries";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { glossary, getTerm } from "@/lib/seo/content/glossary";

function buildOpenLink(lang: "es" | "en", purpose: string, target: string, prompt: string) {
  const qp = new URLSearchParams();
  qp.set("purpose", purpose);
  qp.set("target", target);
  qp.set("prompt", prompt);
  return `/${lang}?${qp.toString()}`;
}

export function generateStaticParams() {
  const LOCALES = ["es", "en"] as const;
  return LOCALES.flatMap((lang) => glossary.map((t) => ({ lang, slug: t.slug })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}): Promise<Metadata> {
  const { lang, slug } = await params;
  const l = lang === "en" ? "en" : "es";

  const term = getTerm(slug);
  if (!term) return {};

  return {
    title: term.title[l],
    description: term.description[l],
    alternates: {
      canonical: `/${l}/glossary/${slug}`,
      languages: {
        es: `/es/glossary/${slug}`,
        en: `/en/glossary/${slug}`,
      },
    },
  };
}

export default async function GlossaryTermPage({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}) {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) notFound();
  const l = (lang === "en" ? "en" : "es") as "es" | "en";

  const term = getTerm(slug);
  if (!term) notFound();

  const href = buildOpenLink(l, term.example.purpose, term.example.target, term.example.prompt[l]);

  const faq = term.faq.map((x) => ({ q: x.q[l], a: x.a[l] }));

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
        <h1 className="font-title text-3xl sm:text-4xl font-semibold">{term.title[l]}</h1>
        <p className="opacity-80 text-sm sm:text-base">{term.description[l]}</p>

        <div className="pt-2 text-xs opacity-70">
          <Link href={`/${l}/glossary`} className="hover:underline underline-offset-2">
            {l === "es" ? "← Volver al glosario" : "← Back to glossary"}
          </Link>
        </div>
      </div>

      {/* Qué significa */}
      <section className="mt-8 surface p-5">
        <div className="text-sm font-medium">{l === "es" ? "Qué significa" : "What it means"}</div>
        <ul className="mt-3 list-disc pl-5 text-sm opacity-90 space-y-1">
          {term.body[l].map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      </section>

      {/* Ejemplo */}
      <section className="mt-10">
        <div className="text-sm font-medium">{l === "es" ? "Ejemplo copy-paste" : "Copy-paste example"}</div>

        <article className="mt-3 surface p-4 space-y-3">
          <pre className="surface-soft p-3 text-xs whitespace-pre-wrap max-h-56 overflow-auto">{term.example.prompt[l]}</pre>

          <div className="flex items-center justify-between gap-3">
            <div className="text-xs opacity-70">
              {l === "es" ? "Se abre en la home con el prompt precargado." : "Opens on home with the prompt prefilled."}
            </div>
            <Link href={href} className="btn btn-primary h-9 px-4">
              {l === "es" ? "Abrir en Promptea" : "Open in Promptea"}
            </Link>
          </div>
        </article>
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

