"use client";

// components/newsletter/ShareLink.tsx
//
// v1.7.0 — share a Weekly edition. Uses the platform share sheet where it
// exists (mobile), otherwise copies the page URL and confirms in place.

import { useState } from "react";

export default function ShareLink({ label, copied, title }: { label: string; copied: string; title: string }) {
  const [done, setDone] = useState(false);

  async function share() {
    const url = window.location.href;
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setDone(true);
      window.setTimeout(() => setDone(false), 2200);
    } catch {
      /* the visitor dismissed the share sheet, or clipboard access was denied */
    }
  }

  return (
    <button type="button" onClick={share} className="btn btn-ghost h-9 px-4">
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 3v12M7 8l5-5 5 5" />
        <path d="M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />
      </svg>
      <span aria-live="polite">{done ? copied : label}</span>
    </button>
  );
}
