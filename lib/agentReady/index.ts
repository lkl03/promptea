// lib/agentReady/index.ts
//
// v1.9.0 — runAudit(): collect → check → score. Emits progress events so the
// page can draw the scan as it happens.

import "server-only";

import { runChecks } from "./checks";
import { collect, type Fetcher } from "./collect";
import { detectStack, visibleText } from "./html";
import { levelOf, categoryScores, totalScore } from "./score";
import { AUDIT_SCHEMA_VERSION, type AgentView, type Audit, type HumanView, type ScanEvent, type Snapshot } from "./types";
import type { Context } from "./checks";

/** How much of the page's text and markdown is kept to show the person (untrusted content). */
export const VIEW_TEXT_LIMIT = 6_000;

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…` : s);
const tokens = (bytes: number) => Math.round(bytes / 4);

function frameable(headers: Record<string, string>): boolean {
  const xfo = (headers["x-frame-options"] ?? "").toLowerCase();
  if (xfo.includes("deny") || xfo.includes("sameorigin")) return false;
  const ancestors = /frame-ancestors\s+([^;]+)/i.exec(headers["content-security-policy"] ?? "")?.[1]?.trim().toLowerCase();
  if (ancestors && !/(^|\s)(\*|https:)(\s|$)/.test(ancestors)) return false;
  return true;
}

export function buildViews(snapshot: Snapshot, ctx: Context): { agentView: AgentView; humanView: HumanView } {
  const page = snapshot.probes.page;
  const md = snapshot.probes.pageMarkdown.ok && snapshot.probes.pageMarkdown.contentType === "text/markdown"
    ? snapshot.probes.pageMarkdown
    : snapshot.probes.pageTwin.ok && ["text/markdown", "text/plain"].includes(snapshot.probes.pageTwin.contentType) && !/^\s*</.test(snapshot.probes.pageTwin.body)
      ? snapshot.probes.pageTwin
      : null;
  const text = visibleText(page.body);
  return {
    agentView: {
      title: clip(ctx.head.title, 200),
      description: clip(ctx.head.description, 400),
      lang: clip(ctx.head.lang, 20),
      words: ctx.body.words,
      htmlBytes: page.bytes,
      textBytes: ctx.body.textBytes,
      htmlTokens: tokens(page.bytes),
      textTokens: tokens(ctx.body.textBytes),
      markdownTokens: md ? tokens(md.bytes) : null,
      headings: ctx.body.headings.slice(0, 40).map((h) => ({ level: h.level, text: clip(h.text, 160) })),
      jsonLdTypes: Array.from(new Set(ctx.jsonLd.flatMap((b) => (b.ok ? b.types : [])))).filter((t) => /^[A-Za-z][A-Za-z0-9]{0,39}$/.test(t)).slice(0, 12),
      links: ctx.body.links,
      text: clip(text, VIEW_TEXT_LIMIT),
      markdown: md ? clip(md.body, VIEW_TEXT_LIMIT) : null,
    },
    humanView: {
      frameable: frameable(page.headers),
      scripts: ctx.body.scripts,
      images: ctx.body.images,
      imagesWithAlt: ctx.body.imagesWithAlt,
      forms: ctx.body.forms,
      landmarks: ctx.body.landmarks,
      textRatio: page.bytes === 0 ? 0 : Math.round((ctx.body.textBytes / page.bytes) * 1000) / 1000,
    },
  };
}

export type RunAuditOptions = { fetcher?: Fetcher; onEvent?: (e: ScanEvent) => void; now?: () => Date };

/** Throws SafeFetchError when the page itself cannot be fetched; every other failure is a finding. */
export async function runAudit(url: string, opts: RunAuditOptions = {}): Promise<Audit> {
  const started = Date.now();
  let requests = 0;
  const snapshot = await collect(url, {
    fetcher: opts.fetcher,
    onStart: (pageUrl, probes) => opts.onEvent?.({ type: "start", url: pageUrl, probes }),
    onProbe: (p, ms) => {
      requests += 1;
      opts.onEvent?.({ type: "probe", key: p.key, status: p.status, ok: p.ok, ms });
    },
  });
  const { results, context } = runChecks(snapshot, (result) => opts.onEvent?.({ type: "check", result }));
  const score = totalScore(results);
  const audit: Audit = {
    schema: AUDIT_SCHEMA_VERSION,
    requestedUrl: snapshot.requestedUrl,
    pageUrl: snapshot.pageUrl,
    origin: snapshot.origin,
    scannedAt: (opts.now?.() ?? new Date()).toISOString(),
    stack: detectStack(snapshot.probes.page.body, snapshot.probes.page.headers),
    score,
    level: levelOf(score),
    categories: categoryScores(results),
    checks: results,
    ...buildViews(snapshot, context),
    requests,
    durationMs: Date.now() - started,
  };
  opts.onEvent?.({ type: "done", audit });
  return audit;
}

export * from "./types";
export { CHECK_WEIGHTS } from "./checks";
