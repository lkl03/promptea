// lib/agentReady/weights.ts
//
// v1.9.0 — what each check is worth. Its own module (no other imports than the
// ids) so the browser can use the weights without pulling in the checks.
// The 100 points are tilted on purpose toward what agents demonstrably use
// today; see checks.ts.

import type { CheckId } from "./types";

export const CHECK_WEIGHTS: Record<CheckId, number> = {
  "content.text": 12,
  "content.semantics": 6,
  "content.meta": 4,
  "content.weight": 3,
  "markdown.negotiation": 10,
  "markdown.twin": 7,
  "markdown.alternate": 3,
  "structured.jsonld": 8,
  "structured.types": 7,
  "structured.social": 5,
  "api.catalog": 4,
  "api.openapi": 3,
  "api.mcp": 5,
  "api.webmcp": 2,
  "api.skills": 1,
  "bots.robots": 3,
  "bots.ai-rules": 4,
  "bots.signals": 3,
  "discovery.sitemap": 4,
  "discovery.links": 3,
  "discovery.llms": 3,
};

/** Effort of each check's fix (S/M/L). Mirrors fixes.ts; a test keeps the two equal. */
export const CHECK_EFFORT: Record<CheckId, "S" | "M" | "L"> = {
  "content.text": "L",
  "content.semantics": "S",
  "content.meta": "S",
  "content.weight": "M",
  "markdown.negotiation": "M",
  "markdown.twin": "M",
  "markdown.alternate": "S",
  "structured.jsonld": "S",
  "structured.types": "M",
  "structured.social": "S",
  "api.catalog": "S",
  "api.openapi": "M",
  "api.mcp": "L",
  "api.webmcp": "S",
  "api.skills": "M",
  "bots.robots": "S",
  "bots.ai-rules": "S",
  "bots.signals": "S",
  "discovery.sitemap": "S",
  "discovery.links": "S",
  "discovery.llms": "S",
};
