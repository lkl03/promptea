// v1.8.7 — the per-model view of the benchmarks (lib/benchmarks/model.ts): the
// model index, the comparison, cost per point, the frontier leaders and the
// shareable hash. Built from a small snapshot through the real normalizer, so
// the numbers are exactly the ones the tables show.

import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildSnapshot, formatScore } from "@/lib/benchmarks/normalize";
import { compactTables, expandTables } from "@/lib/benchmarks/compact";
import {
  beatsShare,
  buildBenchHash,
  buildModelIndex,
  compareModels,
  costPerPoint,
  frontierLeaders,
  MAX_COMPARE,
  modelProfile,
  parseBenchHash,
  preferredName,
} from "@/lib/benchmarks/model";
import { devFixtureSnapshot } from "@/lib/benchmarks/dev-fixture";
import { MODEL_COPY } from "@/lib/benchmarks/modelCopy";
import { LANGS } from "@/lib/domain";

const AA = (slug: string, name: string, intelligence: number | null, coding: number | null, price: [string, string] | null) => ({
  source: "artificial-analysis",
  model_permaslug: slug,
  display_name: name,
  intelligence_index: intelligence,
  coding_index: coding,
  agentic_index: null,
  pricing: price ? { prompt: price[0], completion: price[1] } : null,
});
const GPQA = (slug: string, name: string, accuracy: number) => ({
  source: "openrouter",
  model_permaslug: slug,
  display_name: name,
  benchmark_type: "gpqa_diamond",
  accuracy,
  accuracy_stddev: 0.02,
  avg_cost_per_task: null,
  total_tasks: 198,
});
const DA = (slug: string, name: string, elo: number) => ({ source: "design-arena", model_permaslug: slug, display_name: name, arena: "models", category: "website", elo, win_rate: 0.5, avg_generation_time_ms: null, pricing: null });

const snap = buildSnapshot(
  {
    data: [
      AA("acme/a-1", "Acme A1 (Max, Default Fallback)", 70, 60, ["0.000002", "0.000008"]),
      AA("beta/b-1", "Beta B1", 65, 70, ["0.0000005", "0.000002"]),
      AA("gamma/g-1", "Gamma G1", 65, null, null),
      AA("delta/d-1", "Delta D1", 40, 30, ["0.0000001", "0.0000004"]),
      GPQA("acme/a-1", "Acme A1", 0.81),
      GPQA("beta/b-1", "Beta B1", 0.74),
      DA("acme/a-1", "Acme A1", 1300),
      DA("zeta/z-1", "Zeta Z1", 1250),
    ],
    meta: { as_of: "2026-11-14T00:00:00Z" },
  },
  new Date("2026-11-14T05:00:00Z")
);
const index = buildModelIndex(snap.tables);

describe("model index", () => {
  test("every model in the snapshot has a profile, with every benchmark it appears in", () => {
    expect([...index.keys()].sort()).toEqual(["acme/a-1", "beta/b-1", "delta/d-1", "gamma/g-1", "zeta/z-1"]);
    const a = index.get("acme/a-1")!;
    expect(a.scores.map((s) => s.key)).toEqual(["aa:intelligence", "aa:coding", "or:gpqa_diamond", "da:models:website"]);
  });

  test("the numbers are the tables' numbers: same value, same rank, same metric", () => {
    for (const t of snap.tables) {
      for (const r of t.rows) {
        const s = index.get(r.modelId)!.scores.find((x) => x.key === t.def.key)!;
        expect(s.value).toBe(r.value);
        expect(s.rank).toBe(r.rank);
        expect(s.total).toBe(t.rows.length);
        expect(s.def.metric).toBe(t.def.metric);
      }
    }
    // Shown in its own metric: GPQA as a percentage, the index as a number, the arena as Elo.
    const a = index.get("acme/a-1")!;
    const gpqa = a.scores.find((s) => s.key === "or:gpqa_diamond")!;
    expect(gpqa.display).toBeCloseTo(81);
    expect(formatScore(gpqa.value, gpqa.def.metric, "en")).toBe("81.0%");
  });

  test("not measured is absent, never zero; no price is null, never free", () => {
    const g = index.get("gamma/g-1")!;
    expect(g.scores.find((s) => s.key === "aa:coding")).toBeUndefined();
    expect(g.price).toBeNull();
    expect(index.get("zeta/z-1")!.price).toBeNull();
  });

  test("ties share a rank and the same position share", () => {
    const b = index.get("beta/b-1")!.scores.find((s) => s.key === "aa:intelligence")!;
    const g = index.get("gamma/g-1")!.scores.find((s) => s.key === "aa:intelligence")!;
    expect([b.rank, g.rank]).toEqual([2, 2]);
    expect(b.beats).toBe(g.beats);
    expect(beatsShare(1, 4, 0)).toBe(1);
    expect(beatsShare(4, 4, 3)).toBe(0);
    expect(beatsShare(1, 1, 0)).toBe(1);
  });

  test("frontier qualifiers and strengths come from positions, not from mixing metrics", () => {
    const a = index.get("acme/a-1")!;
    expect(a.frontier.map((f) => [f.key, f.rank])).toEqual([
      ["aa:intelligence", 1],
      ["or:gpqa_diamond", 1],
      ["aa:coding", 2],
    ]);
    // The design arena is not a frontier benchmark, but a first place there is a strength.
    expect(a.strengths.map((s) => s.key)).toContain("da:models:website");
    expect(index.get("zeta/z-1")!.frontier).toEqual([]);
  });

  test("the cleanest name the sources use is shown", () => {
    expect(index.get("acme/a-1")!.name).toBe("Acme A1");
    expect(preferredName(["X (Max)", "X (High)"])).toBe("X (Max)");
    expect(preferredName([])).toBe("");
  });

  test("Promptea's family page is linked when the provider has one", () => {
    const fixture = devFixtureSnapshot(new Date("2026-11-14T00:00:00Z"));
    const idx = buildModelIndex(fixture.tables);
    expect([...idx.values()].every((m) => m.promptea === null)).toBe(true); // fictitious labs
    const real = buildModelIndex(buildSnapshot({ data: [AA("anthropic/claude-x", "Claude X", 60, null, null)] }, new Date()).tables);
    expect(real.get("anthropic/claude-x")!.promptea).toEqual({ modelPage: "claude", target: "claude" });
  });

  test("the client (compact wire format) builds the same profiles as the server", () => {
    const fromWire = buildModelIndex(expandTables(compactTables(snap.tables)));
    for (const [id, p] of index) {
      const q = fromWire.get(id)!;
      expect(q.scores.map((s) => [s.key, s.value, s.rank])).toEqual(p.scores.map((s) => [s.key, s.value, s.rank]));
      expect(q.price).toEqual(p.price);
    }
  });

  test("modelProfile returns null for an unknown id", () => {
    expect(modelProfile(snap.tables, "nobody/none")).toBeNull();
  });
});

describe("comparison", () => {
  test("benchmarks every model shares come first; the rest say who is not measured", () => {
    const c = compareModels(index, ["acme/a-1", "beta/b-1"]);
    expect(c.common).toEqual(["aa:intelligence", "aa:coding", "or:gpqa_diamond"]);
    const website = c.rows.find((r) => r.key === "da:models:website")!;
    expect(website.common).toBe(false);
    expect(website.cells[1]).toBeNull();
    // Best per row, by that benchmark's own value.
    expect(c.rows.find((r) => r.key === "aa:coding")!.best).toBe(1);
    expect(c.rows.find((r) => r.key === "aa:intelligence")!.best).toBe(0);
  });

  test("no shared benchmark: the comparison says so (common is empty)", () => {
    const c = compareModels(index, ["zeta/z-1", "delta/d-1"]);
    expect(c.common).toEqual([]);
    expect(c.rows.every((r) => !r.common)).toBe(true);
  });

  test("at most four distinct, known models", () => {
    const c = compareModels(index, ["acme/a-1", "acme/a-1", "nobody/x", "beta/b-1", "gamma/g-1", "delta/d-1", "zeta/z-1"]);
    expect(MAX_COMPARE).toBe(4);
    expect(c.models.map((m) => m.modelId)).toEqual(["acme/a-1", "beta/b-1", "gamma/g-1", "delta/d-1"]);
  });

  test("cost per point uses the calculator's chat workload and needs both prices", () => {
    const a = index.get("acme/a-1")!;
    // 1,000 requests × (1,000 × $2/M + 500 × $8/M) = $6.00, over 70 points.
    expect(costPerPoint(a, "aa:intelligence")).toBeCloseTo(6 / 70, 6);
    expect(costPerPoint(index.get("gamma/g-1")!, "aa:intelligence")).toBeNull();
    expect(costPerPoint(a, "or:search_hle")).toBeNull();
  });
});

describe("frontier leaders", () => {
  test("the top of the Intelligence Index, in order, with their score", () => {
    const f = frontierLeaders(snap.tables, index, 3);
    expect(f.key).toBe("aa:intelligence");
    expect(f.models.map((m) => [m.profile.modelId, m.score.rank])).toEqual([
      ["acme/a-1", 1],
      ["beta/b-1", 2],
      ["gamma/g-1", 2],
    ]);
  });

  test("without the index it falls back to the first frontier benchmark; nothing → empty", () => {
    const only = snap.tables.filter((t) => t.def.key === "or:gpqa_diamond");
    expect(frontierLeaders(only, buildModelIndex(only)).key).toBe("or:gpqa_diamond");
    expect(frontierLeaders([], new Map()).models).toEqual([]);
  });
});

describe("shareable state in the hash", () => {
  test("round trip of benchmark, model and comparison", () => {
    const h = buildBenchHash({ b: "aa:coding", m: "anthropic/claude-fable-5.2-20261109", c: ["a/b", "c/d"] });
    expect(h).toBe("#b=aa%3Acoding&m=anthropic%2Fclaude-fable-5.2-20261109&c=a%2Fb,c%2Fd");
    expect(parseBenchHash(h)).toEqual({ b: "aa:coding", m: "anthropic/claude-fable-5.2-20261109", c: ["a/b", "c/d"] });
  });

  test("v1.7.0 links (#b=…) keep working; junk is ignored", () => {
    expect(parseBenchHash("#b=aa:coding")).toEqual({ b: "aa:coding", m: null, c: [] });
    expect(parseBenchHash("#m=%E0%A4%A&x=1&=y&c=a,a,b,c,d,e")).toEqual({ b: null, m: null, c: ["a", "b", "c", "d"] });
    expect(buildBenchHash({})).toBe("");
  });
});

describe("the panel and the comparison: UI contract", () => {
  const read = (...p: string[]) => readFileSync(join(process.cwd(), ...p), "utf8");
  const dialog = read("components", "benchmarks", "BenchDialog.tsx");
  const panel = read("components", "benchmarks", "ModelPanel.tsx");
  const compare = read("components", "benchmarks", "CompareView.tsx");
  const dashboard = read("components", "benchmarks", "BenchmarkDashboard.tsx");

  test("every language has every string, with the same placeholders", () => {
    const flat = (o: object, pre = ""): Record<string, string> =>
      Object.entries(o).reduce((acc, [k, v]) => (typeof v === "object" ? { ...acc, ...flat(v, `${pre}${k}.`) } : { ...acc, [`${pre}${k}`]: String(v) }), {} as Record<string, string>);
    const base = flat(MODEL_COPY.en);
    for (const lang of LANGS) {
      const f = flat(MODEL_COPY[lang]);
      expect(Object.keys(f).sort(), lang).toEqual(Object.keys(base).sort());
      for (const [k, v] of Object.entries(base)) {
        expect((f[k].match(/\{\w+\}/g) ?? []).sort(), `${lang}.${k}`).toEqual((v.match(/\{\w+\}/g) ?? []).sort());
        expect(f[k].trim().length, `${lang}.${k}`).toBeGreaterThan(0);
      }
    }
  });

  test("the dialog is a real modal: aria-modal, focus trap, Esc, focus moved in, no page scroll", () => {
    expect(dialog).toMatch(/role="dialog"/);
    expect(dialog).toMatch(/aria-modal="true"/);
    expect(dialog).toMatch(/useFocusTrap\(ref, open\)/);
    expect(dialog).toMatch(/e\.key === "Escape"/);
    expect(dialog).toMatch(/\[data-autofocus\]/);
    expect(dialog).toMatch(/document\.body\.style\.overflow = "hidden"/);
    expect(dialog).toMatch(/<Portal>/);
  });

  test("the positions chart is an image with a text description AND an equivalent table", () => {
    expect(panel).toMatch(/role="img" aria-label=\{copy\.positionsTitle\} aria-describedby=/);
    expect(panel).toMatch(/<table/);
    expect(panel).toMatch(/<caption className="sr-only">\{copy\.positionsTitle\}<\/caption>/);
  });

  test("the comparison says so when the models share no benchmark, and never invents a value", () => {
    expect(compare).toMatch(/shared\.length === 0 \?/);
    expect(compare).toMatch(/copy\.noCommon/);
    expect(compare).toMatch(/aria-label=\{copy\.notMeasured\}/);
  });

  test("the view is shareable: #m opens the panel on load, #c restores the comparison, #b still works", () => {
    expect(dashboard).toMatch(/parseBenchHash\(window\.location\.hash\)/);
    expect(dashboard).toMatch(/if \(h\.m && index\.has\(h\.m\)\) setModelId\(h\.m\)/);
    expect(dashboard).toMatch(/addEventListener\("hashchange"/);
    // Never a history write inside a state updater (it updates Next's router during render).
    expect(dashboard).not.toMatch(/setCompareIds\(\(prev\)/);
  });
});
