import { describe, expect, test } from "vitest";
import { analyzePrompt } from "@/lib/analyzePrompt";
import {
  MODEL_REGISTRY,
  TARGET_GROUPS,
  getModelById,
  getModelsForTarget,
  defaultModelIdForTarget,
} from "@/lib/models";
import { isGroqEnabled } from "@/lib/llm/groq";
import { refinePromptAdaptive } from "@/lib/refine/adaptive";
import { APP_VERSION } from "@/lib/version";

// v1.3.0: the optimized prompt must never carry internal metadata lines.
const METADATA_LINE_RE = /^(MODEL|PURPOSE|TASK_TYPE):\s/im;

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
// Prompt header invariant — v1.3.0: the PROMPTEA/MODEL/PURPOSE/TASK_TYPE
// metadata header is GONE from checklist output. Metadata lives in result
// meta only; the copyable prompt must never carry it, for any target.
// ---------------------------------------------------------------------------

describe("optimized prompt header — v1.3.0 metadata removal invariant", () => {
  const targets = ["gpt", "claude", "gemini", "grok", "kimi", "deepseek", "perplexity"] as const;

  for (const target of targets) {
    test(`${target}: optimized prompt does NOT start with a PROMPTEA header`, () => {
      const r = analyzePrompt("Write a summary of this document for my team.", target, "en", "text");
      expect(r.optimizedPrompt).not.toMatch(/^PROMPTEA:/i);
      expect(r.optimizedPrompt).not.toMatch(METADATA_LINE_RE);
    });
  }

  test("optimized prompt never has MODEL, PURPOSE, or TASK_TYPE metadata lines", () => {
    const r = analyzePrompt("Corregí este bug en mi app de React.", "gpt", "es", "code");
    expect(r.optimizedPrompt).not.toMatch(/^PROMPTEA:/i);
    expect(r.optimizedPrompt).not.toMatch(/^MODEL:\s/im);
    expect(r.optimizedPrompt).not.toMatch(/^PURPOSE:\s/im);
    expect(r.optimizedPrompt).not.toMatch(/^TASK_TYPE:\s/im);
  });

  test("perplexity target output is metadata-free too", () => {
    const r = analyzePrompt("Research the latest AI models released in 2026.", "perplexity", "en", "text");
    expect(r.optimizedPrompt).not.toMatch(/^PROMPTEA:/i);
    expect(r.optimizedPrompt).not.toContain("MODEL: PERPLEXITY");
    expect(r.optimizedPrompt).not.toContain("PURPOSE: text");
  });
});

// ---------------------------------------------------------------------------
// Groq adaptive layer — fallback behavior (no real API key in tests)
// ---------------------------------------------------------------------------

describe("Adaptive refinement layer — fallback behavior (v1.2.0)", () => {
  const routing = {
    strategy: "message_polish",
    complexity: "simple",
    signals: [],
  } as const;

  test("isGroqEnabled returns false when GROQ_API_KEY is absent", () => {
    const originalKey = process.env.GROQ_API_KEY;
    delete process.env.GROQ_API_KEY;
    expect(isGroqEnabled()).toBe(false);
    if (originalKey !== undefined) process.env.GROQ_API_KEY = originalKey;
  });

  test("refinePromptAdaptive falls back when GROQ_API_KEY is missing", async () => {
    const originalKey = process.env.GROQ_API_KEY;
    delete process.env.GROQ_API_KEY;

    const deterministicPrompt = `PROMPTEA: v${APP_VERSION}
MODEL: GPT
PURPOSE: text
TASK_TYPE: text

INSTRUCTIONS:
- Be specific.

TASK:
Explain transformers.`;

    const result = await refinePromptAdaptive({
      originalPrompt: "Explain transformers.",
      deterministicPrompt,
      target: "gpt",
      purpose: "text",
      taskType: "text",
      uiLang: "en",
      routing: { ...routing, signals: [] },
    });

    expect(result.execution.engine).toBe("deterministic");
    expect(result.execution.fallbackReason).toBe("disabled");
    expect(result.optimizedPrompt).toBe(deterministicPrompt);

    if (originalKey !== undefined) process.env.GROQ_API_KEY = originalKey;
  });

  test("fallback result always starts with the deterministic header", async () => {
    const originalKey = process.env.GROQ_API_KEY;
    delete process.env.GROQ_API_KEY;

    const deterministicPrompt = `PROMPTEA: v${APP_VERSION}
MODEL: CLAUDE
PURPOSE: code
TASK_TYPE: coding

TASK:
Fix this bug.`;

    const result = await refinePromptAdaptive({
      originalPrompt: "Fix this bug.",
      deterministicPrompt,
      target: "claude",
      purpose: "code",
      taskType: "coding",
      uiLang: "en",
      routing: { strategy: "debugging_review", complexity: "simple", signals: [] },
    });

    expect(result.optimizedPrompt.startsWith(`PROMPTEA: v${APP_VERSION}`)).toBe(true);

    if (originalKey !== undefined) process.env.GROQ_API_KEY = originalKey;
  });
});
