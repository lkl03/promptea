import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { MatchSchema } from "@/lib/validators";
import { matchPrompt } from "@/lib/matcher";
import { normalizeAnalyzeAttachments, type AttachmentContext } from "@/lib/attachments";
import { isLang, type Lang } from "@/lib/domain";
import { recordMatchEvent } from "@/lib/telemetry/server";
import { APP_VERSION } from "@/lib/version";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 512 * 1024;

function inferLang(req: NextRequest, bodyLang: unknown): Lang {
  const h = req.headers.get("x-ui-lang");
  if (isLang(h)) return h;
  return isLang(bodyLang) ? bodyLang : "es";
}

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return NextResponse.json({ error: "Unsupported content-type" }, { status: 415 });
  }

  const declaredLength = Number(req.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = MatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation error", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const lang = inferLang(req, parsed.data.lang);

  let attachments: AttachmentContext[] = [];
  try {
    attachments = normalizeAnalyzeAttachments(parsed.data.attachments, "text");
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid attachments." },
      { status: 400 }
    );
  }

  let result;
  try {
    result = matchPrompt({ prompt: parsed.data.prompt, uiLang: lang, attachments });
  } catch {
    return NextResponse.json({ error: "Matcher unavailable" }, { status: 500 });
  }

  const matchId = randomUUID();

  // Privacy-safe telemetry: category/confidence metadata only, never prompt
  // content. Fire-and-forget — Firestore being down must not break matching.
  recordMatchEvent({
    matchId,
    sessionId: String(parsed.data.sessionId ?? "anon"),
    lang,
    rubricVersion: result.rubricVersion,
    profile: result.detected.profile,
    topCategory: result.detected.categories[0]?.category ?? "chat",
    recommendedTarget: result.primary.target,
    recommendedModelId: result.primary.modelId,
    confidence: result.confidence,
    isTie: result.isTie,
    signalIds: result.detected.signals.map((s) => s.id),
    attachmentsCount: attachments.length,
  }).catch(() => {});

  const res = NextResponse.json({ ...result, meta: { matchId } }, { status: 200 });
  res.headers.set("x-app-version", APP_VERSION);
  return res;
}
