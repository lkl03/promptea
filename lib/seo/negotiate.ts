// lib/seo/negotiate.ts
//
// v1.9.0 — content negotiation for agents: a request for a page that says it
// prefers `text/markdown` gets the page's markdown twin at the SAME URL (what
// Cloudflare calls "Markdown for Agents"). Browsers never list text/markdown,
// so HTML stays the default for everyone else.
//
// This file is imported by proxy.ts, which runs on every request: it must stay
// free of the content modules (the guides alone are 17k lines). Whether a twin
// exists is therefore decided from the URL shape, for the kinds where the shape
// is enough; the rest keep answering HTML, which is always a correct response.
// lib/__tests__/seo.negotiate.test.ts checks every path accepted here against
// the real resolver.

import { LANGS } from "../domain";

/** q-value of a media type in an Accept header; 0 when it is not listed. */
function qOf(accept: string, type: string): number {
  let best = 0;
  for (const part of accept.split(",")) {
    const [name, ...params] = part.trim().split(";");
    if (name.trim().toLowerCase() !== type) continue;
    let q = 1;
    for (const p of params) {
      const m = /^\s*q\s*=\s*([0-9.]+)\s*$/i.exec(p);
      if (m) q = Number(m[1]);
    }
    if (Number.isFinite(q) && q > best) best = Math.min(q, 1);
  }
  return best;
}

/**
 * True when the client asks for markdown at least as strongly as for HTML.
 * A wildcard does not count: only an explicit `text/markdown` opts in.
 */
export function prefersMarkdown(accept: string | null | undefined): boolean {
  if (!accept) return false;
  const md = qOf(accept, "text/markdown");
  return md > 0 && md >= qOf(accept, "text/html");
}

/** One-segment pages with a twin in every language. */
export const NEGOTIATED_SINGLES: readonly string[] = ["how-it-works", "about", "methodology", "sources", "benchmarks", "analyzer", "best-ai", "flow", "agent-ready"];
/** `/{lang}/<kind>/<slug>` kinds whose twin exists in every language whenever the page does. */
export const NEGOTIATED_KINDS_ALL_LANGS: readonly string[] = ["glossary", "models", "landing"];
/**
 * Kinds whose twin only exists where the content is written in that language:
 * guides are complete in es/en (pt and zh fall back guide by guide), AI Daily
 * is es/en (zh story by story). Elsewhere the page keeps answering HTML.
 */
export const NEGOTIATED_KINDS_ES_EN: readonly string[] = ["guides", "blog"];
const SLUG = /^[a-z0-9][a-z0-9-]*$/;

/**
 * The internal path of the markdown twin for a page path, or null when the page
 * is not negotiated. `/en` → `/md/en`, `/es/guides/x` → `/md/es/guides/x`.
 */
export function negotiatedTwinPath(pathname: string): string | null {
  const [lang, kind, slug, ...rest] = pathname.split("/").filter(Boolean);
  if (!lang || !(LANGS as readonly string[]).includes(lang) || rest.length > 0) return null;
  if (!kind) return `/md/${lang}`;
  if (!slug) return NEGOTIATED_SINGLES.includes(kind) ? `/md/${lang}/${kind}` : null;
  if (!SLUG.test(slug)) return null;
  if (NEGOTIATED_KINDS_ALL_LANGS.includes(kind)) return `/md/${lang}/${kind}/${slug}`;
  if (NEGOTIATED_KINDS_ES_EN.includes(kind) && (lang === "es" || lang === "en")) return `/md/${lang}/${kind}/${slug}`;
  return null;
}
