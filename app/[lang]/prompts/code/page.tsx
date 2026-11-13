// app/[lang]/prompts/code/page.tsx
import Link from "next/link";
import { hasLocale } from "../../dictionaries";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo/metadata";
import { pick, toLang, type Lang } from "@/lib/domain";

function buildOpenLink(lang: Lang, purpose: string, target: string, prompt: string) {
  const qp = new URLSearchParams();
  qp.set("purpose", purpose);
  qp.set("target", target);
  qp.set("prompt", prompt);
  return `/${lang}/analyzer?${qp.toString()}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const l = toLang(lang);

  return pageMetadata({
    lang: l,
    path: `/${l}/prompts/code`,
    title: pick(l, {
      es: "Prompts para programar (debug + review)",
      en: "Coding prompts (debug + review)",
      pt: "Prompts para programar (debug + review)",
    }),
    description:
      pick(l, {
        es: "Plantillas para debugging, code review, refactors y tests. Abrilas en Promptea y optimizalas por IA.",
        en: "Templates for debugging, code reviews, refactors and tests. Open in Promptea and optimize per AI.",
        pt: "Templates para depuração, code review, refatorações e testes. Abra no Promptea e otimize para cada IA.",
      }),
  });
}

export default async function CodePromptPackPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const l = toLang(lang);

  const title = pick(l, { es: "Prompts para código", en: "Coding prompts", pt: "Prompts para código" });
  const subtitle =
    pick(l, {
      es: "Debugging, review, refactors y tests. Elegí uno y abrilo en Promptea.",
      en: "Debugging, reviews, refactors and tests. Pick one and open it in Promptea.",
      pt: "Depuração, review, refatorações e testes. Escolha um e abra no Promptea.",
    });

  const examples = [
    {
      title: pick(l, {
        es: "Debugging con pasos reproducibles",
        en: "Debugging with reproducible steps",
        pt: "Depuração com passos reproduzíveis",
      }),
      target: "gpt",
      purpose: "code",
      prompt:
        pick(l, {
          es: `Estoy teniendo este bug:

Contexto:
- Stack: [Next.js / Node / Python / etc.]
- Entorno: [local/prod]
- Qué espero:
- Qué pasa:

Logs:
[pegá logs]

Código mínimo:
[pegá snippet]

Necesito:
1) hipótesis más probable
2) pasos para reproducir
3) fix (con diff/snippet)
4) edge cases
Si falta algo, preguntame 1–3 cosas antes.`,
          en: `I’m hitting this bug:

Context:
- Stack: [Next.js / Node / Python / etc.]
- Environment: [local/prod]
- Expected:
- Actual:

Logs:
[paste logs]

Minimal code:
[paste snippet]

I need:
1) most likely hypothesis
2) repro steps
3) fix (diff/snippet)
4) edge cases
If missing info, ask 1–3 questions first.`,
          pt: `Estou com este bug:

Contexto:
- Stack: [Next.js / Node / Python / etc.]
- Ambiente: [local/produção]
- O que eu esperava:
- O que acontece:

Logs:
[cole os logs]

Código mínimo:
[cole o trecho]

Preciso de:
1) a hipótese mais provável
2) passos para reproduzir
3) correção (com diff/trecho de código)
4) casos de borda
Se faltar informação, faça de 1 a 3 perguntas antes.`,
        }),
    },
    {
      title: pick(l, { es: "Code review con criterios", en: "Code review with criteria", pt: "Code review com critérios" }),
      target: "claude",
      purpose: "code",
      prompt:
        pick(l, {
          es: `Revisá este código:

[pegá código]

Evaluá:
- Correctitud
- Seguridad
- Performance
- Legibilidad
- Tests faltantes

Devolvé:
- issues priorizados
- fixes concretos (snippets)
- checklist de tests`,
          en: `Review this code:

[paste code]

Evaluate:
- Correctness
- Security
- Performance
- Readability
- Missing tests

Return:
- prioritized issues
- concrete fixes (snippets)
- test checklist`,
          pt: `Revise este código:

[cole o código]

Avalie:
- Correção
- Segurança
- Desempenho
- Legibilidade
- Testes que faltam

Retorne:
- problemas priorizados
- correções concretas (trechos de código)
- checklist de testes`,
        }),
    },
    {
      title: pick(l, {
        es: "Diseño de feature (plan por pasos)",
        en: "Feature design (step plan)",
        pt: "Design de funcionalidade (plano em passos)",
      }),
      target: "gemini",
      purpose: "code",
      prompt:
        pick(l, {
          es: `Quiero implementar: [feature]
Restricciones: [tiempo, stack, límites]
Usuarios: [quién lo usa]

Proponé:
- arquitectura simple
- endpoints/módulos
- modelo de datos
- casos borde
- plan por pasos`,
          en: `I want to implement: [feature]
Constraints: [time, stack, limits]
Users: [who uses it]

Propose:
- simple architecture
- endpoints/modules
- data model
- edge cases
- step plan`,
          pt: `Quero implementar: [funcionalidade]
Restrições: [prazo, stack, limites]
Usuários: [quem vai usar]

Proponha:
- arquitetura simples
- endpoints/módulos
- modelo de dados
- casos de borda
- plano em passos`,
        }),
    },
    {
      title: pick(l, {
        es: "Refactor con objetivos claros",
        en: "Refactor with clear goals",
        pt: "Refatoração com objetivos claros",
      }),
      target: "deepseek",
      purpose: "code",
      prompt:
        pick(l, {
          es: `Refactorizá este código con estos objetivos:
- reducir complejidad
- mejorar nombres
- separar responsabilidades
- mantener comportamiento (no romper API)

Código:
[pegá código]

Devolvé:
- explicación breve
- diff/snippets
- tests sugeridos`,
          en: `Refactor this code with goals:
- reduce complexity
- improve naming
- separate responsibilities
- keep behavior (don’t break API)

Code:
[paste code]

Return:
- brief explanation
- diff/snippets
- suggested tests`,
          pt: `Refatore este código com os objetivos:
- reduzir a complexidade
- melhorar os nomes
- separar responsabilidades
- manter o comportamento (sem quebrar a API)

Código:
[cole o código]

Retorne:
- explicação breve
- diff/trechos de código
- testes sugeridos`,
        }),
    },
    {
      title: pick(l, {
        es: "Escribir tests (unit + integration)",
        en: "Write tests (unit + integration)",
        pt: "Escrever testes (unitários + integração)",
      }),
      target: "gpt",
      purpose: "code",
      prompt:
        pick(l, {
          es: `Necesito tests para este módulo:

Stack: [jest/vitest/etc.]
Código:
[pegá código]

Pedime:
- qué casos cubrir (lista)
- tests unitarios (snippets)
- 1–2 tests de integración
- cómo correrlos`,
          en: `I need tests for this module:

Stack: [jest/vitest/etc.]
Code:
[paste code]

Provide:
- cases to cover (list)
- unit tests (snippets)
- 1–2 integration tests
- how to run them`,
          pt: `Preciso de testes para este módulo:

Stack: [jest/vitest/etc.]
Código:
[cole o código]

Entregue:
- casos a cobrir (lista)
- testes unitários (trechos de código)
- 1 ou 2 testes de integração
- como executá-los`,
        }),
    },
    {
      title: pick(l, {
        es: "Performance: diagnóstico + optimización",
        en: "Performance: diagnose + optimize",
        pt: "Desempenho: diagnosticar + otimizar",
      }),
      target: "grok",
      purpose: "code",
      prompt:
        pick(l, {
          es: `Tengo un problema de performance.

Contexto:
- app: [web/api]
- síntoma: [latencia/CPU/memoria]
- métricas: [p95, RPS, etc.]

Código/logs:
[pegá]

Dame:
- hipótesis por impacto
- cómo medir (profiling)
- fixes y tradeoffs`,
          en: `I have a performance issue.

Context:
- app: [web/api]
- symptom: [latency/CPU/memory]
- metrics: [p95, RPS, etc.]

Code/logs:
[paste]

Give me:
- hypotheses by impact
- how to measure (profiling)
- fixes and tradeoffs`,
          pt: `Tenho um problema de desempenho.

Contexto:
- app: [web/api]
- sintoma: [latência/CPU/memória]
- métricas: [p95, RPS, etc.]

Código/logs:
[cole aqui]

Quero:
- hipóteses por impacto
- como medir (profiling)
- correções e trade-offs`,
        }),
    },
  ];

  const faq = [
    {
      q: pick(l, { es: "¿Cómo uso estas plantillas?", en: "How do I use these templates?", pt: "Como uso estes templates?" }),
      a:
        pick(l, {
          es: "Elegí un ejemplo y tocá “Abrir en Promptea”. Se precarga el prompt, el objetivo (Code) y un modelo sugerido.",
          en: "Pick an example and click “Open in Promptea”. It pre-fills the prompt, purpose (Code), and a suggested model.",
          pt: "Escolha um exemplo e clique em “Abrir no Promptea”. O prompt, o propósito (Código) e um modelo sugerido já vêm preenchidos.",
        }),
    },
    {
      q: pick(l, {
        es: "¿Qué debería pegar (mínimo)?",
        en: "What should I paste (minimum)?",
        pt: "O que devo colar (no mínimo)?",
      }),
      a:
        pick(l, {
          es: "Un snippet mínimo, logs relevantes y el comportamiento esperado vs real. Eso sube el score y mejora el output.",
          en: "A minimal snippet, relevant logs, and expected vs actual behavior. That improves score and output quality.",
          pt: "Um trecho mínimo de código, os logs relevantes e o comportamento esperado vs. o real. Isso melhora a pontuação e a qualidade da resposta.",
        }),
    },
    {
      q: pick(l, {
        es: "¿Cómo evito respuestas genéricas?",
        en: "How do I avoid generic answers?",
        pt: "Como evito respostas genéricas?",
      }),
      a:
        pick(l, {
          es: "Pedí formato de salida (pasos, diff, checklist) y agregá restricciones (stack, versiones, límites).",
          en: "Request an output format (steps, diff, checklist) and add constraints (stack, versions, limits).",
          pt: "Peça um formato de saída (passos, diff, checklist) e adicione restrições (stack, versões, limites).",
        }),
    },
    {
      q: pick(l, { es: "¿Puedo cambiar el modelo?", en: "Can I change the model?", pt: "Posso trocar o modelo?" }),
      a:
        pick(l, {
          es: "Sí. Si querés estructura fuerte, probá Claude/GPT. Si querés bullets rápidos, Grok puede servir.",
          en: "Yes. For strong structure, try Claude/GPT. For quick bullets, Grok can work well.",
          pt: "Sim. Para uma estrutura sólida, experimente Claude/GPT. Para tópicos rápidos, o Grok pode funcionar bem.",
        }),
    },
  ];

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((x) => ({
      "@type": "Question",
      name: x.q,
      acceptedAnswer: { "@type": "Answer", text: x.a },
    })),
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-12 pb-12 3xl:max-w-7xl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <div className="mx-auto max-w-3xl text-center space-y-2">
        <h1 className="font-title text-3xl sm:text-4xl font-semibold">{title}</h1>
        <p className="opacity-80 text-sm sm:text-base">{subtitle}</p>

        <div className="pt-2 flex flex-wrap items-center justify-center gap-3 text-xs opacity-70">
          <Link href={`/${l}/prompts`} className="hover:underline underline-offset-2">
            {pick(l, { es: "← Ver todos los packs", en: "← View all packs", pt: "← Ver todos os pacotes" })}
          </Link>
          <Link href={`/${l}/analyzer`} className="btn btn-primary h-8 px-3 text-xs">
            {pick(l, { es: "Abrir analizador →", en: "Open Analyzer →", pt: "Abrir o analisador →" })}
          </Link>
        </div>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {examples.map((ex, idx) => {
          const href = buildOpenLink(l, ex.purpose, ex.target, ex.prompt);
          return (
            <div key={ex.title} className="surface min-w-0 p-4 space-y-3">
              <div id={`example-${idx}-title`} className="text-sm font-medium">{ex.title}</div>
              {/* v1.8.4: scrolls inside; focusable so it can be scrolled from the keyboard (WCAG 2.1.1). */}
              <pre tabIndex={0} role="group" aria-labelledby={`example-${idx}-title`} className="surface-soft p-3 text-xs whitespace-pre-wrap break-words [overflow-wrap:anywhere] max-h-56 overflow-auto">{ex.prompt}</pre>

              <div className="flex items-center justify-between gap-3">
                <div className="text-xs opacity-70">
                  {pick(l, {
                    es: "Se abre en el analizador con el prompt precargado.",
                    en: "Opens the analyzer with the prompt prefilled.",
                    pt: "Abre o analisador com o prompt já preenchido.",
                  })}
                </div>
                <Link href={href} className="btn btn-primary h-9 px-4">
                  {pick(l, { es: "Abrir en Promptea", en: "Open in Promptea", pt: "Abrir no Promptea" })}
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      <section className="mt-10 surface p-5">
        <div className="text-sm font-medium">{pick(l, { es: "Preguntas frecuentes", en: "FAQ", pt: "Perguntas frequentes" })}</div>
        <div className="mt-3 space-y-2">
          {faq.map((x) => (
            <details key={x.q} className="surface-soft p-3 rounded-2xl">
              <summary className="cursor-pointer text-sm font-medium">{x.q}</summary>
              <div className="mt-2 text-sm opacity-80">{x.a}</div>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}

