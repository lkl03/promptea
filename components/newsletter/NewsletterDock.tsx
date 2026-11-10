"use client";

// components/newsletter/NewsletterDock.tsx
//
// v1.7.0 — the newsletter stays reachable while reading AI Daily.
//
//   Desktop (lg+): a compact card that sticks in the page's side column while
//   the article list scrolls. It is in normal flow, so it never overlaps text.
//
//   Mobile: a slim bar pinned to the bottom edge that opens a bottom sheet
//   with the form. It never covers content or controls:
//     - the page reserves the bar's height at its end (spacer below), so the
//       last lines of content can always be scrolled above it;
//     - it slides away while the footer is on screen (footer controls stay
//       reachable), while a text field is focused (soft keyboard) and while
//       the AI Daily modal is open (v1.8.0: surfaces never stack);
//     - v1.8.0: closing it is remembered for 7 days (it used to be one
//       session) and a subscription — from ANY form — removes it for good.
//   State is shared with the pill and the modal through
//   lib/newsletter/promptStore.ts; the rules live in lib/newsletter/prompts.ts.
//   The sheet is a modal dialog: focus moves into it, Tab is trapped, Escape
//   and the backdrop close it, and focus returns to the bar.

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { getServerSnapshot, getSnapshot, nudgeActions, subscribeStore } from "@/lib/newsletter/promptStore";
import { dockBarEligible } from "@/lib/newsletter/prompts";
import { trackAppEvent } from "@/lib/telemetry/appEvents.client";
import SubscribeForm, { type SubscribeFormDict } from "./SubscribeForm";
import Portal from "@/components/Portal";
import { useFocusTrap } from "@/lib/useFocusTrap";

type DockDict = { title: string; body: string; open: string; close: string };

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
  lang: "es" | "en";
  dict: DockDict;
  formDict: SubscribeFormDict;
  /** v1.8.1 — more cards for the desktop side column (e.g. the X feed), shown under the newsletter card. */
  children?: React.ReactNode;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  // Shared with the pill and the modal (persisted: dismissal for 7 days, subscribed for good).
  const snap = useSyncExternalStore(subscribeStore, getSnapshot, getServerSnapshot);
  const [mountedAt, setMountedAt] = useState<number | null>(null);
  const [footerVisible, setFooterVisible] = useState(false);
  const [typing, setTyping] = useState(false);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);

  useFocusTrap(sheetRef, sheetOpen);

  // Eligibility needs "now"; take it once, after mount (never during render).
  useEffect(() => {
    const t = window.setTimeout(() => setMountedAt(Date.now()), 0);
    return () => window.clearTimeout(t);
  }, []);

  // Step aside for the footer.
  useEffect(() => {
    const footer = document.querySelector("footer");
    if (!footer) return;
    const io = new IntersectionObserver(([entry]) => setFooterVisible(entry.isIntersecting), { rootMargin: "0px 0px -8px 0px" });
    io.observe(footer);
    return () => io.disconnect();
  }, []);

  // Step aside while the soft keyboard is likely open (a text field outside the sheet is focused).
  useEffect(() => {
    const onFocus = (e: FocusEvent) => {
      const el = e.target as HTMLElement | null;
      if (!el || sheetRef.current?.contains(el)) return;
      setTyping(el.matches("input:not([type=checkbox]):not([type=radio]), textarea, select, [contenteditable=true]"));
    };
    const onBlur = () => setTyping(false);
    document.addEventListener("focusin", onFocus);
    document.addEventListener("focusout", onBlur);
    return () => {
      document.removeEventListener("focusin", onFocus);
      document.removeEventListener("focusout", onBlur);
    };
  }, []);

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    requestAnimationFrame(() => openerRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSheet();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheetOpen, closeSheet]);

  function dismiss() {
    nudgeActions.dismissDock();
    trackAppEvent({ event: "newsletter_prompt_dismissed", lang, surface: "dock" });
  }

  function openSheet() {
    setSheetOpen(true);
    trackAppEvent({ event: "newsletter_prompt_open", lang, surface: "dock" });
  }

  const eligible = mountedAt !== null && dockBarEligible(snap, mountedAt);
  // Hidden (not unmounted) while the footer / keyboard / modal need the space, so it slides back in.
  const barHidden = !eligible || footerVisible || typing || snap.modalOpen;

  // One impression per page view, the first time the bar is actually shown.
  const impressed = useRef(false);
  useEffect(() => {
    if (!barHidden && !impressed.current) {
      impressed.current = true;
      trackAppEvent({ event: "newsletter_prompt_impression", lang, surface: "dock" });
    }
  }, [barHidden, lang]);

  // Already subscribed (on this or another page): the dock is gone for good; the column keeps its other cards.
  if (snap.subscribed && !sheetOpen) {
    return children ? (
      <aside aria-label={dict.title} className="side-sticky hidden content-start gap-6 lg:grid">
        {children}
      </aside>
    ) : null;
  }

  return (
    <>
      {/* Desktop: sticky card in the side column */}
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

      {/* Mobile: reserve the bar's height so it never covers the end of the content */}
      <div aria-hidden="true" className="h-16 lg:hidden" />

      {/* Mobile: slim bottom bar */}
      <div
        className={[
          "newsletter-dock-bar fixed inset-x-3 z-40 lg:hidden",
          "bottom-[max(0.75rem,env(safe-area-inset-bottom))]",
          barHidden ? "pointer-events-none translate-y-[150%] opacity-0" : "translate-y-0 opacity-100",
        ].join(" ")}
        aria-hidden={barHidden || undefined}
        inert={barHidden || undefined}
      >
        <div className="surface flex items-center gap-2 py-2 pl-3 pr-2 shadow-lg">
          <span className="text-accent">
            <MailIcon />
          </span>
          <p className="min-w-0 flex-1 truncate text-sm text-ink">
            <span className="font-medium">{dict.title}</span>
            <span className="text-ink-muted"> · {dict.body}</span>
          </p>
          <button ref={openerRef} type="button" onClick={openSheet} className="btn btn-primary h-8 shrink-0 px-3 text-xs" aria-haspopup="dialog">
            {formDict.submit}
          </button>
          <button type="button" onClick={dismiss} className="btn-icon h-8 w-8 shrink-0" aria-label={dict.close} title={dict.close}>
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile: bottom sheet */}
      {sheetOpen ? (
        <Portal>
          <div className="fixed inset-0 z-50 flex items-end lg:hidden" role="presentation">
            <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" onClick={closeSheet} aria-hidden="true" />
            <div
              ref={sheetRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="newsletter-sheet-title"
              className="relative w-full animate-toast-in px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
            >
              <div className="surface p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 id="newsletter-sheet-title" className="font-title text-lg font-semibold">
                      {dict.title}
                    </h2>
                    <p className="mt-1 text-sm text-ink-muted">{dict.body}</p>
                  </div>
                  <button type="button" onClick={closeSheet} className="btn-icon h-8 w-8 shrink-0" aria-label={dict.close}>
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                      <path d="M6 6l12 12M18 6 6 18" />
                    </svg>
                  </button>
                </div>
                <div className="mt-4">
                  <SubscribeForm lang={lang} dict={formDict} autoFocus surface="dock" />
                </div>
              </div>
            </div>
          </div>
        </Portal>
      ) : null}
    </>
  );
}
