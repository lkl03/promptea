"use client";

// components/newsletter/SubscribeForm.tsx
//
// v1.7.0 — the one newsletter subscription form, shared by the desktop dock
// card and the mobile sheet (components/newsletter/NewsletterDock.tsx). It
// replaces the v1.5 NewsletterBar and SubscribeCTA, which carried two copies
// of the same logic. Behaviour is unchanged:
//   - client-side email check, then POST /api/newsletter/subscribe;
//   - explicit consent checkbox — submit stays disabled until it is ticked,
//     and the API rejects requests without `consent: true`;
//   - preferred language (defaults to the page language);
//   - states: idle, submitting, success, already subscribed (informational,
//     not an error), invalid email, rate limited (429), generic error.

import { FormEvent, useId, useState } from "react";

export type SubscribeFormDict = {
  emailPlaceholder: string;
  languageLabel: string;
  consentLabel: string;
  submit: string;
  submitting: string;
  success: string;
  alreadySubscribed: string;
  invalidEmail: string;
  rateLimit: string;
  error: string;
};

type Status = "idle" | "submitting" | "success" | "already_subscribed" | "error";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function SubscribeForm({
  lang,
  dict,
  autoFocus = false,
  onDone,
}: {
  lang: "es" | "en";
  dict: SubscribeFormDict;
  autoFocus?: boolean;
  onDone?: () => void;
}) {
  const id = useId();
  const [email, setEmail] = useState("");
  const [preferredLang, setPreferredLang] = useState<"en" | "es">(lang);
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      setStatus("error");
      setMessage(dict.invalidEmail);
      return;
    }
    setStatus("submitting");
    setMessage("");
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, lang: preferredLang, consent: true }),
      });
      if (res.status === 429) {
        setStatus("error");
        setMessage(dict.rateLimit);
        return;
      }
      const data = await res.json();
      if (data.ok && data.outcome === "already_subscribed") {
        setStatus("already_subscribed");
        setMessage(dict.alreadySubscribed);
        return;
      }
      if (data.ok) {
        setStatus("success");
        setMessage(dict.success);
        onDone?.();
        return;
      }
      setStatus("error");
      setMessage(dict.error);
    } catch {
      setStatus("error");
      setMessage(dict.error);
    }
  }

  if (status === "success") {
    return (
      <p role="status" className="flex items-start gap-2 text-sm text-success">
        <svg width="16" height="16" viewBox="0 0 14 14" fill="none" aria-hidden="true" className="mt-0.5 shrink-0">
          <circle cx="7" cy="7" r="7" fill="currentColor" opacity="0.15" />
          <path d="M4 7l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="font-medium">{message}</span>
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3" noValidate>
      <div>
        <label htmlFor={`${id}-email`} className="sr-only">
          Email
        </label>
        <input
          id={`${id}-email`}
          type="email"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (status === "error") setStatus("idle");
          }}
          placeholder={dict.emailPlaceholder}
          className="field h-10 w-full px-3 text-sm"
          autoComplete="email"
          autoFocus={autoFocus}
          aria-invalid={status === "error" && message === dict.invalidEmail ? true : undefined}
          aria-describedby={message ? `${id}-msg` : undefined}
        />
      </div>

      <div className="flex items-center gap-2">
        <label htmlFor={`${id}-lang`} className="text-xs text-ink-muted">
          {dict.languageLabel}
        </label>
        <select
          id={`${id}-lang`}
          value={preferredLang}
          onChange={(e) => setPreferredLang(e.target.value as "en" | "es")}
          className="field h-8 px-2 text-xs"
        >
          <option value="es">Español</option>
          <option value="en">English</option>
        </select>
      </div>

      <label className="flex items-start gap-2 text-xs leading-relaxed text-ink-muted">
        <input
          type="checkbox"
          required
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 shrink-0 accent-accent"
        />
        <span>{dict.consentLabel}</span>
      </label>

      <button type="submit" disabled={status === "submitting" || !consent} className="btn btn-primary h-10 w-full">
        {status === "submitting" ? dict.submitting : dict.submit}
      </button>

      {message ? (
        <p id={`${id}-msg`} role={status === "error" ? "alert" : "status"} className={`text-xs ${status === "already_subscribed" ? "text-ink-muted" : "text-danger"}`}>
          {message}
        </p>
      ) : null}
    </form>
  );
}
