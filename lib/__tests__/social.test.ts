// v1.8.0 — X handle resolution (NEXT_PUBLIC_X_HANDLE / NEXT_PUBLIC_X_URL).

import { describe, expect, test } from "vitest";
import { handleFromUrl, normalizeHandle, resolveXLinks } from "@/lib/social";

describe("X links", () => {
  test("normalizeHandle strips @ and validates", () => {
    expect(normalizeHandle("@promptea_me")).toBe("promptea_me");
    expect(normalizeHandle(" promptea ")).toBe("promptea");
    expect(normalizeHandle("not a handle")).toBeNull();
    expect(normalizeHandle("waytoolonghandle_1234")).toBeNull();
    expect(normalizeHandle("")).toBeNull();
    expect(normalizeHandle(undefined)).toBeNull();
    expect(normalizeHandle("home")).toBeNull();
  });

  test("handleFromUrl reads the first path segment on x.com / twitter.com only", () => {
    expect(handleFromUrl("https://x.com/promptea_me")).toBe("promptea_me");
    expect(handleFromUrl("https://twitter.com/promptea/status/1")).toBe("promptea");
    expect(handleFromUrl("x.com/promptea")).toBe("promptea");
    expect(handleFromUrl("https://x.com")).toBeNull();
    expect(handleFromUrl("https://x.com/i/flow/login")).toBeNull();
    expect(handleFromUrl("https://evil.example/promptea")).toBeNull();
    expect(handleFromUrl("not a url at all")).toBeNull();
  });

  test("the explicit handle wins and defines the profile URL", () => {
    expect(resolveXLinks("@promptea", "https://x.com/other")).toEqual({ handle: "promptea", url: "https://x.com/promptea" });
  });

  test("the handle is derived from the URL when no handle is set", () => {
    expect(resolveXLinks(undefined, "https://x.com/promptea_me")).toEqual({ handle: "promptea_me", url: "https://x.com/promptea_me" });
  });

  test("no handle anywhere: generic URL, no feed", () => {
    expect(resolveXLinks(undefined, undefined)).toEqual({ handle: null, url: "https://x.com" });
    expect(resolveXLinks("", "https://x.com")).toEqual({ handle: null, url: "https://x.com" });
    expect(resolveXLinks(undefined, "javascript:alert(1)")).toEqual({ handle: null, url: "https://x.com" });
  });
});
