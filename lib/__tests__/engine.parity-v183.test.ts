// v1.8.3 (engine 2.4.1) — the same request written in Spanish, English and
// Portuguese must get the same findings. The release QA found two detectors
// whose word lists were not equivalent across languages (scripts/release/engine-qa.mjs).

import { describe, expect, test } from "vitest";
import { analyzePrompt } from "@/lib/analyzePrompt";

const ids = (prompt: string, lang: "es" | "en" | "pt", purpose: "marketing" | "summarization") =>
  analyzePrompt(prompt, "claude", lang, purpose).findings.map((f) => f.id).sort();

describe("detector parity across languages", () => {
  test("a summary asked for in 'five bullet points' states its length in every language", () => {
    const en = ids("Summarize the following meeting notes in five bullet points with owners and deadlines.", "en", "summarization");
    const es = ids("Resumí las siguientes notas de reunión en cinco viñetas con responsables y fechas límite.", "es", "summarization");
    const pt = ids("Resuma as seguintes anotações de reunião em cinco tópicos com responsáveis e prazos.", "pt", "summarization");
    expect(en).not.toContain("missing_summary_length");
    expect(en).toEqual(es);
    expect(en).toEqual(pt);
  });

  test("a summary with no length at all still gets the finding", () => {
    expect(ids("Summarize the following meeting notes.", "en", "summarization")).toContain("missing_summary_length");
  });

  test("marketing copy 'for returning customers' names its audience in every language", () => {
    const en = ids("Write three subject lines for an email announcing a 20% discount on running shoes for returning customers.", "en", "marketing");
    const es = ids("Escribí tres asuntos para un mail que anuncia 20 % de descuento en zapatillas de running para clientes recurrentes.", "es", "marketing");
    const pt = ids("Escreva três assuntos para um e-mail que anuncia 20% de desconto em tênis de corrida para clientes recorrentes.", "pt", "marketing");
    expect(es).not.toContain("missing_marketing_audience");
    expect(es).toEqual(en);
    expect(es).toEqual(pt);
  });

  test("marketing copy with no audience still gets the finding", () => {
    expect(ids("Escribí tres asuntos para un mail que anuncia un descuento.", "es", "marketing")).toContain("missing_marketing_audience");
  });
});
