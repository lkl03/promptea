// lib/ai/budgetStore.ts
//
// v1.8.9 — the persisted ledger behind lib/ai/budget.ts, in Firestore (the
// store the site already uses; no new infrastructure).
//
//   ai_budget/{YYYY-MM}                 spentMicros, requests, tokens.*, byFeature.<f>.*
//   ai_budget/{YYYY-MM}/days/{YYYY-MM-DD}   spentMicros, requests
//   ai_quota/{YYYY-MM-DD}_{feature}_{clientHash}   count, day, expiresAt   (hashed IP, never the IP)
//
// The reservation is one transaction over the three documents, so two
// serverless instances cannot both squeeze under the cap. `ai_quota` documents
// carry `expiresAt` (day + 2) for a Firestore TTL policy; without the policy
// they are tiny and harmless (docs/ops/ai-budget.md says how to enable it).
//
// Fails CLOSED: if Firestore is not configured or a transaction fails, the
// reservation is refused (`store_unavailable`) and the caller degrades to the
// non-AI path. Spending without a working ledger is never an option.
//
// AI_BUDGET_STORE=memory swaps in the in-memory store, for local development
// only (refused when NODE_ENV is production).

import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase/admin";
import {
  createMemoryBudgetStore,
  currentBudgetStore,
  decide,
  periodKeys,
  quotaDocId,
  setBudgetStore,
  type BudgetStore,
  type LedgerState,
  type UsageSnapshot,
} from "./budget";

const MONTHS = "ai_budget";
const QUOTAS = "ai_quota";

function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

function firestoreConfigured(): boolean {
  return Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64);
}

export function createFirestoreBudgetStore(): BudgetStore {
  const db = () => getAdminFirestore();

  return {
    async reserve(req, limits) {
      if (!limits.enabled) return { ok: false, reason: "disabled" };
      if (!firestoreConfigured()) return { ok: false, reason: "store_unavailable" };
      const { month, day } = periodKeys(req.now);
      try {
        const store = db();
        const monthRef = store.collection(MONTHS).doc(month);
        const dayRef = monthRef.collection("days").doc(day);
        const quotaRef = req.userKey ? store.collection(QUOTAS).doc(quotaDocId(day, req.feature, req.userKey)) : null;

        return await store.runTransaction(async (tx) => {
          const refs = quotaRef ? [monthRef, dayRef, quotaRef] : [monthRef, dayRef];
          const [m, d, q] = await tx.getAll(...refs);
          const state: LedgerState = {
            monthSpentMicros: num(m?.get("spentMicros")),
            daySpentMicros: num(d?.get("spentMicros")),
            userRequestsToday: q ? num(q.get("count")) : 0,
          };
          const verdict = decide(state, req, limits);
          if (!verdict.ok) return verdict;

          const now = FieldValue.serverTimestamp();
          tx.set(
            monthRef,
            {
              month,
              spentMicros: FieldValue.increment(req.worstMicros),
              requests: FieldValue.increment(1),
              byFeature: { [req.feature]: { requests: FieldValue.increment(1) } },
              capMicros: limits.monthlyCapMicros,
              updatedAt: now,
            },
            { merge: true }
          );
          tx.set(dayRef, { day, spentMicros: FieldValue.increment(req.worstMicros), requests: FieldValue.increment(1), updatedAt: now }, { merge: true });
          if (quotaRef) {
            const expires = new Date(`${day}T00:00:00Z`);
            expires.setUTCDate(expires.getUTCDate() + 2);
            tx.set(quotaRef, { day, count: FieldValue.increment(1), expiresAt: Timestamp.fromDate(expires) }, { merge: true });
          }
          return { ok: true as const, ticket: { feature: req.feature, model: req.model, month, day, reservedMicros: req.worstMicros } };
        });
      } catch (err) {
        console.warn("[ai-budget] reserve_failed", { message: (err as Error)?.message?.slice(0, 160) });
        return { ok: false, reason: "store_unavailable" };
      }
    },

    async settle(ticket, actualMicros, usage) {
      const charged = actualMicros === null ? ticket.reservedMicros : actualMicros;
      const delta = charged - ticket.reservedMicros;
      try {
        const store = db();
        const monthRef = store.collection(MONTHS).doc(ticket.month);
        const dayRef = monthRef.collection("days").doc(ticket.day);
        const batch = store.batch();
        batch.set(
          monthRef,
          {
            spentMicros: FieldValue.increment(delta),
            byFeature: { [ticket.feature]: { spentMicros: FieldValue.increment(charged) } },
            byModel: { [ticket.model.replace(/[^a-z0-9-]/gi, "_")]: FieldValue.increment(charged) },
            ...(usage
              ? {
                  tokens: {
                    input: FieldValue.increment(usage.inputTokens),
                    output: FieldValue.increment(usage.outputTokens),
                    cacheRead: FieldValue.increment(usage.cacheReadTokens),
                    cacheWrite: FieldValue.increment(usage.cacheWriteTokens),
                  },
                }
              : {}),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
        batch.set(dayRef, { spentMicros: FieldValue.increment(delta) }, { merge: true });
        await batch.commit();
      } catch (err) {
        // The worst case stays charged: the ledger over-counts, never under-counts.
        console.warn("[ai-budget] settle_failed", { message: (err as Error)?.message?.slice(0, 160) });
      }
    },

    async snapshot(now) {
      const { month, day } = periodKeys(now);
      const store = db();
      const monthRef = store.collection(MONTHS).doc(month);
      const [m, d] = await Promise.all([monthRef.get(), monthRef.collection("days").doc(day).get()]);
      const byFeatureRaw = (m.get("byFeature") ?? {}) as Record<string, { spentMicros?: number; requests?: number }>;
      const byFeature: UsageSnapshot["byFeature"] = {};
      for (const [k, v] of Object.entries(byFeatureRaw)) {
        if (k === "flow" || k === "refine") byFeature[k] = { spentMicros: num(v?.spentMicros), requests: num(v?.requests) };
      }
      const tokens = (m.get("tokens") ?? {}) as Record<string, number>;
      return {
        month,
        day,
        monthSpentMicros: num(m.get("spentMicros")),
        daySpentMicros: num(d.get("spentMicros")),
        monthRequests: num(m.get("requests")),
        byFeature,
        tokens: {
          inputTokens: num(tokens.input),
          outputTokens: num(tokens.output),
          cacheReadTokens: num(tokens.cacheRead),
          cacheWriteTokens: num(tokens.cacheWrite),
        },
      };
    },
  };
}

/** The store every Claude call uses: the installed one, else Firestore (memory in dev on request). */
export function getBudgetStore(): BudgetStore {
  const installed = currentBudgetStore();
  if (installed) return installed;
  const wantsMemory = process.env.AI_BUDGET_STORE === "memory" && process.env.NODE_ENV !== "production";
  const store = wantsMemory ? createMemoryBudgetStore() : createFirestoreBudgetStore();
  setBudgetStore(store);
  return store;
}
