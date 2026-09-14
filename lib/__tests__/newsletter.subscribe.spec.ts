// lib/__tests__/newsletter.subscribe.spec.ts
//
// POST /api/newsletter/subscribe — input validation, content-type guard,
// rate limiting by IP hash, and delegation to the newsletter server module.
//
// The subscribe route is one of only two public write endpoints (the other is
// app-feedback). It shares the same defensive shape: content-type guard, Zod
// validation, per-IP rate limiting, and a catch-all 503 that never leaks the
// subscriber's email.

import { beforeEach, describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mocks — server-only, firebase, newsletter server
// ---------------------------------------------------------------------------

vi.mock("server-only", () => ({}));

vi.mock("@/lib/firebase/admin", () => ({
  getAdminFirestore: vi.fn(() => ({})),
}));

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: { serverTimestamp: vi.fn(() => "SERVER_TS") },
  Timestamp: { fromDate: vi.fn((d: Date) => d.toISOString()) },
}));

const addSubscriberMock = vi.fn<(input: { email: string; lang: string }) => Promise<{ outcome: "subscribed" | "already_subscribed" }>>();

vi.mock("@/lib/newsletter/server", () => ({
  addSubscriber: (input: { email: string; lang: string }) => addSubscriberMock(input),
}));

import { POST } from "@/app/api/newsletter/subscribe/route";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let ipCounter = 0;

/** A unique IP for each test so rate-limit state does not leak across tests. */
function freshIp(): string {
  ipCounter += 1;
  return `10.0.0.${ipCounter}`;
}

function subscribeRequest(
  body: Record<string, unknown>,
  ip?: string,
  contentType = "application/json"
): NextRequest {
  return new NextRequest("http://localhost/api/newsletter/subscribe", {
    method: "POST",
    headers: {
      "content-type": contentType,
      "x-forwarded-for": ip ?? freshIp(),
    },
    body: JSON.stringify(body),
  });
}

const VALID_BODY = {
  email: "reader@example.com",
  lang: "en",
  consent: true,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("API /api/newsletter/subscribe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    addSubscriberMock.mockResolvedValue({ outcome: "subscribed" });
  });

  test("non-JSON content type returns 415", async () => {
    const req = new NextRequest("http://localhost/api/newsletter/subscribe", {
      method: "POST",
      headers: {
        "content-type": "text/plain",
        "x-forwarded-for": freshIp(),
      },
      body: "hello",
    });
    const res = await POST(req);
    expect(res.status).toBe(415);
    const data = (await res.json()) as { error: string };
    expect(data.error).toBe("unsupported_content_type");
  });

  test("valid subscribe request returns 200 with outcome subscribed", async () => {
    const res = await POST(subscribeRequest(VALID_BODY));
    expect(res.status).toBe(200);
    const data = (await res.json()) as { ok: boolean; outcome: string };
    expect(data.ok).toBe(true);
    expect(data.outcome).toBe("subscribed");
    expect(addSubscriberMock).toHaveBeenCalledTimes(1);
  });

  test("missing consent returns 400", async () => {
    const { consent: _dropped, ...noConsent } = VALID_BODY;
    void _dropped;
    const res = await POST(subscribeRequest(noConsent));
    expect(res.status).toBe(400);
    expect(addSubscriberMock).not.toHaveBeenCalled();
  });

  test("invalid email returns 400 with validation error", async () => {
    const res = await POST(subscribeRequest({ ...VALID_BODY, email: "not-an-email" }));
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toBe("validation");
    expect(addSubscriberMock).not.toHaveBeenCalled();
  });

  test("already subscribed returns 200 with outcome already_subscribed", async () => {
    addSubscriberMock.mockResolvedValue({ outcome: "already_subscribed" });
    const res = await POST(subscribeRequest(VALID_BODY));
    expect(res.status).toBe(200);
    const data = (await res.json()) as { ok: boolean; outcome: string };
    expect(data.ok).toBe(true);
    expect(data.outcome).toBe("already_subscribed");
  });

  test("rate limiting returns 429 after 5+ rapid requests", async () => {
    const ip = freshIp();
    const results: number[] = [];

    for (let i = 0; i < 6; i++) {
      const res = await POST(subscribeRequest(VALID_BODY, ip));
      results.push(res.status);
    }

    // First 5 should succeed (200), the 6th should be rate-limited (429).
    expect(results.slice(0, 5).every((s) => s === 200)).toBe(true);
    expect(results[5]).toBe(429);

    // addSubscriber should only have been called 5 times, not 6.
    expect(addSubscriberMock).toHaveBeenCalledTimes(5);
  });
});
