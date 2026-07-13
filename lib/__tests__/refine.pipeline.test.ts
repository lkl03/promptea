// Refinement pipeline units: protected literals, language detection,
// input budgeting, strategy routing, and deterministic non-bloat behavior.

import { describe, expect, test } from "vitest";
import { extractProtectedLiterals, literalsPreserved } from "@/lib/refine/literals";
import { detectPromptLanguage, languageMatches } from "@/lib/refine/language";
import { budgetPromptInput } from "@/lib/refine/budget";
import { classifyComplexity, selectStrategy } from "@/lib/refine/router";
import { analyzePrompt } from "@/lib/analyzePrompt";

describe("protected literals", () => {
  test("extracts URLs, paths, versions, code spans, and amounts", () => {
    const text =
      "Deploy https://promptea.app using `npm run build` on branch feat/v1.2.0-redesign. " +
      "Edit lib/models.ts and keep Next.js 16.1.1. Budget: $1500. Contact dev@eterlab.co";
    const found = extractProtectedLiterals(text).map((l) => l.value.toLowerCase());
    expect(found.some((v) => v.includes("https://promptea.app"))).toBe(true);
    expect(found.some((v) => v.includes("lib/models.ts"))).toBe(true);
    expect(found.some((v) => v.includes("16.1.1"))).toBe(true);
    expect(found.some((v) => v.includes("npm run build"))).toBe(true);
    expect(found.some((v) => v.includes("$1500"))).toBe(true);
    expect(found.some((v) => v.includes("dev@eterlab.co"))).toBe(true);
  });

  test("literalsPreserved flags missing literals", () => {
    const lits = extractProtectedLiterals("See https://example.com/docs and file src/app.ts");
    const bad = literalsPreserved(lits, "Rewritten prompt without the link.");
    expect(bad.ok).toBe(false);
    expect(bad.missing.length).toBeGreaterThan(0);

    const good = literalsPreserved(
      lits,
      "Improved: read https://example.com/docs then update src/app.ts accordingly."
    );
    expect(good.ok).toBe(true);
  });
});

describe("language detection", () => {
  test("detects Spanish", () => {
    expect(detectPromptLanguage("Necesito que escribas un resumen del siguiente texto para mi equipo").lang).toBe("es");
  });
  test("detects English", () => {
    expect(detectPromptLanguage("Please write a short summary of the following text for my team").lang).toBe("en");
  });
  test("languageMatches tolerates same-language rewrites and rejects switches", () => {
    expect(languageMatches("Escribí un mensaje claro para el cliente con los próximos pasos.", "es")).toBe(true);
    expect(
      languageMatches(
        "Write a clear, detailed message for the client that includes the next steps and the expected timeline for delivery.",
        "es"
      )
    ).toBe(false);
  });
});

describe("input budget", () => {
  test("keeps head, requirement lines, and tail for over-budget input", () => {
    const head = "GOAL: build the exporter.";
    const filler = Array.from({ length: 400 }, (_, i) => `filler sentence number ${i} with nothing important`).join(" ");
    const requirement = "\n- MUST output valid JSON with fields name, qty\n";
    const tail = "Final requirement: never drop the trailing config block.";
    const text = `${head}\n${filler}${requirement}${filler}\n${tail}`;

    const out = budgetPromptInput(text, 2000);
    expect(out.truncated).toBe(true);
    expect(out.text.length).toBeLessThanOrEqual(2100);
    expect(out.text).toContain(head);
    expect(out.text).toContain("Final requirement");
    expect(out.text).toContain("[...]");
  });

  test("returns text unchanged when under budget", () => {
    const out = budgetPromptInput("short prompt", 2000);
    expect(out.truncated).toBe(false);
    expect(out.text).toBe("short prompt");
  });
});

describe("strategy router", () => {
  test("short casual message routes to message_polish", () => {
    const d = selectStrategy({
      prompt: "Haceme más simpático este mensaje de WhatsApp para mi jefe",
      taskType: "text",
      purpose: "text",
    });
    expect(d.strategy).toBe("message_polish");
    expect(d.complexity).toBe("simple");
  });

  test("repository/agent task routes to agent_workflow", () => {
    const d = selectStrategy({
      prompt:
        "In the repo, create branch feat/exporter, implement lib/export.ts, run npm test and npm run lint, then open a PR against main with validation notes.",
      taskType: "coding",
      purpose: "code",
    });
    expect(d.strategy).toBe("agent_workflow");
  });

  test("strict JSON extraction routes to data_schema", () => {
    const d = selectStrategy({
      prompt: "Extract fields {name, qty, date} from the text and return ONLY valid JSON.",
      taskType: "data_extraction",
      purpose: "data",
    });
    expect(d.strategy).toBe("data_schema");
  });

  test("translation and summarization route to their strategies", () => {
    expect(
      selectStrategy({ prompt: "Traducí este texto al inglés", taskType: "translation", purpose: "translation" }).strategy
    ).toBe("translation");
    expect(
      selectStrategy({ prompt: "Summarize this article in 5 bullets", taskType: "summarization", purpose: "summarization" }).strategy
    ).toBe("summarization");
  });

  test("complexity scales with structure and length", () => {
    expect(classifyComplexity("Make this nicer")).toBe("simple");
    const complex = classifyComplexity(
      "Migrate the repo to the new build system.\n\n- update pipelines\n- rewrite config\n\n```yaml\nsteps: []\n```\n\nThen document everything and run the full CI suite across environments.",
      2
    );
    expect(complex).toBe("complex");
  });
});

describe("deterministic non-bloat (v1.2.0)", () => {
  test("simple prompt gets light body: no OUTPUT FORMAT / CONSTRAINTS scaffold", () => {
    const r = analyzePrompt("Haceme más claro este mensaje para mi equipo.", "gpt", "es", "text");
    expect(r.optimizedPrompt).toMatch(/^PROMPTEA: v/);
    expect(r.optimizedPrompt).toContain("TASK:");
    expect(r.optimizedPrompt).not.toContain("OUTPUT FORMAT:");
    expect(r.optimizedPrompt).not.toContain("RESTRICCIONES:");
    expect(r.meta.routing?.complexity).toBe("simple");
  });

  test("complex coding prompt keeps the full structured scaffold", () => {
    const prompt = `Fix this bug in Next.js 14.
Error: "Cannot read properties of undefined (reading 'map')"
Steps:
1) npm run dev
2) open /products
3) crash in ProductList

\`\`\`tsx
export function ProductList({ products }) { return products.map(p => p.name) }
\`\`\`

I need root cause, a minimal fix, and how to verify it.`;
    const r = analyzePrompt(prompt, "gpt", "en", "code");
    expect(r.meta.routing?.complexity).not.toBe("simple");
    expect(r.optimizedPrompt).toContain("OUTPUT FORMAT:");
    expect(r.optimizedPrompt).toContain("CONSTRAINTS:");
  });

  test("simple light output is idempotent on re-analysis", () => {
    const r1 = analyzePrompt("Mejorá este mensaje corto para un cliente.", "gpt", "es", "text");
    const r2 = analyzePrompt(r1.optimizedPrompt, "gpt", "es", "text");
    expect(r2.optimizedPrompt.trim()).toBe(r1.optimizedPrompt.trim());
  });
});
