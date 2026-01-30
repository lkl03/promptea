// app/[lang]/prompts/study/page.tsx
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
    title: l === "es" ? "Prompts para estudiar (plantillas)" : "Study prompts (templates)",
    description:
      l === "es"
        ? "Plantillas para estudiar: explicación, ejemplos, ejercicios y planes. Abrilas en Promptea y optimizalas por IA."
        : "Study prompt templates: explanations, examples, exercises and plans. Open in Promptea and optimize per AI.",
    alternates: {
      canonical: `/${l}/prompts/study`,
      languages: {
        es: "/es/prompts/study",
        en: "/en/prompts/study",
      },
    },
  };
}

export default async function StudyPromptPackPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const l = (lang === "en" ? "en" : "es") as "es" | "en";

  const title = l === "es" ? "Prompts para estudiar" : "Study prompts";
  const subtitle =
    l === "es"
      ? "Plantillas listas para copiar. Elegí un ejemplo y abrilo en Promptea."
      : "Copy-ready templates. Pick one and open it in Promptea.";

  const examples = [
    {
      title: l === "es" ? "Entender un tema desde cero" : "Learn a topic from scratch",
      target: "gpt",
      purpose: "study",
      prompt:
        l === "es"
          ? `Estoy estudiando: [tema]
Nivel: [secundario/universidad]
Objetivo: entenderlo para poder explicarlo.

Explicá:
1) intuición (idea central)
2) definición formal
3) ejemplo resuelto
4) errores comunes
5) 5 preguntas tipo examen con respuesta breve
Si falta info, haceme hasta 3 preguntas.`
          : `I’m studying: [topic]
Level: [high school/university]
Goal: understand it well enough to explain it.

Explain:
1) intuition (core idea)
2) formal definition
3) worked example
4) common mistakes
5) 5 exam-style questions with short answers
If info is missing, ask up to 3 questions.`,
    },
    {
      title: l === "es" ? "Resumen + mapa mental + flashcards" : "Summary + mind map + flashcards",
      target: "gemini",
      purpose: "study",
      prompt:
        l === "es"
          ? `Texto/Apuntes:
[pegá acá]

Hacé:
- resumen en 10 bullets
- mapa mental (lista jerárquica)
- 12 flashcards (Q/A)
Mantené el idioma en español.`
          : `Notes/Text:
[paste here]

Do:
- 10-bullet summary
- mind map (hierarchical list)
- 12 flashcards (Q/A)
Keep the output in English.`,
    },
    {
      title: l === "es" ? "Plan de estudio 7 días (con mini-tests)" : "7-day study plan (with mini-quizzes)",
      target: "claude",
      purpose: "study",
      prompt:
        l === "es"
          ? `Materia: [materia]
Fecha de examen: [fecha]
Tiempo diario disponible: [minutos]
Dificultades: [temas que cuestan]

Armame un plan de 7 días con:
- objetivos por día
- ejercicios sugeridos
- mini-test diario (5 preguntas)
- repaso espaciado`
          : `Subject: [subject]
Exam date: [date]
Daily time available: [minutes]
Difficult topics: [topics]

Create a 7-day plan with:
- daily objectives
- suggested exercises
- daily mini-quiz (5 questions)
- spaced repetition`,
    },
    {
      title: l === "es" ? "Preparación para examen oral" : "Oral exam prep",
      target: "grok",
      purpose: "study",
      prompt:
        l === "es"
          ? `Tema: [tema]
Nivel: [nivel]

Simulá un examen oral:
- haceme 10 preguntas crecientes en dificultad
- esperá mi respuesta (yo respondo)
- corregime y decime qué mejorar (breve y claro)
Empezá con la primera pregunta.`
          : `Topic: [topic]
Level: [level]

Simulate an oral exam:
- ask 10 questions increasing in difficulty
- wait for my answer (I will answer)
- correct me and tell me what to improve (brief and clear)
Start with question 1.`,
    },
    {
      title: l === "es" ? "Ejercicios graduados + solución" : "Graduated exercises + solutions",
      target: "deepseek",
      purpose: "study",
      prompt:
        l === "es"
          ? `Tema: [tema]
Objetivo: practicar hasta dominar.

Dame:
- 6 ejercicios (de fácil → difícil)
- para cada ejercicio: pista (opcional)
- soluciones completas al final
- checklist de errores comunes`
          : `Topic: [topic]
Goal: practice until mastery.

Give me:
- 6 exercises (easy → hard)
- for each: optional hint
- full solutions at the end
- checklist of common mistakes`,
    },
    {
      title: l === "es" ? "Aprender idioma (rutina + corrección)" : "Language learning (routine + corrections)",
      target: "gpt",
      purpose: "study",
      prompt:
        l === "es"
          ? `Quiero practicar [idioma] 15 min por día.
Nivel actual: [A2/B1/etc.]
Objetivo: [conversación/examen/vocabulario técnico]

Armá:
- rutina diaria 15 min
- 10 frases útiles del día
- mini-ejercicio (traducción o completar)
- pedime 3 respuestas y corregime`
          : `I want to practice [language] 15 minutes per day.
Current level: [A2/B1/etc.]
Goal: [conversation/exam/technical vocabulary]

Build:
- daily 15-min routine
- 10 useful phrases of the day
- mini exercise (translation or fill-in)
- ask me for 3 answers and correct me`,
    },
  ];

  const faq = [
    {
      q: l === "es" ? "¿Cómo uso estas plantillas?" : "How do I use these templates?",
      a:
        l === "es"
          ? "Elegí un ejemplo y tocá “Abrir en Promptea”. Te precarga el prompt, el objetivo (Study) y el modelo sugerido."
          : "Pick an example and click “Open in Promptea”. It pre-fills the prompt, purpose (Study), and a suggested model.",
    },
    {
      q: l === "es" ? "¿Por qué importa elegir 'Study'?" : "Why does selecting 'Study' matter?",
      a:
        l === "es"
          ? "Porque Promptea ajusta el análisis y el prompt optimizado para aprendizaje: estructura, ejemplos, ejercicios y preguntas."
          : "Because Promptea tunes the analysis and optimized prompt for learning: structure, examples, exercises, and questions.",
    },
    {
      q: l === "es" ? "¿Puedo cambiar el modelo?" : "Can I change the model?",
      a:
        l === "es"
          ? "Sí. Si tu prioridad es claridad y estructura, probá Claude/GPT. Si querés formatos estrictos, elegí el que te rinda mejor."
          : "Yes. If you want clarity and structure, try Claude/GPT. For strict formats, pick the one that works best for you.",
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

