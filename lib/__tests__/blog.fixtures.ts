// lib/__tests__/blog.fixtures.ts
//
// v1.4.0 — shared fixtures for the AI Daily blog tests.
//
// Two rules govern this file:
//
//   1. Every date is derived from FIXED_INSTANT through the real helpers in
//      lib/blog/dates.ts. Nothing is hardcoded as a literal `YYYY-MM-DD`, so
//      the fixtures cannot rot when the wall clock moves past them and the
//      freshness assertions stay meaningful forever.
//   2. Every fixture is schema-VALID unless its name says otherwise. The two
//      deliberately-unpublishable ones are `staleStoryPayload` and
//      `freshSourceStaleEventPayload`: both parse cleanly, and both must be
//      rejected by the runtime freshness gate. That asymmetry is the point —
//      it proves the gate is doing work the schema cannot do.
//
// The content is intentionally synthetic ("Example Labs", example.com URLs) so
// no fixture can ever be mistaken for a real news story or a real source.

import { dailyIdempotencyKey, editorialDate } from "@/lib/blog/dates";
import type { Block, LocaleContent, PublishPayload, Source } from "@/lib/blog/types";

// ---------------------------------------------------------------------------
// The fixed clock
// ---------------------------------------------------------------------------

/**
 * 2026-08-07T14:00:00Z — 11:00 in Buenos Aires. Deliberately mid-afternoon UTC
 * so the UTC date and the editorial date agree here; the tests that exercise
 * the rollover build their own instants.
 */
export const FIXED_INSTANT = new Date("2026-08-07T14:00:00.000Z");

const DAY_MS = 86_400_000;

/** Editorial calendar date `n` days from FIXED_INSTANT (negative = past). */
export function editorialDayOffset(days: number): string {
  return editorialDate(new Date(FIXED_INSTANT.getTime() + days * DAY_MS));
}

export const TODAY = editorialDayOffset(0);
export const YESTERDAY = editorialDayOffset(-1);
export const TOMORROW = editorialDayOffset(1);
export const LAST_WEEK = editorialDayOffset(-7);

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

export function makeSource(overrides: Partial<Source> = {}): Source {
  return {
    title: "Orion model card",
    publisher: "Example Labs",
    url: "https://example.com/labs/orion/model-card",
    sourceType: "model-card",
    primary: true,
    publishedAt: TODAY,
    accessedAt: TODAY,
    ...overrides,
  };
}

const defaultEnBody: Block[] = [
  {
    type: "paragraph",
    text: "Example Labs published the model card for **Orion**, a general-purpose model the company says is available in its public API from today.",
  },
  { type: "heading", level: 2, text: "What actually changed" },
  {
    type: "paragraph",
    text: "The card states a 400k-token context window and a lower price per million output tokens than the previous generation. See the [model card](https://example.com/labs/orion/model-card) for the full table.",
  },
  {
    type: "list",
    ordered: false,
    items: [
      "400k-token context window",
      "Lower price per million output tokens",
      "Available on every paid tier today",
    ],
  },
  {
    type: "quote",
    text: "Orion is available to every paid tier from today.",
    attribution: "Example Labs model card",
  },
];

const defaultEsBody: Block[] = [
  {
    type: "paragraph",
    text: "Example Labs publicó la model card de **Orion**, un modelo de propósito general que, según la empresa, ya está disponible en su API pública.",
  },
  { type: "heading", level: 2, text: "Qué cambió en concreto" },
  {
    type: "paragraph",
    text: "La ficha declara una ventana de contexto de 400k tokens y un precio de salida más bajo que la generación anterior. Mirá la [model card](https://example.com/labs/orion/model-card) para la tabla completa.",
  },
  {
    type: "list",
    ordered: false,
    items: [
      "Ventana de contexto de 400k tokens",
      "Precio más bajo por millón de tokens de salida",
      "Disponible hoy en todos los planes pagos",
    ],
  },
  {
    type: "quote",
    text: "Orion está disponible desde hoy en todos los planes pagos.",
    attribution: "Model card de Example Labs",
  },
];

const defaultEnLocale: LocaleContent = {
  slug: "example-labs-launches-orion",
  title: "Example Labs launches Orion, its first 400k-context model",
  deck: "The model card lists a 400k-token context window and lower output pricing than the previous generation.",
  summary:
    "Example Labs published a model card for Orion, a general-purpose model available in its public API from today. The card states a 400k-token context window and a lower price per million output tokens. Independent benchmarks are not yet available.",
  body: defaultEnBody,
  whyItMatters: [
    "A context window above 200k tokens changes what fits into a single request.",
    "A lower output price shifts the cost model for long-form generation.",
  ],
  keyTakeaways: [
    "400k-token context window",
    "Lower price per million output tokens",
    "Available in the public API today",
  ],
  seoTitle: "Example Labs launches Orion (400k context)",
  metaDescription:
    "Example Labs published the Orion model card: a 400k-token context window, lower output pricing and availability in the public API today.",
};

const defaultEsLocale: LocaleContent = {
  slug: "example-labs-lanza-orion",
  title: "Example Labs lanza Orion, su primer modelo con contexto de 400k",
  deck: "La model card declara una ventana de contexto de 400k tokens y un precio de salida más bajo que la generación anterior.",
  summary:
    "Example Labs publicó la model card de Orion, un modelo de propósito general disponible desde hoy en su API pública. Declara una ventana de contexto de 400k tokens y un precio de salida más bajo. Todavía no hay benchmarks independientes.",
  body: defaultEsBody,
  whyItMatters: [
    "Una ventana de más de 200k tokens cambia lo que te entra en un solo pedido.",
    "Un precio de salida más bajo te cambia el costo de generar textos largos.",
  ],
  keyTakeaways: [
    "Ventana de contexto de 400k tokens",
    "Precio más bajo por millón de tokens de salida",
    "Disponible hoy en la API pública",
  ],
  seoTitle: "Example Labs lanza Orion (contexto 400k)",
  metaDescription:
    "Example Labs publicó la model card de Orion: contexto de 400k tokens, precio de salida más bajo y disponibilidad en la API pública desde hoy.",
};

export function makeEnLocale(overrides: Partial<LocaleContent> = {}): LocaleContent {
  return { ...defaultEnLocale, ...overrides };
}

export function makeEsLocale(overrides: Partial<LocaleContent> = {}): LocaleContent {
  return { ...defaultEsLocale, ...overrides };
}

// ---------------------------------------------------------------------------
// The payload factory
// ---------------------------------------------------------------------------

function basePayload(eventDate: string): PublishPayload {
  return {
    idempotencyKey: dailyIdempotencyKey(eventDate),
    routineRunId: "run-2026-08-07-0930",
    canonicalSlug: "example-labs-launches-orion",
    status: "published",
    eventDate,
    importance: "P1",
    category: "model-release",
    tags: ["model-release", "context-window", "pricing"],
    companies: ["Example Labs"],
    models: ["Orion"],
    locales: { en: makeEnLocale(), es: makeEsLocale() },
    sources: [
      makeSource(),
      makeSource({
        title: "Example Labs ships Orion with a 400k context window",
        publisher: "Example Wire",
        url: "https://example.com/wire/orion-launch",
        sourceType: "reporting",
        primary: false,
      }),
    ],
    singleSourceJustification: null,
    image: null,
    digestItems: null,
    dryRun: false,
  };
}

/**
 * A valid PublishPayload with `overrides` applied on top.
 *
 * `idempotencyKey` is re-derived whenever `eventDate` moves, so a caller that
 * only wants to change the date never has to remember the key rule. Pass
 * `idempotencyKey` explicitly to defeat that (which is how the mismatch test
 * builds its invalid payload).
 */
export function makePayload(overrides: Partial<PublishPayload> = {}): PublishPayload {
  const eventDate = overrides.eventDate ?? TODAY;
  return {
    ...basePayload(eventDate),
    ...overrides,
    eventDate,
    idempotencyKey: overrides.idempotencyKey ?? dailyIdempotencyKey(eventDate),
  };
}

// ---------------------------------------------------------------------------
// Editorial scenarios — all valid, all same-day
// ---------------------------------------------------------------------------

/** P1 model release: two sources, one primary (the model card). */
export const modelLaunchPayload: PublishPayload = makePayload();

/** P0 acquisition: first-party announcement plus independent reporting. */
export const acquisitionPayload: PublishPayload = makePayload({
  canonicalSlug: "example-labs-acquires-northwind-compute",
  importance: "P0",
  category: "funding",
  tags: ["acquisition", "compute"],
  companies: ["Example Labs", "Northwind Compute"],
  models: [],
  locales: {
    en: makeEnLocale({
      slug: "example-labs-acquires-northwind-compute",
      title: "Example Labs acquires Northwind Compute in an all-stock deal",
      deck: "Both companies confirmed the acquisition today; the filing puts the consideration entirely in stock.",
      summary:
        "Example Labs announced it has agreed to acquire Northwind Compute, a training-cluster operator, in an all-stock transaction. Both parties confirmed the deal today and the terms appear in the regulatory filing.",
      body: [
        {
          type: "paragraph",
          text: "Example Labs announced an agreement to acquire **Northwind Compute**, the operator of a training cluster it has rented since last year.",
        },
        {
          type: "paragraph",
          text: "The filing describes an all-stock transaction and gives no cash component. Closing is stated as subject to regulatory review.",
        },
      ],
      whyItMatters: [
        "Owning the cluster removes a rental line item from the training budget.",
        "Vertical integration of compute changes the negotiating position with cloud vendors.",
      ],
      keyTakeaways: [
        "All-stock transaction, no cash component",
        "Closing subject to regulatory review",
        "Confirmed by both parties on the record",
      ],
      seoTitle: "Example Labs acquires Northwind Compute",
      metaDescription:
        "Example Labs agreed to acquire Northwind Compute in an all-stock deal. Both parties confirmed it today; closing is subject to regulatory review.",
    }),
    es: makeEsLocale({
      slug: "example-labs-compra-northwind-compute",
      title: "Example Labs compra Northwind Compute en una operación por acciones",
      deck: "Las dos empresas confirmaron hoy la adquisición y la presentación regulatoria indica que el pago es íntegramente en acciones.",
      summary:
        "Example Labs anunció que acordó comprar Northwind Compute, operadora de un cluster de entrenamiento, en una transacción pagada íntegramente en acciones. Las dos partes lo confirmaron hoy y los términos figuran en la presentación regulatoria.",
      body: [
        {
          type: "paragraph",
          text: "Example Labs anunció un acuerdo para comprar **Northwind Compute**, la operadora del cluster de entrenamiento que viene alquilando desde el año pasado.",
        },
        {
          type: "paragraph",
          text: "La presentación describe una operación pagada solo en acciones, sin componente en efectivo. El cierre queda sujeto a revisión regulatoria.",
        },
      ],
      whyItMatters: [
        "Ser dueño del cluster le saca del presupuesto de entrenamiento una línea de alquiler.",
        "Integrar el cómputo cambia la posición de negociación con los proveedores de nube.",
      ],
      keyTakeaways: [
        "Operación pagada solo en acciones",
        "El cierre queda sujeto a revisión regulatoria",
        "Confirmada oficialmente por las dos partes",
      ],
      seoTitle: "Example Labs compra Northwind Compute",
      metaDescription:
        "Example Labs acordó comprar Northwind Compute en una operación por acciones. Las dos partes lo confirmaron hoy y el cierre depende del regulador.",
    }),
  },
  sources: [
    makeSource({
      title: "Example Labs to acquire Northwind Compute",
      url: "https://example.com/labs/press/northwind",
      sourceType: "announcement",
      primary: true,
    }),
    makeSource({
      title: "Northwind Compute confirms all-stock acquisition",
      publisher: "Northwind Compute",
      url: "https://example.com/northwind/press/acquisition",
      sourceType: "announcement",
      primary: true,
    }),
  ],
});

/** P2 research paper: preprint plus the authors' own write-up. */
export const researchPaperPayload: PublishPayload = makePayload({
  canonicalSlug: "sparse-attention-paper-halves-long-context-cost",
  importance: "P2",
  category: "research",
  tags: ["research", "attention", "long-context"],
  companies: ["Example University"],
  models: [],
  locales: {
    en: makeEnLocale({
      slug: "sparse-attention-paper-halves-long-context-cost",
      title: "New preprint reports halved long-context inference cost",
      deck: "The paper claims a sparse-attention variant cuts long-context inference cost by about half at equal benchmark scores.",
      summary:
        "A preprint released today describes a sparse-attention variant its authors say halves long-context inference cost while holding benchmark scores steady. The result has not been independently replicated and the code release is promised but not yet published.",
      body: [
        {
          type: "paragraph",
          text: "A preprint posted today describes a sparse-attention variant the authors say roughly halves inference cost at 128k tokens.",
        },
        {
          type: "paragraph",
          text: "The reported benchmark scores are within noise of the dense baseline. No independent replication exists yet, and the promised code release is not up.",
        },
      ],
      whyItMatters: [
        "Long-context inference cost is the practical ceiling on document-scale workloads.",
        "A halving would move long-context work from occasional to routine for small teams.",
      ],
      keyTakeaways: [
        "Roughly half the inference cost at 128k tokens",
        "Benchmark scores within noise of the dense baseline",
        "Not independently replicated; code not yet released",
      ],
      seoTitle: "Preprint halves long-context inference cost",
      metaDescription:
        "A preprint reports a sparse-attention variant that halves long-context inference cost at equal benchmark scores. No replication or code release yet.",
    }),
    es: makeEsLocale({
      slug: "paper-atencion-dispersa-reduce-costo-contexto-largo",
      title: "Un preprint dice que reduce a la mitad el costo de contexto largo",
      deck: "El paper afirma que una variante de atención dispersa recorta cerca de la mitad del costo de inferencia sin perder puntaje en los benchmarks.",
      summary:
        "Un preprint publicado hoy describe una variante de atención dispersa que, según sus autores, reduce a la mitad el costo de inferencia en contexto largo sin perder puntaje. Todavía no hay replicación independiente y el código prometido no está publicado.",
      body: [
        {
          type: "paragraph",
          text: "Un preprint publicado hoy describe una variante de atención dispersa que, según los autores, reduce casi a la mitad el costo de inferencia con 128k tokens.",
        },
        {
          type: "paragraph",
          text: "Los puntajes reportados están dentro del ruido del baseline denso. Todavía no hay replicación independiente y el código prometido no está publicado.",
        },
      ],
      whyItMatters: [
        "El costo de inferencia en contexto largo es el techo real de cualquier flujo con documentos.",
        "Si se confirma, pasás de usar contexto largo de vez en cuando a usarlo todos los días.",
      ],
      keyTakeaways: [
        "Cerca de la mitad del costo de inferencia con 128k tokens",
        "Puntajes dentro del ruido del baseline denso",
        "Sin replicación independiente ni código publicado",
      ],
      seoTitle: "Preprint: mitad de costo en contexto largo",
      metaDescription:
        "Un preprint reporta atención dispersa que reduce a la mitad el costo de contexto largo sin perder puntaje. Todavía sin replicación ni código público.",
    }),
  },
  sources: [
    makeSource({
      title: "Sparse attention for cost-efficient long-context inference",
      publisher: "Example University",
      url: "https://example.com/preprints/2026/sparse-attention",
      sourceType: "research-paper",
      primary: true,
    }),
    makeSource({
      title: "Author thread summarising the sparse-attention result",
      publisher: "Example University Blog",
      url: "https://example.com/university/blog/sparse-attention",
      sourceType: "other",
      primary: false,
    }),
  ],
});

/** P2 product update: changelog plus documentation. */
export const productUpdatePayload: PublishPayload = makePayload({
  canonicalSlug: "example-studio-adds-shared-workspaces",
  importance: "P2",
  category: "product",
  tags: ["product", "collaboration"],
  companies: ["Example Labs"],
  models: [],
  locales: {
    en: makeEnLocale({
      slug: "example-studio-adds-shared-workspaces",
      title: "Example Studio adds shared workspaces for team prompts",
      deck: "The changelog entry describes shared prompt libraries with per-seat roles, rolling out to paid workspaces today.",
      summary:
        "Example Labs added shared workspaces to Example Studio, letting teams keep one prompt library with per-seat roles. The changelog says the feature is rolling out to paid workspaces today and the documentation covers the permission model.",
      body: [
        {
          type: "paragraph",
          text: "Example Studio now supports shared workspaces: one prompt library per team, with per-seat roles rather than a single shared login.",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "Shared prompt library per workspace",
            "Viewer, editor and owner roles",
            "Rolling out to paid workspaces today",
          ],
        },
      ],
      whyItMatters: [
        "Team prompt libraries stop living in private documents nobody else can find.",
        "Per-seat roles remove the shared-login pattern most small teams fall into.",
      ],
      keyTakeaways: [
        "One shared prompt library per workspace",
        "Viewer, editor and owner roles",
        "Paid workspaces only, from today",
      ],
      seoTitle: "Example Studio adds shared workspaces",
      metaDescription:
        "Example Studio now offers shared workspaces: one prompt library per team with viewer, editor and owner roles, rolling out to paid plans today.",
    }),
    es: makeEsLocale({
      slug: "example-studio-suma-espacios-compartidos",
      title: "Example Studio suma espacios compartidos para prompts de equipo",
      deck: "El changelog describe bibliotecas de prompts compartidas con roles por asiento, que empiezan a llegar hoy a los espacios pagos.",
      summary:
        "Example Labs agregó espacios compartidos a Example Studio, para que un equipo mantenga una sola biblioteca de prompts con roles por asiento. El changelog dice que llega hoy a los espacios pagos y la documentación explica el modelo de permisos.",
      body: [
        {
          type: "paragraph",
          text: "Example Studio ahora soporta espacios compartidos: una biblioteca de prompts por equipo, con roles por asiento en vez de un login compartido.",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "Biblioteca de prompts compartida por espacio",
            "Roles de lectura, edición y propiedad",
            "Llega hoy a los espacios pagos",
          ],
        },
      ],
      whyItMatters: [
        "Los prompts del equipo dejan de vivir en documentos privados que nadie encuentra.",
        "Con roles por asiento te sacás de encima el login compartido de siempre.",
      ],
      keyTakeaways: [
        "Una biblioteca de prompts por espacio",
        "Roles de lectura, edición y propiedad",
        "Solo espacios pagos, desde hoy",
      ],
      seoTitle: "Example Studio suma espacios compartidos",
      metaDescription:
        "Example Studio ya ofrece espacios compartidos: una biblioteca de prompts por equipo con roles de lectura, edición y propiedad, desde hoy en planes pagos.",
    }),
  },
  sources: [
    makeSource({
      title: "Example Studio changelog: shared workspaces",
      url: "https://example.com/studio/changelog/shared-workspaces",
      sourceType: "changelog",
      primary: true,
    }),
    makeSource({
      title: "Workspace roles and permissions",
      url: "https://example.com/studio/docs/workspace-roles",
      sourceType: "documentation",
      primary: true,
    }),
  ],
});

/** P0 regulatory story: the published text plus a regulator statement. */
export const regulatoryStoryPayload: PublishPayload = makePayload({
  canonicalSlug: "example-region-publishes-model-disclosure-rule",
  importance: "P0",
  category: "policy",
  tags: ["policy", "disclosure", "compliance"],
  companies: [],
  models: [],
  locales: {
    en: makeEnLocale({
      slug: "example-region-publishes-model-disclosure-rule",
      title: "Example Region publishes its model disclosure rule",
      deck: "The final text requires published training-data categories and an incident channel for general-purpose models above a compute threshold.",
      summary:
        "Example Region published the final text of its model disclosure rule today. Providers of general-purpose models above a stated compute threshold must publish training-data categories and operate an incident reporting channel, with obligations phasing in over twelve months.",
      body: [
        {
          type: "paragraph",
          text: "Example Region published the final text of its model disclosure rule, which applies to general-purpose models trained above a stated compute threshold.",
        },
        {
          type: "paragraph",
          text: "Covered providers must publish training-data categories and run an incident reporting channel. The obligations phase in over twelve months from publication.",
        },
        { type: "heading", level: 3, text: "What is not in the text" },
        {
          type: "paragraph",
          text: "The rule sets no penalty schedule; enforcement is left to the existing supervisory framework.",
        },
      ],
      whyItMatters: [
        "A disclosure floor changes what every covered provider must document from day one.",
        "A twelve-month phase-in sets a concrete compliance deadline for affected teams.",
      ],
      keyTakeaways: [
        "Applies above a stated compute threshold",
        "Training-data categories must be published",
        "Obligations phase in over twelve months",
      ],
      seoTitle: "Example Region publishes model disclosure rule",
      metaDescription:
        "Example Region's final model disclosure rule requires published training-data categories and an incident channel, phasing in over twelve months.",
    }),
    es: makeEsLocale({
      slug: "example-region-publica-norma-de-divulgacion",
      title: "Example Region publica su norma de divulgación de modelos",
      deck: "El texto final exige publicar categorías de datos de entrenamiento y sostener un canal de incidentes para modelos de propósito general.",
      summary:
        "Example Region publicó hoy el texto final de su norma de divulgación de modelos. Los proveedores de modelos de propósito general por encima de un umbral de cómputo tienen que publicar categorías de datos de entrenamiento y sostener un canal de incidentes, con obligaciones que entran en doce meses.",
      body: [
        {
          type: "paragraph",
          text: "Example Region publicó el texto final de su norma de divulgación, que aplica a modelos de propósito general entrenados por encima de un umbral de cómputo.",
        },
        {
          type: "paragraph",
          text: "Los proveedores alcanzados tienen que publicar categorías de datos de entrenamiento y sostener un canal de reporte de incidentes. Las obligaciones entran en doce meses.",
        },
        { type: "heading", level: 3, text: "Qué no dice el texto" },
        {
          type: "paragraph",
          text: "La norma no fija un régimen de sanciones: la aplicación queda en manos del marco de supervisión que ya existe.",
        },
      ],
      whyItMatters: [
        "Un piso de divulgación cambia lo que cada proveedor alcanzado tiene que documentar desde el día uno.",
        "Si te alcanza, ya tenés fecha concreta: doce meses para llegar en regla.",
      ],
      keyTakeaways: [
        "Aplica por encima de un umbral de cómputo",
        "Hay que publicar categorías de datos de entrenamiento",
        "Las obligaciones entran en doce meses",
      ],
      seoTitle: "Example Region publica su norma de divulgación",
      metaDescription:
        "La norma final de Example Region exige publicar categorías de datos de entrenamiento y un canal de incidentes, con obligaciones a doce meses.",
    }),
  },
  sources: [
    makeSource({
      title: "Model disclosure rule, final text",
      publisher: "Example Region Registry",
      url: "https://example.com/region/registry/model-disclosure-final",
      sourceType: "regulatory",
      primary: true,
    }),
    makeSource({
      title: "Supervisor statement on the model disclosure rule",
      publisher: "Example Region Supervisor",
      url: "https://example.com/region/supervisor/statement",
      sourceType: "announcement",
      primary: true,
    }),
  ],
});

/** P2 minor API release: changelog-only, the floor of what is worth publishing. */
export const minorApiReleasePayload: PublishPayload = makePayload({
  canonicalSlug: "example-api-adds-batch-endpoint",
  importance: "P2",
  category: "developer-tools",
  tags: ["api", "changelog"],
  companies: ["Example Labs"],
  models: [],
  locales: {
    en: makeEnLocale({
      slug: "example-api-adds-batch-endpoint",
      title: "Example API adds a batch endpoint for offline jobs",
      deck: "The changelog adds a batch endpoint with a 24-hour completion window and a lower per-token rate for non-interactive work.",
      summary:
        "Example Labs added a batch endpoint to its API for non-interactive jobs. The changelog states a 24-hour completion window and a lower per-token rate than the synchronous endpoint, with the same model selection.",
      body: [
        {
          type: "paragraph",
          text: "The Example API now exposes a batch endpoint for non-interactive jobs, with a 24-hour completion window and a lower per-token rate.",
        },
        {
          type: "paragraph",
          text: "Model selection is unchanged; the difference is scheduling and price, not capability.",
        },
      ],
      whyItMatters: [
        "Batch pricing makes bulk classification and backfill jobs materially cheaper.",
        "A stated completion window makes offline pipelines something you can schedule around.",
      ],
      keyTakeaways: [
        "24-hour completion window",
        "Lower per-token rate than the sync endpoint",
        "Same model selection as the sync API",
      ],
      seoTitle: "Example API adds a batch endpoint",
      metaDescription:
        "Example Labs added a batch endpoint with a 24-hour completion window and a lower per-token rate for non-interactive jobs, keeping the same models.",
    }),
    es: makeEsLocale({
      slug: "example-api-suma-endpoint-batch",
      title: "La API de Example suma un endpoint batch para trabajos offline",
      deck: "El changelog agrega un endpoint batch con ventana de 24 horas y una tarifa por token más baja para trabajos no interactivos.",
      summary:
        "Example Labs agregó a su API un endpoint batch para trabajos no interactivos. El changelog declara una ventana de 24 horas para completarlos y una tarifa por token más baja que el endpoint sincrónico, con la misma selección de modelos.",
      body: [
        {
          type: "paragraph",
          text: "La API de Example ya expone un endpoint batch para trabajos no interactivos, con ventana de 24 horas y una tarifa por token más baja.",
        },
        {
          type: "paragraph",
          text: "La selección de modelos no cambia: lo que cambia es el agendamiento y el precio, no la capacidad.",
        },
      ],
      whyItMatters: [
        "Con precio batch te sale bastante más barato clasificar en masa o rehacer un backfill.",
        "Una ventana declarada te deja agendar los procesos offline con criterio.",
      ],
      keyTakeaways: [
        "Ventana de 24 horas para completar",
        "Tarifa por token más baja que el endpoint sincrónico",
        "Misma selección de modelos que la API sincrónica",
      ],
      seoTitle: "La API de Example suma endpoint batch",
      metaDescription:
        "Example Labs sumó un endpoint batch con ventana de 24 horas y tarifa por token más baja para trabajos no interactivos, con los mismos modelos.",
    }),
  },
  sources: [
    makeSource({
      title: "Example API changelog: batch endpoint",
      url: "https://example.com/api/changelog/batch-endpoint",
      sourceType: "changelog",
      primary: true,
    }),
    makeSource({
      title: "Batch API reference",
      url: "https://example.com/api/docs/batch",
      sourceType: "documentation",
      primary: true,
    }),
  ],
});

/**
 * An unconfirmed rumour. Single non-primary source and no official
 * confirmation, so the editorial policy allows it only as a DRAFT — a
 * published article with these sources must fail validation.
 */
export const ambiguousRumorPayload: PublishPayload = makePayload({
  canonicalSlug: "report-example-labs-preparing-orion-mini",
  status: "draft",
  importance: "P2",
  category: "other",
  tags: ["rumour", "unconfirmed"],
  companies: ["Example Labs"],
  models: [],
  locales: {
    en: makeEnLocale({
      slug: "report-example-labs-preparing-orion-mini",
      title: "Report: Example Labs is said to be preparing a smaller Orion",
      deck: "One outlet cites unnamed people; Example Labs has not commented and no filing or changelog corroborates the claim.",
      summary:
        "A single outlet reports, citing unnamed people, that Example Labs is preparing a smaller Orion variant. Example Labs has not commented, no filing or changelog corroborates the claim, and no timeline is given. Treated as unconfirmed.",
      body: [
        {
          type: "paragraph",
          text: "One outlet reports, citing people it does not name, that Example Labs is preparing a smaller Orion variant.",
        },
        {
          type: "paragraph",
          text: "Example Labs has not commented. Nothing in the company's changelog or filings corroborates the claim, and the report gives no timeline.",
        },
      ],
      whyItMatters: [
        "A smaller variant would change the price floor, if the report turns out to be right.",
        "Single-sourced reports are worth tracking but not worth acting on yet.",
      ],
      keyTakeaways: [
        "Single outlet, unnamed sources",
        "No comment from Example Labs",
        "No corroborating filing or changelog",
      ],
      seoTitle: "Report: a smaller Orion may be in the works",
      metaDescription:
        "One outlet reports that Example Labs is preparing a smaller Orion, citing unnamed people. Example Labs has not commented and nothing corroborates it.",
    }),
    es: makeEsLocale({
      slug: "reporte-example-labs-prepararia-un-orion-mini",
      title: "Reporte: Example Labs estaría preparando un Orion más chico",
      deck: "Un solo medio cita fuentes sin nombre; Example Labs no comentó nada y ningún changelog ni presentación lo respalda.",
      summary:
        "Un solo medio reporta, citando fuentes sin nombre, que Example Labs prepara una variante más chica de Orion. La empresa no comentó nada, ningún changelog ni presentación lo respalda y el reporte no da fechas. Queda como no confirmado.",
      body: [
        {
          type: "paragraph",
          text: "Un solo medio reporta, citando fuentes que no nombra, que Example Labs prepara una variante más chica de Orion.",
        },
        {
          type: "paragraph",
          text: "Example Labs no comentó nada. Ni el changelog ni las presentaciones de la empresa lo respaldan, y el reporte no da fechas.",
        },
      ],
      whyItMatters: [
        "Una variante más chica cambiaría el piso de precio, si el reporte resulta cierto.",
        "Un reporte de una sola fuente lo seguís de cerca, pero todavía no tomás decisiones con eso.",
      ],
      keyTakeaways: [
        "Un solo medio, fuentes sin nombre",
        "Example Labs no hizo comentarios",
        "No hay changelog ni presentación que lo respalde",
      ],
      seoTitle: "Reporte: habría un Orion más chico en camino",
      metaDescription:
        "Un medio reporta que Example Labs prepara un Orion más chico citando fuentes sin nombre. La empresa no comentó y nada lo respalda por ahora.",
    }),
  },
  sources: [
    makeSource({
      title: "Example Labs said to be preparing a smaller Orion",
      publisher: "Example Wire",
      url: "https://example.com/wire/orion-mini-report",
      sourceType: "reporting",
      primary: false,
    }),
  ],
});

/** A digest day: several same-day items rolled into one article. */
export const digestPayload: PublishPayload = makePayload({
  canonicalSlug: "ai-daily-digest-three-releases",
  category: "digest",
  importance: "P2",
  digestItems: [
    { titleEn: "Example Labs ships Orion", titleEs: "Example Labs lanza Orion", eventDate: TODAY },
    {
      titleEn: "Example Studio adds shared workspaces",
      titleEs: "Example Studio suma espacios compartidos",
      eventDate: TODAY,
    },
  ],
});

// ---------------------------------------------------------------------------
// Deliberately unpublishable — schema-valid, freshness-invalid
// ---------------------------------------------------------------------------

/**
 * DELIBERATELY STALE. Yesterday's event, reported by yesterday's sources.
 * Parses cleanly against PublishPayloadSchema — the schema has no notion of
 * "now" — and must be rejected by checkFreshness at the API boundary.
 */
export const staleStoryPayload: PublishPayload = makePayload({
  eventDate: YESTERDAY,
  sources: [
    makeSource({ publishedAt: YESTERDAY, accessedAt: TODAY }),
    makeSource({
      title: "Example Labs ships Orion with a 400k context window",
      publisher: "Example Wire",
      url: "https://example.com/wire/orion-launch",
      sourceType: "reporting",
      primary: false,
      publishedAt: YESTERDAY,
      accessedAt: TODAY,
    }),
  ],
});

/**
 * DELIBERATELY STALE, disguised. The sources were published TODAY but they are
 * reporting YESTERDAY's event — the exact shape that would sneak day-old news
 * past a naive "was the source published today?" check. The event date is what
 * governs, so this must be rejected too.
 */
export const freshSourceStaleEventPayload: PublishPayload = makePayload({
  eventDate: YESTERDAY,
  sources: [
    makeSource({
      title: "Yesterday's Orion launch, explained",
      publisher: "Example Wire",
      url: "https://example.com/wire/orion-explainer",
      sourceType: "reporting",
      primary: false,
      // Published today; the underlying event still happened yesterday.
      publishedAt: TODAY,
      accessedAt: TODAY,
    }),
    makeSource({ publishedAt: TODAY, accessedAt: TODAY }),
  ],
});

/** DELIBERATELY OLD. A week-old event — the multi-day staleness case. */
export const weekOldStoryPayload: PublishPayload = makePayload({
  eventDate: LAST_WEEK,
  sources: [
    makeSource({ publishedAt: LAST_WEEK, accessedAt: TODAY }),
    makeSource({
      title: "Example Labs ships Orion with a 400k context window",
      publisher: "Example Wire",
      url: "https://example.com/wire/orion-launch",
      sourceType: "reporting",
      primary: false,
      publishedAt: LAST_WEEK,
      accessedAt: TODAY,
    }),
  ],
});

/** DELIBERATELY AHEAD. Tomorrow's event — an embargo leak or a clock bug. */
export const futureStoryPayload: PublishPayload = makePayload({
  eventDate: TOMORROW,
  sources: [
    makeSource({ publishedAt: TOMORROW, accessedAt: TODAY }),
    makeSource({
      title: "Example Labs ships Orion with a 400k context window",
      publisher: "Example Wire",
      url: "https://example.com/wire/orion-launch",
      sourceType: "reporting",
      primary: false,
      publishedAt: TOMORROW,
      accessedAt: TODAY,
    }),
  ],
});

/**
 * Every fixture that must parse cleanly against PublishPayloadSchema. The
 * stale/future ones are included on purpose: schema validity and editorial
 * publishability are separate gates, and this list asserts the first one.
 */
export const allSchemaValidPayloads: ReadonlyArray<[string, PublishPayload]> = [
  ["modelLaunchPayload", modelLaunchPayload],
  ["acquisitionPayload", acquisitionPayload],
  ["researchPaperPayload", researchPaperPayload],
  ["productUpdatePayload", productUpdatePayload],
  ["regulatoryStoryPayload", regulatoryStoryPayload],
  ["minorApiReleasePayload", minorApiReleasePayload],
  ["ambiguousRumorPayload", ambiguousRumorPayload],
  ["digestPayload", digestPayload],
  ["staleStoryPayload", staleStoryPayload],
  ["freshSourceStaleEventPayload", freshSourceStaleEventPayload],
  ["weekOldStoryPayload", weekOldStoryPayload],
  ["futureStoryPayload", futureStoryPayload],
];
