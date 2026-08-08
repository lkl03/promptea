// lib/blog/render.ts
//
// v1.4.0 — article text processing.
//
// Article bodies are typed blocks of PLAIN TEXT (see lib/blog/types.ts). The
// only inline formatting supported is `**bold**` and `[label](https://url)`.
// This module turns a text string into typed tokens; the React component maps
// those tokens to elements.
//
// Security note: this never produces an HTML string, so there is no
// dangerouslySetInnerHTML anywhere on the article path. React escapes every
// text node, and link hrefs are re-validated as https here. A stored
// `<script>` is therefore rendered as visible text, not executed.

import type { Block } from "@/lib/blog/types";

export type InlineToken =
  | { kind: "text"; value: string }
  | { kind: "bold"; value: string }
  | { kind: "link"; value: string; href: string };

// `**bold**` or `[label](url)`. Non-greedy so adjacent spans don't merge.
const INLINE_RE = /\*\*(.+?)\*\*|\[([^\]\n]+?)\]\(([^)\s]+?)\)/g;

function isSafeHref(raw: string): boolean {
  try {
    return new URL(raw).protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Split one text string into inline tokens.
 *
 * Anything that isn't a recognised span stays literal text — including stray
 * asterisks, unmatched brackets and any HTML-looking characters. A link whose
 * URL is not https degrades to its label as plain text rather than rendering
 * an unsafe href.
 */
export function parseInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  let lastIndex = 0;

  // Reset because the regex is module-level and stateful with /g.
  INLINE_RE.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = INLINE_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ kind: "text", value: text.slice(lastIndex, match.index) });
    }

    const [full, boldBody, linkLabel, linkHref] = match;

    if (boldBody !== undefined) {
      tokens.push({ kind: "bold", value: boldBody });
    } else if (linkLabel !== undefined && linkHref !== undefined) {
      if (isSafeHref(linkHref)) {
        tokens.push({ kind: "link", value: linkLabel, href: linkHref });
      } else {
        tokens.push({ kind: "text", value: linkLabel });
      }
    }

    lastIndex = match.index + full.length;
  }

  if (lastIndex < text.length) {
    tokens.push({ kind: "text", value: text.slice(lastIndex) });
  }

  // An empty input should still yield one (empty) text token so callers can map
  // unconditionally.
  if (tokens.length === 0) tokens.push({ kind: "text", value: text });

  return tokens;
}

/** Strip inline markers, leaving readable prose. Used for RSS, OG and counts. */
export function stripInline(text: string): string {
  return parseInline(text)
    .map((t) => t.value)
    .join("");
}

/** Flatten a body to plain text — one line per block. */
export function blocksToPlainText(blocks: Block[]): string {
  const lines: string[] = [];
  for (const b of blocks) {
    switch (b.type) {
      case "paragraph":
      case "heading":
        lines.push(stripInline(b.text));
        break;
      case "quote":
        lines.push(stripInline(b.text) + (b.attribution ? ` — ${b.attribution}` : ""));
        break;
      case "list":
        for (const item of b.items) lines.push(stripInline(item));
        break;
    }
  }
  return lines.join("\n");
}

/** Word count of a rendered body. */
export function wordCount(blocks: Block[]): number {
  const text = blocksToPlainText(blocks).trim();
  if (!text) return 0;
  return text.split(/\s+/).length;
}

/**
 * Estimated reading time in whole minutes, floored at 1.
 * 200 wpm is the conventional figure for informational prose.
 */
export function readingMinutes(blocks: Block[]): number {
  return Math.max(1, Math.round(wordCount(blocks) / 200));
}

/** Truncate on a word boundary, for meta descriptions and feed summaries. */
export function truncateWords(text: string, maxChars: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= maxChars) return clean;
  const cut = clean.slice(0, maxChars);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/**
 * Escape the five XML-significant characters. Used ONLY by the RSS route,
 * which must emit a text document rather than React elements.
 */
export function escapeXml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
