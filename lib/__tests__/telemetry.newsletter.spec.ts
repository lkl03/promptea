// v1.8.0 — the telemetry route accepts the newsletter prompt events with an
// enum-only `surface`, and still rejects anything else.

import { describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";

const set = vi.fn(async () => undefined);
vi.mock("@/lib/firebase/admin", () => ({
  getAdminFirestore: () => ({ collection: () => ({ doc: () => ({ set }) }) }),
}));

import { POST } from "@/app/api/telemetry/app/route";

function req(body: unknown) {
  // v1.8.6: a browser User-Agent — requests without one are dropped as bots.
  return new NextRequest("http://localhost/api/telemetry/app", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json", "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36" },
  });
}
const base = { sessionId: "session-1234567890", lang: "es" };

describe("POST /api/telemetry/app — newsletter prompts", () => {
  test.each(["newsletter_prompt_impression", "newsletter_prompt_open", "newsletter_prompt_subscribed", "newsletter_prompt_dismissed"])("accepts %s with a surface and stores no free text", async (event) => {
    set.mockClear();
    const res = await POST(req({ ...base, event, surface: "pill" }));
    expect(res.status).toBe(200);
    expect(set).toHaveBeenCalledTimes(1);
    const doc = (set.mock.calls[0] as unknown[])[0] as Record<string, unknown>;
    expect(doc.surface).toBe("pill");
    expect(JSON.stringify(doc)).not.toMatch(/@/);
  });

  test("rejects unknown surfaces and extra identifying fields are dropped", async () => {
    expect((await POST(req({ ...base, event: "newsletter_prompt_open", surface: "banner" }))).status).toBe(400);
    set.mockClear();
    await POST(req({ ...base, event: "newsletter_prompt_open", surface: "modal", email: "someone@example.com" }));
    const doc = (set.mock.calls[0] as unknown[])[0] as Record<string, unknown>;
    expect(JSON.stringify(doc)).not.toContain("someone@example.com");
  });

  test("existing events keep working without a surface", async () => {
    set.mockClear();
    const res = await POST(req({ ...base, event: "mode_opened", mode: "improve" }));
    expect(res.status).toBe(200);
    expect(((set.mock.calls[0] as unknown[])[0] as Record<string, unknown>).surface).toBeNull();
  });
});
