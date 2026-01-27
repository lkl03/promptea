export function getSessionId() {
  if (typeof window === "undefined") return "server";
  const key = "pe_session_id";
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;

  const id = crypto.randomUUID();
  window.localStorage.setItem(key, id);
  return id;
}
