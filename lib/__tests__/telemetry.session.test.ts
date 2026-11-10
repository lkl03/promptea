// v1.8.1 regression — getSessionId() must never throw. With localStorage
// blocked, `window.localStorage` throws a SecurityError on access; that used to
// escape and break the analyzer (found by scripts/release/qa-local.mjs).

import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { __resetSessionForTests, getSessionId } from "@/lib/telemetry/session";
import { AnalyzeSchema } from "@/lib/validators";

const g = globalThis as unknown as { window?: unknown };
const original = g.window;

beforeEach(() => __resetSessionForTests());
afterEach(() => {
  g.window = original;
});

describe("getSessionId", () => {
  test("on the server it is a constant, and never touches storage", () => {
    g.window = undefined;
    expect(getSessionId()).toBe("server");
  });

  test("persists one id in localStorage and returns it again", () => {
    const store = new Map<string, string>();
    g.window = { localStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) } };
    const a = getSessionId();
    expect(store.get("pe_session_id")).toBe(a);
    expect(getSessionId()).toBe(a);
  });

  test("storage blocked (accessing it throws): no exception, a stable in-memory id", () => {
    g.window = {
      get localStorage() {
        throw new Error("SecurityError: The operation is insecure.");
      },
    };
    let a = "";
    expect(() => (a = getSessionId())).not.toThrow();
    expect(getSessionId()).toBe(a);
    // Still a valid session id for the analyze API (min 10 characters).
    expect(AnalyzeSchema.shape.sessionId.safeParse(a).success).toBe(true);
  });

  test("storage full (setItem throws): the id is still returned and stays stable", () => {
    g.window = {
      localStorage: {
        getItem: () => null,
        setItem: () => {
          throw new Error("QuotaExceededError");
        },
      },
    };
    const a = getSessionId();
    expect(a.length).toBeGreaterThanOrEqual(10);
    expect(getSessionId()).toBe(a);
  });
});
