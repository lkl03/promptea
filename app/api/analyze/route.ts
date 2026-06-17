import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { AnalyzeSchema } from "@/lib/validators";
import { analyzePrompt } from "@/lib/analyzePrompt";
import { upsertAnalysisEvent } from "@/lib/telemetry/server";
import { normalizeAnalyzeAttachments } from "@/lib/attachments";
import { adaptPromptWithGroq, isGroqEnabled } from "@/lib/llm/groq";

export const runtime = "nodejs";

function normalizeLang(v: any): "es" | "en" {
  return v === "en" ? "en" : "es";
}

function inferLang(req: NextRequest, bodyLang: any): "es" | "en" {
  const h = req.headers.get("x-ui-lang");
  if (h === "en" || h === "es") return h;
  return normalizeLang(bodyLang);
}

function normalizePurpose(p: any) {
  if (p === "data_json") return "data";
  if (p === "translate") return "translation";
  if (p === "summary" || p === "summarize") return "summarization";
  return p;
}

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return NextResponse.json({ error: "Unsupported content-type" }, { status: 415 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  let normalizedBody: any = body;
  if (normalizedBody && typeof normalizedBody === "object") {
    (normalizedBody as any).purpose = normalizePurpose((normalizedBody as any).purpose);
  }

  const parsed = AnalyzeSchema.safeParse(normalizedBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation error", details: parsed.error.flatten() }, { status: 400 });
  }

  const {
    prompt,
    target,
    lang: bodyLang,
    sessionId,
    purpose: rawPurpose,
    attachments: rawAttachments,
    format: rawFormat,
    modelId: rawModelId,
  } = parsed.data as any;

  const lang = inferLang(req, bodyLang);
  const purpose = normalizePurpose(rawPurpose);
  const format = rawFormat === "json" ? "json" : "checklist";
  const modelId = typeof rawModelId === "string" && rawModelId.trim().length > 0 ? rawModelId.trim() : null;

  let attachments = [];
  try {
    attachments = normalizeAnalyzeAttachments(rawAttachments, purpose);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Invalid attachments." },
      { status: 400 }
    );
  }

  const result = analyzePrompt(prompt, target, lang, purpose, {
    attachments,
    format,
    modelId,
  });
  const analysisId = randomUUID();

  // Optional adaptive layer: refine the deterministic optimized prompt via Groq.
  // Falls back to the deterministic prompt on any error, timeout, or missing key.
  let adaptiveResult: Awaited<ReturnType<typeof adaptPromptWithGroq>> | null = null;
  if (isGroqEnabled() && result.optimizedPrompt) {
    adaptiveResult = await adaptPromptWithGroq({
      originalPrompt: prompt,
      optimizedPrompt: result.optimizedPrompt,
      model: target,
      purpose: result.meta?.purpose ?? purpose,
      taskType: result.meta?.taskType ?? "text",
      language: lang,
      modelId,
    }).catch(() => null);
  }

  const attachmentKinds = [...new Set(attachments.map((file: any) => String(file.kind)).filter(Boolean))];
  const attachmentExts = [...new Set(attachments.map((file: any) => String(file.ext)).filter(Boolean))];
  const attachmentMimes = [...new Set(attachments.map((file: any) => String(file.mime)).filter(Boolean))];

  const shouldDebug = process.env.DEBUG_ANALYZE === "1" || process.env.NODE_ENV !== "production";
  if (shouldDebug) {
    console.log("[analyze] request", {
      analysisId,
      headerLang: req.headers.get("x-ui-lang"),
      bodyLang,
      inferredLang: lang,
      target,
      purpose,
      attachmentsCount: attachments.length,
      attachmentKinds,
      attachmentExts,
      taskType: result?.meta?.taskType ?? null,
      score: result?.score ?? null,
      words: result?.stats?.words ?? null,
      approxTokens: result?.stats?.approxTokens ?? null,
      engineVersion: result?.meta?.engineVersion ?? "unknown",
    });
  }

  upsertAnalysisEvent({
    analysisId,
    sessionId: String(sessionId ?? "anon"),
    projectId: process.env.FIREBASE_PROJECT_ID ?? null,
    lang,
    target,
    taskType: result.meta?.taskType ?? null,
    engineVersion: result.meta?.engineVersion ?? "unknown",
    score: Number(result.score ?? 0),
    confidence: Number(result.meta?.confidence ?? 0),
    words: Number(result.stats?.words ?? 0),
    approxTokens: Number(result.stats?.approxTokens ?? 0),
    findingIds: (result.findings ?? []).map((f: any) => String(f.id)),
    recoIds: (result.recommendations ?? []).map((r: any) => String(r.id)).filter(Boolean),
    outputFormat: result.meta?.outputFormat ?? null,
    purpose: result.meta?.purpose ?? purpose ?? null,

    // nuevo: metadata de adjuntos
    attachmentsCount: attachments.length,
    attachmentKinds,
    attachmentExts,
    attachmentMimes,
  }).catch((e) => {
    if (shouldDebug) {
      console.log("[analyze] telemetry failed", {
        analysisId,
        err: e?.message ?? String(e),
      });
    }
  });

  const finalOptimizedPrompt = adaptiveResult?.adaptiveFallback === false
    ? adaptiveResult.optimizedPrompt
    : result.optimizedPrompt;

  const payload = {
    ...result,
    optimizedPrompt: finalOptimizedPrompt,
    meta: {
      ...(result.meta ?? {}),
      analysisId,
      attachmentFormats: attachments.map((file: any) => ({
        kind: file.kind ?? null,
        ext: file.ext ?? null,
        mime: file.mime ?? null,
      })),
      adaptiveEngine: adaptiveResult?.adaptiveEngine ?? null,
      adaptiveFallback: adaptiveResult?.adaptiveFallback ?? true,
      adaptiveReason: adaptiveResult?.adaptiveReason ?? (isGroqEnabled() ? undefined : "groq_disabled"),
    },
  };

  const res = NextResponse.json(payload, { status: 200 });
  res.headers.set("x-engine-version", result.meta?.engineVersion ?? "unknown");
  return res;
}