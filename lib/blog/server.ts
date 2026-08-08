// lib/blog/server.ts
//
// v1.4.0 — server-only Firestore access for AI Daily.
//
// Mirrors the module shape already used by lib/telemetry/server.ts: a private
// collection constant, one exported async function per operation, fully typed
// inputs, no Firestore calls inlined into route handlers.
//
// Two invariants this module owns:
//   * Idempotency. The document id is derived from the editorial date, so a
//     retried routine run addresses the same document. Creation happens inside
//     a transaction that refuses to overwrite an already-published article.
//   * Public visibility. Every read path filters to published/corrected. A
//     draft or archived article is never returned to a page, the sitemap or
//     the feed.

import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import type { Query } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase/admin";
import {
  BLOG_AUTHOR,
  PUBLIC_BLOG_STATUSES,
  isPubliclyVisible,
} from "@/lib/domain";
import type { Lang } from "@/lib/domain";
import { dailyDocId, editorialDate } from "@/lib/blog/dates";
import { readingMinutes } from "@/lib/blog/render";
import type {
  ArticleCard,
  BlogPost,
  PublicArticle,
  PublishPayload,
} from "@/lib/blog/types";

const COLLECTION = "blog_posts";
const RUNS_COLLECTION = "blog_runs";

/** How the routine's editorial method is disclosed on every article. */
const EDITORIAL_METHOD = "ai-assisted-research-with-source-verification";

// ---------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------

function tsToIso(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  // A serverTimestamp that has not yet resolved reads back as null.
  return null;
}

function normalizePost(id: string, raw: Record<string, unknown>): BlogPost | null {
  const locales = raw.locales as BlogPost["locales"] | undefined;
  if (!locales?.en || !locales?.es) return null;

  return {
    id,
    canonicalSlug: String(raw.canonicalSlug ?? ""),
    status: raw.status as BlogPost["status"],
    eventDate: String(raw.eventDate ?? ""),
    publishedAt: tsToIso(raw.publishedAt),
    updatedAt: tsToIso(raw.updatedAt),
    importance: raw.importance as BlogPost["importance"],
    category: raw.category as BlogPost["category"],
    tags: (raw.tags as string[]) ?? [],
    companies: (raw.companies as string[]) ?? [],
    models: (raw.models as string[]) ?? [],
    author: String(raw.author ?? BLOG_AUTHOR),
    editorialMethod: String(raw.editorialMethod ?? EDITORIAL_METHOD),
    locales,
    sources: (raw.sources as BlogPost["sources"]) ?? [],
    image: (raw.image as BlogPost["image"]) ?? null,
    digestItems: (raw.digestItems as BlogPost["digestItems"]) ?? [],
    singleSourceJustification: (raw.singleSourceJustification as string | null) ?? null,
    correction: (raw.correction as BlogPost["correction"]) ?? null,
    readingMinutes: 0,
  };
}

/** Project a stored post into the public, locale-specific shape a page renders. */
export function toPublicArticle(post: BlogPost, lang: Lang): PublicArticle | null {
  if (!isPubliclyVisible(post.status)) return null;
  const content = post.locales[lang];
  if (!content) return null;

  return {
    canonicalSlug: post.canonicalSlug,
    slug: content.slug,
    lang,
    status: post.status as "published" | "corrected",
    title: content.title,
    deck: content.deck,
    summary: content.summary,
    body: content.body,
    whyItMatters: content.whyItMatters,
    keyTakeaways: content.keyTakeaways,
    seoTitle: content.seoTitle,
    metaDescription: content.metaDescription,
    eventDate: post.eventDate,
    publishedAt: post.publishedAt,
    updatedAt: post.updatedAt,
    category: post.category,
    importance: post.importance,
    tags: post.tags,
    companies: post.companies,
    models: post.models,
    author: post.author,
    sources: post.sources,
    image: post.image,
    digestItems: post.digestItems,
    singleSourceJustification: post.singleSourceJustification,
    correction: post.correction
      ? {
          note: lang === "en" ? post.correction.noteEn : post.correction.noteEs,
          correctedAt: post.correction.correctedAt,
        }
      : null,
    readingMinutes: readingMinutes(content.body),
    alternateSlugs: {
      en: post.locales.en.slug,
      es: post.locales.es.slug,
    },
  };
}

function toCard(article: PublicArticle): ArticleCard {
  return {
    canonicalSlug: article.canonicalSlug,
    slug: article.slug,
    lang: article.lang,
    title: article.title,
    deck: article.deck,
    eventDate: article.eventDate,
    publishedAt: article.publishedAt,
    category: article.category,
    importance: article.importance,
    tags: article.tags,
    companies: article.companies,
    models: article.models,
    readingMinutes: article.readingMinutes,
    image: article.image,
  };
}

/** Every slug this post occupies, so collisions are one query instead of three. */
function slugIndexFor(payload: Pick<PublishPayload, "canonicalSlug" | "locales">): string[] {
  return Array.from(
    new Set([payload.canonicalSlug, payload.locales.en.slug, payload.locales.es.slug])
  );
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

const publicStatuses = [...PUBLIC_BLOG_STATUSES];

/**
 * Newest-first page of published articles for one locale.
 * `cursorPublishedAt` is the ISO publishedAt of the last item on the previous
 * page — keyset pagination, so it stays correct as new articles are added.
 */
export async function listPublishedArticles(opts: {
  lang: Lang;
  limit: number;
  cursorPublishedAt?: string | null;
}): Promise<{ cards: ArticleCard[]; nextCursor: string | null }> {
  const db = getAdminFirestore();

  let query: Query = db
    .collection(COLLECTION)
    .where("status", "in", publicStatuses)
    .orderBy("publishedAt", "desc");

  if (opts.cursorPublishedAt) {
    const cursor = new Date(opts.cursorPublishedAt);
    if (!Number.isNaN(cursor.getTime())) {
      query = query.startAfter(Timestamp.fromDate(cursor));
    }
  }

  // Fetch one extra to know whether another page exists without a count query.
  const snap = await query.limit(opts.limit + 1).get();

  const cards: ArticleCard[] = [];
  for (const doc of snap.docs.slice(0, opts.limit)) {
    const post = normalizePost(doc.id, doc.data());
    if (!post) continue;
    const article = toPublicArticle(post, opts.lang);
    if (article) cards.push(toCard(article));
  }

  const hasMore = snap.docs.length > opts.limit;
  const last = cards[cards.length - 1];
  return {
    cards,
    nextCursor: hasMore && last?.publishedAt ? last.publishedAt : null,
  };
}

/**
 * Resolve one article by its locale slug.
 *
 * Uses the denormalized `slugIndex` array so a single-field index serves the
 * lookup, then filters in memory — the result set is at most one document.
 * Returns null for drafts and archived posts so they 404 publicly.
 */
export async function getArticleBySlug(lang: Lang, slug: string): Promise<PublicArticle | null> {
  const db = getAdminFirestore();

  const snap = await db
    .collection(COLLECTION)
    .where("slugIndex", "array-contains", slug)
    .limit(5)
    .get();

  for (const doc of snap.docs) {
    const post = normalizePost(doc.id, doc.data());
    if (!post) continue;
    // The slug must be THIS locale's slug — not the other locale's, and not
    // only the canonical one, so each locale has exactly one valid URL.
    if (post.locales[lang]?.slug !== slug) continue;
    const article = toPublicArticle(post, lang);
    if (article) return article;
  }

  return null;
}

/** Every published article, for the sitemap and the RSS feed. */
export async function listAllPublishedArticles(lang: Lang, max = 500): Promise<PublicArticle[]> {
  const db = getAdminFirestore();

  const snap = await db
    .collection(COLLECTION)
    .where("status", "in", publicStatuses)
    .orderBy("publishedAt", "desc")
    .limit(max)
    .get();

  const out: PublicArticle[] = [];
  for (const doc of snap.docs) {
    const post = normalizePost(doc.id, doc.data());
    if (!post) continue;
    const article = toPublicArticle(post, lang);
    if (article) out.push(article);
  }
  return out;
}

/** Read one post by its editorial date, regardless of status. Used by the routine. */
export async function getPostByDate(date: string): Promise<BlogPost | null> {
  const db = getAdminFirestore();
  const snap = await db.collection(COLLECTION).doc(dailyDocId(date)).get();
  if (!snap.exists) return null;
  return normalizePost(snap.id, snap.data() as Record<string, unknown>);
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export type PublishOutcome =
  | { outcome: "published"; id: string; canonicalSlug: string }
  | { outcome: "already_published"; id: string; canonicalSlug: string }
  | { outcome: "slug_conflict"; conflictingId: string; slug: string };

/**
 * Create today's article, exactly once.
 *
 * The whole operation runs in a transaction: it reads the target document and
 * the slug index, then writes only if nothing conflicts. A retry after a
 * network failure therefore cannot produce a second article, and a routine bug
 * cannot silently rewrite a published story.
 */
export async function publishPost(
  payload: PublishPayload,
  meta: { publishedAtDate?: Date }
): Promise<PublishOutcome> {
  const db = getAdminFirestore();
  const docId = dailyDocId(payload.eventDate);
  const ref = db.collection(COLLECTION).doc(docId);
  const slugIndex = slugIndexFor(payload);
  const now = meta.publishedAtDate ?? new Date();

  return db.runTransaction(async (tx) => {
    // ---- all reads first (Firestore transaction requirement) ----
    const existing = await tx.get(ref);
    const collisions = await tx.get(
      db.collection(COLLECTION).where("slugIndex", "array-contains-any", slugIndex)
    );

    if (existing.exists) {
      const current = existing.data() as Record<string, unknown>;
      const status = current.status as string;
      // Never overwrite an already-public article from a routine retry.
      if (isPubliclyVisible(status)) {
        return {
          outcome: "already_published" as const,
          id: docId,
          canonicalSlug: String(current.canonicalSlug ?? payload.canonicalSlug),
        };
      }
    }

    for (const doc of collisions.docs) {
      if (doc.id === docId) continue;
      const other = doc.data() as Record<string, unknown>;
      const otherSlugs = (other.slugIndex as string[]) ?? [];
      const hit = slugIndex.find((s) => otherSlugs.includes(s));
      if (hit) {
        return { outcome: "slug_conflict" as const, conflictingId: doc.id, slug: hit };
      }
    }

    // ---- writes ----
    const doc = {
      canonicalSlug: payload.canonicalSlug,
      slugIndex,
      status: payload.status,
      eventDate: payload.eventDate,

      importance: payload.importance,
      category: payload.category,
      tags: payload.tags,
      companies: payload.companies,
      models: payload.models,

      author: BLOG_AUTHOR,
      editorialMethod: EDITORIAL_METHOD,

      locales: payload.locales,
      sources: payload.sources,
      singleSourceJustification: payload.singleSourceJustification ?? null,
      image: payload.image ?? null,
      digestItems: payload.digestItems ?? [],
      correction: null,

      publication: {
        routineRunId: payload.routineRunId,
        idempotencyKey: payload.idempotencyKey,
        // Reserved for the newsletter release; nothing sends email today.
        emailSent: false,
        emailSentAt: null,
      },

      publishedAt: payload.status === "published" ? Timestamp.fromDate(now) : null,
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    };

    tx.set(ref, doc);

    return { outcome: "published" as const, id: docId, canonicalSlug: payload.canonicalSlug };
  });
}

/**
 * Apply a correction to an already-published article.
 * Keeps the same document, same canonical URL and same publishedAt; moves the
 * status to `corrected`, stamps `updatedAt`, and records a visible note.
 * History is never rewritten silently.
 */
export async function applyCorrection(input: {
  canonicalSlug: string;
  noteEn: string;
  noteEs: string;
}): Promise<{ ok: boolean; id?: string }> {
  const db = getAdminFirestore();

  const snap = await db
    .collection(COLLECTION)
    .where("canonicalSlug", "==", input.canonicalSlug)
    .limit(1)
    .get();

  if (snap.empty) return { ok: false };

  const ref = snap.docs[0].ref;
  await ref.set(
    {
      status: "corrected",
      correction: {
        noteEn: input.noteEn,
        noteEs: input.noteEs,
        correctedAt: Timestamp.fromDate(new Date()),
      },
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return { ok: true, id: snap.docs[0].id };
}

// ---------------------------------------------------------------------------
// Run log — privacy-safe operational record of each routine execution.
// Deliberately stores no scraped source bodies, no secrets and no reasoning.
// ---------------------------------------------------------------------------

export async function recordRun(input: {
  runId: string;
  status: string;
  candidateCount?: number;
  selectedCategory?: string | null;
  selectedImportance?: string | null;
  sourceCount?: number;
  articleId?: string | null;
  errorCode?: string | null;
}): Promise<{ ok: true }> {
  const db = getAdminFirestore();
  const date = editorialDate();

  await db
    .collection(RUNS_COLLECTION)
    .doc(`${date}_${input.runId}`)
    .set(
      {
        runId: input.runId,
        date,
        status: input.status,
        candidateCount: input.candidateCount ?? null,
        selectedCategory: input.selectedCategory ?? null,
        selectedImportance: input.selectedImportance ?? null,
        sourceCount: input.sourceCount ?? null,
        articleId: input.articleId ?? null,
        errorCode: input.errorCode ?? null,
        completedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

  return { ok: true };
}
