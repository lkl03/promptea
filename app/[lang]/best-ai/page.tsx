// app/[lang]/best-ai/page.tsx
//
// Mode 2 — Find the Best AI (v1.3.0). Route-addressable so refresh, deep
// links, back/forward, and locale switches all preserve the mode.

import JsonLd from "@/components/seo/JsonLd";
import { registryPageGraph } from "@/lib/seo/pageGraphs";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictionary, hasLocale } from "../dictionaries";
import ModeSwitcher from "@/components/ModeSwitcher";
import MatcherBox from "@/components/matcher/MatcherBox";
import HowItWorks from "@/components/HowItWorks";
import { pageMetadata } from "@/lib/seo/metadata";
import { pick, toLang, type Lang } from "@/lib/domain";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang: rawLang } = await params;
  const lang = toLang(rawLang);

  const title =
    pick(lang, {
      es: "Elegir la mejor IA para tu prompt",
      en: "Find the Best AI for your prompt",
      pt: "Encontre a melhor IA para o seu prompt",
    });
  const description =
    pick(lang, {
      es: "Pegá tu prompt y descubrí qué IA le queda mejor: ChatGPT, Claude, Claude Code, Gemini, Grok, DeepSeek, Kimi, Qwen, GLM, MiniMax, Doubao o Perplexity — con razones, alternativas y consejos concretos.",
      en: "Paste your prompt and find out which AI fits it best: ChatGPT, Claude, Claude Code, Gemini, Grok, DeepSeek, Kimi, Qwen, GLM, MiniMax, Doubao, or Perplexity — with reasons, alternatives, and concrete advice.",
      pt: "Cole seu prompt e descubra qual IA combina mais com ele: ChatGPT, Claude, Claude Code, Gemini, Grok, DeepSeek, Kimi, Qwen, GLM, MiniMax, Doubao ou Perplexity — com motivos, alternativas e dicas concretas.",
    });

  return pageMetadata({ lang, path: `/${lang}/best-ai`, title, description });
}

export default async function BestAiPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const dict = await getDictionary(lang as Lang);

  return (
    <main className="px-4 pb-10 pt-8 sm:pt-10">
      <JsonLd data={registryPageGraph(lang, `/${lang}/best-ai`, { aboutSoftware: true })} />
      <div className="mx-auto w-full max-w-6xl">
        <header className="text-center">
          <h1 className="font-title text-3xl font-semibold tracking-tight sm:text-4xl">
            {dict.mode.bestAiLabel}
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm opacity-80 sm:text-base">
            {dict.matcher.subtitle}
          </p>
          <div className="mt-3 flex justify-center">
            <HowItWorks lang={lang as Lang} mode="best-ai" />
          </div>
        </header>

        <div className="mt-6">
          <ModeSwitcher lang={lang as Lang} active="best-ai" dict={dict.mode} />
        </div>

        <div className="mt-8">
          <MatcherBox dict={dict} lang={lang as Lang} />
        </div>
      </div>
    </main>
  );
}
