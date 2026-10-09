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
      const snapshot = await deps.store.read();
      if (snapshot && snapshot.tables.length > 0) return { status: "stale", snapshot, reason: live.reason };
    } catch {
      log("benchmarks_snapshot_read_failed", {});
    }
  }
  return { status: "unavailable", reason: live.reason };
}

/** Age of a snapshot in whole hours (for "data from N hours ago"). */
export function snapshotAgeHours(snapshot: BenchmarksSnapshot, now: Date = new Date()): number {
  const t = Date.parse(snapshot.fetchedAt);
  return Number.isFinite(t) ? Math.max(0, Math.floor((now.getTime() - t) / 3_600_000)) : 0;
}
