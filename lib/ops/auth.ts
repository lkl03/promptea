// lib/ops/auth.ts
//
// v1.8.8 — bearer-token check for the internal ops routes. Vercel Cron sends
// `Authorization: Bearer <CRON_SECRET>` on every scheduled call; a human can
// use ROUTINE_HEALTH_SECRET for the read-only health view. Fails closed: with
// no secret configured, nobody is authorized.

import { createHash, timingSafeEqual } from "node:crypto";

const MIN_SECRET_LENGTH = 16;

const digest = (s: string) => createHash("sha256").update(s).digest();

/** The configured secrets that are long enough to be trusted. */
export function usableSecrets(...values: Array<string | undefined>): string[] {
  return values.map((v) => (v ?? "").trim()).filter((v) => v.length >= MIN_SECRET_LENGTH);
}

/** True when the Authorization header carries one of `secrets` (constant-time compare). */
export function hasBearer(authorization: string | null, secrets: readonly string[]): boolean {
  const m = /^Bearer\s+(\S+)$/i.exec(authorization ?? "");
  if (!m || secrets.length === 0) return false;
  const given = digest(m[1]);
  let ok = false;
  for (const s of secrets) ok = timingSafeEqual(given, digest(s)) || ok;
  return ok;
}
