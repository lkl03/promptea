#!/usr/bin/env node
// scripts/newsletter/exclude-test-subscribers.mjs — v1.8.8
//
// Marks the test addresses left in `newsletter_subscribers` as unsubscribed,
// so they stop counting as subscribers. Same rule as lib/newsletter/recipients.ts
// (the weekly run already skips them; this cleans the data).
//
//   node --env-file=.env.production.local scripts/newsletter/exclude-test-subscribers.mjs          # dry run: lists, writes nothing
//   node --env-file=.env.production.local scripts/newsletter/exclude-test-subscribers.mjs --apply  # writes
//
// Needs FIREBASE_SERVICE_ACCOUNT_BASE64 (the same variable Vercel uses).
// Reversible: it sets status "unsubscribed" plus `excludedReason`; it never
// deletes a document. Addresses are printed masked (t***@test.test).

import { cert, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const APPLY = process.argv.includes("--apply");
const RESERVED_TLDS = ["test", "example", "invalid", "localhost"];
const RESERVED_DOMAINS = ["example.com", "example.net", "example.org"];
const QA_MAILBOX_RE = /^test-qa(?:[-+.][a-z0-9.+-]*)?@promptea\.me$/;
const configured = (process.env.NEWSLETTER_EXCLUDED_RECIPIENTS ?? "")
  .split(/[,;\s]+/)
  .map((s) => s.trim().toLowerCase())
  .filter((s) => s.length > 2 && s.includes("@"));

function reason(email) {
  const a = String(email ?? "").trim().toLowerCase();
  const at = a.lastIndexOf("@");
  if (at < 1) return null;
  const domain = a.slice(at + 1);
  const tld = domain.split(".").pop();
  if (RESERVED_TLDS.includes(tld)) return "reserved_tld";
  if (RESERVED_DOMAINS.some((d) => domain === d || domain.endsWith(`.${d}`))) return "reserved_domain";
  if (QA_MAILBOX_RE.test(a)) return "qa_mailbox";
  if (configured.some((e) => (e.startsWith("@") ? a.endsWith(e) : a === e))) return "configured";
  return null;
}

const mask = (e) => e.replace(/^(.)[^@]*/, "$1***");

const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
if (!b64) {
  console.error("FIREBASE_SERVICE_ACCOUNT_BASE64 is not set. Pass an env file with --env-file.");
  process.exit(2);
}
const sa = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
if (typeof sa.private_key === "string") sa.private_key = sa.private_key.replace(/\\n/g, "\n"); // literal "\n" → newline, as lib/firebase/admin.ts
const db = getFirestore(initializeApp({ credential: cert(sa), projectId: process.env.FIREBASE_PROJECT_ID ?? sa.project_id }));

const snap = await db.collection("newsletter_subscribers").where("status", "==", "active").get();
const hits = snap.docs.map((d) => ({ ref: d.ref, email: String(d.get("email") ?? ""), why: reason(d.get("email")) })).filter((h) => h.why);

console.log(`active subscribers: ${snap.size}; test addresses: ${hits.length}`);
for (const h of hits) console.log(`  ${h.ref.id}  ${mask(h.email)}  (${h.why})`);

if (!APPLY) {
  console.log("\nDry run: nothing was written. Re-run with --apply to mark them unsubscribed.");
  process.exit(0);
}
for (const h of hits) {
  await h.ref.update({ status: "unsubscribed", excludedReason: h.why, updatedAt: FieldValue.serverTimestamp() });
}
console.log(`\nMarked ${hits.length} document(s) as unsubscribed (excludedReason set). Nothing was deleted.`);
