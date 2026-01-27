import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { AnalyzeSchema } from "@/lib/validators";
import { analyzePrompt } from "@/lib/analyzePrompt";
import { upsertAnalysisEvent } from "@/lib/telemetry/server";

export const runtime = "nodejs";

function normalizeLang(v: any): "es" | "en" {
  return v === "en" ? "en" : "es";
}

function inferLang(req: NextRequest, bodyLang: any): "es" | "en" {
  // ✅ Fuente de verdad: header explícito del UI
  const h = req.headers.get("x-ui-lang");
  if (h === "en" || h === "es") return h;

  // fallback: body
  return normalizeLang(bodyLang);
}

function normalizePurpose(p: any) {
  // compat UI: a veces llega data_json
  if (p === "data_json") return "data";
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

  const parsed = AnalyzeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation error", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { prompt, target, lang: bodyLang, sessionId, purpose: rawPurpose } = parsed.data as any;

  const lang = inferLang(req, bodyLang);
  const purpose = normalizePurpose(rawPurpose);

  const result = analyzePrompt(prompt, target, lang, purpose);

  // ✅ 1 doc por análisis
  const analysisId = randomUUID();

  // ✅ Debug backend (NO loguea prompt raw)
  // Activación: por default en dev, o forzalo con DEBUG_ANALYZE=1
  const shouldDebug =
    process.env.DEBUG_ANALYZE === "1" || process.env.NODE_ENV !== "production";

  if (shouldDebug) {
    console.log("[analyze] request", {
      analysisId,
      headerLang: req.headers.get("x-ui-lang"),
      bodyLang,
      inferredLang: lang,
      target,
      purpose,
      taskType: result?.meta?.taskType ?? null,
      score: result?.score ?? null,
      words: result?.stats?.words ?? null,
      approxTokens: result?.stats?.approxTokens ?? null,
      engineVersion: result?.meta?.engineVersion ?? "unknown",
    });
  }

  // Telemetry (no bloquea UX)
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

    // ✅ FIX: ahora es requerido por el tipo
    purpose: result.meta?.purpose ?? purpose ?? null,
  }).catch((e) => {
    if (shouldDebug) console.log("[analyze] telemetry failed", { analysisId, err: e?.message ?? String(e) });
  });

  // devolvemos analysisId para feedback
  const payload = {
    ...result,
    meta: {
      ...(result.meta ?? {}),
      analysisId,
    },
  };

  const res = NextResponse.json(payload, { status: 200 });
  res.headers.set("x-engine-version", result.meta?.engineVersion ?? "unknown");
  return res;
}







