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
