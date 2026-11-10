// lib/blog/dev-fixture.ts
//
// v1.8.1 — DEVELOPMENT ONLY. A handful of clearly fictitious AI Daily stories
// ("Demo Labs", example.com sources) so the home page, the blog index and the
// article page can be reviewed locally without Firestore credentials. Same
// contract as lib/benchmarks/dev-fixture.ts: reachable only when NODE_ENV is
// "development" AND BLOG_DEV_FIXTURE=1 (see lib/blog/server.ts). Production
// never reads it, so no invented story can ever be published.

import type { BlogCategory, BlogEdition, Lang } from "@/lib/domain";
import { editorialDate } from "@/lib/blog/dates";
import type { PublicArticle } from "@/lib/blog/types";

export function blogDevFixtureEnabled(): boolean {
  return process.env.NODE_ENV === "development" && process.env.BLOG_DEV_FIXTURE === "1";
}

type Seed = {
  slug: string;
  daysAgo: number;
  edition: BlogEdition;
  category: BlogCategory;
  title: Record<Lang, string>;
  deck: Record<Lang, string>;
};

const SEEDS: Seed[] = [
  {
    slug: "demo-labs-prices-its-listing",
    daysAgo: 0,
    edition: "daily",
    category: "business",
    title: {
      en: "Demo Labs sets its listing at $70 to $78 a share, with $26 billion more from its chip and cloud suppliers",
      es: "Demo Labs fija su salida a bolsa entre US$ 70 y US$ 78 por acción, con US$ 26.000 millones más de sus proveedores",
    },
    deck: {
      en: "A fictitious filing fills in the blanks of a fictitious listing: 825 million shares, a seven-company private placement, and a voting structure that keeps control with the founders.",
      es: "Una presentación ficticia completa los datos de una salida a bolsa ficticia: 825 millones de acciones, una colocación privada de siete empresas y una estructura de votos que deja el control en los fundadores.",
    },
  },
  {
    slug: "demo-labs-releases-demo-model-5",
    daysAgo: 1,
    edition: "daily",
    category: "model-release",
    title: {
      en: "Demo Labs releases Demo Model 5.2: 20% cheaper, with breaking API changes",
      es: "Demo Labs lanza Demo Model 5.2: 20 % más barato y con cambios incompatibles en la API",
    },
    deck: {
      en: "The demo model is available to all API customers at made-up prices, and the larger sibling stays limited to vetted organizations.",
      es: "El modelo de demostración está disponible para todos los clientes de la API a precios inventados, y el hermano mayor sigue limitado a organizaciones verificadas.",
    },
  },
  {
    slug: "demo-chips-opens-its-interconnect",
    daysAgo: 1,
    edition: "daily-morning",
    category: "infrastructure",
    title: {
      en: "Demo Chips opens its interconnect to third-party accelerators",
      es: "Demo Chips abre su interconexión a aceleradores de terceros",
    },
    deck: {
      en: "A placeholder partner will connect its inference chips to the demo interconnect, and a placeholder carrier will deploy the racks.",
      es: "Un socio de ejemplo va a conectar sus chips de inferencia a la interconexión de demostración, y un operador de ejemplo va a desplegar los racks.",
    },
  },
  {
    slug: "demo-week-ahead-infrastructure-earnings",
    daysAgo: 2,
    edition: "week-ahead",
    category: "other",
    title: {
      en: "Week ahead: four demo infrastructure companies test AI demand",
      es: "La semana que viene: cuatro empresas de infraestructura de ejemplo miden la demanda de IA",
    },
    deck: {
      en: "One demo company reports Tuesday and three more report Thursday. Everything in this fixture is invented for local development.",
      es: "Una empresa de ejemplo presenta resultados el martes y otras tres el jueves. Todo en este fixture es inventado para desarrollo local.",
    },
  },
  {
    slug: "demo-week-in-review",
    daysAgo: 3,
    edition: "weekly-recap",
    category: "digest",
    title: {
      en: "Week in review: the demo stories that mattered",
      es: "Resumen de la semana: las historias de ejemplo que importaron",
    },
    deck: {
      en: "A recap of placeholder stories, to check how weekly editions are labelled in lists.",
      es: "Un repaso de historias de ejemplo, para revisar cómo se etiquetan las ediciones semanales en las listas.",
    },
  },
  {
    slug: "demo-research-agents-benchmark",
    daysAgo: 4,
    edition: "daily",
    category: "research",
    title: {
      en: "A demo benchmark finds agents still fail at long tasks",
      es: "Un benchmark de ejemplo muestra que los agentes siguen fallando en tareas largas",
    },
    deck: {
      en: "Placeholder researchers report placeholder numbers; this entry exists to fill the archive page.",
      es: "Investigadores de ejemplo informan números de ejemplo; esta entrada existe para completar el archivo.",
    },
  },
];

export function blogDevFixture(lang: Lang, now: Date = new Date()): PublicArticle[] {
  return SEEDS.map((s) => {
    const when = new Date(now.getTime() - s.daysAgo * 86_400_000);
    const eventDate = editorialDate(when);
    const weekly = s.edition === "weekly-recap" || s.edition === "week-ahead";
    return {
      canonicalSlug: s.slug,
      slug: s.slug,
      lang,
      status: "published",
      title: s.title[lang],
      deck: s.deck[lang],
      summary: s.deck[lang],
      body: [
        { type: "paragraph", text: s.deck[lang] },
        { type: "heading", level: 2, text: lang === "es" ? "Contenido de ejemplo" : "Sample content" },
        {
          type: "paragraph",
          text:
            lang === "es"
              ? "Este artículo es un fixture de desarrollo: no describe hechos reales y nunca se publica."
              : "This article is a development fixture: it describes no real events and is never published.",
        },
        { type: "list", ordered: false, items: lang === "es" ? ["Primer punto de ejemplo", "Segundo punto de ejemplo"] : ["First sample point", "Second sample point"] },
      ],
      whyItMatters: [lang === "es" ? "Sirve para revisar el diseño en local." : "It lets the layout be reviewed locally."],
      keyTakeaways: [lang === "es" ? "Contenido ficticio." : "Fictitious content."],
      seoTitle: s.title[lang].slice(0, 60),
      metaDescription: s.deck[lang].slice(0, 155),
      edition: s.edition,
      eventDate,
      coveredFrom: weekly ? editorialDate(new Date(when.getTime() - 6 * 86_400_000)) : null,
      coveredTo: weekly ? eventDate : null,
      backdateReason: null,
      publishedAt: when.toISOString(),
      updatedAt: when.toISOString(),
      category: s.category,
      importance: "P1",
      tags: ["demo"],
      companies: ["Demo Labs"],
      models: [],
      author: "Promptea (dev fixture)",
      sources: [
        { title: "Example source for local development", publisher: "Example", url: "https://example.com/source", sourceType: "announcement", primary: true, publishedAt: eventDate, accessedAt: eventDate },
        { title: "Second example source", publisher: "Example", url: "https://example.org/source", sourceType: "announcement", primary: false, publishedAt: eventDate, accessedAt: eventDate },
      ],
      image: null,
      digestItems: [],
      singleSourceJustification: null,
      correction: null,
      readingMinutes: 3,
      alternateSlugs: { en: s.slug, es: s.slug },
    };
  });
}
