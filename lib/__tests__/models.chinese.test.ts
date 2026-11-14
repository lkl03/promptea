// lib/__tests__/models.chinese.test.ts
//
// v1.8.6 — Qwen, GLM, MiniMax and Doubao: registry entries verified against the
// provider's own docs, a prompting profile per family, a model page and a guide.
import { describe, expect, it } from "vitest";
import { MODEL_REGISTRY, defaultModelIdForTarget } from "@/lib/models";
import { resolvePromptProfile } from "@/lib/engine/modelProfiles";
import { analyzePrompt } from "@/lib/engine";
import { getModelPage } from "@/lib/seo/content/models";
import { getGuide, guideLang } from "@/lib/seo/content/guides";
import { allStaticSeoUrls } from "@/lib/seo/registry";

const FAMILIES = [
  { target: "qwen", host: /^https:\/\/www\.alibabacloud\.com\//, def: "qwen3.8-max", profile: "qwen-general" },
  { target: "glm", host: /^https:\/\/docs\.z\.ai\//, def: "glm-5.3", profile: "glm-reasoner" },
  { target: "minimax", host: /^https:\/\/platform\.minimax\.io\//, def: "minimax-m3", profile: "minimax-agent" },
  { target: "doubao", host: /^https:\/\/docs\.volcengine\.com\//, def: "doubao-seed-2.1-pro", profile: "doubao-seed" },
] as const;

describe("Chinese model families", () => {
  for (const f of FAMILIES) {
    describe(f.target, () => {
      const entries = MODEL_REGISTRY.filter((m) => m.target === f.target);

      it("every entry cites the provider's own docs and the 2026-11-14 verification", () => {
        expect(entries.length).toBeGreaterThanOrEqual(2);
        for (const m of entries) {
          expect(m.sourceUrl, m.id).toMatch(f.host);
          expect(m.verifiedAt, m.id).toBe("2026-11-14");
          expect(m.apiModelId, m.id).toBeTruthy();
        }
      });

      it("has its default model and prompting profile", () => {
        expect(defaultModelIdForTarget(f.target)).toBe(f.def);
        expect(resolvePromptProfile(f.target, null).id).toBe(f.profile);
      });

      it("the analyzer optimizes a prompt for it", () => {
        const r = analyzePrompt("Summarize this report for our CFO in 5 bullets.", f.target, "en", "summarization");
        expect(r.optimizedPrompt.length).toBeGreaterThan(40);
      });

      it("has a model page and an English/Spanish guide, both in the sitemap index", () => {
        expect(getModelPage(f.target)).toBeDefined();
        const g = getGuide(`${f.target}-prompt-guide`);
        expect(g).toBeDefined();
        expect(guideLang(g!, "es")).toBe("es");
        expect(guideLang(g!, "pt")).toBe("en");
        const paths = allStaticSeoUrls().map((u) => u.path);
        expect(paths).toContain(`/en/models/${f.target}`);
        expect(paths).toContain(`/en/guides/${f.target}-prompt-guide`);
        expect(paths).not.toContain(`/pt/guides/${f.target}-prompt-guide`);
      });
    });
  }

  it("retired ids resolve to their current replacement", () => {
    for (const [legacy, current] of [["qwen3-max", "qwen3.8-max"], ["minimax-m2.7", "minimax-m3"], ["doubao-seed-1.6", "doubao-seed-2.1-pro"]] as const) {
      const m = MODEL_REGISTRY.find((x) => x.id === legacy)!;
      expect(m.selectable).toBe(false);
      expect(m.replacementId).toBe(current);
    }
  });
});
