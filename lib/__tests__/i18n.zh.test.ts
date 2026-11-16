// v1.8.7 — the Chinese (zh) interface outside the engine: images without Han characters
// (next/og ships no CJK font), full-width punctuation where code joins two strings, the
// Markdown twins and the CJK typography. The engine has its own suite (engine.zh.test.ts).

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

import { LANGS, PUNCT, PURPOSES, imageLang } from "@/lib/domain";
import { purposeLabel } from "@/lib/purposes";
import { formatEditorialDate } from "@/lib/blog/dates";
import { guideMarkdown, localizeMarkdownPunctuation } from "@/lib/seo/markdown";
import { getGuide } from "@/lib/seo/content/guides";
import { ANALYZER_LINK_TEXT } from "@/lib/seo/content/analyzerContent";

const HAN = /\p{Script=Han}/u;
const read = (file: string) => readFileSync(join(process.cwd(), file), "utf8").replace(/\r\n/g, "\n");

/** The `zh:` entry of an image file's COPY object (one line or an indented block). */
function zhCopy(file: string): string {
  const src = read(file);
  const block = /\n {2}zh: (\{[^\n]*\}|\{\n[\s\S]*?\n {2}\}),?\n/.exec(src);
  expect(block, `${file} has a zh entry in COPY`).not.toBeNull();
  return block![1];
}

describe("images under /zh have no Han characters (no CJK font in next/og)", () => {
  test("the home OG/Twitter card and the share card are written in Latin script", () => {
    for (const file of ["app/[lang]/opengraph-image.tsx", "app/api/share/card/route.tsx"]) {
      const copy = zhCopy(file);
      expect(copy.match(HAN)?.[0] ?? null, file).toBeNull();
      expect(copy.length, file).toBeGreaterThan(20);
    }
  });

  test("purpose labels and dates drawn on images use imageLang()", () => {
    expect(imageLang("zh")).not.toBe("zh");
    for (const l of LANGS.filter((x) => x !== "zh")) expect(imageLang(l)).toBe(l);
    for (const p of PURPOSES) expect(purposeLabel(p, imageLang("zh")), p).not.toMatch(HAN);
    expect(formatEditorialDate("2026-11-16", imageLang("zh"))).not.toMatch(HAN);
    // every image file that draws text for a language goes through imageLang
    for (const file of ["app/api/share/card/route.tsx", "app/[lang]/blog/[slug]/opengraph-image.tsx"]) {
      expect(read(file), file).toMatch(/imageLang\(/);
    }
  });
});

describe("punctuation that code puts between two strings", () => {
  test("Chinese is full width with no space; es, en and pt keep ': ' and '. '", () => {
    expect(PUNCT.zh).toEqual({ colon: "：", stop: "。", gap: "" });
    for (const l of LANGS.filter((x) => x !== "zh")) expect(PUNCT[l]).toEqual({ colon: ": ", stop: ". ", gap: " " });
  });

  test("Markdown twins in Chinese get full-width colons after Han labels only", () => {
    const md = ["来源: Promptea — https://promptea.me/zh", "语言: 简体中文", "**简而言之:** 一句话", "Note: keep", "- 输入: text · 输出: text"].join("\n");
    const out = localizeMarkdownPunctuation(md, "zh");
    expect(out).toContain("来源：Promptea — https://promptea.me/zh");
    expect(out).toContain("语言：简体中文");
    // the space after the closing ** stays, or CommonMark would not close the bold
    expect(out).toContain("**简而言之：** 一句话");
    expect(out).toContain("Note: keep");
    expect(out).toContain("- 输入：text · 输出：text");
    for (const l of LANGS.filter((x) => x !== "zh")) expect(localizeMarkdownPunctuation(md, l)).toBe(md);
  });

  test("the analyzer call to action of a translated guide reads as one Chinese sentence", () => {
    const g = getGuide("prompt-checklist")!;
    const md = guideMarkdown(g, "zh", "https://promptea.me/zh/guides/prompt-checklist", "2026-11-16");
    const line = md.split("\n").find((x) => x.includes(`[${ANALYZER_LINK_TEXT.zh}]`));
    expect(line).toBeDefined();
    expect(line).toMatch(new RegExp(`\\p{Script=Han}\\[${ANALYZER_LINK_TEXT.zh}\\]\\([^)]+/zh/analyzer\\)。$`, "u"));
  });
});

describe("CJK typography", () => {
  const css = read("app/globals.css");

  test("Chinese uses the system font stack under :lang(zh), with no web font download", () => {
    expect(css).toMatch(/:root:lang\(zh\)\s*\{[^}]*--zh-font-stack:[^;]*"PingFang SC"[^;]*"Microsoft YaHei"/);
    expect(css).not.toMatch(/@font-face[^}]*(Noto Sans SC|Noto Sans CJK|Source Han)/i);
    expect(css).not.toMatch(/@import[^;]*(Noto\+Sans\+SC|Noto Sans SC)/i);
  });

  test("no synthetic italics in Chinese", () => {
    expect(css).toMatch(/:lang\(zh\)[^{]*\b(?:em|i)\b[^{]*\{[^}]*font-style:\s*normal/);
  });
});
