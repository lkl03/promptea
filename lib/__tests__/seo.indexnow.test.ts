// lib/__tests__/seo.indexnow.test.ts — v1.8.6 IndexNow helpers and key route.
import { afterEach, describe, expect, it, vi } from "vitest";
import { INDEXNOW_ENDPOINT, buildIndexNowPayload, indexNowKey, submitIndexNow } from "@/lib/seo/indexnow";
import { GET } from "@/app/indexnow-key.txt/route";

const KEY = "0123456789abcdef0123456789abcdef";
const ORIGIN = "https://www.promptea.me";

describe("IndexNow", () => {
  afterEach(() => {
    delete process.env.INDEXNOW_KEY;
  });

  it("reads the key only from the environment and validates its shape", () => {
    expect(indexNowKey({})).toBeNull();
    expect(indexNowKey({ INDEXNOW_KEY: "short" })).toBeNull();
    expect(indexNowKey({ INDEXNOW_KEY: "has spaces in it!" })).toBeNull();
    expect(indexNowKey({ INDEXNOW_KEY: ` ${KEY} ` })).toBe(KEY);
  });

  it("builds a same-host, https-only, deduplicated payload with a root keyLocation", () => {
    const p = buildIndexNowPayload(["/en/guides/qwen-prompt-guide", `${ORIGIN}/en/guides/qwen-prompt-guide#faq`, "https://evil.example/x", "http://www.promptea.me/en"], KEY, ORIGIN)!;
    expect(p).toEqual({
      host: "www.promptea.me",
      key: KEY,
      keyLocation: `${ORIGIN}/indexnow-key.txt`,
      urlList: [`${ORIGIN}/en/guides/qwen-prompt-guide`],
    });
    expect(buildIndexNowPayload(["https://evil.example/x"], KEY, ORIGIN)).toBeNull();
  });

  it("submits to the shared endpoint, treats 202 as success and never throws", async () => {
    const ok = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () => new Response(null, { status: 202 }));
    expect(await submitIndexNow(["/en"], { key: KEY, origin: ORIGIN, fetchImpl: ok as never })).toEqual({ ok: true, status: 202, submitted: 1 });
    expect(ok.mock.calls[0][0]).toBe(INDEXNOW_ENDPOINT);

    const forbidden = vi.fn(async () => new Response("bad key", { status: 403 }));
    expect(await submitIndexNow(["/en"], { key: KEY, origin: ORIGIN, fetchImpl: forbidden as never })).toEqual({ ok: false, reason: "http_error", status: 403 });

    const down = vi.fn(async () => {
      throw new Error("offline");
    });
    expect(await submitIndexNow(["/en"], { key: KEY, origin: ORIGIN, fetchImpl: down as never })).toEqual({ ok: false, reason: "network_error" });
    expect(await submitIndexNow(["/en"], { key: null, origin: ORIGIN, fetchImpl: ok as never })).toEqual({ ok: false, reason: "no_key" });
  });

  it("/indexnow-key.txt serves the key from the environment, 404 while unset", async () => {
    expect(GET().status).toBe(404);
    process.env.INDEXNOW_KEY = KEY;
    const res = GET();
    expect(res.status).toBe(200);
    expect(await res.text()).toBe(KEY);
  });
});
