// lib/agentReady/store.ts
//
// v1.9.0 — where audit sessions live: Firestore (the store the site already
// uses; no new infrastructure).
//
//   agent_audits/{id}                          the session (lib/agentReady/session.ts), expiresAt
//   agent_audit_quota/{YYYY-MM-DD}_{clientHash} count, expiresAt   (hashed IP, never the IP)
//   agent_audit_quota/{YYYY-MM-DD}_all          count, expiresAt   (every scan of the day)
//
// Both collections carry `expiresAt` as a Timestamp for a Firestore TTL policy.
// Expiry does not depend on the policy: get() refuses an expired session.
//
// A scan costs no money, only function time and a handful of requests to the
// audited site, so unlike the AI ledger this store fails OPEN for scanning:
// without Firestore a scan still runs (behind the per-instance rate limit) and
// simply is not saved — the page then shows the result without the "connect
// your agent" step. Reads and writes of a session need the store.
//
// AGENT_AUDIT_STORE=memory swaps in the in-memory store, for local development
// and tests only (refused when NODE_ENV is production).

import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { isExpired, type AuditSession } from "./session";

const SESSIONS = "agent_audits";
const QUOTAS = "agent_audit_quota";

export const SCAN_QUOTA = { perClientPerDay: 25, globalPerDay: 4000 } as const;

export type QuotaVerdict = { ok: true } | { ok: false; reason: "client_quota" | "global_quota" };

export type AuditStore = {
  /** False when sessions cannot be persisted at all (no database configured). */
  available(): boolean;
  /** Counts one scan for the client and for the day; refuses past either cap. */
  reserveScan(clientKey: string, now: Date): Promise<QuotaVerdict>;
  save(session: AuditSession): Promise<void>;
  get(id: string, now?: Date): Promise<AuditSession | null>;
  /** Read-modify-write under a transaction. Returns the stored result, or null when the session is gone. */
  update(id: string, fn: (s: AuditSession) => AuditSession, now?: Date): Promise<AuditSession | null>;
};

export const dayKey = (now: Date) => now.toISOString().slice(0, 10);

export function createMemoryAuditStore(): AuditStore & { reset(): void; size(): number } {
  const sessions = new Map<string, AuditSession>();
  const quotas = new Map<string, number>();
  return {
    available: () => true,
    async reserveScan(clientKey, now) {
      const day = dayKey(now);
      const mine = quotas.get(`${day}_${clientKey}`) ?? 0;
      const all = quotas.get(`${day}_all`) ?? 0;
      if (mine >= SCAN_QUOTA.perClientPerDay) return { ok: false, reason: "client_quota" };
      if (all >= SCAN_QUOTA.globalPerDay) return { ok: false, reason: "global_quota" };
      quotas.set(`${day}_${clientKey}`, mine + 1);
      quotas.set(`${day}_all`, all + 1);
      return { ok: true };
    },
    async save(session) {
      sessions.set(session.id, structuredClone(session));
    },
    async get(id, now = new Date()) {
      const s = sessions.get(id);
      if (!s) return null;
      if (isExpired(s, now)) {
        sessions.delete(id);
        return null;
      }
      return structuredClone(s);
    },
    async update(id, fn, now = new Date()) {
      const s = sessions.get(id);
      if (!s || isExpired(s, now)) return null;
      const next = fn(structuredClone(s));
      sessions.set(id, structuredClone(next));
      return next;
    },
    reset() {
      sessions.clear();
      quotas.clear();
    },
    size: () => sessions.size,
  };
}

function firestoreConfigured(): boolean {
  return Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64);
}

type StoredSession = Omit<AuditSession, "expiresAt"> & { expiresAt: Timestamp; expiresAtIso: string };

const toStored = (s: AuditSession): StoredSession => ({ ...s, expiresAt: Timestamp.fromDate(new Date(s.expiresAt)), expiresAtIso: s.expiresAt });

function fromStored(data: FirebaseFirestore.DocumentData | undefined): AuditSession | null {
  if (!data || typeof data.id !== "string" || !data.audit) return null;
  const { expiresAt, expiresAtIso, ...rest } = data as StoredSession;
  return { ...(rest as Omit<AuditSession, "expiresAt">), expiresAt: typeof expiresAtIso === "string" ? expiresAtIso : expiresAt.toDate().toISOString() };
}

export function createFirestoreAuditStore(): AuditStore {
  const db = () => getAdminFirestore();
  const quotaExpiry = (now: Date) => Timestamp.fromDate(new Date(now.getTime() + 2 * 86_400_000));

  return {
    available: firestoreConfigured,
    async reserveScan(clientKey, now) {
      // No database: the per-instance rate limiter is the only gate (see the header).
      if (!firestoreConfigured()) return { ok: true };
      const day = dayKey(now);
      try {
        const store = db();
        const mineRef = store.collection(QUOTAS).doc(`${day}_${clientKey}`);
        const allRef = store.collection(QUOTAS).doc(`${day}_all`);
        return await store.runTransaction(async (tx): Promise<QuotaVerdict> => {
          const [mine, all] = await tx.getAll(mineRef, allRef);
          if (Number(mine.get("count") ?? 0) >= SCAN_QUOTA.perClientPerDay) return { ok: false, reason: "client_quota" };
          if (Number(all.get("count") ?? 0) >= SCAN_QUOTA.globalPerDay) return { ok: false, reason: "global_quota" };
          const expiresAt = quotaExpiry(now);
          tx.set(mineRef, { day, count: FieldValue.increment(1), expiresAt }, { merge: true });
          tx.set(allRef, { day, count: FieldValue.increment(1), expiresAt }, { merge: true });
          return { ok: true };
        });
      } catch (err) {
        console.warn("[agent-ready] quota_unavailable", { message: err instanceof Error ? err.message : String(err) });
        return { ok: true };
      }
    },
    async save(session) {
      await db().collection(SESSIONS).doc(session.id).create(toStored(session));
    },
    async get(id, now = new Date()) {
      if (!firestoreConfigured()) return null;
      const snap = await db().collection(SESSIONS).doc(id).get();
      const s = snap.exists ? fromStored(snap.data()) : null;
      return s && !isExpired(s, now) ? s : null;
    },
    async update(id, fn, now = new Date()) {
      if (!firestoreConfigured()) return null;
      const store = db();
      const ref = store.collection(SESSIONS).doc(id);
      return store.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const current = snap.exists ? fromStored(snap.data()) : null;
        if (!current || isExpired(current, now)) return null;
        const next = fn(current);
        // The id and the expiry are never the caller's to change.
        const safe: AuditSession = { ...next, id: current.id, createdAt: current.createdAt, expiresAt: current.expiresAt };
        tx.set(ref, toStored(safe));
        return safe;
      });
    },
  };
}

const g = globalThis as unknown as { __PROMPTEA_AUDIT_STORE__?: AuditStore };

export function setAuditStore(store: AuditStore | undefined): void {
  g.__PROMPTEA_AUDIT_STORE__ = store;
}

export function getAuditStore(): AuditStore {
  if (g.__PROMPTEA_AUDIT_STORE__) return g.__PROMPTEA_AUDIT_STORE__;
  const wantMemory = process.env.AGENT_AUDIT_STORE === "memory" && process.env.NODE_ENV !== "production";
  // Without a database outside production (local development), keep sessions in memory so the whole flow can be used.
  const useMemory = wantMemory || (!firestoreConfigured() && process.env.NODE_ENV !== "production");
  g.__PROMPTEA_AUDIT_STORE__ = useMemory ? createMemoryAuditStore() : createFirestoreAuditStore();
  return g.__PROMPTEA_AUDIT_STORE__;
}
