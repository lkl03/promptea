// /api/mcp/server-card — the MCP Server Card (SEP-2127) of Promptea's per-audit MCP server.
// A static segment, so it wins over the dynamic /api/mcp/[session] route.

import { createHash } from "node:crypto";

import { DISCOVERY_CORS, SERVER_CARD_CONTENT_TYPE, serverCard } from "@/lib/agentReady/discovery";
import { getSiteUrl } from "@/lib/seo/site";

export const dynamic = "force-static";

export function GET() {
  const body = JSON.stringify(serverCard(getSiteUrl()), null, 2) + "\n";
  return new Response(body, {
    headers: { ...DISCOVERY_CORS, "Content-Type": SERVER_CARD_CONTENT_TYPE, ETag: `"${createHash("sha256").update(body).digest("hex").slice(0, 32)}"` },
  });
}
