// Small i18n helpers for the analyzer components: template interpolation for
// dictionary strings like "Up to {max} files · {size} each."

import { wordCount } from "@/lib/engine/normalize";

export function tpl(template: string, vars: Record<string, string | number>): string {
  return Object.entries(vars).reduce(
    (acc, [key, value]) => acc.replaceAll(`{${key}}`, String(value)),
    template
  );
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb >= 100 ? 0 : 1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

const HAN = /\p{Script=Han}/gu;

/**
 * Approximate token count: ~4 characters per token for Latin-script text and,
 * v1.8.7, ~1 token per Han character (Chinese tokenizes much more densely).
 * Minimum 1.
 */
export function approxTokens(text: string): number {
  const han = (text.match(HAN) ?? []).length;
  return Math.max(1, han + Math.ceil((text.length - han) / 4));
}

/** Words, as the engine counts them (lib/engine/normalize.ts): Chinese by characters, the rest by spaces. */
export function countWords(text: string): number {
  return text.trim() === "" ? 0 : wordCount(text);
}
