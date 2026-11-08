// v1.8.0: refiner provider chain — Groq → Anthropic failover, Claude Haiku 5.5
// request shape (prompt caching + structured output), env configuration and
// the typed fallback reasons. Injected fetch only — no keys, no network.

import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { refinePromptAdaptive, isAdaptiveEnabled, buildSystemPromptParts, cacheableSystemPrompt } from "@/lib/refine/adaptive";
import { configuredProviderOrder, resolveProviderChain, ANTHROPIC_DEFAULT_MODEL } from "@/lib/llm/providers";
import type { RoutingDecision } from "@/lib/refine/router";
import { extractProtectedLiterals } from "@/lib/refine/literals";

const routing: RoutingDecision = { strategy: "message_polish", complexity: "simple", signals: [] };

const baseArgs = {
  originalPrompt: "Improve my email to the client at support@acme.com about invoice #123.",
  deterministicPrompt: "Improve my email to the client at support@acme.com about invoice #123.",
  target: "gpt",
  purpose: "text",
  taskType: "text",
  uiLang: "en" as const,
  routing,
};

const GOOD = {
  optimizedPrompt:
    "Write a concise, professional email to the client at support@acme.com about invoice #123. State the billing issue, the action you need from them, and the date you need a reply by.",
  summary: "Clarified the ask and kept the recipient and invoice number.",
  keyImprovements: ["Added explicit action request"],
  assumptions: [],
  followUpQuestions: [],
};

type Call = { url: string; body: Record<string, unknown>; headers: Record<string, string> };

function headersOf(init?: RequestInit): Record<string, string> {
  const h = init?.headers as { get?: (k: string) => string | null } | Record<string, string> | undefined;
  const out: Record<string, string> = {};
  for (const k of ["x-api-key", "authorization", "anthropic-version", "content-type"]) {
    const v = typeof (h as { get?: unknown })?.get === "function" ? (h as { get: (k: string) => string | null }).get(k) : (h as Record<string, string> | undefined)?.[k];
    if (v) out[k] = v;
  }
  return out;
}

function anthropicMessage(content: unknown, stop_reason = "end_turn") {
  return new Response(
    JSON.stringify({
      id: "msg_test",
      type: "message",
      role: "assistant",
      model: ANTHROPIC_DEFAULT_MODEL,
      content: [{ type: "text", text: typeof content === "string" ? content : JSON.stringify(content) }],
      stop_reason,
      stop_sequence: null,
      usage: { input_tokens: 10, output_tokens: 10 },
    }),
    { status: 200, headers: { "content-type": "application/json" } }
  );
}

function anthropicError(status: number, type: string) {
  return new Response(JSON.stringify({ type: "error", error: { type, message: type } }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function groqOk(content: unknown) {
  return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(content) } }] }), { status: 200 });
}

/** Route by host: each handler gets the call index for that host. */
function router(handlers: { groq?: (n: number) => Response | Promise<Response>; anthropic?: (n: number) => Response | Promise<Response> }) {
  const calls: Call[] = [];
  const counts = { groq: 0, anthropic: 0 };
  const impl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const body = typeof init?.body === "string" ? (JSON.parse(init.body) as Record<string, unknown>) : {};
    calls.push({ url, body, headers: headersOf(init) });
    if (url.includes("api.groq.com")) {
      if (!handlers.groq) throw new Error("unexpected groq call");
      return handlers.groq(counts.groq++);
    }
    if (url.includes("api.anthropic.com")) {
      if (!handlers.anthropic) throw new Error("unexpected anthropic call");
      return handlers.anthropic(counts.anthropic++);
    }
    throw new Error(`unexpected url ${url}`);
  }) as unknown as typeof fetch;
  return { impl, calls };
}

const ENV_KEYS = ["GROQ_API_KEY", "ANTHROPIC_API_KEY", "REFINER_PROVIDERS", "ANTHROPIC_REFINER_MODEL", "REFINER_TOTAL_TIMEOUT_MS"];
let saved: Record<string, string | undefined> = {};

beforeEach(() => {
  saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  for (const k of ENV_KEYS) delete process.env[k];
});
afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe("configuration", () => {
  test("no keys → nothing enabled, deterministic fallback 'disabled' (unchanged behavior)", async () => {
    expect(isAdaptiveEnabled()).toBe(false);
    expect(resolveProviderChain()).toEqual([]);
    const { impl, calls } = router({});
    const r = await refinePromptAdaptive({ ...baseArgs, fetchImpl: impl });
    expect(r.execution).toEqual({ engine: "deterministic", fallbackReason: "disabled" });
    expect(calls).toHaveLength(0);
  });

  test("default order is groq,anthropic; REFINER_PROVIDERS reorders and filters unknown ids", () => {
    expect(configuredProviderOrder()).toEqual(["groq", "anthropic"]);
    process.env.REFINER_PROVIDERS = "anthropic, bogus ,groq,anthropic";
    expect(configuredProviderOrder()).toEqual(["anthropic", "groq"]);
  });

  test("a provider without a key is skipped", () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test-1234567890";
    expect(resolveProviderChain().map((p) => p.id)).toEqual(["anthropic"]);
  });
});

describe("Anthropic (Claude Haiku 5.5) request", () => {
  test("system = cacheable block with cache_control + dynamic block; structured output; no sampling params", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test-1234567890";
    const { impl, calls } = router({ anthropic: () => anthropicMessage(GOOD) });
    const r = await refinePromptAdaptive({ ...baseArgs, fetchImpl: impl });

    expect(r.execution.engine).toBe("adaptive");
    expect(r.execution.provider).toBe("anthropic");
    expect(r.execution.model).toBe("claude-haiku-5-5");
    expect(r.optimizedPrompt).toBe(GOOD.optimizedPrompt);

    expect(calls).toHaveLength(1);
    const { url, body, headers } = calls[0];
    expect(url).toContain("api.anthropic.com/v1/messages");
    expect(`${headers["x-api-key"] ?? ""} ${headers.authorization ?? ""}`).toContain("sk-ant-test-1234567890");
    expect(headers["anthropic-version"]).toBeTruthy();
    expect(body.model).toBe("claude-haiku-5-5");
    expect(body.temperature).toBeUndefined();
    const system = body.system as Array<{ type: string; text: string; cache_control?: { type: string } }>;
    expect(system).toHaveLength(2);
    expect(system[0].cache_control).toEqual({ type: "ephemeral" });
    expect(system[0].text).toBe(cacheableSystemPrompt("en"));
    expect(system[1].cache_control).toBeUndefined();
    expect(system[1].text).toContain("ACTIVE STRATEGY: [message_polish]");
    expect(system[1].text).toContain("support@acme.com");
    const outputConfig = body.output_config as { effort: string; format: { type: string; schema: { required: string[] } } };
    expect(outputConfig.effort).toBe("low");
    expect(outputConfig.format.type).toBe("json_schema");
    expect(outputConfig.format.schema.required).toContain("optimizedPrompt");
  });

  test("ANTHROPIC_REFINER_MODEL overrides the model", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test-1234567890";
    process.env.ANTHROPIC_REFINER_MODEL = "claude-sonnet-5-5";
    const { impl, calls } = router({ anthropic: () => anthropicMessage(GOOD) });
    const r = await refinePromptAdaptive({ ...baseArgs, fetchImpl: impl });
    expect(calls[0].body.model).toBe("claude-sonnet-5-5");
    expect(r.execution.model).toBe("claude-sonnet-5-5");
  });

  test("the cacheable block is byte-identical across requests with different strategies, targets and literals", () => {
    const a = buildSystemPromptParts({ ...baseArgs, target: "claude" }, ["src/a.ts"]);
    const b = buildSystemPromptParts(
      { ...baseArgs, target: "gemini", routing: { strategy: "data_schema", complexity: "complex", signals: [] } },
      ["https://x.dev", "{{name}}"]
    );
    expect(a.cacheable).toBe(b.cacheable);
    expect(a.dynamic).not.toBe(b.dynamic);
    // Long enough to clear the 512-token minimum cacheable prefix (≈4 chars/token).
    expect(a.cacheable.length).toBeGreaterThan(2048 * 2);
  });

  test.each([
    [401, "authentication_error", "invalid_api_key"],
    [429, "rate_limit_error", "rate_limited"],
    [529, "overloaded_error", "provider_error"],
    [500, "api_error", "provider_error"],
  ] as const)("HTTP %s → %s", async (status, type, reason) => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test-1234567890";
    const { impl } = router({ anthropic: () => anthropicError(status, type) });
    const r = await refinePromptAdaptive({ ...baseArgs, fetchImpl: impl });
    expect(r.execution).toEqual({ engine: "deterministic", fallbackReason: reason });
    expect(r.optimizedPrompt).toBe(baseArgs.deterministicPrompt);
  });

  test("a refusal stop reason is an unsafe response, not a failover", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test-1234567890";
    process.env.GROQ_API_KEY = "gsk-test-1234567890";
    process.env.REFINER_PROVIDERS = "anthropic,groq";
    const { impl, calls } = router({ anthropic: () => anthropicMessage("", "refusal"), groq: () => groqOk(GOOD) });
    const r = await refinePromptAdaptive({ ...baseArgs, fetchImpl: impl });
    expect(r.execution.fallbackReason).toBe("unsafe_response");
    expect(calls.some((c) => c.url.includes("groq"))).toBe(false);
  });
});

describe("failover", () => {
  beforeEach(() => {
    process.env.GROQ_API_KEY = "gsk-test-1234567890";
    process.env.ANTHROPIC_API_KEY = "sk-ant-test-1234567890";
  });

  test.each([
    ["rate limited", () => new Response("slow down", { status: 429 })],
    ["server error", () => new Response("boom", { status: 503 })],
    ["empty body", () => new Response(JSON.stringify({ choices: [] }), { status: 200 })],
  ])("Groq %s → Anthropic answers", async (_label, groq) => {
    const { impl, calls } = router({ groq, anthropic: () => anthropicMessage(GOOD) });
    const r = await refinePromptAdaptive({ ...baseArgs, fetchImpl: impl });
    expect(r.execution.engine).toBe("adaptive");
    expect(r.execution.provider).toBe("anthropic");
    expect(calls.map((c) => (c.url.includes("groq") ? "groq" : "anthropic"))).toEqual(["groq", "anthropic"]);
  });

  test("Groq network failure → Anthropic answers", async () => {
    const { impl } = router({
      groq: () => {
        throw new TypeError("fetch failed");
      },
      anthropic: () => anthropicMessage(GOOD),
    });
    const r = await refinePromptAdaptive({ ...baseArgs, fetchImpl: impl });
    expect(r.execution.provider).toBe("anthropic");
  });

  test("both providers down → deterministic with the LAST typed reason", async () => {
    const { impl } = router({
      groq: () => new Response("x", { status: 429 }),
      anthropic: () => anthropicError(529, "overloaded_error"),
    });
    const r = await refinePromptAdaptive({ ...baseArgs, fetchImpl: impl });
    expect(r.execution).toEqual({ engine: "deterministic", fallbackReason: "provider_error" });
  });

  test("Groq answering keeps Anthropic untouched (primary first)", async () => {
    const { impl, calls } = router({ groq: () => groqOk(GOOD), anthropic: () => anthropicMessage(GOOD) });
    const r = await refinePromptAdaptive({ ...baseArgs, fetchImpl: impl });
    expect(r.execution.provider).toBe("groq");
    expect(calls).toHaveLength(1);
    // Groq still receives the pre-1.8 single-string system prompt.
    const messages = calls[0].body.messages as Array<{ role: string; content: string }>;
    expect(messages[0].role).toBe("system");
    const literals = extractProtectedLiterals(baseArgs.originalPrompt).map((l) => l.value);
    expect(messages[0].content).toBe(buildSystemPromptParts(baseArgs, literals).combined);
    expect(messages[0].content).toContain("Strategy: LIGHT POLISH");
  });

  test("a content failure is repaired on the provider that answered, not failed over", async () => {
    const { impl, calls } = router({
      groq: () => new Response("x", { status: 429 }),
      anthropic: (n) => (n === 0 ? anthropicMessage({ wrong: "shape" }) : anthropicMessage(GOOD)),
    });
    const r = await refinePromptAdaptive({ ...baseArgs, fetchImpl: impl });
    expect(r.execution.engine).toBe("adaptive");
    expect(r.execution.provider).toBe("anthropic");
    expect(r.execution.repaired).toBe(true);
    // groq(429) → anthropic(bad) → repair goes straight to anthropic.
    expect(calls.map((c) => (c.url.includes("groq") ? "groq" : "anthropic"))).toEqual(["groq", "anthropic", "anthropic"]);
  });

  test("an aborted request is 'superseded' and stops the chain", async () => {
    const controller = new AbortController();
    controller.abort();
    const { impl, calls } = router({ groq: () => groqOk(GOOD), anthropic: () => anthropicMessage(GOOD) });
    const r = await refinePromptAdaptive({ ...baseArgs, signal: controller.signal, fetchImpl: impl });
    expect(r.execution.fallbackReason).toBe("superseded");
    expect(calls).toHaveLength(0);
  });
});
