// app/api/internal/ai/usage/route.ts
//
// v1.8.9 — read-only view of the Claude spend ledger (lib/ai/budget.ts).
//
//   GET /api/internal/ai/usage
//   Authorization: Bearer <ROUTINE_HEALTH_SECRET or CRON_SECRET>
//
// This month and today in USD, the caps in force, requests and tokens per
// feature. The numbers are Promptea's own ledger, which over-counts on purpose
// (worst case kept on timeouts); the Anthropic Console is the bill.

import { NextRequest, NextResponse } from "next/server";
import { APP_VERSION } from "@/lib/version";
import { hasBearer, usableSecrets } from "@/lib/ops/auth";
import { budgetLimits } from "@/lib/ai/budget";
import { getBudgetStore } from "@/lib/ai/budgetStore";
import { hasAnthropicKey } from "@/lib/ai/claude";
import { microsToUsd } from "@/lib/ai/pricing";

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
  if (secrets.length === 0) return json({ ok: false, error: "usage_disabled" }, 503);
  if (!hasBearer(req.headers.get("authorization"), secrets)) return json({ ok: false, error: "unauthorized" }, 401);

  const limits = budgetLimits();
  try {
    const s = await getBudgetStore().snapshot(new Date());
    const byFeature = Object.fromEntries(
      Object.entries(s.byFeature).map(([k, v]) => [k, { usd: microsToUsd(v?.spentMicros ?? 0), requests: v?.requests ?? 0 }])
    );
    return json(
      {
        ok: true,
        enabled: limits.enabled,
        keyConfigured: hasAnthropicKey(),
        month: s.month,
        day: s.day,
        spentUsd: { month: microsToUsd(s.monthSpentMicros), today: microsToUsd(s.daySpentMicros) },
        capsUsd: {
          monthlyBudget: microsToUsd(limits.monthlyBudgetMicros),
          monthlyStop: microsToUsd(limits.monthlyCapMicros),
          daily: microsToUsd(limits.dailyCapMicros),
        },
        remainingUsd: microsToUsd(Math.max(0, limits.monthlyCapMicros - s.monthSpentMicros)),
        userDailyLimits: limits.userDailyRequests,
        requests: s.monthRequests,
        byFeature,
        tokens: s.tokens,
      },
      200
    );
  } catch {
    return json({ ok: false, error: "storage_unavailable" }, 503);
  }
}
