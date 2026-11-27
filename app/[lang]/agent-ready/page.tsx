// app/[lang]/agent-ready/page.tsx
//
// v1.9.0 — Agent-Ready: how ready a site is for AI agents. The interactive part
// (canvas, live scan, the two-reader view, the findings board, "connect your
// agent") is AgentReadyStage. Everything below it is server-rendered: how it
// works, what the score measures and the FAQ — which is also the page's FAQPage
// structured data, so it is visible text, word for word.

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import AgentReadyStage from "@/components/agentReady/AgentReadyStage";
import JsonLd from "@/components/seo/JsonLd";
import { CHECK_WEIGHTS } from "@/lib/agentReady/weights";
import { CATEGORIES, CHECK_IDS } from "@/lib/agentReady/types";
import { toLang, type Lang } from "@/lib/domain";
import { agentReadyCopy, categoryPoints } from "@/lib/seo/content/agentReadyContent";
import { pageMetadata } from "@/lib/seo/metadata";
import { registryPageGraph } from "@/lib/seo/pageGraphs";
import { CORE_PAGES, markdownPathOf } from "@/lib/seo/registry";
import { hasLocale } from "../dictionaries";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang: rawLang } = await params;
  const lang = toLang(rawLang);
  const entry = CORE_PAGES.find((p) => p.id === "agent-ready")!;
  const path = `/${lang}/agent-ready`;
  return pageMetadata({ lang, path, title: entry.title[lang], description: entry.description[lang], markdownPath: markdownPathOf(path) });
}

export default async function AgentReadyPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const l = lang as Lang;
  const t = agentReadyCopy(l);

  return (
    <main className="px-4 pb-12 pt-8 sm:pt-10">
      <JsonLd data={registryPageGraph(l, `/${l}/agent-ready`, { aboutSoftware: true, faq: t.faq })} />
      <div className="mx-auto w-full max-w-6xl">
        <header className="text-center">
          <h1 className="font-title text-3xl font-semibold tracking-tight sm:text-4xl">{t.title}</h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm opacity-80 sm:text-base">{t.subtitle}</p>
        </header>

        <div className="mt-8">
          <AgentReadyStage dict={t} lang={l} />
        </div>

        <section aria-labelledby="ar-how" className="mx-auto mt-14 max-w-3xl">
          <h2 id="ar-how" className="font-title text-xl font-semibold">
            {t.howTitle}
          </h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-ink-muted">
            {t.how.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="ar-weights" className="mx-auto mt-10 max-w-3xl">
          <h2 id="ar-weights" className="font-title text-xl font-semibold">
            {t.weightsTitle}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">{t.weightsBody}</p>
          <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {CATEGORIES.map((category) => (
              <div key={category} className="surface-soft p-4">
                <dt className="flex items-baseline justify-between gap-2 text-sm font-semibold">
                  <span>{t.categories[category]}</span>
                  <span className="badge badge-accent">{t.weightsUnit.replace("{n}", String(categoryPoints(category)))}</span>
                </dt>
                <dd className="mt-2">
                  <ul className="m-0 list-none space-y-1 p-0 text-sm text-ink-muted">
                    {CHECK_IDS.filter((id) => id.startsWith(`${category}.`)).map((id) => (
                      <li key={id} className="flex justify-between gap-3">
                        <span className="min-w-0">{t.checks[id].title}</span>
                        <span className="shrink-0 tabular-nums text-ink-faint">{CHECK_WEIGHTS[id]}</span>
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="ar-faq" className="mx-auto mt-10 max-w-3xl">
          <h2 id="ar-faq" className="font-title text-xl font-semibold">
            {t.faqTitle}
          </h2>
          <div className="mt-3 space-y-3">
            {t.faq.map((item) => (
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
