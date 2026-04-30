import { describe, expect, test } from "vitest";
import { analyzePrompt } from "@/lib/analyzePrompt";
import { isValidJson } from "@/lib/engine/jsonOutput";

describe("Engine — JSON output format", () => {
  test("checklist remains the default and produces a Promptea scaffold", () => {
    const r = analyzePrompt("Write a launch email", "gpt", "en", "marketing");
    expect(r.optimizedPrompt).toContain("PROMPTEA: v");
    expect(r.optimizedPrompt).toContain("INSTRUCTIONS:");
    expect(r.meta.formatChoice).toBe("checklist");
  });

  test("format=json produces a parseable JSON optimized prompt", () => {
    const r = analyzePrompt(
      "Extract product names and prices from this catalog",
      "gemini",
      "en",
      "data",
      { format: "json" }
    );

    expect(r.meta.formatChoice).toBe("json");
    expect(isValidJson(r.optimizedPrompt)).toBe(true);

    const parsed = JSON.parse(r.optimizedPrompt) as Record<string, unknown>;
    expect(parsed.promptea_version).toBeDefined();
    expect(parsed.task_type).toBe("data_extraction");
    expect(parsed.purpose).toBe("data");
    expect(Array.isArray(parsed.constraints)).toBe(true);
    expect(Array.isArray(parsed.quality_checks)).toBe(true);
    expect(typeof parsed.output_format).toBe("string");
    expect(typeof parsed.task).toBe("string");
  });

  test("modelId travels through to meta", () => {
    const r = analyzePrompt(
      "Refactor this function for readability",
      "claude",
      "en",
      "code",
      { modelId: "claude-opus" }
    );
    expect(r.meta.modelId).toBe("claude-opus");
    expect(typeof r.meta.modelNotes).toBe("string");
    expect((r.meta.modelNotes ?? "").length).toBeGreaterThan(0);
  });

  test("feedback block exposes follow-up questions and quick wins", () => {
    const r = analyzePrompt("Help me write something", "gpt", "en", "text");
    expect(Array.isArray(r.meta.followUpQuestions)).toBe(true);
    expect((r.meta.followUpQuestions ?? []).length).toBeGreaterThan(0);
    expect(Array.isArray(r.meta.quickWins)).toBe(true);
    expect(Array.isArray(r.meta.scoreCriteria)).toBe(true);
  });

  test("attachments param still works via legacy positional signature", () => {
    const r = analyzePrompt(
      "Summarize the attached notes in 3 bullets",
      "gpt",
      "en",
      "summarization",
      [
        {
          name: "notes.md",
          mime: "text/markdown",
          ext: "md",
          kind: "markdown",
          text: "Activation grew 6%, churn dropped 2%, expansion revenue flat.",
          size: 80,
          truncated: false,
          removedLines: 0,
        },
      ]
    );

    expect(r.meta.attachmentsCount).toBe(1);
    expect(r.meta.formatChoice).toBe("checklist");
  });
});
