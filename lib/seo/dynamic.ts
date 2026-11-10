// lib/seo/dynamic.ts
//
// Server-only loaders for the database-backed pieces of the public index.
// Every one of them degrades to "nothing" on any failure — a build without
// Firestore credentials, an outage, a missing collection — so a crawler-facing
// route (sitemap, llms.txt, markdown) never turns into a 500 because a
// dependency is down. The static content is always served.

import "server-only";

import { listAllPublishedArticles } from "@/lib/blog/server";
import type { PublicArticle } from "@/lib/blog/types";
import { getBenchmarks } from "@/lib/benchmarks/server";
import type { BenchmarksSnapshot } from "@/lib/benchmarks/normalize";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { listPublicEditions } from "@/lib/newsletter/server";
import type { NewsletterEdition } from "@/lib/newsletter/types";
import { type ContentLang } from "@/lib/domain";

/**
 * Short-lived per-instance memo. sitemap.xml, llms.txt, llms-full.txt (three
 * variants) and the markdown index all need the same Firestore listings; without
 * this each of them issues its own query on every revalidation. A failed load is
 * memoised for far less time than a good one, so an outage neither hammers the
 * database nor hides the content for long.
 */
export const SEO_MEMO_TTL_MS = 10 * 60 * 1000;
export const SEO_MEMO_FAILURE_TTL_MS = 30 * 1000;

type MemoEntry = { at: number; ttl: number; value: Promise<unknown> };
const memo = new Map<string, MemoEntry>();

/** Test helper: forget everything memoised. */
export function clearSeoMemo(): void {
  memo.clear();
}

async function memoised<T>(key: string, fallback: T, load: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = memo.get(key);
  if (hit && now - hit.at < hit.ttl) return hit.value as Promise<T>;

  const entry: MemoEntry = { at: now, ttl: SEO_MEMO_TTL_MS, value: Promise.resolve(fallback) };
  entry.value = Promise.resolve().then(load).catch(() => {
    entry.ttl = SEO_MEMO_FAILURE_TTL_MS;
    return fallback;
  });
  memo.set(key, entry);
  return entry.value as Promise<T>;
}

/** Most recent published articles of one content language (newest first). */
export function loadArticles(lang: ContentLang, max = 500): Promise<PublicArticle[]> {
  return memoised(`articles:${lang}:${max}`, [] as PublicArticle[], () => listAllPublishedArticles(lang, max));
}

/** Published/sent weekly editions, newest first. */
export function loadEditions(): Promise<NewsletterEdition[]> {
  return memoised("editions", [] as NewsletterEdition[], () => listPublicEditions());
}

/**
 * The full benchmarks snapshot (live, or the last valid one), or null.
 * Goes through the same loader the benchmarks page uses, so the Next data
 * cache keeps the upstream call to once per revalidation window.
 */
export async function loadBenchmarksSnapshot(): Promise<BenchmarksSnapshot | null> {
  try {
    const r = await getBenchmarks();
    return r.status === "unavailable" ? null : r.snapshot;
  } catch {
    return null;
  }
}

/**
 * When the stored benchmarks snapshot's data was last updated upstream
 * (`asOf`, else when it was fetched). One tiny Firestore read, no upstream
 * call and no write — cheap enough for the sitemap.
 */
export function loadBenchmarksAsOf(): Promise<string | null> {
  return memoised<string | null>("benchmarks-asof", null, async () => {
    const snap = await getAdminFirestore().collection("benchmark_snapshots").doc("latest").get();
    const d = snap.exists ? snap.data() : null;
    const v = (typeof d?.asOf === "string" && d.asOf) || (typeof d?.fetchedAt === "string" && d.fetchedAt) || null;
    return v && !Number.isNaN(new Date(v).getTime()) ? v : null;
  });
}
