// Adaptive refinement layer: quality gate + every external failure class
// falls back to the deterministic baseline with a typed reason. Uses an
// injected fetch — no network.

import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { refinePromptAdaptive } from "@/lib/refine/adaptive";
import { runQualityGate } from "@/lib/refine/qualityGate";
import { extractProtectedLiterals } from "@/lib/refine/literals";
import type { RoutingDecision } from "@/lib/refine/router";

const routing: RoutingDecision = { strategy: "message_polish", complexity: "simple", signals: [] };

const DET = `PROMPTEA: v1.2.0
MODEL: GPT
PURPOSE: text
TASK_TYPE: text

INSTRUCTIONS:
- Be specific.

TASK:
Improve my email to the client at support@acme.com about invoice #123.`;

const HEADER = DET.split("\n").slice(0, 4).join("\n");

const baseArgs = {
  originalPrompt: "Improve my email to the client at support@acme.com about invoice #123.",
  deterministicPrompt: DET,
  target: "gpt",
  purpose: "text",
  taskType: "text",
  uiLang: "en" as const,
  routing,
};

function groqResponse(content: unknown, status = 200): typeof fetch {
  return (async () =>
    new Response(
      JSON.stringify({ choices: [{ message: { content: typeof content === "string" ? content : JSON.stringify(content) } }] }),
      { status }
    )) as unknown as typeof fetch;
}

function groqHttpError(status: number): typeof fetch {
  return (async () => new Response("err", { status })) as unknown as typeof fetch;
}

const GOOD_LLM_JSON = {
  optimizedPrompt: `${HEADER}\n\nTASK:\nWrite a concise, professional email to the client at support@acme.com about invoice #123, stating the issue and the requested action.`,
  summary: "Clarified the ask and kept the recipient and invoice number.",
  keyImprovements: ["Added explicit action request"],
  assumptions: [],
  followUpQuestions: [],
};

describe("refinePromptAdaptive fallback classes", () => {
  beforeEach(() => {
    process.env.GROQ_API_KEY = "test-key-1234567890";
  });
  afterEach(() => {
    delete process.env.GROQ_API_KEY;
  });

  test("disabled: no API key", async () => {
    delete process.env.GROQ_API_KEY;
    const r = await refinePromptAdaptive(baseArgs);
    expect(r.execution.engine).toBe("deterministic");
    expect(r.execution.fallbackReason).toBe("disabled");
    expect(r.optimizedPrompt).toBe(DET);
  });

  test("invalid_api_key: 401", async () => {
    const r = await refinePromptAdaptive({ ...baseArgs, fetchImpl: groqHttpError(401) });
    expect(r.execution.fallbackReason).toBe("invalid_api_key");
    expect(r.optimizedPrompt).toBe(DET);
  });

  test("rate_limited: 429", async () => {
    const r = await refinePromptAdaptive({ ...baseArgs, fetchImpl: groqHttpError(429) });
    expect(r.execution.fallbackReason).toBe("rate_limited");
  });

  test("provider_error: 500", async () => {
    const r = await refinePromptAdaptive({ ...baseArgs, fetchImpl: groqHttpError(500) });
    expect(r.execution.fallbackReason).toBe("provider_error");
  });

  test("timeout / network failure", async () => {
    const failingFetch = (async () => {
      const err = new Error("aborted");
      (err as Error & { name: string }).name = "TimeoutError";
      throw err;
    }) as unknown as typeof fetch;
    const r = await refinePromptAdaptive({ ...baseArgs, fetchImpl: failingFetch });
    expect(r.execution.fallbackReason).toBe("timeout");
  });

  test("invalid_json: non-JSON content", async () => {
    const r = await refinePromptAdaptive({ ...baseArgs, fetchImpl: groqResponse("not json at all") });
    expect(r.execution.fallbackReason).toBe("invalid_json");
  });

  test("empty_response", async () => {
    const emptyFetch = (async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: "" } }] }), { status: 200 })) as unknown as typeof fetch;
    const r = await refinePromptAdaptive({ ...baseArgs, fetchImpl: emptyFetch });
    expect(r.execution.fallbackReason).toBe("empty_response");
  });

  test("schema_mismatch: JSON without required fields (after bounded retry)", async () => {
    const r = await refinePromptAdaptive({ ...baseArgs, fetchImpl: groqResponse({ wrong: "shape" }) });
    expect(r.execution.engine).toBe("deterministic");
    expect(r.execution.fallbackReason).toBe("schema_mismatch");
  });

  test("protected_literal_loss: rewrite drops the email + invoice number", async () => {
    const bad = {
      ...GOOD_LLM_JSON,
      optimizedPrompt: `${HEADER}\n\nTASK:\nWrite a nice email to the client about the billing topic.`,
    };
    const r = await refinePromptAdaptive({ ...baseArgs, fetchImpl: groqResponse(bad) });
    expect(r.execution.engine).toBe("deterministic");
    expect(r.execution.fallbackReason).toBe("protected_literal_loss");
  });

  test("unsafe_response: rewrite answers the task instead of improving the prompt", async () => {
    const bad = {
      ...GOOD_LLM_JSON,
      optimizedPrompt: `${HEADER}\nHere is the answer: Dear client at support@acme.com, regarding invoice #123...`,
    };
    const r = await refinePromptAdaptive({ ...baseArgs, fetchImpl: groqResponse(bad) });
    expect(r.execution.engine).toBe("deterministic");
    expect(["unsafe_response", "quality_gate_failed"]).toContain(r.execution.fallbackReason);
  });

  test("superseded: pre-aborted signal", async () => {
    const controller = new AbortController();
    controller.abort();
    const r = await refinePromptAdaptive({ ...baseArgs, signal: controller.signal, fetchImpl: groqResponse(GOOD_LLM_JSON) });
    expect(r.execution.fallbackReason).toBe("superseded");
  });

  test("success: valid rewrite passes gate and returns adaptive result", async () => {
    const r = await refinePromptAdaptive({ ...baseArgs, fetchImpl: groqResponse(GOOD_LLM_JSON) });
    expect(r.execution.engine).toBe("adaptive");
    expect(r.execution.provider).toBe("groq");
    expect(r.optimizedPrompt.startsWith(HEADER)).toBe(true);
    expect(r.summary.length).toBeGreaterThan(0);
    expect(r.quality.passed).toBe(true);
  });

  test("repair: first bad schema then good response succeeds with repaired flag", async () => {
    let call = 0;
    const flaky = (async () => {
      call += 1;
      const content = call === 1 ? JSON.stringify({ nope: true }) : JSON.stringify(GOOD_LLM_JSON);
      return new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });
    }) as unknown as typeof fetch;
    const r = await refinePromptAdaptive({ ...baseArgs, fetchImpl: flaky });
    expect(r.execution.engine).toBe("adaptive");
    expect(r.execution.repaired).toBe(true);
    expect(call).toBe(2);
  });
});

describe("quality gate directly", () => {
  const literals = extractProtectedLiterals("Keep https://a.dev/x and file src/x.ts and $200");

  test("rejects header loss, language switch, and verbosity explosions", () => {
    const gate = runQualityGate({
      original: "Keep https://a.dev/x and file src/x.ts and $200",
      deterministic: "PROMPTEA: v1.2.0\nMODEL: GPT\nPURPOSE: text\nTASK_TYPE: text\n\nTASK:\nshort",
      candidate: "totally different text ".repeat(400),
      language: "en",
      literals,
      requiredHeader: "PROMPTEA: v1.2.0\nMODEL: GPT\nPURPOSE: text\nTASK_TYPE: text",
    });
    expect(gate.passed).toBe(false);
    expect(gate.failures).toContain("header_lost");
    expect(gate.failures).toContain("protected_literal_loss");
  });

  test("keeps JSON demand", () => {
    const header = "PROMPTEA: v1.2.0\nMODEL: GPT\nPURPOSE: data\nTASK_TYPE: data_extraction";
    const gate = runQualityGate({
      original: "Return ONLY valid JSON with fields a,b",
      deterministic: `${header}\n\nTASK:\nx`,
      candidate: `${header}\n\nTASK:\nExtract the fields a and b from the text and answer in plain prose.`,
      language: "en",
      literals: [],
      requiredHeader: header,
    });
    expect(gate.passed).toBe(false);
    expect(gate.failures).toContain("format_requirement_lost");
  });
});
