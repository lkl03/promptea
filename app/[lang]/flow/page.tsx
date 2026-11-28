// app/[lang]/flow/page.tsx
//
// v1.8.9 — Mode 3, Prompt flow: a main task on top, split into a tree of
// steps (sub-prompts), each routed to its best AI. Route-addressable like the
// other two modes, in every language. The interactive part is FlowBox; the
// explainer and the FAQ below are server-rendered (and the FAQ is the page's
// FAQPage structured data, so it is visible text, word for word).

import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import JsonLd from "@/components/seo/JsonLd";
import ModeSwitcher from "@/components/ModeSwitcher";
import FlowBox from "@/components/flow/FlowBox";
import { registryPageGraph } from "@/lib/seo/pageGraphs";
import { pageMetadata } from "@/lib/seo/metadata";
import { pick, toLang, type Lang } from "@/lib/domain";
import { flowFaq } from "@/lib/seo/content/flowContent";
import { markdownPathOf } from "@/lib/seo/registry";
import { getDictionary, hasLocale } from "../dictionaries";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang: rawLang } = await params;
  const lang = toLang(rawLang);
  const title = pick(lang, {
    es: "Flujo de prompts: dividí una tarea en pasos encadenados",
    en: "Prompt flow: split a task into chained prompts",
    pt: "Fluxo de prompts: divida uma tarefa em prompts encadeados",
    zh: "提示词流程：把任务拆成串联的提示词",
  });
  const description = pick(lang, {
    es: "Escribí una tarea grande y Promptea la divide en una cadena de prompts listos para pegar, con pasos en paralelo y la mejor IA para cada uno (ChatGPT, Claude, Gemini, DeepSeek…). Gratis, sin cuenta.",
    en: "Write a big task and Promptea splits it into a chain of ready-to-paste prompts, with parallel steps and the best AI for each one (ChatGPT, Claude, Gemini, DeepSeek…). Free, no account.",
    pt: "Escreva uma tarefa grande e o Promptea a divide em uma cadeia de prompts prontos para colar, com etapas em paralelo e a melhor IA para cada uma (ChatGPT, Claude, Gemini, DeepSeek…). Grátis, sem conta.",
    zh: "写下一项大任务，Promptea会把它拆成一串可直接粘贴的提示词，包含可并行的步骤，并为每一步推荐最合适的AI（ChatGPT、Claude、Gemini、DeepSeek等）。免费，无需注册。",
  });
  return pageMetadata({ lang, path: `/${lang}/flow`, title, description, markdownPath: markdownPathOf(`/${lang}/flow`) });
}

export default async function FlowPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const l = lang as Lang;
  const dict = await getDictionary(l);
  const t = dict.flow;
  const faq = flowFaq(l);

  return (
    <main className="px-4 pb-12 pt-8 sm:pt-10">
      <JsonLd data={registryPageGraph(l, `/${l}/flow`, { aboutSoftware: true, faq })} />
      <div className="mx-auto w-full max-w-6xl">
        <header className="text-center">
          <h1 className="font-title text-3xl font-semibold tracking-tight sm:text-4xl">{t.title}</h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm opacity-80 sm:text-base">{t.subtitle}</p>
        </header>

        <div className="mt-6">
          <ModeSwitcher lang={l} active="flow" dict={dict.mode} />
        </div>

        <div className="mt-8">
          <FlowBox dict={dict} lang={l} />
        </div>

        <section aria-labelledby="flow-how" className="mx-auto mt-14 max-w-3xl">
          <h2 id="flow-how" className="font-title text-xl font-semibold">
            {t.howTitle}
          </h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-ink-muted">
            {t.how.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
          <p className="mt-4 text-sm">
            <Link href={`/${l}/guides/prompt-chaining`} className="font-medium text-accent-ink underline-offset-4 hover:underline">
              {t.guideLink}
            </Link>
          </p>
        </section>

        <section aria-labelledby="flow-faq" className="mx-auto mt-10 max-w-3xl">
          <h2 id="flow-faq" className="font-title text-xl font-semibold">
            {pick(l, { es: "Preguntas frecuentes", en: "Frequently asked questions", pt: "Perguntas frequentes", zh: "常见问题" })}
          </h2>
          <div className="mt-3 space-y-3">
            {faq.map((item) => (
              <div key={item.q} className="surface-soft p-4">
                <h3 className="text-sm font-semibold">{item.q}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{item.a}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
