// v1.8.0 — anti-regression for the translucent-modal bug.
//
// The feedback modal put role="dialog" on the very element that carries
// `.surface`, while the Glass rule only matched a `.surface` DESCENDANT of a
// dialog: the panel stayed see-through. These checks keep every overlay role
// covered by the shared rule and every theme defining the overlay token.

import { describe, expect, test } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const css = readFileSync(join(ROOT, "app", "globals.css"), "utf-8");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next" || name.startsWith(".")) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (full.endsWith(".tsx")) out.push(full);
  }
  return out;
}

const OVERLAY_ROLES = ["dialog", "alertdialog", "menu", "listbox"];

describe("overlay surfaces (v1.8.0)", () => {
  test("every theme block defines --overlay-fill (aqua/:root, metro, glass light, glass dark)", () => {
    const defs = css.match(/--overlay-fill\s*:/g) ?? [];
    expect(defs.length).toBeGreaterThanOrEqual(4);
  });

  test("the shared rule covers the surface being the dialog AND a surface inside the dialog", () => {
    expect(css).toMatch(/:is\(\[role="dialog"\][^)]*\)\.surface/);
    expect(css).toMatch(/:is\(\[role="dialog"\][^)]*\) \.surface/);
    expect(css).toMatch(/\[role="menu"\]/);
    expect(css).toMatch(/background:\s*var\(--overlay-fill\)/);
  });

  test("the old descendant-only Glass rule is gone", () => {
    expect(css).not.toMatch(/\[data-theme="glass"\] \[role="dialog"\] \.surface/);
  });

  test("every component that declares an overlay role also paints a .surface", () => {
    const offenders: string[] = [];
    for (const file of [...walk(join(ROOT, "app")), ...walk(join(ROOT, "components"))]) {
      const src = readFileSync(file, "utf-8");
      const uses = OVERLAY_ROLES.some((r) => src.includes(`role="${r}"`));
      if (!uses) continue;
      // The fill comes from `.surface` (covered above) or from an explicit overlay token.
      if (!/\bsurface\b/.test(src) && !src.includes("--overlay-fill")) offenders.push(relative(ROOT, file));
    }
    expect(offenders).toEqual([]);
  });

  test("a role=dialog element never carries a bare translucent utility fill instead of the shared surface", () => {
    for (const file of [...walk(join(ROOT, "app")), ...walk(join(ROOT, "components"))]) {
      const src = readFileSync(file, "utf-8");
      for (const m of src.matchAll(/role="(?:dialog|alertdialog|menu)"[^>]*className="([^"]*)"/g)) {
        expect(m[1], `${relative(ROOT, file)}: overlay element must not use bg-surface-soft/translucent fills`).not.toMatch(/\bbg-surface(?:-soft)?\b/);
      }
    }
  });
});
