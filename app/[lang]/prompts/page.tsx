// app/[lang]/prompts/page.tsx
import Link from "next/link";
import { hasLocale } from "../dictionaries";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const l = lang === "en" ? "en" : "es";

  return {
    title: l === "es" ? "Packs de prompts (plantillas)" : "Prompt packs (templates)",
    description:
      l === "es"
        ? "Packs de prompts listos para copiar: Study, Code, Marketing e Image. Abrilos en Promptea y optimizalos por IA."
        : "Copy-ready prompt packs: Study, Code, Marketing and Image. Open in Promptea and optimize per AI.",
    alternates: {
      canonical: `/${l}/prompts`,
      languages: {
        es: "/es/prompts",
        en: "/en/prompts",
      },
    },
  };
}

export default async function PromptsIndexPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const l = (lang === "en" ? "en" : "es") as "es" | "en";

  const title = l === "es" ? "Packs de prompts" : "Prompt packs";
  const subtitle =
    l === "es"
      ? "Plantillas listas para copiar. Elegí un pack y abrí un prompt en Promptea."
      : "Copy-ready templates. Pick a pack and open a prompt in Promptea.";

  const packs = [
    {
      href: `/${l}/prompts/study`,
      name: l === "es" ? "Study (estudio)" : "Study",
      desc:
        l === "es"
          ? "Explicaciones, resúmenes, ejercicios y planes de estudio."
          : "Explanations, summaries, exercises and study plans.",
    },
    {
      href: `/${l}/prompts/code`,
      name: l === "es" ? "Code (programación)" : "Code",
      desc:
        l === "es"
          ? "Debugging, code review, refactors y tests."
          : "Debugging, code reviews, refactors and tests.",
    },
    {
      href: `/${l}/prompts/marketing`,
      name: "Marketing",
      desc:
        l === "es"
          ? "Ads, landings, emails y contenido para redes."
          : "Ads, landing pages, emails and social content.",
    },
    {
      href: `/${l}/prompts/image`,
      name: "Image",
      desc:
        l === "es"
          ? "Prompts para generar imágenes: estilo, composición y variantes."
          : "Image generation prompts: style, composition and variations.",
    },
  ];

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-12 pb-12 3xl:max-w-7xl">
      <div className="mx-auto max-w-3xl text-center space-y-2">
        <h1 className="font-title text-3xl sm:text-4xl font-semibold">{title}</h1>
        <p className="opacity-80 text-sm sm:text-base">{subtitle}</p>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {packs.map((p) => (
          <Link key={p.href} href={p.href} className="surface p-5 block hover:opacity-95 transition">
            <div className="text-sm font-medium">{p.name}</div>
            <div className="mt-1 text-sm opacity-80">{p.desc}</div>
            <div className="mt-4 text-xs opacity-70">
              {l === "es" ? "Ver prompts →" : "View prompts →"}
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-8 text-center text-sm opacity-75">
        <Link href={`/${l}/`} className="hover:underline underline-offset-2">
          {l === "es" ? "Volver al inicio" : "Back to home"}
        </Link>
      </div>
    </main>
  );
}
