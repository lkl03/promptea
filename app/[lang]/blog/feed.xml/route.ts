// app/[lang]/blog/feed.xml/route.ts
//
// v1.4.0 — RSS 2.0 for AI Daily, one feed per locale. Since v1.8.3 this is the
// feed of the AI section (the Tech section has its own, ../tech/feed.xml) and
// the document is built by lib/blog/feed.ts.

import { feedResponse } from "@/lib/blog/feedRoute";

export const runtime = "nodejs";
export const revalidate = 300;

export async function GET(_req: Request, { params }: { params: Promise<{ lang: string }> }): Promise<Response> {
  const { lang } = await params;
  return feedResponse(lang, "ai");
}
