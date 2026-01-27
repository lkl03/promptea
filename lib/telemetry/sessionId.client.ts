"use client";

const KEY = "promptea_session_id";
const DAY_KEY = "promptea_session_last_day";

function todayUTCKey(d = new Date()) {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function getOrCreateSessionId() {
  try {
    const existing = localStorage.getItem(KEY);
    if (existing && existing.length >= 10) return existing;

    const id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
    return id;
  } catch {
    // fallback ultra simple si localStorage no está disponible
    return `anon_${Math.random().toString(16).slice(2)}`;
  }
}

export async function ensureSessionPing(lang: "es" | "en") {
  try {
    const sessionId = getOrCreateSessionId();
    const today = todayUTCKey();

    const last = localStorage.getItem(DAY_KEY);
    if (last === today) return sessionId; // ya contó hoy

    await fetch("/api/telemetry/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sessionId,
        lang,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? null,
      }),
      keepalive: true,
    });

    localStorage.setItem(DAY_KEY, today);
    return sessionId;
  } catch {
    return getOrCreateSessionId();
  }
}
