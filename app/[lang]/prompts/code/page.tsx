// app/[lang]/prompts/code/page.tsx
import Link from "next/link";
import { hasLocale } from "../../dictionaries";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

function buildOpenLink(lang: "es" | "en", purpose: string, target: string, prompt: string) {
  const qp = new URLSearchParams();
  qp.set("purpose", purpose);
  qp.set("target", target);
  qp.set("prompt", prompt);
  return `/${lang}?${qp.toString()}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const l = lang === "en" ? "en" : "es";

  return {
    title: l === "es" ? "Prompts para programar (debug + review)" : "Coding prompts (debug + review)",
    description:
      l === "es"
        ? "Plantillas para debugging, code review, refactors y tests. Abrilas en Promptea y optimizalas por IA."
        : "Templates for debugging, code reviews, refactors and tests. Open in Promptea and optimize per AI.",
    alternates: {
      canonical: `/${l}/prompts/code`,
      languages: {
        es: "/es/prompts/code",
        en: "/en/prompts/code",
      },
    },
  };
}

export default async function CodePromptPackPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const l = (lang === "en" ? "en" : "es") as "es" | "en";

  const title = l === "es" ? "Prompts para código" : "Coding prompts";
  const subtitle =
    l === "es"
      ? "Debugging, review, refactors y tests. Elegí uno y abrilo en Promptea."
      : "Debugging, reviews, refactors and tests. Pick one and open it in Promptea.";

  const examples = [
    {
      title: l === "es" ? "Debugging con pasos reproducibles" : "Debugging with reproducible steps",
      target: "gpt",
      purpose: "code",
      prompt:
        l === "es"
          ? `Estoy teniendo este bug:

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
Si falta algo, preguntame 1–3 cosas antes.`
          : `I’m hitting this bug:

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
    },
    {
      title: l === "es" ? "Code review con criterios" : "Code review with criteria",
      target: "claude",
      purpose: "code",
      prompt:
        l === "es"
          ? `Revisá este código:

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
- checklist de tests`
          : `Review this code:

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
    },
    {
      title: l === "es" ? "Diseño de feature (plan por pasos)" : "Feature design (step plan)",
      target: "gemini",
      purpose: "code",
      prompt:
        l === "es"
          ? `Quiero implementar: [feature]
Restricciones: [tiempo, stack, límites]
Usuarios: [quién lo usa]

Proponé:
- arquitectura simple
- endpoints/módulos
- modelo de datos
- casos borde
- plan por pasos`
          : `I want to implement: [feature]
Constraints: [time, stack, limits]
Users: [who uses it]

Propose:
- simple architecture
- endpoints/modules
- data model
- edge cases
- step plan`,
    },
    {
      title: l === "es" ? "Refactor con objetivos claros" : "Refactor with clear goals",
      target: "deepseek",
      purpose: "code",
      prompt:
        l === "es"
          ? `Refactorizá este código con estos objetivos:
- reducir complejidad
- mejorar nombres
- separar responsabilidades
- mantener comportamiento (no romper API)

Código:
[pegá código]

Devolvé:
- explicación breve
- diff/snippets
- tests sugeridos`
          : `Refactor this code with goals:
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
    },
    {
      title: l === "es" ? "Escribir tests (unit + integration)" : "Write tests (unit + integration)",
      target: "gpt",
      purpose: "code",
      prompt:
        l === "es"
          ? `Necesito tests para este módulo:

Stack: [jest/vitest/etc.]
Código:
[pegá código]

Pedime:
- qué casos cubrir (lista)
- tests unitarios (snippets)
- 1–2 tests de integración
- cómo correrlos`
          : `I need tests for this module:

Stack: [jest/vitest/etc.]
Code:
[paste code]

Provide:
- cases to cover (list)
- unit tests (snippets)
- 1–2 integration tests
- how to run them`,
    },
    {
      title: l === "es" ? "Performance: diagnóstico + optimización" : "Performance: diagnose + optimize",
      target: "grok",
      purpose: "code",
      prompt:
        l === "es"
          ? `Tengo un problema de performance.

Contexto:
- app: [web/api]
- síntoma: [latencia/CPU/memoria]
- métricas: [p95, RPS, etc.]

Código/logs:
[pegá]

Dame:
- hipótesis por impacto
- cómo medir (profiling)
- fixes y tradeoffs`
          : `I have a performance issue.

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
    },
  ];

  const faq = [
    {
      q: l === "es" ? "¿Cómo uso estas plantillas?" : "How do I use these templates?",
      a:
        l === "es"
          ? "Elegí un ejemplo y tocá “Abrir en Promptea”. Se precarga el prompt, el objetivo (Code) y un modelo sugerido."
          : "Pick an example and click “Open in Promptea”. It pre-fills the prompt, purpose (Code), and a suggested model.",
    },
    {
      q: l === "es" ? "¿Qué debería pegar (mínimo)?" : "What should I paste (minimum)?",
      a:
        l === "es"
          ? "Un snippet mínimo, logs relevantes y el comportamiento esperado vs real. Eso sube el score y mejora el output."
          : "A minimal snippet, relevant logs, and expected vs actual behavior. That improves score and output quality.",
    },
    {
      q: l === "es" ? "¿Cómo evito respuestas genéricas?" : "How do I avoid generic answers?",
      a:
        l === "es"
          ? "Pedí formato de salida (pasos, diff, checklist) y agregá restricciones (stack, versiones, límites)."
          : "Request an output format (steps, diff, checklist) and add constraints (stack, versions, limits).",
    },
    {
      q: l === "es" ? "¿Puedo cambiar el modelo?" : "Can I change the model?",
      a:
        l === "es"
          ? "Sí. Si querés estructura fuerte, probá Claude/GPT. Si querés bullets rápidos, Grok puede servir."
          : "Yes. For strong structure, try Claude/GPT. For quick bullets, Grok can work well.",
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

        <div className="pt-2 text-xs opacity-70">
          <Link href={`/${l}/prompts`} className="hover:underline underline-offset-2">
            {l === "es" ? "← Ver todos los packs" : "← View all packs"}
          </Link>
        </div>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {examples.map((ex) => {
          const href = buildOpenLink(l, ex.purpose, ex.target, ex.prompt);
          return (
            <div key={ex.title} className="surface p-4 space-y-3">
              <div className="text-sm font-medium">{ex.title}</div>
              <pre className="surface-soft p-3 text-xs whitespace-pre-wrap max-h-56 overflow-auto">{ex.prompt}</pre>

              <div className="flex items-center justify-between gap-3">
                <div className="text-xs opacity-70">
                  {l === "es" ? "Se abre en la home con el prompt precargado." : "Opens on home with the prompt prefilled."}
                </div>
                <Link href={href} className="btn btn-primary h-9 px-4">
                  {l === "es" ? "Abrir en Promptea" : "Open in Promptea"}
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      <section className="mt-10 surface p-5">
        <div className="text-sm font-medium">{l === "es" ? "Preguntas frecuentes" : "FAQ"}</div>
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

