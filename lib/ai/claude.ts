// lib/ai/claude.ts
//
// v1.8.9 — the ONLY way Promptea calls the Claude API. Every call:
//   - needs ANTHROPIC_API_KEY (server-only env; never sent to the browser);
//   - reserves its worst-case cost in the budget ledger first and is not made
//     when that would cross the monthly/daily cap or the caller's daily quota;
//   - has a bounded `max_tokens` and a timeout, and no SDK retries;
//   - puts the static system prompt first with `cache_control` (prompt caching:
//     it must be byte-identical across requests, ≥ 512 tokens to be cached);
//   - asks for JSON-schema structured output;
//   - settles the ledger with the real cost from `response.usage`.
// It never throws: callers get `{ ok: false, reason }` and fall back to the
// deterministic engine.

// Server-side only (it reads ANTHROPIC_API_KEY); it does not import
// "server-only" itself so the refiner's unit tests can load it, but nothing on
// the client imports it. The Firestore ledger is loaded lazily.

import Anthropic from "@anthropic-ai/sdk";
import { budgetLimits, currentBudgetStore, type AiFeature, type BudgetStore, type DenyReason } from "./budget";
import { costFromUsage, maxTokensForText, worstCaseMicros, type TokenUsage } from "./pricing";

export type AiFailure =
  | DenyReason
  | "missing_api_key"
  | "invalid_api_key"
  | "rate_limited"
  | "timeout"
  | "provider_error"
  | "refusal"
  | "max_tokens"
  | "empty_response"
  | "superseded";

/** Failures that mean "no AI right now" for budget reasons (the UI says so). */
export const BUDGET_FAILURES: ReadonlySet<AiFailure> = new Set<AiFailure>(["budget_month", "budget_day", "store_unavailable", "disabled"]);

export type ClaudeJsonRequest = {
  feature: AiFeature;
  model: string;
  /** Byte-identical across requests (cached). */
  systemCacheable: string;
  /** Per-request system rules, after the cache breakpoint. */
  systemDynamic?: string;
  messages: Anthropic.MessageParam[];
  jsonSchema: Record<string, unknown>;
  maxTokens: number;
  effort: "low" | "medium" | "high";
  timeoutMs: number;
  /** Hashed client key for the per-visitor daily quota; null for server work. */
  userKey: string | null;
  signal?: AbortSignal;
  /** Injectable for tests. */
  fetchImpl?: typeof fetch;
  store?: BudgetStore;
  now?: Date;
  env?: Record<string, string | undefined>;
};

export type ClaudeJsonOutcome =
  | { ok: true; text: string; model: string; costMicros: number; usage: TokenUsage }
  | { ok: false; reason: AiFailure; model: string };

export function hasAnthropicKey(env: Record<string, string | undefined> = process.env): boolean {
  const k = env.ANTHROPIC_API_KEY;
  return Boolean(k && k.trim().length > 10);
}

function isBillableUnknown(err: unknown): boolean {
  // Our side gave up (timeout / dropped connection): Anthropic may still have
  // processed and billed the request.
  return err instanceof Anthropic.APIConnectionTimeoutError || err instanceof Anthropic.APIConnectionError;
}

export async function callClaudeJson(req: ClaudeJsonRequest): Promise<ClaudeJsonOutcome> {
  const env = req.env ?? process.env;
  const model = req.model;
  const limits = budgetLimits(env);
  if (!limits.enabled) return { ok: false, reason: "disabled", model };
  if (!hasAnthropicKey(env)) return { ok: false, reason: "missing_api_key", model };

  const inputBytes =
    maxTokensForText(req.systemCacheable) +
    maxTokensForText(req.systemDynamic ?? "") +
    maxTokensForText(JSON.stringify(req.messages)) +
    maxTokensForText(JSON.stringify(req.jsonSchema));
  const worst = worstCaseMicros(model, inputBytes, req.maxTokens);

  const store = req.store ?? currentBudgetStore() ?? (await import("./budgetStore")).getBudgetStore();
  const reservation = await store.reserve(
    { feature: req.feature, model, worstMicros: worst, userKey: req.userKey, now: req.now ?? new Date() },
    limits
  );
  if (!reservation.ok) return { ok: false, reason: reservation.reason, model };
  const ticket = reservation.ticket;

  const client = new Anthropic({
    apiKey: env.ANTHROPIC_API_KEY,
    maxRetries: 0,
    timeout: req.timeoutMs,
    ...(req.fetchImpl ? { fetch: req.fetchImpl } : {}),
  });

  const system: Anthropic.TextBlockParam[] = [
    { type: "text", text: req.systemCacheable, cache_control: { type: "ephemeral" } },
  ];
  if (req.systemDynamic) system.push({ type: "text", text: req.systemDynamic });

  let response: Anthropic.Message;
  try {
    response = await client.messages.create(
      {
        model,
        max_tokens: req.maxTokens,
        system,
        messages: req.messages,
        output_config: { effort: req.effort, format: { type: "json_schema", schema: req.jsonSchema } },
      },
      { signal: req.signal }
    );
  } catch (err) {
    if (isBillableUnknown(err) || req.signal?.aborted) {
      await store.settle(ticket, null);
    } else {
      // An HTTP error answer (4xx/5xx/429/529): nothing was billed.
      await store.settle(ticket, 0);
    }
    if (req.signal?.aborted) return { ok: false, reason: "superseded", model };
    if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
      console.error("[ai] invalid_api_key", { feature: req.feature });
      return { ok: false, reason: "invalid_api_key", model };
    }
    if (err instanceof Anthropic.RateLimitError) return { ok: false, reason: "rate_limited", model };
    if (err instanceof Anthropic.APIConnectionTimeoutError) return { ok: false, reason: "timeout", model };
    console.warn("[ai] provider_error", {
      feature: req.feature,
      status: (err as { status?: number })?.status ?? null,
    });
    return { ok: false, reason: "provider_error", model };
  }

  const usage: TokenUsage = response.usage;
  const cost = costFromUsage(model, usage);
  await store.settle(ticket, cost, {
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    cacheReadTokens: usage.cache_read_input_tokens ?? 0,
    cacheWriteTokens: usage.cache_creation_input_tokens ?? 0,
  });
  console.info("[ai] call", {
    feature: req.feature,
    model,
    costMicros: cost,
    in: usage.input_tokens,
    out: usage.output_tokens,
    cacheRead: usage.cache_read_input_tokens ?? 0,
    cacheWrite: usage.cache_creation_input_tokens ?? 0,
    stop: response.stop_reason,
  });

  if (response.stop_reason === "refusal") return { ok: false, reason: "refusal", model };
  if (response.stop_reason === "max_tokens") return { ok: false, reason: "max_tokens", model };
  const text = response.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("")
    .trim();
  if (!text) return { ok: false, reason: "empty_response", model };
  return { ok: true, text, model, costMicros: cost, usage };
}
