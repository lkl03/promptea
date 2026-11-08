"use client";

// components/newsletter/NewsletterNudges.tsx
//
// v1.8.0 — THE controller of the newsletter prompts. Mounted once in the root
// layout, so it survives client-side navigation. It owns two surfaces and
// coordinates the third (the AI Daily dock, which reads the same store):
//
//   PILL   (every public page except AI Daily) a small fixed pill, bottom-right
//          with safe-area insets, that appears 5 s after entering the site and
//          opens a mini form right there. On phones, on the tool pages
//          (analyzer / best-ai) it collapses to an icon so it never covers the
//          text box or the results.
//   MODAL  (AI Daily only) a stronger prompt, once per session and once a week:
//          exit intent (mouse leaves through the top) on desktop; on touch
//          devices, having scrolled 60% or read for ~25 s, and only when the
//          page has been still for a moment. Accessible modal: focus trap, Esc,
//          backdrop, focus returned to where it was.
//
// The rules (timing, frequency, persistence, "never stack") are pure and tested
// in lib/newsletter/prompts.ts; state lives in lib/newsletter/promptStore.ts.
// Steps aside — never overlaps — while: the footer is on screen, a text field is
// focused or the soft keyboard is likely open, another modal dialog is open, or
// the modal itself is showing. Reduced motion: no movement, fade only.
// Telemetry: impression / open / dismissed / subscribed, with the surface only.

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import SubscribeForm, { type SubscribeFormDict } from "./SubscribeForm";
import Portal from "@/components/Portal";
import { useFocusTrap } from "@/lib/useFocusTrap";
import { trackAppEvent, type NewsletterSurface } from "@/lib/telemetry/appEvents.client";
import { getServerSnapshot, getSnapshot, nudgeActions, subscribeStore, wasModalShownThisSession } from "@/lib/newsletter/promptStore";
import {
  MODAL_MIN_DWELL_MS,
  MODAL_READ_MS,
  MODAL_SCROLL_IDLE_MS,
  PILL_DELAY_MS,
  dwellAllows,
  isExitIntent,
  isToolRoute,
  modalEligible,
  pillEligible,
  readingEngaged,
  routeKind,
  scrollRatio,
} from "@/lib/newsletter/prompts";

export type NudgeDict = {
  pill: string;
  panelTitle: string;
  panelBody: string;
  close: string;
  modalTitle: string;
  modalBody: string;
  modalDismiss: string;
};

const TEXT_FIELD = "input:not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]), textarea, select, [contenteditable=true]";
const SUCCESS_LINGER_MS = 2400;

function MailIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

/** A text field outside the nudges is focused, or the visual viewport shrank (soft keyboard). */
function useTypingElsewhere(): boolean {
  const [typing, setTyping] = useState(false);
  useEffect(() => {
    const onFocus = (e: FocusEvent) => {
      const el = e.target as HTMLElement | null;
      if (!el || el.closest("[data-nudge-root]")) return;
      setTyping(el.matches(TEXT_FIELD));
    };
    const onBlur = () => setTyping(false);
    document.addEventListener("focusin", onFocus);
    document.addEventListener("focusout", onBlur);
    const vv = window.visualViewport;
    let keyboard = false;
    const onResize = () => {
      if (!vv) return;
      const shrunk = window.innerHeight - vv.height > 150;
      if (shrunk !== keyboard) {
        keyboard = shrunk;
        setTyping(shrunk);
      }
    };
    vv?.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("focusin", onFocus);
      document.removeEventListener("focusout", onBlur);
      vv?.removeEventListener("resize", onResize);
    };
  }, []);
  return typing;
}

/** True while the page footer is (even partly) on screen. Re-attached on every navigation. */
function useFooterVisible(pathname: string): boolean {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const footer = document.querySelector("footer");
    if (!footer) return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: "0px 0px -8px 0px" });
    io.observe(footer);
    return () => {
      io.disconnect();
      setVisible(false);
    };
  }, [pathname]);
  return visible;
}

export default function NewsletterNudges({ lang, dict, formDict }: { lang: "es" | "en"; dict: NudgeDict; formDict: SubscribeFormDict }) {
  const pathname = usePathname() ?? "";
  const kind = routeKind(pathname);
  const tool = isToolRoute(pathname);
  const snap = useSyncExternalStore(subscribeStore, getSnapshot, getServerSnapshot);

  // Epoch ms at which the 5 s delay elapsed (null = not yet). Measured once per full page load.
  const [readyAt, setReadyAt] = useState<number | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const typing = useTypingElsewhere();
  const footerVisible = useFooterVisible(pathname);

  useEffect(() => {
    const t = window.setTimeout(() => setReadyAt(Date.now()), PILL_DELAY_MS);
    return () => window.clearTimeout(t);
  }, []);

  // ── Pill ──────────────────────────────────────────────────────────────
  const formOpen = snap.pillFormOpen;
  const pillWanted = kind === "public" && readyAt !== null && (pillEligible(snap, readyAt) || celebrate) && !snap.modalOpen;
  const pillVisible = pillWanted && (formOpen || (!footerVisible && !typing));
  const pillBtnRef = useRef<HTMLButtonElement | null>(null);
  const impressed = useRef<Record<string, boolean>>({});

  const track = useCallback(
    (event: "newsletter_prompt_impression" | "newsletter_prompt_open" | "newsletter_prompt_dismissed", surface: NewsletterSurface) => trackAppEvent({ event, lang, surface }),
    [lang]
  );

  useEffect(() => {
    if (pillVisible && !impressed.current.pill) {
      impressed.current.pill = true;
      track("newsletter_prompt_impression", "pill");
    }
  }, [pillVisible, track]);

  function openPill() {
    nudgeActions.setPillFormOpen(true);
    track("newsletter_prompt_open", "pill");
  }

  function closePill(dismiss: boolean) {
    if (dismiss && !snap.subscribed) {
      nudgeActions.dismissPill();
      track("newsletter_prompt_dismissed", "pill");
    } else {
      nudgeActions.setPillFormOpen(false);
    }
    setCelebrate(false);
    requestAnimationFrame(() => pillBtnRef.current?.focus());
  }

  function onPillDone() {
    setCelebrate(true);
    window.setTimeout(() => {
      nudgeActions.setPillFormOpen(false);
      setCelebrate(false);
    }, SUCCESS_LINGER_MS);
  }

  // ── Modal (AI Daily) ──────────────────────────────────────────────────
  useEffect(() => {
    if (kind !== "daily") return;
    const start = performance.now();
    const coarse = window.matchMedia("(hover: none), (pointer: coarse)").matches;
    let idle: number | undefined;
    let readTimer: number | undefined;

    const canOpen = () => {
      const s = getSnapshot();
      if (s.modalOpen || !modalEligible(s, Date.now(), wasModalShownThisSession())) return false;
      if (!dwellAllows(performance.now() - start, MODAL_MIN_DWELL_MS)) return false;
      const active = document.activeElement as HTMLElement | null;
      if (active?.matches(TEXT_FIELD)) return false; // never interrupt typing
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return false; // never stack on another dialog
      return true;
    };
    const open = () => {
      if (!canOpen()) return;
      nudgeActions.openModal();
      track("newsletter_prompt_impression", "modal");
    };

    const onMouseOut = (e: MouseEvent) => {
      if (isExitIntent(e)) open();
    };
    const touchCheck = () => {
      const ratio = scrollRatio(window.scrollY, window.innerHeight, document.documentElement.scrollHeight);
      if (readingEngaged({ ratio, dwellMs: performance.now() - start })) open();
    };
    const onScroll = () => {
      window.clearTimeout(idle);
      idle = window.setTimeout(touchCheck, MODAL_SCROLL_IDLE_MS); // only once the page has been still
    };

    if (coarse) {
      window.addEventListener("scroll", onScroll, { passive: true });
      readTimer = window.setTimeout(onScroll, MODAL_READ_MS); // reading-time path, still waits for stillness
    } else {
      document.addEventListener("mouseout", onMouseOut);
    }
    return () => {
      document.removeEventListener("mouseout", onMouseOut);
      window.removeEventListener("scroll", onScroll);
      window.clearTimeout(idle);
      window.clearTimeout(readTimer);
    };
  }, [kind, track]);

  const modalRef = useRef<HTMLDivElement | null>(null);
  useFocusTrap(modalRef, snap.modalOpen);

  const closeModal = useCallback(
    (dismiss: boolean) => {
      if (dismiss && !getSnapshot().subscribed) track("newsletter_prompt_dismissed", "modal");
      nudgeActions.closeModal();
      setCelebrate(false);
    },
    [track]
  );

  useEffect(() => {
    if (!snap.modalOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal(true);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [snap.modalOpen, closeModal]);

  function onModalDone() {
    setCelebrate(true);
    window.setTimeout(() => closeModal(false), SUCCESS_LINGER_MS);
  }

  if (kind === "none") return null;

  return (
    <>
      {kind === "public" ? (
        <div
          data-nudge-root
          className={["newsletter-pill-wrap fixed z-40", pillVisible ? "is-visible" : "is-hidden"].join(" ")}
          style={{ right: "max(1rem, env(safe-area-inset-right))", bottom: "max(1rem, env(safe-area-inset-bottom))" }}
          inert={!pillVisible || undefined}
        >
          {formOpen ? (
            <div
              role="dialog"
              aria-modal="false"
              aria-labelledby="nl-pill-title"
              className="surface mb-3 w-[min(22rem,calc(100vw-2rem))] animate-toast-in p-4 shadow-lg"
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.stopPropagation();
                  closePill(true);
                }
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 id="nl-pill-title" className="font-title text-base font-semibold">
                    {dict.panelTitle}
                  </h2>
                  <p className="mt-1 text-sm text-ink-muted">{dict.panelBody}</p>
                </div>
                <button type="button" onClick={() => closePill(true)} className="btn-icon h-8 w-8 shrink-0" aria-label={dict.close} title={dict.close}>
                  <CloseIcon />
                </button>
              </div>
              <div className="mt-3">
                <SubscribeForm lang={lang} dict={formDict} autoFocus surface="pill" onDone={onPillDone} />
              </div>
            </div>
          ) : null}

          <div className="newsletter-pill flex items-center rounded-full border border-line-strong bg-[var(--overlay-fill)] shadow-lg">
            <button
              ref={pillBtnRef}
              type="button"
              onClick={() => (formOpen ? closePill(false) : openPill())}
              aria-haspopup="dialog"
              aria-expanded={formOpen}
              className={["flex h-11 items-center gap-2 rounded-full pl-4 text-sm font-medium text-ink", tool ? "pr-3 sm:pr-2" : "pr-2"].join(" ")}
            >
              <span className="text-accent">
                <MailIcon />
              </span>
              {/* On phone-sized tool pages the label collapses to an icon; the accessible name stays. */}
              <span className={tool ? "sr-only sm:not-sr-only" : undefined}>{dict.pill}</span>
            </button>
            <button type="button" onClick={() => closePill(true)} className={["btn-icon mr-1.5 h-8 w-8 shrink-0 border-transparent bg-transparent", tool ? "hidden sm:inline-flex" : ""].join(" ")} aria-label={dict.close} title={dict.close}>
              <CloseIcon />
            </button>
          </div>
        </div>
      ) : null}

      {snap.modalOpen && kind === "daily" ? (
        <Portal>
          <div className="fixed inset-0 z-50 flex items-end justify-center px-3 pb-3 sm:items-center sm:pb-0" role="presentation" data-nudge-root>
            <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" onClick={() => closeModal(true)} aria-hidden="true" />
            <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="nl-modal-title" aria-describedby="nl-modal-body" className="surface relative w-full max-w-md animate-toast-in p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <h2 id="nl-modal-title" className="font-title text-xl font-semibold leading-snug">
                  {dict.modalTitle}
                </h2>
                <button type="button" onClick={() => closeModal(true)} className="btn-icon h-8 w-8 shrink-0" aria-label={dict.close} title={dict.close}>
                  <CloseIcon />
                </button>
              </div>
              <p id="nl-modal-body" className="mt-2 text-sm leading-relaxed text-ink-muted">
                {dict.modalBody}
              </p>
              <div className="mt-4">
                <SubscribeForm lang={lang} dict={formDict} autoFocus surface="modal" onDone={onModalDone} />
              </div>
              {!celebrate ? (
                <button type="button" onClick={() => closeModal(true)} className="mt-3 w-full text-center text-sm text-ink-muted underline-offset-2 hover:text-ink hover:underline">
                  {dict.modalDismiss}
                </button>
              ) : null}
            </div>
          </div>
        </Portal>
      ) : null}
    </>
  );
}
