// lib/newsletter/email.ts
//
// Resend-backed mailer for Promptea Weekly (server-only).
//
// v1.6.0 rewrite of the v1.5.0 `sendNewsletter` loop, which (a) counted a
// message as sent even when Resend returned an error — the SDK reports API
// errors as `{ error }`, it does not throw — (b) had no idempotency, so a
// retried run re-mailed everyone, and (c) was never called anywhere. Sending
// is now orchestrated by lib/newsletter/run.ts; this module only turns one
// message into one Resend call, with an idempotency key.
//
// Rendering lives in lib/newsletter/render.ts (pure, testable); it is
// re-exported here for callers that imported it from this module.

import "server-only";

import { Resend } from "resend";

export { renderNewsletterHtml, renderNewsletterText } from "./render";

export type OutgoingEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
  headers: Record<string, string>;
  /** Resend de-duplicates repeated keys for 24 h, so a retry cannot double-send. */
  idempotencyKey?: string;
  tags?: Array<{ name: string; value: string }>;
};

export type SendOutcome =
  | { ok: true; id: string | null }
  | { ok: false; error: string; retryable: boolean };

export interface Mailer {
  send(message: OutgoingEmail): Promise<SendOutcome>;
}

/** Errors worth retrying on the next run (the ledger keeps them `failed`). */
const RETRYABLE = new Set(["rate_limit_exceeded", "application_error", "internal_server_error", "concurrent_idempotent_requests"]);

export function createResendMailer(apiKey: string, from: string): Mailer {
  const resend = new Resend(apiKey);
  return {
    async send(message) {
      try {
        const { data, error } = await resend.emails.send(
          {
            from,
            to: [message.to],
            subject: message.subject,
            html: message.html,
            text: message.text,
            headers: message.headers,
            tags: message.tags,
          },
          message.idempotencyKey ? { idempotencyKey: message.idempotencyKey } : undefined
        );
        if (error) {
          // Only the error NAME leaves this function — never the address.
          return { ok: false, error: error.name ?? "send_error", retryable: RETRYABLE.has(error.name) };
        }
        return { ok: true, id: data?.id ?? null };
      } catch (err) {
        const name = (err as { name?: string })?.name ?? "network_error";
        return { ok: false, error: name, retryable: true };
      }
    },
  };
}
