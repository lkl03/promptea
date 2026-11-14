// components/seo/AnalyzerAbout.tsx
//
// v1.8.6 — the explanation under the tool on /{lang}/analyzer: what the analyzer
// checks (the six scored criteria, from lib/seo/facts.ts), a link to the worked
// examples and a short FAQ. The FAQ text is the same data the page's FAQPage
// JSON-LD is built from (lib/seo/content/analyzerContent.ts).

import Link from "next/link";
import { pick, type Lang } from "@/lib/domain";
import { SCORE_DIMENSIONS } from "@/lib/seo/facts";
import { ANALYZER_PAGE_FAQ } from "@/lib/seo/content/analyzerContent";

export default function AnalyzerAbout({ lang }: { lang: Lang }) {
  return (
    <section aria-labelledby="analyzer-about-title" className="mx-auto mt-14 w-full max-w-3xl space-y-6">
      <div className="space-y-2">
        <h2 id="analyzer-about-title" className="font-title text-xl font-semibold">
          {pick(lang, {
            es: "Qué revisa el analizador de prompts",
            en: "What the prompt analyzer checks",
            pt: "O que o analisador de prompts verifica",
          })}
        </h2>
        <p className="text-sm opacity-80">
          {pick(lang, {
            es: "Cada prompt recibe un puntaje de 0 a 100 en seis criterios, ponderados según el propósito que elijas. Después ves qué corregir primero y una versión optimizada, puntuada de nuevo con las mismas reglas.",
            en: "Every prompt gets a 0–100 score on six criteria, weighted by the purpose you pick. Then you see what to fix first and an optimized version, scored again with the same rules.",
            pt: "Cada prompt recebe uma pontuação de 0 a 100 em seis critérios, ponderados pelo propósito que você escolher. Depois você vê o que corrigir primeiro e uma versão otimizada, pontuada de novo com as mesmas regras.",
          })}
        </p>
      </div>

      <ul className="surface grid gap-3 p-5 text-sm sm:grid-cols-2">
        {SCORE_DIMENSIONS.map((d) => (
          <li key={d.key}>
            <span className="font-medium">{d.label[lang]}.</span> <span className="opacity-80">{d.measures[lang]}</span>
          </li>
        ))}
      </ul>

      <p className="text-sm">
        <Link href={`/${lang}/landing/prompt-analyzer`} className="underline underline-offset-2">
          {pick(lang, {
            es: "Ver ejemplos antes → después con su puntaje",
            en: "See before → after examples with their scores",
            pt: "Ver exemplos antes → depois com a pontuação",
          })}
        </Link>
        {" · "}
        <Link href={`/${lang}/how-it-works`} className="underline underline-offset-2">
          {pick(lang, { es: "Cómo funciona Promptea", en: "How Promptea works", pt: "Como o Promptea funciona" })}
        </Link>
      </p>

      <div className="surface p-5">
        <h2 className="text-sm font-medium">{pick(lang, { es: "Preguntas frecuentes", en: "FAQ", pt: "Perguntas frequentes" })}</h2>
        <div className="mt-3 space-y-2">
          {ANALYZER_PAGE_FAQ.map((x) => (
            <details key={x.q[lang]} className="surface-soft rounded-2xl p-3">
              <summary className="cursor-pointer text-sm font-medium">{x.q[lang]}</summary>
              <div className="mt-2 text-sm opacity-80">{x.a[lang]}</div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
