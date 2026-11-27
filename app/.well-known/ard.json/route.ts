// /.well-known/ard.json — the AI Catalog (ARD): what agents can use on this domain. See lib/agentReady/discovery.ts.

import { AI_CATALOG_CONTENT_TYPE, DISCOVERY_CORS, aiCatalog } from "@/lib/agentReady/discovery";
import { getSiteUrl } from "@/lib/seo/site";

export const dynamic = "force-static";

export function GET() {
  return new Response(JSON.stringify(aiCatalog(getSiteUrl()), null, 2) + "\n", { headers: { ...DISCOVERY_CORS, "Content-Type": AI_CATALOG_CONTENT_TYPE } });
}
