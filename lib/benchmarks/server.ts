// lib/benchmarks/server.ts
//
// v1.7.0 — server-only wiring for benchmarks: the OpenRouter key from the
// environment and the "last valid snapshot" in Firestore
// (benchmark_snapshots/latest). The key is never sent to the client.

import "server-only";

import { cache } from "react";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { loadBenchmarks, type BenchmarksResult, type SnapshotStore } from "./load";
import type { BenchmarksSnapshot } from "./normalize";

const SNAPSHOT_DOC = ["benchmark_snapshots", "latest"] as const;
/** Re-persist an unchanged snapshot at most this often (keeps writes rare). */
const MIN_REWRITE_MS = 6 * 60 * 60 * 1000;

function firestoreSnapshotStore(): SnapshotStore | null {
  let db: ReturnType<typeof getAdminFirestore>;
  try {
    db = getAdminFirestore();
  } catch {
    return null; // no service account (local build): live data only, no fallback
  }
  const ref = db.collection(SNAPSHOT_DOC[0]).doc(SNAPSHOT_DOC[1]);
  return {
    async read() {
      const snap = await ref.get();
      if (!snap.exists) return null;
      const json = snap.data()?.json;
      return typeof json === "string" ? (JSON.parse(json) as BenchmarksSnapshot) : null;
    },
    async write(snapshot) {
      const prev = await ref.get();
      const d = prev.exists ? prev.data() : null;
      const sameData = d?.asOf === snapshot.asOf && d?.tableCount === snapshot.tables.length;
      const recent = typeof d?.fetchedAt === "string" && Date.now() - Date.parse(d.fetchedAt) < MIN_REWRITE_MS;
      if (sameData && recent) return;
      // Stored as one JSON string: the nested tables are read back whole, never queried.
      await ref.set({
        json: JSON.stringify(snapshot),
        asOf: snapshot.asOf,
        fetchedAt: snapshot.fetchedAt,
        tableCount: snapshot.tables.length,
        updatedAt: FieldValue.serverTimestamp(),
      });
    },
  };
}

export const getBenchmarks = cache(async (): Promise<BenchmarksResult> => {
  return loadBenchmarks({
    apiKey: process.env.OPENROUTER_API_KEY,
    store: firestoreSnapshotStore(),
    log: (event, meta) => console.log(`[benchmarks] ${event}`, meta),
  });
});
