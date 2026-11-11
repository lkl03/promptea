// app/[lang]/prompts/marketing/page.tsx
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
    path: `/${l}/prompts/marketing`,
    title: pick(l, {
      es: "Prompts para marketing (ads + landing + emails)",
      en: "Marketing prompts (ads + landing + emails)",
      pt: "Prompts de marketing (anúncios + landing + e-mails)",
    }),
    description:
      pick(l, {
        es: "Plantillas para copy, ads, landings y emails. Abrilas en Promptea y optimizalas por IA.",
        en: "Templates for copy, ads, landing pages and emails. Open in Promptea and optimize per AI.",
        pt: "Templates para copy, anúncios, landing pages e e-mails. Abra no Promptea e otimize para cada IA.",
      }),
  });
}

export default async function MarketingPromptPackPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const l = toLang(lang);

  const title = pick(l, { es: "Prompts para marketing", en: "Marketing prompts", pt: "Prompts de marketing" });
  const subtitle =
    pick(l, {
      es: "Copy, ads, emails y redes. Elegí uno y abrilo en Promptea.",
      en: "Copy, ads, emails and social. Pick one and open it in Promptea.",
      pt: "Copy, anúncios, e-mails e redes sociais. Escolha um e abra no Promptea.",
    });

  const examples = [
    {
      title: pick(l, {
        es: "Landing hero + bullets + CTA",
        en: "Landing hero + bullets + CTA",
        pt: "Hero de landing + bullets + CTA",
      }),
      target: "gpt",
      purpose: "marketing",
      prompt:
        pick(l, {
          es: `Producto: [qué es]
Audiencia: [para quién]
Dolor: [dolor]
Propuesta de valor: [valor]
Tono: [profesional/cancha/divertido]

Escribí:
- 5 headlines
- 5 subheadlines
- 6 bullets de beneficios (sin promesas falsas)
- 3 CTAs`,
          en: `Product: [what it is]
Audience: [who it’s for]
Pain: [pain]
Value prop: [value]
Tone: [professional/friendly/playful]

Write:
- 5 headlines
- 5 subheadlines
- 6 benefit bullets (no false promises)
- 3 CTAs`,
          pt: `Produto: [o que é]
Público: [para quem]
Dor: [dor]
Proposta de valor: [valor]
Tom: [profissional/amigável/descontraído]

Escreva:
- 5 títulos
- 5 subtítulos
- 6 bullets de benefícios (sem promessas falsas)
- 3 CTAs`,
        }),
    },
    {
      title: pick(l, {
        es: "Google Ads (Search) por intención",
        en: "Google Ads (Search) by intent",
        pt: "Google Ads (Search) por intenção",
      }),
      target: "gemini",
      purpose: "marketing",
      prompt:
        pick(l, {
          es: `Producto: [qué es]
País/idioma: [es/en]
Objetivo: leads

Generá:
- 15 keywords long-tail
- 5 grupos por intención
- 3 RSA por grupo (títulos + descripciones)
- negativas sugeridas`,
          en: `Product: [what it is]
Country/language: [es/en]
Goal: leads

Generate:
- 15 long-tail keywords
- 5 intent-based groups
- 3 RSAs per group (headlines + descriptions)
- suggested negatives`,
          pt: `Produto: [o que é]
País/idioma: [pt/es/en]
Objetivo: leads

Gere:
- 15 palavras-chave de cauda longa
- 5 grupos por intenção
- 3 RSAs por grupo (títulos + descrições)
- palavras-chave negativas sugeridas`,
        }),
    },
    {
      title: pick(l, { es: "Email frío (corto y humano)", en: "Cold email (short and human)", pt: "Cold e-mail (curto e humano)" }),
      target: "claude",
      purpose: "marketing",
      prompt:
        pick(l, {
          es: `A quién: [rol / industria]
Problema: [problema]
Prueba: [evidencia si hay]
Oferta: [demo / free tool]

Escribí:
- 3 asuntos
- email <=120 palabras
- follow-up 48hs después
Sin exagerar ni vender humo.`,
          en: `To: [role / industry]
Problem: [problem]
Proof: [evidence if any]
Offer: [demo / free tool]

Write:
- 3 subject lines
- email <=120 words
- follow-up after 48h
No hype, no exaggerated claims.`,
          pt: `Para: [cargo / setor]
Problema: [problema]
Prova: [evidência, se houver]
Oferta: [demo / ferramenta grátis]

Escreva:
- 3 assuntos
- e-mail com até 120 palavras
- follow-up depois de 48h
Sem hype, sem afirmações exageradas.`,
        }),
    },
    {
      title: pick(l, {
        es: "Posicionamiento (mensaje central)",
        en: "Positioning (core messaging)",
        pt: "Posicionamento (mensagem central)",
      }),
      target: "gpt",
      purpose: "marketing",
      prompt:
        pick(l, {
          es: `Producto: [qué es]
Competidores: [lista]
Audiencia: [para quién]

Armá:
- propuesta de posicionamiento (1 frase)
- 3 mensajes clave
- 3 objeciones + respuestas
- 10 claims “seguros” (sin promesas fuertes)`,
          en: `Product: [what it is]
Competitors: [list]
Audience: [who it’s for]

Create:
- positioning statement (1 sentence)
- 3 key messages
- 3 objections + answers
- 10 safe claims (no big promises)`,
          pt: `Produto: [o que é]
Concorrentes: [lista]
Público: [para quem]

Crie:
- declaração de posicionamento (1 frase)
- 3 mensagens-chave
- 3 objeções + respostas
- 10 afirmações seguras (sem grandes promessas)`,
        }),
    },
    {
      title: pick(l, {
        es: "Contenido para X (hilo + posts sueltos)",
        en: "X content (thread + single posts)",
        pt: "Conteúdo para o X (thread + posts avulsos)",
      }),
      target: "grok",
      purpose: "marketing",
      prompt:
        pick(l, {
          es: `Producto: [qué es]
Audiencia: [para quién]
Tono: directo y claro

Generá:
- 1 hilo de 6 tweets (educativo, no venta dura)
- 5 tweets sueltos (hooks distintos)
- CTA suave al final`,
          en: `Product: [what it is]
Audience: [who it’s for]
Tone: direct and clear

Generate:
- 1 thread of 6 tweets (educational, not hard-sell)
- 5 single tweets (different hooks)
- soft CTA at the end`,
          pt: `Produto: [o que é]
Público: [para quem]
Tom: direto e claro

Gere:
- 1 thread de 6 posts (educativa, sem venda agressiva)
- 5 posts avulsos (ganchos diferentes)
- CTA suave no final`,
        }),
    },
    {
      title: pick(l, { es: "A/B test de hooks (10 variantes)", en: "A/B hooks (10 variations)", pt: "Ganchos A/B (10 variações)" }),
      target: "deepseek",
      purpose: "marketing",
      prompt:
        pick(l, {
          es: `Contexto:
- producto: [qué es]
- promesa (realista): [beneficio]
- audiencia: [para quién]
- canal: [landing / ads / tiktok / X]

Dame 10 hooks distintos:
- 3 curiosidad
- 3 dolor
- 2 comparación
- 2 contrarian
Sin claims falsos.`,
          en: `Context:
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
          pt: `Contexto:
- produto: [o que é]
- promessa realista: [benefício]
- público: [quem]
- canal: [landing / anúncios / tiktok / X]

Entregue 10 ganchos diferentes:
- 3 de curiosidade
- 3 de dor
- 2 de comparação
- 2 contraintuitivos
Sem afirmações falsas.`,
        }),
    },
  ];

  const faq = [
    {
      q: pick(l, { es: "¿Cómo uso estas plantillas?", en: "How do I use these templates?", pt: "Como uso estes templates?" }),
      a:
        pick(l, {
          es: "Elegí un ejemplo y tocá “Abrir en Promptea”. Se precarga el prompt, el objetivo (Marketing) y un modelo sugerido.",
          en: "Pick an example and click “Open in Promptea”. It pre-fills the prompt, purpose (Marketing), and a suggested model.",
          pt: "Escolha um exemplo e clique em “Abrir no Promptea”. O prompt, o propósito (Marketing) e um modelo sugerido já vêm preenchidos.",
        }),
    },
    {
      q: pick(l, {
        es: "¿Qué debería completar sí o sí?",
        en: "What should I fill in for best results?",
        pt: "O que devo preencher para ter os melhores resultados?",
      }),
      a:
        pick(l, {
          es: "Audiencia, propuesta de valor, tono y canal. Si agregás constraints (largo, claims prohibidos), sube la calidad.",
          en: "Audience, value proposition, tone, and channel. Adding constraints (length, forbidden claims) improves quality.",
          pt: "Público, proposta de valor, tom e canal. Adicionar restrições (tamanho, afirmações proibidas) melhora a qualidade.",
        }),
    },
    {
      q: pick(l, {
        es: "¿Sirve para ads y redes?",
        en: "Does it work for ads and social?",
        pt: "Funciona para anúncios e redes sociais?",
      }),
      a:
        pick(l, {
          es: "Sí. Por eso el pack incluye variantes por canal: landing, Google Ads, email y X.",
          en: "Yes. That’s why this pack includes channel-specific variants: landing, Google Ads, email and X.",
          pt: "Sim. Por isso este pacote inclui variantes por canal: landing, Google Ads, e-mail e X.",
        }),
    },
    {
      q: pick(l, { es: "¿Cómo evito 'venta dura'?", en: "How do I avoid hard-selling?", pt: "Como evito a venda agressiva?" }),
      a:
        pick(l, {
          es: "Pedí tono humano, claims seguros y CTA suave. Y pedí 2–3 variantes para iterar rápido.",
          en: "Ask for a human tone, safe claims and a soft CTA. Request 2–3 variants to iterate faster.",
          pt: "Peça um tom humano, afirmações seguras e um CTA suave. Peça 2 ou 3 variantes para iterar mais rápido.",
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
        {examples.map((ex) => {
          const href = buildOpenLink(l, ex.purpose, ex.target, ex.prompt);
          return (
            <div key={ex.title} className="surface min-w-0 p-4 space-y-3">
              <div className="text-sm font-medium">{ex.title}</div>
              <pre className="surface-soft p-3 text-xs whitespace-pre-wrap break-words [overflow-wrap:anywhere] max-h-56 overflow-auto">{ex.prompt}</pre>

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

