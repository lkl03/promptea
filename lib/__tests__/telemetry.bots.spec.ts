// v1.8.6 "medición limpia" — the telemetry routes drop known bots, and the
// client only sends after a real interaction (never under WebDriver).

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";

import { AI_CRAWLERS } from "@/lib/seo/crawlers";
import { BOT_SKIPPED, isBotUserAgent } from "@/lib/telemetry/bots";
import { __resetHumanGateForTests, afterHumanInteraction, hasHumanInteracted } from "@/lib/telemetry/humanGate";

const set = vi.fn(async () => undefined);
const runTransaction = vi.fn(async () => undefined);
vi.mock("@/lib/firebase/admin", () => ({
  getAdminFirestore: () => ({
    collection: () => ({ doc: () => ({ set }) }),
    runTransaction,
  }),
}));

import { POST as appPOST } from "@/app/api/telemetry/app/route";
import { POST as sessionPOST } from "@/app/api/telemetry/session/route";

const CHROME_LINUX = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";
const HUMANS = [
  CHROME_LINUX,
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:144.0) Gecko/20100101 Firefox/144.0",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Linux; Android 14; SAMSUNG SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/28.0 Chrome/130.0.0.0 Mobile Safari/537.36",
  // A phone model that contains "bot" must not be mistaken for a crawler.
  "Mozilla/5.0 (Linux; Android 11; CUBOT X30 Build/RP1A.200720.011) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
];
const BOTS = [
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
  "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)",
  "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot",
  "Mozilla/5.0 (Linux; Android 5.0) AppleWebKit/537.36 (KHTML, like Gecko) Mobile Safari/537.36 (compatible; Bytespider; spider-feedback@bytedance.com)",
  "Mozilla/5.0 (compatible;PetalBot;+https://webmaster.petalsearch.com/site/petalbot)",
  "Mozilla/5.0 (compatible; Baiduspider/2.0; +http://www.baidu.com/search/spider.html)",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 YisouSpider/5.0",
  "Mozilla/5.0 (compatible; TokenFoundryBot/1.0)",
  "meta-externalagent/1.1 (+https://developers.facebook.com/docs/sharing/webmasters/crawler)",
  "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/141.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36 Chrome-Lighthouse",
  "curl/8.7.1",
  "python-requests/2.32.3",
  "Go-http-client/2.0",
  "axios/1.7.7",
  "node-fetch",
];

describe("isBotUserAgent", () => {
  test.each(HUMANS)("a browser is not a bot: %s", (ua) => {
    expect(isBotUserAgent(ua)).toBe(false);
  });

  test.each(BOTS)("a crawler / tool is a bot: %s", (ua) => {
    expect(isBotUserAgent(ua)).toBe(true);
  });

  test("a missing or blank User-Agent is a bot (every browser sends one)", () => {
    expect(isBotUserAgent(null)).toBe(true);
    expect(isBotUserAgent(undefined)).toBe(true);
    expect(isBotUserAgent("   ")).toBe(true);
  });

  test("every crawler of the robots policy is recognised from a typical UA", () => {
    for (const c of AI_CRAWLERS) {
      expect(isBotUserAgent(`Mozilla/5.0 (compatible; ${c.userAgent}/1.0)`), c.userAgent).toBe(true);
    }
  });
});

function req(path: string, body: unknown, ua?: string) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (ua !== undefined) headers["user-agent"] = ua;
  return new NextRequest(`http://localhost${path}`, { method: "POST", body: JSON.stringify(body), headers });
}
const appBody = { sessionId: "session-1234567890", lang: "es", event: "mode_opened", mode: "improve" };
const sessionBody = { sessionId: "session-1234567890", lang: "es" };

describe("telemetry routes drop bots", () => {
  beforeEach(() => {
    set.mockClear();
    runTransaction.mockClear();
  });

  test("/api/telemetry/app: a bot gets 200 {skipped: bot} and nothing is written", async () => {
    for (const ua of [BOTS[0], BOTS[4], BOTS[11], undefined]) {
      const res = await appPOST(req("/api/telemetry/app", appBody, ua));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual(BOT_SKIPPED);
    }
    expect(set).not.toHaveBeenCalled();
  });

  test("/api/telemetry/app: a browser is still recorded", async () => {
    const res = await appPOST(req("/api/telemetry/app", appBody, CHROME_LINUX));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(set).toHaveBeenCalledTimes(1);
  });

  test("/api/telemetry/session: a bot is not counted as a session", async () => {
    for (const ua of [BOTS[5], BOTS[13], undefined]) {
      const res = await sessionPOST(req("/api/telemetry/session", sessionBody, ua));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual(BOT_SKIPPED);
    }
    expect(runTransaction).not.toHaveBeenCalled();
  });

  test("/api/telemetry/session: a browser is counted", async () => {
    const res = await sessionPOST(req("/api/telemetry/session", sessionBody, CHROME_LINUX));
    expect(res.status).toBe(200);
    expect(runTransaction).toHaveBeenCalledTimes(1);
  });
});

// A minimal window: records listeners so the test can deliver trusted /
// untrusted events (Node cannot forge `isTrusted` on a real Event).
function fakeWindow() {
  const listeners = new Map<string, Set<(e: { isTrusted: boolean }) => void>>();
  return {
    addEventListener: (type: string, fn: (e: { isTrusted: boolean }) => void) => {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(fn);
    },
    removeEventListener: (type: string, fn: (e: { isTrusted: boolean }) => void) => {
      listeners.get(type)?.delete(fn);
    },
    fire(type: string, isTrusted: boolean) {
      for (const fn of [...(listeners.get(type) ?? [])]) fn({ isTrusted });
    },
    count: () => [...listeners.values()].reduce((n, s) => n + s.size, 0),
  };
}

describe("afterHumanInteraction (client gate)", () => {
  let win: ReturnType<typeof fakeWindow>;

  beforeEach(() => {
    __resetHumanGateForTests();
    win = fakeWindow();
    vi.stubGlobal("window", win);
    vi.stubGlobal("navigator", { webdriver: false });
  });
  afterEach(() => {
    __resetHumanGateForTests();
    vi.unstubAllGlobals();
  });

  test("queues sends until the first trusted interaction, then flushes them once", () => {
    const sent: string[] = [];
    afterHumanInteraction(() => sent.push("mode_opened"));
    afterHumanInteraction(() => sent.push("session"));
    expect(sent).toEqual([]);
    expect(hasHumanInteracted()).toBe(false);

    win.fire("pointerdown", true);
    expect(sent).toEqual(["mode_opened", "session"]);
    expect(hasHumanInteracted()).toBe(true);
    expect(win.count()).toBe(0); // listeners removed

    afterHumanInteraction(() => sent.push("voice_transcribed"));
    expect(sent).toEqual(["mode_opened", "session", "voice_transcribed"]);
  });

  test("a script-dispatched (untrusted) event does not unlock it", () => {
    const sent: string[] = [];
    afterHumanInteraction(() => sent.push("x"));
    win.fire("keydown", false);
    expect(sent).toEqual([]);
    win.fire("keydown", true);
    expect(sent).toEqual(["x"]);
  });

  test("never sends under WebDriver automation, even after an interaction", () => {
    vi.stubGlobal("navigator", { webdriver: true });
    const sent: string[] = [];
    afterHumanInteraction(() => sent.push("x"));
    win.fire("pointerdown", true);
    expect(sent).toEqual([]);
    expect(win.count()).toBe(0); // it does not even listen
  });

  test("never runs on the server", () => {
    vi.stubGlobal("window", undefined);
    const fn = vi.fn();
    afterHumanInteraction(fn);
    expect(fn).not.toHaveBeenCalled();
  });

  test("the queue is bounded (a page that never interacts cannot grow it)", () => {
    const fn = vi.fn();
    for (let i = 0; i < 100; i++) afterHumanInteraction(fn);
    win.fire("touchstart", true);
    expect(fn).toHaveBeenCalledTimes(20);
  });

  test("a throwing send does not stop the others", () => {
    const ok = vi.fn();
    afterHumanInteraction(() => {
      throw new Error("boom");
    });
    afterHumanInteraction(ok);
    win.fire("wheel", true);
    expect(ok).toHaveBeenCalledTimes(1);
  });
});
