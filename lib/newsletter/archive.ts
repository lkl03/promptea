// lib/newsletter/archive.ts
//
// v1.7.0 — the public Promptea Weekly archive, as pure functions over stored
// edition documents (no Firestore here, so the rules are tested exactly).
//
// Visibility rule: an edition is public once it is `published` or `sent`.
// Drafts never appear. Publication and delivery are separate states — an
// edition can be published on the site without ever being emailed (the
// `publish` run mode), and a delivered edition is always public.

import { NewsletterEditionSchema, type NewsletterEdition } from "./types";
import { editionMonday } from "./paths";

export type EditionSummary = {
  editionId: string;
  monday: string;
  weekStart: string;
  weekEnd: string;
  status: "published" | "sent";
  publishedAt: string | null;
  sentAt: string | null;
  stories: { en: number; es: number };
  headline: { en: string; es: string };
  deck: { en: string; es: string };
};

/** Drop Firestore bookkeeping (Timestamps are not serializable to client islands). */
export function stripEditionMeta(data: Record<string, unknown>): Record<string, unknown> {
  const { updatedAt: _u, createdAt: _c, ...rest } = data;
  void _u;
  void _c;
  return rest;
}

/** A stored document as a valid public edition, or null (draft, malformed, or wrong id). */
export function toPublicEdition(data: Record<string, unknown>): NewsletterEdition | null {
  const parsed = NewsletterEditionSchema.safeParse(stripEditionMeta(data));
  if (!parsed.success) return null;
  const e = parsed.data;
  if (e.status !== "published" && e.status !== "sent") return null;
  if (!editionMonday(e.editionId)) return null;
  return e;
}

/** Newest edition first (edition ids embed the Monday, so id order is date order). */
export function sortEditionsNewestFirst<T extends { editionId: string }>(editions: T[]): T[] {
  return [...editions].sort((a, b) => b.editionId.localeCompare(a.editionId));
}

export function summarizeEdition(e: NewsletterEdition): EditionSummary {
  return {
    editionId: e.editionId,
    monday: editionMonday(e.editionId) ?? e.weekEnd,
    weekStart: e.weekStart,
    weekEnd: e.weekEnd,
    status: e.status as "published" | "sent",
    publishedAt: e.publishedAt,
    sentAt: e.sentAt,
    stories: { en: e.locales.en.topStories.length, es: e.locales.es.topStories.length },
    headline: { en: e.locales.en.heroHeadline, es: e.locales.es.heroHeadline },
    deck: { en: e.locales.en.heroDeck, es: e.locales.es.heroDeck },
  };
}
