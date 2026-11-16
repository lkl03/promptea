// app/[lang]/prompts/image/page.tsx
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
    path: `/${l}/prompts/image`,
    title: pick(l, {
      es: "Prompts para imágenes (plantillas)",
      en: "Image prompts (templates)",
      pt: "Prompts para imagens (templates)",
      zh: "图像提示词（模板）",
    }),
    description:
      pick(l, {
        es: "Plantillas para generar imágenes: estilo, composición, iluminación y variantes. Abrilas en Promptea y optimizalas por IA.",
        en: "Templates for image generation: style, composition, lighting and variations. Open in Promptea and optimize per AI.",
        pt: "Templates para geração de imagens: estilo, composição, iluminação e variações. Abra no Promptea e otimize para cada IA.",
        zh: "用于图像生成的模板：风格、构图、光线和变体。在Promptea中打开，并针对每款AI进行优化。",
      }),
  });
}

export default async function ImagePromptPackPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const l = toLang(lang);

  const title = pick(l, { es: "Prompts para imágenes", en: "Image prompts", pt: "Prompts para imagens", zh: "图像提示词" });
  const subtitle =
    pick(l, {
      es: "Describí sujeto, estilo y composición. Elegí un ejemplo y abrilo en Promptea.",
      en: "Describe subject, style, and composition. Pick an example and open it in Promptea.",
      pt: "Descreva o sujeito, o estilo e a composição. Escolha um exemplo e abra no Promptea.",
      zh: "描述主体、风格和构图。选一个示例，在Promptea中打开。",
    });

  const examples = [
    {
      title: pick(l, { es: "Producto (foto tipo e-commerce)", en: "Product (e-commerce style)", pt: "Produto (estilo e-commerce)", zh: "产品图（电商风格）" }),
      target: "gpt",
      purpose: "image",
      prompt:
        pick(l, {
          es: `Generá una imagen de producto:
- producto: [qué es]
- material: [material]
- color: [color]
- fondo: blanco limpio
- iluminación: softbox, sombras suaves
- encuadre: 3/4 view + variante frontal
- estilo: hiperrealista
- relación de aspecto: 1:1

Dame 3 variantes con cambios sutiles.`,
          en: `Generate a product image:
- product: [what]
- material: [material]
- color: [color]
- background: clean white
- lighting: softbox, soft shadows
- framing: 3/4 view + front variant
- style: hyper-realistic
- aspect ratio: 1:1

Give 3 variants with subtle changes.`,
          pt: `Gere uma imagem de produto:
- produto: [o quê]
- material: [material]
- cor: [cor]
- fundo: branco limpo
- iluminação: softbox, sombras suaves
- enquadramento: vista 3/4 + variante frontal
- estilo: hiper-realista
- proporção: 1:1

Entregue 3 variantes com mudanças sutis.`,
          zh: `生成一张产品图：
- 产品：[是什么]
- 材质：[材质]
- 颜色：[颜色]
- 背景：干净的纯白色
- 光线：柔光箱，柔和阴影
- 构图：3/4视角 + 正面变体
- 风格：超写实
- 宽高比：1:1

给出3个只有细微差别的变体。`,
        }),
    },
    {
      title: pick(l, {
        es: "Ilustración estilo editorial",
        en: "Editorial illustration style",
        pt: "Estilo de ilustração editorial",
        zh: "编辑插画风格",
      }),
      target: "claude",
      purpose: "image",
      prompt:
        pick(l, {
          es: `Ilustración editorial:
- tema: [tema]
- estilo: tinta + acuarela suave
- paleta: [colores]
- composición: sujeto a la izquierda, espacio negativo a la derecha
- mood: [mood]
- textura: papel
- relación de aspecto: 4:5

Incluí 2 variantes de composición.`,
          en: `Editorial illustration:
- topic: [topic]
- style: ink + soft watercolor
- palette: [colors]
- composition: subject left, negative space right
- mood: [mood]
- texture: paper grain
- aspect ratio: 4:5

Include 2 composition variants.`,
          pt: `Ilustração editorial:
- tema: [tema]
- estilo: nanquim + aquarela suave
- paleta: [cores]
- composição: sujeito à esquerda, espaço negativo à direita
- clima: [clima]
- textura: grão de papel
- proporção: 4:5

Inclua 2 variantes de composição.`,
          zh: `编辑插画：
- 主题：[主题]
- 风格：墨线 + 柔和水彩
- 配色：[颜色]
- 构图：主体在左，右侧留白
- 氛围：[氛围]
- 质感：纸张纹理
- 宽高比：4:5

包含2种构图变体。`,
        }),
    },
    {
      title: pick(l, { es: "Personaje (turnaround)", en: "Character (turnaround)", pt: "Personagem (turnaround)", zh: "角色设计（三视图）" }),
      target: "gpt",
      purpose: "image",
      prompt:
        pick(l, {
          es: `Diseñá un personaje:
- descripción: [edad, rasgos, ropa]
- estilo: animación moderna (limpio)
- 3 poses: frontal, perfil, espalda
- expresión: 3 emociones
- fondo: gris neutro
- relación de aspecto: 16:9

Evitá texto en la imagen.`,
          en: `Design a character:
- description: [age, traits, outfit]
- style: modern animation (clean)
- 3 poses: front, side, back
- expression: 3 emotions
- background: neutral gray
- aspect ratio: 16:9

Avoid text in the image.`,
          pt: `Crie um personagem:
- descrição: [idade, traços, roupa]
- estilo: animação moderna (limpa)
- 3 poses: frente, perfil, costas
- expressão: 3 emoções
- fundo: cinza neutro
- proporção: 16:9

Evite texto na imagem.`,
          zh: `设计一个角色：
- 描述：[年龄、特征、服装]
- 风格：现代动画（简洁）
- 3个姿势：正面、侧面、背面
- 表情：3种情绪
- 背景：中性灰
- 宽高比：16:9

图中不要出现文字。`,
        }),
    },
    {
      title: pick(l, {
        es: "Thumbnail estilo YouTube (sin texto)",
        en: "YouTube-style thumbnail (no text)",
        pt: "Thumbnail estilo YouTube (sem texto)",
        zh: "YouTube风格缩略图（无文字）",
      }),
      target: "gemini",
      purpose: "image",
      prompt:
        pick(l, {
          es: `Necesito una thumbnail:
- tema: [tema]
- estilo: alto contraste, nítido
- sujeto: [quién/qué]
- fondo: simple, con profundidad
- lighting: rim light
- relación de aspecto: 16:9
- NO texto (lo agrego después)

Dame 4 variantes con diferentes composiciones.`,
          en: `I need a thumbnail:
- topic: [topic]
- style: high contrast, sharp
- subject: [who/what]
- background: simple with depth
- lighting: rim light
- aspect ratio: 16:9
- NO text (I’ll add later)

Give 4 variants with different compositions.`,
          pt: `Preciso de uma thumbnail:
- tema: [tema]
- estilo: alto contraste, nítido
- sujeito: [quem/o quê]
- fundo: simples, com profundidade
- iluminação: luz de recorte
- proporção: 16:9
- SEM texto (eu adiciono depois)

Entregue 4 variantes com composições diferentes.`,
          zh: `我需要一张缩略图：
- 主题：[主题]
- 风格：高对比度，清晰锐利
- 主体：[谁/什么]
- 背景：简洁且有纵深感
- 光线：轮廓光
- 宽高比：16:9
- 不要文字（我之后自己加）

给出4个构图不同的变体。`,
        }),
    },
    {
      title: pick(l, { es: "Paisaje cinematográfico", en: "Cinematic landscape", pt: "Paisagem cinematográfica", zh: "电影感风景" }),
      target: "grok",
      purpose: "image",
      prompt:
        pick(l, {
          es: `Paisaje cinematográfico:
- lugar: [descripción]
- hora: golden hour
- atmósfera: niebla ligera
- lente: 35mm, profundidad de campo suave
- detalle: elementos en primer plano
- estilo: cine, color grading teal/orange sutil
- relación de aspecto: 21:9`,
          en: `Cinematic landscape:
- place: [description]
- time: golden hour
- atmosphere: light fog
- lens: 35mm, soft depth of field
- detail: foreground elements
- style: cinema, subtle teal/orange grading
- aspect ratio: 21:9`,
          pt: `Paisagem cinematográfica:
- lugar: [descrição]
- horário: golden hour
- atmosfera: neblina leve
- lente: 35mm, profundidade de campo suave
- detalhe: elementos em primeiro plano
- estilo: cinema, color grading teal/orange sutil
- proporção: 21:9`,
          zh: `电影感风景：
- 地点：[描述]
- 时间：黄金时刻
- 氛围：薄雾
- 镜头：35mm，柔和的景深
- 细节：前景元素
- 风格：电影感，轻微的青橙色调色
- 宽高比：21:9`,
        }),
    },
    {
      title: pick(l, {
        es: "Icon set / UI illustration",
        en: "Icon set / UI illustration",
        pt: "Conjunto de ícones / ilustração de UI",
        zh: "图标集 / UI插画",
      }),
      target: "deepseek",
      purpose: "image",
      prompt:
        pick(l, {
          es: `Diseñá un set de íconos:
- tema: [tema]
- estilo: outline limpio, 2px
- consistencia: mismo grid y radio
- fondo: transparente
- relación de aspecto: 1:1 por ícono

Dame 12 íconos distintos (describilos).`,
          en: `Design an icon set:
- theme: [theme]
- style: clean outline, 2px
- consistency: same grid and radius
- background: transparent
- aspect ratio: 1:1 per icon

Provide 12 different icons (describe them).`,
          pt: `Crie um conjunto de ícones:
- tema: [tema]
- estilo: contorno limpo, 2px
- consistência: mesma grade e mesmo raio
- fundo: transparente
- proporção: 1:1 por ícone

Entregue 12 ícones diferentes (descreva cada um).`,
          zh: `设计一套图标：
- 主题：[主题]
- 风格：简洁线性，2px
- 一致性：相同的网格和圆角
- 背景：透明
- 宽高比：每个图标1:1

提供12个不同的图标（逐一描述）。`,
        }),
    },
  ];

  const faq = [
    {
      q: pick(l, {
        es: "¿Cómo hago que el resultado sea consistente?",
        en: "How do I make results consistent?",
        pt: "Como deixo os resultados consistentes?",
        zh: "如何让结果保持一致？",
      }),
      a:
        pick(l, {
          es: "Definí estilo, iluminación, encuadre y relación de aspecto. Pedí variantes con cambios controlados.",
          en: "Specify style, lighting, framing, and aspect ratio. Ask for variants with controlled changes.",
          pt: "Especifique estilo, iluminação, enquadramento e proporção. Peça variantes com mudanças controladas.",
          zh: "明确风格、光线、构图和宽高比，并要求生成变化可控的变体。",
        }),
    },
    {
      q: pick(l, { es: "¿Qué debería incluir sí o sí?", en: "What should I always include?", pt: "O que devo sempre incluir?", zh: "哪些内容一定要写？" }),
      a:
        pick(l, {
          es: "Sujeto, estilo, composición, fondo, luz y aspecto (1:1, 16:9, 4:5).",
          en: "Subject, style, composition, background, lighting, and aspect ratio (1:1, 16:9, 4:5).",
          pt: "Sujeito, estilo, composição, fundo, iluminação e proporção (1:1, 16:9, 4:5).",
          zh: "主体、风格、构图、背景、光线和宽高比（1:1、16:9、4:5）。",
        }),
    },
    {
      q: pick(l, {
        es: "¿Puedo pedir múltiples variantes?",
        en: "Can I request multiple variants?",
        pt: "Posso pedir várias variantes?",
        zh: "可以要求多个变体吗？",
      }),
      a:
        pick(l, {
          es: "Sí. Es lo mejor para iterar: pedí 3–4 variantes con cambios explícitos (pose, paleta, encuadre).",
          en: "Yes. It’s best for iteration: request 3–4 variants with explicit changes (pose, palette, framing).",
          pt: "Sim. É o ideal para iterar: peça 3 ou 4 variantes com mudanças explícitas (pose, paleta, enquadramento).",
          zh: "可以，这是最好的迭代方式：要求3–4个变体，并写明每个变体的改动（姿势、配色、构图）。",
        }),
    },
    {
      q: pick(l, {
        es: "¿Esto agrega texto a la imagen?",
        en: "Will this add text in the image?",
        pt: "Isso vai colocar texto na imagem?",
        zh: "图里会出现文字吗？",
      }),
      a:
        pick(l, {
          es: "Si no querés texto, pedilo explícitamente (“evitá texto en la imagen”).",
          en: "If you don’t want text, ask explicitly (“avoid text in the image”).",
          pt: "Se você não quer texto, peça de forma explícita (“evite texto na imagem”).",
          zh: "如果不想要文字，请明确说明（“图中不要出现文字”）。",
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
