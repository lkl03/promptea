// /.well-known/ai-catalog.json — the predecessor path of /.well-known/ard.json, still what the
// MCP discovery docs and Cloudflare's scanner read. Same document.

import { AI_CATALOG_CONTENT_TYPE, DISCOVERY_CORS, aiCatalog } from "@/lib/agentReady/discovery";
import { getSiteUrl } from "@/lib/seo/site";

export const dynamic = "force-static";

export function GET() {
  return new Response(JSON.stringify(aiCatalog(getSiteUrl()), null, 2) + "\n", { headers: { ...DISCOVERY_CORS, "Content-Type": AI_CATALOG_CONTENT_TYPE } });
}
