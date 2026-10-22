// v1.7.1 — guide pages build their BreadcrumbList with breadcrumbJsonLd +
// absUrl, so every `item` is an absolute URL on the configured site origin
// (it used to be a bare path such as "/en/guides").

import { afterEach, describe, expect, test, vi } from "vitest";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { absUrl } from "@/lib/seo/site";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("breadcrumb JSON-LD", () => {
  test("items are absolute URLs on the site origin, in order", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://www.promptea.me/");
    const ld = breadcrumbJsonLd([
      { name: "Home", url: absUrl("/en") },
      { name: "Guides", url: absUrl("/en/guides") },
      { name: "Prompt checklist", url: absUrl("/en/guides/prompt-checklist") },
    ]);

    expect(ld["@type"]).toBe("BreadcrumbList");
    expect(ld.itemListElement.map((it) => it.position)).toEqual([1, 2, 3]);
    expect(ld.itemListElement.map((it) => it.item)).toEqual([
      "https://www.promptea.me/en",
      "https://www.promptea.me/en/guides",
      "https://www.promptea.me/en/guides/prompt-checklist",
    ]);
  });
});
