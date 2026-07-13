import type { TelemetryEvent } from "./types";

const BLOCKED_KEYS = ["prompt", "optimizedPrompt", "input", "text", "content"];

export function sanitizeTelemetry(input: unknown): TelemetryEvent | null {
  if (!input || typeof input !== "object") return null;

  const record = input as Record<string, unknown>;

  // Si viene algo con keys prohibidas, lo descartamos directo
  for (const k of Object.keys(record)) {
    if (BLOCKED_KEYS.includes(k)) return null;
  }

  // Whitelist (solo permitimos estas keys)
  const allowed: (keyof TelemetryEvent)[] = [
    "name",
    "ts",
    "sessionId",
    "engineVersion",
    "lang",
    "target",
    "taskType",
    "score",
    "confidence",
    "words",
    "approxTokens",
    "outputFormatKind",
    "outputFormatStrict",
    "findingIds",
    "recoIds",
    "optimizedCopied",
    "helpful",
    "reason",
  ];

  const out: Partial<Record<keyof TelemetryEvent, unknown>> = {};
  for (const k of allowed) {
    if (k in record) out[k] = record[k];
  }

  // validaciones mínimas
  if (!out.name || !out.ts || !out.sessionId || !out.engineVersion) return null;

  // evitar payloads gigantes
  if (Array.isArray(out.findingIds) && out.findingIds.length > 50) out.findingIds = out.findingIds.slice(0, 50);
  if (Array.isArray(out.recoIds) && out.recoIds.length > 50) out.recoIds = out.recoIds.slice(0, 50);

  return out as TelemetryEvent;
}
