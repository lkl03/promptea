// lib/telemetry/client.ts
import type { TelemetryEvent } from "./types";

export async function sendTelemetry(e: TelemetryEvent) {
  const analysisId = String((e as any)?.analysisId ?? "").trim();
  if (analysisId.length < 10) return; // ✅ evita 400/spam

  try {
    await fetch("/api/telemetry", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(e),
      keepalive: true,
    });
  } catch {
    // silent fail
  }
}

