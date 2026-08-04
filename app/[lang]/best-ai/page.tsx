// app/[lang]/best-ai/page.tsx
//
// Mode 2 — Find the Best AI (v1.3.0). Route-addressable so refresh, deep
// links, back/forward, and locale switches all preserve the mode.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictionary, hasLocale } from "../dictionaries";
import ModeSwitcher from "@/components/ModeSwitcher";
import MatcherBox from "@/components/matcher/MatcherBox";
import HowItWorks from "@/components/HowItWorks";

function getSiteUrl(): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env && env.trim().length > 0) return env.startsWith("http") ? env : `https://${env}`;
  const vercel = process.env.VERCEL_URL;
  if (vercel && vercel.trim().length > 0) return `https://${vercel}`;
  return "http://localhost:3000";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang: rawLang } = await params;
  const lang = (rawLang === "en" ? "en" : "es") as "es" | "en";
  const siteUrl = getSiteUrl();
  const canonical = `${siteUrl}/${lang}/best-ai`;

  const title =
    lang === "es" ? "Elegir la mejor IA para tu prompt" : "Find the Best AI for your prompt";
  const description =
    lang === "es"
      ? "Pegá tu prompt y descubrí qué IA le queda mejor: ChatGPT, Claude, Claude Code, Gemini, Grok, DeepSeek, Kimi o Perplexity — con razones, alternativas y consejos concretos."
      : "Paste your prompt and find out which AI fits it best: ChatGPT, Claude, Claude Code, Gemini, Grok, DeepSeek, Kimi, or Perplexity — with reasons, alternatives, and concrete advice.";

  return {
    title,
    description,
    alternates: {
      canonical,
      languages: { es: `${siteUrl}/es/best-ai`, en: `${siteUrl}/en/best-ai` },
    },
    openGraph: { type: "website", url: canonical, siteName: "Promptea", title, description },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function BestAiPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const dict = await getDictionary(lang as "es" | "en");

  return (
    <main className="px-4 pb-10 pt-8 sm:pt-10">
      <div className="mx-auto w-full max-w-6xl">
        <header className="text-center">
          <h1 className="font-title text-4xl font-semibold tracking-tight sm:text-5xl">
            {dict.app.title}
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm opacity-80 sm:text-base">
            {dict.matcher.subtitle}
          </p>
          <div className="mt-3 flex justify-center">
            <HowItWorks lang={lang as "es" | "en"} mode="best-ai" />
          </div>
        </header>

        <div className="mt-6">
          <ModeSwitcher lang={lang as "es" | "en"} active="best-ai" dict={dict.mode} />
        </div>

        <div className="mt-8">
          <MatcherBox dict={dict} lang={lang as "es" | "en"} />
        </div>
      </div>
    </main>
  );
}
