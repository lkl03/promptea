import { describe, expect, test } from "vitest";
import {
  defaultModelIdForTarget,
  getModelById,
  getModelsForTarget,
  getAllModelsForTarget,
  modelNoteForTarget,
  resolveModelId,
  MODEL_REGISTRY,
  TARGET_GROUPS,
} from "@/lib/models";
import { TARGETS } from "@/lib/domain";

describe("models registry", () => {
  test("includes all current target groups", () => {
    for (const t of TARGETS) {
      const group = TARGET_GROUPS.find((g) => g.target === t);
      expect(group).toBeDefined();
    }
  });

  test("every target has at least one SELECTABLE model in the registry", () => {
    for (const t of TARGETS) {
      const models = getModelsForTarget(t);
      expect(models.length).toBeGreaterThan(0);
      for (const m of models) expect(m.selectable).toBe(true);
    }
  });

  test("no duplicate model ids", () => {
    const ids = MODEL_REGISTRY.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("exactly one default per target, and it is selectable", () => {
    for (const t of TARGETS) {
      const defaults = getAllModelsForTarget(t).filter((m) => m.defaultForTarget);
      expect(defaults.length, `target ${t} must have exactly one default`).toBe(1);
      expect(defaults[0].selectable).toBe(true);
    }
  });

  test("default model for target exists in registry and matches its target", () => {
    for (const group of TARGET_GROUPS) {
      const id = defaultModelIdForTarget(group.target);
      const model = getModelById(id);
      expect(model).not.toBeNull();
      expect(model?.target).toBe(group.target);
      expect(model?.selectable).toBe(true);
    }
  });

  test("every entry has verification metadata (verifiedAt ISO date + https source)", () => {
    for (const m of MODEL_REGISTRY) {
      expect(m.verifiedAt, `${m.id} missing verifiedAt`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(m.sourceUrl, `${m.id} missing sourceUrl`).toMatch(/^https:\/\//);
    }
  });

  test("legacy and deprecated entries are non-selectable and resolve to a selectable replacement", () => {
    for (const m of MODEL_REGISTRY) {
      if (m.status === "legacy" || m.status === "deprecated") {
        expect(m.selectable, `${m.id} (${m.status}) must not be selectable`).toBe(false);
        const resolved = resolveModelId(m.id);
        expect(resolved, `${m.id} must resolve to a replacement`).not.toBeNull();
        expect(resolved?.selectable, `${m.id} replacement chain must end selectable`).toBe(true);
      }
    }
  });

  test("selectable entries are stable or preview and carry an apiModelId", () => {
    for (const m of MODEL_REGISTRY) {
      if (m.selectable) {
        expect(["stable", "preview"]).toContain(m.status);
        expect(m.apiModelId, `${m.id} selectable entry must state its API id`).toBeTruthy();
      }
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

  test("v1.1.1 ids are retained for compatibility (non-selectable is fine)", () => {
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
