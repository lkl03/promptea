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

    // ✅ idempotencia del prompt optimizado (no se “re-escribe”)
    expect(r2.optimizedPrompt).toBe(optimized);

    // ✅ pero el score del optimizado tiene que subir vs el original
    expect(Number(r2.score)).toBeGreaterThan(Number(r1.score));
  });
});
