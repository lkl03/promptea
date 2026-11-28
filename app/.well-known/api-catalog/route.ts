// /.well-known/api-catalog — RFC 9727 API catalog (v1.9.0). See lib/seo/apiCatalog.ts.

import { API_CATALOG_CONTENT_TYPE, apiCatalog } from "@/lib/seo/apiCatalog";
import { getSiteUrl } from "@/lib/seo/site";

export const dynamic = "force-static";

export function GET() {
  return new Response(JSON.stringify(apiCatalog(getSiteUrl()), null, 2) + "\n", {
    headers: {
      "Content-Type": API_CATALOG_CONTENT_TYPE,
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
