// app/api/agent-ready/session/[id]/route.ts
//
// v1.9.0 — a saved audit, for the page that shows it.
//
//   GET   → the session (audit, plan, progress). The id is the credential.
//   PATCH → { plan?: CheckId[], progress?: { id: CheckId, done: boolean } }
//           same-origin only. The plan is reduced to check ids that are open in
//           this audit; nothing else about a session can be changed from here.
//
// Unknown and expired ids answer the same 404.

import { z } from "zod";

import { isSameOrigin, json } from "@/lib/agentReady/http";
import { isCheckId, isSessionId, openCheckIds, sanitizePlan } from "@/lib/agentReady/session";
import { getAuditStore } from "@/lib/agentReady/store";
import { clientKey, createRateLimiter } from "@/lib/rateLimit";

export const runtime = "nodejs";

const readLimiter = createRateLimiter({ limit: 60, windowMs: 60_000 });
const writeLimiter = createRateLimiter({ limit: 40, windowMs: 60_000 });

const PatchSchema = z
  .object({
    plan: z.array(z.string().max(40)).max(60).optional(),
    progress: z.object({ id: z.string().max(40), done: z.boolean() }).optional(),
  })
  .refine((b) => b.plan !== undefined || b.progress !== undefined);

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!isSessionId(id)) return json({ error: "not_found" }, 404);
  const gate = readLimiter.check(clientKey(req.headers));
  if (!gate.allowed) return json({ error: "rate_limited", retryAfter: gate.retryAfterSec }, 429, { "Retry-After": String(gate.retryAfterSec) });
  try {
    const session = await getAuditStore().get(id);
    return session ? json(session) : json({ error: "not_found" }, 404);
  } catch (err) {
    console.error("[agent-ready] session_read_failed", { message: err instanceof Error ? err.message : String(err) });
    return json({ error: "unavailable" }, 503);
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!isSessionId(id)) return json({ error: "not_found" }, 404);
  if (!isSameOrigin(req)) return json({ error: "forbidden" }, 403);
  if (Number(req.headers.get("content-length") ?? 0) > 4096) return json({ error: "payload_too_large" }, 413);
  const gate = writeLimiter.check(clientKey(req.headers));
  if (!gate.allowed) return json({ error: "rate_limited", retryAfter: gate.retryAfterSec }, 429, { "Retry-After": String(gate.retryAfterSec) });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return json({ error: "validation_error" }, 400);
  const { plan, progress } = parsed.data;
  if (progress && !isCheckId(progress.id)) return json({ error: "validation_error" }, 400);

  try {
    const now = new Date();
    const updated = await getAuditStore().update(id, (s) => {
      const next = { ...s, updatedAt: now.toISOString() };
      if (plan !== undefined) next.plan = sanitizePlan(plan, s.audit);
      if (progress && isCheckId(progress.id) && openCheckIds(s.audit).includes(progress.id)) {
        next.progress = { ...s.progress, [progress.id]: { done: progress.done, at: now.toISOString() } };
      }
      return next;
    }, now);
    return updated ? json(updated) : json({ error: "not_found" }, 404);
  } catch (err) {
    console.error("[agent-ready] session_write_failed", { message: err instanceof Error ? err.message : String(err) });
    return json({ error: "unavailable" }, 503);
  }
}
