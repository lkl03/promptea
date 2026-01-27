import { describe, expect, test, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/telemetry/server", () => {
  return {
    setFeedback: vi.fn().mockResolvedValue({ ok: true }),
  };
});

import { setFeedback } from "@/lib/telemetry/server";
import { POST } from "@/app/api/feedback/route"; // <- ajustá si difiere

describe("API /api/feedback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("stores feedback in firebase via setFeedback()", async () => {
    const req = new NextRequest("http://localhost/api/feedback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        analysisId: "123e4567-e89b-12d3-a456-426614174000",
        helpful: "no",
        reason: "It missed the output format.",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    expect(setFeedback).toHaveBeenCalledTimes(1);
    expect((setFeedback as any).mock.calls[0][0]).toEqual({
      analysisId: "123e4567-e89b-12d3-a456-426614174000",
      helpful: "no",
      reason: "It missed the output format.",
    });
  });

  test("rejects invalid analysisId", async () => {
    const req = new NextRequest("http://localhost/api/feedback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        analysisId: "short",
        helpful: "yes",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
