"use client";

// components/AppFeedbackButton.tsx
//
// v1.3.0: general product feedback goes to Firestore via /api/app-feedback.
// The old mailto workflow is gone. Never sends the user's prompt content.

import { useEffect, useRef, useState } from "react";
import { useFocusTrap } from "@/lib/useFocusTrap";
import { APP_FEEDBACK_CATEGORIES, type AppFeedbackCategory, type AppMode } from "@/lib/domain";
import type { AppFeedbackDict } from "@/lib/uiDict";

type Status = "idle" | "submitting" | "success" | "error";
type ErrorKey = "too_short" | "too_long" | "cooldown" | "generic";

const COOLDOWN_KEY = "promptea:app-feedback-at";
const COOLDOWN_MS = 60_000;

function categoryLabel(dict: AppFeedbackDict, category: AppFeedbackCategory): string {
  switch (category) {
    case "bug":
      return dict.categoryBug;
    case "suggestion":
      return dict.categorySuggestion;
    case "design":
      return dict.categoryDesign;
    case "result_quality":
      return dict.categoryResultQuality;
    default:
      return dict.categoryOther;
  }
}

function errorMessage(dict: AppFeedbackDict, key: ErrorKey): string {
  switch (key) {
    case "too_short":
      return dict.errorTooShort;
    case "too_long":
      return dict.errorTooLong;
    case "cooldown":
      return dict.errorCooldown;
    default:
      return dict.errorGeneric;
  }
}

export default function AppFeedbackButton({
  lang,
  dict,
}: {
  lang: "es" | "en";
  dict: AppFeedbackDict;
}) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState<AppFeedbackCategory | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [errorKey, setErrorKey] = useState<ErrorKey>("generic");

  const dialogRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const closeTimer = useRef<number | null>(null);

  useFocusTrap(dialogRef, open);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    return () => {
      if (closeTimer.current) window.clearTimeout(closeTimer.current);
    };
  }, []);

  function openModal() {
    setStatus("idle");
    setOpen(true);
  }

  async function submit() {
    const trimmed = message.trim();
    if (trimmed.length < 10) {
      setErrorKey("too_short");
      setStatus("error");
      return;
    }
    if (trimmed.length > 2000) {
      setErrorKey("too_long");
      setStatus("error");
      return;
    }

    try {
      const last = Number(sessionStorage.getItem(COOLDOWN_KEY) ?? 0);
      if (Date.now() - last < COOLDOWN_MS) {
        setErrorKey("cooldown");
        setStatus("error");
        return;
      }
    } catch {
      // sessionStorage unavailable — server cooldown still applies.
    }

    setStatus("submitting");

    const pathname = window.location.pathname;
    const mode: AppMode = pathname.includes("/best-ai") ? "best-ai" : "improve";

    let sessionId: string | undefined;
    try {
      sessionId = localStorage.getItem("promptea_session_id") ?? undefined;
    } catch {
      sessionId = undefined;
    }

    try {
      const res = await fetch("/api/app-feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          category: category ?? undefined,
          lang,
          mode,
          page: pathname,
          theme: document.documentElement.dataset.theme ?? undefined,
          sessionId,
        }),
      });

      if (res.ok) {
        try {
          sessionStorage.setItem(COOLDOWN_KEY, String(Date.now()));
        } catch {
          // ignore
        }
        setStatus("success");
        setMessage("");
        setCategory(null);
        closeTimer.current = window.setTimeout(() => {
          setOpen(false);
          setStatus("idle");
          triggerRef.current?.focus();
        }, 1600);
        return;
      }

      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      const err = data?.error;
      setErrorKey(err === "too_short" || err === "too_long" || err === "cooldown" ? err : "generic");
      setStatus("error");
    } catch {
      setErrorKey("generic");
      setStatus("error");
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={openModal}
        className="hover:underline underline-offset-2 transition-all ease-in-out"
      >
        {dict.open}
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
            onClick={() => {
              setOpen(false);
              triggerRef.current?.focus();
            }}
            aria-hidden="true"
          />
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="app-feedback-title"
            className="surface relative mx-auto mt-24 w-[min(560px,calc(100%-24px))] p-5 animate-toast-in"
          >
            <h2 id="app-feedback-title" className="text-base font-semibold text-ink">
              {dict.title}
            </h2>
            <p className="mt-1 text-sm text-ink-muted">{dict.subtitle}</p>

            <fieldset className="mt-4">
              <legend className="text-xs font-medium text-ink-muted">{dict.categoryLabel}</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {APP_FEEDBACK_CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className="pill"
                    aria-pressed={category === c}
                    onClick={() => setCategory((prev) => (prev === c ? null : c))}
                  >
                    {categoryLabel(dict, c)}
                  </button>
                ))}
              </div>
            </fieldset>

            <label htmlFor="app-feedback-message" className="mt-4 block text-xs font-medium text-ink-muted">
              {dict.messageLabel}
            </label>
            <textarea
              id="app-feedback-message"
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                if (status === "error") setStatus("idle");
              }}
              maxLength={2000}
              rows={5}
              placeholder={dict.messagePlaceholder}
              className="field mt-1.5 w-full resize-y p-3"
              disabled={status === "submitting" || status === "success"}
            />
            <div className="mt-1 text-right text-[11px] tabular-nums text-ink-faint">
              {message.trim().length}/2000
            </div>

            <div aria-live="polite" className="min-h-5 text-sm">
              {status === "success" && <span className="text-success">{dict.success}</span>}
              {status === "error" && <span className="text-danger">{errorMessage(dict, errorKey)}</span>}
            </div>

            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setOpen(false);
                  triggerRef.current?.focus();
                }}
              >
                {dict.cancel}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={submit}
                disabled={status === "submitting" || status === "success" || message.trim().length === 0}
              >
                {status === "submitting" ? dict.submitting : dict.submit}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
