import { describe, expect, test } from "vitest";
import { analyzePrompt } from "@/lib/analyzePrompt";
import { loadDatasetCases } from "@/lib/engine/dataset/load";

function norm(s: string) {
  return (s ?? "").replace(/\r\n/g, "\n").trim();
}

function lower(s: string) {
  return String(s ?? "").toLowerCase();
}

describe("Dataset calibration", () => {
  const cases = loadDatasetCases();

  test("dataset debe tener casos", () => {
    expect(cases.length).toBeGreaterThan(0);
  });

  for (const c of cases) {
    test(`${c.id}`, () => {
      const r = analyzePrompt(c.prompt, c.target, c.lang);

      // score range
      expect(r.score).toBeGreaterThanOrEqual(c.expect.scoreRange[0]);
      expect(r.score).toBeLessThanOrEqual(c.expect.scoreRange[1]);

      // confidence
      if (typeof c.expect.confidenceMin === "number") {
        expect(Number(r.meta?.confidence ?? 0)).toBeGreaterThanOrEqual(c.expect.confidenceMin);
      }

      const findingIds = (r.findings ?? []).map((f: any) => f.id);
      const recIds = (r.recommendations ?? []).map((x: any) => x.id).filter(Boolean);
      const recBlob = (r.recommendations ?? [])
        .map((x: any) => `${x.title ?? ""}\n${x.detail ?? ""}`)
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
});

