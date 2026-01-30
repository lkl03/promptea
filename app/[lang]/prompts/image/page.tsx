// app/[lang]/prompts/image/page.tsx
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
    title: l === "es" ? "Prompts para imágenes (plantillas)" : "Image prompts (templates)",
    description:
      l === "es"
        ? "Plantillas para generar imágenes: estilo, composición, iluminación y variantes. Abrilas en Promptea y optimizalas por IA."
        : "Templates for image generation: style, composition, lighting and variations. Open in Promptea and optimize per AI.",
    alternates: {
      canonical: `/${l}/prompts/image`,
      languages: {
        es: "/es/prompts/image",
        en: "/en/prompts/image",
      },
    },
  };
}

export default async function ImagePromptPackPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const l = (lang === "en" ? "en" : "es") as "es" | "en";

  const title = l === "es" ? "Prompts para imágenes" : "Image prompts";
  const subtitle =
    l === "es"
      ? "Describí sujeto, estilo y composición. Elegí un ejemplo y abrilo en Promptea."
      : "Describe subject, style, and composition. Pick an example and open it in Promptea.";

  const examples = [
    {
      title: l === "es" ? "Producto (foto tipo e-commerce)" : "Product (e-commerce style)",
      target: "gpt",
      purpose: "image",
      prompt:
        l === "es"
          ? `Generá una imagen de producto:
- producto: [qué es]
- material: [material]
- color: [color]
- fondo: blanco limpio
- iluminación: softbox, sombras suaves
- encuadre: 3/4 view + variante frontal
- estilo: hiperrealista
- relación de aspecto: 1:1

Dame 3 variantes con cambios sutiles.`
          : `Generate a product image:
- product: [what]
- material: [material]
- color: [color]
- background: clean white
- lighting: softbox, soft shadows
- framing: 3/4 view + front variant
- style: hyper-realistic
- aspect ratio: 1:1

Give 3 variants with subtle changes.`,
    },
    {
      title: l === "es" ? "Ilustración estilo editorial" : "Editorial illustration style",
      target: "claude",
      purpose: "image",
      prompt:
        l === "es"
          ? `Ilustración editorial:
- tema: [tema]
- estilo: tinta + acuarela suave
- paleta: [colores]
- composición: sujeto a la izquierda, espacio negativo a la derecha
- mood: [mood]
- textura: papel
- relación de aspecto: 4:5

Incluí 2 variantes de composición.`
          : `Editorial illustration:
- topic: [topic]
- style: ink + soft watercolor
- palette: [colors]
- composition: subject left, negative space right
- mood: [mood]
- texture: paper grain
- aspect ratio: 4:5

Include 2 composition variants.`,
    },
    {
      title: l === "es" ? "Personaje (turnaround)" : "Character (turnaround)",
      target: "gpt",
      purpose: "image",
      prompt:
        l === "es"
          ? `Diseñá un personaje:
- descripción: [edad, rasgos, ropa]
- estilo: animación moderna (limpio)
- 3 poses: frontal, perfil, espalda
- expresión: 3 emociones
- fondo: gris neutro
- relación de aspecto: 16:9

Evitá texto en la imagen.`
          : `Design a character:
- description: [age, traits, outfit]
- style: modern animation (clean)
- 3 poses: front, side, back
- expression: 3 emotions
- background: neutral gray
- aspect ratio: 16:9

Avoid text in the image.`,
    },
    {
      title: l === "es" ? "Thumbnail estilo YouTube (sin texto)" : "YouTube-style thumbnail (no text)",
      target: "gemini",
      purpose: "image",
      prompt:
        l === "es"
          ? `Necesito una thumbnail:
- tema: [tema]
- estilo: alto contraste, nítido
- sujeto: [quién/qué]
- fondo: simple, con profundidad
- lighting: rim light
- relación de aspecto: 16:9
- NO texto (lo agrego después)

Dame 4 variantes con diferentes composiciones.`
          : `I need a thumbnail:
- topic: [topic]
- style: high contrast, sharp
- subject: [who/what]
- background: simple with depth
- lighting: rim light
- aspect ratio: 16:9
- NO text (I’ll add later)

Give 4 variants with different compositions.`,
    },
    {
      title: l === "es" ? "Paisaje cinematográfico" : "Cinematic landscape",
      target: "grok",
      purpose: "image",
      prompt:
        l === "es"
          ? `Paisaje cinematográfico:
- lugar: [descripción]
- hora: golden hour
- atmósfera: niebla ligera
- lente: 35mm, profundidad de campo suave
- detalle: elementos en primer plano
- estilo: cine, color grading teal/orange sutil
- relación de aspecto: 21:9`
          : `Cinematic landscape:
- place: [description]
- time: golden hour
- atmosphere: light fog
- lens: 35mm, soft depth of field
- detail: foreground elements
- style: cinema, subtle teal/orange grading
- aspect ratio: 21:9`,
    },
    {
      title: l === "es" ? "Icon set / UI illustration" : "Icon set / UI illustration",
      target: "deepseek",
      purpose: "image",
      prompt:
        l === "es"
          ? `Diseñá un set de íconos:
- tema: [tema]
- estilo: outline limpio, 2px
- consistencia: mismo grid y radio
- fondo: transparente
- relación de aspecto: 1:1 por ícono

Dame 12 íconos distintos (describilos).`
          : `Design an icon set:
- theme: [theme]
- style: clean outline, 2px
- consistency: same grid and radius
- background: transparent
- aspect ratio: 1:1 per icon

Provide 12 different icons (describe them).`,
    },
  ];

  const faq = [
    {
      q: l === "es" ? "¿Cómo hago que el resultado sea consistente?" : "How do I make results consistent?",
      a:
        l === "es"
          ? "Definí estilo, iluminación, encuadre y relación de aspecto. Pedí variantes con cambios controlados."
          : "Specify style, lighting, framing, and aspect ratio. Ask for variants with controlled changes.",
    },
    {
      q: l === "es" ? "¿Qué debería incluir sí o sí?" : "What should I always include?",
      a:
        l === "es"
          ? "Sujeto, estilo, composición, fondo, luz y aspecto (1:1, 16:9, 4:5)."
          : "Subject, style, composition, background, lighting, and aspect ratio (1:1, 16:9, 4:5).",
    },
    {
      q: l === "es" ? "¿Puedo pedir múltiples variantes?" : "Can I request multiple variants?",
      a:
        l === "es"
          ? "Sí. Es lo mejor para iterar: pedí 3–4 variantes con cambios explícitos (pose, paleta, encuadre)."
          : "Yes. It’s best for iteration: request 3–4 variants with explicit changes (pose, palette, framing).",
    },
    {
      q: l === "es" ? "¿Esto agrega texto a la imagen?" : "Will this add text in the image?",
      a:
        l === "es"
          ? "Si no querés texto, pedilo explícitamente (“evitá texto en la imagen”)."
          : "If you don’t want text, ask explicitly (“avoid text in the image”).",
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
