// scripts/seo/html.mjs
//
// Dependency-free helpers to read the HTML a crawler receives: the head tags,
// the headings, the visible text and the JSON-LD blocks. Used by
// scripts/seo-check.mjs and by the unit tests, so the same parser that guards
// the running site is itself tested.

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

export function decodeEntities(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === "#") {
      const code = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

/** Lower-case, collapse whitespace and typographic quotes: for "is this text on the page" comparisons. */
export function normalizeText(s) {
  return decodeEntities(String(s))
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function attr(tag, name) {
  const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, "i"));
  return m ? decodeEntities(m[1] ?? m[2] ?? "") : null;
}

function allTags(html, name) {
  return [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, "gi"))].map((m) => m[0]);
}

/** The visible text of the document (scripts, styles and tags removed). */
export function visibleText(html) {
  const body = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>|<!--[\s\S]*?-->/gi, " ");
  return normalizeText(body.replace(/<[^>]+>/g, " "));
}

export function headings(html, level) {
  return [...html.matchAll(new RegExp(`<h${level}\\b[^>]*>([\\s\\S]*?)</h${level}>`, "gi"))].map((m) =>
    normalizeText(m[1].replace(/<[^>]+>/g, " ")),
  );
}

/** Every <meta name|property=...> as { key, content }. */
export function metaTags(html) {
  const out = [];
  for (const t of allTags(html, "meta")) {
    const key = attr(t, "name") ?? attr(t, "property");
    if (key) out.push({ key, content: attr(t, "content") ?? "", media: attr(t, "media") });
  }
  return out;
}

export function linkTags(html) {
  return allTags(html, "link").map((t) => ({
    rel: attr(t, "rel"),
    href: attr(t, "href"),
    hreflang: attr(t, "hreflang"),
    type: attr(t, "type"),
  }));
}

export function titles(html) {
  return [...html.matchAll(/<title>([\s\S]*?)<\/title>/gi)].map((m) => decodeEntities(m[1]).trim());
}

/** Raw JSON-LD script bodies, in document order. */
export function ldBlocks(html) {
  return [...html.matchAll(/<script\b[^>]*type\s*=\s*"application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
}

/** A page's head, summarised for the checks. */
export function parseHead(html) {
  const metas = metaTags(html);
  const links = linkTags(html);
  const count = (k) => metas.filter((m) => m.key === k).length;
  const first = (k) => metas.find((m) => m.key === k)?.content;
  return {
    titles: titles(html),
    h1: headings(html, 1),
    canonicals: links.filter((l) => l.rel === "canonical").map((l) => l.href),
    hreflang: Object.fromEntries(links.filter((l) => l.rel === "alternate" && l.hreflang).map((l) => [l.hreflang, l.href])),
    hreflangCount: links.filter((l) => l.rel === "alternate" && l.hreflang).length,
    markdownAlternate: links.find((l) => l.rel === "alternate" && l.type === "text/markdown")?.href ?? null,
    count,
    first,
    metas,
  };
}
