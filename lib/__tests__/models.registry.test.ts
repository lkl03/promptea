import { describe, expect, test } from "vitest";
import {
  defaultModelIdForTarget,
  getModelById,
  getModelsForTarget,
  modelNoteForTarget,
  MODEL_REGISTRY,
  TARGET_GROUPS,
} from "@/lib/models";

describe("models registry", () => {
  test("includes all current target groups", () => {
    const targets = ["gpt", "claude", "gemini", "grok", "kimi", "deepseek"] as const;
    for (const t of targets) {
      const group = TARGET_GROUPS.find((g) => g.target === t);
      expect(group).toBeDefined();
    }
  });

  test("every target has at least one model in the registry", () => {
    const targets = ["gpt", "claude", "gemini", "grok", "kimi", "deepseek"] as const;
    for (const t of targets) {
      const models = getModelsForTarget(t);
      expect(models.length).toBeGreaterThan(0);
    }
  });

  test("default model for target exists in registry and matches its target", () => {
    for (const group of TARGET_GROUPS) {
      const id = defaultModelIdForTarget(group.target);
      const model = getModelById(id);
      expect(model).not.toBeNull();
      expect(model?.target).toBe(group.target);
    }
  });

  test("model notes are localized for both languages", () => {
    for (const m of MODEL_REGISTRY) {
      expect(typeof m.notes.es).toBe("string");
      expect(typeof m.notes.en).toBe("string");
      expect(m.notes.es.trim().length).toBeGreaterThan(0);
      expect(m.notes.en.trim().length).toBeGreaterThan(0);
    }
  });

  test("registry exposes expanded families requested in v1.1.1", () => {
    const ids = MODEL_REGISTRY.map((m) => m.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "gpt-4.1",
        "gpt-4o",
        "gpt-4o-mini",
        "gpt-o3",
        "claude-sonnet",
        "claude-opus",
        "claude-haiku",
        "gemini-pro",
        "gemini-flash",
        "grok-2",
        "deepseek-chat",
        "kimi",
        "llama-3-70b",
      ])
    );
  });

  test("modelNoteForTarget falls back when modelId does not match", () => {
    const note = modelNoteForTarget("claude", "en", "non-existent-id");
    expect(typeof note).toBe("string");
    expect(note.length).toBeGreaterThan(0);
  });
});
