// app/[lang]/prompts/marketing/page.tsx
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
    title: l === "es" ? "Prompts para marketing (ads + landing + emails)" : "Marketing prompts (ads + landing + emails)",
    description:
      l === "es"
        ? "Plantillas para copy, ads, landings y emails. Abrilas en Promptea y optimizalas por IA."
        : "Templates for copy, ads, landing pages and emails. Open in Promptea and optimize per AI.",
    alternates: {
      canonical: `/${l}/prompts/marketing`,
      languages: {
        es: "/es/prompts/marketing",
        en: "/en/prompts/marketing",
      },
    },
  };
}

export default async function MarketingPromptPackPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const l = (lang === "en" ? "en" : "es") as "es" | "en";

  const title = l === "es" ? "Prompts para marketing" : "Marketing prompts";
  const subtitle =
    l === "es"
      ? "Copy, ads, emails y redes. Elegí uno y abrilo en Promptea."
      : "Copy, ads, emails and social. Pick one and open it in Promptea.";

  const examples = [
    {
      title: l === "es" ? "Landing hero + bullets + CTA" : "Landing hero + bullets + CTA",
      target: "gpt",
      purpose: "marketing",
      prompt:
        l === "es"
          ? `Producto: [qué es]
Audiencia: [para quién]
Dolor: [dolor]
Propuesta de valor: [valor]
Tono: [profesional/cancha/divertido]

Escribí:
- 5 headlines
- 5 subheadlines
- 6 bullets de beneficios (sin promesas falsas)
- 3 CTAs`
          : `Product: [what it is]
Audience: [who it’s for]
Pain: [pain]
Value prop: [value]
Tone: [professional/friendly/playful]

Write:
- 5 headlines
- 5 subheadlines
- 6 benefit bullets (no false promises)
- 3 CTAs`,
    },
    {
      title: l === "es" ? "Google Ads (Search) por intención" : "Google Ads (Search) by intent",
      target: "gemini",
      purpose: "marketing",
      prompt:
        l === "es"
          ? `Producto: [qué es]
País/idioma: [es/en]
Objetivo: leads

Generá:
- 15 keywords long-tail
- 5 grupos por intención
- 3 RSA por grupo (títulos + descripciones)
- negativas sugeridas`
          : `Product: [what it is]
Country/language: [es/en]
Goal: leads

Generate:
- 15 long-tail keywords
- 5 intent-based groups
- 3 RSAs per group (headlines + descriptions)
- suggested negatives`,
    },
    {
      title: l === "es" ? "Email frío (corto y humano)" : "Cold email (short and human)",
      target: "claude",
      purpose: "marketing",
      prompt:
        l === "es"
          ? `A quién: [rol / industria]
Problema: [problema]
Prueba: [evidencia si hay]
Oferta: [demo / free tool]

Escribí:
- 3 asuntos
- email <=120 palabras
- follow-up 48hs después
Sin exagerar ni vender humo.`
          : `To: [role / industry]
Problem: [problem]
Proof: [evidence if any]
Offer: [demo / free tool]

Write:
- 3 subject lines
- email <=120 words
- follow-up after 48h
No hype, no exaggerated claims.`,
    },
    {
      title: l === "es" ? "Posicionamiento (mensaje central)" : "Positioning (core messaging)",
      target: "gpt",
      purpose: "marketing",
      prompt:
        l === "es"
          ? `Producto: [qué es]
Competidores: [lista]
Audiencia: [para quién]

Armá:
- propuesta de posicionamiento (1 frase)
- 3 mensajes clave
- 3 objeciones + respuestas
- 10 claims “seguros” (sin promesas fuertes)`
          : `Product: [what it is]
Competitors: [list]
Audience: [who it’s for]

Create:
- positioning statement (1 sentence)
- 3 key messages
- 3 objections + answers
- 10 safe claims (no big promises)`,
    },
    {
      title: l === "es" ? "Contenido para X (hilo + posts sueltos)" : "X content (thread + single posts)",
      target: "grok",
      purpose: "marketing",
      prompt:
        l === "es"
          ? `Producto: [qué es]
Audiencia: [para quién]
Tono: directo y claro

Generá:
- 1 hilo de 6 tweets (educativo, no venta dura)
- 5 tweets sueltos (hooks distintos)
- CTA suave al final`
          : `Product: [what it is]
Audience: [who it’s for]
Tone: direct and clear

Generate:
- 1 thread of 6 tweets (educational, not hard-sell)
- 5 single tweets (different hooks)
- soft CTA at the end`,
    },
    {
      title: l === "es" ? "A/B test de hooks (10 variantes)" : "A/B hooks (10 variations)",
      target: "deepseek",
      purpose: "marketing",
      prompt:
        l === "es"
          ? `Contexto:
- producto: [qué es]
- promesa (realista): [beneficio]
- audiencia: [para quién]
- canal: [landing / ads / tiktok / X]

Dame 10 hooks distintos:
- 3 curiosidad
- 3 dolor
- 2 comparación
- 2 contrarian
Sin claims falsos.`
          : `Context:
- product: [what it is]
- realistic promise: [benefit]
- audience: [who]
- channel: [landing / ads / tiktok / X]

Give 10 different hooks:
- 3 curiosity
- 3 pain
- 2 comparison
- 2 contrarian
No false claims.`,
    },
  ];

  const faq = [
    {
      q: l === "es" ? "¿Cómo uso estas plantillas?" : "How do I use these templates?",
      a:
        l === "es"
          ? "Elegí un ejemplo y tocá “Abrir en Promptea”. Se precarga el prompt, el objetivo (Marketing) y un modelo sugerido."
          : "Pick an example and click “Open in Promptea”. It pre-fills the prompt, purpose (Marketing), and a suggested model.",
    },
    {
      q: l === "es" ? "¿Qué debería completar sí o sí?" : "What should I fill in for best results?",
      a:
        l === "es"
          ? "Audiencia, propuesta de valor, tono y canal. Si agregás constraints (largo, claims prohibidos), sube la calidad."
          : "Audience, value proposition, tone, and channel. Adding constraints (length, forbidden claims) improves quality.",
    },
    {
      q: l === "es" ? "¿Sirve para ads y redes?" : "Does it work for ads and social?",
      a:
        l === "es"
          ? "Sí. Por eso el pack incluye variantes por canal: landing, Google Ads, email y X."
          : "Yes. That’s why this pack includes channel-specific variants: landing, Google Ads, email and X.",
    },
    {
      q: l === "es" ? "¿Cómo evito 'venta dura'?" : "How do I avoid hard-selling?",
      a:
        l === "es"
          ? "Pedí tono humano, claims seguros y CTA suave. Y pedí 2–3 variantes para iterar rápido."
          : "Ask for a human tone, safe claims and a soft CTA. Request 2–3 variants to iterate faster.",
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

