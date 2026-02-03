// app/[lang]/prompts/text/page.tsx
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
    title: l === "es" ? "Prompts de texto (plantillas)" : "Text prompts (templates)",
    description:
      l === "es"
        ? "Plantillas para escribir, reescribir y resumir: emails, posts, tono, ideas y estructuras. Abrilas en Promptea y optimizalas por IA."
        : "Templates to write, rewrite and summarize: emails, posts, tone, ideas and structures. Open in Promptea and optimize with AI.",
    alternates: {
      canonical: `/${l}/prompts/text`,
      languages: {
        es: "/es/prompts/text",
        en: "/en/prompts/text",
      },
    },
  };
}

export default async function TextPromptPackPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const l = (lang === "en" ? "en" : "es") as "es" | "en";

  const title = l === "es" ? "Prompts de texto" : "Text prompts";
  const subtitle =
    l === "es"
      ? "Plantillas listas para copiar. Elegí un ejemplo y abrilo en Promptea."
      : "Copy-ready templates. Pick one and open it in Promptea.";

  const examples = [
    {
      title: l === "es" ? "Reescritura con tono + constraints" : "Rewrite with tone + constraints",
      target: "gpt",
      purpose: "text",
      prompt:
        l === "es"
          ? `Texto original:
[pegá acá]

Objetivo: reescribir para [claridad/persuasión/empatía].
Tono: [directo/amigable/profesional/sarcástico].
Restricciones:
- no inventes datos
- mantené el significado
- máximo [N] palabras
- si falta contexto, preguntá hasta 3 cosas

Devolvé:
1) versión final
2) lista de cambios (bullets)
3) 2 variantes (más corta / más intensa)`
          : `Original text:
[paste here]

Goal: rewrite for [clarity/persuasion/empathy].
Tone: [direct/friendly/professional/sarcastic].
Constraints:
- do not fabricate facts
- keep the meaning
- max [N] words
- if context is missing, ask up to 3 questions

Return:
1) final version
2) change list (bullets)
3) 2 variants (shorter / stronger)`,
    },
    {
      title: l === "es" ? "Email que consigue respuesta" : "Email that gets replies",
      target: "claude",
      purpose: "text",
      prompt:
        l === "es"
          ? `Actuá como SDR/AE senior.

Contexto:
- A quién le escribo: [rol/empresa]
- Qué quiero: [reunión/intro/feedback]
- Por qué le importa: [dolor/beneficio]
- Prueba: [caso/número/referencia] (si no hay, pedime datos)

Tarea:
- Escribí 3 asuntos (cortos)
- Escribí 2 versiones del email (80-120 palabras)
- Incluí CTA simple (sí/no)
- Evitá buzzwords y frases vacías`
          : `Act as a senior SDR/AE.

Context:
- Recipient: [role/company]
- What I want: [meeting/intro/feedback]
- Why they should care: [pain/benefit]
- Proof: [case/number/reference] (if missing, ask for it)

Task:
- Write 3 short subject lines
- Write 2 email versions (80–120 words)
- Include a simple yes/no CTA
- Avoid buzzwords and empty phrases`,
    },
    {
      title: l === "es" ? "Resumen ejecutivo (para decidir)" : "Executive summary (decision-ready)",
      target: "gemini",
      purpose: "text",
      prompt:
        l === "es"
          ? `Documento:
[pegá acá]

Hacé un resumen ejecutivo para alguien sin tiempo:
- 7 bullets “lo esencial”
- riesgos (3) y mitigaciones (3)
- decisiones a tomar (máx 3) + recomendación
- preguntas abiertas (si faltan datos)

No repitas texto literal salvo que sea necesario.`
          : `Document:
[paste here]

Create an executive summary for someone with no time:
- 7 “essentials” bullets
- risks (3) + mitigations (3)
- decisions to make (max 3) + recommendation
- open questions (if data is missing)

Avoid copying verbatim unless necessary.`,
    },
    {
      title: l === "es" ? "Ideas de contenido (sin humo)" : "Content ideas (no fluff)",
      target: "grok",
      purpose: "text",
      prompt:
        l === "es"
          ? `Tema: [tema]
Audiencia: [quién]
Objetivo: [seguidores/leads/educar]
Formato: [tweets/threads/shorts/newsletter]
Tono: [directo/divertido/serio]

Generá:
- 20 ideas (títulos) con ángulo específico
- para 5 ideas: outline en 5 bullets
- 10 hooks cortos (1 línea)
Regla: cada idea debe tener “qué aprende” + “por qué importa”.`
          : `Topic: [topic]
Audience: [who]
Goal: [followers/leads/educate]
Format: [tweets/threads/shorts/newsletter]
Tone: [direct/funny/serious]

Generate:
- 20 ideas (titles) with a specific angle
- for 5 ideas: 5-bullet outline
- 10 short hooks (one-liners)
Rule: each idea must include “what they learn” + “why it matters”.`,
    },
    {
      title: l === "es" ? "Guion para short (30-45s)" : "Short script (30–45s)",
      target: "deepseek",
      purpose: "text",
      prompt:
        l === "es"
          ? `Actuá como guionista de shorts.

Tema: [tema]
Objetivo: [retención/click/venta]
Audiencia: [audiencia]
Duración: 30-45s

Entregá:
- Hook (1-2 líneas)
- Cuerpo (3 beats claros)
- Cierre + CTA (1 línea)
- 3 variantes del hook
- Notas de edición (cortes, b-roll sugerido, texto en pantalla)`
          : `Act as a short-form scriptwriter.

Topic: [topic]
Goal: [retention/click/sales]
Audience: [audience]
Length: 30–45s

Deliver:
- Hook (1–2 lines)
- Body (3 clear beats)
- Close + CTA (1 line)
- 3 hook variants
- Editing notes (cuts, suggested b-roll, on-screen text)`,
    },
    {
      title: l === "es" ? "Conversión de tono (sin perder intención)" : "Tone conversion (keep intent)",
      target: "gpt",
      purpose: "text",
      prompt:
        l === "es"
          ? `Texto:
[pegá acá]

Convertí el tono a:
- Variante A: más amable
- Variante B: más directo
- Variante C: más profesional

Reglas:
- no cambies hechos
- mantené la misma intención
- marcá 3 frases donde cambiaste el “tono” y por qué`
          : `Text:
[paste here]

Convert the tone to:
- Variant A: friendlier
- Variant B: more direct
- Variant C: more professional

Rules:
- don’t change facts
- keep the same intent
- highlight 3 phrases where you changed “tone” and why`,
    },
  ];

  const faq = [
    {
      q: l === "es" ? "¿Cómo uso estas plantillas?" : "How do I use these templates?",
      a:
        l === "es"
          ? "Elegí un ejemplo y tocá “Abrir en Promptea”. Te precarga el prompt, el objetivo (Text) y el modelo sugerido."
          : "Pick an example and click “Open in Promptea”. It pre-fills the prompt, purpose (Text), and a suggested model.",
    },
    {
      q: l === "es" ? "¿Por qué importa elegir 'Text'?" : "Why does selecting 'Text' matter?",
      a:
        l === "es"
          ? "Porque Promptea ajusta el análisis para escritura: claridad, tono, estructura, claims y riesgos (inventar datos)."
          : "Because Promptea tunes the analysis for writing: clarity, tone, structure, claims, and risks (fabricating facts).",
    },
    {
      q: l === "es" ? "¿Qué prompt conviene pegar?" : "What should I paste?",
      a:
        l === "es"
          ? "Pegá el texto real + objetivo + restricciones. Si querés buena salida, no ocultes el contexto que cambia decisiones."
          : "Paste the real text + goal + constraints. If you want good output, don’t hide context that changes decisions.",
    },
    {
      q: l === "es" ? "¿Qué pasa con mis datos?" : "What happens to my data?",
      a:
        l === "es"
          ? "Promptea evita enviar el texto del prompt en telemetría. El objetivo es medir uso y calidad sin guardar contenido sensible."
          : "Promptea avoids sending the prompt text in telemetry. The goal is measuring usage and quality without storing sensitive content.",
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
      {/* JSON-LD FAQ */}
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

      {/* FAQ visible */}
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
