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

    // ✅ Invariante: OUTPUT FORMAT no se duplica.
    // v1.2.0: prompts simples usan el path liviano sin sección OUTPUT FORMAT,
    // así que el invariante es "como máximo una vez", nunca duplicado.
    expect(countOccurrences(opt1, /OUTPUT FORMAT\s*:/gi)).toBeLessThanOrEqual(1);
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

  test("El core no debe “contaminarse” ni duplicarse al re-analizar", () => {
    const core = `Arreglá este bug en Next.js. Te paso el error y el archivo.
Quiero un fix paso a paso y un patch final.`;

    const r1 = analyzePrompt(core, "gpt", "es");
    const opt1 = norm(r1.optimizedPrompt);
    expect(opt1.length).toBeGreaterThan(0);

    const r2 = analyzePrompt(opt1, "gpt", "es");
    const opt2 = norm(r2.optimizedPrompt);

    const r3 = analyzePrompt(opt2, "gpt", "es");
    const opt3 = norm(r3.optimizedPrompt);

    // ✅ Estabilidad byte a byte en 3 pasadas (v1.3.0: sin firma de header,
    // el extractor recupera el core desde el heading del shape y reconstruye
    // idéntico).
    expect(opt2).toBe(opt1);
    expect(opt3).toBe(opt1);

    // ✅ El texto del usuario aparece exactamente UNA vez — nunca anidado
    // dentro de otra sección ni duplicado.
    expect(countOccurrences(opt1, /Arreglá este bug en Next\.js\./g)).toBe(1);
    expect(countOccurrences(opt1, /Quiero un fix paso a paso y un patch final\./g)).toBe(1);

    // ✅ Sin scaffolding legacy: ni header de metadata ni OUTPUT FORMAT.
    expect(opt1).not.toMatch(/^PROMPTEA:/i);
    expect(opt1.toLowerCase()).not.toContain("output format");
  });

  test("meta.engineVersion debe existir", () => {
    const r = analyzePrompt("Hola", "gpt", "es");
    expect(typeof r.meta?.engineVersion).toBe("string");
    expect(r.meta.engineVersion.length).toBeGreaterThan(0);
  });
});
