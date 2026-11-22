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
import { getDictionary, hasLocale } from "../dictionaries";

function faqFor(lang: Lang): Array<{ q: string; a: string }> {
  return [
    {
      q: pick(lang, {
        es: "¿Qué es un flujo de prompts?",
        en: "What is a prompt flow?",
        pt: "O que é um fluxo de prompts?",
        zh: "什么是提示词流程？",
      }),
      a: pick(lang, {
        es: "Es una tarea grande dividida en una cadena de prompts más chicos: cada paso hace una sola cosa y le pasa su resultado al siguiente. Los pasos que no dependen entre sí se pueden hacer en paralelo.",
        en: "It is a big task split into a chain of smaller prompts: each step does one thing and hands its result to the next. Steps that don't depend on each other can run in parallel.",
        pt: "É uma tarefa grande dividida em uma cadeia de prompts menores: cada etapa faz uma só coisa e passa o resultado para a próxima. As etapas que não dependem umas das outras podem ser feitas em paralelo.",
        zh: "就是把一项大任务拆成一串较小的提示词：每一步只做一件事，并把结果交给下一步。彼此独立的步骤可以并行进行。",
      }),
    },
    {
      q: pick(lang, {
        es: "¿Por qué conviene dividir una tarea en varios prompts?",
        en: "Why split a task into several prompts?",
        pt: "Por que vale a pena dividir uma tarefa em vários prompts?",
        zh: "为什么要把任务拆成多个提示词？",
      }),
      a: pick(lang, {
        es: "Porque un prompt con un solo objetivo es más fácil de escribir, revisar y corregir. Encadenar pasos reduce los errores en tareas largas y te deja usar una IA distinta para cada parte.",
        en: "Because a prompt with a single goal is easier to write, check and fix. Chaining steps cuts errors on long tasks and lets you use a different AI for each part.",
        pt: "Porque um prompt com um único objetivo é mais fácil de escrever, revisar e corrigir. Encadear etapas reduz os erros em tarefas longas e permite usar uma IA diferente para cada parte.",
        zh: "因为目标单一的提示词更容易编写、检查和修改。把步骤串联起来可以减少长任务中的错误，还能为每个部分选用不同的AI。",
      }),
    },
    {
      q: pick(lang, {
        es: "¿Qué IA usa Promptea para armar el flujo?",
        en: "Which AI does Promptea use to build the flow?",
        pt: "Qual IA o Promptea usa para montar o fluxo?",
        zh: "Promptea用哪个AI来生成流程？",
      }),
      a: pick(lang, {
        es: "Claude, de Anthropic, con un tope de uso mensual. Si la IA no está disponible, el motor propio de Promptea arma un plan básico. La IA sugerida para cada paso la elige el motor de «Elegir la mejor IA».",
        en: "Claude, by Anthropic, within a monthly usage cap. When AI isn't available, Promptea's own engine builds a basic plan. The AI suggested for each step is picked by the \"Find the best AI\" engine.",
        pt: "O Claude, da Anthropic, com um limite de uso mensal. Se a IA não estiver disponível, o motor do próprio Promptea monta um plano básico. A IA sugerida para cada etapa é escolhida pelo motor de \"Encontrar a melhor IA\".",
        zh: "使用Anthropic的Claude，并设有每月使用上限。AI不可用时，由Promptea自己的引擎生成基础方案。每一步推荐的AI由“找到最合适的AI”的引擎挑选。",
      }),
    },
  ];
}

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
  return pageMetadata({ lang, path: `/${lang}/flow`, title, description });
}

export default async function FlowPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const l = lang as Lang;
  const dict = await getDictionary(l);
  const t = dict.flow;
  const faq = faqFor(l);

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
