// v1.8.5 — WCAG AA for the accent in Aqua, the default theme.
//
// Aqua's accent used to be Apple's system blue (#007aff): 4.02:1 under the white
// label of the primary button and 3.54:1 as link text on the canvas (AA asks 4.5:1
// for normal text). It is now #0061cc, with #0052ad for hover and for accent text
// on the soft tints (11 px badges). These checks read the real tokens from
// app/globals.css, so a later edit that brings a failing colour back fails here,
// and they pin Metro and Glass to their own accents (the change is Aqua-only).

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const css = readFileSync(join(process.cwd(), "app", "globals.css"), "utf-8").replace(/\r\n/g, "\n");

/** Custom properties declared directly in the first block opened by `selector`. */
function block(selector: string): Record<string, string> {
  const start = css.indexOf(selector);
  if (start < 0) throw new Error(`selector not found: ${selector}`);
  const open = css.indexOf("{", start);
  const close = css.indexOf("\n}", open);
  const body = css.slice(open + 1, close).replace(/\/\*[\s\S]*?\*\//g, "");
  const vars: Record<string, string> = {};
  for (const m of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) vars[m[1]] = m[2].trim();
  return vars;
}

type Rgba = { r: number; g: number; b: number; a: number };

function parse(color: string): Rgba {
  const hex = /^#([0-9a-f]{6})$/i.exec(color);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 };
  }
  const rgba = /^rgba?\(([^)]+)\)$/.exec(color);
  if (rgba) {
    const [r, g, b, a = 1] = rgba[1].split(",").map((v) => Number(v.trim()));
    return { r, g, b, a };
  }
  throw new Error(`unsupported colour: ${color}`);
}

const over = (top: Rgba, bottom: Rgba): Rgba => ({
  r: top.r * top.a + bottom.r * (1 - top.a),
  g: top.g * top.a + bottom.g * (1 - top.a),
  b: top.b * top.a + bottom.b * (1 - top.a),
  a: 1,
});

function luminance({ r, g, b }: Rgba): number {
  const f = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contrast(fg: Rgba, bg: Rgba): number {
  const [hi, lo] = [luminance(fg), luminance(bg)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const AA = 4.5;
const aqua = block(":root {");
const WHITE = parse("#ffffff");
const grounds = [parse(aqua["--canvas"]), parse(aqua["--canvas-deep"]), WHITE];

describe("Aqua accent contrast (v1.8.5)", () => {
  it("uses #0061cc as the solid accent and #0052ad for hover and badge text", () => {
    expect(aqua["--accent"]).toBe("#0061cc");
    expect(aqua["--accent-strong"]).toBe("#0052ad");
    expect(aqua["--accent-ink"]).toBe("#0052ad");
    expect(aqua["--info"]).toBe("#0061cc");
    expect(aqua["--info-ink"]).toBe("#0052ad");
  });

  it("the primary button label (on-accent over accent) passes AA at rest and on hover", () => {
    const label = parse(aqua["--on-accent"]);
    expect(contrast(label, parse(aqua["--accent"]))).toBeGreaterThanOrEqual(AA);
    expect(contrast(label, parse(aqua["--accent-strong"]))).toBeGreaterThanOrEqual(AA);
  });

  it("accent and info text pass AA on the canvas, the deep canvas and white", () => {
    for (const bg of grounds) {
      expect(contrast(parse(aqua["--accent"]), bg)).toBeGreaterThanOrEqual(AA);
      expect(contrast(parse(aqua["--info"]), bg)).toBeGreaterThanOrEqual(AA);
    }
  });

  it("accent and info badges (ink on the soft tint) pass AA on every ground", () => {
    for (const bg of grounds) {
      expect(contrast(parse(aqua["--accent-ink"]), over(parse(aqua["--accent-soft"]), bg))).toBeGreaterThanOrEqual(AA);
      expect(contrast(parse(aqua["--info-ink"]), over(parse(aqua["--info-soft"]), bg))).toBeGreaterThanOrEqual(AA);
    }
  });

  it("badges read the ink tokens, the primary button reads the accent", () => {
    expect(css).toMatch(/\.badge-accent\s*\{[^}]*color: var\(--accent-ink\)/);
    expect(css).toMatch(/\.badge-info\s*\{[^}]*color: var\(--info-ink\)/);
    expect(css).toMatch(/\.btn-primary \{\s*background: var\(--accent\);\s*color: var\(--on-accent\);/);
  });

  it("Metro and Glass keep their own accents: their ink tokens point at them", () => {
    for (const sel of [".metro,\n[data-theme=\"metro\"] {", ".glass,\n[data-theme=\"glass\"] {"]) {
      const t = block(sel);
      expect(t["--accent-ink"], sel).toBe("var(--accent)");
      expect(t["--info-ink"], sel).toBe("var(--info)");
    }
    expect(block(".metro,\n[data-theme=\"metro\"] {")["--accent"]).toBe("#0078d7");
    expect(block(".glass,\n[data-theme=\"glass\"] {")["--accent"]).toBe("#0b7a53");
  });
});
