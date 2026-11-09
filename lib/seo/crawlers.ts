// lib/seo/crawlers.ts
//
// THE OWNER'S POLICY FOR AI CRAWLERS — one constant, easy to change.
//
// app/robots.ts reads this list and emits an explicit rule per crawler, so the
// policy is visible in /robots.txt instead of being implied by `User-agent: *`.
//
// Three kinds of bot, which is the distinction that matters for a policy:
//
//   "search"  — builds the index of an AI search/answer engine. Allowing it is
//               how Promptea gets cited and linked from those products.
//   "user"    — fetches a page because a person asked an assistant about it
//               right now (ChatGPT-User, Claude-User, Perplexity-User). Vendors
//               document that some of these may not honor robots.txt; the rule
//               is still listed for the ones that do.
//   "training"— collects content to train/ground models (GPTBot, ClaudeBot,
//               Google-Extended, Applebot-Extended, CCBot…).
//
// DEFAULT: allow everything. Promptea is a free, public product whose goal is
// to be found and cited; the content is original and meant to be read.
//
// To opt out of training only, set the entries you want to refuse to
// `allow: false` (they are then emitted as `Disallow: /`). To opt out of a
// whole kind, flip TRAINING_BOTS_ALLOWED / USER_BOTS_ALLOWED /
// SEARCH_BOTS_ALLOWED — a per-entry `allow` overrides nothing: the kind switch
// is applied first, the entry only matters when its kind is allowed.
//
// Names are the user-agent tokens each vendor publishes in its own crawler
// documentation (OpenAI, Anthropic, Perplexity, Google, Apple, Common Crawl, Meta,
// Amazon, DuckDuckGo, Mistral). Tokens change: re-check them against those docs
// before relying on this list.

export type CrawlerKind = "search" | "user" | "training";

export type AiCrawler = {
  /** The user-agent token as it appears in robots.txt. */
  userAgent: string;
  operator: string;
  kind: CrawlerKind;
  /** Per-crawler switch; only consulted when the whole kind is allowed. */
  allow: boolean;
  note: string;
};

/** Master switches per kind. Flip one to refuse that whole class of bot. */
export const SEARCH_BOTS_ALLOWED = true;
export const USER_BOTS_ALLOWED = true;
export const TRAINING_BOTS_ALLOWED = true;

export const AI_CRAWLERS: readonly AiCrawler[] = [
  // OpenAI
  { userAgent: "OAI-SearchBot", operator: "OpenAI", kind: "search", allow: true, note: "Indexes pages for ChatGPT search results." },
  { userAgent: "ChatGPT-User", operator: "OpenAI", kind: "user", allow: true, note: "Fetches a page when a ChatGPT user asks about it." },
  { userAgent: "GPTBot", operator: "OpenAI", kind: "training", allow: true, note: "Collects content that may be used to train OpenAI models." },
  // Anthropic
  { userAgent: "Claude-SearchBot", operator: "Anthropic", kind: "search", allow: true, note: "Indexes pages for Claude's search results." },
  { userAgent: "Claude-User", operator: "Anthropic", kind: "user", allow: true, note: "Fetches a page when a Claude user asks about it." },
  { userAgent: "ClaudeBot", operator: "Anthropic", kind: "training", allow: true, note: "Collects content that may be used to train Claude." },
  // Perplexity
  { userAgent: "PerplexityBot", operator: "Perplexity", kind: "search", allow: true, note: "Indexes pages for Perplexity's answer engine." },
  { userAgent: "Perplexity-User", operator: "Perplexity", kind: "user", allow: true, note: "Fetches a page when a Perplexity user asks about it." },
  // Google / Apple opt-out tokens (they control use of content already crawled by
  // Googlebot / Applebot, they do not crawl on their own).
  { userAgent: "Google-Extended", operator: "Google", kind: "training", allow: true, note: "Controls use of content for Gemini training and grounding." },
  { userAgent: "Applebot-Extended", operator: "Apple", kind: "training", allow: true, note: "Controls use of content for Apple foundation-model training." },
  // Others that publish a crawler token
  { userAgent: "CCBot", operator: "Common Crawl", kind: "training", allow: true, note: "Open web crawl used by many model builders." },
  { userAgent: "Meta-ExternalAgent", operator: "Meta", kind: "training", allow: true, note: "Collects content that may be used to train Meta's models." },
  { userAgent: "Amazonbot", operator: "Amazon", kind: "search", allow: true, note: "Indexes pages for Alexa answers and Amazon services." },
  { userAgent: "DuckAssistBot", operator: "DuckDuckGo", kind: "user", allow: true, note: "Fetches pages to answer DuckAssist questions." },
  { userAgent: "MistralAI-User", operator: "Mistral", kind: "user", allow: true, note: "Fetches a page when a Le Chat user asks about it." },
] as const;

const KIND_SWITCH: Record<CrawlerKind, boolean> = {
  search: SEARCH_BOTS_ALLOWED,
  user: USER_BOTS_ALLOWED,
  training: TRAINING_BOTS_ALLOWED,
};

/** Whether this crawler may fetch the site under the current policy. */
export function isCrawlerAllowed(c: AiCrawler): boolean {
  return KIND_SWITCH[c.kind] && c.allow;
}

/** Paths nobody (human crawler or AI) should fetch. */
export const DISALLOWED_PATHS = ["/_next/"] as const;
