// lib/newsletter/server.ts
//
// Server-only Firestore access for the Promptea Weekly newsletter.
//
// Mirrors the module shape of lib/blog/server.ts: private collection
// constants, one exported async function per operation, fully typed inputs,
// no Firestore calls inlined into route handlers.
//
// Privacy invariant: raw email addresses are NEVER logged. The emailHash
// field (SHA-256) is the only queryable identifier stored alongside the
// email itself, and the delivery ledger is keyed by subscriber document id.
//
// v1.6.0: adds the NewsletterStore used by lib/newsletter/run.ts — edition
// storage (create-once per week), paginated active-subscriber reads, the
// per-recipient delivery ledger that makes retries safe, and run records.
// getLatestEdition no longer needs a composite index (it orders by the
// date-keyed document id) and also returns editions that have been sent.

import "server-only";

import * as crypto from "node:crypto";
import { FieldPath, FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase/admin";
import type { Lang } from "@/lib/domain";
import type { NewsletterEdition } from "@/lib/newsletter/types";
import type { ClaimResult, NewsletterRunRecord, NewsletterStore, SubscriberRecord } from "@/lib/newsletter/run";

const EDITIONS_COLLECTION = "newsletter_editions";
const SUBSCRIBERS_COLLECTION = "newsletter_subscribers";
const DELIVERIES_COLLECTION = "newsletter_deliveries";
const RUNS_COLLECTION = "newsletter_runs";

/** A claim younger than this is another run's in-flight send — leave it alone. */
const IN_FLIGHT_MS = 10 * 60_000;
/** Resend de-duplicates an idempotency key for 24 h; stay safely inside it. */
const IDEMPOTENCY_WINDOW_MS = 23 * 60 * 60_000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hashEmail(email: string): string {
  return crypto.createHash("sha256").update(email).digest("hex");
}

function generateUnsubscribeToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/** Unsubscribe tokens are 64 hex characters (32 random bytes). */
export function isUnsubscribeToken(token: unknown): token is string {
  return typeof token === "string" && /^[a-f0-9]{64}$/i.test(token);
}

function deliveryDocId(editionId: string, recipientKey: string): string {
  return `${editionId}__${recipientKey}`.replace(/\//g, "_");
}

// ---------------------------------------------------------------------------
// Subscribers
// ---------------------------------------------------------------------------

export async function addSubscriber(input: {
  email: string;
  lang: Lang;
}): Promise<{ outcome: "subscribed" | "already_subscribed" }> {
  const db = getAdminFirestore();
  const email = input.email.trim().toLowerCase();
  const emailHash = hashEmail(email);

  try {
    const snap = await db
      .collection(SUBSCRIBERS_COLLECTION)
      .where("emailHash", "==", emailHash)
      .limit(1)
      .get();

    if (!snap.empty) {
      const doc = snap.docs[0];
      const data = doc.data();

      if (data.status === "active") {
        return { outcome: "already_subscribed" };
      }

      // Reactivate a previously unsubscribed user.
      await doc.ref.update({
        status: "active",
        lang: input.lang,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return { outcome: "subscribed" };
    }

    // New subscriber.
    await db.collection(SUBSCRIBERS_COLLECTION).add({
      email,
      emailHash,
      lang: input.lang,
      subscribedAt: new Date().toISOString(),
      unsubscribeToken: generateUnsubscribeToken(),
      status: "active",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { outcome: "subscribed" };
  } catch (err) {
    console.error("[newsletter] addSubscriber failed:", (err as { code?: unknown })?.code ?? "unknown");
    // Degrade to already_subscribed so the UI never exposes an error that
    // might leak whether an email is subscribed.
    return { outcome: "already_subscribed" };
  }
}

export type RemoveSubscriberResult =
  | { ok: true; lang: Lang | null }
  | { ok: false; reason: "invalid_token" | "not_found" | "unavailable" };

/** Idempotent: unsubscribing twice is still a success. */
export async function removeSubscriber(token: string): Promise<RemoveSubscriberResult> {
  if (!isUnsubscribeToken(token)) return { ok: false, reason: "invalid_token" };

  try {
    const db = getAdminFirestore();
    const snap = await db
      .collection(SUBSCRIBERS_COLLECTION)
      .where("unsubscribeToken", "==", token)
      .limit(1)
      .get();

    if (snap.empty) return { ok: false, reason: "not_found" };

    const doc = snap.docs[0];
    await doc.ref.update({
      status: "unsubscribed",
      unsubscribedAt: new Date().toISOString(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    const lang = doc.data()?.lang;
    return { ok: true, lang: lang === "es" || lang === "en" ? lang : null };
  } catch (err) {
    console.error("[newsletter] removeSubscriber failed:", (err as { code?: unknown })?.code ?? "unknown");
    return { ok: false, reason: "unavailable" };
  }
}

export async function getSubscriberCount(): Promise<number> {
  const db = getAdminFirestore();

  try {
    const snap = await db
      .collection(SUBSCRIBERS_COLLECTION)
      .where("status", "==", "active")
      .count()
      .get();

    return snap.data().count;
  } catch (err) {
    console.error("[newsletter] getSubscriberCount failed:", (err as { code?: unknown })?.code ?? "unknown");
    return 0;
  }
}

/**
 * Every active subscriber, paginated by document id (equality filter +
 * document-id order is served by Firestore's automatic indexes). Throws on
 * storage errors so a run never mistakes an outage for "no subscribers".
 */
export async function listActiveSubscribers(pageSize = 500): Promise<SubscriberRecord[]> {
  const db = getAdminFirestore();
  const out: SubscriberRecord[] = [];
  let lastId: string | null = null;

  for (let page = 0; page < 200; page++) {
    let query = db
      .collection(SUBSCRIBERS_COLLECTION)
      .where("status", "==", "active")
      .orderBy(FieldPath.documentId())
      .limit(pageSize);
    if (lastId) query = query.startAfter(lastId);

    const snap = await query.get();
    for (const doc of snap.docs) {
      const d = doc.data();
      if (typeof d.email !== "string" || !isUnsubscribeToken(d.unsubscribeToken)) continue;
      out.push({ id: doc.id, email: d.email, lang: d.lang === "es" ? "es" : "en", unsubscribeToken: d.unsubscribeToken });
    }
    if (snap.docs.length < pageSize) break;
    lastId = snap.docs[snap.docs.length - 1].id;
  }

  return out;
}

// ---------------------------------------------------------------------------
// Editions
// ---------------------------------------------------------------------------

export async function saveEdition(edition: NewsletterEdition): Promise<{ ok: true }> {
  const db = getAdminFirestore();

  await db
    .collection(EDITIONS_COLLECTION)
    .doc(edition.editionId)
    .set(
      {
        ...edition,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

  return { ok: true };
}

/**
 * The newest edition readers may see (published or already sent). Edition ids
 * are `promptea-weekly_YYYY-MM-DD`, so document-id order is date order — no
 * composite index required.
 */
export async function getLatestEdition(): Promise<NewsletterEdition | null> {
  const db = getAdminFirestore();

  try {
    const snap = await db
      .collection(EDITIONS_COLLECTION)
      .orderBy(FieldPath.documentId(), "desc")
      .limit(8)
      .get();

    for (const doc of snap.docs) {
      const data = doc.data() as NewsletterEdition;
      if (data.status === "published" || data.status === "sent") return data;
    }
    return null;
  } catch (err) {
    console.error("[newsletter] getLatestEdition failed:", (err as { code?: unknown })?.code ?? "unknown");
    return null;
  }
}

export async function getEditionById(editionId: string): Promise<NewsletterEdition | null> {
  const db = getAdminFirestore();

  try {
    const snap = await db.collection(EDITIONS_COLLECTION).doc(editionId).get();
    if (!snap.exists) return null;
    return snap.data() as NewsletterEdition;
  } catch (err) {
    console.error("[newsletter] getEditionById failed:", (err as { code?: unknown })?.code ?? "unknown");
    return null;
  }
}

// ---------------------------------------------------------------------------
// NewsletterStore (v1.6.0) — used by lib/newsletter/run.ts
// ---------------------------------------------------------------------------

function stripMeta(data: Record<string, unknown>): NewsletterEdition {
  // Firestore bookkeeping fields are not part of the edition contract.
  const { updatedAt: _u, createdAt: _c, ...rest } = data;
  void _u;
  void _c;
  return rest as unknown as NewsletterEdition;
}

export function firestoreNewsletterStore(): NewsletterStore {
  const db = getAdminFirestore();
  const editions = db.collection(EDITIONS_COLLECTION);
  const deliveries = db.collection(DELIVERIES_COLLECTION);

  return {
    async getEdition(editionId) {
      const snap = await editions.doc(editionId).get();
      return snap.exists ? stripMeta(snap.data() ?? {}) : null;
    },

    async createEditionIfAbsent(edition) {
      const ref = editions.doc(edition.editionId);
      return db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (snap.exists) return stripMeta(snap.data() ?? {});
        tx.create(ref, { ...edition, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
        return edition;
      });
    },

    async updateEdition(editionId, patch) {
      await editions.doc(editionId).set({ ...patch, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    },

    async listActiveSubscribers() {
      return listActiveSubscribers();
    },

    async claimDelivery(editionId, recipientKey, now): Promise<ClaimResult> {
      const ref = deliveries.doc(deliveryDocId(editionId, recipientKey));
      return db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const nowIso = now.toISOString();
        if (!snap.exists) {
          tx.create(ref, { editionId, recipientKey, status: "sending", attempts: 1, claimedAt: nowIso, updatedAt: nowIso });
          return "claimed";
        }
        const d = snap.data() ?? {};
        if (d.status === "sent") return "already_sent";
        if (d.status === "rejected") return "rejected";
        const firstClaim = Date.parse(String(d.firstClaimedAt ?? d.claimedAt ?? nowIso));
        const lastClaim = Date.parse(String(d.claimedAt ?? nowIso));
        if (d.status === "sending" && now.getTime() - lastClaim < IN_FLIGHT_MS) return "in_flight";
        // Retrying with the same idempotency key is only safe while Resend
        // still remembers the first attempt.
        if (now.getTime() - firstClaim > IDEMPOTENCY_WINDOW_MS) return "unknown";
        tx.update(ref, {
          status: "sending",
          attempts: Number(d.attempts ?? 1) + 1,
          firstClaimedAt: d.firstClaimedAt ?? d.claimedAt ?? nowIso,
          claimedAt: nowIso,
          updatedAt: nowIso,
        });
        return "claimed";
      });
    },

    async completeDelivery(editionId, recipientKey, result, now) {
      await deliveries.doc(deliveryDocId(editionId, recipientKey)).set(
        {
          status: result.status,
          providerId: result.providerId ?? null,
          error: result.error ?? null,
          completedAt: now.toISOString(),
          updatedAt: now.toISOString(),
        },
        { merge: true }
      );
    },

    async recordRun(run: NewsletterRunRecord) {
      await db.collection(RUNS_COLLECTION).add({ ...run, recordedAt: FieldValue.serverTimestamp() });
    },
  };
}
