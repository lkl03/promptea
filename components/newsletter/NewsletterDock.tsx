"use client";

// components/newsletter/NewsletterDock.tsx
//
// v1.7.0 — the newsletter stays reachable while reading AI Daily.
//
//   Desktop (lg+): a compact card that sticks in the page's side column while
//   the article list scrolls, with the X feed card under it (v1.8.1; v1.8.7:
//   the same order as the home side column — newsletter first, X below). It is
//   in normal flow, so it never overlaps text. Its form counts as an in-page
//   form ([data-newsletter-inline]): while it is on screen the floating card
//   stays away (one way to subscribe at a time).
//
//   Mobile: v1.7.0–v1.8.6 had a slim bar pinned to the bottom edge with a
//   bottom sheet. v1.8.7 removes it: on phones AI Daily gets the same floating
//   "Join our newsletter" card as every other page (components/newsletter/
//   NewsletterNudges.tsx), with the same rules — 5 s, compact row, 7-day pause
//   after closing, never over a control. Two bottom surfaces were one too many.
//
// State is shared with the card, the pill and the modal through
// lib/newsletter/promptStore.ts; a subscription from ANY form hides the card
// here for good (the column keeps its other cards).

import { useSyncExternalStore } from "react";
import { getServerSnapshot, getSnapshot, subscribeStore } from "@/lib/newsletter/promptStore";
import SubscribeForm, { type SubscribeFormDict } from "./SubscribeForm";
import { type Lang } from "@/lib/domain";

type DockDict = { title: string; body: string };

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}

export default function NewsletterDock({
  lang,
  dict,
  formDict,
  children,
}: {
  lang: Lang;
  dict: DockDict;
  formDict: SubscribeFormDict;
  /** v1.8.1 — more cards for the desktop side column (e.g. the X feed), shown under the newsletter card. */
  children?: React.ReactNode;
}) {
  // Shared with the card, the pill and the modal (subscribed for good).
  const snap = useSyncExternalStore(subscribeStore, getSnapshot, getServerSnapshot);

  // Already subscribed (on this or another page): the newsletter card is gone; the column keeps its other cards.
  if (snap.subscribed) {
    return children ? (
      <aside aria-label={dict.title} className="side-sticky hidden content-start gap-6 lg:grid">
        {children}
      </aside>
    ) : null;
  }

  return (
    <aside aria-label={dict.title} className={children ? "side-sticky hidden content-start gap-6 lg:grid" : "hidden lg:sticky lg:top-24 lg:block"}>
      <div className="surface p-5">
        <p className="flex items-center gap-2 font-title text-base font-semibold text-ink">
          <span className="text-accent">
            <MailIcon />
          </span>
          {dict.title}
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{dict.body}</p>
        <div className="mt-4">
          <SubscribeForm lang={lang} dict={formDict} surface="dock" />
        </div>
      </div>
      {children}
    </aside>
  );
}
