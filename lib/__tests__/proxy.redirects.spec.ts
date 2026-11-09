// v1.7.0 — the homepage became a hub; legacy analyzer deep links still work.

import { describe, expect, test } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";

function run(url: string, lang = "es") {
  return proxy(new NextRequest(url, { headers: { "accept-language": lang } }));
}

function location(res: Response) {
  const loc = res.headers.get("location");
  return loc ? new URL(loc) : null;
}

describe("proxy: legacy analyzer links", () => {
  test("/es?prompt=…&purpose=…&target=… → /es/analyzer with every parameter preserved", () => {
    const res = run("https://www.promptea.me/es?prompt=Hola%20mundo&purpose=code&target=claude&model=claude-opus-5.5");
    expect(res.status).toBe(308);
    const loc = location(res)!;
    expect(loc.pathname).toBe("/es/analyzer");
    expect(loc.searchParams.get("prompt")).toBe("Hola mundo");
    expect(loc.searchParams.get("purpose")).toBe("code");
    expect(loc.searchParams.get("target")).toBe("claude");
    expect(loc.searchParams.get("model")).toBe("claude-opus-5.5");
  });

  test("trailing slash and the matcher handoff flag", () => {
    const loc = location(run("https://www.promptea.me/en/?handoff=1"))!;
    expect(loc.pathname).toBe("/en/analyzer");
    expect(loc.searchParams.get("handoff")).toBe("1");
  });

  test("a locale-less root deep link reaches the analyzer in one hop", () => {
    const loc = location(run("https://www.promptea.me/?prompt=x&target=gpt", "en"))!;
    expect(loc.pathname).toBe("/en/analyzer");
    expect(loc.searchParams.get("prompt")).toBe("x");
  });

  test("the bare root shows the hub (no redirect), and unrelated params do not trigger the analyzer", () => {
    expect(run("https://www.promptea.me/es").headers.get("location")).toBeNull();
    expect(run("https://www.promptea.me/es?utm_source=x").headers.get("location")).toBeNull();
  });

  test("other pages are untouched", () => {
    expect(run("https://www.promptea.me/es/blog?prompt=x").headers.get("location")).toBeNull();
    expect(location(run("https://www.promptea.me/benchmarks", "en"))!.pathname).toBe("/en/benchmarks");
  });
});

// v1.8.0 — the language a locale-less URL resolves to is the one hreflang
// "x-default" advertises (lib/seo/site.ts): one decision, not two.
describe("proxy: language fallback matches hreflang x-default", () => {
  const go = (lang: string | null, url = "https://www.promptea.me/guides/json-output") =>
    proxy(new NextRequest(url, { headers: lang === null ? {} : { "accept-language": lang } }));

  test("an unsupported language falls back to the x-default locale", async () => {
    const { X_DEFAULT_LOCALE } = await import("@/lib/seo/site");
    expect(location(go("de-DE,de;q=0.9"))!.pathname).toBe(`/${X_DEFAULT_LOCALE}/guides/json-output`);
    expect(X_DEFAULT_LOCALE).toBe("en");
  });

  test("no Accept-Language at all (most crawlers) gets the same fallback", async () => {
    const { X_DEFAULT_LOCALE } = await import("@/lib/seo/site");
    expect(location(go(null))!.pathname).toBe(`/${X_DEFAULT_LOCALE}/guides/json-output`);
    expect(location(go("*"))!.pathname).toBe(`/${X_DEFAULT_LOCALE}/guides/json-output`);
  });

  test("a malformed Accept-Language is not a 500", () => {
    for (const bad of ["not a language!!", "en_US;q=abc", ";;;", "*;q=0"]) {
      const res = go(bad);
      expect(res.status, bad).toBeGreaterThanOrEqual(300);
      expect(res.status, bad).toBeLessThan(400);
    }
  });

  test("people who ask for Spanish or English still get theirs", () => {
    expect(location(go("es-AR,es;q=0.9,en;q=0.5"))!.pathname).toBe("/es/guides/json-output");
    expect(location(go("es"))!.pathname).toBe("/es/guides/json-output");
    expect(location(go("en-GB,en;q=0.8"))!.pathname).toBe("/en/guides/json-output");
    // first supported language wins over an unsupported one with a higher weight
    expect(location(go("fr-FR,fr;q=0.9,es;q=0.6"))!.pathname).toBe("/es/guides/json-output");
  });

  test("the bare root resolves the same way", () => {
    expect(location(go("de", "https://www.promptea.me/"))!.pathname).toBe("/en");
    expect(location(go("es-AR", "https://www.promptea.me/"))!.pathname).toBe("/es");
  });
});
