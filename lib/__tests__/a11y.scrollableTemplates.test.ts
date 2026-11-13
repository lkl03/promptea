// v1.8.4 — the prompt boxes on guide, model, glossary and prompt-pack pages are
// capped at max-h-56 and scroll inside (overflow-auto). A scrollable region that
// cannot take focus cannot be scrolled with the keyboard (WCAG 2.1.1, axe
// "scrollable-region-focusable"), so each one must be focusable and named.
// The name comes from the card's visible title via aria-labelledby, so it is
// translated wherever the title is, with no extra strings. role="group" is
// needed because <pre> maps to the generic role, where aria-label* is prohibited.

import { describe, expect, test } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const PACKS = readdirSync(join(process.cwd(), "app", "[lang]", "prompts"), { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => ["app", "[lang]", "prompts", d.name, "page.tsx"]);

const PAGES = [
  ["app", "[lang]", "guides", "[slug]", "page.tsx"],
  ["app", "[lang]", "models", "[slug]", "page.tsx"],
  ["app", "[lang]", "glossary", "[slug]", "page.tsx"],
  ...PACKS,
];

/** The id expression of an attribute: `"x"` or a template literal `{`x-${idx}`}`. */
function attr(tag: string, name: string): string | null {
  const m = tag.match(new RegExp(`${name}=(?:"([^"]+)"|\\{\`([^\`]+)\`\\})`));
  return m ? (m[1] ?? m[2]) : null;
}

describe("scrollable prompt boxes are keyboard-reachable and named", () => {
  test("covers the six prompt packs", () => {
    expect(PACKS.length).toBe(6);
  });

  test.each(PAGES.map((p) => [p.slice(2, 4).join("/"), p] as const))("%s", (_name, parts) => {
    const src = readFileSync(join(process.cwd(), ...parts), "utf8");
    const pres = [...src.matchAll(/<pre\b[^>]*>/g)].map((m) => m[0]);
    const scrollable = pres.filter((tag) => tag.includes("overflow-auto"));
    expect(scrollable.length).toBeGreaterThan(0);

    for (const tag of scrollable) {
      expect(tag).toContain("tabIndex={0}");
      expect(tag).toContain('role="group"');
      const labelledBy = attr(tag, "aria-labelledby");
      expect(labelledBy, tag).toBeTruthy();
      // The referenced id must be rendered on the same page (the card title).
      const ids = [...src.matchAll(/\bid=(?:"([^"]+)"|\{`([^`]+)`\})/g)].map((m) => m[1] ?? m[2]);
      expect(ids).toContain(labelledBy);
    }
  });
});
