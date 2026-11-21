// lib/newsletter/recipients.ts
//
// v1.8.8 — addresses that must never receive Promptea Weekly.
//
// The 2026-11-16 live send went to 8 "subscribers", and 3 of them were test
// addresses left behind by QA runs: two under the reserved `.test` TLD and one
// QA mailbox on promptea.me, which has no inbox. All three bounced, and every
// bounce counts against the sending domain's reputation in Resend.
//
// The rule is applied in two places:
//   - the weekly run skips them (counted as `excluded`, never sent), so the
//     list is safe even before anyone cleans the data;
//   - the subscribe endpoint refuses them, so they cannot come back.
// Cleaning the stored documents is a separate, explicit step:
// scripts/newsletter/exclude-test-subscribers.mjs (dry run by default).
//
// Pure: no SDK, no I/O. The address never leaves this function.

/** RFC 2606 / RFC 6761 top-level domains that can never receive mail. */
export const RESERVED_TLDS = ["test", "example", "invalid", "localhost"] as const;

/**
 * QA mailboxes created by Promptea's own release scripts (`test-qa-v150@…`).
 * promptea.me sends mail but has no inboxes, so these always bounce.
 */
const QA_MAILBOX_RE = /^test-qa(?:[-+.][a-z0-9.+-]*)?@promptea\.me$/;

export type ExclusionReason = "reserved_tld" | "qa_mailbox" | "configured";

/** Extra addresses or `@domain` entries from NEWSLETTER_EXCLUDED_RECIPIENTS (comma or space separated). */
export function parseExcludedRecipients(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(/[,;\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 2 && s.includes("@"));
}

/** Why an address must not receive the newsletter, or null when it may. */
export function exclusionReason(email: string, configured: readonly string[] = []): ExclusionReason | null {
  const address = email.trim().toLowerCase();
  const at = address.lastIndexOf("@");
  if (at < 1) return null;
  const domain = address.slice(at + 1);
  const tld = domain.split(".").pop() ?? "";
  if ((RESERVED_TLDS as readonly string[]).includes(tld)) return "reserved_tld";
  if (QA_MAILBOX_RE.test(address)) return "qa_mailbox";
  for (const entry of configured) {
    if (entry.startsWith("@") ? address.endsWith(entry) : address === entry) return "configured";
  }
  return null;
}

export function isExcludedRecipient(email: string, configured: readonly string[] = []): boolean {
  return exclusionReason(email, configured) !== null;
}
