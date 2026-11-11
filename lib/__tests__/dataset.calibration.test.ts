import { describe, expect, test } from "vitest";
import { analyzePrompt } from "@/lib/analyzePrompt";
import { loadDatasetCases } from "@/lib/engine/dataset/load";
import { LANGS, PURPOSES } from "@/lib/domain";

// v1.8.0: every expectation in the dataset is now enforced (findings and
// optimized-prompt checks used to be silently ignored), cases run under
// their declared purpose, and good/ambiguous/bad buckets must stay ordered.

describe("Dataset calibration", () => {
  const cases = loadDatasetCases();

  test("dataset debe tener casos", () => {
    expect(cases.length).toBeGreaterThan(0);
  });

  test("ids are unique", () => {
    const ids = cases.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("every purpose has good, bad and ambiguous cases in every language", () => {
    for (const lang of LANGS) {
      for (const purpose of PURPOSES) {
        const kinds = new Set(cases.filter((c) => c.lang === lang && c.purpose === purpose).map((c) => c.kind));
        expect([...kinds].sort(), `${lang}/${purpose}`).toEqual(["ambiguous", "bad", "good"]);
      }
    }
  });

  for (const c of cases) {
    test(`${c.id}`, () => {
      const r = analyzePrompt(c.prompt, c.target, c.lang, c.purpose ?? "text");
      const ctx = `${c.id}: score=${r.score} task=${r.meta.taskType} strategy=${r.meta.routing?.strategy} findings=${r.findings
        .map((f) => f.id)
        .join(",")}`;

      // score range
      if (c.expect.scoreRange) {
        expect(r.score, ctx).toBeGreaterThanOrEqual(c.expect.scoreRange[0]);
        expect(r.score, ctx).toBeLessThanOrEqual(c.expect.scoreRange[1]);
      }

      // confidence
      if (typeof c.expect.confidenceMin === "number") {
        expect(Number(r.meta?.confidence ?? 0), ctx).toBeGreaterThanOrEqual(c.expect.confidenceMin);
      }

      if (c.expect.taskType) expect(r.meta.taskType, ctx).toBe(c.expect.taskType);
      if (c.expect.strategy) expect(r.meta.routing?.strategy, ctx).toBe(c.expect.strategy);

      const findingIds = (r.findings ?? []).map((f) => f.id);
      for (const id of c.expect.mustHaveFindings ?? []) expect(findingIds, ctx).toContain(id);
      for (const id of c.expect.mustNotHaveFindings ?? []) expect(findingIds, ctx).not.toContain(id);

      for (const needle of c.expect.optimizedPromptMustContain ?? []) expect(r.optimizedPrompt, ctx).toContain(needle);
      for (const needle of c.expect.optimizedPromptMustNotContain ?? []) {
        expect(r.optimizedPrompt, ctx).not.toContain(needle);
      }

      if (typeof c.expect.optimizedScoreMin === "number") {
        expect(Number(r.meta.optimizedScore), ctx).toBeGreaterThanOrEqual(c.expect.optimizedScoreMin);
      }

      const recIds = (r.recommendations ?? []).map((x) => x.id).filter((id): id is string => Boolean(id));
      const recBlob = (r.recommendations ?? [])
        .map((x) => `${x.title ?? ""}\n${x.detail ?? ""}`)
        .join("\n")
        .toLowerCase();

      // ✅ 1) Recos por ID (lo pro)
      for (const id of c.expect.mustHaveRecommendations ?? []) {
        expect(recIds).toContain(id);
      }
      for (const id of c.expect.mustNotHaveRecommendations ?? []) {
        expect(recIds).not.toContain(id);
      }

      // ✅ 2) Fallback por texto, pero con “atajos semánticos” para no ser frágil
      for (const needle of c.expect.mustHaveRecommendationText ?? []) {
        const n = String(needle).toLowerCase();

        // Si el dataset pide "json", aceptamos que lo detecte en meta.outputFormat
        if (n === "json") {
          const ok =
            r.meta?.outputFormat?.kind === "json" ||
            recIds.some((id: string) => id.includes("json")) ||
            recBlob.includes("json");
          expect(ok).toBe(true);
          continue;
        }

        // Si el dataset pide "context"/"contexto", aceptamos finding o reco ID de contexto
        if (n === "context" || n === "contexto") {
          const ok =
            findingIds.includes("missing_context") ||
            recIds.includes("add_context") ||
            recBlob.includes("context") ||
            recBlob.includes("contexto");
          expect(ok).toBe(true);
          continue;
        }

        // default (substring)
        expect(recBlob).toContain(n);
      }
    });
  }

  test("within each (lang, purpose) group: good > ambiguous > bad", () => {
    const groups = new Map<string, Record<string, number>>();
    for (const c of cases) {
      if (!c.kind || !c.purpose) continue;
      const key = `${c.lang}/${c.purpose}`;
      const score = analyzePrompt(c.prompt, c.target, c.lang, c.purpose).score;
      groups.set(key, { ...(groups.get(key) ?? {}), [c.kind]: score });
    }
    for (const [key, s] of groups) {
      expect(s.good, `${key} good vs ambiguous`).toBeGreaterThan(s.ambiguous);
      expect(s.ambiguous, `${key} ambiguous vs bad`).toBeGreaterThan(s.bad);
    }
  });
});
