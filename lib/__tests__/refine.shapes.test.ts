// v1.3.0 shape-preserving personalization invariants:
// 1. Cross-input structural diversity — different task types produce
//    meaningfully different output shapes (no shared scaffold).
// 2. Same-input stability — re-processing an optimized prompt never
//    rewrites or inflates it (deterministic path).
// 3. Minimal edits — already-strong prompts come back untouched with the
//    adaptive layer skipped (already_optimized).
// 4. Natural formats survive — short messages and email requests stay
//    natural; no metadata header anywhere.

import { describe, expect, test } from "vitest";
import { analyzePrompt } from "@/lib/engine";

const CASES = [
  {
    id: "short-message",
    prompt: "ayudame a escribir un mensaje para avisar que llego tarde",
    purpose: "text",
    lang: "es" as const,
  },
  {
    id: "email-request",
    prompt: "Necesito un mail para mi cliente Carla avisando que la entrega se pasa al 15/09 y proponiendo una llamada.",
    purpose: "text",
    lang: "es" as const,
  },
  {
    id: "repo-implementation",
    prompt:
      "In the repo acme/api create branch feat/limits, implement src/middleware/rateLimit.ts with tests, run npm test and npm run lint, then open a PR against main.",
    purpose: "code",
    lang: "en" as const,
  },
  {
    id: "data-extraction",
    prompt: "Extract sku, qty and price from the order lines and return ONLY valid JSON with fields sku, qty, price; missing values as null.",
    purpose: "data",
    lang: "en" as const,
  },
  {
    id: "image-generation",
    prompt: "una ilustración de un faro en una tormenta, estilo acuarela, tonos fríos, relación de aspecto 4:5",
    purpose: "image",
    lang: "es" as const,
  },
  {
    id: "translation",
    prompt:
      "Traducí este texto al inglés preservando los placeholders {{name}} y {{date}} y el formato de la lista:\n- Punto uno\n- Punto dos con {{name}}\n- Cierre con {{date}}",
    purpose: "translation",
    lang: "es" as const,
  },
  {
    id: "summarization",
    prompt:
      "Summarize the following meeting notes for an executive audience, decisions first, risks second, then open questions. The meeting covered budget overruns in Q3, a delayed vendor contract, and the hiring freeze exception for the data team.",
    purpose: "summarization",
    lang: "en" as const,
  },
  {
    id: "marketing-brief",
    prompt:
      "Escribí el copy de lanzamiento para nuestra app Nube: 3 variantes para Instagram, audiencia jóvenes profesionales, tono cercano, cada una con hook, beneficio y CTA. La marca nunca promete rendimientos.",
    purpose: "marketing",
    lang: "es" as const,
  },
] as const;

function headingsOf(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^[A-ZÁÉÍÓÚÜÑ][A-ZÁÉÍÓÚÜÑ &/]+:$/.test(line));
}

describe("shape-preserving personalization", () => {
  test("cross-input structural diversity: no two task families share the same scaffold", () => {
    const shapes = new Map<string, string[]>();
    for (const c of CASES) {
      const r = analyzePrompt(c.prompt, "gpt", c.lang, c.purpose);
      shapes.set(c.id, headingsOf(r.optimizedPrompt));
    }

    // Natural cases stay heading-free…
    expect(shapes.get("short-message")).toEqual([]);
    expect(shapes.get("email-request")).toEqual([]);

    // …structured cases get headings…
    for (const id of ["repo-implementation", "data-extraction", "image-generation"]) {
      expect((shapes.get(id) ?? []).length, id).toBeGreaterThanOrEqual(2);
    }

    // …and the structured heading SETS differ between task families.
    const structured = ["repo-implementation", "data-extraction", "image-generation", "translation", "summarization"]
      .map((id) => (shapes.get(id) ?? []).join("|"))
      .filter((s) => s.length > 0);
    expect(new Set(structured).size).toBe(structured.length);
  });

  test("same-input stability: three passes are byte-identical, never inflating", () => {
    for (const c of CASES) {
      const r1 = analyzePrompt(c.prompt, "claude", c.lang, c.purpose);
      const r2 = analyzePrompt(r1.optimizedPrompt, "claude", c.lang, c.purpose);
      const r3 = analyzePrompt(r2.optimizedPrompt, "claude", c.lang, c.purpose);
      expect(r2.optimizedPrompt, c.id).toBe(r1.optimizedPrompt);
      expect(r3.optimizedPrompt, c.id).toBe(r2.optimizedPrompt);
      expect(r3.optimizedPrompt.length).toBeLessThanOrEqual(r1.optimizedPrompt.length);
    }
  });

  test("no metadata header in any output; growth stays bounded", () => {
    for (const c of CASES) {
      const r = analyzePrompt(c.prompt, "gemini", c.lang, c.purpose);
      expect(r.optimizedPrompt).not.toMatch(/^PROMPTEA:/im);
      expect(r.optimizedPrompt).not.toMatch(/^MODEL:\s/m);
      expect(r.optimizedPrompt).not.toMatch(/^TASK_TYPE:\s/m);
      // Deterministic build must not balloon a prompt (headings included).
      expect(r.optimizedPrompt.length).toBeLessThanOrEqual(Math.max(c.prompt.length * 4, 900));
    }
  });

  test("short natural prompts stay short natural messages", () => {
    const r = analyzePrompt("ayudame a escribir un mensaje para avisar que llego tarde", "gpt", "es", "text");
    const lines = r.optimizedPrompt.split("\n").filter((l) => l.trim().length > 0);
    expect(lines.length).toBeLessThanOrEqual(3);
    expect(r.optimizedPrompt).toContain("ayudame a escribir un mensaje para avisar que llego tarde");
  });

  test("email requests stay email-oriented without a framework scaffold", () => {
    const r = analyzePrompt(
      "Necesito un mail para mi cliente Carla avisando que la entrega se pasa al 15/09 y proponiendo una llamada.",
      "gpt",
      "es",
      "text"
    );
    expect(headingsOf(r.optimizedPrompt)).toEqual([]);
    expect(r.optimizedPrompt).toContain("Carla");
    expect(r.optimizedPrompt).toContain("15/09");
  });

  test("translation preserves placeholders and list formatting exactly", () => {
    const prompt =
      "Traducí este texto al inglés preservando los placeholders {{name}} y {{date}}:\n- Punto uno\n- Punto dos con {{name}}";
    const r = analyzePrompt(prompt, "gpt", "es", "translation");
    expect(r.optimizedPrompt).toContain("{{name}}");
    expect(r.optimizedPrompt).toContain("{{date}}");
    expect(r.optimizedPrompt).toContain("- Punto dos con {{name}}");
  });

  test("already-strong prompts get minimal edits: returned untouched + adaptive skipped", () => {
    const strong = [
      "OBJETIVO:",
      "En el repo acme/api creá la rama feat/export, implementá lib/export.ts con tests en tests/export.test.ts, corré npm test y npm run lint, y abrí un PR a main.",
      "",
      "PASOS Y VALIDACIÓN:",
      "- Antes de tocar código, revisá la estructura del repo y confirmá los archivos afectados.",
      "- Ejecutá los tests o comandos de validación existentes antes de dar por terminado.",
      "- Si un requisito es ambiguo, preguntá antes de implementar.",
      "- Para Claude: si el input es largo, delimitá contexto con etiquetas tipo <context> o <source_text>.",
    ].join("\n");

    const r = analyzePrompt(strong, "claude", "es", "code");
    expect(r.optimizedPrompt).toBe(strong);
    expect(r.meta.alreadyOptimized).toBe(true);
  });

  test("legacy v1.2 headers are migrated into the new shapes, never passed through", () => {
    const legacy = [
      "PROMPTEA: v1.2.3",
      "MODEL: GPT",
      "PURPOSE: text",
      "TASK_TYPE: text",
      "",
      "INSTRUCTIONS:",
      "- Respond in the UI language.",
      "",
      "TASK:",
      "write a friendly reminder about tomorrow's meeting",
      "",
      "OUTPUT FORMAT:",
      "- Respond in clear sections.",
      "",
      "CONSTRAINTS:",
      "- Do not invent facts.",
    ].join("\n");

    const r = analyzePrompt(legacy, "gpt", "en", "text");
    expect(r.optimizedPrompt).not.toMatch(/PROMPTEA:/i);
    expect(r.optimizedPrompt).toContain("write a friendly reminder about tomorrow's meeting");
    expect(r.meta.alreadyOptimized).toBeFalsy();
  });
});
