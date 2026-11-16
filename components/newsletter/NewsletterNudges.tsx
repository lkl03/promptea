"use client";

// components/newsletter/NewsletterNudges.tsx
//
// v1.8.0 — THE controller of the newsletter prompts. Mounted once in the root
// layout, so it survives client-side navigation. It owns the floating surface
// (card + pill) and the AI Daily modal, and coordinates the AI Daily dock,
// which reads the same store:
//
//   CARD   (every public page, AI Daily included since v1.8.7) 5 s after
//          entering, the "Join our newsletter" card appears ALREADY OPEN: title,
//          one line of value, the form and a close button, bottom-right with
//          safe-area insets. It is not a modal: no backdrop, it never takes
//          focus, Esc and its close button collapse it to the pill and pause it
//          for 7 days. Any visitor who has not said "no" gets it (v1.8.1 showed
//          it once per browser, which is why the owner never saw it again).
//          Where it would cover a text box, a primary button or the footer's
//          links it uses the compact one-row version, or waits until the
//          visitor scrolls them away (lib/newsletter/prompts.ts → chooseVariant).
//          On the tool pages it collapses to the pill as soon as the visitor
//          starts typing, so it never sits on the analysis results.
//   PILL   the collapsed state: a small fixed pill that (re)opens the card.
//          Closing the pill hides it for DISMISS_DAYS; subscribing removes
//          everything for good. On phones, on the tool pages (analyzer /
//          best-ai) it is just an icon. It also never covers those controls.
//   MODAL  (AI Daily only) a stronger prompt, once per session and once a week:
//          exit intent (mouse leaves through the top) on desktop; on touch
//          devices, having scrolled 60% or read for ~25 s, and only when the
//          page has been still for a moment. Never over an open card, never
//          within 7 days of the card being closed. Accessible modal: focus trap,
//          Esc, backdrop, focus returned to where it was.
//
// The rules (timing, frequency, persistence, "never stack", "never cover") are
// pure and tested in lib/newsletter/prompts.ts; state lives in
// lib/newsletter/promptStore.ts. Steps aside — never overlaps — while: a control
// it must not cover is under it, a text field is focused or the soft keyboard is
// likely open, another modal dialog is open, the modal itself is showing, or an
// in-page subscription form ([data-newsletter-inline]: the home side card, the
// AI Daily dock) is on screen: one way to subscribe at a time.
// Fixed and out of flow, so it can never shift layout. Reduced motion: no movement, fade only.
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
  CARD_COMPACT_MAX_WIDTH,
  cardEligible,
  chooseVariant,
  cornerClear,
  dwellAllows,
  FLOATING_SIZES,
  floatingVisible,
  isExitIntent,
  isToolRoute,
  modalEligible,
  obstacleSelector,
  pillEligible,
  readingEngaged,
  routeKind,
  scrollRatio,
  type Box,
  type CardVariant,
} from "@/lib/newsletter/prompts";
import { type Lang } from "@/lib/domain";

export type NudgeDict = {
  pill: string;
  panelTitle: string;
  panelBody: string;
  /** v1.8.1 — the button of the compact (phone) card that expands the form. */
  compactCta: string;
  /** v1.8.1 — accessible name of the close button of the pill ("hide for a few days"). */
  hide: string;
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

/**
 * v1.8.7 — what the floating surface must not cover, measured live: the boxes of
 * the text fields, primary buttons and footer controls that are on screen
 * (every control on the tool pages). v1.8.1 measured only the footer links;
 * v1.8.0 hid the pill whenever the footer was visible at all. Re-measured on
 * scroll, resize and once a second (results appear without either), and on
 * every navigation. Returns the "corner is clear" answers the controller needs.
 */
type Clearance = { variant: CardVariant | null; card: boolean; compact: boolean; pill: boolean };
const ALL_CLEAR: Clearance = { variant: "full", card: true, compact: true, pill: true };

function useClearance(pathname: string, strict: boolean): Clearance {
  const [clear, setClear] = useState<Clearance>(ALL_CLEAR);
  useEffect(() => {
    let raf = 0;
    let last = "";
    const measure = () => {
      raf = 0;
      if (document.visibilityState === "hidden") return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const obstacles: Box[] = [];
      for (const el of document.querySelectorAll(obstacleSelector(strict))) {
        if (el.closest("[data-nudge-root]")) continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0 || r.bottom <= 0 || r.top >= vh) continue;
        obstacles.push({ left: r.left, top: r.top, right: r.right, bottom: r.bottom });
      }
      const next: Clearance = {
        variant: chooseVariant(vw, vh, obstacles),
        card: cornerClear(vw, vh, FLOATING_SIZES.card, obstacles),
        compact: cornerClear(vw, vh, FLOATING_SIZES.compact, obstacles),
        pill: cornerClear(vw, vh, FLOATING_SIZES.pill, obstacles),
      };
      const key = JSON.stringify(next);
      if (key !== last) {
        last = key;
        setClear(next);
      }
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    // The page content of a client navigation lands a tick after the pathname changes.
    const first = window.setTimeout(schedule, 0);
    const tick = window.setInterval(schedule, 1000);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(tick);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [pathname, strict]);
  return clear;
}

/** v1.8.1 — true while an in-page subscription form is (even partly) on screen. Re-attached on every navigation. */
function useInlineFormVisible(pathname: string): boolean {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const seen = new Set<Element>();
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) seen.add(e.target);
        else seen.delete(e.target);
      }
      setVisible(seen.size > 0);
    });
    // The page content of a client navigation lands a tick after the pathname changes.
    const t = window.setTimeout(() => {
      document.querySelectorAll("[data-newsletter-inline]").forEach((el) => io.observe(el));
    }, 0);
    return () => {
      window.clearTimeout(t);
      io.disconnect();
      setVisible(false);
    };
  }, [pathname]);
  return visible;
}

const SMALL_QUERY = `(max-width: ${CARD_COMPACT_MAX_WIDTH}px)`;
function subscribeSmall(cb: () => void) {
  const mq = window.matchMedia(SMALL_QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
/** Phone-sized viewport (the compact card). False on the server and on the first client render. */
function useSmallViewport(): boolean {
  return useSyncExternalStore(
    subscribeSmall,
    () => window.matchMedia(SMALL_QUERY).matches,
    () => false
  );
}

export default function NewsletterNudges({ lang, dict, formDict }: { lang: Lang; dict: NudgeDict; formDict: SubscribeFormDict }) {
  const pathname = usePathname() ?? "";
  const kind = routeKind(pathname);
  const tool = isToolRoute(pathname);
  const snap = useSyncExternalStore(subscribeStore, getSnapshot, getServerSnapshot);

  // Epoch ms at which the 5 s delay elapsed (null = not yet). Measured once per full page load.
  const [readyAt, setReadyAt] = useState<number | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const typing = useTypingElsewhere();

  useEffect(() => {
    const t = window.setTimeout(() => setReadyAt(Date.now()), PILL_DELAY_MS);
    return () => window.clearTimeout(t);
  }, []);

  // ── Floating surface: card + pill ─────────────────────────────────────
  const formOpen = snap.pillFormOpen;
  const small = useSmallViewport();
  const inlineFormVisible = useInlineFormVisible(pathname);
  // Tool pages and phones: no control may be covered; elsewhere text boxes, primary buttons and the footer.
  const clear = useClearance(pathname, tool || small);
  // Who opened the card: "auto" = by itself at 5 s; "user" = the visitor (pill click / expanded it).
  const [openedBy, setOpenedBy] = useState<"auto" | "user" | null>(null);
  // The variant the card opened with by itself (full, or the one-row compact one).
  const [autoVariant, setAutoVariant] = useState<CardVariant>("full");
  // The card opens by itself at most once per page load (a collapse on a tool page is not an invitation to reopen).
  const autoDone = useRef(false);
  const userOpened = formOpen && openedBy === "user";
  const showCard = formOpen;
  const compact = showCard && openedBy === "auto" && (small || autoVariant === "compact");
  // Is the corner the visible surface occupies clear right now?
  const cornerFree = showCard ? (compact ? clear.compact : clear.card) : clear.pill;

  const wanted = kind !== "none" && readyAt !== null && (pillEligible(snap, readyAt) || celebrate || formOpen);
  const pillVisible = floatingVisible({ wanted, modalOpen: snap.modalOpen, inlineFormVisible, inTheWay: !cornerFree, typing, userOpened });
  const pillBtnRef = useRef<HTMLButtonElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const impressed = useRef<Record<string, boolean>>({});

  const track = useCallback(
    (event: "newsletter_prompt_impression" | "newsletter_prompt_open" | "newsletter_prompt_dismissed", surface: NewsletterSurface) => trackAppEvent({ event, lang, surface }),
    [lang]
  );

  // 5 s after entering: open the card by itself, for anyone who has not said "no" in the last 7 days,
  // the first moment nothing is in its way (a control under it, typing, an in-page form, a dialog).
  useEffect(() => {
    if (kind === "none" || readyAt === null || formOpen || snap.modalOpen || autoDone.current) return;
    if (inlineFormVisible || typing) return;
    if (!cardEligible(snap, readyAt)) return;
    const variant: CardVariant | null = small ? (clear.compact ? "compact" : null) : clear.variant;
    if (!variant) return;
    if (document.querySelector('[role="dialog"][aria-modal="true"]')) return; // never on top of a real dialog
    const t = window.setTimeout(() => {
      autoDone.current = true;
      nudgeActions.markCardShown();
      nudgeActions.setPillFormOpen(true);
      setAutoVariant(variant);
      setOpenedBy("auto");
      track("newsletter_prompt_impression", "card");
    }, 0);
    return () => window.clearTimeout(t);
  }, [kind, readyAt, formOpen, snap, inlineFormVisible, typing, small, clear, track]);

  // Tool pages: the visitor started working (typing in the text box). The card will not open by itself
  // any more on this page load, and one that already did collapses to the pill so it never sits on the
  // results. Not a dismissal: nothing is stored.
  useEffect(() => {
    if (!tool || !typing) return;
    autoDone.current = true;
    if (!formOpen || openedBy !== "auto") return;
    const t = window.setTimeout(() => {
      nudgeActions.setPillFormOpen(false);
      setOpenedBy(null);
    }, 0);
    return () => window.clearTimeout(t);
  }, [tool, typing, formOpen, openedBy]);

  useEffect(() => {
    if (pillVisible && !showCard && !impressed.current.pill) {
      impressed.current.pill = true;
      track("newsletter_prompt_impression", "pill");
    }
  }, [pillVisible, showCard, track]);

  function openPill() {
    setOpenedBy("user");
    nudgeActions.setPillFormOpen(true);
    track("newsletter_prompt_open", "pill");
  }

  /**
   * Collapse the card back to the pill. A dismissal (its X or Esc) also pauses the card for
   * DISMISS_DAYS. Focus returns to the pill only if it was inside the card.
   */
  const closeCard = useCallback(
    (dismissed: boolean) => {
      const hadFocus = Boolean(cardRef.current?.contains(document.activeElement));
      if (dismissed && !getSnapshot().subscribed) {
        track("newsletter_prompt_dismissed", "card");
        nudgeActions.dismissCard();
      } else {
        nudgeActions.setPillFormOpen(false);
      }
      setOpenedBy(null);
      setCelebrate(false);
      if (hadFocus) requestAnimationFrame(() => pillBtnRef.current?.focus());
    },
    [track]
  );

  /** The close button of the pill itself: hide the floating prompt for DISMISS_DAYS. */
  function hidePill() {
    if (!snap.subscribed) {
      nudgeActions.dismissPill();
      track("newsletter_prompt_dismissed", "pill");
    } else {
      nudgeActions.setPillFormOpen(false);
    }
    setOpenedBy(null);
    setCelebrate(false);
  }

  function onPillDone() {
    setCelebrate(true);
    window.setTimeout(() => {
      nudgeActions.setPillFormOpen(false);
      setOpenedBy(null);
      setCelebrate(false);
    }, SUCCESS_LINGER_MS);
  }

  // Esc collapses the card wherever the focus is (the card never takes it), unless a real
  // dialog or an open menu owns the key.
  useEffect(() => {
    if (!showCard || !pillVisible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      if (document.querySelector('[role="dialog"][aria-modal="true"], [role="menu"], [role="listbox"]')) return;
      closeCard(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showCard, pillVisible, closeCard]);

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
      if (s.pillFormOpen) return false; // v1.8.7: never over an open card
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
      {kind === "public" || kind === "daily" ? (
        <div
          data-nudge-root
          className={["newsletter-pill-wrap fixed z-40", pillVisible ? "is-visible" : "is-hidden"].join(" ")}
          style={{ right: "max(0.75rem, env(safe-area-inset-right))", bottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
          inert={!pillVisible || undefined}
        >
          {showCard ? (
            // Non-modal: no backdrop, no focus trap, focus is never moved here on its own.
            <div
              ref={cardRef}
              role="dialog"
              aria-modal="false"
              aria-labelledby="nl-pill-title"
              data-newsletter-card={compact ? "compact" : "full"}
              className={[
                "newsletter-card surface animate-toast-in shadow-lg",
                compact ? "w-[min(26rem,calc(100vw-1.5rem))] p-3" : "max-h-[calc(100dvh-1.5rem)] w-[min(23rem,calc(100vw-1.5rem))] overflow-y-auto p-4",
              ].join(" ")}
            >
              {compact ? (
                <div className="flex items-center gap-2.5">
                  <span className="shrink-0 text-accent">
                    <MailIcon className="h-5 w-5" />
                  </span>
                  <h2 id="nl-pill-title" className="min-w-0 flex-1 font-title text-sm font-semibold leading-snug">
                    {dict.panelTitle}
                  </h2>
                  <button type="button" onClick={() => setOpenedBy("user")} className="btn btn-primary h-9 shrink-0 px-3.5 text-sm">
                    {dict.compactCta}
                  </button>
                  <button type="button" onClick={() => closeCard(true)} className="btn-icon h-9 w-9 shrink-0" aria-label={dict.close} title={dict.close}>
                    <CloseIcon />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 id="nl-pill-title" className="font-title text-base font-semibold leading-snug">
                        {dict.panelTitle}
                      </h2>
                      <p className="mt-1 text-sm leading-snug text-ink-muted">{dict.panelBody}</p>
                    </div>
                    <button type="button" onClick={() => closeCard(true)} className="btn-icon h-8 w-8 shrink-0" aria-label={dict.close} title={dict.close}>
                      <CloseIcon />
                    </button>
                  </div>
                  <div className="mt-3">
                    {/* Focus moves into the form only when the visitor opened the card themselves. */}
                    <SubscribeForm lang={lang} dict={formDict} autoFocus={openedBy === "user"} surface={openedBy === "auto" ? "card" : "pill"} onDone={onPillDone} />
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="newsletter-pill flex items-center rounded-full border border-line-strong bg-[var(--overlay-fill)] shadow-lg">
              <button
                ref={pillBtnRef}
                type="button"
                onClick={openPill}
                aria-haspopup="dialog"
                aria-expanded={false}
                className={["flex h-11 items-center gap-2 rounded-full pl-4 text-sm font-medium text-ink", tool ? "pr-3 sm:pr-2" : "pr-2"].join(" ")}
              >
                <span className="text-accent">
                  <MailIcon />
                </span>
                {/* On phone-sized tool pages the label collapses to an icon; the accessible name stays. */}
                <span className={tool ? "sr-only sm:not-sr-only" : undefined}>{dict.pill}</span>
              </button>
              <button type="button" onClick={hidePill} className={["btn-icon mr-1.5 h-8 w-8 shrink-0 border-transparent bg-transparent", tool ? "hidden sm:inline-flex" : ""].join(" ")} aria-label={dict.hide} title={dict.hide}>
                <CloseIcon />
              </button>
            </div>
          )}
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
