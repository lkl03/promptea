// components/newsletter/SubscribeCTA.tsx
//
// Client component: inline newsletter subscription form.
//
// States: idle, submitting, success, already_subscribed, error.
// On success the form is replaced with a confirmation message.
// On already_subscribed the message is informational, not an error.
// Rate-limit (429) and other errors show the appropriate dictionary string.

"use client";

import { FormEvent, useState } from "react";

type Props = {
  lang: "es" | "en";
  dict: {
    heading: string;
    description: string;
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

export default function SubscribeCTA({ lang, dict }: Props) {
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
        body: JSON.stringify({
          email: trimmed,
          lang: preferredLang,
          consent: true,
        }),
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
        return;
      }

      setStatus("error");
      setMessage(dict.error);
    } catch {
      setStatus("error");
      setMessage(dict.error);
    }
  }

  // After a successful subscription, replace the form with the confirmation.
  if (status === "success") {
    return (
      <section className="surface p-6 text-center sm:p-8">
        <div className="mx-auto max-w-md">
          <p className="text-sm font-medium text-success">{message}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="surface p-6 sm:p-8">
      <div className="mx-auto max-w-md text-center">
        <h2 className="font-title text-xl font-semibold sm:text-2xl">
          {dict.heading}
        </h2>
        <p className="mt-2 text-sm text-ink-muted">{dict.description}</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mx-auto mt-6 max-w-sm space-y-4"
        noValidate
      >
        {/* Email input */}
        <div>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (status === "error") setStatus("idle");
            }}
            placeholder={dict.emailPlaceholder}
            className="field h-11 w-full px-3"
            autoComplete="email"
          />
        </div>

        {/* Language preference */}
        <div>
          <label className="block text-xs font-medium text-ink-muted">
            {dict.languageLabel}
          </label>
          <select
            value={preferredLang}
            onChange={(e) => setPreferredLang(e.target.value as "en" | "es")}
            className="field mt-1 h-10 w-full px-3"
          >
            <option value="en">English</option>
            <option value="es">Español</option>
          </select>
        </div>

        {/* Consent checkbox */}
        <label className="flex items-start gap-2.5 text-xs text-ink-muted">
          <input
            type="checkbox"
            required
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5 shrink-0 accent-accent"
          />
          <span>{dict.consentLabel}</span>
        </label>

        {/* Submit */}
        <button
          type="submit"
          disabled={status === "submitting" || !consent}
          className="btn btn-primary h-11 w-full"
        >
          {status === "submitting" ? dict.submitting : dict.submit}
        </button>

        {/* Status message (error or already_subscribed) */}
        {message ? (
          <p
            className={`text-center text-xs ${
              status === "already_subscribed"
                ? "text-ink-muted"
                : "text-danger"
            }`}
          >
            {message}
          </p>
        ) : null}
      </form>
    </section>
  );
}
