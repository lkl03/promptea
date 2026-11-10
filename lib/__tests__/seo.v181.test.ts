// v1.8.1 — SEO fixes: editorial headlines clamped to a real <title>, and a
// documented ceiling for llms-full.txt that the builder itself enforces.

import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { clampTitle, pageMetadata, TITLE_MAX } from "@/lib/seo/metadata";
import { buildLlmsFullTxt, LLMS_FULL_ARTICLES_BYTES, LLMS_FULL_TOTAL_BYTES } from "@/lib/seo/llms";
import { LOCALES } from "@/lib/seo/site";
import { makeArticle } from "./seo.fixtures";

describe("clampTitle", () => {
  // The two production headlines `npm run seo:check` flagged (132 and 129 characters).
  const LONG = [
    "Anthropic admite que agentes Claude se extralimitaron en sitios reales, incluido un dato falso a la policía de Filadelfia",
    "Anthropic reports Claude agents overstepping on live websites, including a fake tip to Philadelphia police",
  ];

  test("long editorial headlines fit a <title>, cut at a whole word, closed with an ellipsis", () => {
    for (const h of LONG) {
      const t = clampTitle(h);
      expect(t.length).toBeLessThanOrEqual(TITLE_MAX);
      expect(t.endsWith("…")).toBe(true);
      const head = t.slice(0, -1);
      expect(h.startsWith(head)).toBe(true);
      // The cut is at a word boundary: the next character of the original is a space.
      expect(h[head.length]).toMatch(/[\s,;:.]/);
      expect(head).not.toMatch(/[\s,;:.\-–—]$/);
    }
  });

  test("short titles are untouched; whitespace is normalised", () => {
    expect(clampTitle("AI model benchmarks")).toBe("AI model benchmarks");
    expect(clampTitle("  Two   spaces \n here ")).toBe("Two spaces here");
    expect(clampTitle("x".repeat(TITLE_MAX))).toHaveLength(TITLE_MAX);
  });

  test("a single very long word is still cut", () => {
    const t = clampTitle("a".repeat(200));
    expect(t.length).toBeLessThanOrEqual(TITLE_MAX);
    expect(t.endsWith("…")).toBe(true);
  });

  test("the weekly edition page clamps its <title> and keeps the full headline for social cards", () => {
    const src = readFileSync(join(process.cwd(), "app", "[lang]", "blog", "weekly", "[date]", "page.tsx"), "utf8");
    expect(src).toMatch(/title: clampTitle\(c\.heroHeadline\)/);
    expect(src).toMatch(/socialTitle: c\.heroHeadline/);
    const m = pageMetadata({ lang: "es", path: "/es/blog/weekly/2026-10-12", title: clampTitle(LONG[0]), socialTitle: LONG[0], description: "d".repeat(80) });
    expect(String(m.title).length + " · Promptea".length).toBeLessThanOrEqual(90);
    expect((m.openGraph as { title: string }).title).toBe(LONG[0]);
    expect((m.twitter as { title: string }).title).toBe(LONG[0]);
  });
});

describe("llms-full.txt ceiling", () => {
  const kb = (s: string) => Buffer.byteLength(s) / 1024;

  test("the script and the builder agree on the ceiling", () => {
    const script = readFileSync(join(process.cwd(), "scripts", "seo-check.mjs"), "utf8");
    const m = /const LLMS_FULL_MAX_KB = (\d+);/.exec(script);
    expect(m).not.toBeNull();
    expect(Number(m![1]) * 1024).toBe(LLMS_FULL_TOTAL_BYTES);
  });

  for (const lang of LOCALES) {
    test(`${lang}: the explanatory part alone leaves at least 40 KB under the ceiling`, () => {
      const txt = buildLlmsFullTxt({ lang, articles: [], editions: [], benchmarks: null });
      expect(kb(txt)).toBeLessThan(LLMS_FULL_TOTAL_BYTES / 1024 - 40);
    });

    test(`${lang}: with many long stories the file still stays under the ceiling`, () => {
      // 30 stories with long bodies: far more than the AI Daily budget can hold.
      const long = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. ".repeat(60);
      const articles = Array.from({ length: 30 }, (_, i) => {
        const a = makeArticle({ slug: `story-${i}`, eventDate: `2026-11-${String((i % 9) + 1).padStart(2, "0")}` });
        return { ...a, lang, body: Array.from({ length: 12 }, () => ({ type: "paragraph" as const, text: long })) };
      });
      const withStories = buildLlmsFullTxt({ lang, articles: articles as never, editions: [], benchmarks: null });
      const without = buildLlmsFullTxt({ lang, articles: [], editions: [], benchmarks: null });
      expect(Buffer.byteLength(withStories)).toBeLessThanOrEqual(LLMS_FULL_TOTAL_BYTES);
      // AI Daily never takes more than its own budget either (heading and separators aside).
      expect(Buffer.byteLength(withStories) - Buffer.byteLength(without)).toBeLessThanOrEqual(LLMS_FULL_ARTICLES_BYTES + 2048);
    });
  }
});
