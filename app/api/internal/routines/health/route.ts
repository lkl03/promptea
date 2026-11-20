// app/api/internal/routines/health/route.ts
//
// v1.8.8 — read-only routine health.
//
//   GET /api/internal/routines/health
//   Authorization: Bearer <ROUTINE_HEALTH_SECRET or CRON_SECRET>
//
// Returns, for daily, morning, tech, weekly and newsletter: the last output,
// how many scheduled runs passed without one, how many are allowed, and
// whether the routine is overdue (lib/ops/routineHealth.ts). Reads Firestore,
// writes nothing, sends nothing. No subscriber data, no secrets.

import { NextRequest, NextResponse } from "next/server";
import { APP_VERSION } from "@/lib/version";
import { hasBearer, usableSecrets } from "@/lib/ops/auth";
import { evaluateRoutineHealth } from "@/lib/ops/routineHealth";
import { readRoutineActivity } from "@/lib/ops/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(body: Record<string, unknown>, status: number) {
  const res = NextResponse.json(body, { status });
  res.headers.set("x-app-version", APP_VERSION);
  res.headers.set("cache-control", "no-store");
  res.headers.set("x-robots-tag", "noindex");
  return res;
}

export async function GET(req: NextRequest) {
  const secrets = usableSecrets(process.env.ROUTINE_HEALTH_SECRET, process.env.CRON_SECRET);
  if (secrets.length === 0) return json({ ok: false, error: "health_disabled" }, 503);
  if (!hasBearer(req.headers.get("authorization"), secrets)) return json({ ok: false, error: "unauthorized" }, 401);

  try {
    const report = evaluateRoutineHealth(await readRoutineActivity(), new Date());
    return json({ ...report }, 200);
  } catch {
    return json({ ok: false, error: "storage_unavailable" }, 503);
  }
}
