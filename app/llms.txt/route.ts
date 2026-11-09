// /llms.txt — the root index for LLMs and AI agents (English; /es/llms.txt is the Spanish one).
// Generated from the real content; see lib/seo/llms.ts.

import { buildLlmsTxt } from "@/lib/seo/llms";
import { loadLlmsInput, textResponse } from "@/lib/seo/serve";

export const revalidate = 3600;

export async function GET() {
  return textResponse(buildLlmsTxt(await loadLlmsInput("en")), "text/plain; charset=utf-8");
}
