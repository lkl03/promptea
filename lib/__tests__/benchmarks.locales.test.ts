// v1.8.2 — benchmarks in every language, in every data state.
//
// Regression: the Vercel build of PR #38 failed prerendering /md/pt/benchmarks
// with "Cannot read properties of undefined (reading 'replace')". That
// deployment has the database but not the upstream key, so it showed the last
// snapshot stored in Firestore — saved before Portuguese existed, with the
// benchmark texts copied in Spanish and English only. `def.measures.pt` was
// undefined. A local build (no database) never loads a stored snapshot, which
// is why it passed.
//
// These tests build every benchmarks surface for the three languages in the
// three states a deployment can be in: live data, a LEGACY stored snapshot
// (stale), and no data at all.

import { describe, expect, test } from "vitest";
import { makeSnapshot } from "./seo.fixtures";
import { loadBenchmarks, rehydrateSnapshot, type SnapshotStore } from "@/lib/benchmarks/load";
import type { BenchmarksSnapshot } from "@/lib/benchmarks/normalize";
import { compactTables } from "@/lib/benchmarks/compact";
import { LANGS, type Lang } from "@/lib/domain";
import { buildLlmsFullTxt, buildLlmsTxt } from "@/lib/seo/llms";
import { benchmarksMarkdown } from "@/lib/seo/markdown";
import { benchmarksGraph } from "@/lib/seo/pageGraphs";
import { absUrl } from "@/lib/seo/site";

/** A snapshot exactly as v1.8.1 persisted it: every text has `es` and `en` only. */
function legacySnapshot(): BenchmarksSnapshot {
  const snap = JSON.parse(JSON.stringify(makeSnapshot())) as BenchmarksSnapshot;
  for (const table of snap.tables) {
    for (const field of ["label", "metricLabel", "measures", "limitations"] as const) {
      const text = table.def[field] as Partial<Record<Lang, string>>;
      delete text.pt;
    }
  }
  return snap;
}

class MemStore implements SnapshotStore {
  constructor(private value: BenchmarksSnapshot | null) {}
  async read() {
    return this.value;
  }
  async write(s: BenchmarksSnapshot) {
    this.value = s;
  }
}

/** Every surface that renders benchmarks, for one language and one snapshot (or none). */
function surfaces(lang: Lang, snapshot: BenchmarksSnapshot | null): Record<string, string> {
  const input = { lang, articles: [], editions: [], benchmarks: snapshot };
  return {
    markdown: benchmarksMarkdown(snapshot, lang, absUrl(`/${lang}/benchmarks`), "2026-11-09"),
    llms: buildLlmsTxt(input),
    llmsFull: buildLlmsFullTxt(input),
    jsonLd: JSON.stringify(benchmarksGraph({ lang, title: "t", description: "d", snapshot })),
    client: JSON.stringify(snapshot ? compactTables(snapshot.tables) : []),
  };
}

const BROKEN = /undefined|\[object Object\]|\bNaN\b/;

describe("benchmarks: a snapshot stored before a language existed", () => {
  test("the legacy fixture really lacks Portuguese (it reproduces the bug)", () => {
    const def = legacySnapshot().tables[0].def as unknown as Record<string, Record<string, string>>;
    expect(def.measures.pt).toBeUndefined();
    expect(def.measures.en.length).toBeGreaterThan(0);
  });

  test("read back as it was stored, the Portuguese markdown twin throws (the build failure)", () => {
    expect(() => benchmarksMarkdown(legacySnapshot(), "pt", absUrl("/pt/benchmarks"), "2026-11-09")).toThrow(/replace/);
    expect(() => benchmarksMarkdown(legacySnapshot(), "es", absUrl("/es/benchmarks"), "2026-11-09")).not.toThrow();
  });

  test("rehydrateSnapshot() takes the texts from the catalog again, in every language", () => {
    const snap = rehydrateSnapshot(legacySnapshot());
    for (const table of snap.tables) {
      for (const lang of LANGS) {
        for (const field of ["label", "metricLabel", "measures", "limitations"] as const) {
          expect(table.def[field][lang], `${table.def.key}.${field}.${lang}`).toEqual(expect.any(String));
          expect(table.def[field][lang].length).toBeGreaterThan(0);
        }
      }
      // Portuguese is the catalog's translation, not the English text
      expect(table.def.measures.pt).not.toBe(table.def.measures.en);
    }
  });

  test("numbers, rows and dates are not touched", () => {
    const legacy = legacySnapshot();
    const snap = rehydrateSnapshot(legacy);
    expect(snap.asOf).toBe(legacy.asOf);
    expect(snap.fetchedAt).toBe(legacy.fetchedAt);
    expect(snap.tables.map((t) => t.rows)).toEqual(legacy.tables.map((t) => t.rows));
    expect(snap.tables.map((t) => t.def.key)).toEqual(legacy.tables.map((t) => t.def.key));
  });

  test("a benchmark the catalog no longer knows keeps its texts, with missing languages filled from English", () => {
    const legacy = legacySnapshot();
    legacy.tables[0].def.key = "retired:benchmark";
    const def = rehydrateSnapshot(legacy).tables[0].def;
    expect(def.label.pt).toBe(def.label.en);
    expect(def.measures.pt).toBe(def.measures.en);
    expect(def.measures.es).not.toBe("");
  });

  test("loadBenchmarks without the upstream key serves the stored snapshot rehydrated (the Vercel preview state)", async () => {
    const r = await loadBenchmarks({ apiKey: "", store: new MemStore(legacySnapshot()), log: () => {} });
    expect(r.status).toBe("stale");
    if (r.status !== "stale") return;
    expect(r.reason).toBe("not_configured");
    for (const lang of LANGS) expect(r.snapshot.tables[0].def.measures[lang]).toEqual(expect.any(String));
  });
});

describe("benchmarks: every surface, every language, every data state", () => {
  const states: Array<[string, () => Promise<BenchmarksSnapshot | null>]> = [
    ["live data", async () => makeSnapshot()],
    [
      "stale: legacy stored snapshot, no upstream key",
      async () => {
        const r = await loadBenchmarks({ apiKey: "", store: new MemStore(legacySnapshot()), log: () => {} });
        return r.status === "unavailable" ? null : r.snapshot;
      },
    ],
    [
      "unavailable: no key, no stored snapshot",
      async () => {
        const r = await loadBenchmarks({ apiKey: "", store: new MemStore(null), log: () => {} });
        return r.status === "unavailable" ? null : r.snapshot;
      },
    ],
  ];

  for (const [name, load] of states) {
    for (const lang of LANGS) {
      test(`${name} — ${lang}`, async () => {
        const snapshot = await load();
        let out: Record<string, string> = {};
        expect(() => {
          out = surfaces(lang, snapshot);
        }).not.toThrow();
        for (const [surface, text] of Object.entries(out)) {
          expect(text.match(BROKEN)?.[0] ?? null, `${surface}: ${text.slice(0, 200)}`).toBeNull();
        }
        expect(out.markdown.startsWith("# ")).toBe(true);
        if (snapshot) {
          // real rankings, never invented: the fixture's models and nothing claimed beyond them
          expect(out.markdown).toContain("Alpha 1");
          expect(out.jsonLd).toContain("Dataset");
        } else {
          // no data: says so, shows no ranking and claims no Dataset
          expect(out.markdown).not.toMatch(/^\d+\. /m);
          expect(out.jsonLd).not.toContain('"Dataset"');
          expect(out.client).toBe("[]");
        }
      });
    }
  }

  test("the empty state is written in each language", () => {
    expect(surfaces("pt", null).markdown).toMatch(/Os rankings não estão disponíveis agora/);
    expect(surfaces("es", null).markdown).toMatch(/Los rankings no están disponibles ahora/);
    expect(surfaces("en", null).markdown).toMatch(/The rankings are not available right now/);
  });
});
