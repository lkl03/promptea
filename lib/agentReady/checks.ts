// lib/agentReady/checks.ts
//
// v1.9.0 — the 21 checks of an Agent-Ready audit. Each one is a pure function of
// the snapshot: same input, same verdict. Weights add up to 100 and are tilted
// on purpose toward what agents demonstrably use today — text that exists
// without JavaScript, markdown, structured data, and APIs/MCP — and away from
// llms.txt (3 points), whose real-world use by agents is weakly evidenced.
//
// A check answers with a status, a `code` (one per outcome; the UI and the fix
// catalog key on it) and evidence made of numbers, booleans and vetted strings.

import { bodyFacts, headFacts, jsonLd, webMcpSignals, type BodyFacts, type HeadFacts, type JsonLdBlock } from "./html";
import { CHECK_WEIGHTS } from "./weights";
import { CHECK_IDS, type Category, type CheckId, type CheckResult, type CheckStatus, type Evidence, type Probe, type Snapshot } from "./types";

export { CHECK_WEIGHTS };

export const categoryOf = (id: CheckId): Category => id.split(".")[0] as Category;

type Verdict = { status: CheckStatus; code: string; evidence?: Evidence };

export type Context = {
  snapshot: Snapshot;
  head: HeadFacts;
  body: BodyFacts;
  jsonLd: JsonLdBlock[];
  robots: RobotsFacts;
};

// ── helpers ────────────────────────────────────────────────────────────────

const looksLikeHtml = (p: Probe) => p.contentType === "text/html" || /^\s*<(!doctype|html|head|body)\b/i.test(p.body.slice(0, 200));

/** A well-known file that "exists" only because the site answers every path with its HTML shell. */
const present = (p: Probe) => p.ok && p.bytes > 0 && !looksLikeHtml(p);

function parseJson(p: Probe): unknown {
  if (!present(p)) return undefined;
  try {
    return JSON.parse(p.body);
  } catch {
    return undefined;
  }
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Names safe to echo back: schema.org types, header and rel tokens. */
const safeTokens = (list: string[], max = 12) => Array.from(new Set(list.filter((t) => /^[A-Za-z][A-Za-z0-9:_-]{0,39}$/.test(t)))).slice(0, max);

export const AI_USER_AGENTS = ["ChatGPT-User", "Claude-User", "Perplexity-User", "MistralAI-User", "DuckAssistBot"] as const;
export const AI_SEARCH_AGENTS = ["OAI-SearchBot", "Claude-SearchBot", "PerplexityBot", "Amazonbot"] as const;
export const AI_TRAINING_AGENTS = ["GPTBot", "ClaudeBot", "Google-Extended", "Applebot-Extended", "CCBot", "Meta-ExternalAgent", "Bytespider"] as const;
const ALL_AI_AGENTS: readonly string[] = [...AI_USER_AGENTS, ...AI_SEARCH_AGENTS, ...AI_TRAINING_AGENTS];

export type RobotsGroup = { agents: string[]; allow: string[]; disallow: string[]; signals: string[] };
export type RobotsFacts = { valid: boolean; groups: RobotsGroup[]; sitemaps: number; signals: string[] };

export function parseRobots(p: Probe): RobotsFacts {
  if (!present(p)) return { valid: false, groups: [], sitemaps: 0, signals: [] };
  const groups: RobotsGroup[] = [];
  let cur: RobotsGroup | null = null;
  let lastWasAgent = false;
  let sitemaps = 0;
  const signals: string[] = [];
  for (const raw of p.body.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    const m = /^([A-Za-z-]+)\s*:\s*(.*)$/.exec(line);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const value = m[2].trim();
    if (key === "user-agent") {
      if (!cur || !lastWasAgent) groups.push((cur = { agents: [], allow: [], disallow: [], signals: [] }));
      cur.agents.push(value.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (key === "sitemap") sitemaps += 1;
    else if (key === "content-signal") {
      signals.push(value);
      cur?.signals.push(value);
    } else if (key === "allow" && cur) cur.allow.push(value);
    else if (key === "disallow" && cur) cur.disallow.push(value);
  }
  return { valid: groups.length > 0, groups, sitemaps, signals };
}

/** The group that governs an agent: its own, else `*`. True when that group disallows the whole site. */
export function isBlocked(robots: RobotsFacts, agent: string): boolean {
  const own = robots.groups.filter((g) => g.agents.includes(agent.toLowerCase()));
  const groups = own.length > 0 ? own : robots.groups.filter((g) => g.agents.includes("*"));
  return groups.some((g) => g.disallow.includes("/") && !g.allow.includes("/"));
}

const linkHeaderRels = (p: Probe): string[] =>
  Array.from((p.headers.link ?? "").matchAll(/;\s*rel\s*=\s*"?([^";,]+)"?/gi)).flatMap((m) => m[1].toLowerCase().split(/\s+/));

// ── content ────────────────────────────────────────────────────────────────

function contentText({ snapshot, body }: Context): Verdict {
  const page = snapshot.probes.page;
  if (!page.ok) return { status: "fail", code: "page_unreachable", evidence: { status: page.status } };
  const evidence = { words: body.words, htmlBytes: page.bytes, scripts: body.scripts, appShell: body.appShellRoot !== "" };
  if (body.words >= 200) return { status: "pass", code: "text_ok", evidence };
  if (body.words >= 50) return { status: "warn", code: "text_thin", evidence };
  return { status: "fail", code: body.appShellRoot || body.scripts > 3 ? "app_shell" : "text_missing", evidence };
}

function contentSemantics({ head, body }: Context): Verdict {
  const issues: string[] = [];
  if (body.h1Count === 0) issues.push("no_h1");
  if (body.h1Count > 1) issues.push("multiple_h1");
  if (body.headings.length < 2) issues.push("few_headings");
  if (!body.hasMain) issues.push("no_main");
  if (!head.lang) issues.push("no_lang");
  if (body.images > 0 && body.imagesWithAlt / body.images < 0.5) issues.push("images_without_alt");
  const evidence = { h1: body.h1Count, headings: body.headings.length, hasMain: body.hasMain, hasLang: head.lang !== "", issues };
  if (issues.length === 0) return { status: "pass", code: "semantic_ok", evidence };
  return { status: issues.length <= 2 ? "warn" : "fail", code: "semantic_gaps", evidence };
}

function contentMeta({ head }: Context): Verdict {
  const missing = [!head.title && "title", !head.description && "description", !head.canonical && "canonical"].filter((x): x is string => !!x);
  const noindex = /\bnoindex\b/i.test(head.robotsMeta);
  const evidence = { missing, noindex, titleLength: head.title.length, descriptionLength: head.description.length };
  if (noindex) return { status: "fail", code: "noindex", evidence };
  if (missing.length === 0) return { status: "pass", code: "meta_ok", evidence };
  return { status: missing.length === 1 ? "warn" : "fail", code: "meta_missing", evidence };
}

function contentWeight({ snapshot, body }: Context): Verdict {
  const page = snapshot.probes.page;
  const evidence = { htmlBytes: page.bytes, htmlTokens: Math.round(page.bytes / 4), textTokens: Math.round(body.textBytes / 4), truncated: page.truncated };
  if (page.truncated || page.bytes > 800_000) return { status: "fail", code: "html_heavy", evidence };
  if (page.bytes > 250_000) return { status: "warn", code: "html_large", evidence };
  return { status: "pass", code: "html_light", evidence };
}

// ── markdown ───────────────────────────────────────────────────────────────

const servesMarkdown = (p: Probe) => p.ok && p.contentType === "text/markdown" && !looksLikeHtml(p);

function markdownNegotiation({ snapshot }: Context): Verdict {
  const p = snapshot.probes.pageMarkdown;
  if (servesMarkdown(p)) {
    const varyAccept = (p.headers.vary ?? "").split(",").some((v) => v.trim().toLowerCase() === "accept");
    return { status: "pass", code: "negotiated", evidence: { varyAccept, markdownBytes: p.bytes } };
  }
  return { status: "fail", code: "html_returned", evidence: { contentType: safeTokens([p.contentType.replace("/", "-")])[0] ?? "unknown", status: p.status } };
}

function twinExists(ctx: Context): boolean {
  const p = ctx.snapshot.probes.pageTwin;
  return p.ok && (p.contentType === "text/markdown" || p.contentType === "text/plain") && !looksLikeHtml(p) && p.bytes > 40;
}

function markdownTwin(ctx: Context): Verdict {
  const { snapshot, head } = ctx;
  if (twinExists(ctx)) return { status: "pass", code: "twin_found", evidence: { bytes: snapshot.probes.pageTwin.bytes } };
  if (head.markdownAlternates.length > 0) return { status: "pass", code: "twin_declared", evidence: { alternates: head.markdownAlternates.length } };
  if (servesMarkdown(snapshot.probes.pageMarkdown)) return { status: "warn", code: "negotiation_only", evidence: {} };
  const llms = snapshot.probes.llms;
  if (present(llms) && /\]\([^)\s]+\.md\)/.test(llms.body)) return { status: "warn", code: "markdown_elsewhere", evidence: {} };
  return { status: "fail", code: "no_twin", evidence: { status: snapshot.probes.pageTwin.status } };
}

function markdownAlternate(ctx: Context): Verdict {
  const { snapshot, head } = ctx;
  const inHeader = /type\s*=\s*"?text\/markdown/i.test(snapshot.probes.page.headers.link ?? "");
  const inHtml = head.markdownAlternates.length > 0;
  if (inHeader || inHtml) return { status: "pass", code: "announced", evidence: { linkHeader: inHeader, linkTag: inHtml } };
  const hasMarkdown = twinExists(ctx) || servesMarkdown(snapshot.probes.pageMarkdown);
  return { status: "fail", code: hasMarkdown ? "not_announced" : "nothing_to_announce", evidence: {} };
}

// ── structured data ────────────────────────────────────────────────────────

function structuredJsonLd({ jsonLd: blocks }: Context): Verdict {
  const invalid = blocks.filter((b) => !b.ok).length;
  const evidence = { blocks: blocks.length, invalid };
  if (blocks.length === 0) return { status: "fail", code: "no_jsonld", evidence };
  if (invalid === blocks.length) return { status: "fail", code: "jsonld_invalid", evidence };
  return invalid > 0 ? { status: "warn", code: "jsonld_partly_invalid", evidence } : { status: "pass", code: "jsonld_ok", evidence };
}

const KNOWN_TYPES = new Set([
  "Organization", "LocalBusiness", "Person", "WebSite", "WebPage", "AboutPage", "ContactPage", "CollectionPage", "ItemList", "Article", "NewsArticle", "BlogPosting", "TechArticle",
  "Product", "Offer", "AggregateOffer", "Service", "SoftwareApplication", "WebApplication", "FAQPage", "HowTo", "BreadcrumbList", "Event", "Recipe", "Course", "VideoObject", "Dataset", "Review", "AggregateRating", "Blog",
]);

function structuredTypes({ jsonLd: blocks }: Context): Verdict {
  const all = safeTokens(blocks.flatMap((b) => (b.ok ? b.types : [])), 20);
  const known = all.filter((t) => KNOWN_TYPES.has(t));
  const evidence = { types: all.slice(0, 12), known: known.length };
  if (known.length >= 2) return { status: "pass", code: "types_ok", evidence };
  if (known.length === 1) return { status: "warn", code: "types_few", evidence };
  return { status: "fail", code: "types_none", evidence };
}

function structuredSocial({ head }: Context): Verdict {
  const want = ["og:title", "og:description", "og:image"];
  const missing = want.filter((k) => !head.og[k]);
  const evidence = { missing, hasType: !!head.og["og:type"], hasTwitterCard: !!head.og["twitter:card"] };
  if (missing.length === 0) return { status: "pass", code: "social_ok", evidence };
  return { status: missing.length === want.length ? "fail" : "warn", code: "social_missing", evidence };
}

// ── API, MCP, skills ───────────────────────────────────────────────────────

function apiCatalogCheck({ snapshot }: Context): Verdict {
  const p = snapshot.probes.apiCatalog;
  const json = parseJson(p);
  if (isRecord(json) && Array.isArray(json.linkset) && json.linkset.length > 0) return { status: "pass", code: "catalog_ok", evidence: { entries: json.linkset.length } };
  if (present(p)) return { status: "warn", code: "catalog_invalid", evidence: { status: p.status } };
  return { status: "fail", code: "no_catalog", evidence: { status: p.status } };
}

function serviceDescs(snapshot: Snapshot): number {
  const json = parseJson(snapshot.probes.apiCatalog);
  if (!isRecord(json) || !Array.isArray(json.linkset)) return 0;
  return json.linkset.filter((e) => isRecord(e) && Array.isArray(e["service-desc"]) && e["service-desc"].length > 0).length;
}

function apiOpenApi({ snapshot }: Context): Verdict {
  const json = parseJson(snapshot.probes.openapi);
  if (isRecord(json) && (typeof json.openapi === "string" || typeof json.swagger === "string") && isRecord(json.paths)) {
    return { status: "pass", code: "openapi_found", evidence: { paths: Object.keys(json.paths).length } };
  }
  const described = serviceDescs(snapshot);
  if (described > 0) return { status: "pass", code: "openapi_in_catalog", evidence: { described } };
  return { status: "fail", code: "no_openapi", evidence: { status: snapshot.probes.openapi.status } };
}

function apiMcp({ snapshot, head }: Context): Verdict {
  const card = parseJson(snapshot.probes.mcpCard);
  if (isRecord(card) && (typeof card.name === "string" || isRecord(card.serverInfo))) return { status: "pass", code: "server_card", evidence: {} };
  // The AI catalog: /.well-known/ard.json (current) or /.well-known/ai-catalog.json (predecessor).
  const catalog = [parseJson(snapshot.probes.ardCatalog), parseJson(snapshot.probes.aiCatalog)].find((c) => isRecord(c) && Array.isArray(c.entries));
  if (isRecord(catalog) && Array.isArray(catalog.entries)) {
    const mcp = catalog.entries.filter((e) => isRecord(e) && typeof e.type === "string" && /mcp/i.test(e.type)).length;
    if (mcp > 0) return { status: "pass", code: "ai_catalog_mcp", evidence: { entries: catalog.entries.length, mcp } };
    return { status: "warn", code: "ai_catalog_without_mcp", evidence: { entries: catalog.entries.length } };
  }
  const rels = [...linkHeaderRels(snapshot.probes.page), ...head.agentLinks.map((l) => l.rel)];
  if (rels.includes("mcp") || rels.includes("ai-catalog") || rels.includes("ard")) return { status: "warn", code: "mcp_link_only", evidence: {} };
  return { status: "fail", code: "no_mcp", evidence: {} };
}

function apiWebMcp({ snapshot }: Context): Verdict {
  const s = webMcpSignals(snapshot.probes.page.body);
  // Static reading only: tools registered by a script file that the page loads are not seen.
  const evidence = { declarativeForms: s.declarativeForms, imperative: s.imperative, method: "static" };
  return s.declarativeForms > 0 || s.imperative ? { status: "pass", code: "webmcp_found", evidence } : { status: "fail", code: "no_webmcp", evidence };
}

function apiSkills({ snapshot }: Context): Verdict {
  const json = parseJson(snapshot.probes.skills);
  if (isRecord(json) && Array.isArray(json.skills) && json.skills.length > 0) return { status: "pass", code: "skills_ok", evidence: { skills: json.skills.length } };
  return { status: "fail", code: "no_skills", evidence: { status: snapshot.probes.skills.status } };
}

// ── bots ───────────────────────────────────────────────────────────────────

function botsRobots({ snapshot, robots }: Context): Verdict {
  const p = snapshot.probes.robots;
  if (robots.valid) return { status: "pass", code: "robots_ok", evidence: { groups: robots.groups.length, sitemaps: robots.sitemaps } };
  if (p.ok && looksLikeHtml(p)) return { status: "fail", code: "robots_is_html", evidence: { status: p.status } };
  return { status: "fail", code: "no_robots", evidence: { status: p.status } };
}

function botsAiRules({ robots }: Context): Verdict {
  if (!robots.valid) return { status: "fail", code: "no_robots", evidence: {} };
  const named = ALL_AI_AGENTS.filter((a) => robots.groups.some((g) => g.agents.includes(a.toLowerCase())));
  const blockedUser = AI_USER_AGENTS.filter((a) => isBlocked(robots, a));
  const blockedSearch = AI_SEARCH_AGENTS.filter((a) => isBlocked(robots, a));
  const blockedTraining = AI_TRAINING_AGENTS.filter((a) => isBlocked(robots, a));
  const evidence = { named: named.length, blockedUser: [...blockedUser], blockedSearch: [...blockedSearch], blockedTraining: [...blockedTraining] };
  // Refusing training crawlers is a legitimate choice and costs nothing here. Refusing the
  // fetchers that act for a person (ChatGPT-User, Claude-User…) means agents cannot read the site.
  if (blockedUser.length > 0) return { status: "fail", code: "user_agents_blocked", evidence };
  if (blockedSearch.length > 0) return { status: "warn", code: "search_agents_blocked", evidence };
  if (named.length >= 3) return { status: "pass", code: "explicit_rules", evidence };
  return { status: "warn", code: "no_explicit_rules", evidence };
}

function botsSignals({ robots }: Context): Verdict {
  const ok = robots.signals.filter((s) => /\b(search|ai-input|ai-train)\s*=\s*(yes|no)\b/i.test(s));
  if (ok.length > 0) return { status: "pass", code: "signals_ok", evidence: { lines: ok.length } };
  return { status: "fail", code: "no_signals", evidence: {} };
}

// ── discovery ──────────────────────────────────────────────────────────────

function discoverySitemap({ snapshot, robots }: Context): Verdict {
  const p = snapshot.probes.sitemap;
  if (p.ok && /<(urlset|sitemapindex)\b/i.test(p.body)) {
    return { status: "pass", code: "sitemap_ok", evidence: { urls: (p.body.match(/<loc\b/gi) ?? []).length, inRobots: robots.sitemaps > 0, truncated: p.truncated } };
  }
  if (robots.sitemaps > 0) return { status: "warn", code: "sitemap_unreadable", evidence: { status: p.status } };
  return { status: "fail", code: "no_sitemap", evidence: { status: p.status } };
}

const DISCOVERY_RELS = ["api-catalog", "ai-catalog", "ard", "service-desc", "service-doc", "describedby", "sitemap", "mcp", "llms-txt"];

function discoveryLinks({ snapshot, head }: Context): Verdict {
  const headerRels = linkHeaderRels(snapshot.probes.page).filter((r) => DISCOVERY_RELS.includes(r));
  const markdownInHeader = /type\s*=\s*"?text\/markdown/i.test(snapshot.probes.page.headers.link ?? "");
  const tagRels = head.agentLinks.map((l) => l.rel);
  const evidence = { headerRels: safeTokens(headerRels), tagRels: safeTokens(tagRels), markdownInHeader };
  if (headerRels.length > 0 || markdownInHeader) return { status: "pass", code: "link_headers", evidence };
  if (tagRels.length > 0 || head.markdownAlternates.length > 0) return { status: "warn", code: "link_tags_only", evidence };
  return { status: "fail", code: "no_links", evidence };
}

function discoveryLlms({ snapshot }: Context): Verdict {
  const p = snapshot.probes.llms;
  if (!present(p)) return { status: "fail", code: "no_llms", evidence: { status: p.status } };
  const links = (p.body.match(/\]\(https?:\/\/[^)\s]+\)/g) ?? []).length;
  const evidence = { bytes: p.bytes, links, markdownLinks: (p.body.match(/\]\([^)\s]+\.md\)/g) ?? []).length };
  return /^\s*#\s+\S/.test(p.body) && links > 0 ? { status: "pass", code: "llms_ok", evidence } : { status: "warn", code: "llms_malformed", evidence };
}

const RUNNERS: Record<CheckId, (ctx: Context) => Verdict> = {
  "content.text": contentText,
  "content.semantics": contentSemantics,
  "content.meta": contentMeta,
  "content.weight": contentWeight,
  "markdown.negotiation": markdownNegotiation,
  "markdown.twin": markdownTwin,
  "markdown.alternate": markdownAlternate,
  "structured.jsonld": structuredJsonLd,
  "structured.types": structuredTypes,
  "structured.social": structuredSocial,
  "api.catalog": apiCatalogCheck,
  "api.openapi": apiOpenApi,
  "api.mcp": apiMcp,
  "api.webmcp": apiWebMcp,
  "api.skills": apiSkills,
  "bots.robots": botsRobots,
  "bots.ai-rules": botsAiRules,
  "bots.signals": botsSignals,
  "discovery.sitemap": discoverySitemap,
  "discovery.links": discoveryLinks,
  "discovery.llms": discoveryLlms,
};

export function buildContext(snapshot: Snapshot): Context {
  const html = snapshot.probes.page.body;
  return { snapshot, head: headFacts(html), body: bodyFacts(html), jsonLd: jsonLd(html), robots: parseRobots(snapshot.probes.robots) };
}

const POINTS: Record<CheckStatus, number> = { pass: 1, warn: 0.5, fail: 0 };

export function runCheck(id: CheckId, ctx: Context): CheckResult {
  const v = RUNNERS[id](ctx);
  const weight = CHECK_WEIGHTS[id];
  return { id, category: categoryOf(id), status: v.status, weight, points: weight * POINTS[v.status], code: v.code, evidence: v.evidence ?? {} };
}

export function runChecks(snapshot: Snapshot, onCheck?: (r: CheckResult) => void): { results: CheckResult[]; context: Context } {
  const context = buildContext(snapshot);
  const results = CHECK_IDS.map((id) => {
    const r = runCheck(id, context);
    onCheck?.(r);
    return r;
  });
  return { results, context };
}
