// lib/newsletter/config.ts
//
// v1.6.0 — delivery configuration and safety gates (pure: reads an env
// object, never the SDK). Evaluated per run, not at module load, so a Vercel
// env change takes effect on the next deploy without code paths caching it.
//
// Gates, in order of strictness:
//   dry_run — nothing is sent; always allowed.
//   test    — sends ONLY to NEWSLETTER_TEST_RECIPIENTS. Needs RESEND_API_KEY
//             and a valid sender, but NOT NEWSLETTER_DELIVERY_ENABLED, so
//             delivery can be verified before it is switched on.
//   live    — sends to every active subscriber. Needs everything above AND
//             NEWSLETTER_DELIVERY_ENABLED=true AND at least one test
//             recipient: every live run first sends the edition to the
//             test recipients (canary) and stops if that fails.
// A missing requirement is reported before anything is sent — never a
// partial send.

import { DEFAULT_SITE_URL } from "./render";

export const DEFAULT_FROM_ADDRESS = "Promptea Weekly <weekly@promptea.me>";
export const MAX_TEST_RECIPIENTS = 5;

const EMAIL_RE = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;
/** `Name <addr@domain>` or a bare address. */
const FROM_RE = /^(?:[^<>"]{1,80}\s<[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+>|[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+)$/;

export type NewsletterRunMode = "dry_run" | "test" | "live";

export type DeliveryConfig = {
  deliveryEnabled: boolean;
  apiKey: string | null;
  from: string;
  fromValid: boolean;
  siteUrl: string;
  testRecipients: string[];
  /** Entries in NEWSLETTER_TEST_RECIPIENTS that were not valid addresses. */
  invalidTestRecipients: number;
};

export function readDeliveryConfig(env: Record<string, string | undefined> = process.env): DeliveryConfig {
  const from = (env.NEWSLETTER_FROM_ADDRESS ?? "").trim() || DEFAULT_FROM_ADDRESS;
  const rawRecipients = (env.NEWSLETTER_TEST_RECIPIENTS ?? "")
    .split(/[,;\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const valid = [...new Set(rawRecipients.filter((r) => EMAIL_RE.test(r)))].slice(0, MAX_TEST_RECIPIENTS);
  const apiKey = (env.RESEND_API_KEY ?? "").trim();

  return {
    deliveryEnabled: (env.NEWSLETTER_DELIVERY_ENABLED ?? "").trim().toLowerCase() === "true",
    apiKey: apiKey.length > 8 ? apiKey : null,
    from,
    fromValid: FROM_RE.test(from),
    siteUrl: ((env.NEXT_PUBLIC_SITE_URL ?? "").trim() || DEFAULT_SITE_URL).replace(/\/+$/, ""),
    testRecipients: valid,
    invalidTestRecipients: rawRecipients.length - rawRecipients.filter((r) => EMAIL_RE.test(r)).length,
  };
}

/** Human-readable blockers for a mode (empty = the mode may run). Never includes secrets. */
export function configBlockers(cfg: DeliveryConfig, mode: NewsletterRunMode): string[] {
  if (mode === "dry_run") return [];
  const out: string[] = [];
  if (!cfg.apiKey) out.push("RESEND_API_KEY is not set");
  if (!cfg.fromValid) out.push("NEWSLETTER_FROM_ADDRESS is not a valid sender (expected `Name <address@domain>`)");
  if (cfg.testRecipients.length === 0) out.push("NEWSLETTER_TEST_RECIPIENTS has no valid address (required for test sends and as the live canary)");
  if (cfg.invalidTestRecipients > 0) out.push(`NEWSLETTER_TEST_RECIPIENTS contains ${cfg.invalidTestRecipients} invalid entr${cfg.invalidTestRecipients === 1 ? "y" : "ies"}`);
  if (mode === "live" && !cfg.deliveryEnabled) out.push("NEWSLETTER_DELIVERY_ENABLED is not `true`");
  return out;
}

/** Non-secret summary safe to return in API responses and run records. */
export function configSummary(cfg: DeliveryConfig) {
  return {
    deliveryEnabled: cfg.deliveryEnabled,
    resendKeyPresent: Boolean(cfg.apiKey),
    fromAddress: cfg.from,
    fromValid: cfg.fromValid,
    testRecipientCount: cfg.testRecipients.length,
    siteUrl: cfg.siteUrl,
  };
}
