// app/[lang]/prompts/study/page.tsx
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
    path: `/${l}/prompts/study`,
    title: pick(l, {
      es: "Prompts para estudiar (plantillas)",
      en: "Study prompts (templates)",
      pt: "Prompts para estudar (templates)",
      zh: "学习提示词（模板）",
    }),
    description:
      pick(l, {
        es: "Plantillas para estudiar: explicación, ejemplos, ejercicios y planes. Abrilas en Promptea y optimizalas por IA.",
        en: "Study prompt templates: explanations, examples, exercises and plans. Open in Promptea and optimize per AI.",
        pt: "Templates de prompts para estudar: explicações, exemplos, exercícios e planos. Abra no Promptea e otimize para cada IA.",
        zh: "学习类提示词模板：讲解、示例、练习和计划。在Promptea中打开，并针对每款AI进行优化。",
      }),
  });
}

export default async function StudyPromptPackPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const l = toLang(lang);

  const title = pick(l, { es: "Prompts para estudiar", en: "Study prompts", pt: "Prompts para estudar", zh: "学习提示词" });
  const subtitle =
    pick(l, {
      es: "Plantillas listas para copiar. Elegí un ejemplo y abrilo en Promptea.",
      en: "Copy-ready templates. Pick one and open it in Promptea.",
      pt: "Templates prontos para copiar. Escolha um e abra no Promptea.",
      zh: "可直接复制的模板。选一个，在Promptea中打开。",
    });

  const examples = [
    {
      title: pick(l, { es: "Entender un tema desde cero", en: "Learn a topic from scratch", pt: "Aprender um assunto do zero", zh: "从零开始学一个主题" }),
      target: "gpt",
      purpose: "study",
      prompt:
        pick(l, {
          es: `Estoy estudiando: [tema]
Nivel: [secundario/universidad]
Objetivo: entenderlo para poder explicarlo.

Explicá:
1) intuición (idea central)
2) definición formal
3) ejemplo resuelto
4) errores comunes
5) 5 preguntas tipo examen con respuesta breve
Si falta info, haceme hasta 3 preguntas.`,
          en: `I’m studying: [topic]
Level: [high school/university]
Goal: understand it well enough to explain it.

Explain:
1) intuition (core idea)
2) formal definition
3) worked example
4) common mistakes
5) 5 exam-style questions with short answers
If info is missing, ask up to 3 questions.`,
          pt: `Estou estudando: [assunto]
Nível: [ensino médio/faculdade]
Objetivo: entender bem o suficiente para explicar.

Explique:
1) intuição (ideia central)
2) definição formal
3) exemplo resolvido
4) erros comuns
5) 5 questões no estilo de prova, com respostas curtas
Se faltar informação, faça até 3 perguntas.`,
          zh: `我正在学习：[主题]
水平：[高中/大学]
目标：理解到能讲给别人听的程度。

请讲解：
1）直观理解（核心思想）
2）正式定义
3）一道完整的例题
4）常见错误
5）5道考试风格的题目，附简短答案
如果缺少信息，最多问我3个问题。`,
        }),
    },
    {
      title: pick(l, {
        es: "Resumen + mapa mental + flashcards",
        en: "Summary + mind map + flashcards",
        pt: "Resumo + mapa mental + flashcards",
        zh: "摘要 + 思维导图 + 记忆卡片",
      }),
      target: "gemini",
      purpose: "study",
      prompt:
        pick(l, {
          es: `Texto/Apuntes:
[pegá acá]

Hacé:
- resumen en 10 bullets
- mapa mental (lista jerárquica)
- 12 flashcards (Q/A)
Mantené el idioma en español.`,
          en: `Notes/Text:
[paste here]

Do:
- 10-bullet summary
- mind map (hierarchical list)
- 12 flashcards (Q/A)
Keep the output in English.`,
          pt: `Anotações/Texto:
[cole aqui]

Faça:
- resumo em 10 tópicos
- mapa mental (lista hierárquica)
- 12 flashcards (P/R)
Mantenha a saída em português.`,
          zh: `笔记/文本：
[粘贴到这里]

请完成：
- 10条要点的摘要
- 思维导图（层级列表）
- 12张记忆卡片（问/答）
输出请使用中文。`,
        }),
    },
    {
      title: pick(l, {
        es: "Plan de estudio 7 días (con mini-tests)",
        en: "7-day study plan (with mini-quizzes)",
        pt: "Plano de estudos de 7 dias (com miniquizzes)",
        zh: "7天学习计划（含小测验）",
      }),
      target: "claude",
      purpose: "study",
      prompt:
        pick(l, {
          es: `Materia: [materia]
Fecha de examen: [fecha]
Tiempo diario disponible: [minutos]
Dificultades: [temas que cuestan]

Armame un plan de 7 días con:
- objetivos por día
- ejercicios sugeridos
- mini-test diario (5 preguntas)
- repaso espaciado`,
          en: `Subject: [subject]
Exam date: [date]
Daily time available: [minutes]
Difficult topics: [topics]

Create a 7-day plan with:
- daily objectives
- suggested exercises
- daily mini-quiz (5 questions)
- spaced repetition`,
          pt: `Matéria: [matéria]
Data da prova: [data]
Tempo disponível por dia: [minutos]
Tópicos difíceis: [tópicos]

Monte um plano de 7 dias com:
- objetivos diários
- exercícios sugeridos
- miniquiz diário (5 questões)
- repetição espaçada`,
          zh: `科目：[科目]
考试日期：[日期]
每天可用时间：[分钟]
难点：[主题]

请制定一个7天计划，包括：
- 每天的目标
- 建议的练习
- 每日小测验（5道题）
- 间隔重复`,
        }),
    },
    {
      title: pick(l, { es: "Preparación para examen oral", en: "Oral exam prep", pt: "Preparação para prova oral", zh: "口试准备" }),
      target: "grok",
      purpose: "study",
      prompt:
        pick(l, {
          es: `Tema: [tema]
Nivel: [nivel]

Simulá un examen oral:
- haceme 10 preguntas crecientes en dificultad
- esperá mi respuesta (yo respondo)
- corregime y decime qué mejorar (breve y claro)
Empezá con la primera pregunta.`,
          en: `Topic: [topic]
Level: [level]

Simulate an oral exam:
- ask 10 questions increasing in difficulty
- wait for my answer (I will answer)
- correct me and tell me what to improve (brief and clear)
Start with question 1.`,
          pt: `Assunto: [assunto]
Nível: [nível]

Simule uma prova oral:
- faça 10 perguntas com dificuldade crescente
- espere a minha resposta (eu vou responder)
- corrija e diga o que melhorar (de forma breve e clara)
Comece pela pergunta 1.`,
          zh: `主题：[主题]
水平：[水平]

模拟一场口试：
- 问我10个难度递增的问题
- 等我回答（我会作答）
- 纠正我，并告诉我哪里需要改进（简明扼要）
从第1题开始。`,
        }),
    },
    {
      title: pick(l, {
        es: "Ejercicios graduados + solución",
        en: "Graduated exercises + solutions",
        pt: "Exercícios graduados + soluções",
        zh: "分级练习 + 答案",
      }),
      target: "deepseek",
      purpose: "study",
      prompt:
        pick(l, {
          es: `Tema: [tema]
Objetivo: practicar hasta dominar.

Dame:
- 6 ejercicios (de fácil → difícil)
- para cada ejercicio: pista (opcional)
- soluciones completas al final
- checklist de errores comunes`,
          en: `Topic: [topic]
Goal: practice until mastery.

Give me:
- 6 exercises (easy → hard)
- for each: optional hint
- full solutions at the end
- checklist of common mistakes`,
          pt: `Assunto: [assunto]
Objetivo: praticar até dominar.

Quero:
- 6 exercícios (fácil → difícil)
- para cada um: dica opcional
- soluções completas no final
- checklist de erros comuns`,
          zh: `主题：[主题]
目标：反复练习，直到掌握。

请给我：
- 6道练习题（易 → 难）
- 每道题：可选的提示
- 最后附上完整解答
- 常见错误检查清单`,
        }),
    },
    {
      title: pick(l, {
        es: "Aprender idioma (rutina + corrección)",
        en: "Language learning (routine + corrections)",
        pt: "Aprender idiomas (rotina + correções)",
        zh: "语言学习（日常练习 + 纠错）",
      }),
      target: "gpt",
      purpose: "study",
      prompt:
        pick(l, {
          es: `Quiero practicar [idioma] 15 min por día.
Nivel actual: [A2/B1/etc.]
Objetivo: [conversación/examen/vocabulario técnico]

Armá:
- rutina diaria 15 min
- 10 frases útiles del día
- mini-ejercicio (traducción o completar)
- pedime 3 respuestas y corregime`,
          en: `I want to practice [language] 15 minutes per day.
Current level: [A2/B1/etc.]
Goal: [conversation/exam/technical vocabulary]

Build:
- daily 15-min routine
- 10 useful phrases of the day
- mini exercise (translation or fill-in)
- ask me for 3 answers and correct me`,
          pt: `Quero praticar [idioma] 15 minutos por dia.
Nível atual: [A2/B1/etc.]
Objetivo: [conversação/prova/vocabulário técnico]

Monte:
- rotina diária de 15 min
- 10 frases úteis do dia
- miniexercício (tradução ou completar lacunas)
- peça 3 respostas minhas e corrija`,
          zh: `我想每天练习15分钟[语言]。
当前水平：[A2/B1/等]
目标：[会话/考试/专业词汇]

请安排：
- 每天15分钟的练习流程
- 每天10个实用句子
- 小练习（翻译或填空）
- 让我回答3道题，然后纠正我`,
        }),
    },
  ];

  const faq = [
    {
      q: pick(l, { es: "¿Cómo uso estas plantillas?", en: "How do I use these templates?", pt: "Como uso estes templates?", zh: "这些模板怎么用？" }),
      a:
        pick(l, {
          es: "Elegí un ejemplo y tocá “Abrir en Promptea”. Te precarga el prompt, el objetivo (Study) y el modelo sugerido.",
          en: "Pick an example and click “Open in Promptea”. It pre-fills the prompt, purpose (Study), and a suggested model.",
          pt: "Escolha um exemplo e clique em “Abrir no Promptea”. O prompt, o propósito (Estudo) e um modelo sugerido já vêm preenchidos.",
          zh: "选一个示例，点击“在Promptea中打开”。系统会预先填入提示词、用途（学习）和一个推荐模型。",
        }),
    },
    {
      q: pick(l, {
        es: "¿Por qué importa elegir 'Study'?",
        en: "Why does selecting 'Study' matter?",
        pt: "Por que selecionar 'Estudo' faz diferença?",
        zh: "为什么要选择“学习”用途？",
      }),
      a:
        pick(l, {
          es: "Porque Promptea ajusta el análisis y el prompt optimizado para aprendizaje: estructura, ejemplos, ejercicios y preguntas.",
          en: "Because Promptea tunes the analysis and optimized prompt for learning: structure, examples, exercises, and questions.",
          pt: "Porque o Promptea ajusta a análise e o prompt otimizado para o aprendizado: estrutura, exemplos, exercícios e perguntas.",
          zh: "因为Promptea会针对学习场景调整分析和优化后的提示词：结构、示例、练习和问题。",
        }),
    },
    {
      q: pick(l, { es: "¿Puedo cambiar el modelo?", en: "Can I change the model?", pt: "Posso trocar o modelo?", zh: "可以换模型吗？" }),
      a:
        pick(l, {
          es: "Sí. Si tu prioridad es claridad y estructura, probá Claude/GPT. Si querés formatos estrictos, elegí el que te rinda mejor.",
          en: "Yes. If you want clarity and structure, try Claude/GPT. For strict formats, pick the one that works best for you.",
          pt: "Sim. Se você quer clareza e estrutura, experimente Claude/GPT. Para formatos estritos, escolha o que funcionar melhor para você.",
          zh: "可以。想要清晰的结构，试试Claude/GPT；需要严格的格式时，选择最适合你的那个。",
        }),
    },
    {
      q: pick(l, { es: "¿Qué pasa con mis datos?", en: "What happens to my data?", pt: "O que acontece com os meus dados?", zh: "我的数据会被如何处理？" }),
      a:
        pick(l, {
          es: "Promptea evita enviar el texto del prompt en telemetría. El objetivo es medir uso y calidad sin guardar contenido sensible.",
          en: "Promptea avoids sending the prompt text in telemetry. The goal is measuring usage and quality without storing sensitive content.",
          pt: "O Promptea evita enviar o texto do prompt na telemetria. O objetivo é medir uso e qualidade sem guardar conteúdo sensível.",
          zh: "Promptea会避免在遥测中发送提示词文本，目的是在不存储敏感内容的前提下衡量使用情况和质量。",
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
      {/* JSON-LD FAQ */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <div className="mx-auto max-w-3xl text-center space-y-2">
        <h1 className="font-title text-3xl sm:text-4xl font-semibold">{title}</h1>
        <p className="opacity-80 text-sm sm:text-base">{subtitle}</p>

        <div className="pt-2 flex flex-wrap items-center justify-center gap-3 text-xs opacity-70">
          <Link href={`/${l}/prompts`} className="hover:underline underline-offset-2">
            {pick(l, { es: "← Ver todos los packs", en: "← View all packs", pt: "← Ver todos os pacotes", zh: "← 查看全部合集" })}
          </Link>
          <Link href={`/${l}/analyzer`} className="btn btn-primary h-8 px-3 text-xs">
            {pick(l, { es: "Abrir analizador →", en: "Open Analyzer →", pt: "Abrir o analisador →", zh: "打开分析器 →" })}
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
                    zh: "将在分析器中打开，并预先填入该提示词。",
                  })}
                </div>
                <Link href={href} className="btn btn-primary h-9 px-4">
                  {pick(l, { es: "Abrir en Promptea", en: "Open in Promptea", pt: "Abrir no Promptea", zh: "在Promptea中打开" })}
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* FAQ visible */}
      <section className="mt-10 surface p-5">
        <div className="text-sm font-medium">{pick(l, { es: "Preguntas frecuentes", en: "FAQ", pt: "Perguntas frequentes", zh: "常见问题" })}</div>
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

