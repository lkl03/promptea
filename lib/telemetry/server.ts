import "server-only";

import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase/admin";

const COLLECTION = "telemetry_events";

function ttlDays() {
  const n = Number(process.env.TELEMETRY_TTL_DAYS ?? "90");
  return Number.isFinite(n) && n > 0 ? n : 90;
}

type OutputFormat = { kind: "json" | "table" | "steps" | "bullets"; strict: boolean } | null;

// ✅ Mantener compat: purpose opcional (legacy /api/telemetry no lo manda)
type UpsertAnalysisEventInput = {
  analysisId: string;
  sessionId: string;
  projectId: string | null;
  lang: "es" | "en";
  target: string;
  taskType: string | null;
  engineVersion: string;

  score: number;
  confidence: number;
  words: number;
  approxTokens: number;

  findingIds: string[];
  recoIds: string[];

  outputFormat: OutputFormat;

  // ✅ NUEVO: opcional para no romper compat
  purpose?: string | null;

  // ⚠️ NO guardamos prompt raw por defecto (privacy)
  // promptRaw?: string;
};

type SetFeedbackInput = {
  analysisId: string;
  helpful: "yes" | "no";
  reason: string | null;
};

export async function upsertAnalysisEvent(input: UpsertAnalysisEventInput) {
  const db = getAdminFirestore();

  const now = new Date();
  const expires = new Date(now.getTime() + ttlDays() * 24 * 60 * 60 * 1000);

  const docRef = db.collection(COLLECTION).doc(input.analysisId);

  const payload = {
    // identidad
    name: "analyze",
    analysisId: input.analysisId,
    sessionId: input.sessionId,
    projectId: input.projectId,

    // dimensiones
    lang: input.lang,
    target: input.target,
    taskType: input.taskType,
    engineVersion: input.engineVersion,

    // ✅ nuevo (nullable para queries)
    purpose: input.purpose ?? null,

    // métricas
    score: input.score,
    confidence: input.confidence,
    words: input.words,
    approxTokens: input.approxTokens,

    // ids
    findingIds: input.findingIds,
    recoIds: input.recoIds,

    // output format (aplanado para queries simples)
    outputFormatKind: input.outputFormat?.kind ?? null,
    outputFormatStrict: input.outputFormat?.strict ?? null,

    // timestamps (ttl + query-friendly)
    ts: Timestamp.fromDate(now),
    createdAt: FieldValue.serverTimestamp(),
    expiresAt: Timestamp.fromDate(expires),
  };

  await docRef.set(payload, { merge: true });
  return { ok: true };
}

export async function setFeedback(input: SetFeedbackInput) {
  const db = getAdminFirestore();

  const docRef = db.collection(COLLECTION).doc(input.analysisId);

  const payload = {
    helpful: input.helpful,
    reason: input.reason ?? null,
    feedbackAt: FieldValue.serverTimestamp(),
  };

  await docRef.set(payload, { merge: true });
  return { ok: true };
}


