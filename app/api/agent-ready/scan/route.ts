// app/api/agent-ready/scan/route.ts
//
// v1.9.0 — POST /api/agent-ready/scan { url } → a stream of scan events
// (newline-delimited JSON, lib/agentReady/types.ts ScanEvent), ending with
// `done` (the audit and, when it could be saved, its session id) or `error`.
//
// This endpoint makes our servers fetch a URL a stranger typed. Layers,
// cheapest first:
//   1. shape: JSON, ≤ 4 KB, `url` a string of at most 2,000 characters;
//   2. browsers on this site only: the Origin header must name this host (a
//      cross-site POST, a script without Origin and a crawler are all refused);
//   3. the URL is parsed and vetted before anything is fetched
//      (lib/agentReady/net/safeFetch.ts: scheme, port, credentials, host);
//   4. per instance: 5 scans a minute per client, and 6 a minute per audited
//      host, so nobody can aim this at one site in a loop;
//   5. per day, persisted: 25 scans per client and a global cap
//      (lib/agentReady/store.ts);
//   6. the scan itself: 12 requests at most, each one resolved, vetted and
//      connected by safeFetch, with byte and time limits.
// The engine is deterministic: no LLM is involved and nothing here costs money.

import { z } from "zod";

import { runAudit } from "@/lib/agentReady";
import { isSameOrigin, json, streamHeaders } from "@/lib/agentReady/http";
import { FETCH_LIMITS, SafeFetchError, parsePublicUrl } from "@/lib/agentReady/net/safeFetch";
import { createSession } from "@/lib/agentReady/session";
import { getAuditStore } from "@/lib/agentReady/store";
import type { ScanEvent } from "@/lib/agentReady/types";
import { clientKey, createRateLimiter } from "@/lib/rateLimit";
import { isBotUserAgent } from "@/lib/telemetry/bots";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BODY_BYTES = 4 * 1024;

const clientLimiter = createRateLimiter({ limit: 5, windowMs: 60_000 });
const targetLimiter = createRateLimiter({ limit: 6, windowMs: 60_000 });

const BodySchema = z.object({ url: z.string().trim().min(3).max(FETCH_LIMITS.maxUrlLength) });

export async function POST(req: Request) {
  if (!(req.headers.get("content-type") ?? "").includes("application/json")) return json({ error: "unsupported_content_type" }, 415);
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) return json({ error: "payload_too_large" }, 413);
  if (!isSameOrigin(req) || isBotUserAgent(req.headers.get("user-agent"))) return json({ error: "forbidden" }, 403);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return json({ error: "validation_error" }, 400);

  let target: URL;
  try {
    target = parsePublicUrl(parsed.data.url);
  } catch (err) {
    return json({ error: "url_refused", code: err instanceof SafeFetchError ? err.code : "invalid_url" }, 400);
  }

  const client = clientKey(req.headers);
  const gate = clientLimiter.check(client);
  if (!gate.allowed) return json({ error: "rate_limited", retryAfter: gate.retryAfterSec }, 429, { "Retry-After": String(gate.retryAfterSec) });
  const targetGate = targetLimiter.check(target.hostname);
  if (!targetGate.allowed) return json({ error: "target_busy", retryAfter: targetGate.retryAfterSec }, 429, { "Retry-After": String(targetGate.retryAfterSec) });

  const store = getAuditStore();
  const now = new Date();
  const quota = await store.reserveScan(client, now);
  if (!quota.ok) return json({ error: quota.reason }, 429);

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: ScanEvent | { type: "done"; audit: unknown; sessionId: string | null }) => {
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {
          /* the client went away: keep scanning so the session is still saved */
        }
      };
      try {
        const audit = await runAudit(target.toString(), {
          // `done` is sent below, once the session id is known.
          onEvent: (e) => {
            if (e.type !== "done") send(e);
          },
          now: () => now,
        });
        let sessionId: string | null = null;
        if (store.available()) {
          try {
            const session = createSession(audit, now);
            await store.save(session);
            sessionId = session.id;
          } catch (err) {
            console.warn("[agent-ready] session_not_saved", { message: err instanceof Error ? err.message : String(err) });
          }
        }
        send({ type: "done", audit, sessionId });
      } catch (err) {
        send({ type: "error", code: err instanceof SafeFetchError ? err.code : "scan_failed" });
        if (!(err instanceof SafeFetchError)) console.error("[agent-ready] scan_failed", { message: err instanceof Error ? err.message : String(err) });
      } finally {
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      }
    },
  });

  return new Response(stream, { status: 200, headers: streamHeaders() });
}
