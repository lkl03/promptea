// app/[lang]/landing/[slug]/page.tsx
import JsonLd from "@/components/seo/JsonLd";
import { registryPageGraph } from "@/lib/seo/pageGraphs";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { hasLocale } from "../../dictionaries";
import { getLanding, landings } from "@/lib/seo/content/landings";
import { buildPrefillHref } from "@/lib/seo/prefill";
import { pageMetadata } from "@/lib/seo/metadata";
import { markdownPathOf } from "@/lib/seo/registry";
import { CONTENT_UPDATED } from "@/lib/seo/dates";
import { pick, LANGS, toLang } from "@/lib/domain";

type Params = { lang: string; slug: string };

export async function generateStaticParams() {
  return landings.flatMap((l) =>
    LANGS.map((lang) => ({ lang, slug: l.slug }))
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { lang, slug } = await params;
  const l = toLang(lang);
  const page = getLanding(slug);
  if (!page) return {};

  const path = `/${l}/landing/${slug}`;
  return pageMetadata({
    lang: l,
    path,
    title: page.title[l],
    description: page.description[l],
    markdownPath: markdownPathOf(path),
    modifiedTime: CONTENT_UPDATED.landings,
  });
}

export default async function LandingPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) notFound();

  const page = getLanding(slug);
  if (!page) notFound();

  const l = toLang(lang);

  const ctaHref = page.prefill
    ? buildPrefillHref({
        lang: l,
        prompt: "",
        purpose: page.prefill.purpose,
        target: page.prefill.target,
      })
    : `/${l}/analyzer`;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pt-12 pb-16 space-y-8">
      <JsonLd
        data={registryPageGraph(l, `/${l}/landing/${slug}`, {
          aboutSoftware: true,
          faq: page.faq?.map((x) => ({ q: x.q[l], a: x.a[l] })),
        })}
      />
      <header className="space-y-3 text-center">
        <h1 className="font-title text-3xl sm:text-4xl font-semibold tracking-tight">
          {page.h1[l]}
        </h1>
        <div className="space-y-2 text-sm sm:text-base opacity-85 max-w-2xl mx-auto">
          {page.intro[l].map((paragraph, idx) => (
            <p key={idx}>{paragraph}</p>
          ))}
        </div>

        <div className="flex flex-wrap justify-center gap-2 pt-2">
          <Link href={ctaHref} className="btn btn-primary h-10 px-5">
            {page.ctaLabel[l]}
          </Link>
          <Link href={`/${l}/analyzer`} className="btn btn-secondary h-10 px-4">
            {pick(l, { es: "Ver el analizador", en: "Open the analyzer", pt: "Abrir o analisador" })}
          </Link>
        </div>
      </header>

      <section className="surface p-5 space-y-3">
        <h2 className="text-sm font-medium">
          {pick(l, { es: "Qué obtenés", en: "What you get", pt: "O que você recebe" })}
        </h2>
        <ul className="space-y-1.5 text-sm opacity-85 list-disc pl-5">
          {page.bullets[l].map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      </section>

      {page.examples && page.examples.length > 0 ? (
        <section className="space-y-3" aria-labelledby="examples-title">
          <h2 id="examples-title" className="font-title text-xl font-semibold">
            {pick(l, { es: "Ejemplos antes → después", en: "Before → after examples", pt: "Exemplos antes → depois" })}
          </h2>
          <p className="text-sm opacity-80">
            {pick(l, {
              es: "Los puntajes son los que da el analizador a cada prompt, tal cual: probá cualquiera y vas a obtener el mismo número.",
              en: "The scores are exactly what the analyzer returns for each prompt: try any of them and you will get the same number.",
              pt: "As pontuações são exatamente as que o analisador dá a cada prompt: teste qualquer um e você vai obter o mesmo número.",
            })}
          </p>
          {page.examples.map((ex) => {
            const s = ex.score[l];
            const tryLabel = pick(l, { es: "Analizar el prompt de antes", en: "Analyze the before prompt", pt: "Analisar o prompt de antes" });
            return (
              <article key={ex.id} className="surface p-5 space-y-3">
                <h3 id={`example-${ex.id}`} className="text-sm font-medium">{ex.title[l]}</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <div className="text-xs opacity-75">
                      {pick(l, { es: "Antes", en: "Before", pt: "Antes" })} · {pick(l, { es: "puntaje", en: "score", pt: "pontuação" })} {s.before}/100
                    </div>
                    <pre tabIndex={0} role="group" aria-label={`${ex.title[l]} — ${pick(l, { es: "antes", en: "before", pt: "antes" })}`} className="surface-soft p-3 text-xs whitespace-pre-wrap max-h-64 overflow-auto">{ex.before[l]}</pre>
                  </div>
                  <div className="space-y-1.5">
                    <div className="text-xs opacity-75">
                      {pick(l, { es: "Después", en: "After", pt: "Depois" })} · {pick(l, { es: "puntaje", en: "score", pt: "pontuação" })} {s.after}/100
                    </div>
                    <pre tabIndex={0} role="group" aria-label={`${ex.title[l]} — ${pick(l, { es: "después", en: "after", pt: "depois" })}`} className="surface-soft p-3 text-xs whitespace-pre-wrap max-h-64 overflow-auto">{ex.after[l]}</pre>
                  </div>
                </div>
                <p className="text-sm opacity-85">{ex.why[l]}</p>
                <Link
                  href={buildPrefillHref({ lang: l, prompt: ex.before[l], purpose: ex.purpose, target: ex.target })}
                  className="btn btn-ghost h-9 px-4 text-xs"
                  aria-label={`${tryLabel}: ${ex.title[l]}`}
                >
                  {tryLabel}
                </Link>
              </article>
            );
          })}
        </section>
      ) : null}

      {page.faq && page.faq.length > 0 ? (
        <section className="surface p-5">
          <h2 className="text-sm font-medium">{pick(l, { es: "Preguntas frecuentes", en: "FAQ", pt: "Perguntas frequentes" })}</h2>
          <div className="mt-3 space-y-2">
            {page.faq.map((x) => (
              <details key={x.q[l]} className="surface-soft p-3 rounded-2xl">
                <summary className="cursor-pointer text-sm font-medium">{x.q[l]}</summary>
                <div className="mt-2 text-sm opacity-80">{x.a[l]}</div>
              </details>
            ))}
          </div>
        </section>
      ) : null}

      <section className="surface-soft p-4 space-y-2">
        <h2 className="text-sm font-medium">
          {pick(l, { es: "Recursos relacionados", en: "Related resources", pt: "Recursos relacionados" })}
        </h2>
        <div className="flex flex-wrap gap-2">
          {page.internalLinks.map((link) => (
            <Link key={link.label[l]} href={link.href(l)} className="btn btn-ghost h-9 px-4 text-xs">
              {link.label[l]}
            </Link>
          ))}
        </div>
      </section>

      <div className="text-center text-xs opacity-70">
        <Link href={`/${l}`} className="hover:underline underline-offset-2">
          {pick(l, { es: "← Volver al inicio", en: "← Back to home", pt: "← Voltar ao início" })}
        </Link>
      </div>
    </main>
  );
}
