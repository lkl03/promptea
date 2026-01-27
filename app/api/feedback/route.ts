import { NextRequest, NextResponse } from "next/server";
import { setFeedback } from "@/lib/telemetry/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return NextResponse.json({ error: "Unsupported content-type" }, { status: 415 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const analysisId = String(body?.analysisId ?? "").trim();
  const helpful = body?.helpful === "no" ? "no" : "yes";
  const reason = body?.reason ? String(body.reason) : null;

  if (analysisId.length < 10) {
    return NextResponse.json({ error: "Invalid analysisId" }, { status: 400 });
  }

  await setFeedback({ analysisId, helpful, reason });

  return NextResponse.json({ ok: true }, { status: 200 });
}
