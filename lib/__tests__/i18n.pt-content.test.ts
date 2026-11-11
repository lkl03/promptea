// v1.8.3 — mechanical guards for the Portuguese text (written by AI, see
// docs/i18n/pt-glossary.md). They cannot judge style; they catch the failures a
// machine can see: Spanish left inside a Portuguese string, a template that lost
// a [placeholder] in translation, and terminology the glossary rules out.

import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { glossary } from "@/lib/seo/content/glossary";
import { guides } from "@/lib/seo/content/guides";
import { landings } from "@/lib/seo/content/landings";
import { modelPages } from "@/lib/seo/content/models";
import { aboutDoc, homeAboutDoc, howItWorksDoc, methodologyDoc } from "@/lib/seo/content/sitePages";

type Entry = { path: string; value: string };

/** Every string of a tree; for `{ en, es, pt }` records, only the `pt` side. */
function ptStrings(obj: unknown, path: string, out: Entry[]): Entry[] {
  if (typeof obj === "string") out.push({ path, value: obj });
  else if (Array.isArray(obj)) obj.forEach((v, i) => ptStrings(v, `${path}[${i}]`, out));
  else if (obj && typeof obj === "object") {
    const o = obj as Record<string, unknown>;
    if ("pt" in o && "en" in o) ptStrings(o.pt, `${path}.pt`, out);
    else for (const [k, v] of Object.entries(o)) ptStrings(v, path ? `${path}.${k}` : k, out);
  }
  return out;
}

const all: Entry[] = [
  ...ptStrings(guides, "guides", []),
  ...ptStrings(glossary, "glossary", []),
  ...ptStrings(landings, "landings", []),
  ...ptStrings(modelPages, "models", []),
  ...ptStrings(homeAboutDoc("pt"), "home", []),
  ...ptStrings(howItWorksDoc("pt"), "how-it-works", []),
  ...ptStrings(aboutDoc("pt"), "about", []),
  ...ptStrings(methodologyDoc("pt"), "methodology", []),
  ...ptStrings(JSON.parse(readFileSync(join(process.cwd(), "app", "[lang]", "dictionaries", "pt.json"), "utf8")), "dict", []),
];

const hits = (re: RegExp) => all.filter((e) => re.test(e.value)).map((e) => `${e.path}: ${e.value.slice(0, 90)}`);

describe("Portuguese content (mechanical checks)", () => {
  test("there is a substantial amount of text to check", () => {
    expect(all.length).toBeGreaterThan(1500);
  });

  test("no Spanish punctuation or letters (ñ, ¿, ¡)", () => {
    expect(hits(/[ñÑ¿¡]/)).toEqual([]);
  });

  test("no Spanish -ción / -ciones endings (Portuguese: -ção / -ções)", () => {
    expect(hits(/\p{L}(ción|ciones)(?!\p{L})/u)).toEqual([]);
  });

  test("no Rioplatense imperatives carried over from the Spanish text", () => {
    // Followed by a hyphen it is a Portuguese verb with an enclitic pronoun ("usá-lo").
    expect(hits(/(?<![\p{L}-])(escribí|pegá|tenés|querés|podés|elegí|agregá|indicá|definí|probá|mirá)(?![\p{L}-])/iu)).toEqual([]);
  });

  test("glossary: 'você', never 'tu' forms; 'gratuito/grátis', never 'de graça'", () => {
    expect(hits(/(?<![\p{L}-])(teu|tua|teus|tuas|contigo)(?![\p{L}-])/iu)).toEqual([]);
    expect(hits(/de graça/i)).toEqual([]);
  });

  test("no European-Portuguese vocabulary (the locale is pt-BR)", () => {
    expect(hits(/(?<![\p{L}-])(ficheiro|ecrã|utilizador|telemóvel|registo|equipa|contacto|acção|óptimo|secção|direcção)s?(?![\p{L}-])/iu)).toEqual([]);
  });

  test("every guide template keeps the same number of [placeholders] in Portuguese as in English or Spanish", () => {
    const count = (s: string) => (s.match(/\[[^\]]*\]/g) ?? []).length;
    const wrong: string[] = [];
    for (const g of guides) {
      g.templates.forEach((t, i) => {
        const pt = count(t.prompt.pt);
        // The English and Spanish templates differ from each other in a few guides (written by hand); Portuguese must match one of them.
        if (pt !== count(t.prompt.en) && pt !== count(t.prompt.es)) wrong.push(`${g.slug} template ${i}: en ${count(t.prompt.en)}, es ${count(t.prompt.es)}, pt ${pt}`);
      });
    }
    expect(wrong).toEqual([]);
  });
});
