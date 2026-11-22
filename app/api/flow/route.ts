// app/api/flow/route.ts
//
// v1.8.9 — POST /api/flow { task, lang } → FlowPlan (lib/flow/types.ts).
//
// The only public endpoint that can spend Claude credits on a visitor's
// request. Layers, cheapest first:
//   1. shape: JSON, ≤ 32 KB, task 12–4,000 characters;
//   2. a cross-site POST (Origin of another site) is refused (403);
//   3. 6 requests a minute per client and instance (429), like /api/analyze;
//   4. crawlers, automation and non-browser clients (no Origin header) get the
//      basic plan: never an AI call;
//   5. lib/ai/claude.ts: the visitor's daily quota, the daily and monthly caps
//      (persisted in Firestore), bounded max_tokens and timeout.
// Whatever happens after step 3, the answer is a usable plan: when Claude is
// not available the basic plan comes back with a `notice` the page explains.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { LANGS, isLang, type Lang } from "@/lib/domain";
import { clientKey, createRateLimiter } from "@/lib/rateLimit";
import { isBotUserAgent } from "@/lib/telemetry/bots";
import { buildFlowPlan } from "@/lib/flow/plan";
import { FLOW_LIMITS } from "@/lib/flow/types";
import { APP_VERSION } from "@/lib/version";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BODY_BYTES = 32 * 1024;

export const FLOW_RATE_LIMIT = { limit: 6, windowMs: 60_000 };
const rateLimiter = createRateLimiter(FLOW_RATE_LIMIT);

const BodySchema = z.object({
  task: z.string().trim().min(FLOW_LIMITS.minTaskChars).max(FLOW_LIMITS.maxTaskChars),
  lang: z.enum(LANGS).optional(),
});

function json(body: unknown, status: number, extra: Record<string, string> = {}) {
  const res = NextResponse.json(body, { status });
  res.headers.set("cache-control", "no-store");
  res.headers.set("x-app-version", APP_VERSION);
  res.headers.set("x-robots-tag", "noindex");
  for (const [k, v] of Object.entries(extra)) res.headers.set(k, v);
  return res;
}

/** The Origin header names this same host (browsers always send it on a fetch POST). */
export function isSameOrigin(origin: string, req: NextRequest): boolean {
  try {
    const host = (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? req.nextUrl.host).split(",")[0]!.trim();
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function inferLang(req: NextRequest, bodyLang: unknown): Lang {
  const h = req.headers.get("x-ui-lang");
  if (isLang(h)) return h;
  return isLang(bodyLang) ? bodyLang : "es";
}

export async function POST(req: NextRequest) {
  if (!(req.headers.get("content-type") ?? "").includes("application/json")) {
    return json({ error: "unsupported_content_type" }, 415);
  }
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
    return json({ error: "payload_too_large" }, 413);
  }

  const origin = req.headers.get("origin");
  if (origin && !isSameOrigin(origin, req)) return json({ error: "forbidden" }, 403);

  const key = clientKey(req.headers);
  const gate = rateLimiter.check(key);
  if (!gate.allowed) {
    return json({ error: "rate_limited", retryAfter: gate.retryAfterSec }, 429, { "Retry-After": String(gate.retryAfterSec) });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return json({ error: "validation_error" }, 400);

  const lang = inferLang(req, parsed.data.lang);
  const llmAllowed = Boolean(origin) && !isBotUserAgent(req.headers.get("user-agent"));

  const plan = await buildFlowPlan({ task: parsed.data.task, lang, userKey: key, llmAllowed, signal: req.signal });
  return json(plan, 200);
}
