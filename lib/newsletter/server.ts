// lib/newsletter/server.ts
//
// Server-only Firestore access for the Promptea Weekly newsletter.
//
// Mirrors the module shape of lib/blog/server.ts: a private collection
// constant, one exported async function per operation, fully typed inputs,
// no Firestore calls inlined into route handlers.
//
// Privacy invariant: raw email addresses are NEVER logged. The emailHash
// field (SHA-256) is the only queryable identifier stored alongside the
// email itself.

import "server-only";

import * as crypto from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase/admin";
import type { Lang } from "@/lib/domain";
import type { NewsletterEdition } from "@/lib/newsletter/types";

const EDITIONS_COLLECTION = "newsletter_editions";
const SUBSCRIBERS_COLLECTION = "newsletter_subscribers";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hashEmail(email: string): string {
  return crypto.createHash("sha256").update(email).digest("hex");
}

function generateUnsubscribeToken(): string {
  return crypto.randomBytes(32).toString("hex");
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
    console.error("[newsletter] addSubscriber failed:", err);
    // Degrade to already_subscribed so the UI never exposes an error that
    // might leak whether an email is subscribed.
    return { outcome: "already_subscribed" };
  }
}

export async function removeSubscriber(
  token: string
): Promise<{ ok: boolean }> {
  const db = getAdminFirestore();

  try {
    const snap = await db
      .collection(SUBSCRIBERS_COLLECTION)
      .where("unsubscribeToken", "==", token)
      .limit(1)
      .get();

    if (snap.empty) return { ok: false };

    await snap.docs[0].ref.update({
      status: "unsubscribed",
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { ok: true };
  } catch (err) {
    console.error("[newsletter] removeSubscriber failed:", err);
    return { ok: false };
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
    console.error("[newsletter] getSubscriberCount failed:", err);
    return 0;
  }
}

export async function listActiveSubscribers(
  limit: number
): Promise<Array<{ email: string; lang: Lang; unsubscribeToken: string }>> {
  const db = getAdminFirestore();

  try {
    const snap = await db
      .collection(SUBSCRIBERS_COLLECTION)
      .where("status", "==", "active")
      .limit(limit)
      .get();

    return snap.docs.map((doc) => {
      const d = doc.data();
      return {
        email: d.email as string,
        lang: d.lang as Lang,
        unsubscribeToken: d.unsubscribeToken as string,
      };
    });
  } catch (err) {
    console.error("[newsletter] listActiveSubscribers failed:", err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Editions
// ---------------------------------------------------------------------------

export async function saveEdition(
  edition: NewsletterEdition
): Promise<{ ok: true }> {
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

export async function getLatestEdition(): Promise<NewsletterEdition | null> {
  const db = getAdminFirestore();

  try {
    const snap = await db
      .collection(EDITIONS_COLLECTION)
      .where("status", "==", "published")
      .orderBy("weekEnd", "desc")
      .limit(1)
      .get();

    if (snap.empty) return null;

    return snap.docs[0].data() as NewsletterEdition;
  } catch (err) {
    console.error("[newsletter] getLatestEdition failed:", err);
    return null;
  }
}

export async function getEditionById(
  editionId: string
): Promise<NewsletterEdition | null> {
  const db = getAdminFirestore();

  try {
    const snap = await db
      .collection(EDITIONS_COLLECTION)
      .doc(editionId)
      .get();

    if (!snap.exists) return null;

    return snap.data() as NewsletterEdition;
  } catch (err) {
    console.error("[newsletter] getEditionById failed:", err);
    return null;
  }
}
