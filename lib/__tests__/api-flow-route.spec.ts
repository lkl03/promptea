// v1.8.9 — POST /api/flow: shape checks, cross-site refusal, rate limit, and
// the basic plan for bots and non-browser clients. No key in this suite, so a
// browser request also gets the basic plan (no_ai) — never an error.

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";
import { createMemoryBudgetStore, setBudgetStore } from "@/lib/ai/budget";
import { FLOW_RATE_LIMIT, POST } from "@/app/api/flow/route";

const CHROME = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0 Safari/537.36";
let ip = 0;

function req(body: unknown, headers: Record<string, string> = {}, opts: { sameIp?: string } = {}) {
  return new NextRequest("https://www.promptea.me/api/flow", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      host: "www.promptea.me",
      origin: "https://www.promptea.me",
      "user-agent": CHROME,
      "x-forwarded-for": opts.sameIp ?? `10.0.0.${++ip}`,
      ...headers,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.stubEnv("ANTHROPIC_API_KEY", "");
  setBudgetStore(createMemoryBudgetStore());
});
afterEach(() => {
  vi.unstubAllEnvs();
  setBudgetStore(undefined);
});

describe("/api/flow", () => {
  test("a browser request gets a usable plan (basic without a key)", async () => {
    const res = await POST(req({ task: "Add Google sign-in to my Next.js app and cover it with tests", lang: "en" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const plan = await res.json();
    expect(plan.source).toBe("basic");
    expect(plan.notice).toBe("no_ai");
    expect(plan.lang).toBe("en");
    expect(plan.steps.length).toBeGreaterThanOrEqual(2);
    expect(plan.levels.flat().sort()).toEqual(plan.steps.map((s: { id: number }) => s.id).sort());
  });

  test("x-ui-lang decides the language", async () => {
    const plan = await (await POST(req({ task: "Escribir una propuesta comercial para un cliente" }, { "x-ui-lang": "pt" }))).json();
    expect(plan.lang).toBe("pt");
  });

  test("415 / 400 / 413", async () => {
    expect((await POST(req("x", { "content-type": "text/plain" }))).status).toBe(415);
    expect((await POST(req("{nope"))).status).toBe(400);
    expect((await POST(req({ task: "short" }))).status).toBe(400);
    expect((await POST(req({ task: "x".repeat(4001) }))).status).toBe(400);
    expect((await POST(req({ task: "a valid long enough task" }, { "content-length": String(64 * 1024) }))).status).toBe(413);
  });

  test("a cross-site POST is refused", async () => {
    const res = await POST(req({ task: "Compare three CRMs for a small company" }, { origin: "https://evil.example" }));
    expect(res.status).toBe(403);
  });

  test("crawlers get the basic plan", async () => {
    const plan = await (await POST(req({ task: "Compare three CRMs for a small company" }, { "user-agent": "Mozilla/5.0 (compatible; Googlebot/2.1)" }))).json();
    expect(plan.source).toBe("basic");
  });

  test(`rate limit: ${FLOW_RATE_LIMIT.limit} a minute per client`, async () => {
    const statuses = [];
    for (let i = 0; i <= FLOW_RATE_LIMIT.limit; i++) {
      statuses.push((await POST(req({ task: "Compare three CRMs for a small company" }, {}, { sameIp: "10.9.9.9" }))).status);
    }
    expect(statuses.slice(0, FLOW_RATE_LIMIT.limit).every((s) => s === 200)).toBe(true);
    expect(statuses[FLOW_RATE_LIMIT.limit]).toBe(429);
  });
});
