// Matcher mechanics against SYNTHETIC candidates: scoring math, capability
// gates, tie/confidence rules, per-target dedupe, deprecated exclusion, and
// the handoff purpose mapping. Registry-independent by design.

import { describe, expect, test } from "vitest";
import { extractMatcherFeatures } from "@/lib/matcher/featureExtractor";
import { bestPerTarget, deriveConfidence, scoreCandidates } from "@/lib/matcher/scorer";
import { matchPrompt } from "@/lib/matcher";
import { purposeForCategory } from "@/lib/matcher/handoff";
import { getMatcherCandidates, MODEL_REGISTRY, type ModelCapabilities, type ModelEntry } from "@/lib/models";
import type { TargetAI } from "@/lib/domain";

function caps(partial: Partial<ModelCapabilities>): ModelCapabilities {
  return {
    inputModalities: ["text"],
    outputModalities: ["text"],
    contextWindowTokens: 200000,
    maxOutputTokens: 8000,
    latencyClass: "balanced",
    structuredOutput: true,
    toolUse: true,
    nativeSearch: false,
    reasoningTier: 2,
    codingAgentFit: 2,
    taskFit: {},
    promptGuidance: { es: "guía", en: "guidance" },
    ...partial,
  };
}

function entry(id: string, target: TargetAI, capabilities: ModelCapabilities, extra: Partial<ModelEntry> = {}): ModelEntry {
  return {
    id,
    label: id,
    provider: "openai",
    target,
    family: "TEST",
    status: "stable",
    strengths: [],
    notes: { es: "", en: "" },
    verifiedAt: "2026-08-03",
    sourceUrl: "https://example.com",
    selectable: true,
    capabilities,
    interactionProfiles: ["chat"],
    ...extra,
  };
}

const CODING_PROMPT =
  "In the repo acme/api, fix src/auth.ts, run npm test, and open a pull request against main.";
const RESEARCH_PROMPT =
  "Research the latest 2026 market news and cite sources with links.";

describe("matcher scoring mechanics", () => {
  test("higher task fit wins; scores are 0-100 and ranked descending", () => {
    const features = extractMatcherFeatures({ prompt: CODING_PROMPT, uiLang: "en" });
    const strong = entry("strong", "claude", caps({ codingAgentFit: 3, taskFit: { codingAgent: 3, coding: 3 } }), {
      interactionProfiles: ["chat", "codingAgent"],
    });
    const weak = entry("weak", "grok", caps({ codingAgentFit: 1, taskFit: { codingAgent: 1, coding: 1 } }));

    const ranked = scoreCandidates(features, [weak, strong]);
    expect(ranked[0].modelId).toBe("strong");
    expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
    for (const r of ranked) {
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(100);
    }
  });

  test("capability gate: no native search caps research fit regardless of taskFit", () => {
    const features = extractMatcherFeatures({ prompt: RESEARCH_PROMPT, uiLang: "en" });
    const searchless = entry("searchless", "deepseek", caps({ nativeSearch: false, taskFit: { research: 3 } }));
    const searcher = entry("searcher", "perplexity", caps({ nativeSearch: true, taskFit: { research: 3 } }), {
      provider: "perplexity",
      interactionProfiles: ["researchAssistant"],
    });

    const ranked = scoreCandidates(features, [searchless, searcher]);
    expect(ranked[0].modelId).toBe("searcher");
    const searchlessScore = ranked.find((r) => r.modelId === "searchless")!;
    const researchContribution = searchlessScore.contributions.find((c) => c.category === "research")!;
    expect(researchContribution.fit).toBeLessThanOrEqual(1);
  });

  test("capability gate: no image input means zero multimodal fit", () => {
    const features = extractMatcherFeatures({
      prompt: "Look at this screenshot I attached and explain the image.",
      uiLang: "en",
    });
    const blind = entry("blind", "deepseek", caps({ inputModalities: ["text"], taskFit: { multimodal: 3 } }));
    const ranked = scoreCandidates(features, [blind]);
    const contribution = ranked[0].contributions.find((c) => c.category === "multimodal");
    expect(contribution?.fit ?? 0).toBe(0);
  });

  test("specialized profile excludes the chat baseline from scoring", () => {
    const features = extractMatcherFeatures({ prompt: RESEARCH_PROMPT, uiLang: "en" });
    expect(features.profile).toBe("researchAssistant");
    const generalist = entry("generalist", "gpt", caps({ nativeSearch: true, taskFit: { research: 3, chat: 3 } }));
    const specialist = entry("specialist", "perplexity", caps({ nativeSearch: true, taskFit: { research: 3, chat: 1 } }), {
      provider: "perplexity",
      interactionProfiles: ["researchAssistant"],
    });
    const ranked = scoreCandidates(features, [generalist, specialist]);
    // Chat fit must not decide it: equal research fit → tie broken by profile alignment.
    expect(ranked[0].modelId).toBe("specialist");
    expect(ranked[0].score).toBe(ranked[1].score);
  });

  test("bestPerTarget keeps only the top model per target", () => {
    const features = extractMatcherFeatures({ prompt: CODING_PROMPT, uiLang: "en" });
    const a = entry("gpt-a", "gpt", caps({ codingAgentFit: 3, taskFit: { codingAgent: 3, coding: 3 } }));
    const b = entry("gpt-b", "gpt", caps({ codingAgentFit: 2, taskFit: { codingAgent: 2, coding: 2 } }));
    const c = entry("claude-c", "claude", caps({ codingAgentFit: 2, taskFit: { codingAgent: 2, coding: 2 } }), {
      provider: "anthropic",
    });
    const deduped = bestPerTarget(scoreCandidates(features, [a, b, c]));
    expect(deduped.map((d) => d.modelId)).toEqual(["gpt-a", "claude-c"]);
  });

  test("tie + confidence rules: near-equal top two is a tie, never high confidence", () => {
    const features = extractMatcherFeatures({ prompt: CODING_PROMPT, uiLang: "en" });
    const x = entry("x", "gpt", caps({ codingAgentFit: 3, taskFit: { codingAgent: 3, coding: 3 } }));
    const y = entry("y", "claude", caps({ codingAgentFit: 3, taskFit: { codingAgent: 3, coding: 3 } }), {
      provider: "anthropic",
    });
    const ranked = bestPerTarget(scoreCandidates(features, [x, y]));
    const { confidence, isTie } = deriveConfidence(features, ranked);
    expect(isTie).toBe(true);
    expect(confidence).not.toBe("high");
  });

  test("low evidence yields low confidence", () => {
    const features = extractMatcherFeatures({ prompt: "make it nicer please", uiLang: "en" });
    const ranked = bestPerTarget(scoreCandidates(features, [entry("only", "gpt", caps({ taskFit: { chat: 3 } }))]));
    const { confidence } = deriveConfidence(features, ranked);
    expect(confidence).toBe("low");
  });

  test("deprecated, legacy, non-selectable, and capability-less models can never be candidates", () => {
    const candidates = getMatcherCandidates();
    expect(candidates.length).toBeGreaterThan(0);
    for (const c of candidates) {
      expect(["stable", "preview"]).toContain(c.status);
      expect(c.selectable).toBe(true);
      expect(c.capabilities).toBeDefined();
    }
    const excludedStatuses = MODEL_REGISTRY.filter((m) => m.status === "deprecated" || m.status === "legacy");
    expect(excludedStatuses.length).toBeGreaterThan(0);
    for (const excluded of excludedStatuses) {
      expect(candidates.some((c) => c.id === excluded.id)).toBe(false);
    }
  });

  test("live registry: matchPrompt never recommends a deprecated or legacy model", () => {
    const prompts = [CODING_PROMPT, RESEARCH_PROMPT, "translate this to english please", "hola, ayudame con un texto"];
    for (const prompt of prompts) {
      const result = matchPrompt({ prompt, uiLang: "en" });
      const all = [result.primary, ...result.alternatives];
      for (const rec of all) {
        const registryEntry = MODEL_REGISTRY.find((m) => m.id === rec.modelId);
        expect(registryEntry, `unknown model ${rec.modelId}`).toBeDefined();
        expect(["stable", "preview"]).toContain(registryEntry!.status);
        expect(registryEntry!.selectable).toBe(true);
      }
      // One recommendation per target, primary included.
      const targets = all.map((r) => r.target);
      expect(new Set(targets).size).toBe(targets.length);
    }
  });

  test("handoff purpose mapping covers every category deterministically", () => {
    expect(purposeForCategory("codingAgent")).toBe("code");
    expect(purposeForCategory("coding")).toBe("code");
    expect(purposeForCategory("dataExtraction")).toBe("data");
    expect(purposeForCategory("imagePrompts")).toBe("image");
    expect(purposeForCategory("marketing")).toBe("marketing");
    expect(purposeForCategory("translation")).toBe("translation");
    expect(purposeForCategory("summarization")).toBe("summarization");
    expect(purposeForCategory("tutoring")).toBe("study");
    expect(purposeForCategory("research")).toBe("text");
    expect(purposeForCategory("chat")).toBe("text");
    expect(purposeForCategory(undefined)).toBe("text");
  });

  test("explanations cite detected signals in the requested language", () => {
    const es = matchPrompt({ prompt: "En el repo acme/api corré npm test y abrí un pull request a main.", uiLang: "es" });
    expect(es.detected.signals.every((s) => s.label.length > 0)).toBe(true);
    // Advice for coding-agent prompts must mention validation/acceptance when missing…
    const en = matchPrompt({ prompt: "In the repo acme/api, update src/x.ts and merge to main.", uiLang: "en" });
    expect(en.detected.profile).toBe("codingAgent");
    expect(en.advice.adaptation.join(" ")).toMatch(/acceptance|validate|tests/i);
    // …and never be empty generic filler.
    for (const tip of [...en.advice.adaptation, ...en.advice.switching]) {
      expect(tip.length).toBeGreaterThan(20);
    }
  });
});
