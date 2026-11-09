// lib/newsletter/prompts.ts
//
// v1.8.0 — the rules of the newsletter prompts, as pure functions (no React,
// no DOM, storage injected) so every rule is tested exactly. There are three
// surfaces and ONE controller (components/newsletter/NewsletterNudges.tsx):
//
//   pill   a small fixed pill, bottom-right, that opens a mini form. Public
//          pages EXCEPT AI Daily (the dock already lives there).
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
//   - storage failures (private mode, blocked) degrade to "session only", never throw.

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
};

export const EMPTY_STATE: NudgeState = { subscribed: false, pillDismissedAt: 0, dockDismissedAt: 0, modalShownAt: 0 };

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

/**
 * AI Daily pages carry the dock + modal; every other public page carries the
 * pill; newsletter management pages carry nothing (they are about the newsletter).
 */
export function routeKind(pathname: string): RouteKind {
  const p = pathname.replace(/\/+$/, "");
  if (/^\/(es|en)\/(weekly|unsubscribe)(\/|$)/.test(p) || /^\/api\//.test(p)) return "none";
  if (/^\/(es|en)\/blog(\/|$)/.test(p)) return "daily";
  return "public";
}

/** Tool pages where a fixed element must stay small on phones (text boxes, results). */
export function isToolRoute(pathname: string): boolean {
  return /^\/(es|en)\/(analyzer|best-ai)(\/|$)/.test(pathname.replace(/\/+$/, ""));
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
