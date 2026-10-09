#!/usr/bin/env node
// scripts/weekly-backfill.mjs
//
// v1.7.0 — make every Promptea Weekly edition that was actually EMAILED
// visible in AI Daily → Weekly digest, without sending anything.
//
// Evidence-based and idempotent:
//   - The source of truth for "was sent" is `newsletter_runs` with
//     mode=live and outcome SENT (or PARTIAL with sent > 0).
//   - The content must already exist in `newsletter_editions/<editionId>`:
//     live runs store the exact edition before mailing it. If a sent run has
//     no stored edition, it is REPORTED, never regenerated — rebuilding it
//     from articles today would not be the email that went out.
//   - Test sends (mode=test) only reached the canary inbox and stored no
//     content; they are reported, not published.
//   - The only write is flipping a stored, sent edition whose status is not
//     public to `sent` (plus `sentAt` from the run). Running twice changes
//     nothing the second time. It never touches subscribers or the ledger and
//     never calls the mail provider.
//
// Usage:
//   node --env-file=.env.local scripts/weekly-backfill.mjs          # report only
//   node --env-file=.env.local scripts/weekly-backfill.mjs --write  # apply repairs
// Needs FIREBASE_SERVICE_ACCOUNT_BASE64 (and optionally FIREBASE_PROJECT_ID).

import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const WRITE = process.argv.includes("--write");

function db() {
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (!b64) throw new Error("FIREBASE_SERVICE_ACCOUNT_BASE64 is not set");
  const sa = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
  if (typeof sa.private_key === "string") sa.private_key = sa.private_key.replace(/\\n/g, "\n");
  const app = initializeApp({ credential: cert(sa), projectId: process.env.FIREBASE_PROJECT_ID ?? sa.project_id });
  return getFirestore(app);
}

async function main() {
  const firestore = db();
  const runs = (await firestore.collection("newsletter_runs").get()).docs.map((d) => d.data());

  const sent = new Map(); // editionId → latest sentAt evidence
  const testOnly = new Set();
  for (const r of runs) {
    if (!r.editionId) continue;
    const delivered = r.mode === "live" && (r.outcome === "SENT" || (r.outcome === "PARTIAL" && (r.counts?.sent ?? 0) > 0));
    if (delivered) {
      const at = r.startedAt ?? null;
      if (!sent.has(r.editionId) || (at && at > sent.get(r.editionId))) sent.set(r.editionId, at);
    } else if (r.mode === "test" && r.outcome === "TEST_SENT") {
      testOnly.add(r.editionId);
    }
  }

  const report = { sentEditions: [], repaired: [], missingContent: [], testOnly: [] };
  for (const [editionId, at] of [...sent.entries()].sort()) {
    const ref = firestore.collection("newsletter_editions").doc(editionId);
    const snap = await ref.get();
    if (!snap.exists || !snap.data()?.locales) {
      report.missingContent.push(editionId);
      continue;
    }
    const status = snap.data().status;
    report.sentEditions.push({ editionId, status });
    if (status !== "sent" && status !== "published") {
      report.repaired.push({ editionId, from: status, to: "sent" });
      if (WRITE) await ref.set({ status: "sent", sentAt: snap.data().sentAt ?? at }, { merge: true });
    }
  }
  for (const id of [...testOnly].sort()) if (!sent.has(id)) report.testOnly.push(id);

  console.log(JSON.stringify({ mode: WRITE ? "write" : "report", ...report }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
