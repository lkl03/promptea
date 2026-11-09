// lib/seo/serve.ts
//
// Shared plumbing for the machine-readable routes (llms.txt, llms-full.txt,
// the markdown twins): load the data once, answer with the right headers.

import "server-only";

import { loadArticles, loadBenchmarksSnapshot, loadEditions } from "./dynamic";
import type { LlmsInput } from "./llms";
import type { Locale } from "./site";

export async function loadLlmsInput(lang: Locale): Promise<LlmsInput> {
  const [articles, editions, benchmarks] = await Promise.all([loadArticles(lang, 200), loadEditions(), loadBenchmarksSnapshot()]);
  return { lang, articles, editions, benchmarks };
}

export function textResponse(body: string, contentType: string, extra: Record<string, string> = {}): Response {
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "X-Content-Type-Options": "nosniff",
      ...extra,
    },
  });
}

export function notFoundText(): Response {
  return new Response("Not found\n", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
