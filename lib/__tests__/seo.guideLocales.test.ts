// v1.8.7 regression: with four locales a guide can exist in es+en, es+en+pt, es+en+zh or all
// four. Its page head must announce exactly the locales it has its own text in (the same set
// the sitemap lists), and a guide read in English under /pt or /zh is a view of the original.

import { describe, expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { generateMetadata } from "@/app/[lang]/guides/[slug]/page";
import { guides, guideLocales } from "@/lib/seo/content/guides";
import { HREFLANG, LOCALES, absUrl } from "@/lib/seo/site";

type Meta = Awaited<ReturnType<typeof generateMetadata>>;
const meta = (lang: string, slug: string) => generateMetadata({ params: Promise.resolve({ lang, slug }) }) as Promise<Meta>;
const hreflangKeys = (m: Meta) => Object.keys((m.alternates?.languages ?? {}) as Record<string, string>).sort();
const canonicalOf = (m: Meta) => String(m.alternates?.canonical ?? "");
const abs = (u: string) => (u.startsWith("http") ? u : absUrl(u));

describe("guide pages announce exactly the locales they exist in", () => {
  const kinds = new Map<string, (typeof guides)[number]>();
  for (const g of guides) kinds.set(guideLocales(g).join(","), kinds.get(guideLocales(g).join(",")) ?? g);

  test("the catalog has guides in more than one locale set", () => {
    expect(kinds.size).toBeGreaterThanOrEqual(2);
  });

  for (const [set, g] of kinds) {
    test(`${set}: ${g.slug}`, async () => {
      const own = guideLocales(g);
      const expected = [...own.flatMap((l) => HREFLANG[l]), "x-default"].sort();
      for (const lang of LOCALES) {
        const m = await meta(lang, g.slug);
        expect(hreflangKeys(m), `${lang}/${g.slug}`).toEqual(expected);
        // its own page is canonical; a locale without its text points at the English original
        const canonical = own.includes(lang) ? `/${lang}/guides/${g.slug}` : `/en/guides/${g.slug}`;
        expect(abs(canonicalOf(m)), `${lang}/${g.slug}`).toBe(abs(canonical));
      }
    });
  }
});
