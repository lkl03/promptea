// app/api/mcp/[session]/route.ts
//
// v1.9.0 — Promptea's remote MCP server (Streamable HTTP, stateless), one per
// Agent-Ready audit session: https://www.promptea.me/api/mcp/<session id>.
//
// The session id in the URL is the credential (128 random bits, 14-day life).
// The logic and its safety rules are in lib/agentReady/mcp.ts; this file maps
// them to MCP tools with mcp-handler 2.x (MCP SDK v2).
//
// Per instance: 90 requests a minute per client, 6 rechecks a minute per client.

import { createMcpHandler } from "mcp-handler";
import { z } from "zod";

import { runAudit } from "@/lib/agentReady";
import { json } from "@/lib/agentReady/http";
import { MCP_INSTRUCTIONS, MCP_SERVER_NAME, ToolError, getAudit, getFixTool, listFixes, markFixDone, recheck, type ToolDeps } from "@/lib/agentReady/mcp";
import { SafeFetchError } from "@/lib/agentReady/net/safeFetch";
import { isSessionId } from "@/lib/agentReady/session";
import { getAuditStore } from "@/lib/agentReady/store";
import { CHECK_IDS } from "@/lib/agentReady/types";
import { clientKey, createRateLimiter } from "@/lib/rateLimit";
import { APP_VERSION } from "@/lib/version";

export const runtime = "nodejs";
export const maxDuration = 60;

const requestLimiter = createRateLimiter({ limit: 90, windowMs: 60_000 });
const recheckLimiter = createRateLimiter({ limit: 6, windowMs: 60_000 });

type ToolResult = { content: Array<{ type: "text"; text: string }>; isError?: boolean };

const ok = (data: unknown): ToolResult => ({ content: [{ type: "text", text: JSON.stringify(data, null, 2) }] });

async function run(fn: () => Promise<unknown>): Promise<ToolResult> {
  try {
    return ok(await fn());
  } catch (err) {
    if (err instanceof ToolError) return { isError: true, content: [{ type: "text", text: JSON.stringify({ error: err.code, message: err.message }) }] };
    if (err instanceof SafeFetchError) return { isError: true, content: [{ type: "text", text: JSON.stringify({ error: "scan_failed", code: err.code, message: "The site could not be fetched right now." }) }] };
    console.error("[agent-ready] mcp_tool_failed", { message: err instanceof Error ? err.message : String(err) });
    return { isError: true, content: [{ type: "text", text: JSON.stringify({ error: "internal", message: "The tool failed. Try again." }) }] };
  }
}

const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } as const;
const FIX_ID = z.enum(CHECK_IDS).describe("A fix id from list_fixes, for example markdown.negotiation");

function handlerFor(sessionId: string, client: string) {
  const deps: ToolDeps = { store: getAuditStore(), runAudit: (url) => runAudit(url) };
  return createMcpHandler(
    (server) => {
      server.registerTool(
        "get_audit",
        { title: "Get the audit", description: "The Agent-Ready audit of the user's site: score (0-100), level, score per category, the status of each of the 21 checks, the detected stack and how many fixes are open. Start here.", inputSchema: z.object({}), annotations: READ_ONLY },
        () => run(() => getAudit(deps, sessionId)),
      );
      server.registerTool(
        "list_fixes",
        { title: "List the fixes", description: "The open fixes in the order to work on them: the user's own plan first, then by points to gain. Each has its id, title, effort (S/M/L), points and whether it is marked done.", inputSchema: z.object({}), annotations: READ_ONLY },
        () => run(() => listFixes(deps, sessionId)),
      );
      server.registerTool(
        "get_fix",
        {
          title: "Get one fix",
          description: "Everything needed to implement one fix: why it matters, step-by-step instructions, the files to create or edit with code, and an acceptance command that proves it works. Recipes exist for Next.js App Router (`next-app`) and stack-agnostic (`generic`); the audit's detected stack is used unless `stack` is given.",
          inputSchema: z.object({ id: FIX_ID, stack: z.enum(["next-app", "generic"]).optional().describe("Override the recipe's stack") }),
          annotations: READ_ONLY,
        },
        (input) => run(() => getFixTool(deps, sessionId, input)),
      );
      server.registerTool(
        "mark_fix_done",
        {
          title: "Mark a fix done",
          description: "Record that a fix has been implemented (or, with done=false, reopen it), so the user sees the progress on Promptea. Call it after the fix's acceptance command passes. Only changes this audit session.",
          inputSchema: z.object({ id: FIX_ID, done: z.boolean().optional().describe("Defaults to true") }),
          annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
        },
        (input) => run(() => markFixDone(deps, sessionId, input)),
      );
      server.registerTool(
        "recheck",
        {
          title: "Re-scan the site",
          description: "Scan the audited page again and update this session: the new score and which checks changed. It scans the LIVE site, so call it after the changes are deployed. Takes no arguments: the URL is the one this audit was made for. Limited to once every 20 seconds and 30 times per session.",
          inputSchema: z.object({}),
          annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
        },
        () =>
          run(async () => {
            const gate = recheckLimiter.check(client);
            if (!gate.allowed) throw new ToolError("rate_limited", `Too many rechecks. Try again in ${gate.retryAfterSec} seconds.`);
            return recheck(deps, sessionId);
          }),
      );
    },
    { serverInfo: { name: MCP_SERVER_NAME, version: APP_VERSION }, instructions: MCP_INSTRUCTIONS },
  );
}

type Ctx = { params: Promise<{ session: string }> };

async function handle(req: Request, ctx: Ctx): Promise<Response> {
  const { session } = await ctx.params;
  // Unknown ids are answered by the tools (session_not_found), so a client can still connect and read why.
  if (!isSessionId(session)) return json({ error: "not_found" }, 404);
  const client = clientKey(req.headers);
  const gate = requestLimiter.check(client);
  if (!gate.allowed) return json({ error: "rate_limited", retryAfter: gate.retryAfterSec }, 429, { "Retry-After": String(gate.retryAfterSec) });
  const res = await handlerFor(session, client)(req);
  res.headers.set("cache-control", "no-store");
  res.headers.set("x-robots-tag", "noindex, nofollow");
  return res;
}

export { handle as GET, handle as POST, handle as DELETE };
