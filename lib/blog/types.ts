// lib/blog/types.ts
//
// v1.4.0 — the AI Daily publication contract.
//
// This file is the single boundary between "whatever the editorial routine
// produced" and "what Promptea will store and render". Everything the routine
// sends is validated here before it reaches Firestore. Two rules drive the
// design:
//
//   1. No HTML, ever. An article body is a list of typed blocks with plain
//      text. There is no rich-text field, no markdown-to-HTML step, and no
//      dangerouslySetInnerHTML on article content — so a compromised or
//      confused routine cannot inject script into the site.
//   2. Publication rules are stricter than draft rules. A draft can be rough;
//      an automatically published article must pass freshness and sourcing.

import { z } from "zod";
import {
  BLOG_CATEGORIES,
  BLOG_EDITIONS,
  BLOG_IMPORTANCE,
  BLOG_SOURCE_TYPES,
} from "@/lib/domain";
import type {
  BlogCategory,
  BlogEdition,
  BlogImportance,
  BlogStatus,
  Lang,
} from "@/lib/domain";
import {
  editionIdempotencyKey,
  isEditorialDate,
  recapWindow,
  weekAheadWindow,
} from "@/lib/blog/dates";

// ---------------------------------------------------------------------------
// Size ceilings — enforced by Zod so an oversized payload is a 400, not an OOM.
// ---------------------------------------------------------------------------

export const MAX_PUBLISH_BODY_BYTES = 256 * 1024;
export const MAX_BLOCKS = 120;
export const MAX_BLOCK_TEXT = 4_000;
export const MAX_SOURCES = 24;
export const MAX_TAGS = 12;

const trimmed = (min: number, max: number) =>
  z.string().trim().min(min).max(max);

/** Lowercase kebab slug. Rejects leading/trailing/double hyphens and any unicode. */
export const SlugSchema = z
  .string()
  .trim()
  .min(3)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug must be lowercase kebab-case");

/** `YYYY-MM-DD`, validated as a real calendar day. */
export const EditorialDateSchema = z
  .string()
  .refine(isEditorialDate, "expected a valid YYYY-MM-DD date");

/**
 * https-only URL. Blocking every other scheme here is what makes it safe to
 * render source links directly — `javascript:`, `data:` and `http:` never
 * reach the page.
 */
export const HttpsUrlSchema = z
  .string()
  .trim()
  .max(2_000)
  .refine((u) => {
    try {
      return new URL(u).protocol === "https:";
    } catch {
      return false;
    }
  }, "source URLs must be absolute https URLs");

// ---------------------------------------------------------------------------
// Body blocks
// ---------------------------------------------------------------------------

export const BlockSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("paragraph"),
    text: trimmed(1, MAX_BLOCK_TEXT),
  }),
  z.object({
    type: z.literal("heading"),
    // Only h2/h3 — the article's h1 is the headline, owned by the page.
    level: z.union([z.literal(2), z.literal(3)]),
    text: trimmed(1, 200),
  }),
  z.object({
    type: z.literal("list"),
    ordered: z.boolean().default(false),
    items: z.array(trimmed(1, 600)).min(1).max(20),
  }),
  z.object({
    type: z.literal("quote"),
    text: trimmed(1, 1_000),
    attribution: trimmed(1, 200).nullish(),
  }),
]);

export type Block = z.infer<typeof BlockSchema>;

// ---------------------------------------------------------------------------
// Sources
// ---------------------------------------------------------------------------

export const SourceSchema = z.object({
  title: trimmed(3, 300),
  publisher: trimmed(2, 120),
  url: HttpsUrlSchema,
  sourceType: z.enum(BLOG_SOURCE_TYPES),
  /** True for first-party/authoritative sources (Tier 1 in the editorial policy). */
  primary: z.boolean(),
  /** When the source itself was published, if the page states it. */
  publishedAt: EditorialDateSchema.nullish(),
  /** When the routine actually fetched it. Every stored URL must have been visited. */
  accessedAt: EditorialDateSchema,
});

export type Source = z.infer<typeof SourceSchema>;

// ---------------------------------------------------------------------------
// Per-locale editorial content
// ---------------------------------------------------------------------------

export const LocaleContentSchema = z.object({
  slug: SlugSchema,
  title: trimmed(10, 160),
  deck: trimmed(20, 320),
  summary: trimmed(40, 600),
  body: z.array(BlockSchema).min(1).max(MAX_BLOCKS),
  whyItMatters: z.array(trimmed(10, 600)).min(1).max(6),
  keyTakeaways: z.array(trimmed(5, 400)).min(1).max(6),
  seoTitle: trimmed(10, 70),
  metaDescription: trimmed(50, 165),
});

export type LocaleContent = z.infer<typeof LocaleContentSchema>;

// ---------------------------------------------------------------------------
// Image — metadata only. Promptea generates its own cover at render time, so
// this is reserved for an explicitly rights-cleared asset.
// ---------------------------------------------------------------------------

export const ImageSchema = z.object({
  url: HttpsUrlSchema,
  altEn: trimmed(5, 300),
  altEs: trimmed(5, 300),
  source: trimmed(2, 200),
  /** Free-text rights note. Required — an image with no stated rights is not usable. */
  rights: trimmed(2, 300),
  width: z.number().int().positive().max(10_000),
  height: z.number().int().positive().max(10_000),
});

export type BlogImage = z.infer<typeof ImageSchema>;

// ---------------------------------------------------------------------------
// One item of a multi-story digest. Each must independently satisfy same-day.
// ---------------------------------------------------------------------------

export const DigestItemSchema = z.object({
  titleEn: trimmed(5, 200),
  titleEs: trimmed(5, 200),
  eventDate: EditorialDateSchema,
});

export type DigestItem = z.infer<typeof DigestItemSchema>;

// ---------------------------------------------------------------------------
// The publish payload
// ---------------------------------------------------------------------------

export const PublishPayloadSchema = z
  .object({
    /** Must be `<editionPrefix>:<eventDate>`; cross-checked in superRefine. */
    idempotencyKey: z.string().trim().min(10).max(64),
    routineRunId: trimmed(4, 100),

    canonicalSlug: SlugSchema,
    /** The routine may only create drafts or published articles. */
    status: z.enum(["draft", "published"]),
    eventDate: EditorialDateSchema,

    /** Which edition this is. Defaults to the same-day news story. */
    edition: z.enum(BLOG_EDITIONS).default("daily"),

    /**
     * The window a weekly edition covers. Required for weekly-recap and
     * week-ahead, forbidden for daily.
     */
    coveredFrom: EditorialDateSchema.nullish(),
    coveredTo: EditorialDateSchema.nullish(),

    /**
     * Explicit, disclosed override for publishing a daily story about an
     * earlier event. Both fields must be supplied together; the reason is
     * rendered on the article so the reader always sees that the event date and
     * the publication date differ. The automated routine must never set this.
     */
    allowBackdate: z.boolean().default(false),
    backdateReason: trimmed(20, 400).nullish(),

    importance: z.enum(BLOG_IMPORTANCE),
    category: z.enum(BLOG_CATEGORIES),
    tags: z.array(trimmed(2, 40)).max(MAX_TAGS).default([]),
    companies: z.array(trimmed(2, 60)).max(MAX_TAGS).default([]),
    models: z.array(trimmed(2, 60)).max(MAX_TAGS).default([]),

    locales: z.object({
      en: LocaleContentSchema,
      es: LocaleContentSchema,
    }),

    sources: z.array(SourceSchema).min(1).max(MAX_SOURCES),

    /**
     * Required when a published article rests on a single source. Forces the
     * routine to state, in the article, what is officially announced versus
     * independently confirmed instead of silently publishing thin sourcing.
     */
    singleSourceJustification: trimmed(20, 600).nullish(),

    image: ImageSchema.nullish(),
    digestItems: z.array(DigestItemSchema).max(12).nullish(),

    /** Validate and report only — never writes to Firestore. */
    dryRun: z.boolean().default(false),
  })
  .superRefine((v, ctx) => {
    // --- idempotency key must be derived from the edition + event date -------
    const expectedKey = editionIdempotencyKey(v.eventDate, v.edition);
    if (v.idempotencyKey !== expectedKey) {
      ctx.addIssue({
        code: "custom",
        path: ["idempotencyKey"],
        message: `idempotencyKey must be "${expectedKey}" for a ${v.edition} edition dated ${v.eventDate}`,
      });
    }

    // --- edition-specific coverage window ------------------------------------
    if (v.edition === "daily") {
      if (v.coveredFrom || v.coveredTo) {
        ctx.addIssue({
          code: "custom",
          path: ["coveredFrom"],
          message: "a daily story covers one event and must not declare a coverage window",
        });
      }
    } else {
      if (!v.coveredFrom || !v.coveredTo) {
        ctx.addIssue({
          code: "custom",
          path: ["coveredFrom"],
          message: `a ${v.edition} edition must declare coveredFrom and coveredTo`,
        });
      } else {
        const expected =
          v.edition === "weekly-recap" ? recapWindow(v.eventDate) : weekAheadWindow(v.eventDate);
        if (v.coveredFrom !== expected.from || v.coveredTo !== expected.to) {
          ctx.addIssue({
            code: "custom",
            path: ["coveredFrom"],
            message: `a ${v.edition} dated ${v.eventDate} must cover ${expected.from} to ${expected.to}`,
          });
        }
      }
    }

    // --- backdating requires a stated, disclosable reason ---------------------
    if (v.allowBackdate) {
      if (v.edition !== "daily") {
        ctx.addIssue({
          code: "custom",
          path: ["allowBackdate"],
          message: "only a daily story can be backdated; weekly editions carry their run date",
        });
      }
      if (!v.backdateReason) {
        ctx.addIssue({
          code: "custom",
          path: ["backdateReason"],
          message:
            "backdateReason is required when allowBackdate is set — it is shown to readers on the article",
        });
      }
    } else if (v.backdateReason) {
      ctx.addIssue({
        code: "custom",
        path: ["allowBackdate"],
        message: "backdateReason was supplied without allowBackdate",
      });
    }

    // --- both locales must describe the SAME story --------------------------
    // Diverging source counts or takeaway counts is the usual symptom of two
    // independently generated articles rather than one translated story.
    if (v.locales.en.keyTakeaways.length !== v.locales.es.keyTakeaways.length) {
      ctx.addIssue({
        code: "custom",
        path: ["locales"],
        message: "en and es must have the same number of key takeaways (one story, two languages)",
      });
    }
    if (v.locales.en.whyItMatters.length !== v.locales.es.whyItMatters.length) {
      ctx.addIssue({
        code: "custom",
        path: ["locales"],
        message: "en and es must have the same number of 'why it matters' points",
      });
    }

    // --- locale slugs must not collide with each other ----------------------
    // Distinct per-locale slugs are fine and good for SEO; identical-to-each-
    // other is fine too (they live under different /[lang]/ prefixes).
    // What is NOT fine is a locale slug that duplicates a DIFFERENT article's,
    // which is checked against Firestore at write time.

    // --- sourcing rules, stricter for published -----------------------------
    if (v.status === "published") {
      const primaries = v.sources.filter((s) => s.primary);
      if (primaries.length === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["sources"],
          message: "a published article requires at least one primary source",
        });
      }
      if (v.sources.length < 2 && !v.singleSourceJustification) {
        ctx.addIssue({
          code: "custom",
          path: ["sources"],
          message:
            "a published article needs a second independent source, or singleSourceJustification explaining why none exists yet",
        });
      }
    }

    // --- digest items must each be same-day ---------------------------------
    if (v.digestItems && v.digestItems.length > 0) {
      for (const [i, item] of v.digestItems.entries()) {
        if (item.eventDate !== v.eventDate) {
          ctx.addIssue({
            code: "custom",
            path: ["digestItems", i, "eventDate"],
            message: `digest item ${i} has eventDate ${item.eventDate}, expected ${v.eventDate}`,
          });
        }
      }
    }
  });

export type PublishPayload = z.infer<typeof PublishPayloadSchema>;

// ---------------------------------------------------------------------------
// Correction payload — updates an existing article without changing its URL.
// ---------------------------------------------------------------------------

export const CorrectionPayloadSchema = z.object({
  canonicalSlug: SlugSchema,
  noteEn: trimmed(10, 800),
  noteEs: trimmed(10, 800),
  /** Optional replacement content; omitted fields keep their published values. */
  locales: z
    .object({ en: LocaleContentSchema.partial(), es: LocaleContentSchema.partial() })
    .nullish(),
});

export type CorrectionPayload = z.infer<typeof CorrectionPayloadSchema>;

// ---------------------------------------------------------------------------
// Stored + public shapes
// ---------------------------------------------------------------------------

/** What one article looks like once read back out of Firestore and normalized. */
export type BlogPost = {
  id: string;
  canonicalSlug: string;
  status: BlogStatus;
  edition: BlogEdition;
  eventDate: string;
  coveredFrom: string | null;
  coveredTo: string | null;
  backdateReason: string | null;
  publishedAt: string | null;
  updatedAt: string | null;
  importance: BlogImportance;
  category: BlogCategory;
  tags: string[];
  companies: string[];
  models: string[];
  author: string;
  editorialMethod: string;
  locales: Record<Lang, LocaleContent>;
  sources: Source[];
  image: BlogImage | null;
  digestItems: DigestItem[];
  singleSourceJustification: string | null;
  correction: { noteEn: string; noteEs: string; correctedAt: string | null } | null;
  readingMinutes: number;
};

/**
 * The public projection for one locale — what a page component receives.
 * Deliberately omits routineRunId, idempotencyKey and every other operational
 * field so internal editorial metadata never reaches the client bundle.
 */
export type PublicArticle = {
  canonicalSlug: string;
  slug: string;
  lang: Lang;
  status: "published" | "corrected";
  title: string;
  deck: string;
  summary: string;
  body: Block[];
  whyItMatters: string[];
  keyTakeaways: string[];
  seoTitle: string;
  metaDescription: string;
  edition: BlogEdition;
  eventDate: string;
  coveredFrom: string | null;
  coveredTo: string | null;
  /** Rendered as a visible notice when the event predates publication. */
  backdateReason: string | null;
  publishedAt: string | null;
  updatedAt: string | null;
  category: BlogCategory;
  importance: BlogImportance;
  tags: string[];
  companies: string[];
  models: string[];
  author: string;
  sources: Source[];
  image: BlogImage | null;
  digestItems: DigestItem[];
  singleSourceJustification: string | null;
  correction: { note: string; correctedAt: string | null } | null;
  readingMinutes: number;
  /** The counterpart slug in the other locale, for correct hreflang alternates. */
  alternateSlugs: Record<Lang, string>;
};

/** Feed card projection — no body, so listing pages stay small. */
export type ArticleCard = Pick<
  PublicArticle,
  | "canonicalSlug"
  | "slug"
  | "lang"
  | "title"
  | "deck"
  | "edition"
  | "eventDate"
  | "publishedAt"
  | "category"
  | "importance"
  | "tags"
  | "companies"
  | "models"
  | "readingMinutes"
  | "image"
>;
