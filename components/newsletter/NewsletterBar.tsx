"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

type Props = {
  lang: "es" | "en";
  dict: {
    barText: string;
    barCta: string;
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
};

type Status = "idle" | "submitting" | "success" | "already_subscribed" | "error";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function NewsletterBar({ lang, dict }: Props) {
  const [open, setOpen] = useState(false);
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
      if (res.status === 429) { setStatus("error"); setMessage(dict.rateLimit); return; }
      const data = await res.json();
      if (data.ok && data.outcome === "already_subscribed") {
        setStatus("already_subscribed");
        setMessage(dict.alreadySubscribed);
        return;
      }
      if (data.ok) { setStatus("success"); setMessage(dict.success); return; }
      setStatus("error");
      setMessage(dict.error);
    } catch {
      setStatus("error");
      setMessage(dict.error);
    }
  }

  if (status === "success") {
    return (
      <div className="mt-4 flex items-center justify-center gap-2 text-xs text-success">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <circle cx="7" cy="7" r="7" fill="currentColor" opacity="0.15" />
          <path d="M4 7l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="font-medium">{message}</span>
      </div>
    );
  }

  if (!open) {
    return (
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <span className="text-xs text-ink-muted">{dict.barText}</span>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/5
                     px-3 py-1 text-xs font-medium text-accent
                     hover:border-accent/50 hover:bg-accent/10 transition-colors"
        >
          {dict.barCta}
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M9 5l-3 3-3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4 mx-auto max-w-md">
      <form onSubmit={handleSubmit} className="surface rounded-xl p-4 space-y-3" noValidate>
        <div className="flex gap-2">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => { setEmail(e.target.value); if (status === "error") setStatus("idle"); }}
            placeholder={dict.emailPlaceholder}
            className="field h-9 flex-1 min-w-0 px-3 text-sm"
            autoComplete="email"
            autoFocus
          />
          <button
            type="submit"
            disabled={status === "submitting" || !consent}
            className="btn btn-primary h-9 px-4 text-sm shrink-0"
          >
            {status === "submitting" ? dict.submitting : dict.submit}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <label className="flex items-center gap-1.5 text-xs text-ink-muted">
            <select
              value={preferredLang}
              onChange={(e) => setPreferredLang(e.target.value as "en" | "es")}
              className="field h-7 px-2 text-xs"
            >
              <option value="en">EN</option>
              <option value="es">ES</option>
            </select>
          </label>

          <label className="flex items-center gap-1.5 text-xs text-ink-muted">
            <input
              type="checkbox"
              required
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="shrink-0 accent-accent"
            />
            <span>{dict.consentLabel}</span>
          </label>
        </div>

        {message ? (
          <p className={`text-xs ${status === "already_subscribed" ? "text-ink-muted" : "text-danger"}`}>
            {message}
          </p>
        ) : null}

        <div className="flex items-center justify-between">
          <Link href={`/${lang}/weekly`} className="text-[11px] text-ink-faint hover:text-ink-muted transition-colors">
            {lang === "es" ? "Ver Promptea Semanal →" : "See Promptea Weekly →"}
          </Link>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-[11px] text-ink-faint hover:text-ink-muted transition-colors"
          >
            {lang === "es" ? "Cerrar" : "Close"}
          </button>
        </div>
      </form>
    </div>
  );
}
