// lib/seo/serve.ts
//
// Shared plumbing for the machine-readable routes (llms.txt, llms-full.txt,
// the markdown twins): load the data once, answer with the right headers.

import "server-only";

import { loadArticles, loadBenchmarksSnapshot, loadEditions } from "./dynamic";
import type { LlmsInput } from "./llms";
import { isArticleLang, isContentLang } from "@/lib/domain";
import type { Locale } from "./site";

export async function loadLlmsInput(lang: Locale): Promise<LlmsInput> {
  // AI Daily is written in es/en and, since v1.8.8, new stories also in zh
  // (locales.zh). Only stories with text in this language are listed: under zh
  // the loader also returns the English text of older stories, and those are
  // linked from /en/llms.txt instead. pt has no edition of its own and lists none.
  // The weekly digest stays es/en.
  const [articles, editions, benchmarks] = await Promise.all([
    isArticleLang(lang) ? loadArticles(lang, 200).then((list) => list.filter((a) => a.lang === lang)) : Promise.resolve([]),
    isContentLang(lang) ? loadEditions() : Promise.resolve([]),
    loadBenchmarksSnapshot(),
  ]);
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
