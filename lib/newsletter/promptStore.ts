"use client";

// lib/newsletter/promptStore.ts
//
// v1.8.0 — the single source of truth for newsletter prompt state in the
// browser: a tiny external store (useSyncExternalStore-compatible) backed by
// localStorage (persistent: subscribed, dismissals, modal cooldown) and
// sessionStorage (the modal's once-per-session flag). Every surface — the pill,
// the dock, the modal and every <SubscribeForm> — reads and writes through
// here, which is what keeps them from stacking or contradicting each other.
// All storage access is try/catch: when storage is blocked the state lives in
// memory for the page's lifetime and nothing throws.

import { EMPTY_STATE, SESSION_KEY, readState, writeState, type NudgeState } from "./prompts";

export type NudgeSnapshot = NudgeState & {
  /** The modal is on screen right now (never persisted). */
  modalOpen: boolean;
  /** The pill's mini form is open (never persisted). */
  pillFormOpen: boolean;
};

const SERVER_SNAPSHOT: NudgeSnapshot = { ...EMPTY_STATE, modalOpen: false, pillFormOpen: false };

let snapshot: NudgeSnapshot = SERVER_SNAPSHOT;
let hydrated = false;
let sessionModalShown = false;
const listeners = new Set<() => void>();

function local(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  snapshot = { ...snapshot, ...readState(local()) };
  try {
    sessionModalShown = window.sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    sessionModalShown = false;
  }
  // Another tab subscribed or dismissed: follow it.
  window.addEventListener("storage", (e) => {
    if (e.key === null || e.key.startsWith("promptea:newsletter-nudges")) {
      snapshot = { ...snapshot, ...readState(local()) };
      emit();
    }
  });
}

function emit() {
  for (const l of listeners) l();
}

function patch(next: Partial<NudgeSnapshot>, persist = true) {
  snapshot = { ...snapshot, ...next };
  if (persist) {
    const { subscribed, pillDismissedAt, dockDismissedAt, modalShownAt } = snapshot;
    writeState(local(), { subscribed, pillDismissedAt, dockDismissedAt, modalShownAt });
  }
  emit();
}

export function subscribeStore(cb: () => void): () => void {
  hydrate();
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function getSnapshot(): NudgeSnapshot {
  hydrate();
  return snapshot;
}

export function getServerSnapshot(): NudgeSnapshot {
  return SERVER_SNAPSHOT;
}

export function wasModalShownThisSession(): boolean {
  hydrate();
  return sessionModalShown;
}

export const nudgeActions = {
  /** Permanent: no surface is shown again on this browser. */
  markSubscribed() {
    hydrate();
    // Surfaces that are open keep showing their success message and close themselves.
    if (!snapshot.subscribed) patch({ subscribed: true });
  },
  dismissPill(now = Date.now()) {
    hydrate();
    patch({ pillDismissedAt: now, pillFormOpen: false });
  },
  dismissDock(now = Date.now()) {
    hydrate();
    patch({ dockDismissedAt: now });
  },
  /** Records that the modal was shown (session flag + cooldown) and opens it. */
  openModal(now = Date.now()) {
    hydrate();
    sessionModalShown = true;
    try {
      window.sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      /* memory only */
    }
    patch({ modalShownAt: now, modalOpen: true, pillFormOpen: false });
  },
  closeModal() {
    hydrate();
    patch({ modalOpen: false }, false);
  },
  setPillFormOpen(open: boolean) {
    hydrate();
    patch({ pillFormOpen: open }, false);
  },
};

/** Test hook: reset the module to a clean, un-hydrated state. */
export function __resetStoreForTests() {
  snapshot = SERVER_SNAPSHOT;
  hydrated = false;
  sessionModalShown = false;
  listeners.clear();
}
