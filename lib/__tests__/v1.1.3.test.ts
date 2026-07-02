import { describe, expect, test } from "vitest";
import { analyzePrompt } from "@/lib/analyzePrompt";
import {
  MODEL_REGISTRY,
  TARGET_GROUPS,
  getModelById,
  getModelsForTarget,
  defaultModelIdForTarget,
} from "@/lib/models";
import { adaptPromptWithGroq, isGroqEnabled } from "@/lib/llm/groq";

// ---------------------------------------------------------------------------
// Model registry — v1.1.3 additions
// ---------------------------------------------------------------------------

describe("models registry — v1.1.3", () => {
  test("includes new OpenAI models", () => {
    const ids = MODEL_REGISTRY.map((m) => m.id);
    expect(ids).toContain("gpt-5.5");
    expect(ids).toContain("gpt-5.5-pro");
  });

  test("includes new Anthropic models", () => {
    const ids = MODEL_REGISTRY.map((m) => m.id);
    expect(ids).toContain("claude-fable-5");
    expect(ids).toContain("claude-opus-4.8");
  });

  test("includes new Google models", () => {
    const ids = MODEL_REGISTRY.map((m) => m.id);
    expect(ids).toContain("gemini-3.5-flash");
  });

  test("includes new xAI models", () => {
    const ids = MODEL_REGISTRY.map((m) => m.id);
    expect(ids).toContain("grok-4.3");
    expect(ids).toContain("grok-build-0.1");
  });

  test("includes new DeepSeek models", () => {
    const ids = MODEL_REGISTRY.map((m) => m.id);
    expect(ids).toContain("deepseek-v4-pro");
    expect(ids).toContain("deepseek-v4-flash");
  });

  test("includes Perplexity as a new provider and target", () => {
    const perplexityModels = getModelsForTarget("perplexity");
    expect(perplexityModels.length).toBeGreaterThanOrEqual(2);
    expect(perplexityModels.map((m) => m.id)).toContain("sonar-pro");
    expect(perplexityModels.map((m) => m.id)).toContain("sonar-reasoning-pro");
  });

  test("Perplexity target group exists with a valid default", () => {
    const group = TARGET_GROUPS.find((g) => g.target === "perplexity");
    expect(group).toBeDefined();
    const defaultId = defaultModelIdForTarget("perplexity");
    const model = getModelById(defaultId);
    expect(model).not.toBeNull();
    expect(model?.target).toBe("perplexity");
  });

  test("all existing defaults still resolve (no regressions)", () => {
    const existingTargets = ["gpt", "claude", "gemini", "grok", "kimi", "deepseek"] as const;
    for (const t of existingTargets) {
      const id = defaultModelIdForTarget(t);
      const model = getModelById(id);
      expect(model?.target).toBe(t);
    }
  });

  test("new models have localized notes", () => {
    const newIds = ["gpt-5.5", "gpt-5.5-pro", "claude-fable-5", "claude-opus-4.8", "gemini-3.5-flash",
                    "grok-4.3", "grok-build-0.1", "deepseek-v4-pro", "deepseek-v4-flash",
                    "sonar-pro", "sonar-reasoning-pro"];
    for (const id of newIds) {
      const m = getModelById(id);
      expect(m, `model ${id} missing from registry`).not.toBeNull();
      expect(m!.notes.es.trim().length).toBeGreaterThan(0);
      expect(m!.notes.en.trim().length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Prompt header invariant — must start with PROMPTEA: v1.1.5
// ---------------------------------------------------------------------------

describe("optimized prompt header — v1.1.5 invariant", () => {
  const targets = ["gpt", "claude", "gemini", "grok", "kimi", "deepseek", "perplexity"] as const;

  for (const target of targets) {
    test(`${target}: optimized prompt starts with PROMPTEA: v1.1.5`, () => {
      const r = analyzePrompt("Write a summary of this document for my team.", target, "en", "text");
      expect(r.optimizedPrompt).toMatch(/^PROMPTEA:\s*v1\.1\.5/i);
    });
  }

  test("optimized prompt always has MODEL, PURPOSE, TASK_TYPE lines after PROMPTEA", () => {
    const r = analyzePrompt("Corregí este bug en mi app de React.", "gpt", "es", "code");
    const lines = r.optimizedPrompt.split("\n");
    expect(lines[0]).toMatch(/^PROMPTEA:\s*v1\.1\.5/i);
    expect(lines[1]).toMatch(/^MODEL:/i);
    expect(lines[2]).toMatch(/^PURPOSE:/i);
    expect(lines[3]).toMatch(/^TASK_TYPE:/i);
  });

  test("perplexity target produces valid header", () => {
    const r = analyzePrompt("Research the latest AI models released in 2026.", "perplexity", "en", "text");
    expect(r.optimizedPrompt).toMatch(/^PROMPTEA:\s*v1\.1\.5/i);
    expect(r.optimizedPrompt).toContain("MODEL: PERPLEXITY");
    expect(r.optimizedPrompt).toContain("PURPOSE: text");
  });
});

// ---------------------------------------------------------------------------
// Groq adaptive layer — fallback behavior (no real API key in tests)
// ---------------------------------------------------------------------------

describe("Groq adaptive layer — fallback behavior", () => {
  test("isGroqEnabled returns false when GROQ_API_KEY is absent", () => {
    const originalKey = process.env.GROQ_API_KEY;
    delete process.env.GROQ_API_KEY;
    expect(isGroqEnabled()).toBe(false);
    if (originalKey !== undefined) process.env.GROQ_API_KEY = originalKey;
  });

  test("adaptPromptWithGroq falls back when GROQ_API_KEY is missing", async () => {
    const originalKey = process.env.GROQ_API_KEY;
    delete process.env.GROQ_API_KEY;

    const deterministicPrompt = `PROMPTEA: v1.1.3
MODEL: GPT
PURPOSE: text
TASK_TYPE: text

INSTRUCTIONS:
- Be specific.

TASK:
Explain transformers.`;

    const result = await adaptPromptWithGroq({
      originalPrompt: "Explain transformers.",
      optimizedPrompt: deterministicPrompt,
      model: "gpt",
      purpose: "text",
      taskType: "text",
      language: "en",
    });

    expect(result.adaptiveFallback).toBe(true);
    expect(result.adaptiveReason).toContain("groq_disabled");
    expect(result.optimizedPrompt).toBe(deterministicPrompt);

    if (originalKey !== undefined) process.env.GROQ_API_KEY = originalKey;
  });

  test("repairPrompteaHeader: fallback result always starts with the deterministic header", async () => {
    // Simulate a scenario where adaptPromptWithGroq would need to repair a stripped header.
    // We test the public contract: the returned optimizedPrompt must contain the header.
    const originalKey = process.env.GROQ_API_KEY;
    delete process.env.GROQ_API_KEY;

    const deterministicPrompt = `PROMPTEA: v1.1.3
MODEL: CLAUDE
PURPOSE: code
TASK_TYPE: coding

TASK:
Fix this bug.`;

    const result = await adaptPromptWithGroq({
      originalPrompt: "Fix this bug.",
      optimizedPrompt: deterministicPrompt,
      model: "claude",
      purpose: "code",
      taskType: "coding",
      language: "en",
    });

    // With no key, we get the deterministic prompt back unchanged.
    expect(result.optimizedPrompt.startsWith("PROMPTEA: v1.1.3")).toBe(true);

    if (originalKey !== undefined) process.env.GROQ_API_KEY = originalKey;
  });

  test("adaptiveEngine is always 'groq' in the result", async () => {
    const originalKey = process.env.GROQ_API_KEY;
    delete process.env.GROQ_API_KEY;

    const result = await adaptPromptWithGroq({
      originalPrompt: "Test.",
      optimizedPrompt: "PROMPTEA: v1.1.3\nMODEL: GPT\nPURPOSE: text\nTASK_TYPE: text\n\nTASK:\nTest.",
      model: "gpt",
      purpose: "text",
      taskType: "text",
      language: "en",
    });

    expect(result.adaptiveEngine).toBe("groq");

    if (originalKey !== undefined) process.env.GROQ_API_KEY = originalKey;
  });
});
