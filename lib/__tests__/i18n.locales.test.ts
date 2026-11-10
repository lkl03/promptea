// v1.8.2 — the locale infrastructure: ONE list of interface languages
// (lib/domain.ts LANGS) that the proxy, the routes, hreflang and the metadata
// derive from, and the split between interface languages (es, en, pt) and the
// languages editorial content is written in (es, en).

import { describe, expect, test } from "vitest";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { NextRequest } from "next/server";

import { proxy } from "@/proxy";
import {
  CONTENT_LANGS,
  DEFAULT_LANG,
  INTL_LOCALE,
  LANGS,
  LANG_LABEL,
  LANG_NAME,
  LANG_TAG,
  contentIsFallback,
  contentLangFor,
  isLang,
  pick,
  toLang,
} from "@/lib/domain";
import { HREFLANG, LOCALES, LOCALE_PREFIX_RE, OG_LOCALE, X_DEFAULT_LOCALE, isLocale, swapLocale } from "@/lib/seo/site";
import { languageAlternates, pageMetadata } from "@/lib/seo/metadata";
import { replaceLocale } from "@/components/LanguageSwitcher";

describe("one list of locales", () => {
  test("es, en and pt; the SEO layer re-exports the same list", () => {
    expect([...LANGS]).toEqual(["es", "en", "pt"]);
    expect(LOCALES).toBe(LANGS);
    expect(DEFAULT_LANG).toBe("en");
    expect(X_DEFAULT_LOCALE).toBe(DEFAULT_LANG);
    for (const l of LANGS) {
      expect(isLang(l) && isLocale(l)).toBe(true);
      expect(LANG_LABEL[l]).toMatch(/^[A-Z]{2}$/);
      expect(LANG_NAME[l].length).toBeGreaterThan(3);
    }
    expect(isLang("fr")).toBe(false);
    expect(toLang("fr")).toBe("en");
    expect(toLang("pt")).toBe("pt");
  });

  test("tags: <html lang> / inLanguage, og:locale and Intl", () => {
    expect(LANG_TAG).toEqual({ es: "es", en: "en", pt: "pt-BR" });
    expect(OG_LOCALE).toEqual({ es: "es_AR", en: "en_US", pt: "pt_BR" });
    expect(INTL_LOCALE.pt).toBe("pt-BR");
    expect(new Intl.NumberFormat(INTL_LOCALE.pt).format(1234.5)).toBe("1.234,5");
    expect(new Intl.DateTimeFormat(INTL_LOCALE.pt, { dateStyle: "long", timeZone: "UTC" }).format(new Date("2026-11-10T12:00:00Z"))).toBe("10 de novembro de 2026");
  });

  test("pick() returns the text of the language", () => {
    expect(pick("pt", { es: "Inicio", en: "Home", pt: "Início" })).toBe("Início");
  });

  // The union must never be spelled out again: a fourth language is added in
  // lib/domain.ts and nowhere else.
  test("no source file hardcodes the es/en union or a locale alternation", () => {
    const files = execSync("git ls-files app components lib proxy.ts next.config.ts", { encoding: "utf8" })
      .split("\n")
      .filter((f) => /\.(ts|tsx)$/.test(f) && !f.startsWith("lib/__tests__/"));
    const offenders: string[] = [];
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      src.split("\n").forEach((line, i) => {
        if (/"es" \| "en"|"en" \| "es"/.test(line)) offenders.push(`${f}:${i + 1} union`);
        if (/\((es\|en|en\|es)\)/.test(line) && !/^\s*(\/\/|\*)/.test(line)) offenders.push(`${f}:${i + 1} alternation`);
      });
    }
    expect(offenders).toEqual([]);
  });
});

describe("proxy: language negotiation", () => {
  const go = (accept: string | null, url = "https://www.promptea.me/guides/json-output") =>
    proxy(new NextRequest(url, { headers: accept === null ? {} : { "accept-language": accept } }));
  const path = (res: Response) => new URL(res.headers.get("location")!).pathname;

  test.each([
    ["pt-BR,pt;q=0.9,en;q=0.8", "pt"],
    ["pt-PT,pt;q=0.9", "pt"],
    ["pt", "pt"],
    ["es-AR,es;q=0.9", "es"],
    ["es-MX", "es"],
    ["en-US,en;q=0.9", "en"],
    ["en-GB", "en"],
    ["fr-FR,fr;q=0.9,pt;q=0.5", "pt"],
    ["de-DE,de;q=0.9", "en"],
    ["*", "en"],
  ])("Accept-Language %s → /%s", (accept, locale) => {
    expect(path(go(accept))).toBe(`/${locale}/guides/json-output`);
  });

  test("no header at all (most crawlers) → the default locale", () => {
    expect(path(go(null))).toBe("/en/guides/json-output");
  });

  test("/pt and /pt/… are served as they are; the analyzer deep link works under /pt", () => {
    expect(go("es", "https://www.promptea.me/pt").headers.get("location")).toBeNull();
    expect(go("es", "https://www.promptea.me/pt/guides").headers.get("location")).toBeNull();
    const res = go("es", "https://www.promptea.me/pt?prompt=Ol%C3%A1&target=gpt");
    expect(res.status).toBe(308);
    const loc = new URL(res.headers.get("location")!);
    expect(loc.pathname).toBe("/pt/analyzer");
    expect(loc.searchParams.get("prompt")).toBe("Olá");
  });

  test("a path that only starts like a locale is not one", () => {
    expect(path(go("es", "https://www.promptea.me/ptx"))).toBe("/es/ptx");
  });
});

describe("paths and the language switcher", () => {
  test("swapLocale / the prefix regex cover every locale", () => {
    expect(swapLocale("/es/guides/x", "pt")).toBe("/pt/guides/x");
    expect(swapLocale("/pt", "en")).toBe("/en");
    expect(swapLocale("/pt/blog/weekly", "es")).toBe("/es/blog/weekly");
    expect(LOCALE_PREFIX_RE.test("/ptx/guides")).toBe(false);
  });

  test("the switcher links to the same page in each language", () => {
    expect(replaceLocale("/es/guides/json-output", "pt")).toBe("/pt/guides/json-output");
    expect(replaceLocale("/pt", "es")).toBe("/es");
    expect(replaceLocale("/benchmarks", "pt")).toBe("/pt/benchmarks");
  });
});

describe("hreflang and page metadata", () => {
  test("es, en, pt-BR + pt and x-default", () => {
    expect(HREFLANG).toEqual({ es: ["es"], en: ["en"], pt: ["pt-BR", "pt"] });
    expect(languageAlternates((l) => `/${l}/guides`)).toEqual({
      es: "/es/guides",
      en: "/en/guides",
      "pt-BR": "/pt/guides",
      pt: "/pt/guides",
      "x-default": "/en/guides",
    });
  });

  test("a Portuguese page: its own canonical, og:locale pt_BR, the other two as alternates", () => {
    const m = pageMetadata({ lang: "pt", path: "/pt/guides/json-output", title: "Saída JSON", description: "d", markdownPath: "/pt/guides/json-output.md" });
    expect(m.alternates?.canonical).toBe("/pt/guides/json-output");
    expect(m.alternates?.languages).toMatchObject({ "pt-BR": "/pt/guides/json-output", pt: "/pt/guides/json-output", es: "/es/guides/json-output", "x-default": "/en/guides/json-output" });
    expect(m.alternates?.types).toEqual({ "text/markdown": "/pt/guides/json-output.md" });
    const og = m.openGraph as { locale: string; alternateLocale: string[]; url: string };
    expect(og.locale).toBe("pt_BR");
    expect([...og.alternateLocale].sort()).toEqual(["en_US", "es_AR"]);
    expect(og.url).toBe("/pt/guides/json-output");
  });

  test("es and en pages keep their canonical and gain the Portuguese alternate", () => {
    const m = pageMetadata({ lang: "es", path: "/es/guides/x", title: "t", description: "d" });
    expect(m.alternates?.canonical).toBe("/es/guides/x");
    expect(m.alternates?.languages).toEqual({ es: "/es/guides/x", en: "/en/guides/x", "pt-BR": "/pt/guides/x", pt: "/pt/guides/x", "x-default": "/en/guides/x" });
    expect((m.openGraph as { locale: string }).locale).toBe("es_AR");
  });
});

describe("interface language vs content language", () => {
  test("AI Daily is written in es/en; Portuguese readers get the English edition", () => {
    expect([...CONTENT_LANGS]).toEqual(["es", "en"]);
    expect(contentLangFor("es")).toBe("es");
    expect(contentLangFor("en")).toBe("en");
    expect(contentLangFor("pt")).toBe("en");
    expect(contentIsFallback("pt")).toBe(true);
    expect(contentIsFallback("es") || contentIsFallback("en")).toBe(false);
  });

  test("a /pt view of English content does not claim to be Portuguese", () => {
    const m = pageMetadata({
      lang: "pt",
      contentLang: "en",
      path: "/pt/blog/some-story",
      alternatePaths: { es: "/es/blog/una-nota", en: "/en/blog/some-story" },
      title: "Some story",
      description: "d",
      type: "article",
      markdownPath: "/en/blog/some-story.md",
    });
    // canonical → the original; hreflang only for the languages it exists in
    expect(m.alternates?.canonical).toBe("/en/blog/some-story");
    expect(m.alternates?.languages).toEqual({ es: "/es/blog/una-nota", en: "/en/blog/some-story", "x-default": "/en/blog/some-story" });
    expect(m.alternates?.types).toBeUndefined();
    const og = m.openGraph as { locale: string; alternateLocale: string[]; url: string };
    expect(og.locale).toBe("en_US");
    expect(og.alternateLocale).toEqual(["es_AR"]);
    expect(og.url).toBe("/en/blog/some-story");
  });

  test("the same article under /es and /en names only the languages it exists in", () => {
    const m = pageMetadata({ lang: "en", contentLang: "en", path: "/en/blog/some-story", alternatePaths: { es: "/es/blog/una-nota", en: "/en/blog/some-story" }, title: "t", description: "d" });
    expect(m.alternates?.canonical).toBe("/en/blog/some-story");
    expect(m.alternates?.languages).toEqual({ es: "/es/blog/una-nota", en: "/en/blog/some-story", "x-default": "/en/blog/some-story" });
    expect((m.openGraph as { alternateLocale: string[] }).alternateLocale).toEqual(["es_AR"]);
  });
});
