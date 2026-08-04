import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { AnalyzeSchema } from "@/lib/validators";
import { analyzePrompt } from "@/lib/analyzePrompt";
import { upsertAnalysisEvent } from "@/lib/telemetry/server";
import { normalizeAnalyzeAttachments, type AttachmentContext } from "@/lib/attachments";
import { isLang, normalizePurpose, type Lang } from "@/lib/domain";
import { refinePromptAdaptive, isAdaptiveEnabled } from "@/lib/refine/adaptive";
import { modelNoteForTarget } from "@/lib/models";
import type { RefinementResult } from "@/lib/refine/schema";
import { APP_VERSION } from "@/lib/version";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 512 * 1024; // hard request-size ceiling

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

  if (body && typeof body === "object" && "purpose" in body) {
    (body as Record<string, unknown>).purpose = normalizePurpose(
      (body as Record<string, unknown>).purpose
    );
  }

  const parsed = AnalyzeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation error", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { prompt, target, lang: bodyLang, sessionId, purpose, attachments: rawAttachments, format: rawFormat, modelId: rawModelId } =
    parsed.data;

  const lang = inferLang(req, bodyLang);
  const format = rawFormat === "json" ? "json" : "checklist";
  const modelId = typeof rawModelId === "string" && rawModelId.trim().length > 0 ? rawModelId.trim() : null;

  let attachments: AttachmentContext[] = [];
  try {
    attachments = normalizeAnalyzeAttachments(rawAttachments, purpose);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid attachments." },
      { status: 400 }
    );
  }

  const result = analyzePrompt(prompt, target, lang, purpose, {
    attachments,
    format,
    modelId,
  });
  const analysisId = randomUUID();

  // Adaptive refinement layer: strategy-routed, schema-validated, quality-gated.
  // Always resolves — falls back to the deterministic result with a typed reason.
  let refinement: RefinementResult | null = null;
  if (result.optimizedPrompt && result.meta.routing) {
    refinement = await refinePromptAdaptive({
      originalPrompt: prompt,
      deterministicPrompt: result.optimizedPrompt,
      target,
      modelId,
      modelNote: modelNoteForTarget(target, lang, modelId),
      purpose: result.meta.purpose ?? purpose,
      taskType: result.meta.taskType ?? "text",
      uiLang: lang,
      routing: {
        strategy: result.meta.routing.strategy as RefinementResult["detected"]["strategy"],
        complexity: result.meta.routing.complexity as RefinementResult["detected"]["complexity"],
        signals: result.meta.routing.signals,
      },
      signal: req.signal,
      alreadyOptimized: result.meta.alreadyOptimized === true,
    }).catch(() => null);
  }

  const attachmentKinds = [...new Set(attachments.map((file) => String(file.kind)).filter(Boolean))];
  const attachmentExts = [...new Set(attachments.map((file) => String(file.ext)).filter(Boolean))];
  const attachmentMimes = [...new Set(attachments.map((file) => String(file.mime)).filter(Boolean))];

  const shouldDebug = process.env.DEBUG_ANALYZE === "1" || process.env.NODE_ENV !== "production";
  if (shouldDebug) {
    // Operational metadata only — never raw prompt content.
    console.log("[analyze] request", {
      analysisId,
      inferredLang: lang,
      target,
      purpose,
      attachmentsCount: attachments.length,
      taskType: result.meta.taskType ?? null,
      strategy: result.meta.routing?.strategy ?? null,
      complexity: result.meta.routing?.complexity ?? null,
      refinementEngine: refinement?.execution.engine ?? null,
      fallbackReason: refinement?.execution.fallbackReason ?? null,
      score: result.score ?? null,
      engineVersion: result.meta.engineVersion ?? "unknown",
    });
  }

  upsertAnalysisEvent({
    analysisId,
    sessionId: String(sessionId ?? "anon"),
    projectId: process.env.FIREBASE_PROJECT_ID ?? null,
    lang,
    target,
    taskType: result.meta.taskType ?? null,
    engineVersion: result.meta.engineVersion ?? "unknown",
    score: Number(result.score ?? 0),
    confidence: Number(result.meta.confidence ?? 0),
    words: Number(result.stats.words ?? 0),
    approxTokens: Number(result.stats.approxTokens ?? 0),
    findingIds: (result.findings ?? []).map((f) => String(f.id)),
    recoIds: (result.recommendations ?? []).map((r) => String(r.id)).filter(Boolean),
    outputFormat: result.meta.outputFormat ?? null,
    purpose: result.meta.purpose ?? purpose ?? null,
    attachmentsCount: attachments.length,
    attachmentKinds,
    attachmentExts,
    attachmentMimes,
  }).catch((e: unknown) => {
    if (shouldDebug) {
      console.log("[analyze] telemetry failed", {
        analysisId,
        err: e instanceof Error ? e.message : String(e),
      });
    }
  });

  const finalOptimizedPrompt =
    refinement && refinement.execution.engine === "adaptive"
      ? refinement.optimizedPrompt
      : result.optimizedPrompt;

  const payload = {
    ...result,
    optimizedPrompt: finalOptimizedPrompt,
    meta: {
      ...result.meta,
      analysisId,
      attachmentFormats: attachments.map((file) => ({
        kind: file.kind ?? null,
        ext: file.ext ?? null,
        mime: file.mime ?? null,
      })),
      refinement: refinement ?? undefined,
      // Back-compat flags consumed by the existing client:
      adaptiveEngine: refinement?.execution.engine === "adaptive" ? "groq" : null,
      adaptiveFallback: refinement ? refinement.execution.engine !== "adaptive" : true,
      adaptiveReason:
        refinement?.execution.fallbackReason ?? (isAdaptiveEnabled() ? undefined : "disabled"),
    },
  };

  const res = NextResponse.json(payload, { status: 200 });
  res.headers.set("x-engine-version", result.meta.engineVersion ?? "unknown");
  res.headers.set("x-app-version", APP_VERSION);
  return res;
}
