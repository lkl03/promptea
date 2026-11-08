// v1.8.0 — local-first prompt library + shareable result card.

import { describe, expect, test } from "vitest";
import {
  LIBRARY_KEY,
  MAX_ENTRIES,
  MAX_TEXT,
  addAnalysis,
  loadLibrary,
  makeTitle,
  parseLibrary,
  prune,
  removeEntry,
  saveLibrary,
  scoreDelta,
  searchEntries,
  toggleFavorite,
  type LibraryEntry,
  type NewAnalysis,
} from "@/lib/library/store";
import { decodeCard, encodeCard, qualityBand } from "@/lib/share/card";

const analysis = (over: Partial<NewAnalysis> = {}): NewAnalysis => ({
  lang: "es",
  purpose: "code",
  target: "claude",
  original: "Escribí una función que ordene una lista",
  optimized: "TASK: write a sort function…",
  score: 42,
  optimizedScore: 78,
  ...over,
});

function memStorage(initial: Record<string, string> = {}) {
  const m = new Map(Object.entries(initial));
  return { m, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) };
}

describe("library store", () => {
  test("adds newest first and derives a short title", () => {
    let e: LibraryEntry[] = [];
    e = addAnalysis(e, analysis({ original: "primero" }), 1000, "a");
    e = addAnalysis(e, analysis({ original: "segundo" }), 2000, "b");
    expect(e.map((x) => x.id)).toEqual(["b", "a"]);
    expect(makeTitle("  una   consulta \n  larga ".repeat(10)).length).toBeLessThanOrEqual(70);
  });

  test("re-analysing the same prompt replaces its entry and keeps the favourite flag", () => {
    let e = addAnalysis([], analysis(), 1000, "a");
    e = toggleFavorite(e, "a");
    e = addAnalysis(e, analysis({ score: 50, optimizedScore: 85 }), 5000, "zzz");
    expect(e).toHaveLength(1);
    expect(e[0]).toMatchObject({ id: "a", createdAt: 5000, score: 50, optimizedScore: 85, favorite: true });
  });

  test("a different target or purpose is a different entry", () => {
    let e = addAnalysis([], analysis(), 1, "a");
    e = addAnalysis(e, analysis({ target: "gpt" }), 2, "b");
    expect(e).toHaveLength(2);
  });

  test("empty prompts are never saved; texts are capped", () => {
    expect(addAnalysis([], analysis({ original: "   " }), 1, "a")).toEqual([]);
    const big = addAnalysis([], analysis({ original: "x".repeat(MAX_TEXT + 500) }), 1, "a");
    expect(big[0].original).toHaveLength(MAX_TEXT);
  });

  test("pruning keeps favourites and the newest others, up to the limit", () => {
    let e: LibraryEntry[] = [];
    for (let i = 0; i < MAX_ENTRIES + 15; i++) e = addAnalysis(e, analysis({ original: `prompt ${i}` }), i + 1, `id${i}`);
    expect(e).toHaveLength(MAX_ENTRIES);
    expect(e[0].original).toBe(`prompt ${MAX_ENTRIES + 14}`);
    // The oldest is favourited late, then survives further pruning.
    const oldest = e[e.length - 1].id;
    e = toggleFavorite(e, oldest);
    for (let i = 0; i < 20; i++) e = addAnalysis(e, analysis({ original: `later ${i}` }), 10_000 + i, `l${i}`);
    expect(e.some((x) => x.id === oldest)).toBe(true);
    expect(e.length).toBeLessThanOrEqual(MAX_ENTRIES);
    expect(prune(e)).toHaveLength(e.length);
  });

  test("remove, and search is case- and accent-insensitive over prompt, result, purpose and target", () => {
    let e = addAnalysis([], analysis({ original: "Resumí este artículo sobre energía", purpose: "summarization" }), 1, "a");
    e = addAnalysis(e, analysis({ original: "Escribí un poema", purpose: "text", target: "gpt" }), 2, "b");
    expect(searchEntries(e, "ENERGIA").map((x) => x.id)).toEqual(["a"]);
    expect(searchEntries(e, "gpt").map((x) => x.id)).toEqual(["b"]);
    expect(searchEntries(e, "")).toHaveLength(2);
    e = toggleFavorite(e, "b");
    expect(searchEntries(e, "", { favoritesOnly: true }).map((x) => x.id)).toEqual(["b"]);
    expect(removeEntry(e, "a").map((x) => x.id)).toEqual(["b"]);
  });

  test("before → after only from engine numbers: absent optimizedScore means no after", () => {
    const withAfter = addAnalysis([], analysis(), 1, "a")[0];
    expect(scoreDelta(withAfter)).toEqual({ before: 42, after: 78, delta: 36 });
    const without = addAnalysis([], analysis({ optimizedScore: undefined }), 1, "b")[0];
    expect(without.optimizedScore).toBeUndefined();
    expect(scoreDelta(without)).toBeNull();
  });

  test("persistence round trip; blocked or corrupt storage never throws", () => {
    const st = memStorage();
    const state = { entries: addAnalysis([], analysis(), 1, "a"), autoSave: false };
    expect(saveLibrary(st, state)).toBe(true);
    expect(loadLibrary(st)).toEqual(state);
    expect(loadLibrary(null)).toEqual({ entries: [], autoSave: true });
    expect(loadLibrary(memStorage({ [LIBRARY_KEY]: "{broken" }))).toEqual({ entries: [], autoSave: true });
    const throwing = { getItem: () => { throw new Error("x"); }, setItem: () => { throw new Error("x"); }, removeItem: () => {} };
    expect(loadLibrary(throwing)).toEqual({ entries: [], autoSave: true });
    expect(saveLibrary(throwing, state)).toBe(false);
  });

  test("hostile stored data is sanitised entry by entry", () => {
    const raw = JSON.stringify({ entries: [{ id: "ok", original: "hola", score: 999, favorite: "yes" }, { id: "", original: "no id" }, null, { id: "x", original: "" }], autoSave: "maybe" });
    const s = parseLibrary(raw);
    expect(s.entries).toHaveLength(1);
    expect(s.entries[0]).toMatchObject({ id: "ok", score: 100, favorite: false });
    expect(s.autoSave).toBe(true);
  });
});

describe("share card", () => {
  const full = { score: 72, optimizedScore: 88, breakdown: { clarity: 80, context: 65, constraints: 40, output: 55, verifiability: 90, safety: 70 }, purpose: "code", target: "claude" };

  test("round trip", () => {
    const q = encodeCard(full);
    expect(q).toBe("s=72&o=88&b=80.65.40.55.90.70&p=code&t=claude");
    expect(decodeCard(new URLSearchParams(q))).toEqual({ score: 72, optimizedScore: 88, breakdown: [80, 65, 40, 55, 90, 70], purpose: "code", target: "claude" });
  });

  test("the prompt text can never enter the URL", () => {
    const q = encodeCard({ ...full, purpose: "Escribí mi contraseña", target: "x".repeat(50), ...({ original: "secret prompt" } as object) });
    expect(q).not.toMatch(/secret|contrase/i);
    expect(q).toBe("s=72&o=88&b=80.65.40.55.90.70");
  });

  test("strict decoding: out-of-range, malformed and unknown values are ignored", () => {
    expect(decodeCard(new URLSearchParams("s=101"))).toBeNull();
    expect(decodeCard(new URLSearchParams("s=abc"))).toBeNull();
    expect(decodeCard(new URLSearchParams("o=50"))).toBeNull();
    const d = decodeCard(new URLSearchParams("s=50&o=9999&b=1.2.3&p=<script>&t=nope&title=<b>hi</b>"))!;
    expect(d).toEqual({ score: 50, optimizedScore: null, breakdown: null, purpose: null, target: null });
  });

  test("works with Next searchParams objects too", () => {
    expect(decodeCard({ s: "33", b: ["1.2.3.4.5.6", "x"] })).toMatchObject({ score: 33, breakdown: [1, 2, 3, 4, 5, 6] });
  });

  test("encode clamps", () => {
    expect(encodeCard({ score: 140 })).toBe("s=100");
    expect(encodeCard({ score: -5, optimizedScore: NaN })).toBe("s=0");
  });

  test("quality bands match the in-app labels", () => {
    expect([10, 30, 31, 60, 61, 85, 86].map(qualityBand)).toEqual(["weak", "weak", "fair", "fair", "good", "good", "excellent"]);
  });
});
