// Version consistency across every surface. Future releases cannot silently
// diverge: package.json, lib/version.ts, the optimized-prompt header, and the
// newest changelog entry must all agree.

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

  test("optimized prompt header carries APP_VERSION", () => {
    const r = analyzePrompt("Write a short note to my team about the launch.", "gpt", "en", "text");
    expect(r.optimizedPrompt.startsWith(`PROMPTEA: v${APP_VERSION}`)).toBe(true);
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
});
