// POST /api/app-feedback — Firestore write shape, typed errors, cooldown,
// graceful 503 without Firebase, and the privacy contract (no prompt
// content, no email, no raw session id). Firebase Admin fully mocked.

import { beforeEach, describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";

const setMock = vi.fn().mockResolvedValue(undefined);
const docMock = vi.fn(() => ({ set: setMock }));
const collectionMock = vi.fn(() => ({ doc: docMock }));
let firestoreAvailable = true;

vi.mock("@/lib/firebase/admin", () => ({
  getAdminFirestore: vi.fn(() => {
    if (!firestoreAvailable) throw new Error("FIREBASE_SERVICE_ACCOUNT_BASE64 missing");
    return { collection: collectionMock };
  }),
}));

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: { serverTimestamp: vi.fn(() => "SERVER_TS") },
  Timestamp: { fromDate: vi.fn((d: Date) => d.toISOString()) },
}));

import { POST } from "@/app/api/app-feedback/route";
import { APP_VERSION } from "@/lib/version";

let sessionCounter = 0;
function freshSession() {
  sessionCounter += 1;
  return `session-${String(sessionCounter).padStart(4, "0")}-abcdef`;
}

function feedbackRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/app-feedback", {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": "Mozilla/5.0 (Windows NT 10.0)" },
    body: JSON.stringify(body),
  });
}

const VALID = {
  message: "The matcher recommended exactly what I needed, great feature!",
  category: "suggestion",
  lang: "en",
  mode: "best-ai",
  page: "/en/best-ai",
  theme: "aqua",
};

describe("API /api/app-feedback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    firestoreAvailable = true;
  });

  test("valid submission writes the privacy-safe document shape", async () => {
    const sessionId = freshSession();
    const res = await POST(feedbackRequest({ ...VALID, sessionId }));
    expect(res.status).toBe(200);
    const data = (await res.json()) as { ok: boolean; feedbackId: string };
    expect(data.ok).toBe(true);
    expect(data.feedbackId.length).toBeGreaterThan(10);

    expect(collectionMock).toHaveBeenCalledWith("app_feedback");
    const doc = setMock.mock.calls[0][0] as Record<string, unknown>;
    expect(doc.message).toBe(VALID.message);
    expect(doc.category).toBe("suggestion");
    expect(doc.lang).toBe("en");
    expect(doc.mode).toBe("best-ai");
    expect(doc.page).toBe("/en/best-ai");
    expect(doc.theme).toBe("aqua");
    expect(doc.appVersion).toBe(APP_VERSION);
    expect(doc.status).toBe("new");
    expect(doc.uaCategory).toBe("desktop");
    // Privacy contract: hashed session, no raw id, no email, no prompt keys.
    expect(String(doc.sessionHash)).toHaveLength(32);
    expect(String(doc.sessionHash)).not.toContain(sessionId);
    expect(doc).not.toHaveProperty("email");
    expect(doc).not.toHaveProperty("prompt");
    expect(doc).not.toHaveProperty("sessionId");
    expect(doc).not.toHaveProperty("ip");
  });

  test("page query strings are stripped server-side", async () => {
    const res = await POST(
      feedbackRequest({ ...VALID, sessionId: freshSession(), page: "/en/?prompt=SECRET%20TEXT&target=gpt" })
    );
    expect(res.status).toBe(200);
    const doc = setMock.mock.calls[0][0] as Record<string, unknown>;
    expect(doc.page).toBe("/en/");
    expect(JSON.stringify(doc)).not.toContain("SECRET");
  });

  test("message too short → 400 too_short", async () => {
    const res = await POST(feedbackRequest({ ...VALID, sessionId: freshSession(), message: "meh" }));
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: string }).error).toBe("too_short");
    expect(setMock).not.toHaveBeenCalled();
  });

  test("message too long → 400 too_long", async () => {
    const res = await POST(feedbackRequest({ ...VALID, sessionId: freshSession(), message: "x".repeat(2100) }));
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: string }).error).toBe("too_long");
  });

  test("invalid category → 400 validation", async () => {
    const res = await POST(feedbackRequest({ ...VALID, sessionId: freshSession(), category: "rant" }));
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: string }).error).toBe("validation");
  });

  test("cooldown: immediate resubmission from the same session → 429", async () => {
    const sessionId = freshSession();
    const first = await POST(feedbackRequest({ ...VALID, sessionId }));
    expect(first.status).toBe(200);
    const second = await POST(feedbackRequest({ ...VALID, sessionId, message: "Another piece of feedback right away." }));
    expect(second.status).toBe(429);
    expect(((await second.json()) as { error: string }).error).toBe("cooldown");
    expect(setMock).toHaveBeenCalledTimes(1);
  });

  test("missing Firebase configuration → 503 unavailable, no crash", async () => {
    firestoreAvailable = false;
    const res = await POST(feedbackRequest({ ...VALID, sessionId: freshSession() }));
    expect(res.status).toBe(503);
    expect(((await res.json()) as { error: string }).error).toBe("unavailable");
  });

  test("Firestore write failure → 503 unavailable", async () => {
    setMock.mockRejectedValueOnce(new Error("firestore down"));
    const res = await POST(feedbackRequest({ ...VALID, sessionId: freshSession() }));
    expect(res.status).toBe(503);
  });

  test("non-JSON content type → 415", async () => {
    const req = new NextRequest("http://localhost/api/app-feedback", {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: "hello",
    });
    const res = await POST(req);
    expect(res.status).toBe(415);
  });
});
