// lib/newsletter/prompts.ts
//
// v1.8.0 — the rules of the newsletter prompts, as pure functions (no React,
// no DOM, storage injected) so every rule is tested exactly. There are four
// surfaces and ONE controller (components/newsletter/NewsletterNudges.tsx):
//
//   card   the floating "Join our newsletter" card: 5 s after entering, it
//          appears ALREADY OPEN (title, one line of value, the form, a close
//          button), bottom-right, non-modal, on every public page — AI Daily
//          included since v1.8.7. Closing it collapses it to the pill.
//   pill   the collapsed card: a small fixed pill, bottom-right, that reopens it.
//   dock   the AI Daily side card (desktop, components/newsletter/NewsletterDock.tsx).
//          v1.8.7: its mobile bar is gone — on phones AI Daily gets the card.
//   modal  a stronger prompt, AI Daily only: exit intent on desktop, scroll or
//          reading time on touch devices.
//
// v1.8.7 — why the card was rarely seen (reproduced in production with a clean
// and a returning Chrome profile, docs/release/v1.8.7/logs/newsletter-before-*):
// v1.8.1 opened it "once per browser, on a first visit only", so after its first
// appearance — even if the visitor never closed it — every later visit got only
// the pill; AI Daily never showed it at all. The rules are now:
//
// Guarantees (each one has a test):
//   - nothing is ever shown before MIN_DELAY_MS (5 s) on the page;
//   - ANY visitor who has not said "no" gets the card open at 5 s — not only on
//     the first visit;
//   - closing the card (its X or Esc) keeps the pill and stops the card from
//     opening by itself for DISMISS_DAYS (7); closing the pill hides everything
//     for DISMISS_DAYS; the AI Daily modal (shown or closed) and the card share
//     that pause: at most one prompt that opens by itself per 7 days after a "no";
//   - subscribed -> never shown again, on any surface;
//   - the modal appears at most once per session AND once per MODAL_COOLDOWN_DAYS;
//   - surfaces never stack: while the modal is open the card/pill step aside,
//     and the modal does not open over an open card;
//   - while an in-page subscription form is on screen (home side card, the AI
//     Daily dock, …) the floating card/pill is not shown: one way to subscribe
//     at a time;
//   - (v1.8.7) it never covers a text box, a primary button or the footer
//     controls: the full card is used when its corner is clear, the compact row
//     when only that fits, and otherwise it waits until the visitor scrolls them
//     out of the way (chooseVariant). On the tool pages (analyzer, best-ai) a
//     card that opened by itself collapses to the pill as soon as the visitor
//     starts typing, so it never sits on the results;
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
  /** Epoch ms of the last dock-bar dismissal (v1.7.0–v1.8.6; the bar is gone, old marks still count). */
  dockDismissedAt: number;
  /** Epoch ms the modal was last shown (shown counts as seen: closing it adds nothing). */
  modalShownAt: number;
  /** v1.8.1 — epoch ms the card last opened by itself (0 = never). Informative since v1.8.7. */
  cardShownAt: number;
  /** v1.8.7 — epoch ms the visitor closed the card (0 = never): it does not open by itself for DISMISS_DAYS. */
  cardDismissedAt: number;
};

export const EMPTY_STATE: NudgeState = { subscribed: false, pillDismissedAt: 0, dockDismissedAt: 0, modalShownAt: 0, cardShownAt: 0, cardDismissedAt: 0 };

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
      cardDismissedAt: num(o.cardDismissedAt),
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
 * v1.8.7 — may the card open BY ITSELF? Yes for any visitor who has not said
 * "no" in the last DISMISS_DAYS: not subscribed, and no card closed, pill closed,
 * dock closed or modal shown in that window. (v1.8.1 allowed it only on a first
 * visit, so it was seen once per browser and then never again.)
 */
export function cardEligible(state: NudgeState, now: number): boolean {
  if (state.subscribed) return false;
  return ![state.cardDismissedAt, state.pillDismissedAt, state.dockDismissedAt, state.modalShownAt].some((t) => within(t, now, DISMISS_DAYS));
}

/**
 * v1.8.1 — the one stacking rule of the floating surface (card or pill).
 *   - never together with the AI Daily modal;
 *   - never while an in-page subscription form is on screen (unless the visitor
 *     opened the card themselves and is using it: do not pull it from under them);
 *   - steps aside for typing / the soft keyboard and (v1.8.7) whenever a control
 *     it must not cover is under it — the footer's links, a text box, a primary
 *     button — again unless the visitor opened it themselves.
 */
export function floatingVisible(i: {
  wanted: boolean;
  modalOpen: boolean;
  inlineFormVisible: boolean;
  /** v1.8.7: a control it must not cover (text box, primary button, footer link) is under it. */
  inTheWay: boolean;
  typing: boolean;
  /** The card is open because the visitor asked for it (clicked the pill / expanded it). */
  userOpened: boolean;
}): boolean {
  if (!i.wanted || i.modalOpen) return false;
  if (i.userOpened) return true;
  return !i.inlineFormVisible && !i.inTheWay && !i.typing;
}

// ---------------------------------------------------------------------------
// Geometry (v1.8.1): where the floating surface sits, to step aside precisely
// ---------------------------------------------------------------------------

export type Box = { left: number; top: number; right: number; bottom: number };

/** Approximate footprints (CSS px) of the floating surface in each state, margin included. */
export const FLOATING_SIZES = {
  pill: { width: 250, height: 68 },
  card: { width: 380, height: 330 },
  /** The one-row card; on phones it spans the viewport width (the helper clamps it). */
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

export type CardVariant = "full" | "compact";

/**
 * v1.8.7 — which card opens by itself, given what is on screen right now.
 * `obstacles` are the boxes the card must never cover: text boxes, primary
 * buttons, the footer's links (and, on the tool pages, every control).
 *   full     desktop/tablet when its corner is clear;
 *   compact  the one-row version (title + "Subscribe" + close, expands on tap):
 *            always on phones, and on wider screens when only it fits (e.g. the
 *            home page at 1440x900, where the full card would touch the prompt
 *            box's button);
 *   null     nothing fits without covering a control: wait (the controller
 *            asks again when the page scrolls or changes).
 */
export function chooseVariant(viewportWidth: number, viewportHeight: number, obstacles: Box[]): CardVariant | null {
  const order: CardVariant[] = viewportWidth <= CARD_COMPACT_MAX_WIDTH ? ["compact"] : ["full", "compact"];
  for (const v of order) {
    if (cornerClear(viewportWidth, viewportHeight, v === "full" ? FLOATING_SIZES.card : FLOATING_SIZES.compact, obstacles)) return v;
  }
  return null;
}

/** True when a box of `size` in the bottom-right corner is clear of every obstacle. */
export function cornerClear(viewportWidth: number, viewportHeight: number, size: { width: number; height: number }, obstacles: Box[]): boolean {
  const box = floatingBox(viewportWidth, viewportHeight, size.width, size.height);
  return !obstacles.some((o) => rectsOverlap(o, box));
}

/**
 * CSS selector of the elements a floating surface must never cover (queried by
 * the controller): text boxes, primary buttons and the footer's controls
 * everywhere; every control on the tool pages and on phones (where the compact
 * row spans the whole width of the screen).
 */
export function obstacleSelector(strict: boolean): string {
  const always = [
    "footer a",
    "footer button",
    "footer input",
    "footer select",
    "main textarea",
    'main input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"])',
    "main select",
    "main .btn-primary",
    'main button[type="submit"]',
    "[data-floating-avoid]",
  ];
  return (strict ? [...always, "main button", "main a.btn", 'main [role="tab"]'] : always).join(", ");
}

export function modalEligible(state: NudgeState, now: number, shownThisSession: boolean): boolean {
  // v1.8.7: the card and the modal share one pause after a "no".
  return !state.subscribed && !shownThisSession && !within(state.modalShownAt, now, MODAL_COOLDOWN_DAYS) && !within(state.cardDismissedAt, now, DISMISS_DAYS);
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

export type RouteKind = "daily" | "public" | "none";

/** `/{any locale}/{segment}` and whatever is under it. */
const LOCALE_ROUTE = (segment: string) => new RegExp(`^/(${LANGS.join("|")})/${segment}(/|$)`);

/**
 * AI Daily pages ("daily") carry the card/pill, the desktop dock and the exit
 * modal; every other public page ("public") the card/pill; newsletter
 * management pages carry nothing (they are about the newsletter).
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
