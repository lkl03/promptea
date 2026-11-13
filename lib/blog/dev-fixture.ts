// lib/blog/dev-fixture.ts
//
// v1.8.1 — DEVELOPMENT ONLY. A handful of clearly fictitious AI Daily stories
// ("Demo Labs", example.com sources) so the home page, the blog index and the
// article page can be reviewed locally without Firestore credentials. Same
// contract as lib/benchmarks/dev-fixture.ts: reachable only when NODE_ENV is
// "development" AND BLOG_DEV_FIXTURE=1 (see lib/blog/server.ts). Production
// never reads it, so no invented story can ever be published.

import type { BlogCategory, BlogEdition, ContentLang } from "@/lib/domain";
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
  title: Record<ContentLang, string>;
  deck: Record<ContentLang, string>;
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
  // ── v1.8.3: AI Daily Tech (edition "tech-daily"), equally fictitious ───────
  {
    slug: "demo-cloud-ships-agent-sandboxes",
    daysAgo: 0,
    edition: "tech-daily",
    category: "cloud",
    title: {
      en: "Demo Cloud ships isolated sandboxes for AI agents, billed by the second",
      es: "Demo Cloud lanza sandboxes aislados para agentes de IA, facturados por segundo",
    },
    deck: {
      en: "A fictitious hosting platform adds a made-up runtime for agent-generated code. Every figure in this fixture is invented for local development.",
      es: "Una plataforma de hosting ficticia suma un runtime inventado para código generado por agentes. Todas las cifras de este fixture son inventadas para desarrollo local.",
    },
  },
  {
    slug: "demo-framework-17-streaming-server-components",
    daysAgo: 1,
    edition: "tech-daily",
    category: "web-platform",
    title: {
      en: "Demo Framework 17 makes streamed model output a first-class response type",
      es: "Demo Framework 17 convierte la salida en streaming de un modelo en un tipo de respuesta nativo",
    },
    deck: {
      en: "A placeholder release of a placeholder web framework, here to check how a Tech story sits next to AI stories.",
      es: "Un lanzamiento de ejemplo de un framework web de ejemplo, para revisar cómo se ve una nota Tech junto a las de IA.",
    },
  },
  {
    slug: "demo-silicon-inference-card-for-workstations",
    daysAgo: 2,
    edition: "tech-daily",
    category: "hardware",
    title: {
      en: "Demo Silicon announces an inference card for workstations",
      es: "Demo Silicon anuncia una placa de inferencia para estaciones de trabajo",
    },
    deck: {
      en: "An invented chip with invented numbers; the entry exists to exercise the hardware category.",
      es: "Un chip inventado con números inventados; la entrada existe para ejercitar la categoría hardware.",
    },
  },
  {
    slug: "demo-hub-code-review-agents-general-availability",
    daysAgo: 4,
    edition: "tech-daily",
    category: "developer-tools",
    title: {
      en: "Demo Hub opens its code-review agents to every repository",
      es: "Demo Hub abre sus agentes de revisión de código a todos los repositorios",
    },
    deck: {
      en: "A fictitious code host turns a fictitious preview into a general release. Nothing here describes a real product.",
      es: "Un host de código ficticio convierte una vista previa ficticia en un lanzamiento general. Nada de esto describe un producto real.",
    },
  },
];

export function blogDevFixture(lang: ContentLang, now: Date = new Date()): PublicArticle[] {
  // Newest first, like every real read path (Firestore orders by publishedAt desc);
  // same-day stories keep their order in SEEDS.
  return [...SEEDS].sort((a, b) => a.daysAgo - b.daysAgo).map((s) => {
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
