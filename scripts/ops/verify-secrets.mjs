#!/usr/bin/env node
// scripts/ops/verify-secrets.mjs — v1.8.8
//
// After rotating BLOG_PUBLISH_SECRET / NEWSLETTER_SEND_SECRET: checks that the
// value you hold matches the one Vercel has, WITHOUT publishing, storing or
// sending anything. Each endpoint verifies the HMAC signature before it parses
// the body, so a correctly signed but empty body `{}` comes back 400
// "validation" (secret OK) while a wrong secret comes back 401.
//
//   node --env-file=.env.rotation scripts/ops/verify-secrets.mjs [--base=https://www.promptea.me]
//
// .env.rotation (never commit it) holds BLOG_PUBLISH_SECRET=… and/or
// NEWSLETTER_SEND_SECRET=…. Secrets are never printed.

import { createHmac, randomBytes } from "node:crypto";

const base = (process.argv.find((a) => a.startsWith("--base="))?.slice(7) ?? "https://www.promptea.me").replace(/\/+$/, "");
const checks = [
  { name: "BLOG_PUBLISH_SECRET", path: "/api/internal/blog/publish" },
  { name: "NEWSLETTER_SEND_SECRET", path: "/api/internal/newsletter/run" },
];

let failed = 0;
for (const c of checks) {
  const secret = process.env[c.name];
  if (!secret) {
    console.log(`- ${c.name}: not in the env file, skipped`);
    continue;
  }
  const body = "{}";
  const ts = String(Math.floor(Date.now() / 1000));
  const nonce = randomBytes(16).toString("hex");
  const sig = createHmac("sha256", secret).update(`${ts}.${nonce}.${body}`).digest("hex");
  const res = await fetch(base + c.path, {
    method: "POST",
    headers: { "content-type": "application/json", "x-promptea-timestamp": ts, "x-promptea-nonce": nonce, "x-promptea-signature": sig },
    body,
  });
  const out = await res.json().catch(() => ({}));
  let verdict;
  if (res.status === 400 && out.error === "validation") verdict = "OK: matches the server (signed request accepted; nothing written)";
  else if (res.status === 401) { verdict = `MISMATCH: the server rejected the signature (${out.error ?? "401"}). Vercel has a different value, or the redeploy has not finished.`; failed++; }
  else if (res.status === 503) { verdict = "SERVER NOT CONFIGURED: the variable is missing or shorter than 32 characters in Vercel."; failed++; }
  else { verdict = `UNEXPECTED: HTTP ${res.status} ${out.error ?? ""}`; failed++; }
  console.log(`- ${c.name} → ${base}${c.path}: ${verdict}`);
}
process.exit(failed ? 1 : 0);
