// lib/llm/providers.ts
//
// v1.8.0: provider abstraction for the server-side LLM calls of the analyzer
// (adaptive refiner, optional judge). Server-only — never import from client
// components.
//
// - Every provider is OPTIONAL. Without keys the chain is empty and callers
//   fall back to the deterministic engine exactly as before (`disabled`).
// - The chain order comes from REFINER_PROVIDERS (default "groq,anthropic");
//   providers without a key are skipped. Transport-level failures (timeout,
//   429, 5xx/529, auth, empty body) fail over to the next provider; content
//   problems (bad JSON, schema, quality gate) are the caller's business.
// - Anthropic: Claude Haiku 5.5 by default (ANTHROPIC_REFINER_MODEL to
//   override), called through the official SDK with the static system block
//   marked for prompt caching (`cache_control: ephemeral`) and JSON-schema
//   structured output.
// - `fetchImpl` is injectable everywhere so tests never need real keys.

import Anthropic from "@anthropic-ai/sdk";
import type { FallbackReason } from "@/lib/domain";

export type ProviderId = "groq" | "anthropic";
export const PROVIDER_IDS: readonly ProviderId[] = ["groq", "anthropic"];

export const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
export const GROQ_DEFAULT_MODEL = "llama-3.3-70b-versatile";
export const ANTHROPIC_DEFAULT_MODEL = "claude-haiku-5-5";

const DEFAULT_CALL_TIMEOUT_MS = 10000;
const DEFAULT_TOTAL_TIMEOUT_MS = 15000;

export type LlmMessage = { role: "user" | "assistant"; content: string };

export type LlmRequest = {
  /**
   * System prompt in two parts. `cacheable` must be byte-identical across
   * requests (no per-request data) so providers with prompt caching can reuse
   * it; `dynamic` carries the per-request rules. `combined` is the exact
   * single-string form for providers without caching (kept identical to the
   * pre-1.8 Groq prompt so its behavior does not change).
   */
  system: { cacheable: string; dynamic: string; combined: string };
  messages: LlmMessage[];
  /** JSON schema of the expected object (structured output where supported). */
  jsonSchema: Record<string, unknown>;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
  /** Per-call timeout (already bounded by the chain's remaining budget). */
  timeoutMs: number;
};

export type LlmOutcome =
  | { ok: true; text: string; provider: ProviderId; model: string }
  | { ok: false; reason: FallbackReason; provider: ProviderId; model: string };

export interface LlmProvider {
  id: ProviderId;
  model(): string;
  enabled(): boolean;
  complete(req: LlmRequest): Promise<LlmOutcome>;
}

function keyOk(v: string | undefined): v is string {
  return Boolean(v && v.trim().length > 10);
}

function envInt(name: string, fallback: number): number {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

export function callTimeoutMs(): number {
  return envInt("REFINER_TIMEOUT_MS", DEFAULT_CALL_TIMEOUT_MS);
}

export function totalTimeoutMs(): number {
  return envInt("REFINER_TOTAL_TIMEOUT_MS", DEFAULT_TOTAL_TIMEOUT_MS);
}

function timeoutSignal(ms: number, external?: AbortSignal): AbortSignal {
  const timeout = AbortSignal.timeout(ms);
  if (!external) return timeout;
  if (typeof AbortSignal.any === "function") return AbortSignal.any([timeout, external]);
  return timeout;
}

// ---------------------------------------------------------------------------
// Groq (OpenAI-compatible chat completions)
// ---------------------------------------------------------------------------

export const groqProvider: LlmProvider = {
  id: "groq",
  model: () => process.env.GROQ_MODEL ?? GROQ_DEFAULT_MODEL,
  enabled: () => keyOk(process.env.GROQ_API_KEY),
  async complete(req) {
    const model = this.model();
    const apiKey = process.env.GROQ_API_KEY;
    if (!keyOk(apiKey)) return { ok: false, reason: "missing_api_key", provider: "groq", model };

    const doFetch = req.fetchImpl ?? fetch;
    let res: Response;
    try {
      res = await doFetch(GROQ_URL, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          temperature: req.temperature ?? 0.15,
          response_format: { type: "json_object" },
          messages: [{ role: "system", content: req.system.combined }, ...req.messages],
        }),
        signal: timeoutSignal(req.timeoutMs, req.signal),
      });
    } catch (err) {
      if (req.signal?.aborted) return { ok: false, reason: "superseded", provider: "groq", model };
      const name = (err as { name?: string })?.name ?? "";
      return {
        ok: false,
        reason: name === "TimeoutError" || name === "AbortError" ? "timeout" : "provider_error",
        provider: "groq",
        model,
      };
    }

    if (res.status === 401 || res.status === 403) return { ok: false, reason: "invalid_api_key", provider: "groq", model };
    if (res.status === 429) return { ok: false, reason: "rate_limited", provider: "groq", model };
    if (!res.ok) return { ok: false, reason: "provider_error", provider: "groq", model };

    let data: { choices?: Array<{ message?: { content?: string } }> };
    try {
      data = (await res.json()) as typeof data;
    } catch {
      return { ok: false, reason: "invalid_json", provider: "groq", model };
    }
    const text = data?.choices?.[0]?.message?.content?.trim();
    if (!text) return { ok: false, reason: "empty_response", provider: "groq", model };
    return { ok: true, text, provider: "groq", model };
  },
};

// ---------------------------------------------------------------------------
// Anthropic (Claude) — official SDK
// ---------------------------------------------------------------------------

export const anthropicProvider: LlmProvider = {
  id: "anthropic",
  model: () => process.env.ANTHROPIC_REFINER_MODEL ?? ANTHROPIC_DEFAULT_MODEL,
  // Opt-in by an explicit server key only (no ambient CLI profile).
  enabled: () => keyOk(process.env.ANTHROPIC_API_KEY),
  async complete(req) {
    const model = this.model();
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!keyOk(apiKey)) return { ok: false, reason: "missing_api_key", provider: "anthropic", model };

    // No SDK retries: failover to the next provider is the retry strategy,
    // and the analyzer has a hard latency budget.
    const client = new Anthropic({
      apiKey,
      maxRetries: 0,
      timeout: req.timeoutMs,
      ...(req.fetchImpl ? { fetch: req.fetchImpl } : {}),
    });

    try {
      const response = await client.messages.create(
        {
          model,
          max_tokens: req.maxTokens ?? 4096,
          // Static block first, marked for caching (prefix match); the
          // per-request rules come after the breakpoint.
          system: [
            { type: "text", text: req.system.cacheable, cache_control: { type: "ephemeral" } },
            { type: "text", text: req.system.dynamic },
          ],
          messages: req.messages,
          // Haiku 5.5: no sampling params (non-default values are rejected);
          // low effort keeps a rewrite/judgement fast; JSON-schema output.
          output_config: { effort: "low", format: { type: "json_schema", schema: req.jsonSchema } },
        },
        { signal: req.signal }
      );

      if (response.stop_reason === "refusal") return { ok: false, reason: "unsafe_response", provider: "anthropic", model };
      const text = response.content
        .map((block) => (block.type === "text" ? block.text : ""))
        .join("")
        .trim();
      if (!text) return { ok: false, reason: "empty_response", provider: "anthropic", model };
      if (response.stop_reason === "max_tokens") return { ok: false, reason: "invalid_json", provider: "anthropic", model };
      return { ok: true, text, provider: "anthropic", model };
    } catch (err) {
      if (req.signal?.aborted) return { ok: false, reason: "superseded", provider: "anthropic", model };
      if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
        return { ok: false, reason: "invalid_api_key", provider: "anthropic", model };
      }
      if (err instanceof Anthropic.RateLimitError) return { ok: false, reason: "rate_limited", provider: "anthropic", model };
      if (err instanceof Anthropic.APIConnectionTimeoutError) return { ok: false, reason: "timeout", provider: "anthropic", model };
      // 5xx including 529 overloaded, connection errors, anything else.
      return { ok: false, reason: "provider_error", provider: "anthropic", model };
    }
  },
};

const REGISTRY: Record<ProviderId, LlmProvider> = { groq: groqProvider, anthropic: anthropicProvider };

/** Configured order (REFINER_PROVIDERS), unknown ids ignored, duplicates removed. */
export function configuredProviderOrder(): ProviderId[] {
  const raw = (process.env.REFINER_PROVIDERS ?? "groq,anthropic")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s): s is ProviderId => (PROVIDER_IDS as readonly string[]).includes(s));
  return [...new Set(raw)];
}

/** Providers that are configured AND have a key, in order. Empty → deterministic only. */
export function resolveProviderChain(): LlmProvider[] {
  return configuredProviderOrder()
    .map((id) => REGISTRY[id])
    .filter((p) => p.enabled());
}

/** Failures worth trying the next provider for. */
const FAILOVER_REASONS = new Set<FallbackReason>([
  "timeout",
  "rate_limited",
  "provider_error",
  "invalid_api_key",
  "missing_api_key",
  "empty_response",
]);

export type ChainOutcome = LlmOutcome & {
  /** Providers tried before the one that answered (or all, on failure). */
  attempts: Array<{ provider: ProviderId; reason: FallbackReason }>;
};

/**
 * Call the chain in order, failing over on transport-level errors, within a
 * total time budget. `startAt` lets a repair attempt stick to the provider
 * that answered first.
 */
export async function completeWithFailover(
  chain: LlmProvider[],
  req: Omit<LlmRequest, "timeoutMs">,
  opts: { deadline: number; startAt?: ProviderId } = { deadline: Date.now() + totalTimeoutMs() }
): Promise<ChainOutcome> {
  const attempts: ChainOutcome["attempts"] = [];
  const start = opts.startAt ? Math.max(0, chain.findIndex((p) => p.id === opts.startAt)) : 0;
  const ordered = chain.slice(start);

  let last: LlmOutcome | null = null;
  for (const provider of ordered) {
    if (req.signal?.aborted) {
      return { ok: false, reason: "superseded", provider: provider.id, model: provider.model(), attempts };
    }
    const remaining = opts.deadline - Date.now();
    if (remaining < 250) {
      last = { ok: false, reason: "timeout", provider: provider.id, model: provider.model() };
      break;
    }
    const outcome = await provider.complete({ ...req, timeoutMs: Math.min(callTimeoutMs(), remaining) });
    if (outcome.ok) return { ...outcome, attempts };
    attempts.push({ provider: outcome.provider, reason: outcome.reason });
    last = outcome;
    if (outcome.reason === "superseded" || !FAILOVER_REASONS.has(outcome.reason)) break;
  }

  const fallback: LlmOutcome = last ?? { ok: false, reason: "disabled", provider: "groq", model: GROQ_DEFAULT_MODEL };
  return { ...fallback, attempts };
}
