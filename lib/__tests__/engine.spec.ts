import { describe, expect, test } from "vitest";
import { analyzePrompt } from "@/lib/analyzePrompt";

describe("engine/analyzePrompt", () => {
  test("EN output should be in English (optimized prompt headers)", () => {
    const r = analyzePrompt("hi how are you?", "gpt", "en", "text");
    expect(r.optimizedPrompt).toContain("INSTRUCTIONS:");
    expect(r.optimizedPrompt).not.toContain("INSTRUCCIONES:");
  });

  test("ES output should be in Spanish (optimized prompt headers)", () => {
    const r = analyzePrompt("hola, ¿cómo estás?", "gpt", "es", "text");
    expect(r.optimizedPrompt).toContain("INSTRUCCIONES:");
    expect(r.optimizedPrompt).not.toContain("INSTRUCTIONS:");
  });

  test("purpose=study must set TASK_TYPE=study (not general)", () => {
    const r = analyzePrompt("Explain the derivative like I'm learning calculus.", "gpt", "en", "study");
    expect(r.optimizedPrompt).toContain("PURPOSE: study");
    expect(r.optimizedPrompt).toContain("TASK_TYPE: study");
  });

  test("purpose=translation must set translation-specific purpose and task type", () => {
    const r = analyzePrompt("Translate this to English: 'Buen día, ¿cómo estás?'", "gpt", "en", "translation");
    expect(r.optimizedPrompt).toContain("PURPOSE: translation");
    expect(r.optimizedPrompt).toContain("TASK_TYPE: translation");
    expect(r.optimizedPrompt.toLowerCase()).toContain("final translation");
  });

  test("purpose=summarization must set summarization-specific purpose and task type", () => {
    const r = analyzePrompt(
      `Summarize this article in 5 bullets:\n\nText: The launch improved retention by 12%.`,
      "gpt",
      "en",
      "summarization"
    );
    expect(r.optimizedPrompt).toContain("PURPOSE: summarization");
    expect(r.optimizedPrompt).toContain("TASK_TYPE: summarization");
    expect(r.optimizedPrompt.toLowerCase()).toContain("key ideas");
  });

  test("idempotent optimized prompt but higher score when analyzing optimized", () => {
    const r1 = analyzePrompt(
      "Write a short email to my boss asking for Friday off. Keep it polite.",
      "gpt",
      "en",
      "text"
    );

    const optimized = r1.optimizedPrompt;
    expect(typeof optimized).toBe("string");
    expect(optimized.length).toBeGreaterThan(30);

    const r2 = analyzePrompt(optimized, "gpt", "en", "text");

    expect(r2.optimizedPrompt).toBe(optimized);
    expect(Number(r2.score)).toBeGreaterThan(Number(r1.score));
  });
});

