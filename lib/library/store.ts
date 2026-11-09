// lib/library/store.ts
//
// v1.8.0 — the local-first prompt library: recent analyses kept ONLY in this
// browser's localStorage. No accounts, no sync, no server: a saved prompt never
// leaves the device because it is in the library. Pure functions over an
// injected Storage so every rule is tested; the React side
// (components/library/*) only wires them to the UI.
//
// Limits keep the footprint predictable (a few hundred KB, far under the ~5 MB
// quota): MAX_ENTRIES recent analyses (favourites are never pruned, up to
// MAX_FAVORITES) and MAX_TEXT characters per prompt. Every storage access is
// try/catch — blocked storage means an empty library, never an exception.

export const LIBRARY_KEY = "promptea:library:v1";
export const MAX_ENTRIES = 60;
export const MAX_FAVORITES = 60;
export const MAX_TEXT = 12_000;

export type Breakdown = { clarity: number; context: number; constraints: number; output: number; verifiability: number; safety: number };

export type LibraryEntry = {
  id: string;
  /** Epoch ms of the (latest) analysis. */
  createdAt: number;
  lang: "es" | "en";
  purpose: string;
  target: string;
  /** First words of the original prompt (derived, kept so lists stay cheap). */
  title: string;
  original: string;
  optimized: string;
  score: number;
  /** v1.8.0 engine: score of the optimized prompt. Absent on older payloads — never computed client-side. */
  optimizedScore?: number;
  breakdown?: Breakdown;
  optimizedBreakdown?: Breakdown;
  favorite: boolean;
};

export type LibraryState = { entries: LibraryEntry[]; autoSave: boolean };

export const EMPTY_LIBRARY: LibraryState = { entries: [], autoSave: true };

export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const clampScore = (n: unknown): number => (typeof n === "number" && Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : 0);
const optScore = (n: unknown): number | undefined => (typeof n === "number" && Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : undefined);
const str = (v: unknown, max = MAX_TEXT): string => (typeof v === "string" ? v.slice(0, max) : "");

function parseBreakdown(v: unknown): Breakdown | undefined {
  if (!v || typeof v !== "object") return undefined;
  const o = v as Record<string, unknown>;
  const keys = ["clarity", "context", "constraints", "output", "verifiability", "safety"] as const;
  if (!keys.every((k) => typeof o[k] === "number" && Number.isFinite(o[k] as number))) return undefined;
  return Object.fromEntries(keys.map((k) => [k, clampScore(o[k])])) as Breakdown;
}

export function makeTitle(original: string): string {
  const oneLine = original.replace(/\s+/g, " ").trim();
  return oneLine.length > 70 ? `${oneLine.slice(0, 67)}…` : oneLine;
}

function parseEntry(raw: unknown): LibraryEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const original = str(o.original);
  if (!original.trim() || typeof o.id !== "string" || !o.id) return null;
  return {
    id: o.id.slice(0, 64),
    createdAt: typeof o.createdAt === "number" && Number.isFinite(o.createdAt) ? o.createdAt : 0,
    lang: o.lang === "en" ? "en" : "es",
    purpose: str(o.purpose, 24),
    target: str(o.target, 24),
    title: makeTitle(original),
    original,
    optimized: str(o.optimized),
    score: clampScore(o.score),
    optimizedScore: optScore(o.optimizedScore),
    breakdown: parseBreakdown(o.breakdown),
    optimizedBreakdown: parseBreakdown(o.optimizedBreakdown),
    favorite: o.favorite === true,
  };
}

export function parseLibrary(raw: string | null): LibraryState {
  if (!raw) return { entries: [], autoSave: true };
  try {
    const o = JSON.parse(raw) as { entries?: unknown; autoSave?: unknown };
    const entries = Array.isArray(o.entries) ? o.entries.map(parseEntry).filter((e): e is LibraryEntry => e !== null) : [];
    return { entries: sortEntries(entries), autoSave: o.autoSave !== false };
  } catch {
    return { entries: [], autoSave: true };
  }
}

export function loadLibrary(storage: StorageLike | null): LibraryState {
  try {
    return parseLibrary(storage?.getItem(LIBRARY_KEY) ?? null);
  } catch {
    return { entries: [], autoSave: true };
  }
}

/** False when the write failed (quota, blocked): the caller can tell the user. */
export function saveLibrary(storage: StorageLike | null, state: LibraryState): boolean {
  try {
    if (!storage) return false;
    storage.setItem(LIBRARY_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function sortEntries(entries: LibraryEntry[]): LibraryEntry[] {
  return [...entries].sort((a, b) => b.createdAt - a.createdAt || a.id.localeCompare(b.id));
}

/** Keep every favourite (up to MAX_FAVORITES) plus the newest others up to MAX_ENTRIES in total. */
export function prune(entries: LibraryEntry[]): LibraryEntry[] {
  const sorted = sortEntries(entries);
  const favs = sorted.filter((e) => e.favorite).slice(0, MAX_FAVORITES);
  const room = Math.max(0, MAX_ENTRIES - favs.length);
  const rest = sorted.filter((e) => !e.favorite).slice(0, room);
  return sortEntries([...favs, ...rest]);
}

export type NewAnalysis = {
  lang: "es" | "en";
  purpose: string;
  target: string;
  original: string;
  optimized: string;
  score: number;
  optimizedScore?: number;
  breakdown?: Breakdown;
  optimizedBreakdown?: Breakdown;
};

/**
 * Add an analysis. The same prompt (same text, purpose and target) analysed
 * again REPLACES its previous entry (keeping the favourite flag), so re-running
 * a prompt does not clutter the list.
 */
export function addAnalysis(entries: LibraryEntry[], a: NewAnalysis, now: number, id: string): LibraryEntry[] {
  const original = a.original.slice(0, MAX_TEXT);
  if (!original.trim()) return entries;
  const prev = entries.find((e) => e.original === original && e.purpose === a.purpose && e.target === a.target);
  const entry: LibraryEntry = {
    id: prev?.id ?? id,
    createdAt: now,
    lang: a.lang,
    purpose: a.purpose,
    target: a.target,
    title: makeTitle(original),
    original,
    optimized: a.optimized.slice(0, MAX_TEXT),
    score: clampScore(a.score),
    optimizedScore: optScore(a.optimizedScore),
    breakdown: a.breakdown ? parseBreakdown(a.breakdown) : undefined,
    optimizedBreakdown: a.optimizedBreakdown ? parseBreakdown(a.optimizedBreakdown) : undefined,
    favorite: prev?.favorite ?? false,
  };
  return prune([entry, ...entries.filter((e) => e.id !== entry.id)]);
}

export function toggleFavorite(entries: LibraryEntry[], id: string): LibraryEntry[] {
  return prune(entries.map((e) => (e.id === id ? { ...e, favorite: !e.favorite } : e)));
}

export function removeEntry(entries: LibraryEntry[], id: string): LibraryEntry[] {
  return entries.filter((e) => e.id !== id);
}

/** Case- and accent-insensitive search over the prompts, purpose and target. */
export function searchEntries(entries: LibraryEntry[], query: string, opts: { favoritesOnly?: boolean } = {}): LibraryEntry[] {
  const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const q = fold(query.trim());
  return entries.filter((e) => {
    if (opts.favoritesOnly && !e.favorite) return false;
    if (!q) return true;
    return fold(`${e.original}\n${e.optimized}\n${e.purpose} ${e.target}`).includes(q);
  });
}

/** before → after, only from numbers the engine returned (never computed here). */
export function scoreDelta(e: Pick<LibraryEntry, "score" | "optimizedScore">): { before: number; after: number; delta: number } | null {
  if (e.optimizedScore === undefined) return null;
  return { before: e.score, after: e.optimizedScore, delta: e.optimizedScore - e.score };
}
