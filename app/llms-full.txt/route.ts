// /llms-full.txt — the full text behind llms.txt (English; /es/llms-full.txt is the Spanish one).

import { buildLlmsFullTxt } from "@/lib/seo/llms";
import { loadLlmsInput, textResponse } from "@/lib/seo/serve";

export const revalidate = 3600;

export async function GET() {
  return textResponse(buildLlmsFullTxt(await loadLlmsInput("en")), "text/plain; charset=utf-8");
}
