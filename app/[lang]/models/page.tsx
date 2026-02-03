// app/[lang]/models/page.tsx
import Link from "next/link";
import { hasLocale } from "../dictionaries";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { modelPages } from "@/lib/seo/content/models";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const l = lang === "en" ? "en" : "es";

  return {
    title: l === "es" ? "Prompts por modelo (GPT, Claude, Gemini, Grok…)" : "Prompts by model (GPT, Claude, Gemini, Grok…)",
    description:
      l === "es"
        ? "Consejos rápidos y plantillas copy-paste para cada modelo: GPT, Claude, Gemini, Grok, Kimi y DeepSeek."
        : "Quick tips and copy-paste templates per model: GPT, Claude, Gemini, Grok, Kimi, and DeepSeek.",
    alternates: {
      canonical: `/${l}/models`,
      languages: {
        es: "/es/models",
        en: "/en/models",
      },
    },
  };
}

export default async function ModelsIndexPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const l = (lang === "en" ? "en" : "es") as "es" | "en";

  const title = l === "es" ? "Prompts por modelo" : "Prompts by model";
  const subtitle =
    l === "es"
      ? "Páginas para búsquedas tipo “prompt para Claude/Gemini/GPT”. Elegí un modelo y abrí templates listos."
      : "Pages for searches like “prompt for Claude/Gemini/GPT”. Pick a model and open copy-ready templates.";

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-12 pb-12 3xl:max-w-7xl">
      <div className="mx-auto max-w-3xl text-center space-y-2">
        <h1 className="font-title text-3xl sm:text-4xl font-semibold">{title}</h1>
        <p className="opacity-80 text-sm sm:text-base">{subtitle}</p>

        <div className="pt-2 text-xs opacity-70">
          <Link href={`/${l}`} className="hover:underline underline-offset-2">
            {l === "es" ? "← Volver al inicio" : "← Back to home"}
          </Link>
        </div>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {modelPages.map((m) => (
          <Link key={m.slug} href={`/${l}/models/${m.slug}`} className="surface p-4 space-y-2">
            <div className="text-sm font-medium">{m.title[l]}</div>
            <div className="text-sm opacity-80">{m.description[l]}</div>
            <div className="text-xs opacity-70">{l === "es" ? "Abrir →" : "Open →"}</div>
          </Link>
        ))}
      </div>
    </main>
  );
}

