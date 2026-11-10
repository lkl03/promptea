// lib/telemetry/session.ts
//
// The pseudonymous session id sent with analyses and app events.
//
// v1.8.1: storage access is guarded. With localStorage blocked (private mode
// with storage disabled, strict browser settings, some embedded webviews)
// `window.localStorage` itself THROWS a SecurityError; this function used to
// let that escape, which broke the analyzer on load (the mode-opened event)
// and made every analysis fail before it was sent. Now the id falls back to
// one kept in memory for the page's lifetime: analyses work, nothing persists.

const KEY = "pe_session_id";

let memoryId: string | null = null;

function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    // Non-secure contexts have no randomUUID: still at least 10 characters (the API's minimum).
    return `anon_${Math.random().toString(16).slice(2).padEnd(12, "0")}`;
  }
}

export function getSessionId(): string {
  if (typeof window === "undefined") return "server";
  try {
    const existing = window.localStorage.getItem(KEY);
    if (existing) return existing;
    const id = memoryId ?? newId();
    memoryId = id;
    window.localStorage.setItem(KEY, id);
    return id;
  } catch {
    memoryId ??= newId();
    return memoryId;
  }
}

/** Test hook. */
export function __resetSessionForTests() {
  memoryId = null;
}
