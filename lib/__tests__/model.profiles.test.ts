// v1.6.0 — model-specific prompt results.
//
// These tests keep model-specific guidance from silently drifting or
// disappearing:
//   1. the 2026-09-24 registry refresh (ids, defaults, lifecycle, sources);
//   2. every selectable model maps to a documented prompting profile;
//   3. the SAME input produces materially different prompts for models whose
//      official guidance differs (not a cosmetic label swap);
//   4. Claude Opus 5.5 prompts follow Anthropic's Opus 5.5 prompting guide;
//   5. the adaptive refiner receives — and its quality gate enforces — the
//      same guidance.

import { describe, expect, test } from "vitest";
import { analyzePrompt } from "@/lib/analyzePrompt";
import {
  MODEL_REGISTRY,
  defaultModelIdForTarget,
  getModelById,
  getModelsForTarget,
  resolveModelId,
} from "@/lib/models";
import { PROMPT_PROFILES, TARGETS } from "@/lib/domain";
import { PROMPT_PROFILE_SPECS, resolvePromptProfile, CLARIFIER_LINES } from "@/lib/engine/modelProfiles";
import { modelRulesBlock } from "@/lib/refine/adaptive";
import { runQualityGate } from "@/lib/refine/qualityGate";
import type { AttachmentContext } from "@/lib/attachments";

const HEADING_RE = /^[A-ZÁÉÍÓÚÜÑ][A-ZÁÉÍÓÚÜÑ &/]+:$/;
const headingsOf = (text: string) =>
  text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => HEADING_RE.test(l));

const REPO_TASK =
  "In repo acme/api create branch feat/limits, implement src/middleware/rateLimit.ts with tests, run npm test and npm run lint, then open a PR against main.";
const COMPLEX_REPO_TASK = `In repo acme/shop, migrate the checkout from REST to tRPC.
- Move handlers from src/api/checkout/*.ts into src/server/routers/checkout.ts
- Keep the public response shape identical
- Update the React hooks in src/hooks/useCheckout.ts
- Run npm test, npm run lint and npm run build before opening a PR against main

~~~ts
export async function postCheckout(req: Request) { /* current REST handler */ }
~~~

The mobile app also calls these endpoints, so keep backwards compatibility until it ships.`;

describe("registry — 2026-09-24 provider sweep", () => {
  test("Claude Opus 5.5 is a first-class, verified, default Claude model", () => {
    const opus = getModelById("claude-opus-5.5");
    expect(opus).not.toBeNull();
    expect(opus?.apiModelId).toBe("claude-opus-5-5");
    expect(opus?.status).toBe("stable");
    expect(opus?.selectable).toBe(true);
    expect(opus?.defaultForTarget).toBe(true);
    expect(opus?.verifiedAt).toBe("2026-09-24");
    expect(opus?.sourceUrl).toBe("https://platform.claude.com/docs/en/models/opus-5-5/overview");
    expect(opus?.capabilities?.contextWindowTokens).toBe(1000000);
    expect(opus?.capabilities?.maxOutputTokens).toBe(128000);
    expect(opus?.capabilities?.inputModalities).toEqual(expect.arrayContaining(["text", "image", "pdf"]));
    expect(opus?.capabilities?.reasoningTier).toBe(3);
    expect(opus?.capabilities?.toolUse).toBe(true);
    expect(opus?.capabilities?.structuredOutput).toBe(true);
    expect(opus?.capabilities?.latencyClass).toBe("balanced");
    expect(opus?.interactionProfiles).toEqual(expect.arrayContaining(["chat", "codingAgent"]));
    expect(opus?.promptProfile).toBe("opus-adaptive");
    expect(defaultModelIdForTarget("claude")).toBe("claude-opus-5.5");
  });

  test("superseded Claude models are legacy and point at their successors (ids kept)", () => {
    expect(getModelById("claude-opus-5")?.status).toBe("legacy");
    expect(getModelById("claude-opus-5")?.replacementId).toBe("claude-opus-5.5");
    expect(getModelById("claude-opus-4.8")?.replacementId).toBe("claude-opus-5.5");
    expect(getModelById("claude-opus")?.replacementId).toBe("claude-opus-5.5");
    expect(getModelById("claude-fable-5")?.status).toBe("legacy");
    expect(getModelById("claude-fable-5")?.replacementId).toBe("claude-fable-5.1");
    expect(getModelById("claude-fable-5.1")?.apiModelId).toBe("claude-fable-5-1");
    expect(getModelById("claude-fable-5.1")?.selectable).toBe(true);
    expect(resolveModelId("claude-opus-5")?.id).toBe("claude-opus-5.5");
  });

  test("current lineups and defaults per provider", () => {
    expect(defaultModelIdForTarget("gpt")).toBe("gpt-6-astra");
    expect(getModelsForTarget("gpt").map((m) => m.id)).toEqual(["gpt-6-astra", "gpt-6-sol", "gpt-6-luna"]);
    expect(getModelById("gpt-5.6")?.replacementId).toBe("gpt-6-sol");
    expect(defaultModelIdForTarget("gemini")).toBe("gemini-3.8-flash");
    expect(getModelById("gemini-3.5-flash")?.status).toBe("legacy");
    expect(getModelById("gemini-3.1-flash-lite")?.status).toBe("deprecated");
    expect(defaultModelIdForTarget("grok")).toBe("grok-4.7");
    expect(getModelById("grok-4.5")?.replacementId).toBe("grok-4.7");
    expect(defaultModelIdForTarget("deepseek")).toBe("deepseek-flash");
    expect(getModelById("deepseek-v4-flash")?.replacementId).toBe("deepseek-flash");
    expect(defaultModelIdForTarget("kimi")).toBe("kimi-k3");
    expect(defaultModelIdForTarget("perplexity")).toBe("perplexity-agent-low");
  });

  test("Sonar Chat Completions (sunset 2026-09-27) maps to the official Agent API presets", () => {
    const mapping: Record<string, string> = {
      sonar: "perplexity-agent-fast",
      "sonar-pro": "perplexity-agent-low",
      "sonar-reasoning-pro": "perplexity-agent-medium",
      "sonar-deep-research": "perplexity-agent-high",
    };
    for (const [legacy, preset] of Object.entries(mapping)) {
      const entry = getModelById(legacy);
      expect(entry?.status, legacy).toBe("deprecated");
      expect(entry?.selectable, legacy).toBe(false);
      expect(entry?.replacementId, legacy).toBe(preset);
    }
  });

  test("every replacementId exists and every chain ends on a selectable model", () => {
    for (const m of MODEL_REGISTRY) {
      if (!m.replacementId) continue;
      expect(getModelById(m.replacementId), `${m.id} → ${m.replacementId}`).not.toBeNull();
      expect(resolveModelId(m.id)?.selectable, `${m.id} chain`).toBe(true);
    }
  });

  test("every selectable model carries capability data, a prompting profile, and an https source", () => {
    for (const m of MODEL_REGISTRY.filter((x) => x.selectable)) {
      expect(m.capabilities, `${m.id} capabilities`).toBeDefined();
      expect(m.capabilities?.promptGuidance.es.length, `${m.id} guidance es`).toBeGreaterThan(20);
      expect(m.capabilities?.promptGuidance.en.length, `${m.id} guidance en`).toBeGreaterThan(20);
      expect(m.promptProfile, `${m.id} promptProfile`).toBeDefined();
      expect(PROMPT_PROFILES).toContain(m.promptProfile);
      expect(m.sourceUrl).toMatch(/^https:\/\//);
    }
  });
});

describe("prompting profiles are documented and bilingual", () => {
  test("every profile cites a first-party https source and has ES/EN rule parity", () => {
    for (const id of PROMPT_PROFILES) {
      const p = PROMPT_PROFILE_SPECS[id];
      expect(p.id).toBe(id);
      expect(p.source, id).toMatch(/^https:\/\/(platform\.claude\.com|developers\.openai\.com|ai\.google\.dev|docs\.x\.ai|api-docs\.deepseek\.com|platform\.kimi\.ai|docs\.perplexity\.ai)\//);
      expect(p.refinerRules.es.length, `${id} rules`).toBeGreaterThan(0);
      expect(p.refinerRules.es.length, `${id} rule parity`).toBe(p.refinerRules.en.length);
      if (p.codingDeliverable) expect(p.codingDeliverable.es.length).toBe(p.codingDeliverable.en.length);
      if (p.researchApproach) expect(p.researchApproach.es.length).toBe(p.researchApproach.en.length);
    }
  });

  test("every target resolves a profile, and legacy ids resolve through their replacement", () => {
    for (const t of TARGETS) expect(resolvePromptProfile(t, null).id).toBeTruthy();
    expect(resolvePromptProfile("claude", "claude-opus-5").id).toBe("opus-adaptive");
    expect(resolvePromptProfile("claude", "claude-fable-5").id).toBe("fable-autonomous");
    expect(resolvePromptProfile("claude", "claude-sonnet-5").id).toBe("claude-literal");
    // A model from another target never leaks its profile.
    expect(resolvePromptProfile("claude", "gpt-6-astra").id).toBe("opus-adaptive");
  });
});

describe("same input, materially different prompts per model guidance", () => {
  test("a repo task is shaped differently for Opus 5.5, Sonnet 5, GPT-6 Astra, GPT-6 Sol and Grok Build", () => {
    const shapes = new Map<string, string>();
    for (const [target, modelId] of [
      ["claude", "claude-opus-5.5"],
      ["claude", "claude-sonnet-5"],
      ["gpt", "gpt-6-astra"],
      ["gpt", "gpt-6-sol"],
      ["grok", "grok-build-0.1"],
    ] as const) {
      const r = analyzePrompt(REPO_TASK, target, "en", "code", { modelId });
      expect(r.optimizedPrompt, modelId).toContain("src/middleware/rateLimit.ts");
      shapes.set(modelId, headingsOf(r.optimizedPrompt).join("|"));
    }
    expect(shapes.get("claude-opus-5.5")).toBe("OBJECTIVE:|SCOPE:|DONE WHEN:");
    expect(shapes.get("claude-sonnet-5")).toBe("OBJECTIVE:|STEPS & VALIDATION:");
    expect(shapes.get("gpt-6-astra")).toBe("OBJECTIVE:|PERMISSIONS & AUTONOMY:|DONE WHEN:");
    expect(shapes.get("gpt-6-sol")).toBe("OBJECTIVE:|STEPS & VALIDATION:");
    expect(shapes.get("grok-build-0.1")).toBe("OBJECTIVE:|FOCUS:|STEPS & VALIDATION:");
  });

  test("short natural prompts get the clarifier each provider's guidance calls for", () => {
    const msg = "Make this message to my landlord sound friendlier";
    const ask = analyzePrompt(msg, "claude", "en", "text", { modelId: "claude-sonnet-5" }).optimizedPrompt;
    const assume = analyzePrompt(msg, "gpt", "en", "text", { modelId: "gpt-6-astra" }).optimizedPrompt;
    const sources = analyzePrompt("latest EU AI Act enforcement dates", "perplexity", "en", "text").optimizedPrompt;
    expect(ask).toContain(CLARIFIER_LINES.ask.en);
    expect(assume).toContain(CLARIFIER_LINES.assume.en);
    expect(sources).toContain(CLARIFIER_LINES.sources.en);
  });

  test("closing lines are model-directed instructions, never 'For <Model>:' tips", () => {
    for (const t of TARGETS) {
      const r = analyzePrompt(COMPLEX_REPO_TASK, t, "en", "code");
      expect(r.optimizedPrompt, t).not.toMatch(/^- For (GPT|Claude|Gemini|Grok|DeepSeek|Kimi|Perplexity):/m);
      expect(r.optimizedPrompt, t).not.toMatch(/^- Para (GPT|Claude|Gemini|Grok|DeepSeek|Kimi|Perplexity):/m);
    }
  });

  test("Perplexity research prompts carry its documented search rules", () => {
    const r = analyzePrompt(
      [
        "Research how the top 5 EU countries are implementing the AI Act in 2026 for a policy brief.",
        "- Which national body enforces it in each country",
        "- Fines announced so far",
        "- Guidance published for small companies",
        "",
        "The brief is for a mid-size software company that sells an HR screening product in Spain, Germany, France, Italy and the Netherlands, so focus on obligations that apply to high-risk systems used in hiring and on anything that changes our compliance timeline before the end of the year.",
      ].join("\n"),
      "perplexity",
      "en",
      "text"
    );
    expect(r.meta.routing?.strategy).toBe("analysis_research");
    expect(r.optimizedPrompt).toContain("Flag results that only nearly match");
    expect(r.optimizedPrompt).toContain("At most 5 sections");
  });

  test("attached context goes first for Claude and Gemini, after the request for GPT", () => {
    const files: AttachmentContext[] = [
      { name: "notes.md", mime: "text/markdown", ext: "md", kind: "markdown", text: "Q3 churn rose 2%.", size: 20, truncated: false, removedLines: 0 },
    ];
    const pos = (target: "claude" | "gemini" | "gpt") => {
      const out = analyzePrompt("Summarize the attached notes for the board.", target, "en", "summarization", { attachments: files }).optimizedPrompt;
      return out.indexOf("ATTACHED CONTEXT:") < out.indexOf("REQUEST:");
    };
    expect(pos("claude")).toBe(true);
    expect(pos("gemini")).toBe(true);
    expect(pos("gpt")).toBe(false);
  });
});

describe("Claude Opus 5.5 follows Anthropic's Opus 5.5 prompting guide", () => {
  const FORBIDDEN = [
    /think (step[- ]by[- ]step|carefully|hard)/i,
    /double[- ]check/i,
    /verify your (work|answer)/i,
    /show your reasoning|write out your reasoning|chain[- ]of[- ]thought/i,
    /ask before implementing/i,
  ];

  test("agent tasks become an outcome spec: scope + completion criteria, no reasoning or re-check scaffolding", () => {
    const out = analyzePrompt(REPO_TASK, "claude", "en", "code", { modelId: "claude-opus-5.5" }).optimizedPrompt;
    expect(out).toContain("SCOPE:");
    expect(out).toContain("check in only if different readings of the request would lead to materially different work");
    expect(out).toContain("DONE WHEN:");
    expect(out).toContain("no stubs or placeholders");
    for (const re of FORBIDDEN) expect(out, String(re)).not.toMatch(re);
  });

  test("long agentic tasks separate user-visible updates from hidden reasoning", () => {
    const out = analyzePrompt(COMPLEX_REPO_TASK, "claude", "en", "code", { modelId: "claude-opus-5.5" }).optimizedPrompt;
    expect(out).toContain("USER UPDATES:");
    expect(out).toContain("say in one sentence what you're about to do");
    expect(out).toContain("lead with the outcome");
    for (const re of FORBIDDEN) expect(out, String(re)).not.toMatch(re);
  });

  test("a short writing task stays short (no roles, no headings)", () => {
    const out = analyzePrompt("write a two-line thank-you note to my team for shipping on time", "claude", "en", "text", {
      modelId: "claude-opus-5.5",
    }).optimizedPrompt;
    expect(headingsOf(out)).toEqual([]);
    expect(out.split("\n").filter((l) => l.trim()).length).toBeLessThanOrEqual(3);
    expect(out).not.toMatch(/^(you are|act as)/im);
    for (const re of FORBIDDEN) expect(out, String(re)).not.toMatch(re);
  });

  test("frontend work gets concrete design constraints and named anti-patterns, not 'avoid a generic look'", () => {
    const out = analyzePrompt("Build a landing page for my bakery", "claude", "en", "text", { modelId: "claude-opus-5.5" }).optimizedPrompt;
    expect(out).toContain("DESIGN DIRECTION:");
    expect(out).toContain("a cream or off-white background");
    expect(out).toContain("pill-shaped buttons");
    expect(out).not.toMatch(/generic (look|ai)/i);
  });

  test("a design choice the user asked for is never forbidden", () => {
    const out = analyzePrompt("Build a landing page for my bakery with pill buttons and a cream background", "claude", "en", "text", {
      modelId: "claude-opus-5.5",
    }).optimizedPrompt;
    expect(out).toContain("DESIGN DIRECTION:");
    expect(out).not.toContain("pill-shaped buttons");
    expect(out).not.toContain("cream or off-white background");
    expect(out).toContain("monospace labels");
  });

  test("frontend anti-patterns are Opus 5.5-specific (not injected for other models)", () => {
    const sonnet = analyzePrompt("Build a landing page for my bakery", "claude", "en", "text", { modelId: "claude-sonnet-5" }).optimizedPrompt;
    const astra = analyzePrompt("Build a landing page for my bakery", "gpt", "en", "text", { modelId: "gpt-6-astra" }).optimizedPrompt;
    expect(sonnet).not.toContain("DESIGN DIRECTION:");
    expect(astra).not.toContain("DESIGN DIRECTION:");
  });

  test("Spanish parity: same structure, Spanish wording", () => {
    const out = analyzePrompt(
      "En el repo acme/api creá la rama feat/limits, implementá src/middleware/rateLimit.ts con tests, corré npm test y abrí un PR a main.",
      "claude",
      "es",
      "code",
      { modelId: "claude-opus-5.5" }
    ).optimizedPrompt;
    expect(headingsOf(out)).toEqual(["OBJETIVO:", "ALCANCE:", "LISTO CUANDO:"]);
    expect(out).toContain("Resolvé vos las decisiones de rutina");
    expect(out).not.toMatch(/pens[aá] paso a paso|revis[aá] dos veces/i);
  });

  test("Opus 5.5 output differs from the previous generic Claude shape", () => {
    const opus = analyzePrompt(REPO_TASK, "claude", "en", "code", { modelId: "claude-opus-5.5" }).optimizedPrompt;
    const sonnet = analyzePrompt(REPO_TASK, "claude", "en", "code", { modelId: "claude-sonnet-5" }).optimizedPrompt;
    expect(opus).not.toBe(sonnet);
    expect(sonnet).toContain("If a requirement is ambiguous, ask before implementing.");
    expect(opus).not.toContain("If a requirement is ambiguous, ask before implementing.");
  });

  test("Fable 5.1 keeps its own guidance: report pre-existing issues, don't fix them", () => {
    const out = analyzePrompt(REPO_TASK, "claude", "en", "code", { modelId: "claude-fable-5.1" }).optimizedPrompt;
    expect(out).toContain("report them at the end instead of fixing them");
  });
});

describe("adaptive refiner receives and enforces the same guidance", () => {
  test("the Opus 5.5 rules block carries the guide's key principles", () => {
    const block = modelRulesBlock({ target: "claude", modelId: "claude-opus-5.5", uiLang: "en" });
    expect(block).toContain("Claude Opus 5.5");
    expect(block).toMatch(/adaptive thinking/);
    expect(block).toMatch(/effort/);
    expect(block).toMatch(/<pasted_content>/);
    expect(block).toMatch(/Short tasks stay short/);
    expect(block).toMatch(/name specific patterns to avoid/);
  });

  test("different models get different rule blocks", () => {
    const opus = modelRulesBlock({ target: "claude", modelId: "claude-opus-5.5", uiLang: "en" });
    const sonnet = modelRulesBlock({ target: "claude", modelId: "claude-sonnet-5", uiLang: "en" });
    const astra = modelRulesBlock({ target: "gpt", modelId: "gpt-6-astra", uiLang: "en" });
    const pplx = modelRulesBlock({ target: "perplexity", modelId: null, uiLang: "es" });
    expect(new Set([opus, sonnet, astra, pplx]).size).toBe(4);
    expect(astra).toMatch(/bias toward action/);
    expect(pplx).toMatch(/semilla de la búsqueda/);
  });

  test("the gate rejects reasoning / re-check scaffolding added to an Opus 5.5 prompt", () => {
    const base = {
      original: "Refactor src/cart.ts to remove the duplicate total calculation.",
      deterministic: "GOAL:\nRefactor src/cart.ts to remove the duplicate total calculation.",
      language: "en" as const,
      literals: [],
      profileId: "opus-adaptive" as const,
    };
    expect(runQualityGate({ ...base, candidate: "Refactor src/cart.ts to remove the duplicate total calculation. Think step by step before answering." }).failures).toContain(
      "reasoning_instruction_added"
    );
    expect(runQualityGate({ ...base, candidate: "Refactor src/cart.ts to remove the duplicate total calculation, then double-check your work." }).failures).toContain(
      "verification_instruction_added"
    );
    expect(runQualityGate({ ...base, candidate: "Refactor src/cart.ts to remove the duplicate total calculation, keeping the public API unchanged." }).passed).toBe(true);
    // A user who asked for it keeps it.
    expect(
      runQualityGate({ ...base, original: `${base.original} Think step by step.`, candidate: "Refactor src/cart.ts, think step by step, keep the API." }).failures
    ).not.toContain("reasoning_instruction_added");
  });
});
