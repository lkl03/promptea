// lib/__tests__/blog.render.test.ts
//
// v1.4.0 — inline parsing and text derivation.
//
// The security posture of the whole article pipeline is: lib/blog/render.ts
// never returns an HTML string, only typed tokens, and a link token is only
// ever produced for an https URL. React then escapes every text node. That is
// what makes it safe to render editorially-generated content with no
// dangerouslySetInnerHTML anywhere on the article path.
//
// The "security" block below asserts both halves of that claim directly.

import { describe, expect, test } from "vitest";
import {
  blocksToPlainText,
  escapeXml,
  parseInline,
  readingMinutes,
  stripInline,
  truncateWords,
  wordCount,
  type InlineToken,
} from "@/lib/blog/render";
import type { Block } from "@/lib/blog/types";

const kinds = (tokens: InlineToken[]) => tokens.map((t) => t.kind);
const joined = (tokens: InlineToken[]) => tokens.map((t) => t.value).join("");

describe("parseInline — plain text", () => {
  test("returns a single text token for unformatted prose", () => {
    expect(parseInline("Orion is available today.")).toEqual([
      { kind: "text", value: "Orion is available today." },
    ]);
  });

  test("returns one empty text token for an empty string", () => {
    expect(parseInline("")).toEqual([{ kind: "text", value: "" }]);
  });

  test("preserves accented Spanish text byte for byte", () => {
    const text = "La ventana de contexto es más grande que la generación anterior.";
    expect(parseInline(text)).toEqual([{ kind: "text", value: text }]);
  });
});

describe("parseInline — bold", () => {
  test("splits a bold span out of surrounding text", () => {
    expect(parseInline("Example Labs shipped **Orion** today.")).toEqual([
      { kind: "text", value: "Example Labs shipped " },
      { kind: "bold", value: "Orion" },
      { kind: "text", value: " today." },
    ]);
  });

  test("handles a bold span at the very start and very end", () => {
    expect(parseInline("**Orion** ships")).toEqual([
      { kind: "bold", value: "Orion" },
      { kind: "text", value: " ships" },
    ]);
    expect(parseInline("ships **Orion**")).toEqual([
      { kind: "text", value: "ships " },
      { kind: "bold", value: "Orion" },
    ]);
  });

  test("is non-greedy, so two bold spans do not merge into one", () => {
    expect(parseInline("**a** and **b**")).toEqual([
      { kind: "bold", value: "a" },
      { kind: "text", value: " and " },
      { kind: "bold", value: "b" },
    ]);
  });
});

describe("parseInline — links", () => {
  test("produces a link token for an https URL", () => {
    expect(parseInline("see the [model card](https://example.com/orion) for details")).toEqual([
      { kind: "text", value: "see the " },
      { kind: "link", value: "model card", href: "https://example.com/orion" },
      { kind: "text", value: " for details" },
    ]);
  });

  test("keeps query strings and fragments in the href", () => {
    const tokens = parseInline("[docs](https://example.com/a?b=1&c=2#frag)");
    expect(tokens).toEqual([
      { kind: "link", value: "docs", href: "https://example.com/a?b=1&c=2#frag" },
    ]);
  });
});

describe("parseInline — mixed and adjacent spans", () => {
  test("handles several spans of both kinds in one string", () => {
    const tokens = parseInline(
      "**Orion** ships with a [model card](https://example.com/mc) and **new pricing** today."
    );
    expect(kinds(tokens)).toEqual(["bold", "text", "link", "text", "bold", "text"]);
    expect(joined(tokens)).toBe(
      "Orion ships with a model card and new pricing today."
    );
  });

  test("emits no empty text token between directly adjacent spans", () => {
    const tokens = parseInline("**a**[b](https://example.com)");
    expect(tokens).toEqual([
      { kind: "bold", value: "a" },
      { kind: "link", value: "b", href: "https://example.com" },
    ]);
  });
});

describe("parseInline — malformed markers stay literal", () => {
  test("an unmatched ** is not treated as bold", () => {
    expect(parseInline("a ** b")).toEqual([{ kind: "text", value: "a ** b" }]);
    expect(parseInline("**unclosed")).toEqual([{ kind: "text", value: "**unclosed" }]);
    expect(parseInline("trailing**")).toEqual([{ kind: "text", value: "trailing**" }]);
  });

  test("unmatched brackets are not treated as a link", () => {
    expect(parseInline("a [label] b")).toEqual([{ kind: "text", value: "a [label] b" }]);
    expect(parseInline("[label](https://example.com")).toEqual([
      { kind: "text", value: "[label](https://example.com" },
    ]);
    expect(parseInline("label](https://example.com)")).toEqual([
      { kind: "text", value: "label](https://example.com)" },
    ]);
  });

  test("a stray asterisk or bracket never yields a bold or link token", () => {
    for (const junk of ["*single*", "a * b", "]", "[", "()", "[]()"]) {
      expect(kinds(parseInline(junk))).toEqual(["text"]);
    }
  });
});

describe("parseInline — SECURITY: unsafe hrefs degrade to plain text", () => {
  test.each([
    ["http", "[click](http://evil.example.com/pwn)"],
    ["javascript", "[click](javascript:alert)"],
    ["javascript with parens", "[click](javascript:alert(1))"],
    ["data", "[click](data:text/html;base64,PHNjcmlwdD4=)"],
    ["vbscript", "[click](vbscript:msgbox)"],
    ["file", "[click](file:///etc/passwd)"],
    ["protocol-relative", "[click](//evil.example.com)"],
    ["scheme-obfuscated", "[click](JaVaScRiPt:alert)"],
  ])("%s URLs produce no link token", (_label, input) => {
    const tokens = parseInline(input);

    // The load-bearing assertion: no link token at all.
    expect(tokens.some((t) => t.kind === "link")).toBe(false);
    expect(kinds(tokens).every((k) => k === "text")).toBe(true);

    // And no token carries an href, so nothing downstream can resurrect one.
    for (const token of tokens) {
      expect(Object.prototype.hasOwnProperty.call(token, "href")).toBe(false);
    }

    // The label survives as readable text; the URL is dropped entirely.
    expect(joined(tokens)).toContain("click");
    expect(joined(tokens).toLowerCase()).not.toContain("javascript:");
    expect(joined(tokens).toLowerCase()).not.toContain("data:");
    expect(joined(tokens).toLowerCase()).not.toContain("evil.example.com");
  });

  test("a safe https link in the same string still works", () => {
    const tokens = parseInline(
      "[bad](javascript:alert) and [good](https://example.com/ok)"
    );
    const links = tokens.filter((t) => t.kind === "link");
    expect(links).toEqual([{ kind: "link", value: "good", href: "https://example.com/ok" }]);
  });
});

describe("parseInline — SECURITY: markup survives as literal text", () => {
  const payload = "<script>alert(1)</script>";

  test("a script tag is returned as an inert text token", () => {
    const tokens = parseInline(payload);
    expect(tokens).toEqual([{ kind: "text", value: payload }]);
    expect(tokens[0].kind).toBe("text");
  });

  test("markup inside a bold span stays inside a bold TEXT value", () => {
    const tokens = parseInline(`before **<img src=x onerror=alert(1)>** after`);
    expect(kinds(tokens)).toEqual(["text", "bold", "text"]);
    expect(tokens[1]).toEqual({ kind: "bold", value: "<img src=x onerror=alert(1)>" });
  });

  test("the module never returns an HTML string — only an array of typed tokens", () => {
    for (const input of [
      payload,
      "**bold**",
      "[a](https://example.com)",
      "<b>x</b> & <i>y</i>",
      "plain",
    ]) {
      const tokens = parseInline(input);
      expect(Array.isArray(tokens)).toBe(true);
      for (const token of tokens) {
        expect(["text", "bold", "link"]).toContain(token.kind);
        expect(typeof token.value).toBe("string");
        // No escaping, no entity encoding, no HTML: the raw characters are
        // handed to React, which escapes them at render time.
        expect(token.value).not.toContain("&lt;");
        expect(token.value).not.toContain("&amp;");
      }
    }
  });

  test("angle brackets and ampersands are passed through unescaped", () => {
    const text = "a < b && c > d";
    expect(parseInline(text)).toEqual([{ kind: "text", value: text }]);
  });
});

// INLINE_RE is module-level and carries the /g flag, so it has a mutable
// `lastIndex`. parseInline zeroes it defensively before every run. Today the
// exec loop always drains to completion, and a failed exec resets lastIndex to
// 0 on its own — so no public call path can currently leave it dirty. These
// tests are the tripwire for the day that changes: a `break` added to the loop,
// or any second consumer of INLINE_RE calling `.test()`/`.exec()` on it, would
// leave lastIndex mid-string and the very first span of the next parse would be
// swallowed. Each assertion below pins the LEADING token for exactly that
// reason.
describe("parseInline — the module-level /g regex must not leak state", () => {
  const input = "**Orion** ships with a [model card](https://example.com/mc) today.";
  const expected: InlineToken[] = [
    { kind: "bold", value: "Orion" },
    { kind: "text", value: " ships with a " },
    { kind: "link", value: "model card", href: "https://example.com/mc" },
    { kind: "text", value: " today." },
  ];

  test("a single call already resolves the leading span", () => {
    expect(parseInline(input)).toEqual(expected);
  });

  test("two consecutive calls on the same input are identical", () => {
    const first = parseInline(input);
    const second = parseInline(input);
    expect(second).toEqual(first);
    expect(second).toEqual(expected);
    // The leading bold span is the first thing a stale lastIndex would eat.
    expect(second[0]).toEqual({ kind: "bold", value: "Orion" });
  });

  test("stays identical across many calls and interleaved inputs", () => {
    for (let i = 0; i < 10; i++) {
      // A longer string first: under a leak, its end position would land deep
      // inside the shorter one and truncate it.
      parseInline(
        "**a much longer preceding string** with [its own link](https://example.com/other) and trailing prose"
      );
      expect(parseInline(input)).toEqual(expected);
    }
  });

  test("interleaving the derived helpers does not desync the parser", () => {
    stripInline("**warm up** the [regex](https://example.com/warm)");
    blocksToPlainText([{ type: "paragraph", text: "**more** [state](https://example.com/s)" }]);
    expect(parseInline(input)).toEqual(expected);
  });

  test("mapping the same text repeatedly yields identical token arrays", () => {
    const parsed = [input, input, input].map((r) => parseInline(r));
    expect(parsed[0]).toEqual(expected);
    expect(parsed[1]).toEqual(parsed[0]);
    expect(parsed[2]).toEqual(parsed[0]);
  });
});

describe("stripInline", () => {
  test("removes bold and link markers, keeping readable prose", () => {
    expect(stripInline("**Orion** has a [model card](https://example.com/mc).")).toBe(
      "Orion has a model card."
    );
  });

  test("drops an unsafe URL entirely, keeping only its label", () => {
    expect(stripInline("[click](javascript:alert) me")).toBe("click me");
  });

  test("leaves unformatted text untouched", () => {
    expect(stripInline("nothing to strip")).toBe("nothing to strip");
    expect(stripInline("")).toBe("");
  });
});

const sampleBody: Block[] = [
  { type: "heading", level: 2, text: "What actually changed" },
  { type: "paragraph", text: "Example Labs shipped **Orion** today." },
  { type: "list", ordered: false, items: ["400k context", "Lower output pricing"] },
  { type: "quote", text: "Available to every paid tier.", attribution: "Model card" },
];

describe("blocksToPlainText", () => {
  test("flattens every block kind to one line each, list items included", () => {
    expect(blocksToPlainText(sampleBody)).toBe(
      [
        "What actually changed",
        "Example Labs shipped Orion today.",
        "400k context",
        "Lower output pricing",
        "Available to every paid tier. — Model card",
      ].join("\n")
    );
  });

  test("omits the attribution dash when a quote has no attribution", () => {
    expect(blocksToPlainText([{ type: "quote", text: "No attribution." }])).toBe(
      "No attribution."
    );
  });

  test("returns an empty string for an empty body", () => {
    expect(blocksToPlainText([])).toBe("");
  });

  test("strips inline markers rather than leaking them into plain text", () => {
    const out = blocksToPlainText([
      { type: "paragraph", text: "See the [docs](https://example.com/d) and **note** this." },
    ]);
    expect(out).toBe("See the docs and note this.");
    expect(out).not.toContain("**");
    expect(out).not.toContain("https://");
  });
});

describe("wordCount", () => {
  test("counts words across all blocks", () => {
    // heading 3 + paragraph 5 + list items 2 and 3 + quote line 8 (the quote's
    // five words plus the "—" separator and its two-word attribution).
    expect(wordCount(sampleBody)).toBe(21);
  });

  test("is zero for an empty body and for whitespace-only text", () => {
    expect(wordCount([])).toBe(0);
    expect(wordCount([{ type: "paragraph", text: "   " }])).toBe(0);
  });
});

describe("readingMinutes", () => {
  test("floors at one minute for very short articles", () => {
    expect(readingMinutes([{ type: "paragraph", text: "hola" }])).toBe(1);
    expect(readingMinutes([])).toBe(1);
  });

  test("uses 200 words per minute", () => {
    const words = (n: number): Block[] => [
      { type: "paragraph", text: Array.from({ length: n }, () => "w").join(" ") },
    ];
    expect(readingMinutes(words(600))).toBe(3);
    expect(readingMinutes(words(1000))).toBe(5);
  });
});

describe("truncateWords", () => {
  const text =
    "lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor";

  test("leaves a short string alone and adds no ellipsis", () => {
    expect(truncateWords("hola mundo", 50)).toBe("hola mundo");
    expect(truncateWords("hola mundo", 50)).not.toContain("…");
  });

  test("collapses runs of whitespace before measuring", () => {
    expect(truncateWords("hola    mundo\n\nde  nuevo", 50)).toBe("hola mundo de nuevo");
  });

  test("cuts on a word boundary and appends an ellipsis", () => {
    const out = truncateWords(text, 60);
    expect(out).toBe("lorem ipsum dolor sit amet consectetur adipiscing elit sed…");
    expect(out.endsWith("…")).toBe(true);
    // Nothing was cut mid-word: the kept prefix is followed by a space in the
    // original.
    const kept = out.slice(0, -1);
    expect(text.startsWith(kept)).toBe(true);
    expect(text[kept.length]).toBe(" ");
  });

  test("hard-cuts when the last space is too early to be a useful boundary", () => {
    expect(truncateWords(text, 20)).toBe("lorem ipsum dolor si…");
  });

  test("respects the character budget within one ellipsis character", () => {
    for (const max of [20, 40, 60, 75]) {
      expect(truncateWords(text, max).length).toBeLessThanOrEqual(max + 1);
    }
  });

  test("returns the whole string when the budget exceeds its length", () => {
    expect(truncateWords(text, 500)).toBe(text);
  });
});

describe("escapeXml", () => {
  test("escapes all five XML-significant characters", () => {
    expect(escapeXml("<>&\"'")).toBe("&lt;&gt;&amp;&quot;&apos;");
  });

  test("escapes the ampersand first, so nothing is double-escaped", () => {
    expect(escapeXml("a & b")).toBe("a &amp; b");
    expect(escapeXml("<a href=\"x\">Tom & Jerry's</a>")).toBe(
      "&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&apos;s&lt;/a&gt;"
    );
    expect(escapeXml("&amp;")).toBe("&amp;amp;");
  });

  test("leaves ordinary text and accented characters untouched", () => {
    expect(escapeXml("generación más grande")).toBe("generación más grande");
    expect(escapeXml("")).toBe("");
  });
});
