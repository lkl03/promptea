"use client";

// components/share/ShareButton.tsx
//
// v1.8.0 — "Share" for a result or a library entry. It shares a LINK to
// /{lang}/share?s=…&o=…&b=… — numbers and enums only (lib/share/card.ts), never
// the prompt text. The link's page carries a dynamic Open Graph image, so X,
// WhatsApp, Slack, etc. unfurl it as a card. Uses the native share sheet where
// there is one; otherwise it copies the link (with a toast) and a second action
// opens X's composer.

import { useState } from "react";
import { encodeCard, type BreakdownKey } from "@/lib/share/card";
import { useToast } from "@/components/ToastProvider";
import { type Lang } from "@/lib/domain";

export type ShareDict = { button: string; copied: string; shareText: string; shareTextSingle: string };

export type ShareInput = {
  score: number;
  optimizedScore?: number | null;
  breakdown?: Partial<Record<BreakdownKey, number>> | null;
  purpose?: string | null;
  target?: string | null;
};

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 15V4M8 8l4-4 4 4" />
      <path d="M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path fill="currentColor" d="M18.9 2H22l-6.8 7.8L23 22h-6.2l-4.9-6.3L6.5 22H3.4l7.3-8.4L1 2h6.4l4.4 5.6L18.9 2Zm-1.1 18h1.7L7.3 3.9H5.5L17.8 20Z" />
    </svg>
  );
}

export function buildShare(lang: Lang, input: ShareInput, dict: Pick<ShareDict, "shareText" | "shareTextSingle">, origin: string) {
  const url = `${origin}/${lang}/share?${encodeCard(input)}`;
  const hasAfter = typeof input.optimizedScore === "number" && input.optimizedScore !== input.score;
  const text = hasAfter
    ? dict.shareText.replace("{before}", String(Math.round(input.score))).replace("{after}", String(Math.round(input.optimizedScore!)))
    : dict.shareTextSingle.replace("{score}", String(Math.round(input.score)));
  return { url, text, xIntent: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}` };
}

export default function ShareButton({ lang, input, dict, label, compact = false }: { lang: Lang; input: ShareInput; dict: ShareDict; label?: string; compact?: boolean }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const text = label ?? dict.button;

  async function share() {
    if (busy) return;
    setBusy(true);
    const { url, text: msg } = buildShare(lang, input, dict, window.location.origin);
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ text: msg, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.show(dict.copied, "success");
      }
    } catch (e) {
      // The user closing the native sheet is not an error; a failed clipboard falls back to a prompt-free no-op.
      if ((e as DOMException)?.name !== "AbortError") {
        try {
          await navigator.clipboard.writeText(url);
          toast.show(dict.copied, "success");
        } catch {
          /* nothing else to do */
        }
      }
    } finally {
      setBusy(false);
    }
  }

  function openX() {
    // Built on click: the origin is only known in the browser (no hydration mismatch).
    window.open(buildShare(lang, input, dict, window.location.origin).xIntent, "_blank", "noopener,noreferrer");
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <button type="button" onClick={share} className={["btn btn-ghost", compact ? "h-8 px-2.5 text-xs" : "h-9"].join(" ")}>
        <ShareIcon />
        {text}
      </button>
      <button type="button" onClick={openX} className={["btn-icon", compact ? "h-8 w-8" : "h-9 w-9"].join(" ")} aria-label={`${text} · X`} title={`${text} · X`}>
        <XIcon />
      </button>
    </span>
  );
}
