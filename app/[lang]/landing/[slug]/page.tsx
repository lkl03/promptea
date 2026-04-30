// app/[lang]/landing/[slug]/page.tsx
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { hasLocale } from "../../dictionaries";
import { getLanding, landings } from "@/lib/seo/content/landings";
import { buildPrefillHref } from "@/lib/seo/prefill";

type Params = { lang: string; slug: string };

export async function generateStaticParams() {
  return landings.flatMap((l) =>
    ["es", "en"].map((lang) => ({ lang, slug: l.slug }))
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { lang, slug } = await params;
  const l = lang === "en" ? "en" : "es";
  const page = getLanding(slug);
  if (!page) return {};

  return {
    title: page.title[l],
    description: page.description[l],
    alternates: {
      canonical: `/${l}/landing/${slug}`,
      languages: {
        es: `/es/landing/${slug}`,
        en: `/en/landing/${slug}`,
      },
    },
    openGraph: {
      title: page.title[l],
      description: page.description[l],
      type: "website",
    },
  };
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

  const l = (lang === "en" ? "en" : "es") as "es" | "en";

  const ctaHref = page.prefill
    ? buildPrefillHref({
        lang: l,
        prompt: "",
        purpose: page.prefill.purpose,
        target: page.prefill.target,
      })
    : `/${l}`;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pt-12 pb-16 space-y-8">
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
          <Link href={`/${l}`} className="btn btn-secondary h-10 px-4">
            {l === "es" ? "Ver el analizador" : "Open the analyzer"}
          </Link>
        </div>
      </header>

      <section className="surface p-5 space-y-3">
        <h2 className="text-sm font-medium">
          {l === "es" ? "Qué obtenés" : "What you get"}
        </h2>
        <ul className="space-y-1.5 text-sm opacity-85 list-disc pl-5">
          {page.bullets[l].map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      </section>

      <section className="surface-soft p-4 space-y-2">
        <h2 className="text-sm font-medium">
          {l === "es" ? "Recursos relacionados" : "Related resources"}
        </h2>
        <div className="flex flex-wrap gap-2">
          {page.internalLinks.map((link) => (
            <Link key={link.label[l]} href={link.href(l)} className="btn h-9 px-4 text-xs">
              {link.label[l]}
            </Link>
          ))}
        </div>
      </section>

      <div className="text-center text-xs opacity-70">
        <Link href={`/${l}`} className="hover:underline underline-offset-2">
          {l === "es" ? "← Volver al inicio" : "← Back to home"}
        </Link>
      </div>
    </main>
  );
}
