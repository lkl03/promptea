// app/[lang]/prompts/text/page.tsx
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
    path: `/${l}/prompts/text`,
    title: pick(l, { es: "Prompts de texto (plantillas)", en: "Text prompts (templates)", pt: "Prompts de texto (templates)", zh: "文本提示词（模板）" }),
    description:
      pick(l, {
        es: "Plantillas para escribir, reescribir y resumir: emails, posts, tono, ideas y estructuras. Abrilas en Promptea y optimizalas por IA.",
        en: "Templates to write, rewrite and summarize: emails, posts, tone, ideas and structures. Open in Promptea and optimize with AI.",
        pt: "Templates para escrever, reescrever e resumir: e-mails, posts, tom, ideias e estruturas. Abra no Promptea e otimize com IA.",
        zh: "用于写作、改写和总结的模板：邮件、帖子、语气、创意和结构。在Promptea中打开，并借助AI进行优化。",
      }),
  });
}

export default async function TextPromptPackPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const l = toLang(lang);

  const title = pick(l, { es: "Prompts de texto", en: "Text prompts", pt: "Prompts de texto", zh: "文本提示词" });
  const subtitle =
    pick(l, {
      es: "Plantillas listas para copiar. Elegí un ejemplo y abrilo en Promptea.",
      en: "Copy-ready templates. Pick one and open it in Promptea.",
      pt: "Templates prontos para copiar. Escolha um e abra no Promptea.",
      zh: "可直接复制的模板。选一个，在Promptea中打开。",
    });

  const examples = [
    {
      title: pick(l, {
        es: "Reescritura con tono + constraints",
        en: "Rewrite with tone + constraints",
        pt: "Reescrever com tom + restrições",
        zh: "按指定语气和约束改写",
      }),
      target: "gpt",
      purpose: "text",
      prompt:
        pick(l, {
          es: `Texto original:
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
3) 2 variantes (más corta / más intensa)`,
          en: `Original text:
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
          pt: `Texto original:
[cole aqui]

Objetivo: reescrever com foco em [clareza/persuasão/empatia].
Tom: [direto/amigável/profissional/sarcástico].
Restrições:
- não invente fatos
- mantenha o sentido
- máximo de [N] palavras
- se faltar contexto, faça até 3 perguntas

Retorne:
1) versão final
2) lista de mudanças (tópicos)
3) 2 variantes (mais curta / mais forte)`,
          zh: `原文：
[粘贴到这里]

目标：改写，使其更[清晰/有说服力/有同理心]。
语气：[直接/友好/专业/讽刺]。
约束：
- 不要编造事实
- 保持原意
- 最多[N]字
- 如果缺少背景信息，最多问3个问题

返回：
1）最终版本
2）修改清单（要点）
3）2个变体（更简短 / 更有力）`,
        }),
    },
    {
      title: pick(l, { es: "Email que consigue respuesta", en: "Email that gets replies", pt: "E-mail que recebe resposta", zh: "能收到回复的邮件" }),
      target: "claude",
      purpose: "text",
      prompt:
        pick(l, {
          es: `Actuá como SDR/AE senior.

Contexto:
- A quién le escribo: [rol/empresa]
- Qué quiero: [reunión/intro/feedback]
- Por qué le importa: [dolor/beneficio]
- Prueba: [caso/número/referencia] (si no hay, pedime datos)

Tarea:
- Escribí 3 asuntos (cortos)
- Escribí 2 versiones del email (80-120 palabras)
- Incluí CTA simple (sí/no)
- Evitá buzzwords y frases vacías`,
          en: `Act as a senior SDR/AE.

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
          pt: `Aja como um SDR/AE sênior.

Contexto:
- Destinatário: [cargo/empresa]
- O que eu quero: [reunião/apresentação/feedback]
- Por que isso importa para a pessoa: [dor/benefício]
- Prova: [caso/número/referência] (se faltar, peça)

Tarefa:
- Escreva 3 assuntos curtos
- Escreva 2 versões do e-mail (80–120 palavras)
- Inclua um CTA simples de sim/não
- Evite jargões e frases vazias`,
          zh: `请扮演一名资深SDR/AE。

背景：
- 收件人：[职位/公司]
- 我的目的：[约会议/请求引荐/征求反馈]
- 对方为什么会在意：[痛点/好处]
- 证明：[案例/数据/推荐人]（如果没有，向我索取）

任务：
- 写3个简短的邮件主题
- 写2个版本的邮件正文（80–120字）
- 加一个简单的是/否型CTA
- 避免流行语和空话`,
        }),
    },
    {
      title: pick(l, {
        es: "Resumen ejecutivo (para decidir)",
        en: "Executive summary (decision-ready)",
        pt: "Resumo executivo (pronto para decidir)",
        zh: "执行摘要（可直接用于决策）",
      }),
      target: "gemini",
      purpose: "text",
      prompt:
        pick(l, {
          es: `Documento:
[pegá acá]

Hacé un resumen ejecutivo para alguien sin tiempo:
- 7 bullets “lo esencial”
- riesgos (3) y mitigaciones (3)
- decisiones a tomar (máx 3) + recomendación
- preguntas abiertas (si faltan datos)

No repitas texto literal salvo que sea necesario.`,
          en: `Document:
[paste here]

Create an executive summary for someone with no time:
- 7 “essentials” bullets
- risks (3) + mitigations (3)
- decisions to make (max 3) + recommendation
- open questions (if data is missing)

Avoid copying verbatim unless necessary.`,
          pt: `Documento:
[cole aqui]

Crie um resumo executivo para quem não tem tempo:
- 7 tópicos com o “essencial”
- riscos (3) + mitigações (3)
- decisões a tomar (máx. 3) + recomendação
- perguntas em aberto (se faltarem dados)

Evite copiar ao pé da letra, a menos que seja necessário.`,
          zh: `文档：
[粘贴到这里]

为没时间细看的人写一份执行摘要：
- 7条“核心要点”
- 风险（3条）+ 缓解措施（3条）
- 需要做出的决策（最多3项）+ 建议
- 待解决的问题（如果缺少数据）

除非必要，不要照搬原文。`,
        }),
    },
    {
      title: pick(l, {
        es: "Ideas de contenido (sin humo)",
        en: "Content ideas (no fluff)",
        pt: "Ideias de conteúdo (sem enrolação)",
        zh: "内容选题（只讲干货）",
      }),
      target: "grok",
      purpose: "text",
      prompt:
        pick(l, {
          es: `Tema: [tema]
Audiencia: [quién]
Objetivo: [seguidores/leads/educar]
Formato: [tweets/threads/shorts/newsletter]
Tono: [directo/divertido/serio]

Generá:
- 20 ideas (títulos) con ángulo específico
- para 5 ideas: outline en 5 bullets
- 10 hooks cortos (1 línea)
Regla: cada idea debe tener “qué aprende” + “por qué importa”.`,
          en: `Topic: [topic]
Audience: [who]
Goal: [followers/leads/educate]
Format: [tweets/threads/shorts/newsletter]
Tone: [direct/funny/serious]

Generate:
- 20 ideas (titles) with a specific angle
- for 5 ideas: 5-bullet outline
- 10 short hooks (one-liners)
Rule: each idea must include “what they learn” + “why it matters”.`,
          pt: `Tema: [tema]
Público: [quem]
Objetivo: [seguidores/leads/educar]
Formato: [posts/threads/shorts/newsletter]
Tom: [direto/divertido/sério]

Gere:
- 20 ideias (títulos) com um ângulo específico
- para 5 ideias: roteiro em 5 tópicos
- 10 ganchos curtos (de uma linha)
Regra: cada ideia deve incluir “o que a pessoa aprende” + “por que isso importa”.`,
          zh: `主题：[主题]
受众：[谁]
目标：[涨粉/获客/科普]
形式：[推文/推文串/短视频/邮件通讯]
语气：[直接/幽默/严肃]

生成：
- 20个有明确切入角度的选题（标题）
- 从中挑5个选题：各写一个5条要点的大纲
- 10个简短的开头钩子（一句话）
规则：每个选题都必须包含“读者能学到什么”+“为什么重要”。`,
        }),
    },
    {
      title: pick(l, { es: "Guion para short (30-45s)", en: "Short script (30–45s)", pt: "Roteiro curto (30–45s)", zh: "短视频脚本（30–45秒）" }),
      target: "deepseek",
      purpose: "text",
      prompt:
        pick(l, {
          es: `Actuá como guionista de shorts.

Tema: [tema]
Objetivo: [retención/click/venta]
Audiencia: [audiencia]
Duración: 30-45s

Entregá:
- Hook (1-2 líneas)
- Cuerpo (3 beats claros)
- Cierre + CTA (1 línea)
- 3 variantes del hook
- Notas de edición (cortes, b-roll sugerido, texto en pantalla)`,
          en: `Act as a short-form scriptwriter.

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
          pt: `Aja como um roteirista de vídeos curtos.

Tema: [tema]
Objetivo: [retenção/clique/vendas]
Público: [público]
Duração: 30–45s

Entregue:
- Gancho (1–2 linhas)
- Corpo (3 momentos claros)
- Fechamento + CTA (1 linha)
- 3 variantes de gancho
- Notas de edição (cortes, b-roll sugerido, texto na tela)`,
          zh: `请扮演一名短视频编剧。

主题：[主题]
目标：[留存/点击/销售]
受众：[受众]
时长：30–45秒

交付：
- 开头钩子（1–2行）
- 主体（3个清晰的节奏点）
- 结尾 + CTA（1行）
- 3个开头钩子的变体
- 剪辑说明（剪切点、建议的B-roll空镜、屏幕文字）`,
        }),
    },
    {
      title: pick(l, {
        es: "Conversión de tono (sin perder intención)",
        en: "Tone conversion (keep intent)",
        pt: "Conversão de tom (mantendo a intenção)",
        zh: "语气转换（保留原意）",
      }),
      target: "gpt",
      purpose: "text",
      prompt:
        pick(l, {
          es: `Texto:
[pegá acá]

Convertí el tono a:
- Variante A: más amable
- Variante B: más directo
- Variante C: más profesional

Reglas:
- no cambies hechos
- mantené la misma intención
- marcá 3 frases donde cambiaste el “tono” y por qué`,
          en: `Text:
[paste here]

Convert the tone to:
- Variant A: friendlier
- Variant B: more direct
- Variant C: more professional

Rules:
- don’t change facts
- keep the same intent
- highlight 3 phrases where you changed “tone” and why`,
          pt: `Texto:
[cole aqui]

Converta o tom para:
- Variante A: mais amigável
- Variante B: mais direta
- Variante C: mais profissional

Regras:
- não altere os fatos
- mantenha a mesma intenção
- destaque 3 frases em que você mudou o “tom” e por quê`,
          zh: `文本：
[粘贴到这里]

把语气转换为：
- 变体A：更友好
- 变体B：更直接
- 变体C：更专业

规则：
- 不要改动事实
- 保持相同的意图
- 标出3处你改变了“语气”的句子，并说明原因`,
        }),
    },
  ];

  const faq = [
    {
      q: pick(l, { es: "¿Cómo uso estas plantillas?", en: "How do I use these templates?", pt: "Como uso estes templates?", zh: "这些模板怎么用？" }),
      a:
        pick(l, {
          es: "Elegí un ejemplo y tocá “Abrir en Promptea”. Te precarga el prompt, el objetivo (Text) y el modelo sugerido.",
          en: "Pick an example and click “Open in Promptea”. It pre-fills the prompt, purpose (Text), and a suggested model.",
          pt: "Escolha um exemplo e clique em “Abrir no Promptea”. O prompt, o propósito (Texto) e um modelo sugerido já vêm preenchidos.",
          zh: "选一个示例，点击“在Promptea中打开”。系统会预先填入提示词、用途（文本）和一个推荐模型。",
        }),
    },
    {
      q: pick(l, {
        es: "¿Por qué importa elegir 'Text'?",
        en: "Why does selecting 'Text' matter?",
        pt: "Por que selecionar 'Texto' faz diferença?",
        zh: "为什么要选择“文本”用途？",
      }),
      a:
        pick(l, {
          es: "Porque Promptea ajusta el análisis para escritura: claridad, tono, estructura, claims y riesgos (inventar datos).",
          en: "Because Promptea tunes the analysis for writing: clarity, tone, structure, claims, and risks (fabricating facts).",
          pt: "Porque o Promptea ajusta a análise para a escrita: clareza, tom, estrutura, afirmações e riscos (inventar fatos).",
          zh: "因为Promptea会针对写作调整分析：清晰度、语气、结构、论断，以及风险（编造事实）。",
        }),
    },
    {
      q: pick(l, { es: "¿Qué prompt conviene pegar?", en: "What should I paste?", pt: "O que devo colar?", zh: "应该粘贴什么？" }),
      a:
        pick(l, {
          es: "Pegá el texto real + objetivo + restricciones. Si querés buena salida, no ocultes el contexto que cambia decisiones.",
          en: "Paste the real text + goal + constraints. If you want good output, don’t hide context that changes decisions.",
          pt: "Cole o texto real + objetivo + restrições. Se você quer uma boa resposta, não esconda o contexto que muda as decisões.",
          zh: "粘贴真实的文本、目标和约束。想要好的输出，就不要隐瞒会影响判断的背景信息。",
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
