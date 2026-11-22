// v1.8.9 — the Claude spend guard: prices, worst case, caps, the ledger and
// the guarded call. Injected fetch and an in-memory ledger: no key, no network.

import { afterEach, beforeEach, describe, expect, test } from "vitest";
import {
  CACHE_WRITE_RATIO,
  MODEL_PRICES,
  costFromUsage,
  isPricedModel,
  maxTokensForText,
  microsToUsd,
  priceOf,
  usdToMicros,
  worstCaseMicros,
} from "@/lib/ai/pricing";
import { budgetLimits, createMemoryBudgetStore, decide, periodKeys, quotaDocId, setBudgetStore } from "@/lib/ai/budget";
import { callClaudeJson, hasAnthropicKey, type ClaudeJsonRequest } from "@/lib/ai/claude";

const KEY = "sk-ant-test-1234567890";

function claudeOk(text: string, usage = { input_tokens: 1200, output_tokens: 800, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 }, stop_reason = "end_turn") {
  return new Response(
    JSON.stringify({ id: "msg_test", type: "message", role: "assistant", model: "claude-haiku-5-5", content: [{ type: "text", text }], stop_reason, stop_sequence: null, usage }),
    { status: 200, headers: { "content-type": "application/json" } }
  );
}

function claudeError(status: number, type: string) {
  return new Response(JSON.stringify({ type: "error", error: { type, message: type } }), { status, headers: { "content-type": "application/json" } });
}

function fakeFetch(handler: () => Response) {
  const calls: Array<{ url: string; body: Record<string, unknown> }> = [];
  const impl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), body: JSON.parse(String(init?.body ?? "{}")) });
    return handler();
  }) as unknown as typeof fetch;
  return { impl, calls };
}

const NOW = new Date("2026-11-22T15:00:00Z");

function request(overrides: Partial<ClaudeJsonRequest> = {}): ClaudeJsonRequest {
  return {
    feature: "flow",
    model: "claude-haiku-5-5",
    systemCacheable: "S".repeat(3000),
    systemDynamic: "Response language: English.",
    messages: [{ role: "user", content: "Plan my launch." }],
    jsonSchema: { type: "object", properties: { a: { type: "string" } }, required: ["a"], additionalProperties: false },
    maxTokens: 3000,
    effort: "low",
    timeoutMs: 5000,
    userKey: "client_hash_1",
    now: NOW,
    env: { ANTHROPIC_API_KEY: KEY },
    ...overrides,
  };
}

describe("pricing (skill table, checked 2026-11-22)", () => {
  test("Claude Haiku 5.5 / Sonnet 5.5 / Opus 5.5 base prices", () => {
    expect(MODEL_PRICES["claude-haiku-5-5"]).toMatchObject({ input: 0.1, output: 0.5, cacheReadRatio: 0.1 });
    expect(MODEL_PRICES["claude-sonnet-5-5"]).toMatchObject({ input: 2, output: 10, cacheReadRatio: 0.05 });
    expect(MODEL_PRICES["claude-opus-5-5"]).toMatchObject({ input: 4, output: 20, cacheReadRatio: 0.05 });
    expect(CACHE_WRITE_RATIO).toBe(1.25);
  });

  test("cost from usage, in micro-dollars (tokens × USD per MTok)", () => {
    expect(costFromUsage("claude-haiku-5-5", { input_tokens: 1000, output_tokens: 500 })).toBe(350);
    // 2,000 cache-write tokens at 1.25 × $0.10 + 3,000 cache-read at 0.1 × $0.10
    expect(costFromUsage("claude-haiku-5-5", { input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 2000, cache_read_input_tokens: 3000 })).toBe(280);
    // Sonnet 5.5 cache reads are 0.05 × input
    expect(costFromUsage("claude-sonnet-5-5", { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 1000 })).toBe(100);
  });

  test("Haiku's long-prompt tier applies above 100K prompt tokens", () => {
    expect(costFromUsage("claude-haiku-5-5", { input_tokens: 100_001, output_tokens: 0 })).toBe(Math.ceil(100_001 * 0.5));
  });

  test("an unknown model id is priced as the dearest model (a typo can only make the guard stricter)", () => {
    expect(isPricedModel("claude-haiku-5-5-typo")).toBe(false);
    expect(priceOf("claude-haiku-5-5-typo")).toEqual(MODEL_PRICES["claude-opus-5-5"]);
  });

  test("the worst case is an upper bound of any real call within the same input and max_tokens", () => {
    const system = "You are a planner. ".repeat(200);
    const bytes = maxTokensForText(system);
    for (const model of Object.keys(MODEL_PRICES)) {
      const worst = worstCaseMicros(model, bytes, 3000);
      for (const [write, read, plain, out] of [
        [bytes, 0, 0, 3000],
        [0, bytes, 0, 3000],
        [0, 0, bytes, 3000],
        [bytes / 2, bytes / 4, bytes / 4, 1500],
      ]) {
        const real = costFromUsage(model, { input_tokens: plain, output_tokens: out, cache_creation_input_tokens: write, cache_read_input_tokens: read });
        expect(real).toBeLessThanOrEqual(worst);
      }
    }
  });

  test("micro-dollar conversions", () => {
    expect(usdToMicros(90)).toBe(90_000_000);
    expect(microsToUsd(1_234_567)).toBeCloseTo(1.234567, 6);
  });
});

describe("caps from env", () => {
  test("defaults: $100 budget, stop at 90 % ($90), $6 a day, 12 flows and 40 rewrites per visitor", () => {
    const l = budgetLimits({});
    expect(l.enabled).toBe(true);
    expect(l.monthlyBudgetMicros).toBe(100_000_000);
    expect(l.monthlyCapMicros).toBe(90_000_000);
    expect(l.dailyCapMicros).toBe(6_000_000);
    expect(l.userDailyRequests).toEqual({ flow: 12, refine: 40 });
  });

  test("overrides, garbage values fall back, the daily cap never exceeds the monthly one", () => {
    const l = budgetLimits({ AI_MONTHLY_BUDGET_USD: "20", AI_BUDGET_SAFETY_RATIO: "0.5", AI_DAILY_BUDGET_USD: "500", AI_USER_DAILY_LIMIT: "3" });
    expect(l.monthlyCapMicros).toBe(10_000_000);
    expect(l.dailyCapMicros).toBe(10_000_000);
    expect(l.userDailyRequests.flow).toBe(3);
    const g = budgetLimits({ AI_MONTHLY_BUDGET_USD: "lots", AI_BUDGET_SAFETY_RATIO: "7" });
    expect(g.monthlyCapMicros).toBe(100_000_000); // ratio clamped to 1, budget back to 100
  });

  test("AI_FEATURES_ENABLED=0 is a kill switch", () => {
    for (const v of ["0", "off", "false", "OFF"]) expect(budgetLimits({ AI_FEATURES_ENABLED: v }).enabled).toBe(false);
    expect(budgetLimits({ AI_FEATURES_ENABLED: "1" }).enabled).toBe(true);
  });

  test("UTC period keys and quota ids", () => {
    expect(periodKeys(new Date("2026-11-30T23:59:59Z"))).toEqual({ month: "2026-11", day: "2026-11-30" });
    expect(periodKeys(new Date("2026-12-01T00:00:00Z"))).toEqual({ month: "2026-12", day: "2026-12-01" });
    expect(quotaDocId("2026-11-22", "flow", "abc")).toBe("2026-11-22_flow_abc");
  });
});

describe("decide()", () => {
  const limits = budgetLimits({});
  const req = { feature: "flow" as const, worstMicros: 5000, userKey: "k" };
  test("allowed under every cap", () => {
    expect(decide({ monthSpentMicros: 0, daySpentMicros: 0, userRequestsToday: 0 }, req, limits)).toEqual({ ok: true });
  });
  test("a reservation that would cross the monthly stop is refused", () => {
    expect(decide({ monthSpentMicros: 89_996_000, daySpentMicros: 0, userRequestsToday: 0 }, req, limits)).toEqual({ ok: false, reason: "budget_month" });
  });
  test("…or the daily cap", () => {
    expect(decide({ monthSpentMicros: 0, daySpentMicros: 5_996_000, userRequestsToday: 0 }, req, limits)).toEqual({ ok: false, reason: "budget_day" });
  });
  test("…or the visitor's daily quota (only with a client key)", () => {
    expect(decide({ monthSpentMicros: 0, daySpentMicros: 0, userRequestsToday: 12 }, req, limits)).toEqual({ ok: false, reason: "user_quota" });
    expect(decide({ monthSpentMicros: 0, daySpentMicros: 0, userRequestsToday: 12 }, { ...req, userKey: null }, limits)).toEqual({ ok: true });
  });
});

describe("in-memory ledger", () => {
  test("reserve the worst case, settle to the real cost; a timeout keeps the reservation", async () => {
    const store = createMemoryBudgetStore();
    const limits = budgetLimits({});
    const r = await store.reserve({ feature: "flow", model: "claude-haiku-5-5", worstMicros: 4000, userKey: "k", now: NOW }, limits);
    expect(r.ok).toBe(true);
    expect((await store.snapshot(NOW)).monthSpentMicros).toBe(4000);
    if (r.ok) await store.settle(r.ticket, 1500, { inputTokens: 10, outputTokens: 20, cacheReadTokens: 0, cacheWriteTokens: 0 });
    let s = await store.snapshot(NOW);
    expect(s.monthSpentMicros).toBe(1500);
    expect(s.daySpentMicros).toBe(1500);
    expect(s.byFeature.flow).toEqual({ spentMicros: 1500, requests: 1 });
    const r2 = await store.reserve({ feature: "flow", model: "claude-haiku-5-5", worstMicros: 4000, userKey: "k", now: NOW }, limits);
    if (r2.ok) await store.settle(r2.ticket, null);
    s = await store.snapshot(NOW);
    expect(s.monthSpentMicros).toBe(5500);
  });

  test("reservations add up to the cap and then stop", async () => {
    const store = createMemoryBudgetStore();
    const limits = budgetLimits({ AI_MONTHLY_BUDGET_USD: "0.01", AI_BUDGET_SAFETY_RATIO: "1", AI_DAILY_BUDGET_USD: "0.01" }); // 10,000 µ$
    const results = [];
    for (let i = 0; i < 4; i++) results.push(await store.reserve({ feature: "flow", model: "m", worstMicros: 3000, userKey: null, now: NOW }, limits));
    expect(results.map((r) => r.ok)).toEqual([true, true, true, false]);
    expect(results[3]).toEqual({ ok: false, reason: "budget_month" });
  });

  test("the visitor quota is per feature", async () => {
    const store = createMemoryBudgetStore();
    const limits = budgetLimits({ AI_USER_DAILY_LIMIT: "1", AI_REFINE_USER_DAILY_LIMIT: "1" });
    const ask = (feature: "flow" | "refine") => store.reserve({ feature, model: "m", worstMicros: 1, userKey: "k", now: NOW }, limits);
    expect((await ask("flow")).ok).toBe(true);
    expect(await ask("flow")).toEqual({ ok: false, reason: "user_quota" });
    expect((await ask("refine")).ok).toBe(true);
  });
});

describe("callClaudeJson (the only door to the Claude API)", () => {
  let store: ReturnType<typeof createMemoryBudgetStore>;
  beforeEach(() => {
    store = createMemoryBudgetStore();
    setBudgetStore(store);
  });
  afterEach(() => setBudgetStore(undefined));

  test("no key → missing_api_key, nothing sent, nothing charged", async () => {
    const { impl, calls } = fakeFetch(() => claudeOk("{}"));
    const r = await callClaudeJson(request({ env: {}, fetchImpl: impl }));
    expect(r).toEqual({ ok: false, reason: "missing_api_key", model: "claude-haiku-5-5" });
    expect(calls).toHaveLength(0);
    expect(hasAnthropicKey({})).toBe(false);
  });

  test("kill switch → disabled, nothing sent", async () => {
    const { impl, calls } = fakeFetch(() => claudeOk("{}"));
    const r = await callClaudeJson(request({ env: { ANTHROPIC_API_KEY: KEY, AI_FEATURES_ENABLED: "0" }, fetchImpl: impl }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("disabled");
    expect(calls).toHaveLength(0);
  });

  test("a cap that cannot fit the worst case → budget_month, nothing sent", async () => {
    const { impl, calls } = fakeFetch(() => claudeOk("{}"));
    const r = await callClaudeJson(request({ env: { ANTHROPIC_API_KEY: KEY, AI_MONTHLY_BUDGET_USD: "0" }, fetchImpl: impl }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("budget_month");
    expect(calls).toHaveLength(0);
  });

  test("success: cached system block, bounded max_tokens, JSON schema, no sampling params; the ledger holds the real cost", async () => {
    const usage = { input_tokens: 40, output_tokens: 900, cache_creation_input_tokens: 800, cache_read_input_tokens: 0 };
    const { impl, calls } = fakeFetch(() => claudeOk('{"a":"b"}', usage));
    const r = await callClaudeJson(request({ fetchImpl: impl }));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.text).toBe('{"a":"b"}');
      expect(r.costMicros).toBe(costFromUsage("claude-haiku-5-5", usage));
    }
    expect(calls).toHaveLength(1);
    const body = calls[0]!.body;
    expect(calls[0]!.url).toContain("api.anthropic.com/v1/messages");
    expect(body.model).toBe("claude-haiku-5-5");
    expect(body.max_tokens).toBe(3000);
    expect(body.temperature).toBeUndefined();
    const system = body.system as Array<{ text: string; cache_control?: unknown }>;
    expect(system[0]!.cache_control).toEqual({ type: "ephemeral" });
    expect(system[1]!.cache_control).toBeUndefined();
    expect(body.output_config).toMatchObject({ effort: "low", format: { type: "json_schema" } });
    const s = await store.snapshot(NOW);
    expect(s.monthSpentMicros).toBe(costFromUsage("claude-haiku-5-5", usage));
    expect(s.tokens).toEqual({ inputTokens: 40, outputTokens: 900, cacheReadTokens: 0, cacheWriteTokens: 800 });
  });

  test.each([
    [500, "api_error", "provider_error"],
    [529, "overloaded_error", "provider_error"],
    [429, "rate_limit_error", "rate_limited"],
    [401, "authentication_error", "invalid_api_key"],
  ] as const)("HTTP %s → %s and a full refund (an error answer is not billed)", async (status, type, reason) => {
    const { impl } = fakeFetch(() => claudeError(status, type));
    const r = await callClaudeJson(request({ fetchImpl: impl }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe(reason);
    expect((await store.snapshot(NOW)).monthSpentMicros).toBe(0);
  });

  test("refusal and max_tokens are failures, but billed", async () => {
    const { impl } = fakeFetch(() => claudeOk("partial", { input_tokens: 10, output_tokens: 3000, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 }, "max_tokens"));
    const r = await callClaudeJson(request({ fetchImpl: impl }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("max_tokens");
    expect((await store.snapshot(NOW)).monthSpentMicros).toBeGreaterThan(0);
  });

  test("the visitor quota stops the 13th flow of the day", async () => {
    const { impl, calls } = fakeFetch(() => claudeOk('{"a":"b"}'));
    const outcomes = [];
    for (let i = 0; i < 13; i++) outcomes.push(await callClaudeJson(request({ fetchImpl: impl })));
    expect(outcomes.slice(0, 12).every((o) => o.ok)).toBe(true);
    expect(outcomes[12]).toEqual({ ok: false, reason: "user_quota", model: "claude-haiku-5-5" });
    expect(calls).toHaveLength(12);
  });
});
