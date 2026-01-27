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

export function wordCount(s: string) {
  const m = normalizeText(s).match(/\S+/g);
  return m ? m.length : 0;
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