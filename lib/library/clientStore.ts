"use client";

// lib/library/clientStore.ts
//
// v1.8.0 — browser binding of the prompt library (lib/library/store.ts): one
// in-memory copy hydrated from localStorage, exposed as an external store for
// useSyncExternalStore, so the results panel (which saves) and the library
// page (which lists) always agree — even across tabs (storage event).

import { EMPTY_LIBRARY, addAnalysis, loadLibrary, removeEntry, saveLibrary, toggleFavorite, LIBRARY_KEY, type LibraryState, type NewAnalysis } from "./store";

const SERVER: LibraryState & { hydrated: boolean; saveFailed: boolean } = { ...EMPTY_LIBRARY, hydrated: false, saveFailed: false };

let snapshot = SERVER;
let started = false;
const listeners = new Set<() => void>();

function local(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function emit() {
  for (const l of listeners) l();
}

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  snapshot = { ...loadLibrary(local()), hydrated: true, saveFailed: false };
  window.addEventListener("storage", (e) => {
    if (e.key === LIBRARY_KEY || e.key === null) {
      snapshot = { ...loadLibrary(local()), hydrated: true, saveFailed: false };
      emit();
    }
  });
}

function commit(next: LibraryState) {
  const ok = saveLibrary(local(), next);
  snapshot = { ...next, hydrated: true, saveFailed: !ok };
  emit();
}

export function subscribeLibrary(cb: () => void): () => void {
  start();
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
export function getLibrarySnapshot() {
  start();
  return snapshot;
}
export function getLibraryServerSnapshot() {
  return SERVER;
}

export const libraryActions = {
  /** Saves one analysis when auto-save is on. Returns whether it was stored. */
  saveAnalysis(a: NewAnalysis): boolean {
    start();
    if (!snapshot.autoSave) return false;
    commit({ entries: addAnalysis(snapshot.entries, a, Date.now(), crypto.randomUUID()), autoSave: snapshot.autoSave });
    return !snapshot.saveFailed;
  },
  toggleFavorite(id: string) {
    start();
    commit({ ...snapshot, entries: toggleFavorite(snapshot.entries, id) });
  },
  remove(id: string) {
    start();
    commit({ ...snapshot, entries: removeEntry(snapshot.entries, id) });
  },
  clearAll() {
    start();
    commit({ ...snapshot, entries: [] });
  },
  setAutoSave(on: boolean) {
    start();
    commit({ ...snapshot, autoSave: on });
  },
};
