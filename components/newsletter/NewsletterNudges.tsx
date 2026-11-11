"use client";

// components/newsletter/NewsletterNudges.tsx
//
// v1.8.0 — THE controller of the newsletter prompts. Mounted once in the root
// layout, so it survives client-side navigation. It owns the floating surface
// (card + pill) and the AI Daily modal, and coordinates the AI Daily dock,
// which reads the same store:
//
//   CARD   (v1.8.1; every public page except AI Daily) on the FIRST visit —
//          nothing remembered in localStorage — the card appears ALREADY OPEN
//          5 s after entering the site: title, short text and the form,
//          bottom-right with safe-area insets. It is not a modal: no backdrop,
//          it never takes focus, Esc and its close button collapse it to the
//          pill. On phones it is one compact row ("Subscribe" expands it) and
//          on the phone tool pages it does not open at all. It opens by itself
//          once per browser.
//   PILL   the collapsed state: a small fixed pill that (re)opens the card.
//          Every later visit shows only the pill; closing the pill hides it
//          for DISMISS_DAYS; subscribing removes everything for good. On
//          phones, on the tool pages (analyzer / best-ai) it is just an icon so
//          it never covers the text box or the results.
//   MODAL  (AI Daily only) a stronger prompt, once per session and once a week:
//          exit intent (mouse leaves through the top) on desktop; on touch
//          devices, having scrolled 60% or read for ~25 s, and only when the
//          page has been still for a moment. Accessible modal: focus trap, Esc,
//          backdrop, focus returned to where it was.
//
// The rules (timing, frequency, persistence, "never stack") are pure and tested
// in lib/newsletter/prompts.ts; state lives in lib/newsletter/promptStore.ts.
// Steps aside — never overlaps — while: the footer is on screen, a text field is
// focused or the soft keyboard is likely open, another modal dialog is open, the
// modal itself is showing, or (v1.8.1) an in-page subscription form
// ([data-newsletter-inline]) is on screen: one way to subscribe at a time.
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
  cardVariant,
  dwellAllows,
  FLOATING_SIZES,
  floatingBox,
  floatingVisible,
  rectsOverlap,
  isExitIntent,
  isToolRoute,
  modalEligible,
  pillEligible,
  readingEngaged,
  routeKind,
  scrollRatio,
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
 * True while the floating surface would sit on top of a footer control.
 *
 * v1.8.0 hid the pill whenever any part of the footer was on screen, which on a
 * short page (footer visible from the start) meant it never appeared at all.
 * v1.8.1 measures instead: the box the surface occupies (bottom-right, `box`
 * wide and tall) against the footer's own links and buttons. On a wide screen
 * the footer's centred links are clear of the corner, so the card can show; on
 * a phone they are under it, so it steps aside. Re-attached on every navigation.
 */
function useFooterInTheWay(pathname: string, boxWidth: number, boxHeight: number): boolean {
  const [blocked, setBlocked] = useState(false);
  useEffect(() => {
    const footer = document.querySelector("footer");
    if (!footer) return;
    let raf = 0;
    let onScreen = false;
    const measure = () => {
      raf = 0;
      if (!onScreen) return setBlocked(false);
      const box = floatingBox(window.innerWidth, window.innerHeight, boxWidth, boxHeight);
      const hit = [...footer.querySelectorAll("a, button, input, select")].some((el) => rectsOverlap(el.getBoundingClientRect(), box));
      setBlocked(hit);
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    const io = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      schedule();
    });
    io.observe(footer);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (raf) cancelAnimationFrame(raf);
      setBlocked(false);
    };
  }, [pathname, boxWidth, boxHeight]);
  return blocked;
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

  // ── Floating surface: first-visit card + pill ─────────────────────────
  const formOpen = snap.pillFormOpen;
  const small = useSmallViewport();
  const inlineFormVisible = useInlineFormVisible(pathname);
  // Who opened the card: "auto" = the first-visit card; "user" = the visitor (pill click / expanded it).
  const [openedBy, setOpenedBy] = useState<"auto" | "user" | null>(null);
  const userOpened = formOpen && openedBy === "user";
  // On the phone tool pages a self-opened card would sit on the text box: only the icon pill there.
  const cardSuppressed = formOpen && openedBy === "auto" && small && tool;
  const showCard = formOpen && !cardSuppressed;
  const compact = showCard && small && openedBy === "auto";
  // The space the surface needs: the card when it is open or about to open by itself, the pill otherwise.
  // Known from the first render (no clock involved), so the footer measurement is ready before the 5 s mark.
  const cardLikely = showCard || (cardEligible(snap) && !(small && tool));
  const box = cardLikely ? (small && openedBy !== "user" ? FLOATING_SIZES.compact : FLOATING_SIZES.card) : FLOATING_SIZES.pill;
  const footerVisible = useFooterInTheWay(pathname, box.width, box.height);

  const wanted = kind === "public" && readyAt !== null && (pillEligible(snap, readyAt) || celebrate || formOpen);
  const pillVisible = floatingVisible({ wanted, modalOpen: snap.modalOpen, inlineFormVisible, footerVisible, typing, userOpened });
  const pillBtnRef = useRef<HTMLButtonElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const impressed = useRef<Record<string, boolean>>({});

  const track = useCallback(
    (event: "newsletter_prompt_impression" | "newsletter_prompt_open" | "newsletter_prompt_dismissed", surface: NewsletterSurface) => trackAppEvent({ event, lang, surface }),
    [lang]
  );

  // First visit: open the card by itself, once per browser, the first moment nothing is in its way.
  useEffect(() => {
    if (kind !== "public" || readyAt === null || formOpen || snap.modalOpen) return;
    if (inlineFormVisible || footerVisible || typing) return;
    if (!cardEligible(snap)) return;
    if (cardVariant(pathname, window.innerWidth) === "none") return;
    if (document.querySelector('[role="dialog"][aria-modal="true"]')) return; // never on top of a real dialog
    const t = window.setTimeout(() => {
      nudgeActions.markCardShown();
      nudgeActions.setPillFormOpen(true);
      setOpenedBy("auto");
      track("newsletter_prompt_impression", "card");
    }, 0);
    return () => window.clearTimeout(t);
  }, [kind, readyAt, formOpen, snap, inlineFormVisible, footerVisible, typing, pathname, track]);

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

  /** Collapse the card back to the pill. Focus returns to the pill only if it was inside the card. */
  const closeCard = useCallback(
    (dismissed: boolean) => {
      const hadFocus = Boolean(cardRef.current?.contains(document.activeElement));
      if (dismissed && !getSnapshot().subscribed) track("newsletter_prompt_dismissed", "card");
      nudgeActions.setPillFormOpen(false);
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
