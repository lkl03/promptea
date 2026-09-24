// lib/newsletter/types.ts
//
// Promptea Weekly newsletter contract.
//
// Same principles as lib/blog/types.ts: Zod schemas are the single boundary
// between what the editorial routine produces and what Promptea stores or
// sends. Every field has a size ceiling so an oversized payload is a 400,
// not an OOM.

import { z } from "zod";

// ---------------------------------------------------------------------------
// Helpers (mirroring the trimmed helper in blog/types.ts)
// ---------------------------------------------------------------------------

const trimmed = (min: number, max: number) =>
  z.string().trim().min(min).max(max);

const httpsUrl = z
  .string()
  .trim()
  .max(2_000)
  .refine((u) => {
    try {
      return new URL(u).protocol === "https:";
    } catch {
      return false;
    }
  }, "URLs must be absolute https URLs");

// ---------------------------------------------------------------------------
// Newsletter story (one item in the weekly digest)
// ---------------------------------------------------------------------------

export const NewsletterStorySchema = z.object({
  articleSlug: trimmed(3, 80),
  headline: trimmed(5, 160),
  summary: trimmed(20, 600),
  whyItMatters: trimmed(10, 400),
  sourceUrl: httpsUrl,
  category: trimmed(2, 60),
});

export type NewsletterStory = z.infer<typeof NewsletterStorySchema>;

// ---------------------------------------------------------------------------
// Newsletter tool (a tool/launch highlight)
// ---------------------------------------------------------------------------

export const NewsletterToolSchema = z.object({
  title: trimmed(2, 120),
  description: trimmed(10, 300),
  url: httpsUrl,
});

export type NewsletterTool = z.infer<typeof NewsletterToolSchema>;

// ---------------------------------------------------------------------------
// Per-locale content
// ---------------------------------------------------------------------------

export const NewsletterLocaleContentSchema = z.object({
  subject: trimmed(5, 200),
  preheader: trimmed(5, 300),
  heroHeadline: trimmed(5, 200),
  heroDeck: trimmed(10, 400),
  // v1.6.0: a quiet week is sent as it is. The v1.5 minimums (4 stories,
  // 3 tools) forced padding with a placeholder story whose link 404ed.
  topStories: z.array(NewsletterStorySchema).min(1).max(6),
  tools: z.array(NewsletterToolSchema).min(0).max(5),
  editorialTitle: trimmed(5, 200).nullable(),
  editorialBody: trimmed(20, 4_000).nullable(),
});

export type NewsletterLocaleContent = z.infer<typeof NewsletterLocaleContentSchema>;

// ---------------------------------------------------------------------------
// Sponsor slot
// ---------------------------------------------------------------------------

export const NewsletterSponsorSchema = z.object({
  name: trimmed(2, 120),
  copy: trimmed(10, 600),
  url: httpsUrl,
  label: trimmed(2, 60),
});

export type NewsletterSponsor = z.infer<typeof NewsletterSponsorSchema>;

// ---------------------------------------------------------------------------
// Full edition document
// ---------------------------------------------------------------------------

/** Edition id format: `promptea-weekly_YYYY-MM-DD` where the date is the Monday. */
const editionIdPattern = /^promptea-weekly_\d{4}-\d{2}-\d{2}$/;

export const NewsletterEditionSchema = z.object({
  editionId: z
    .string()
    .trim()
    .min(10)
    .max(40)
    .regex(editionIdPattern, "editionId must be promptea-weekly_YYYY-MM-DD"),
  weekStart: trimmed(10, 10),
  weekEnd: trimmed(10, 10),
  status: z.enum(["draft", "published", "sent"]),
  locales: z.object({
    en: NewsletterLocaleContentSchema,
    es: NewsletterLocaleContentSchema,
  }),
  sponsor: NewsletterSponsorSchema.nullable(),
  generatedAt: z.string().nullable(),
  publishedAt: z.string().nullable(),
  sentAt: z.string().nullable(),
});

export type NewsletterEdition = z.infer<typeof NewsletterEditionSchema>;

// ---------------------------------------------------------------------------
// Subscriber
// ---------------------------------------------------------------------------

export const NewsletterSubscriberSchema = z.object({
  email: z.string().trim().min(5).max(320).toLowerCase(),
  emailHash: trimmed(64, 64),
  lang: z.enum(["en", "es"]),
  subscribedAt: z.string(),
  unsubscribeToken: trimmed(64, 64),
  status: z.enum(["active", "unsubscribed"]),
});

export type NewsletterSubscriber = z.infer<typeof NewsletterSubscriberSchema>;

// ---------------------------------------------------------------------------
// Subscribe API input
// ---------------------------------------------------------------------------

export const SubscribeRequestSchema = z.object({
  email: z.string().trim().min(5).max(320).email("invalid email address"),
  lang: z.enum(["en", "es"]),
  consent: z.literal(true, {
    message: "consent must be true",
  }),
});

export type SubscribeRequest = z.infer<typeof SubscribeRequestSchema>;
