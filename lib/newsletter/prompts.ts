// lib/newsletter/prompts.ts
//
// v1.8.0 — the rules of the newsletter prompts, as pure functions (no React,
// no DOM, storage injected) so every rule is tested exactly. There are four
// surfaces and ONE controller (components/newsletter/NewsletterNudges.tsx):
//
//   card   (v1.8.1) the FIRST visit only: at 5 s the floating card appears
//          already open (title, short text, form), bottom-right, non-modal.
//          Closing it collapses it to the pill. It is shown once per browser.
//   pill   a small fixed pill, bottom-right, that (re)opens the card. Public
//          pages EXCEPT AI Daily (the dock already lives there). Every visit
//          after the first shows only the pill, under the same frequency cap.
//   dock   the AI Daily side card / mobile bar (components/newsletter/NewsletterDock.tsx).
//   modal  a stronger prompt, AI Daily only: exit intent on desktop, scroll or
//          reading time on touch devices.
//
// Guarantees (each one has a test):
//   - nothing is ever shown before MIN_DELAY_MS on the page;
//   - subscribed -> never shown again, on any surface;
//   - "close" is remembered for DISMISS_DAYS (pill and dock separately);
//   - the modal appears at most once per session AND once per MODAL_COOLDOWN_DAYS;
//   - while the modal is open, pill and dock bar step aside: surfaces never stack;
//   - (v1.8.1) the card opens by itself once per browser and only on a first
//     visit (no mark of any kind stored): never for a subscriber, never for
//     someone who already closed a prompt;
//   - (v1.8.1) while an in-page subscription form is on screen the floating
//     card/pill is not shown: one way to subscribe at a time;
//   - storage failures (private mode, blocked) degrade to "session only", never throw.

import { LANGS } from "@/lib/domain";

export const STORAGE_KEY = "promptea:newsletter-nudges";
export const SESSION_KEY = "promptea:newsletter-nudges:session";

/** Nothing appears earlier than this after entering the site. */
export const MIN_DELAY_MS = 5_000;
export const PILL_DELAY_MS = MIN_DELAY_MS;
/** Exit-intent / reading triggers also wait at least this long (never below MIN_DELAY_MS). */
export const MODAL_MIN_DWELL_MS = 8_000;
/** Touch devices: reading time that stands in for exit intent. */
export const MODAL_READ_MS = 25_000;
/** Touch devices: how far down the page counts as "reading it". */
export const MODAL_SCROLL_RATIO = 0.6;
/** A scroll must be idle this long before the modal may open (never interrupt a swipe). */
export const MODAL_SCROLL_IDLE_MS = 900;

export const DISMISS_DAYS = 7;
export const MODAL_COOLDOWN_DAYS = 7;
const DAY_MS = 86_400_000;

export type NudgeState = {
  /** Subscribed from any form on this browser. Permanent. */
  subscribed: boolean;
  /** Epoch ms of the last pill dismissal (0 = never). */
  pillDismissedAt: number;
  /** Epoch ms of the last dock-bar dismissal. */
  dockDismissedAt: number;
  /** Epoch ms the modal was last shown (shown counts as seen: closing it adds nothing). */
  modalShownAt: number;
  /** v1.8.1 — epoch ms the first-visit card opened by itself (0 = never: this is a first visit). */
  cardShownAt: number;
};

export const EMPTY_STATE: NudgeState = { subscribed: false, pillDismissedAt: 0, dockDismissedAt: 0, modalShownAt: 0, cardShownAt: 0 };

export type StorageLike = Pick<Storage, "getItem" | "setItem">;

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : 0);

export function parseState(raw: string | null): NudgeState {
  if (!raw) return { ...EMPTY_STATE };
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    return {
      subscribed: o.subscribed === true,
      pillDismissedAt: num(o.pillDismissedAt),
      dockDismissedAt: num(o.dockDismissedAt),
      modalShownAt: num(o.modalShownAt),
      cardShownAt: num(o.cardShownAt),
    };
  } catch {
    return { ...EMPTY_STATE };
  }
}

export function readState(storage: StorageLike | null): NudgeState {
  try {
    return parseState(storage?.getItem(STORAGE_KEY) ?? null);
  } catch {
    return { ...EMPTY_STATE };
  }
}

/** Returns false when the write failed (the caller keeps the state in memory). */
export function writeState(storage: StorageLike | null, state: NudgeState): boolean {
  try {
    if (!storage) return false;
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

const within = (then: number, now: number, days: number) => then > 0 && now - then < days * DAY_MS;

export function pillEligible(state: NudgeState, now: number): boolean {
  return !state.subscribed && !within(state.pillDismissedAt, now, DISMISS_DAYS);
}

/**
 * v1.8.1 — may the card open BY ITSELF? Only on a first visit, i.e. when this
 * browser remembers nothing at all about the newsletter prompts: never shown
 * the card, never subscribed, never closed the pill or the dock, never seen
 * the modal. Any mark means "not a first visit" and the visitor gets the pill.
 * It does not depend on the clock, so it is known from the first render.
 */
export function cardEligible(state: NudgeState): boolean {
  return !state.subscribed && state.cardShownAt === 0 && state.pillDismissedAt === 0 && state.dockDismissedAt === 0 && state.modalShownAt === 0;
}

/**
 * v1.8.1 — the one stacking rule of the floating surface (card or pill).
 *   - never together with the AI Daily modal;
 *   - never while an in-page subscription form is on screen (unless the visitor
 *     opened the card themselves and is using it: do not pull it from under them);
 *   - steps aside for the footer and for typing / the soft keyboard, again
 *     unless the visitor opened it themselves.
 */
export function floatingVisible(i: {
  wanted: boolean;
  modalOpen: boolean;
  inlineFormVisible: boolean;
  footerVisible: boolean;
  typing: boolean;
  /** The card is open because the visitor asked for it (clicked the pill / expanded it). */
  userOpened: boolean;
}): boolean {
  if (!i.wanted || i.modalOpen) return false;
  if (i.userOpened) return true;
  return !i.inlineFormVisible && !i.footerVisible && !i.typing;
}

// ---------------------------------------------------------------------------
// Geometry (v1.8.1): where the floating surface sits, to step aside precisely
// ---------------------------------------------------------------------------

export type Box = { left: number; top: number; right: number; bottom: number };

/** Approximate footprints (CSS px) of the floating surface in each state, margin included. */
export const FLOATING_SIZES = {
  pill: { width: 250, height: 68 },
  card: { width: 380, height: 330 },
  /** The phone row spans the viewport width (the helper clamps it). */
  compact: { width: 440, height: 88 },
} as const;

/** The bottom-right box a floating surface of that size occupies in the viewport. */
export function floatingBox(viewportWidth: number, viewportHeight: number, width: number, height: number): Box {
  const w = Math.min(width, viewportWidth);
  const h = Math.min(height, viewportHeight);
  return { left: viewportWidth - w, top: viewportHeight - h, right: viewportWidth, bottom: viewportHeight };
}

/** Strict overlap of two boxes (touching edges do not count; an empty box never overlaps). */
export function rectsOverlap(a: Box, b: Box): boolean {
  if (a.right <= a.left || a.bottom <= a.top || b.right <= b.left || b.bottom <= b.top) return false;
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

/** Below this viewport width the self-opened card is the compact one-row version. */
export const CARD_COMPACT_MAX_WIDTH = 639;

export type CardVariant = "full" | "compact" | "none";

/**
 * v1.8.1 — which self-opened card a first visit gets.
 *   full     desktop/tablet: title, short text and the form, already open.
 *   compact  phones: one row (title + "Subscribe" + close) that expands on tap,
 *            so it never covers a text box or its controls.
 *   none     phones on the tool pages (analyzer / best-ai): only the icon pill.
 */
export function cardVariant(pathname: string, viewportWidth: number): CardVariant {
  const small = viewportWidth <= CARD_COMPACT_MAX_WIDTH;
  if (!small) return "full";
  return isToolRoute(pathname) ? "none" : "compact";
}

export function dockBarEligible(state: NudgeState, now: number): boolean {
  return !state.subscribed && !within(state.dockDismissedAt, now, DISMISS_DAYS);
}

export function modalEligible(state: NudgeState, now: number, shownThisSession: boolean): boolean {
  return !state.subscribed && !shownThisSession && !within(state.modalShownAt, now, MODAL_COOLDOWN_DAYS);
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

export type RouteKind = "daily" | "public" | "none";

/** `/{any locale}/{segment}` and whatever is under it. */
const LOCALE_ROUTE = (segment: string) => new RegExp(`^/(${LANGS.join("|")})/${segment}(/|$)`);

/**
 * AI Daily pages carry the dock + modal; every other public page carries the
 * pill; newsletter management pages carry nothing (they are about the newsletter).
 */
export function routeKind(pathname: string): RouteKind {
  const p = pathname.replace(/\/+$/, "");
  if (LOCALE_ROUTE("(weekly|unsubscribe)").test(p) || /^\/api\//.test(p)) return "none";
  if (LOCALE_ROUTE("blog").test(p)) return "daily";
  return "public";
}

/** Tool pages where a fixed element must stay small on phones (text boxes, results). */
export function isToolRoute(pathname: string): boolean {
  return LOCALE_ROUTE("(analyzer|best-ai)").test(pathname.replace(/\/+$/, ""));
}

// ---------------------------------------------------------------------------
// Triggers
// ---------------------------------------------------------------------------

/** Mouse left through the top edge of the viewport (towards tabs / address bar / close). */
export function isExitIntent(e: { clientY: number; relatedTarget: unknown; buttons?: number }): boolean {
  return e.relatedTarget === null && e.clientY <= 0 && !e.buttons;
}

export function scrollRatio(scrollY: number, viewportHeight: number, documentHeight: number): number {
  const scrollable = documentHeight - viewportHeight;
  if (!(scrollable > 0)) return 0;
  return Math.min(1, Math.max(0, scrollY / scrollable));
}

/**
 * Touch devices have no mouse to "leave" with: the equivalent of exit intent is
 * having read most of the page, or having spent a good while on it.
 */
export function readingEngaged(input: { ratio: number; dwellMs: number }): boolean {
  return input.ratio >= MODAL_SCROLL_RATIO || input.dwellMs >= MODAL_READ_MS;
}

/** The earliest moment any prompt may appear, whatever the trigger. */
export function dwellAllows(dwellMs: number, min = MIN_DELAY_MS): boolean {
  return dwellMs >= Math.max(min, MIN_DELAY_MS);
}
