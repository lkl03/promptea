// v1.8.3 — the prompt boxes on guide, model and glossary pages are capped at
// max-h-56 and scroll inside (overflow-auto). A scrollable region that cannot
// take focus cannot be scrolled with the keyboard (WCAG 2.1.1, axe
// "scrollable-region-focusable"), so each one must be focusable and named.

import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const PAGES = [
  ["app", "[lang]", "guides", "[slug]", "page.tsx"],
  ["app", "[lang]", "models", "[slug]", "page.tsx"],
  ["app", "[lang]", "glossary", "[slug]", "page.tsx"],
];

describe("scrollable prompt boxes are keyboard-reachable", () => {
  test.each(PAGES.map((p) => [p.slice(2, 3).join(""), p] as const))("%s", (_name, parts) => {
    const src = readFileSync(join(process.cwd(), ...parts), "utf8");
    const pres = [...src.matchAll(/<pre\b[^>]*>/g)].map((m) => m[0]);
    expect(pres.length).toBeGreaterThan(0);
    for (const tag of pres) {
      if (!tag.includes("overflow-auto")) continue;
      expect(tag).toContain("tabIndex={0}");
      expect(tag).toMatch(/aria-label=/);
    }
  });
});
