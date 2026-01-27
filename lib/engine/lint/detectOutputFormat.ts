import type { OutputFormat, Lang } from "./types";

function hasAny(text: string, patterns: RegExp[]) {
  return patterns.some((r) => r.test(text));
}

export function detectOutputFormat(prompt: string, lang: Lang): OutputFormat | null {
  const p = (prompt ?? "").toLowerCase();

  // “estricto”: SOLO JSON / ONLY JSON / JSON válido y nada más
  const strictJson =
    /solo\s+json\b/.test(p) ||
    /only\s+json\b/.test(p) ||
    /json\s+válido\b/.test(p) ||
    /valid\s+json\b/.test(p) ||
    /sin\s+texto\s+extra\b/.test(p) ||
    /no\s+incluyas\s+texto\b/.test(p);

  const json = hasAny(p, [
    /\bjson\b/,
    /\bschema\b/,
    /\bcampos\b/,
    /\bfields\b/,
    /\bparseable\b/,
  ]);

  const table = hasAny(p, [
    /\btabla\b/,
    /\btable\b/,
    /\bmarkdown\s+table\b/,
    /\btabular\b/,
  ]);

  const steps = hasAny(p, [
    /\bpasos\b/,
    /\bsteps\b/,
    /\bpaso\s+1\b/,
    /\bstep\s+1\b/,
    /\bnumbered\b/,
    /\benumerad[ao]s?\b/,
  ]);

  const bullets = hasAny(p, [
    /\bviñetas\b/,
    /\bbullets?\b/,
    /\blista\b/,
    /\bchecklist\b/,
    /\b- /, // guión típico
  ]);

  // Prioridad: JSON > table > steps > bullets (podés ajustar)
  if (json) return { kind: "json", strict: strictJson };
  if (table) return { kind: "table", strict: false };
  if (steps) return { kind: "steps", strict: false };
  if (bullets) return { kind: "bullets", strict: false };

  return null;
}
