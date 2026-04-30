import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { fetchGroqHints, isGroqEnabled } from "@/lib/llm/groq";

export const runtime = "nodejs";

const BodySchema = z.object({
  prompt: z.string().min(1).max(20000),
  taskType: z.string().min(1).max(60).optional(),
  lang: z.enum(["es", "en"]).optional(),
});

// POST /api/analyze-llm
//
// Optional companion endpoint. Returns LLM-generated follow-up questions
// (and optionally a rewrite) when GROQ_API_KEY is configured server-side.
// When the key is missing the route gracefully returns 200 with
// { enabled: false, hints: null } so the UI can degrade to local analysis.
export async function POST(req: NextRequest) {
  if (!isGroqEnabled()) {
    return NextResponse.json({ enabled: false, hints: null }, { status: 200 });
  }

  const ct = req.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) {
    return NextResponse.json({ error: "Unsupported content-type" }, { status: 415 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation error" }, { status: 400 });
  }

  const { prompt, taskType, lang } = parsed.data;

  const hints = await fetchGroqHints({
    prompt,
    language: lang ?? "en",
    taskType: taskType ?? "text",
  });

  return NextResponse.json({ enabled: true, hints }, { status: 200 });
}
