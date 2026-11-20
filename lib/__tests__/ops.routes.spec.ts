// v1.8.8 — HTTP surface of the routine health check.
//   GET /api/internal/routines/health  read-only, Bearer ROUTINE_HEALTH_SECRET | CRON_SECRET
//   GET /api/internal/routines/alert   Vercel Cron, Bearer CRON_SECRET, mails once per day

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

const state = vi.hoisted(() => ({
  activity: null as unknown,
  claimed: new Set<string>(),
  sends: [] as Array<{ to: string[]; subject: string; key?: string }>,
  failRead: false,
}));

vi.mock("@/lib/ops/server", () => ({
  readRoutineActivity: async () => {
    if (state.failRead) throw new Error("down");
    return state.activity;
  },
  claimAlertDay: async (day: string) => {
    if (state.claimed.has(day)) return false;
    state.claimed.add(day);
    return true;
  },
}));

vi.mock("resend", () => ({
  Resend: class {
    emails = {
      send: async (msg: { to: string[]; subject: string }, opts?: { idempotencyKey?: string }) => {
        state.sends.push({ to: msg.to, subject: msg.subject, key: opts?.idempotencyKey });
        return { data: { id: "em_1" }, error: null };
      },
    };
  },
}));

import { GET as health } from "@/app/api/internal/routines/health/route";
import { GET as alert } from "@/app/api/internal/routines/alert/route";

const CRON = "cron-secret-0123456789";
const HEALTH = "health-secret-0123456789";
const d = (iso: string) => new Date(iso);

const onTime = () => {
  const now = Date.now();
  const recent = new Date(now - 60 * 60_000);
  return {
    daily: { lastAt: recent },
    morning: { lastAt: recent },
    tech: { lastAt: recent },
    weekly: { lastAt: recent },
    newsletter: { lastAt: recent },
  };
};

const req = (path: string, token?: string) =>
  new NextRequest(`https://www.promptea.me${path}`, { headers: token ? { authorization: `Bearer ${token}` } : {} });

beforeEach(() => {
  state.activity = onTime();
  state.claimed.clear();
  state.sends = [];
  state.failRead = false;
  vi.stubEnv("CRON_SECRET", CRON);
  vi.stubEnv("ROUTINE_HEALTH_SECRET", HEALTH);
  vi.stubEnv("ROUTINE_ALERT_TO", "owner@example.com");
  vi.stubEnv("RESEND_API_KEY", "re_test_key_123456");
});
afterEach(() => vi.unstubAllEnvs());

describe("health", () => {
  test("fails closed without a configured secret", async () => {
    vi.stubEnv("CRON_SECRET", "");
    vi.stubEnv("ROUTINE_HEALTH_SECRET", "");
    expect((await health(req("/api/internal/routines/health", CRON))).status).toBe(503);
  });
  test("401 without the bearer or with a wrong one", async () => {
    expect((await health(req("/api/internal/routines/health"))).status).toBe(401);
    expect((await health(req("/api/internal/routines/health", "wrong-secret-0123456789"))).status).toBe(401);
  });
  test("returns the five routines with either secret, uncached", async () => {
    for (const t of [HEALTH, CRON]) {
      const res = await health(req("/api/internal/routines/health", t));
      expect(res.status).toBe(200);
      expect(res.headers.get("cache-control")).toBe("no-store");
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.routines.map((r: { key: string }) => r.key)).toEqual(["daily", "morning", "tech", "weekly", "newsletter"]);
    }
    expect(state.sends).toHaveLength(0);
  });
  test("storage errors are a 503, not a crash", async () => {
    state.failRead = true;
    expect((await health(req("/api/internal/routines/health", HEALTH))).status).toBe(503);
  });
});

describe("alert", () => {
  test("only CRON_SECRET opens it (the health secret cannot send mail)", async () => {
    expect((await alert(req("/api/internal/routines/alert", HEALTH))).status).toBe(401);
  });
  test("nothing is sent when every routine is on time", async () => {
    const body = await (await alert(req("/api/internal/routines/alert", CRON))).json();
    expect(body).toMatchObject({ ok: true, emailed: false, reason: "all_on_time", overdue: [] });
    expect(state.sends).toHaveLength(0);
  });
  test("overdue → one email per day, then already_alerted_today", async () => {
    state.activity = { ...onTime(), tech: { lastAt: d("2026-01-01T00:00:00Z") } };
    const first = await (await alert(req("/api/internal/routines/alert", CRON))).json();
    expect(first).toMatchObject({ emailed: true, overdue: ["tech"], recipients: 1 });
    expect(state.sends).toHaveLength(1);
    expect(state.sends[0].to).toEqual(["owner@example.com"]);
    expect(state.sends[0].subject).toContain("AI Daily Tech");
    expect(state.sends[0].key).toMatch(/^routine-health\/\d{4}-\d{2}-\d{2}$/);
    const second = await (await alert(req("/api/internal/routines/alert", CRON))).json();
    expect(second).toMatchObject({ emailed: false, reason: "already_alerted_today" });
    expect(state.sends).toHaveLength(1);
  });
  test("dryRun never sends and never claims the day", async () => {
    state.activity = { ...onTime(), newsletter: { lastAt: d("2026-01-01T00:00:00Z") } };
    const body = await (await alert(req("/api/internal/routines/alert?dryRun=1", CRON))).json();
    expect(body).toMatchObject({ emailed: false, reason: "dry_run", overdue: ["newsletter"] });
    expect(state.sends).toHaveLength(0);
    expect(state.claimed.size).toBe(0);
  });
  test("no recipient configured → reported, nothing sent", async () => {
    vi.stubEnv("ROUTINE_ALERT_TO", "");
    state.activity = { ...onTime(), daily: { lastAt: null } };
    const body = await (await alert(req("/api/internal/routines/alert", CRON))).json();
    expect(body).toMatchObject({ emailed: false, reason: "ROUTINE_ALERT_TO_not_set" });
    expect(state.sends).toHaveLength(0);
  });
});
