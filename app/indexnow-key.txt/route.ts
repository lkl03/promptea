// /indexnow-key.txt — the IndexNow key, published on the host as the protocol
// requires (see lib/seo/indexnow.ts). The value comes from the INDEXNOW_KEY
// environment variable; it is not in the repository. 404 while it is unset.

import { indexNowKey } from "@/lib/seo/indexnow";

export const dynamic = "force-dynamic";

export function GET() {
  const key = indexNowKey();
  if (!key) return new Response("Not found\n", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  return new Response(key, {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600", "x-robots-tag": "noindex" },
  });
}
