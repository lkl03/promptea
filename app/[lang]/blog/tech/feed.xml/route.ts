// app/[lang]/blog/tech/feed.xml/route.ts
//
// v1.8.3 — RSS 2.0 for AI Daily Tech, one feed per content locale (es, en).
// /pt/blog/tech/feed.xml redirects to the English feed, like the AI one.

import { feedResponse } from "@/lib/blog/feedRoute";

export const runtime = "nodejs";
export const revalidate = 300;

export async function GET(_req: Request, { params }: { params: Promise<{ lang: string }> }): Promise<Response> {
  const { lang } = await params;
  return feedResponse(lang, "tech");
}
