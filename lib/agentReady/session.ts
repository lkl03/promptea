// lib/agentReady/session.ts
//
// v1.9.0 — an audit saved as a session, so the person's coding agent can read
// it through the MCP server and work through it.
//
// What a session is:
//   - the audit (what was checked and found), the fix plan the person arranged
//     (an ordered list of check ids) and which fixes are marked done;
//   - addressed by an unguessable id: 128 random bits, base64url. The id is the
//     only credential — whoever holds it can read the session, reorder its plan
//     and mark progress. Nothing else can be changed through it;
//   - short-lived: SESSION_TTL_DAYS, enforced on every read (and by a Firestore
//     TTL policy on `expiresAt`, when the owner enables one);
//   - free of personal data: no IP, no user agent, no account. The audited URL
//     is a public page the person chose to scan.
//
// Pure helpers here (no Node-only imports: the page uses the ordering too); the storage is in store.ts.

import { CHECK_IDS, type Audit, type CheckId } from "./types";

export const SESSION_TTL_DAYS = 14;
export const SESSION_ID_RE = /^[A-Za-z0-9_-]{22}$/;

/** How many times a session may be re-scanned, and how often. */
export const RECHECK_LIMITS = { perSession: 30, minIntervalMs: 20_000 } as const;

export type FixProgress = { done: boolean; at: string };

export type AuditSession = {
  id: string;
  audit: Audit;
  /** Check ids in the order the person wants them fixed. Empty = the default order (most points first). */
  plan: CheckId[];
  progress: Partial<Record<CheckId, FixProgress>>;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  rechecks: number;
  lastRecheckAt: string | null;
};

/** 128 random bits as base64url (22 characters). Web Crypto, so this module also loads in the browser. */
export function newSessionId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function isSessionId(x: unknown): x is string {
  return typeof x === "string" && SESSION_ID_RE.test(x);
}

export function isCheckId(x: unknown): x is CheckId {
  return typeof x === "string" && (CHECK_IDS as readonly string[]).includes(x);
}

export function createSession(audit: Audit, now: Date = new Date(), id: string = newSessionId()): AuditSession {
  const iso = now.toISOString();
  return {
    id,
    audit,
    plan: [],
    progress: {},
    createdAt: iso,
    updatedAt: iso,
    expiresAt: new Date(now.getTime() + SESSION_TTL_DAYS * 86_400_000).toISOString(),
    rechecks: 0,
    lastRecheckAt: null,
  };
}

export function isExpired(session: Pick<AuditSession, "expiresAt">, now: Date = new Date()): boolean {
  return new Date(session.expiresAt).getTime() <= now.getTime();
}

/** The checks that did not pass: what there is to fix. */
export function openCheckIds(audit: Audit): CheckId[] {
  return audit.checks.filter((c) => c.status !== "pass").map((c) => c.id);
}

/**
 * A plan as sent by a client, reduced to what is valid for this audit: known
 * check ids that are open in it, each once, in the given order.
 */
export function sanitizePlan(input: unknown, audit: Audit): CheckId[] {
  if (!Array.isArray(input)) return [];
  const open = new Set(openCheckIds(audit));
  const out: CheckId[] = [];
  for (const x of input.slice(0, CHECK_IDS.length * 2)) {
    if (isCheckId(x) && open.has(x) && !out.includes(x)) out.push(x);
  }
  return out;
}

/**
 * The order fixes are worked in: the person's plan first, then every other open
 * check by points lost (most valuable first).
 */
export function orderedFixIds(session: Pick<AuditSession, "audit" | "plan">): CheckId[] {
  const open = session.audit.checks.filter((c) => c.status !== "pass");
  const planned = session.plan.filter((id) => open.some((c) => c.id === id));
  const rest = open
    .filter((c) => !planned.includes(c.id))
    .sort((a, b) => b.weight - b.points - (a.weight - a.points) || CHECK_IDS.indexOf(a.id) - CHECK_IDS.indexOf(b.id))
    .map((c) => c.id);
  return [...planned, ...rest];
}

export type RecheckDenied = "limit" | "too_soon";

export function canRecheck(session: Pick<AuditSession, "rechecks" | "lastRecheckAt">, now: Date = new Date()): { ok: true } | { ok: false; reason: RecheckDenied; retryAfterSec: number } {
  if (session.rechecks >= RECHECK_LIMITS.perSession) return { ok: false, reason: "limit", retryAfterSec: 0 };
  if (session.lastRecheckAt) {
    const wait = new Date(session.lastRecheckAt).getTime() + RECHECK_LIMITS.minIntervalMs - now.getTime();
    if (wait > 0) return { ok: false, reason: "too_soon", retryAfterSec: Math.ceil(wait / 1000) };
  }
  return { ok: true };
}

/**
 * A fresh audit replaces the old one. Progress is kept only for checks that are
 * still open (a check that now passes needs no "done" mark; one that came back
 * failing after being marked done is reopened by the new audit's own status).
 */
export function applyRecheck(session: AuditSession, audit: Audit, now: Date = new Date()): AuditSession {
  const open = new Set(openCheckIds(audit));
  const progress: AuditSession["progress"] = {};
  for (const [id, p] of Object.entries(session.progress) as Array<[CheckId, FixProgress]>) if (open.has(id)) progress[id] = p;
  return {
    ...session,
    audit,
    plan: session.plan.filter((id) => open.has(id)),
    progress,
    updatedAt: now.toISOString(),
    rechecks: session.rechecks + 1,
    lastRecheckAt: now.toISOString(),
  };
}

/** The audit without the page's own text: what may leave through the MCP server. */
export function auditForAgents(audit: Audit): Omit<Audit, "agentView" | "humanView"> & { page: { words: number; htmlTokens: number; textTokens: number; markdownTokens: number | null; jsonLdTypes: string[] } } {
  const { agentView, humanView: _humanView, ...rest } = audit;
  void _humanView;
  return { ...rest, page: { words: agentView.words, htmlTokens: agentView.htmlTokens, textTokens: agentView.textTokens, markdownTokens: agentView.markdownTokens, jsonLdTypes: agentView.jsonLdTypes } };
}
