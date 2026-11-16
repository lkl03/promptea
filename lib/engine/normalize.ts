export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function normalizeText(s: string) {
  return (s ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Han ideographs (written Chinese has no spaces between words). */
const HAN_RE = /\p{Script=Han}/gu;

/**
 * Words in a text. v1.8.7: Chinese is written without spaces, so a run of Han
 * characters counts as characters / 1.7 words (the average length of a
 * Chinese word); everything else is counted by whitespace, as before — a text
 * without Han characters gets exactly the v1.8.6 count.
 */
export function wordCount(s: string) {
  const text = normalizeText(s);
  const han = (text.match(HAN_RE) ?? []).length;
  const m = (han ? text.replace(HAN_RE, " ") : text).match(/\S+/g);
  return (m ? m.length : 0) + (han ? Math.max(1, Math.round(han / 1.7)) : 0);
}

export function approxTokensFromWords(words: number) {
  return Math.max(1, Math.round(words / 0.75));
}

// dedupe por bloques (no solo líneas consecutivas)
function dedupeBlocks(text: string) {
  const raw = normalizeText(text);
  const blocks = raw.split(/\n{2,}/).map((b) => normalizeText(b));
  const out: string[] = [];

  for (const b of blocks) {
    const key = b.toLowerCase().replace(/\s+/g, " ").trim();
    const prevKey = out.length ? out[out.length - 1].toLowerCase().replace(/\s+/g, " ").trim() : "";
    if (key && key === prevKey) continue;
    out.push(b);
  }

  return normalizeText(out.join("\n\n"));
}

export function cleanupDuplication(text: string) {
  // 1) elimina líneas idénticas consecutivas
  const lines = normalizeText(text).split("\n");
  const out: string[] = [];
  for (const line of lines) {
    const cur = line.trim();
    const prev = out.length ? out[out.length - 1].trim() : "";
    if (cur && prev && cur === prev) continue;
    out.push(line);
  }
  // 2) dedupe de bloques
  return dedupeBlocks(out.join("\n"));
}