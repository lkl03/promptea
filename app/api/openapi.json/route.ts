// /api/openapi.json — OpenAPI 3.1 description of the public read-only API (v1.9.0).

import { openApiDocument } from "@/lib/seo/apiCatalog";
import { getSiteUrl } from "@/lib/seo/site";

export const dynamic = "force-static";

export function GET() {
  return new Response(JSON.stringify(openApiDocument(getSiteUrl()), null, 2) + "\n", {
    headers: {
      "Content-Type": "application/openapi+json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
