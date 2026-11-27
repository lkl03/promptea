// v1.9.0 — Agent-Ready: sessions, the store and the two API routes.

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const engine = vi.hoisted(() => ({ runAudit: vi.fn() }));
vi.mock("@/lib/agentReady", async () => {
  const real = await vi.importActual<typeof import("@/lib/agentReady")>("@/lib/agentReady");
  return { ...real, runAudit: engine.runAudit };
});

import { POST as scan } from "@/app/api/agent-ready/scan/route";
import { GET as sessionGet, PATCH as sessionPatch } from "@/app/api/agent-ready/session/[id]/route";
import { CHECK_WEIGHTS } from "@/lib/agentReady/checks";
import { categoryScores, levelOf, totalScore } from "@/lib/agentReady/score";
import {
  RECHECK_LIMITS, SESSION_ID_RE, SESSION_TTL_DAYS, applyRecheck, auditForAgents, canRecheck, createSession, isExpired, isSessionId, newSessionId, orderedFixIds, sanitizePlan,
} from "@/lib/agentReady/session";
import { SCAN_QUOTA, createMemoryAuditStore, setAuditStore } from "@/lib/agentReady/store";
import { SafeFetchError } from "@/lib/agentReady/net/safeFetch";
import { CHECK_IDS, type Audit, type CheckId, type CheckResult, type CheckStatus, type ScanEvent } from "@/lib/agentReady/types";

function makeAudit(failing: Partial<Record<CheckId, CheckStatus>> = {}, origin = "https://shop.example.com"): Audit {
  const checks: CheckResult[] = CHECK_IDS.map((id) => {
    const status = failing[id] ?? "pass";
    const weight = CHECK_WEIGHTS[id];
    return { id, category: id.split(".")[0] as CheckResult["category"], status, weight, points: status === "pass" ? weight : status === "warn" ? weight / 2 : 0, code: "x", evidence: {} };
  });
  const score = totalScore(checks);
  return {
    schema: 1, requestedUrl: `${origin}/`, pageUrl: `${origin}/`, origin, scannedAt: "2026-11-27T12:00:00.000Z", stack: "next-app", score, level: levelOf(score),
    categories: categoryScores(checks), checks,
    agentView: { title: "PAGE TITLE", description: "d", lang: "en", words: 300, htmlBytes: 4000, textBytes: 1600, htmlTokens: 1000, textTokens: 400, markdownTokens: null, headings: [], jsonLdTypes: ["Organization"], links: 3, text: "SECRET PAGE TEXT", markdown: null },
    humanView: { frameable: true, scripts: 2, images: 1, imagesWithAlt: 1, forms: 0, landmarks: ["main"], textRatio: 0.4 },
    requests: 11, durationMs: 900,
  };
}

const store = createMemoryAuditStore();

beforeEach(() => {
  store.reset();
  setAuditStore(store);
  engine.runAudit.mockReset();
});

describe("session ids", () => {
  it("are 128 random bits, base64url, and unique", () => {
    const ids = Array.from({ length: 200 }, newSessionId);
    expect(new Set(ids).size).toBe(200);
    for (const id of ids) expect(id).toMatch(SESSION_ID_RE);
    expect(Buffer.from(ids[0], "base64url")).toHaveLength(16);
    for (const bad of ["", "short", "a".repeat(21), "a".repeat(23), "../../etc/passwd0000000", "aaaaaaaaaaaaaaaaaaaaa/", 22, null]) expect(isSessionId(bad), String(bad)).toBe(false);
  });
});

describe("session logic", () => {
  const audit = makeAudit({ "markdown.negotiation": "fail", "bots.signals": "fail", "discovery.llms": "warn", "content.text": "fail" });

  it("expires after the TTL", () => {
    const now = new Date("2026-11-27T12:00:00Z");
    const s = createSession(audit, now);
    expect(new Date(s.expiresAt).getTime() - now.getTime()).toBe(SESSION_TTL_DAYS * 86_400_000);
    expect(isExpired(s, new Date("2026-12-11T11:59:59Z"))).toBe(false);
    expect(isExpired(s, new Date("2026-12-11T12:00:00Z"))).toBe(true);
  });

  it("orders fixes by the person's plan, then by points lost", () => {
    const s = createSession(audit);
    expect(orderedFixIds(s)).toEqual(["content.text", "markdown.negotiation", "bots.signals", "discovery.llms"]);
    expect(orderedFixIds({ ...s, plan: ["bots.signals", "discovery.llms"] })).toEqual(["bots.signals", "discovery.llms", "content.text", "markdown.negotiation"]);
  });

  it("keeps only valid, open, unique check ids in a plan", () => {
    expect(sanitizePlan(["bots.signals", "bots.signals", "content.meta", "nope", 7, { id: "content.text" }, "content.text"], audit)).toEqual(["bots.signals", "content.text"]);
    expect(sanitizePlan("bots.signals", audit)).toEqual([]);
    expect(sanitizePlan(new Array(5000).fill("bots.signals"), audit)).toEqual(["bots.signals"]);
  });

  it("limits rechecks per session and in time", () => {
    const now = new Date("2026-11-27T12:00:00Z");
    expect(canRecheck({ rechecks: 0, lastRecheckAt: null }, now)).toEqual({ ok: true });
    expect(canRecheck({ rechecks: 1, lastRecheckAt: new Date(now.getTime() - 5_000).toISOString() }, now)).toMatchObject({ ok: false, reason: "too_soon", retryAfterSec: 15 });
    expect(canRecheck({ rechecks: 1, lastRecheckAt: new Date(now.getTime() - RECHECK_LIMITS.minIntervalMs).toISOString() }, now)).toEqual({ ok: true });
    expect(canRecheck({ rechecks: RECHECK_LIMITS.perSession, lastRecheckAt: null }, now)).toMatchObject({ ok: false, reason: "limit" });
  });

  it("a recheck replaces the audit and drops plan entries and marks for checks that now pass", () => {
    const s = { ...createSession(audit), plan: ["bots.signals", "content.text"] as CheckId[], progress: { "bots.signals": { done: true, at: "t" }, "content.text": { done: true, at: "t" } } };
    const next = applyRecheck(s, makeAudit({ "content.text": "fail" }), new Date("2026-11-28T00:00:00Z"));
    expect(next.plan).toEqual(["content.text"]);
    expect(Object.keys(next.progress)).toEqual(["content.text"]);
    expect(next).toMatchObject({ rechecks: 1, lastRecheckAt: "2026-11-28T00:00:00.000Z", id: s.id, expiresAt: s.expiresAt });
  });

  it("what goes to agents has no text from the page", () => {
    const out = auditForAgents(audit);
    const flat = JSON.stringify(out);
    expect(flat).not.toContain("SECRET PAGE TEXT");
    expect(flat).not.toContain("PAGE TITLE");
    expect(out.page).toEqual({ words: 300, htmlTokens: 1000, textTokens: 400, markdownTokens: null, jsonLdTypes: ["Organization"] });
    expect(out.checks).toHaveLength(21);
  });
});

describe("memory store", () => {
  it("saves, reads, updates under the session's own id and expiry, and forgets expired sessions", async () => {
    const s = createSession(makeAudit({ "bots.signals": "fail" }), new Date("2026-11-27T12:00:00Z"));
    await store.save(s);
    expect((await store.get(s.id, new Date("2026-11-28T00:00:00Z")))?.id).toBe(s.id);
    const updated = await store.update(s.id, (x) => ({ ...x, plan: ["bots.signals"] }), new Date("2026-11-28T00:00:00Z"));
    expect(updated?.plan).toEqual(["bots.signals"]);
    expect(await store.get(s.id, new Date("2026-12-12T00:00:00Z"))).toBeNull();
    expect(await store.update(s.id, (x) => x, new Date("2026-12-12T00:00:00Z"))).toBeNull();
    expect(await store.get("a".repeat(22))).toBeNull();
  });

  it("caps scans per client per day", async () => {
    const now = new Date("2026-11-27T12:00:00Z");
    for (let i = 0; i < SCAN_QUOTA.perClientPerDay; i++) expect(await store.reserveScan("c1", now)).toEqual({ ok: true });
    expect(await store.reserveScan("c1", now)).toEqual({ ok: false, reason: "client_quota" });
    expect(await store.reserveScan("c2", now)).toEqual({ ok: true });
    expect(await store.reserveScan("c1", new Date("2026-11-28T00:00:01Z"))).toEqual({ ok: true });
  });
});

let ipCounter = 0;
/** Each call comes from a fresh client unless an ip is given, so the per-instance limiters do not interfere. */
function scanRequest(body: unknown, headers: Record<string, string> = {}, ip = `198.51.100.${++ipCounter % 250}`) {
  return new Request("https://www.promptea.me/api/agent-ready/scan", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://www.promptea.me", host: "www.promptea.me", "user-agent": "Mozilla/5.0 Chrome/140", "x-forwarded-for": ip, ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

async function readEvents(res: Response): Promise<Array<ScanEvent & { sessionId?: string | null }>> {
  return (await res.text()).split("\n").filter(Boolean).map((l) => JSON.parse(l));
}

describe("POST /api/agent-ready/scan", () => {
  it("refuses other origins, missing origins, crawlers, bad shapes and unsafe URLs before any scan", async () => {
    expect((await scan(scanRequest({ url: "example.org" }, { origin: "https://evil.example" }))).status).toBe(403);
    const noOrigin = scanRequest({ url: "example.org" });
    noOrigin.headers.delete("origin");
    expect((await scan(noOrigin)).status).toBe(403);
    expect((await scan(scanRequest({ url: "example.org" }, { "user-agent": "GPTBot/1.2" }))).status).toBe(403);
    expect((await scan(scanRequest({ url: "example.org" }, { "content-type": "text/plain" }))).status).toBe(415);
    expect((await scan(scanRequest("{not json"))).status).toBe(400);
    expect((await scan(scanRequest({ url: 5 }))).status).toBe(400);
    expect((await scan(scanRequest({ url: "x".repeat(2100) }))).status).toBe(400);
    for (const [url, code] of [["http://169.254.169.254/latest", "blocked_address"], ["http://localhost/admin", "blocked_host"], ["https://example.org:8443", "blocked_port"], ["file:///etc/passwd", "blocked_scheme"], ["https://u:p@example.org", "blocked_credentials"]]) {
      const res = await scan(scanRequest({ url }));
      expect(res.status, url).toBe(400);
      expect(await res.json()).toEqual({ error: "url_refused", code });
    }
    expect(engine.runAudit).not.toHaveBeenCalled();
    expect(store.size()).toBe(0);
  });

  it("streams the scan and saves it as a session without any personal data", async () => {
    const audit = makeAudit({ "bots.signals": "fail" });
    engine.runAudit.mockImplementation(async (_url: string, opts: { onEvent?: (e: ScanEvent) => void }) => {
      opts.onEvent?.({ type: "start", url: audit.pageUrl, probes: ["page"] });
      opts.onEvent?.({ type: "probe", key: "page", status: 200, ok: true, ms: 12 });
      opts.onEvent?.({ type: "check", result: audit.checks[0] });
      opts.onEvent?.({ type: "done", audit });
      return audit;
    });
    const res = await scan(scanRequest({ url: "shop.example.com" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/x-ndjson");
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("x-robots-tag")).toContain("noindex");
    const events = await readEvents(res);
    expect(events.map((e) => e.type)).toEqual(["start", "probe", "check", "done"]);
    expect(engine.runAudit.mock.calls[0][0]).toBe("https://shop.example.com/");
    const id = events.at(-1)!.sessionId!;
    expect(id).toMatch(SESSION_ID_RE);
    const saved = (await store.get(id))!;
    expect(saved.audit.score).toBe(audit.score);
    expect(JSON.stringify(saved)).not.toMatch(/198\.51\.100|Mozilla|user-agent/i);
  });

  it("reports a refused or failed page as an event, and saves nothing", async () => {
    engine.runAudit.mockRejectedValueOnce(new SafeFetchError("blocked_address"));
    expect((await readEvents(await scan(scanRequest({ url: "rebind.example.org" })))).at(-1)).toEqual({ type: "error", code: "blocked_address" });
    engine.runAudit.mockRejectedValueOnce(new Error("boom"));
    expect((await readEvents(await scan(scanRequest({ url: "rebind.example.org" })))).at(-1)).toEqual({ type: "error", code: "scan_failed" });
    expect(store.size()).toBe(0);
  });

  it("rate-limits one client and one audited host", async () => {
    engine.runAudit.mockResolvedValue(makeAudit());
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) statuses.push((await scan(scanRequest({ url: `site${i}.example.org` }, {}, "203.0.113.50"))).status);
    expect(statuses).toEqual([200, 200, 200, 200, 200, 429]);
    const target: number[] = [];
    for (let i = 0; i < 7; i++) target.push((await scan(scanRequest({ url: "victim.example.org" }))).status);
    expect(target).toEqual([200, 200, 200, 200, 200, 200, 429]);
  });

  it("returns the audit without a session when sessions cannot be stored", async () => {
    setAuditStore({ ...store, available: () => false });
    engine.runAudit.mockResolvedValue(makeAudit());
    const events = await readEvents(await scan(scanRequest({ url: "nostore.example.org" })));
    expect(events.at(-1)).toMatchObject({ type: "done", sessionId: null });
  });
});

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const sessionReq = (method: string, body?: unknown, headers: Record<string, string> = {}) =>
  new Request("https://www.promptea.me/api/agent-ready/session/x", {
    method,
    headers: { "content-type": "application/json", origin: "https://www.promptea.me", host: "www.promptea.me", "x-forwarded-for": `198.51.100.${++ipCounter % 250}`, ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

describe("/api/agent-ready/session/[id]", () => {
  it("GET returns the session; unknown, malformed and expired ids are the same 404", async () => {
    const s = createSession(makeAudit({ "bots.signals": "fail" }));
    await store.save(s);
    const ok = await sessionGet(sessionReq("GET"), ctx(s.id));
    expect(ok.status).toBe(200);
    expect(ok.headers.get("referrer-policy")).toBe("no-referrer");
    expect((await ok.json()).id).toBe(s.id);
    expect((await sessionGet(sessionReq("GET"), ctx(newSessionId()))).status).toBe(404);
    expect((await sessionGet(sessionReq("GET"), ctx("../admin"))).status).toBe(404);
    const old = createSession(makeAudit(), new Date("2026-01-01T00:00:00Z"));
    await store.save(old);
    expect((await sessionGet(sessionReq("GET"), ctx(old.id))).status).toBe(404);
  });

  it("PATCH stores a sanitized plan and progress, same-origin only, and nothing else", async () => {
    const s = createSession(makeAudit({ "bots.signals": "fail", "content.text": "fail" }));
    await store.save(s);
    expect((await sessionPatch(sessionReq("PATCH", { plan: [] }, { origin: "https://evil.example" }), ctx(s.id))).status).toBe(403);
    expect((await sessionPatch(sessionReq("PATCH", {}), ctx(s.id))).status).toBe(400);
    expect((await sessionPatch(sessionReq("PATCH", { progress: { id: "nope", done: true } }), ctx(s.id))).status).toBe(400);
    expect((await sessionPatch(sessionReq("PATCH", { plan: [] }), ctx(newSessionId()))).status).toBe(404);

    const res = await sessionPatch(sessionReq("PATCH", { plan: ["content.text", "content.meta", "bogus", "bots.signals"], progress: { id: "bots.signals", done: true }, audit: { score: 100 }, id: "hijack", expiresAt: "2999-01-01" }), ctx(s.id));
    expect(res.status).toBe(200);
    const saved = (await store.get(s.id))!;
    expect(saved.plan).toEqual(["content.text", "bots.signals"]);
    expect(saved.progress["bots.signals"]?.done).toBe(true);
    expect(saved).toMatchObject({ id: s.id, expiresAt: s.expiresAt });
    expect(saved.audit.score).toBe(s.audit.score);

    // A check that passes in this audit cannot be marked.
    await sessionPatch(sessionReq("PATCH", { progress: { id: "content.meta", done: true } }), ctx(s.id));
    expect((await store.get(s.id))!.progress["content.meta"]).toBeUndefined();
  });
});
