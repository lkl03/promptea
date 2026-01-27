import { describe, expect, test } from "vitest";
import { analyzePrompt } from "@/lib/analyzePrompt";

function norm(s: string) {
  return (s ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function countOccurrences(haystack: string, needle: RegExp) {
  const m = haystack.match(needle);
  return m ? m.length : 0;
}

function extractTaskBlock(opt: string) {
  // para prompts markdown (no Claude XML)
  const m = opt.match(/(^|\n)\s*TASK:\s*\n([\s\S]*?)(?=\n\s*OUTPUT FORMAT\s*:|\n\s*$|$)/i);
  return norm(m?.[2] ?? "");
}

describe("Engine Contract — Idempotency", () => {
  test("GPT: optimizedPrompt debe ser idempotente al re-analizarlo", () => {
    const core = `Quiero que mejores este prompt para que sea claro.
Necesito que la respuesta sea en viñetas y con próximos pasos.`;

    const r1 = analyzePrompt(core, "gpt", "es");
    const opt1 = norm(r1.optimizedPrompt);

    const r2 = analyzePrompt(opt1, "gpt", "es");
    const opt2 = norm(r2.optimizedPrompt);

    const r3 = analyzePrompt(opt2, "gpt", "es");
    const opt3 = norm(r3.optimizedPrompt);

    // ✅ Invariante: no crece ni cambia de forma “acumulativa”
    expect(opt2).toBe(opt1);
    expect(opt3).toBe(opt1);

    // ✅ Invariante: OUTPUT FORMAT no se duplica
    expect(countOccurrences(opt1, /OUTPUT FORMAT\s*:/gi)).toBe(1);
  });

  test("Claude: optimizedPrompt debe ser idempotente al re-analizarlo", () => {
    const core = `Necesito que actúes como un asistente experto.
Quiero un resumen y luego próximos pasos.`;

    const r1 = analyzePrompt(core, "claude", "es");
    const opt1 = norm(r1.optimizedPrompt);

    const r2 = analyzePrompt(opt1, "claude", "es");
    const opt2 = norm(r2.optimizedPrompt);

    expect(opt2).toBe(opt1);
  });

  test("El TASK no debe “contaminarse” con OUTPUT FORMAT al re-analizar", () => {
    const core = `Arreglá este bug en Next.js. Te paso el error y el archivo.
Quiero un fix paso a paso y un patch final.`;

    const r1 = analyzePrompt(core, "gpt", "es");
    const opt1 = norm(r1.optimizedPrompt);

    const task1 = extractTaskBlock(opt1);
    expect(task1.length).toBeGreaterThan(0);

    const r2 = analyzePrompt(opt1, "gpt", "es");
    const opt2 = norm(r2.optimizedPrompt);

    const task2 = extractTaskBlock(opt2);

    // ✅ La parte TASK debe mantenerse igual
    expect(task2).toBe(task1);

    // ✅ Y OUTPUT FORMAT no debe terminar dentro del TASK
    expect(task2.toLowerCase()).not.toContain("output format");
  });

  test("meta.engineVersion debe existir", () => {
    const r = analyzePrompt("Hola", "gpt", "es");
    expect(typeof r.meta?.engineVersion).toBe("string");
    expect(r.meta.engineVersion.length).toBeGreaterThan(0);
  });
});
