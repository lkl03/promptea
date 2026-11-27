// lib/agentReady/types.ts
//
// v1.9.0 — the Agent-Ready audit: how ready a site is for AI agents.
// Deterministic: fetch a fixed set of URLs (collect.ts), run pure checks over
// what came back (checks.ts), weigh them (score.ts). No LLM anywhere.

import type { DetectedStack, Heading } from "./html";

export const AUDIT_SCHEMA_VERSION = 1;

/** Categories in display order. Weights are in checks.ts and add up to 100. */
export const CATEGORIES = ["content", "markdown", "structured", "api", "bots", "discovery"] as const;
export type Category = (typeof CATEGORIES)[number];

export const CHECK_IDS = [
  "content.text",
  "content.semantics",
  "content.meta",
  "content.weight",
  "markdown.negotiation",
  "markdown.twin",
  "markdown.alternate",
  "structured.jsonld",
  "structured.types",
  "structured.social",
  "api.catalog",
  "api.openapi",
  "api.mcp",
  "api.webmcp",
  "api.skills",
  "bots.robots",
  "bots.ai-rules",
  "bots.signals",
  "discovery.sitemap",
  "discovery.links",
  "discovery.llms",
] as const;
export type CheckId = (typeof CHECK_IDS)[number];

export type CheckStatus = "pass" | "warn" | "fail";

/**
 * Facts a check found. Values are numbers, booleans, or short strings that are
 * either ours (enums) or validated (URLs, header names, schema.org type names).
 * No free text from the audited page goes in here: this object is what the MCP
 * server returns to a coding agent.
 */
export type Evidence = Record<string, string | number | boolean | string[]>;

export type CheckResult = {
  id: CheckId;
  category: Category;
  status: CheckStatus;
  /** Points this check is worth, and how many it got (pass = all, warn = half, fail = 0). */
  weight: number;
  points: number;
  /** Machine-readable reason, one per outcome of the check (see checks.ts). */
  code: string;
  evidence: Evidence;
};

export type CategoryScore = { category: Category; points: number; max: number; score: number };

export const LEVELS = ["invisible", "readable", "friendly", "ready"] as const;
export type Level = (typeof LEVELS)[number];

/** One fetched resource, reduced to what the checks need. */
export type Probe = {
  key: ProbeKey;
  url: string;
  ok: boolean;
  status: number;
  /** A SafeFetchErrorCode when the request did not get an answer. */
  error?: string;
  contentType: string;
  headers: Record<string, string>;
  body: string;
  bytes: number;
  truncated: boolean;
  finalUrl: string;
};

export const PROBE_KEYS = ["page", "pageMarkdown", "pageTwin", "robots", "llms", "sitemap", "apiCatalog", "aiCatalog", "mcpCard", "skills", "openapi"] as const;
export type ProbeKey = (typeof PROBE_KEYS)[number];

export type Snapshot = {
  /** The URL the person gave, normalized. */
  requestedUrl: string;
  /** The page that answered (after redirects); every site-wide path hangs off its origin. */
  pageUrl: string;
  origin: string;
  probes: Record<ProbeKey, Probe>;
};

/**
 * What a non-rendering agent gets from the page. `text` is UNTRUSTED third-party
 * content: shown to the person in the browser as plain text, never sent through MCP.
 */
export type AgentView = {
  title: string;
  description: string;
  lang: string;
  words: number;
  htmlBytes: number;
  textBytes: number;
  /** Rough token estimates (bytes / 4), to compare what HTML and markdown cost an agent. */
  htmlTokens: number;
  textTokens: number;
  markdownTokens: number | null;
  headings: Heading[];
  jsonLdTypes: string[];
  links: number;
  text: string;
  /** The page's own markdown, when it serves one (also untrusted). */
  markdown: string | null;
};

/** What a person gets: used to draw the "human" side without rendering the site. */
export type HumanView = {
  /** False when the site forbids being framed (X-Frame-Options / CSP frame-ancestors). */
  frameable: boolean;
  scripts: number;
  images: number;
  imagesWithAlt: number;
  forms: number;
  landmarks: string[];
  /** Share of the HTML that is visible text, 0–1. */
  textRatio: number;
};

export type Audit = {
  schema: typeof AUDIT_SCHEMA_VERSION;
  requestedUrl: string;
  pageUrl: string;
  origin: string;
  scannedAt: string;
  stack: DetectedStack;
  score: number;
  level: Level;
  categories: CategoryScore[];
  checks: CheckResult[];
  agentView: AgentView;
  humanView: HumanView;
  /** How many requests the scan made and how long it took. */
  requests: number;
  durationMs: number;
};

/** Progress events, in order, for the live pipeline in the UI. */
export type ScanEvent =
  | { type: "start"; url: string; probes: ProbeKey[] }
  | { type: "probe"; key: ProbeKey; status: number; ok: boolean; ms: number }
  | { type: "check"; result: CheckResult }
  | { type: "done"; audit: Audit }
  | { type: "error"; code: string };
