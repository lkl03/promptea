// lib/ops/server.ts
//
// v1.8.8 — server-only reads for the routine health check, and the
// once-a-day guard for its alert email. Read-only except `claimAlertDay`,
// which writes one tiny document per day so a cron that fires twice cannot
// mail twice.

import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { latestPublishedAtByEdition } from "@/lib/blog/server";
import { latestEditionActivity } from "@/lib/newsletter/server";
import type { RoutineActivity } from "@/lib/ops/routineHealth";

const ALERTS_COLLECTION = "ops_alerts";

const toDate = (iso: string | null | undefined) => (iso ? new Date(iso) : null);
const newest = (...isos: Array<string | undefined>) =>
  isos.filter((x): x is string => Boolean(x)).sort().pop() ?? null;

/** The last output of every routine, read from the same data the site shows. */
export async function readRoutineActivity(): Promise<RoutineActivity> {
  const [byEdition, editions] = await Promise.all([latestPublishedAtByEdition(), latestEditionActivity()]);
  return {
    daily: { lastAt: toDate(byEdition.daily) },
    morning: { lastAt: toDate(byEdition["daily-morning"]) },
    tech: { lastAt: toDate(byEdition["tech-daily"]) },
    weekly: { lastAt: toDate(newest(byEdition["weekly-recap"], byEdition["week-ahead"])) },
    newsletter: {
      lastAt: toDate(editions.lastSent?.at),
      detail: {
        lastSentEdition: editions.lastSent?.editionId ?? null,
        lastPublishedEdition: editions.lastPublished?.editionId ?? null,
        lastPublishedAt: editions.lastPublished?.at ?? null,
      },
    },
  };
}

/**
 * True the first time it is called for `day` (YYYY-MM-DD); false afterwards.
 * `create` fails when the document exists, which makes the claim atomic.
 */
export async function claimAlertDay(day: string, overdue: readonly string[]): Promise<boolean> {
  const db = getAdminFirestore();
  try {
    await db.collection(ALERTS_COLLECTION).doc(`routine-health_${day}`).create({
      kind: "routine-health",
      day,
      overdue: [...overdue],
      createdAt: FieldValue.serverTimestamp(),
    });
    return true;
  } catch (err) {
    // 6 = ALREADY_EXISTS: today's alert already went out.
    if ((err as { code?: unknown })?.code === 6) return false;
    throw err;
  }
}
