// lib/newsletter/run.ts
//
// v1.6.0 — the Promptea Weekly run: build (or reuse) the week's edition and,
// when the mode and configuration allow it, deliver it.
//
// Pure orchestration: storage, mail, and article loading are injected, so the
// whole flow — including retries — is tested without Firestore or Resend.
//
// Guarantees:
// - Content: the edition is derived from published AI Daily articles only
//   (lib/newsletter/compose.ts). It is created once per week (id keyed by the
//   Monday) and reused by every later run that week, so a retry never mails a
//   different version.
// - Idempotency: every recipient is claimed in a delivery ledger before the
//   send (`{editionId}__{recipientKey}`), and the Resend call carries the same
//   key as its idempotency key. A retried or overlapping run skips anyone
//   already sent, and a crash between "sent" and "recorded" is absorbed by
//   Resend's 24 h idempotency window. Claims older than that window are never
//   re-sent automatically — they are reported as `unknown` instead.
// - Safety: live delivery needs NEWSLETTER_DELIVERY_ENABLED=true and a
//   successful canary send to NEWSLETTER_TEST_RECIPIENTS first; a missing
//   requirement stops the run before anything is sent.
// - Privacy: results, logs, and run records carry counts and ids — never a
//   subscriber address.

import { createHash } from "node:crypto";
import type { Lang } from "@/lib/domain";
import type { PublicArticle } from "@/lib/blog/types";
import { editorialDate, isEditorialDate, type EditorialDate } from "@/lib/blog/dates";
import { APP_VERSION } from "@/lib/version";
import { buildEdition } from "./compose";
import { editionWindowFor, type EditionWindow } from "./dates";
import { configBlockers, configSummary, type DeliveryConfig, type NewsletterRunMode } from "./config";
import { renderNewsletterHtml, renderNewsletterText, unsubscribeHeaders, unsubscribeUrlFor } from "./render";
import { NewsletterEditionSchema, type NewsletterEdition } from "./types";
import type { Mailer } from "./email";

export const NEWSLETTER_RUN_OUTCOMES = [
  "DRY_RUN_OK", // edition built/validated; nothing sent
  "TEST_SENT", // sent to NEWSLETTER_TEST_RECIPIENTS only
  "SENT", // every active subscriber has received this edition
  "PARTIAL", // time budget reached or some sends failed/in flight — safe to re-run
  "ALREADY_SENT", // this week's edition was already fully delivered
  "NO_CONTENT", // no eligible AI Daily story in the covered week
  "NO_SUBSCRIBERS", // live run with zero active subscribers (edition still published)
  "DELIVERY_DISABLED", // live requested while NEWSLETTER_DELIVERY_ENABLED is not true
  "CONFIG_ERROR", // a required setting is missing — nothing was sent
  "CANARY_FAILED", // the pre-flight send to the test recipients failed — nothing else was sent
  "INVALID_EDITION", // the built edition failed schema validation
  "STORAGE_ERROR", // Firestore (or the article source) failed
] as const;
export type NewsletterRunOutcome = (typeof NEWSLETTER_RUN_OUTCOMES)[number];

export type SubscriberRecord = { id: string; email: string; lang: Lang; unsubscribeToken: string };

/**
 * claimed — this run owns the send; already_sent — delivered before;
 * in_flight — another run claimed it moments ago; unknown — claimed so long
 * ago that a resend could duplicate (outside Resend's idempotency window);
 * rejected — the provider refused the address permanently (not retried).
 */
export type ClaimResult = "claimed" | "already_sent" | "in_flight" | "unknown" | "rejected";

export interface NewsletterStore {
  getEdition(editionId: string): Promise<NewsletterEdition | null>;
  /** Stores the edition unless one with the same id exists; returns what is stored. */
  createEditionIfAbsent(edition: NewsletterEdition): Promise<NewsletterEdition>;
  updateEdition(editionId: string, patch: Partial<Pick<NewsletterEdition, "status" | "publishedAt" | "sentAt">>): Promise<void>;
  listActiveSubscribers(): Promise<SubscriberRecord[]>;
  claimDelivery(editionId: string, recipientKey: string, now: Date): Promise<ClaimResult>;
  completeDelivery(editionId: string, recipientKey: string, result: { status: "sent" | "failed" | "rejected"; providerId?: string | null; error?: string }, now: Date): Promise<void>;
  recordRun(run: NewsletterRunRecord): Promise<void>;
}

export type NewsletterRunCounts = {
  subscribers: number;
  byLang: { en: number; es: number };
  sent: number;
  alreadySent: number;
  failed: number;
  inFlight: number;
  unknown: number;
  rejected: number;
  remaining: number;
  canarySent: number;
  testSent: number;
};

export type NewsletterRunResult = {
  ok: boolean;
  outcome: NewsletterRunOutcome;
  mode: NewsletterRunMode;
  editionId: string | null;
  weekStart: string | null;
  weekEnd: string | null;
  counts: NewsletterRunCounts;
  config: ReturnType<typeof configSummary>;
  blockers: string[];
  preview: { en: { subject: string; stories: number; tools: number }; es: { subject: string; stories: number; tools: number } } | null;
  message: string;
  durationMs: number;
};

export type NewsletterRunRecord = Omit<NewsletterRunResult, "preview" | "config"> & {
  startedAt: string;
  appVersion: string;
  deliveryEnabled: boolean;
};

export type RunDeps = {
  store: NewsletterStore;
  mailer: Mailer | null;
  loadArticles: (lang: Lang) => Promise<PublicArticle[]>;
  config: DeliveryConfig;
  now?: () => Date;
  sleep?: (ms: number) => Promise<void>;
  /** Wall-clock budget for sending in one invocation (serverless limit). */
  budgetMs?: number;
  /** Spacing between sends — Resend's default limit is 2 requests/second. */
  throttleMs?: number;
  /** Operational logging. Receives ids and counts only. */
  log?: (event: string, meta: Record<string, unknown>) => void;
};

const DEFAULT_BUDGET_MS = 45_000;
const DEFAULT_THROTTLE_MS = 550;

function emptyCounts(): NewsletterRunCounts {
  return { subscribers: 0, byLang: { en: 0, es: 0 }, sent: 0, alreadySent: 0, failed: 0, inFlight: 0, unknown: 0, rejected: 0, remaining: 0, canarySent: 0, testSent: 0 };
}

/** Ledger key for a test/canary address — a hash, never the address itself. */
export function testRecipientKey(email: string): string {
  return `canary_${createHash("sha256").update(email.trim().toLowerCase()).digest("hex").slice(0, 16)}`;
}

export function deliveryIdempotencyKey(editionId: string, recipientKey: string): string {
  return `promptea-weekly/${editionId}/${recipientKey}`;
}

function previewOf(edition: NewsletterEdition): NewsletterRunResult["preview"] {
  return {
    en: { subject: edition.locales.en.subject, stories: edition.locales.en.topStories.length, tools: edition.locales.en.tools.length },
    es: { subject: edition.locales.es.subject, stories: edition.locales.es.topStories.length, tools: edition.locales.es.tools.length },
  };
}

export async function runWeeklyNewsletter(
  mode: NewsletterRunMode,
  deps: RunDeps,
  opts: { date?: EditorialDate } = {}
): Promise<NewsletterRunResult> {
  const now = deps.now ?? (() => new Date());
  const sleep = deps.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));
  const log = deps.log ?? (() => {});
  const budgetMs = deps.budgetMs ?? DEFAULT_BUDGET_MS;
  const throttleMs = deps.throttleMs ?? DEFAULT_THROTTLE_MS;
  const started = now();
  const startedMs = started.getTime();
  const counts = emptyCounts();
  const cfg = deps.config;

  let window: EditionWindow | null = null;
  let edition: NewsletterEdition | null = null;
  let blockers: string[] = [];

  const finish = async (outcome: NewsletterRunOutcome, message: string): Promise<NewsletterRunResult> => {
    const result: NewsletterRunResult = {
      ok: !["CONFIG_ERROR", "CANARY_FAILED", "INVALID_EDITION", "STORAGE_ERROR", "DELIVERY_DISABLED"].includes(outcome),
      outcome,
      mode,
      editionId: window?.editionId ?? null,
      weekStart: window?.weekStart ?? null,
      weekEnd: window?.weekEnd ?? null,
      counts,
      config: configSummary(cfg),
      blockers,
      preview: edition ? previewOf(edition) : null,
      message,
      durationMs: now().getTime() - startedMs,
    };
    try {
      await deps.store.recordRun({
        ok: result.ok,
        outcome,
        mode,
        editionId: result.editionId,
        weekStart: result.weekStart,
        weekEnd: result.weekEnd,
        counts,
        blockers,
        message,
        durationMs: result.durationMs,
        startedAt: started.toISOString(),
        appVersion: APP_VERSION,
        deliveryEnabled: cfg.deliveryEnabled,
      });
    } catch {
      log("newsletter_run_record_failed", { outcome });
    }
    log("newsletter_run", { mode, outcome, editionId: result.editionId, sent: counts.sent, failed: counts.failed, remaining: counts.remaining });
    return result;
  };

  // 1. Which week. The routine passes nothing (today, editorial timezone); a
  //    human may preview a specific week with `date` in dry_run/test.
  const date = opts.date && isEditorialDate(opts.date) ? opts.date : editorialDate(started);
  window = editionWindowFor(date);

  // 2. Configuration gates BEFORE any work that could send.
  blockers = configBlockers(cfg, mode);
  if (mode === "live" && !cfg.deliveryEnabled) {
    return finish("DELIVERY_DISABLED", "Live delivery is switched off (NEWSLETTER_DELIVERY_ENABLED is not true). Nothing was sent.");
  }
  if (mode !== "dry_run" && (blockers.length > 0 || !deps.mailer)) {
    if (!deps.mailer && !blockers.includes("RESEND_API_KEY is not set")) blockers = [...blockers, "mail provider unavailable"];
    return finish("CONFIG_ERROR", "Delivery configuration is incomplete. Nothing was sent.");
  }

  // 3. The edition: reuse this week's stored edition, otherwise build it.
  try {
    edition = await deps.store.getEdition(window.editionId);
    if (!edition) {
      const [en, es] = await Promise.all([deps.loadArticles("en"), deps.loadArticles("es")]);
      edition = buildEdition({ window, en, es, now: started, siteUrl: cfg.siteUrl });
    }
  } catch {
    return finish("STORAGE_ERROR", "Could not read the edition or the AI Daily archive.");
  }

  if (!edition) return finish("NO_CONTENT", "No AI Daily story was published in the covered week; nothing to send.");

  const valid = NewsletterEditionSchema.safeParse(edition);
  if (!valid.success) {
    edition = null;
    return finish("INVALID_EDITION", "The generated edition failed validation; nothing was sent.");
  }
  edition = valid.data;

  if (edition.status === "sent" && mode === "live") {
    return finish("ALREADY_SENT", "This week's edition was already delivered to every active subscriber.");
  }

  // 4. Subscribers (counts only leave this function).
  let subscribers: Awaited<ReturnType<NewsletterStore["listActiveSubscribers"]>> = [];
  try {
    subscribers = await deps.store.listActiveSubscribers();
  } catch {
    return finish("STORAGE_ERROR", "Could not read the subscriber list.");
  }
  counts.subscribers = subscribers.length;
  counts.byLang = {
    en: subscribers.filter((s) => s.lang !== "es").length,
    es: subscribers.filter((s) => s.lang === "es").length,
  };

  if (mode === "dry_run") {
    return finish("DRY_RUN_OK", "Edition built and validated. Nothing was stored or sent.");
  }

  const mailer = deps.mailer!;
  const sendTo = async (to: string, lang: Lang, unsubscribeUrl: string, opts2: { subjectPrefix?: string; idempotencyKey?: string }) => {
    const content = edition!.locales[lang];
    return mailer.send({
      to,
      subject: `${opts2.subjectPrefix ?? ""}${content.subject}`,
      html: renderNewsletterHtml(edition!, lang, { unsubscribeUrl, siteUrl: cfg.siteUrl }),
      text: renderNewsletterText(edition!, lang, { unsubscribeUrl, siteUrl: cfg.siteUrl }),
      headers: unsubscribeHeaders(unsubscribeUrl),
      idempotencyKey: opts2.idempotencyKey,
      tags: [{ name: "edition", value: edition!.editionId.replace(/[^\w-]/g, "_") }],
    });
  };

  // 5a. TEST: the edition goes to the test recipients only, both languages
  //     alternating so each locale can be checked. Nothing is stored.
  if (mode === "test") {
    for (const [i, address] of cfg.testRecipients.entries()) {
      const lang: Lang = i % 2 === 0 ? "es" : "en";
      const r = await sendTo(address, lang, `${cfg.siteUrl}/${lang}/weekly`, { subjectPrefix: "[TEST] " });
      if (r.ok) counts.testSent++;
      else counts.failed++;
      if (i < cfg.testRecipients.length - 1) await sleep(throttleMs);
    }
    return counts.failed > 0 && counts.testSent === 0
      ? finish("CONFIG_ERROR", "Every test send failed — check the API key and that the sender domain is verified in Resend.")
      : finish("TEST_SENT", `Test edition sent to ${counts.testSent} test recipient(s). Subscribers were not contacted.`);
  }

  // 5b. LIVE. Publish the edition (existing wins, so every run this week
  //     mails the same content), then canary, then subscribers.
  try {
    const stored = await deps.store.createEditionIfAbsent({ ...edition, status: edition.status === "draft" ? "published" : edition.status, publishedAt: edition.publishedAt ?? started.toISOString() });
    edition = stored;
    if (stored.status === "draft") await deps.store.updateEdition(stored.editionId, { status: "published", publishedAt: started.toISOString() });
  } catch {
    return finish("STORAGE_ERROR", "Could not store this week's edition; nothing was sent.");
  }

  const deliver = async (recipientKey: string, to: string, lang: Lang, unsubscribeUrl: string): Promise<ClaimResult | "sent" | "failed"> => {
    const claim = await deps.store.claimDelivery(edition!.editionId, recipientKey, now());
    if (claim !== "claimed") return claim;
    const r = await sendTo(to, lang, unsubscribeUrl, { idempotencyKey: deliveryIdempotencyKey(edition!.editionId, recipientKey) });
    if (r.ok) {
      await deps.store.completeDelivery(edition!.editionId, recipientKey, { status: "sent", providerId: r.id }, now());
      return "sent";
    }
    // A permanent refusal (invalid address, validation error) is recorded as
    // rejected and not retried; transient errors stay retryable.
    const status = r.retryable ? "failed" : "rejected";
    await deps.store.completeDelivery(edition!.editionId, recipientKey, { status, error: r.error }, now());
    return status;
  };

  // Canary: the test recipients receive the real email first. Any failure
  // stops the run before a single subscriber is contacted.
  try {
    for (const [i, address] of cfg.testRecipients.entries()) {
      const lang: Lang = i % 2 === 0 ? "es" : "en";
      const r = await deliver(testRecipientKey(address), address, lang, `${cfg.siteUrl}/${lang}/weekly`);
      if (r === "failed" || r === "rejected") return finish("CANARY_FAILED", "The canary send to the test recipients failed; no subscriber was contacted.");
      if (r === "sent" || r === "already_sent") counts.canarySent++;
      await sleep(throttleMs);
    }
  } catch {
    return finish("STORAGE_ERROR", "The delivery ledger was unavailable during the canary; no subscriber was contacted.");
  }

  if (subscribers.length === 0) {
    return finish("NO_SUBSCRIBERS", "The edition is published on /weekly; there are no active subscribers to send it to.");
  }

  for (const [i, sub] of subscribers.entries()) {
    if (now().getTime() - startedMs > budgetMs) {
      counts.remaining = subscribers.length - i;
      break;
    }
    let r: Awaited<ReturnType<typeof deliver>>;
    try {
      r = await deliver(sub.id, sub.email, sub.lang === "es" ? "es" : "en", unsubscribeUrlFor(sub.unsubscribeToken, cfg.siteUrl));
    } catch {
      counts.remaining = subscribers.length - i;
      return finish("STORAGE_ERROR", "The delivery ledger became unavailable mid-run; re-running is safe.");
    }
    if (r === "sent") counts.sent++;
    else if (r === "already_sent") counts.alreadySent++;
    else if (r === "failed") counts.failed++;
    else if (r === "in_flight") counts.inFlight++;
    else if (r === "rejected") counts.rejected++;
    else counts.unknown++;
    if (r === "sent" || r === "failed" || r === "rejected") await sleep(throttleMs);
  }

  const complete = counts.remaining === 0 && counts.failed === 0 && counts.inFlight === 0 && counts.unknown === 0;
  if (complete) {
    try {
      await deps.store.updateEdition(edition.editionId, { status: "sent", sentAt: now().toISOString() });
    } catch {
      log("newsletter_mark_sent_failed", { editionId: edition.editionId });
    }
    return finish("SENT", `Delivered to ${counts.sent} subscriber(s) this run (${counts.alreadySent} already had it).`);
  }
  return finish(
    "PARTIAL",
    `Sent ${counts.sent}, failed ${counts.failed}, rejected ${counts.rejected}, in flight ${counts.inFlight}, unknown ${counts.unknown}, not reached ${counts.remaining}. Re-running is safe: delivered subscribers are skipped.`
  );
}
