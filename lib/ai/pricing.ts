// lib/ai/pricing.ts
//
// v1.8.9 — what one Claude API call costs, in integer micro-dollars (1 USD =
// 1,000,000 µ$), so the monthly ledger never accumulates float error.
//
// Prices: Anthropic first-party API, USD per million tokens, as listed in the
// claude-api skill's model table (cached 2026-11-03) and checked again on
// 2026-11-22. Cache writes cost 1.25x input (5-minute TTL), cache reads 0.1x
// input on Haiku and 0.05x on Claude Sonnet 5.5 / Claude Opus 5.5.
// Claude Haiku 5.5 bills $0.50 / $2.50 per MTok when the prompt is over 100K
// tokens; Promptea caps every input far below that, but the tier is modelled
// anyway so the worst case stays a true upper bound.
//
// An unknown model id is priced as the most expensive model in the table: a
// typo in an env var can only make the guard stricter, never looser.
//
// Pure (no I/O). Server-side only: it uses Node's Buffer to count bytes.

export type ModelPrice = {
  /** USD per million uncached input tokens (prompt ≤ `tierAboveTokens`). */
  input: number;
  /** USD per million output tokens (thinking tokens included). */
  output: number;
  /** Cache read price as a fraction of `input`. */
  cacheReadRatio: number;
  /** Long-prompt tier, when the model has one. */
  tier?: { aboveTokens: number; input: number; output: number };
};

/** 5-minute cache writes cost 1.25x base input on every current model. */
export const CACHE_WRITE_RATIO = 1.25;

export const PRICES_CHECKED_AT = "2026-11-22";

export const MODEL_PRICES: Readonly<Record<string, ModelPrice>> = {
  "claude-haiku-5-5": {
    input: 0.1,
    output: 0.5,
    cacheReadRatio: 0.1,
    tier: { aboveTokens: 100_000, input: 0.5, output: 2.5 },
  },
  "claude-sonnet-5-5": { input: 2, output: 10, cacheReadRatio: 0.05 },
  "claude-opus-5-5": { input: 4, output: 20, cacheReadRatio: 0.05 },
};

/** The price used for a model id the table does not know: the most expensive one. */
const FALLBACK_PRICE: ModelPrice = MODEL_PRICES["claude-opus-5-5"]!;

export function priceOf(model: string): ModelPrice {
  return MODEL_PRICES[model] ?? FALLBACK_PRICE;
}

export function isPricedModel(model: string): boolean {
  return Object.prototype.hasOwnProperty.call(MODEL_PRICES, model);
}

/** The slice of the SDK's `Usage` this module reads (kept structural for tests). */
export type TokenUsage = {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
};

const MICROS_PER_USD = 1_000_000;

/** USD-per-MTok × tokens → micro-dollars (= tokens × price, exactly). */
function micros(tokens: number, usdPerMTok: number): number {
  return Math.max(0, tokens) * usdPerMTok;
}

function rates(price: ModelPrice, promptTokens: number): { input: number; output: number } {
  if (price.tier && promptTokens > price.tier.aboveTokens) {
    return { input: price.tier.input, output: price.tier.output };
  }
  return { input: price.input, output: price.output };
}

/** Cost of a finished call from the API's own `usage`, rounded UP to a whole µ$. */
export function costFromUsage(model: string, usage: TokenUsage): number {
  const price = priceOf(model);
  const cacheWrite = usage.cache_creation_input_tokens ?? 0;
  const cacheRead = usage.cache_read_input_tokens ?? 0;
  const promptTokens = usage.input_tokens + cacheWrite + cacheRead;
  const r = rates(price, promptTokens);
  const total =
    micros(usage.input_tokens, r.input) +
    micros(cacheWrite, r.input * CACHE_WRITE_RATIO) +
    micros(cacheRead, r.input * price.cacheReadRatio) +
    micros(usage.output_tokens, r.output);
  return Math.ceil(total);
}

/**
 * Upper bound on the input tokens of a text: one token per UTF-8 byte. Real
 * tokenizers produce far fewer (about 4 bytes per token in English, 1.5–3 in
 * Chinese), so this over-reserves on purpose.
 */
export function maxTokensForText(text: string): number {
  return Buffer.byteLength(text, "utf8");
}

/**
 * The most a call can cost before it is made: every input byte as a token
 * billed as a cache WRITE (the dearest input rate), plus `maxOutputTokens` of
 * output (thinking included — `max_tokens` bounds both), plus a fixed
 * per-request overhead for the message framing.
 */
export function worstCaseMicros(model: string, inputBytes: number, maxOutputTokens: number): number {
  const price = priceOf(model);
  const promptTokens = inputBytes + 64;
  const r = rates(price, promptTokens);
  return Math.ceil(micros(promptTokens, r.input * CACHE_WRITE_RATIO) + micros(maxOutputTokens, r.output));
}

export function microsToUsd(m: number): number {
  return Math.round(m) / MICROS_PER_USD;
}

export function usdToMicros(usd: number): number {
  return Math.round(usd * MICROS_PER_USD);
}
