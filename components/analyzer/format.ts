// Small i18n helpers for the analyzer components: template interpolation for
// dictionary strings like "Up to {max} files · {size} each."

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

/** Approximate token count (chars / 4, minimum 1). */
export function approxTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

export function countWords(text: string): number {
  return text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
}
