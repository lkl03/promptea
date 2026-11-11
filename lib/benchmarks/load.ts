// lib/benchmarks/load.ts
//
// v1.7.0 — fetch, validate and serve benchmark data, degrading honestly.
//
// Order of preference:
//   1. live — OpenRouter answered, the envelope validated and at least one
//      ranking survived per-row validation. The result is persisted as the
//      "last valid snapshot".
//   2. stale — OpenRouter failed (no key, 401, 429, 5xx, timeout, malformed
//      or empty data): serve the last valid snapshot, with its age and the
//      failure reason, so the page can say how old the data is.
//   3. unavailable — no live data and no snapshot: the page shows an honest
//      empty state. Nothing is ever invented.
//
// Pure orchestration: fetch and the snapshot store are injected (tests run
// without network or Firestore). The API key is read on the server only and
// never leaves this module.

import { EnvelopeSchema } from "./schema";
import { buildSnapshot, type BenchmarksSnapshot } from "./normalize";
import { getBenchmarkDef } from "./catalog";
import { LANGS, type Lang } from "@/lib/domain";

export const OPENROUTER_BENCHMARKS_URL = "https://openrouter.ai/api/v1/benchmarks";
export const FETCH_TIMEOUT_MS = 8_000;
/** Upstream data changes a few times a day at most; 500 requests/day/account is the hard cap. */
export const REVALIDATE_SECONDS = 6 * 60 * 60;
export const MAX_ROWS_PER_TABLE = 100;

export type FetchFailure =
  | "not_configured"
  | "unauthorized"
  | "rate_limited"
  | "timeout"
  | "upstream_error"
  | "invalid_response"
  | "empty";

export type BenchmarksResult =
  | { status: "live"; snapshot: BenchmarksSnapshot }
  | { status: "stale"; snapshot: BenchmarksSnapshot; reason: FetchFailure }
  | { status: "unavailable"; reason: FetchFailure };

export interface SnapshotStore {
  read(): Promise<BenchmarksSnapshot | null>;
  write(snapshot: BenchmarksSnapshot): Promise<void>;
}

export type LoadDeps = {
  apiKey: string | null | undefined;
  fetchImpl?: typeof fetch;
  store?: SnapshotStore | null;
  now?: () => Date;
  timeoutMs?: number;
  log?: (event: string, meta: Record<string, unknown>) => void;
};

type FetchOutcome = { ok: true; snapshot: BenchmarksSnapshot } | { ok: false; reason: FetchFailure; status?: number };

function trim(snapshot: BenchmarksSnapshot): BenchmarksSnapshot {
  return { ...snapshot, tables: snapshot.tables.map((t) => ({ ...t, rows: t.rows.slice(0, MAX_ROWS_PER_TABLE) })) };
}

export async function fetchLive(deps: LoadDeps): Promise<FetchOutcome> {
  const key = (deps.apiKey ?? "").trim();
  if (!key) return { ok: false, reason: "not_configured" };

  const fetchImpl = deps.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), deps.timeoutMs ?? FETCH_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetchImpl(OPENROUTER_BENCHMARKS_URL, {
      headers: { Authorization: `Bearer ${key}`, Accept: "application/json", "X-Title": "Promptea" },
      signal: controller.signal,
      // Next.js data cache: at most one upstream call per window per deployment region.
      next: { revalidate: REVALIDATE_SECONDS, tags: ["benchmarks"] },
    } as RequestInit);
  } catch (err) {
    return { ok: false, reason: (err as { name?: string })?.name === "AbortError" ? "timeout" : "upstream_error" };
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 401 || res.status === 403) return { ok: false, reason: "unauthorized", status: res.status };
  if (res.status === 429) return { ok: false, reason: "rate_limited", status: 429 };
  if (!res.ok) return { ok: false, reason: "upstream_error", status: res.status };

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return { ok: false, reason: "invalid_response" };
  }
  const envelope = EnvelopeSchema.safeParse(body);
  if (!envelope.success) return { ok: false, reason: "invalid_response" };

  const snapshot = trim(buildSnapshot(envelope.data, (deps.now ?? (() => new Date()))()));
  if (snapshot.tables.length === 0) return { ok: false, reason: snapshot.totalRows > 0 ? "invalid_response" : "empty" };
  return { ok: true, snapshot };
}

export async function loadBenchmarks(deps: LoadDeps): Promise<BenchmarksResult> {
  const log = deps.log ?? (() => {});
  const live = await fetchLive(deps);

  if (live.ok) {
    if (deps.store) {
      try {
        await deps.store.write(live.snapshot);
      } catch {
        log("benchmarks_snapshot_write_failed", {});
      }
    }
    log("benchmarks_live", { tables: live.snapshot.tables.length, invalidRows: live.snapshot.invalidRows });
    return { status: "live", snapshot: live.snapshot };
  }

  log("benchmarks_fetch_failed", { reason: live.reason, status: live.status ?? null });
  if (deps.store) {
    try {
      const stored = await deps.store.read();
      const snapshot = stored ? rehydrateSnapshot(stored) : null;
      if (snapshot && snapshot.tables.length > 0) return { status: "stale", snapshot, reason: live.reason };
    } catch {
      log("benchmarks_snapshot_read_failed", {});
    }
  }
  return { status: "unavailable", reason: live.reason };
}

/**
 * v1.8.2 — a stored snapshot carries a COPY of each benchmark's texts (label,
 * metric, what it measures, limitations) as they were when it was saved. A
 * snapshot saved before a language existed has no text in it: read back under
 * /pt it gave `undefined` labels and crashed the markdown twin
 * (`/md/pt/benchmarks`) at build time, on any deployment that has the database
 * but not the upstream key.
 *
 * The catalog is the source of truth for those texts, so they are taken from it
 * again on read (by benchmark key). A key the catalog no longer knows keeps its
 * stored texts, with any missing language filled from English, so a text is
 * never `undefined`. Numbers, rows and dates are never touched.
 */
export function rehydrateSnapshot(snapshot: BenchmarksSnapshot): BenchmarksSnapshot {
  const fill = (text: Partial<Record<Lang, string>> | undefined): Record<Lang, string> => {
    const base = text?.en ?? text?.es ?? "";
    return Object.fromEntries(LANGS.map((l) => [l, text?.[l] ?? base])) as Record<Lang, string>;
  };
  return {
    ...snapshot,
    tables: (snapshot.tables ?? []).map((table) => {
      const stored = table.def;
      const current = getBenchmarkDef(stored.key, { metric: stored.metric === "f1" ? "f1_by_item" : "accuracy" });
      const def = current
        ? { ...stored, label: current.label, metricLabel: current.metricLabel, measures: current.measures, limitations: current.limitations }
        : { ...stored, label: fill(stored.label), metricLabel: fill(stored.metricLabel), measures: fill(stored.measures), limitations: fill(stored.limitations) };
      return { ...table, def };
    }),
  };
}

/** Age of a snapshot in whole hours (for "data from N hours ago"). */
export function snapshotAgeHours(snapshot: BenchmarksSnapshot, now: Date = new Date()): number {
  const t = Date.parse(snapshot.fetchedAt);
  return Number.isFinite(t) ? Math.max(0, Math.floor((now.getTime() - t) / 3_600_000)) : 0;
}
