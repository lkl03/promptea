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
import type { Locale } from "./site";

/** Most recent published articles of one locale (newest first). */
export async function loadArticles(lang: Locale, max = 500): Promise<PublicArticle[]> {
  try {
    return await listAllPublishedArticles(lang, max);
  } catch {
    return [];
  }
}

/** Published/sent weekly editions, newest first. */
export async function loadEditions(): Promise<NewsletterEdition[]> {
  try {
    return await listPublicEditions();
  } catch {
    return [];
  }
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
export async function loadBenchmarksAsOf(): Promise<string | null> {
  try {
    const snap = await getAdminFirestore().collection("benchmark_snapshots").doc("latest").get();
    const d = snap.exists ? snap.data() : null;
    const v = (typeof d?.asOf === "string" && d.asOf) || (typeof d?.fetchedAt === "string" && d.fetchedAt) || null;
    return v && !Number.isNaN(new Date(v).getTime()) ? v : null;
  } catch {
    return null;
  }
}
