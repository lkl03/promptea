// lib/agentReady/http.ts
//
// v1.9.0 — small helpers shared by the Agent-Ready API routes.

import { NextResponse } from "next/server";

import { APP_VERSION } from "@/lib/version";

const BASE_HEADERS: Record<string, string> = {
  "cache-control": "no-store",
  "x-app-version": APP_VERSION,
  // A session URL carries its id: keep it out of search indexes and referrers.
  "x-robots-tag": "noindex, nofollow",
  "referrer-policy": "no-referrer",
  "x-content-type-options": "nosniff",
};

export function json(body: unknown, status = 200, extra: Record<string, string> = {}): NextResponse {
  const res = NextResponse.json(body, { status });
  for (const [k, v] of Object.entries({ ...BASE_HEADERS, ...extra })) res.headers.set(k, v);
  return res;
}

export function streamHeaders(): Record<string, string> {
  return { ...BASE_HEADERS, "content-type": "application/x-ndjson; charset=utf-8", "x-accel-buffering": "no" };
}

/** The Origin header names this same host (browsers always send it on a fetch POST). */
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    const host = (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? new URL(req.url).host).split(",")[0]!.trim();
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
