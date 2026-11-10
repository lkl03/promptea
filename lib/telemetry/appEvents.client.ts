"use client";

// lib/telemetry/appEvents.client.ts
//
// Fire-and-forget client helper for v1.3.0 operational events. Silent on
// every failure — telemetry must never affect the product experience.

import { getSessionId } from "@/lib/telemetry/session";
import type { AppMode, Lang, TranscribeErrorReason } from "@/lib/domain";

export type AppEventName =
  | "mode_opened"
  | "matcher_handoff"
  | "voice_recording_started"
  | "voice_transcribed"
  | "voice_failed"
  // v1.8.0 newsletter prompts (no PII: surface + counters only)
  | "newsletter_prompt_impression"
  | "newsletter_prompt_open"
  | "newsletter_prompt_subscribed"
  | "newsletter_prompt_dismissed";

/** Which newsletter surface an event refers to. "inline" = the forms embedded in pages. */
export type NewsletterSurface = "pill" | "card" | "modal" | "dock" | "inline";

export function trackAppEvent(args: {
  event: AppEventName;
  lang: Lang;
  mode?: AppMode;
  reason?: TranscribeErrorReason;
  surface?: NewsletterSurface;
}): void {
  try {
    const sessionId = getSessionId();
    void fetch("/api/telemetry/app", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId, ...args }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // ignore
  }
}
