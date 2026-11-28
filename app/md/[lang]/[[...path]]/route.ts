// Markdown twins of the public pages: /{lang}/guides/x.md, /{lang}/about.md, /en.md …
//
// Not a public URL by itself: next.config.ts rewrites `/:lang(<LANGS>)/:path*.md`
// here. The twin is generated from the same data as the HTML page
// (lib/seo/markdown.ts) and declares the HTML page as its canonical.

import { MARKDOWN_CONTENT_TYPE, localizeMarkdownPunctuation } from "@/lib/seo/markdown";
import { resolveMarkdown, staticMarkdownPaths } from "@/lib/seo/mdResolve";
import { LOCALES, absUrl, isLocale } from "@/lib/seo/site";
import { notFoundText, textResponse } from "@/lib/seo/serve";

export const revalidate = 300;

export function generateStaticParams() {
  return LOCALES.flatMap((lang) => staticMarkdownPaths().map((path) => ({ lang, path })));
}

export async function GET(_req: Request, ctx: { params: Promise<{ lang: string; path?: string[] }> }) {
  const { lang, path = [] } = await ctx.params;
  if (!isLocale(lang)) return notFoundText();

  const found = await resolveMarkdown(lang, path);
  if (!found) return notFoundText();

  return textResponse(localizeMarkdownPunctuation(found.body, lang), MARKDOWN_CONTENT_TYPE, {
    // The HTML page is the canonical version; the twin is an alternate format of it.
    Link: `<${absUrl(found.htmlPath)}>; rel="canonical"`,
    // v1.9.0: the same URL answers HTML or this twin depending on Accept (proxy.ts). Said here
    // and not only in the proxy: on Vercel a Vary header the proxy adds to a rewrite is dropped.
    Vary: "Accept",
  });
}
