import { NextRequest, NextResponse } from "next/server";
import { sanitizeTelemetry } from "@/lib/telemetry/sanitize";
import { upsertAnalysisEvent } from "@/lib/telemetry/server";

export const runtime = "nodejs";

/**
 * Endpoint legacy / compat:
 * - Mantenerlo evita romper código viejo, pero internamente escribe igual que /api/analyze
 * - Requiere analysisId para no crear spam de docs.
 */
export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return NextResponse.json({ ok: false, error: "Unsupported content-type" }, { status: 415 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const event = sanitizeTelemetry(body);
  if (!event) {
    return NextResponse.json({ ok: false, error: "Invalid telemetry payload" }, { status: 400 });
  }

  const analysisId = String(event.analysisId ?? "").trim();
  const sessionId = String(event.sessionId ?? "anon").trim();

  if (analysisId.length < 10) {
    return NextResponse.json(
      { ok: false, error: "analysisId is required for telemetry" },
      { status: 400 }
    );
  }

  if ((event.findingIds?.length ?? 0) > 50 || (event.recoIds?.length ?? 0) > 50) {
    return NextResponse.json({ ok: false, error: "Payload too large" }, { status: 413 });
  }

  try {
    await upsertAnalysisEvent({
      analysisId,
      sessionId,
      projectId: event.projectId ?? process.env.FIREBASE_PROJECT_ID ?? null,
      lang: (event.lang === "en" ? "en" : "es") as "es" | "en",
      target: String(event.target ?? "gpt"),
      taskType: event.taskType ?? null,
      engineVersion: String(event.engineVersion ?? "unknown"),
      score: Number(event.score ?? 0),
      confidence: Number(event.confidence ?? 0),
      words: Number(event.words ?? 0),
      approxTokens: Number(event.approxTokens ?? 0),
      findingIds: (event.findingIds ?? []).map(String),
      recoIds: (event.recoIds ?? []).map(String),
      outputFormat:
        event.outputFormatKind &&
        ["json", "table", "steps", "bullets"].includes(event.outputFormatKind)
          ? {
              kind: event.outputFormatKind as "json" | "table" | "steps" | "bullets",
              strict: Boolean(event.outputFormatStrict),
            }
          : null,
      purpose: String(event.purpose ?? "").trim() || null,
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Telemetry write failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
