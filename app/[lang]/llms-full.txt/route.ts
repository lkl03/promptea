// /{lang}/llms-full.txt — the full text of the site in one language.

import { buildLlmsFullTxt } from "@/lib/seo/llms";
import { LOCALES, isLocale } from "@/lib/seo/site";
import { loadLlmsInput, notFoundText, textResponse } from "@/lib/seo/serve";

export const revalidate = 3600;
export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export async function GET(_req: Request, ctx: { params: Promise<{ lang: string }> }) {
  const { lang } = await ctx.params;
  if (!isLocale(lang)) return notFoundText();
  return textResponse(buildLlmsFullTxt(await loadLlmsInput(lang)), "text/plain; charset=utf-8");
}
