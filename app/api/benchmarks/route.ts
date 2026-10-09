// app/api/benchmarks/route.ts
//
// v1.7.0 — public, read-only status of the benchmark data: whether the page
// is serving live data, the last valid snapshot, or nothing, plus dates and
// per-benchmark leaders. Used by the weekly maintenance routine to check the
// benchmarks feed without scraping HTML. Never exposes the API key.

import { NextResponse } from "next/server";
import { getBenchmarks } from "@/lib/benchmarks/server";
import { snapshotAgeHours } from "@/lib/benchmarks/load";
import { frontierModels } from "@/lib/benchmarks/normalize";
import { APP_VERSION } from "@/lib/version";

export const runtime = "nodejs";
export const revalidate = 3600;

export async function GET() {
  const result = await getBenchmarks();
  const snapshot = result.status === "unavailable" ? null : result.snapshot;
  const body = {
    status: result.status,
    reason: result.status === "live" ? null : result.reason,
    asOf: snapshot?.asOf ?? null,
    fetchedAt: snapshot?.fetchedAt ?? null,
    ageHours: snapshot ? snapshotAgeHours(snapshot) : null,
    invalidRows: snapshot?.invalidRows ?? null,
    benchmarks: (snapshot?.tables ?? []).map((t) => ({
      key: t.def.key,
      source: t.def.source,
      metric: t.def.metric,
      models: t.rows.length,
      leader: t.rows[0] ? { modelId: t.rows[0].modelId, name: t.rows[0].name, value: t.rows[0].value } : null,
    })),
    frontier: snapshot ? frontierModels(snapshot).map((m) => m.modelId) : [],
  };
  const res = NextResponse.json(body);
  res.headers.set("x-app-version", APP_VERSION);
  res.headers.set("cache-control", "public, s-maxage=3600, stale-while-revalidate=600");
  return res;
}
