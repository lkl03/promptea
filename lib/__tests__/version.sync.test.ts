// Version consistency across every surface. Future releases cannot silently
// diverge: package.json, lib/version.ts, the JSON-format output, and the
// newest changelog entry must all agree. Since v1.3.0 the checklist output
// carries NO version header — that absence is itself an invariant here.

import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { APP_VERSION } from "@/lib/version";
import { analyzePrompt } from "@/lib/analyzePrompt";

const root = process.cwd();

describe("version synchronization", () => {
  test("APP_VERSION is a semver string", () => {
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  test("package.json matches APP_VERSION", () => {
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as { version: string };
    expect(pkg.version).toBe(APP_VERSION);
  });

  test("package-lock.json metadata matches APP_VERSION", () => {
    const lock = JSON.parse(readFileSync(join(root, "package-lock.json"), "utf8")) as {
      version: string;
      packages?: Record<string, { version?: string }>;
    };
    expect(lock.version).toBe(APP_VERSION);
    expect(lock.packages?.[""]?.version).toBe(APP_VERSION);
  });

  test("checklist output carries NO PROMPTEA version header (v1.3.0)", () => {
    const r = analyzePrompt("Write a short note to my team about the launch.", "gpt", "en", "text");
    expect(r.optimizedPrompt).not.toContain("PROMPTEA: v");
    expect(r.optimizedPrompt).not.toMatch(/^PROMPTEA:/i);
  });

  test("JSON-format output carries APP_VERSION too", () => {
    const r = analyzePrompt("Extract fields {a, b} from the text as JSON.", "gpt", "en", "data", {
      format: "json",
    });
    expect(r.optimizedPrompt).toContain(`"promptea_version": "v${APP_VERSION}"`);
  });

  test("newest CHANGELOG.md entry is APP_VERSION (history untouched)", () => {
    const changelog = readFileSync(join(root, "CHANGELOG.md"), "utf8");
    const headings = [...changelog.matchAll(/^## v(\d+\.\d+\.\d+)/gm)].map((m) => m[1]);
    expect(headings.length).toBeGreaterThan(0);
    expect(headings[0]).toBe(APP_VERSION);
    // Historical entries must never be rewritten to the current version.
    expect(headings.slice(1)).not.toContain(APP_VERSION);
  });

  // v1.4.0 — the public /changelog page is a hand-written page, not generated
  // from CHANGELOG.md. It had silently fallen a release behind twice (it was
  // stuck at v1.2.0 before v1.3.1 caught it up, then missed v1.3.2 entirely)
  // because nothing here checked it. These two assertions close that gap.
  test("newest card on the public changelog page is APP_VERSION", () => {
    const page = readFileSync(join(root, "app", "[lang]", "changelog", "page.tsx"), "utf8");
    const cards = [...page.matchAll(/text-lg font-medium">v(\d+\.\d+\.\d+)</g)].map((m) => m[1]);

    expect(cards.length).toBeGreaterThan(0);
    expect(cards[0]).toBe(APP_VERSION);
    // A release must appear exactly once — no duplicated or rewritten cards.
    expect(cards.slice(1)).not.toContain(APP_VERSION);
  });

  test("every CHANGELOG.md release also has a card on the public page", () => {
    const root_ = process.cwd();
    const changelog = readFileSync(join(root_, "CHANGELOG.md"), "utf8");
    const page = readFileSync(join(root_, "app", "[lang]", "changelog", "page.tsx"), "utf8");

    const headings = [...changelog.matchAll(/^## v(\d+\.\d+\.\d+)/gm)].map((m) => m[1]);
    const cards = new Set(
      [...page.matchAll(/text-lg font-medium">v(\d+\.\d+\.\d+)</g)].map((m) => m[1])
    );

    // The page legitimately carries MORE history than CHANGELOG.md (whose
    // written history starts at v1.1.1), so this is one-directional.
    const missing = headings.filter((v) => !cards.has(v));
    expect(missing).toEqual([]);
  });
});
