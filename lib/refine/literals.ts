// lib/refine/literals.ts
//
// Protected-literal extraction. These are the parts of a user prompt that a
// rewrite must NEVER alter: URLs, file paths, code identifiers, versions,
// numeric requirements, emails, CLI commands, branch names, placeholders.
// The quality gate rejects any adaptive rewrite that loses one of them.

const PATTERNS: Array<{ kind: string; re: RegExp }> = [
  // URLs (with or without scheme)
  { kind: "url", re: /\bhttps?:\/\/[^\s<>"')\]]+/gi },
  // Emails
  { kind: "email", re: /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g },
  // Inline code spans `like_this`
  { kind: "code", re: /`[^`\n]{2,120}`/g },
  // File paths: unix + windows + relative segment paths (lib/models.ts,
  // feat/v1.2-branch) + bare filenames with known extensions
  { kind: "path", re: /(?:[A-Za-z]:\\|\.{0,2}\/)[\w.\-\\/[\]]+/g },
  { kind: "path", re: /\b[\w.-]+(?:\/[\w.\-[\]]+)+\b/g },
  {
    kind: "file",
    re: /\b[\w.-]+\.(?:tsx?|jsx?|mjs|cjs|py|rb|go|rs|java|kt|cs|php|sql|sh|ps1|yml|yaml|json|jsonl|toml|ini|env|md|css|scss|html|vue|svelte|csv|txt|log|pdf|png|jpe?g|webp|svg)\b/gi,
  },
  // Version numbers (v1.2.3, 1.2.3, Next.js 14, node 20.18)
  { kind: "version", re: /\bv?\d+\.\d+(?:\.\d+)*(?:-[\w.]+)?\b/g },
  // Template placeholders {{name}}, {name}, [NAME], <NAME>
  { kind: "placeholder", re: /\{\{[^{}\n]{1,40}\}\}|\[[A-Z0-9_ ]{2,30}\]/g },
  // Money / quantities with units (e.g. $1500, 120 words, 3 laptops)
  { kind: "amount", re: /[$€£]\s?\d[\d,.]*|\b\d[\d,.]*\s?(?:%|USD|ARS|EUR|tokens?|palabras?|words?|caracteres|characters|px|kb|mb|gb)\b/gi },
];

export type ProtectedLiteral = { kind: string; value: string };

/** Extract the set of literals in `text` that a rewrite must preserve verbatim. */
export function extractProtectedLiterals(text: string): ProtectedLiteral[] {
  const src = String(text ?? "");
  const seen = new Set<string>();
  const out: ProtectedLiteral[] = [];

  for (const { kind, re } of PATTERNS) {
    re.lastIndex = 0;
    for (const match of src.matchAll(re)) {
      const value = match[0].trim().replace(/[.,;:]+$/, "");
      if (value.length < 2) continue;
      // Skip bare "version" matches that are really list numbering like "1." or dates handled below
      if (kind === "version" && /^\d+\.$/.test(value)) continue;
      const key = `${kind}:${value.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ kind, value });
    }
  }

  return out;
}

export type LiteralCheck = { ok: boolean; missing: ProtectedLiteral[] };

/**
 * Verify that every protected literal from the original prompt is still
 * present (verbatim, case-insensitive) in the rewritten prompt.
 */
export function literalsPreserved(literals: ProtectedLiteral[], rewritten: string): LiteralCheck {
  const haystack = String(rewritten ?? "").toLowerCase();
  const missing = literals.filter((l) => !haystack.includes(l.value.toLowerCase()));
  return { ok: missing.length === 0, missing };
}
