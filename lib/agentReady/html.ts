// lib/agentReady/html.ts
//
// v1.9.0 — reads a fetched HTML document the way a non-rendering agent does:
// no JavaScript, no layout. Tolerant string parsing (no DOM dependency): the
// input is somebody else's markup, often broken, and only facts are needed —
// what the head declares, what text is there before any script runs, which
// structured data is embedded.
//
// Everything returned here is UNTRUSTED text taken from a third-party page.
// Callers that pass it on (the UI, the MCP server) must treat it as data.

export type HtmlTag = { name: string; attrs: Record<string, string>; raw: string };

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—", hellip: "…", copy: "©", laquo: "«", raquo: "»" };

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const code = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "";
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

function parseAttrs(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw))) {
    const key = m[1].toLowerCase();
    if (!(key in out)) out[key] = decodeEntities(m[2] ?? m[3] ?? m[4] ?? "");
  }
  return out;
}

/** Every opening tag with this name, in document order. */
export function tags(html: string, name: string): HtmlTag[] {
  const re = new RegExp(`<${name}\\b([^>]*)>`, "gi");
  const out: HtmlTag[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) out.push({ name, attrs: parseAttrs(m[1]), raw: m[0] });
  return out;
}

/** Inner text of each `<name>…</name>` block, raw (not decoded). */
export function blocks(html: string, name: string): Array<{ attrs: Record<string, string>; inner: string }> {
  const re = new RegExp(`<${name}\\b([^>]*)>([\\s\\S]*?)</${name}\\s*>`, "gi");
  const out: Array<{ attrs: Record<string, string>; inner: string }> = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) out.push({ attrs: parseAttrs(m[1]), inner: m[2] });
  return out;
}

const INVISIBLE = ["script", "style", "noscript", "template", "svg", "iframe", "canvas", "head"];

/** The document without comments and without the elements a reader never sees. */
export function stripInvisible(html: string): string {
  let out = html.replace(/<!--[\s\S]*?-->/g, " ");
  for (const name of INVISIBLE) out = out.replace(new RegExp(`<${name}\\b[^>]*>[\\s\\S]*?</${name}\\s*>`, "gi"), " ");
  return out;
}

const BLOCK_END = /<\/(p|div|section|article|header|footer|main|nav|aside|li|ul|ol|h[1-6]|tr|table|blockquote|pre|figure|figcaption|dd|dt|form)\s*>|<br\s*\/?>/gi;

/** Visible text: tags removed, entities decoded, whitespace collapsed, one line per block. */
export function visibleText(html: string): string {
  return decodeEntities(
    stripInvisible(html)
      .replace(BLOCK_END, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .split("\n")
    .map((line) => line.replace(/[ \t \r\f\v]+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

const textOf = (inner: string) => decodeEntities(inner.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();

/** Words for Latin scripts plus CJK characters (which carry a word each, roughly). */
export function countWords(text: string): number {
  const cjk = (text.match(/[぀-ヿ㐀-鿿가-힯]/g) ?? []).length;
  const latin = (text.replace(/[぀-ヿ㐀-鿿가-힯]/g, " ").match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) ?? []).length;
  return latin + Math.round(cjk / 1.7);
}

export type Heading = { level: number; text: string };

export function headings(html: string): Heading[] {
  const body = stripInvisible(html);
  const re = /<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1\s*>/gi;
  const out: Heading[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    const text = textOf(m[2]);
    if (text) out.push({ level: Number(m[1]), text });
  }
  return out;
}

export type JsonLdBlock = { ok: true; types: string[]; nodes: Array<Record<string, unknown>> } | { ok: false; error: string };

function collectNodes(value: unknown, into: Array<Record<string, unknown>>, depth = 0): void {
  if (depth > 6 || value === null || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const v of value) collectNodes(v, into, depth + 1);
    return;
  }
  const node = value as Record<string, unknown>;
  if ("@type" in node) into.push(node);
  if (Array.isArray(node["@graph"])) collectNodes(node["@graph"], into, depth + 1);
}

/** Every `<script type="application/ld+json">`, parsed. Invalid JSON is reported, not thrown. */
export function jsonLd(html: string): JsonLdBlock[] {
  return blocks(html, "script")
    .filter((b) => (b.attrs.type ?? "").toLowerCase().trim() === "application/ld+json")
    .map((b): JsonLdBlock => {
      try {
        const nodes: Array<Record<string, unknown>> = [];
        collectNodes(JSON.parse(b.inner.trim()), nodes);
        const types = nodes.flatMap((n) => (Array.isArray(n["@type"]) ? n["@type"] : [n["@type"]])).filter((t): t is string => typeof t === "string");
        return { ok: true, types, nodes };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message.slice(0, 120) : "invalid JSON" };
      }
    });
}

export type HeadFacts = {
  title: string;
  description: string;
  canonical: string;
  lang: string;
  robotsMeta: string;
  generator: string;
  og: Record<string, string>;
  /** `<link rel="alternate" type="text/markdown">` hrefs. */
  markdownAlternates: string[];
  hreflang: string[];
  /** `<link rel="…">` values that point agents somewhere (api-catalog, ai-catalog, mcp…). */
  agentLinks: Array<{ rel: string; href: string }>;
};

export function headFacts(html: string): HeadFacts {
  const headEnd = html.search(/<\/head\s*>/i);
  const head = headEnd === -1 ? html.slice(0, 60_000) : html.slice(0, headEnd);
  const metas = tags(head, "meta");
  const links = tags(head, "link");
  const meta = (name: string) => metas.find((m) => (m.attrs.name ?? "").toLowerCase() === name)?.attrs.content?.trim() ?? "";
  const og: Record<string, string> = {};
  for (const m of metas) {
    const p = (m.attrs.property ?? m.attrs.name ?? "").toLowerCase();
    if ((p.startsWith("og:") || p.startsWith("twitter:")) && m.attrs.content && !(p in og)) og[p] = m.attrs.content.trim();
  }
  const rels = (l: HtmlTag) => (l.attrs.rel ?? "").toLowerCase().split(/\s+/).filter(Boolean);
  const AGENT_RELS = ["api-catalog", "ai-catalog", "service-desc", "service-doc", "mcp", "describedby", "llms-txt"];
  return {
    title: textOf(blocks(head, "title")[0]?.inner ?? ""),
    description: meta("description"),
    canonical: links.find((l) => rels(l).includes("canonical"))?.attrs.href?.trim() ?? "",
    lang: tags(html.slice(0, 4_000), "html")[0]?.attrs.lang?.trim() ?? "",
    robotsMeta: meta("robots"),
    generator: meta("generator"),
    og,
    markdownAlternates: links.filter((l) => rels(l).includes("alternate") && (l.attrs.type ?? "").toLowerCase() === "text/markdown" && l.attrs.href).map((l) => l.attrs.href),
    hreflang: links.filter((l) => rels(l).includes("alternate") && l.attrs.hreflang).map((l) => l.attrs.hreflang.toLowerCase()),
    agentLinks: links.flatMap((l) => rels(l).filter((r) => AGENT_RELS.includes(r)).map((rel) => ({ rel, href: l.attrs.href ?? "" }))),
  };
}

export type BodyFacts = {
  words: number;
  textBytes: number;
  headings: Heading[];
  h1Count: number;
  hasMain: boolean;
  landmarks: string[];
  links: number;
  images: number;
  imagesWithAlt: number;
  forms: number;
  scripts: number;
  /** A root element a client-side framework mounts into, found with almost no text around it. */
  appShellRoot: string;
};

export function bodyFacts(html: string): BodyFacts {
  const visible = stripInvisible(html);
  const text = visibleText(html);
  const hs = headings(html);
  const imgs = tags(visible, "img");
  const landmarks = ["header", "nav", "main", "article", "section", "aside", "footer"].filter((n) => new RegExp(`<${n}\\b`, "i").test(visible));
  const root = /<div\b[^>]*\bid\s*=\s*["']?(root|app|__next|__nuxt|___gatsby|svelte)["']?[^>]*>/i.exec(visible)?.[1] ?? "";
  return {
    words: countWords(text),
    textBytes: Buffer.byteLength(text),
    headings: hs,
    h1Count: hs.filter((h) => h.level === 1).length,
    hasMain: landmarks.includes("main") || /\brole\s*=\s*["']?main\b/i.test(visible),
    landmarks,
    links: tags(visible, "a").filter((a) => a.attrs.href).length,
    images: imgs.length,
    imagesWithAlt: imgs.filter((i) => (i.attrs.alt ?? "").trim().length > 0).length,
    forms: tags(visible, "form").length,
    scripts: tags(html, "script").filter((s) => (s.attrs.type ?? "").toLowerCase() !== "application/ld+json").length,
    appShellRoot: root,
  };
}

/** WebMCP, read statically: declarative form attributes and the imperative API name in inline code. */
export function webMcpSignals(html: string): { declarativeForms: number; imperative: boolean } {
  const declarativeForms = tags(html, "form").filter((f) => "toolname" in f.attrs).length;
  const inline = blocks(html, "script").map((b) => b.inner).join("\n");
  return { declarativeForms, imperative: /\bmodelContext\s*\.\s*(registerTool|provideContext)\b/.test(inline) };
}

export type DetectedStack = "next-app" | "next-pages" | "astro" | "wordpress" | "generic";

export function detectStack(html: string, headers: Record<string, string>): DetectedStack {
  const powered = (headers["x-powered-by"] ?? "").toLowerCase();
  const generator = headFacts(html).generator.toLowerCase();
  if (/self\.__next_f\b|__next_f\.push/.test(html)) return "next-app";
  if (/id=["']__NEXT_DATA__["']/.test(html)) return "next-pages";
  if (powered.includes("next.js") || /\/_next\/static\//.test(html)) return "next-app";
  if (generator.startsWith("astro") || /<astro-island\b/i.test(html)) return "astro";
  if (generator.startsWith("wordpress") || /\/wp-(content|includes)\//.test(html)) return "wordpress";
  return "generic";
}
