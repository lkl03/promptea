// lib/ai/budget.ts
//
// v1.8.9 — the hard spending cap for Claude API calls.
//
// Every paid call goes through a reservation:
//   1. before calling, reserve the call's WORST-CASE cost (lib/ai/pricing.ts:
//      every input byte as a cache-write token + the full `max_tokens` of
//      output) against the month and the day, and count one request against
//      the caller's daily quota — all in one transaction;
//   2. if the reservation would cross a cap, the call is not made;
//   3. after the call, settle: replace the reservation with the real cost from
//      the API's `usage` (a refund of the difference). A call that never
//      reached Anthropic (4xx/5xx/429) is refunded entirely; a timeout keeps
//      the full reservation, because Anthropic may have billed it.
// A crash between 1 and 3 leaves the worst case charged: the ledger can only
// over-count, so the real bill stays under the cap.
//
// Caps (env, all optional):
//   AI_MONTHLY_BUDGET_USD    100   the money you are willing to spend a month
//   AI_BUDGET_SAFETY_RATIO   0.9   calls stop at this share of it ($90)
//   AI_DAILY_BUDGET_USD      cap/15 per UTC day ($6): no single day can burn the month
//   AI_USER_DAILY_LIMIT      12    prompt flows with AI per client (hashed IP) per UTC day
//   AI_REFINE_USER_DAILY_LIMIT 40  analyzer rewrites with Claude per client per UTC day
//   AI_FEATURES_ENABLED      on    "0"/"off"/"false" turns every Claude call off
// Periods are UTC calendar months/days, like Anthropic's billing.
//
// The decision logic is pure and tested; the Firestore store lives in
// lib/ai/budgetStore.ts.

import { usdToMicros } from "./pricing";

export const AI_FEATURES = ["flow", "refine"] as const;
export type AiFeature = (typeof AI_FEATURES)[number];

export type BudgetLimits = {
  enabled: boolean;
  /** The configured monthly budget (before the safety ratio), µ$. */
  monthlyBudgetMicros: number;
  /** Where calls stop: budget × safety ratio, µ$. */
  monthlyCapMicros: number;
  dailyCapMicros: number;
  /** AI requests per client per UTC day, per feature. */
  userDailyRequests: Record<AiFeature, number>;
  safetyRatio: number;
};

type Env = Record<string, string | undefined>;

function num(env: Env, name: string, fallback: number, min: number, max: number): number {
  const raw = env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function budgetLimits(env: Env = process.env): BudgetLimits {
  const flag = (env.AI_FEATURES_ENABLED ?? "").trim().toLowerCase();
  const enabled = !["0", "off", "false", "no"].includes(flag);
  const budgetUsd = num(env, "AI_MONTHLY_BUDGET_USD", 100, 0, 100_000);
  const safetyRatio = num(env, "AI_BUDGET_SAFETY_RATIO", 0.9, 0.1, 1);
  const monthlyCapMicros = usdToMicros(budgetUsd * safetyRatio);
  const dailyDefaultUsd = (budgetUsd * safetyRatio) / 15;
  const dailyUsd = num(env, "AI_DAILY_BUDGET_USD", dailyDefaultUsd, 0, 100_000);
  return {
    enabled,
    monthlyBudgetMicros: usdToMicros(budgetUsd),
    monthlyCapMicros,
    // A daily cap above the monthly one means nothing.
    dailyCapMicros: Math.min(usdToMicros(dailyUsd), monthlyCapMicros),
    userDailyRequests: {
      flow: Math.floor(num(env, "AI_USER_DAILY_LIMIT", 12, 0, 10_000)),
      refine: Math.floor(num(env, "AI_REFINE_USER_DAILY_LIMIT", 40, 0, 10_000)),
    },
    safetyRatio,
  };
}

/** Quota document id: one counter per UTC day, feature and hashed client. */
export function quotaDocId(day: string, feature: AiFeature, userKey: string): string {
  return `${day}_${feature}_${userKey}`;
}

/** UTC period keys: "2026-11" and "2026-11-22". */
export function periodKeys(now: Date): { month: string; day: string } {
  const day = now.toISOString().slice(0, 10);
  return { month: day.slice(0, 7), day };
}

export type DenyReason = "budget_month" | "budget_day" | "user_quota" | "store_unavailable" | "disabled";

export type LedgerState = {
  monthSpentMicros: number;
  daySpentMicros: number;
  /** AI requests this client already made today (0 when there is no client key). */
  userRequestsToday: number;
};

export type ReserveRequest = {
  feature: AiFeature;
  model: string;
  worstMicros: number;
  /** Hashed client key (lib/rateLimit clientKey); null for server-side work without a visitor. */
  userKey: string | null;
  now: Date;
};

/** Pure: may this reservation go through, given the ledger as it stands? */
export function decide(state: LedgerState, req: Pick<ReserveRequest, "feature" | "worstMicros" | "userKey">, limits: BudgetLimits): { ok: true } | { ok: false; reason: DenyReason } {
  if (!limits.enabled) return { ok: false, reason: "disabled" };
  if (state.monthSpentMicros + req.worstMicros > limits.monthlyCapMicros) return { ok: false, reason: "budget_month" };
  if (state.daySpentMicros + req.worstMicros > limits.dailyCapMicros) return { ok: false, reason: "budget_day" };
  if (req.userKey && state.userRequestsToday >= limits.userDailyRequests[req.feature]) return { ok: false, reason: "user_quota" };
  return { ok: true };
}

export type Ticket = {
  feature: AiFeature;
  model: string;
  month: string;
  day: string;
  reservedMicros: number;
};

export type ReserveDecision = { ok: true; ticket: Ticket } | { ok: false; reason: DenyReason };

export type SettleUsage = {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
};

export type UsageSnapshot = {
  month: string;
  day: string;
  monthSpentMicros: number;
  daySpentMicros: number;
  monthRequests: number;
  byFeature: Partial<Record<AiFeature, { spentMicros: number; requests: number }>>;
  tokens: SettleUsage;
};

export interface BudgetStore {
  reserve(req: ReserveRequest, limits: BudgetLimits): Promise<ReserveDecision>;
  /**
   * Replace the reservation with the real cost. `actualMicros` null = unknown
   * (timeout): the reservation stays as the charge.
   */
  settle(ticket: Ticket, actualMicros: number | null, usage?: SettleUsage): Promise<void>;
  snapshot(now: Date): Promise<UsageSnapshot>;
}

// ---------------------------------------------------------------------------
// In-memory store: tests, and local development with AI_BUDGET_STORE=memory.
// Never used in production (it would reset on every cold start).
// ---------------------------------------------------------------------------

export function createMemoryBudgetStore(): BudgetStore & { reset(): void } {
  let months = new Map<string, UsageSnapshot>();
  let days = new Map<string, number>();
  let quotas = new Map<string, number>();

  const emptyTokens = (): SettleUsage => ({ inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 });
  function monthOf(month: string, day: string): UsageSnapshot {
    let m = months.get(month);
    if (!m) {
      m = { month, day, monthSpentMicros: 0, daySpentMicros: 0, monthRequests: 0, byFeature: {}, tokens: emptyTokens() };
      months.set(month, m);
    }
    return m;
  }

  return {
    async reserve(req, limits) {
      const { month, day } = periodKeys(req.now);
      const m = monthOf(month, day);
      const quotaKey = req.userKey ? quotaDocId(day, req.feature, req.userKey) : null;
      const state: LedgerState = {
        monthSpentMicros: m.monthSpentMicros,
        daySpentMicros: days.get(day) ?? 0,
        userRequestsToday: quotaKey ? quotas.get(quotaKey) ?? 0 : 0,
      };
      const verdict = decide(state, req, limits);
      if (!verdict.ok) return verdict;
      m.monthSpentMicros += req.worstMicros;
      m.monthRequests += 1;
      days.set(day, state.daySpentMicros + req.worstMicros);
      if (quotaKey) quotas.set(quotaKey, state.userRequestsToday + 1);
      const f = (m.byFeature[req.feature] ??= { spentMicros: 0, requests: 0 });
      f.requests += 1;
      return { ok: true, ticket: { feature: req.feature, model: req.model, month, day, reservedMicros: req.worstMicros } };
    },
    async settle(ticket, actualMicros, usage) {
      const m = monthOf(ticket.month, ticket.day);
      const charged = actualMicros === null ? ticket.reservedMicros : actualMicros;
      const delta = charged - ticket.reservedMicros;
      m.monthSpentMicros += delta;
      days.set(ticket.day, (days.get(ticket.day) ?? 0) + delta);
      const f = (m.byFeature[ticket.feature] ??= { spentMicros: 0, requests: 0 });
      f.spentMicros += charged;
      if (usage) {
        m.tokens.inputTokens += usage.inputTokens;
        m.tokens.outputTokens += usage.outputTokens;
        m.tokens.cacheReadTokens += usage.cacheReadTokens;
        m.tokens.cacheWriteTokens += usage.cacheWriteTokens;
      }
    },
    async snapshot(now) {
      const { month, day } = periodKeys(now);
      const m = monthOf(month, day);
      return { ...m, day, daySpentMicros: days.get(day) ?? 0, byFeature: { ...m.byFeature }, tokens: { ...m.tokens } };
    },
    reset() {
      months = new Map();
      days = new Map();
      quotas = new Map();
    },
  };
}

// ---------------------------------------------------------------------------
// The process-wide store. lib/ai/budgetStore.ts installs the Firestore one on
// first use; tests install a memory store here without touching Firestore.
// ---------------------------------------------------------------------------

const holder = globalThis as unknown as { __PROMPTEA_AI_BUDGET_STORE__?: BudgetStore };

export function setBudgetStore(store: BudgetStore | undefined): void {
  holder.__PROMPTEA_AI_BUDGET_STORE__ = store;
}

export function currentBudgetStore(): BudgetStore | undefined {
  return holder.__PROMPTEA_AI_BUDGET_STORE__;
}
