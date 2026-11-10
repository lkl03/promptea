// v1.8.0 — newsletter prompt rules: frequency caps, persistence, no stacking.

import { describe, expect, test } from "vitest";
import {
  DISMISS_DAYS,
  EMPTY_STATE,
  MIN_DELAY_MS,
  MODAL_COOLDOWN_DAYS,
  MODAL_MIN_DWELL_MS,
  MODAL_READ_MS,
  MODAL_SCROLL_RATIO,
  PILL_DELAY_MS,
  STORAGE_KEY,
  dockBarEligible,
  dwellAllows,
  isExitIntent,
  isToolRoute,
  modalEligible,
  parseState,
  pillEligible,
  readState,
  readingEngaged,
  routeKind,
  scrollRatio,
  writeState,
  type NudgeState,
} from "@/lib/newsletter/prompts";

const DAY = 86_400_000;
const NOW = 1_800_000_000_000;

function memStorage(initial: Record<string, string> = {}) {
  const m = new Map(Object.entries(initial));
  return {
    m,
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
  };
}

describe("timing contract", () => {
  test("the pill appears at 5 s and nothing may appear earlier", () => {
    expect(PILL_DELAY_MS).toBe(5_000);
    expect(MIN_DELAY_MS).toBe(5_000);
    expect(dwellAllows(4_999)).toBe(false);
    expect(dwellAllows(5_000)).toBe(true);
    // A trigger that asks for less than 5 s is still held to 5 s.
    expect(dwellAllows(3_000, 1_000)).toBe(false);
    expect(MODAL_MIN_DWELL_MS).toBeGreaterThanOrEqual(MIN_DELAY_MS);
  });
});

describe("eligibility", () => {
  test("fresh visitor: everything eligible", () => {
    expect(pillEligible(EMPTY_STATE, NOW)).toBe(true);
    expect(dockBarEligible(EMPTY_STATE, NOW)).toBe(true);
    expect(modalEligible(EMPTY_STATE, NOW, false)).toBe(true);
  });

  test("subscribed: no surface is ever eligible again", () => {
    const s: NudgeState = { ...EMPTY_STATE, subscribed: true };
    expect(pillEligible(s, NOW)).toBe(false);
    expect(dockBarEligible(s, NOW)).toBe(false);
    expect(modalEligible(s, NOW, false)).toBe(false);
    expect(pillEligible(s, NOW + 365 * DAY)).toBe(false);
  });

  test("closing the pill hides it for N days, then it may return", () => {
    const s: NudgeState = { ...EMPTY_STATE, pillDismissedAt: NOW };
    expect(pillEligible(s, NOW + 1_000)).toBe(false);
    expect(pillEligible(s, NOW + (DISMISS_DAYS - 0.01) * DAY)).toBe(false);
    expect(pillEligible(s, NOW + DISMISS_DAYS * DAY)).toBe(true);
    // The dock is independent of the pill.
    expect(dockBarEligible(s, NOW + 1_000)).toBe(true);
  });

  test("closing the dock bar hides it for N days", () => {
    const s: NudgeState = { ...EMPTY_STATE, dockDismissedAt: NOW };
    expect(dockBarEligible(s, NOW + DAY)).toBe(false);
    expect(dockBarEligible(s, NOW + DISMISS_DAYS * DAY)).toBe(true);
  });

  test("the modal: once per session AND once per cooldown", () => {
    expect(modalEligible(EMPTY_STATE, NOW, true)).toBe(false); // already shown this session
    const shown: NudgeState = { ...EMPTY_STATE, modalShownAt: NOW };
    expect(modalEligible(shown, NOW + DAY, false)).toBe(false); // new session, within a week
    expect(modalEligible(shown, NOW + MODAL_COOLDOWN_DAYS * DAY, false)).toBe(true);
  });
});

describe("persistence never throws", () => {
  test("round trip", () => {
    const st = memStorage();
    const s: NudgeState = { subscribed: false, pillDismissedAt: NOW, dockDismissedAt: 0, modalShownAt: NOW - DAY, cardShownAt: NOW - 2 * DAY };
    expect(writeState(st, s)).toBe(true);
    expect(readState(st)).toEqual(s);
  });

  test("blocked storage: reads fall back to empty, writes report failure", () => {
    const broken = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
    };
    expect(readState(broken)).toEqual(EMPTY_STATE);
    expect(writeState(broken, EMPTY_STATE)).toBe(false);
    expect(readState(null)).toEqual(EMPTY_STATE);
    expect(writeState(null, EMPTY_STATE)).toBe(false);
  });

  test("corrupt or hostile values are ignored field by field", () => {
    expect(parseState("not json")).toEqual(EMPTY_STATE);
    expect(parseState(JSON.stringify({ subscribed: "yes", pillDismissedAt: -5, dockDismissedAt: "x", modalShownAt: null }))).toEqual(EMPTY_STATE);
    expect(readState(memStorage({ [STORAGE_KEY]: "{" }))).toEqual(EMPTY_STATE);
  });
});

describe("routes", () => {
  test("AI Daily pages carry dock + modal, other public pages the pill, newsletter pages nothing", () => {
    for (const p of ["/es/blog", "/en/blog/some-story", "/es/blog/weekly", "/es/blog/weekly/2026-11-03", "/es/blog/"]) expect(routeKind(p)).toBe("daily");
    for (const p of ["/es", "/en", "/es/analyzer", "/es/best-ai", "/es/benchmarks", "/es/guides/x", "/es/models", "/es/glossary", "/es/prompts", "/es/privacy"]) expect(routeKind(p)).toBe("public");
    for (const p of ["/es/weekly", "/es/weekly/unsubscribe", "/es/unsubscribe", "/api/newsletter/subscribe"]) expect(routeKind(p)).toBe("none");
  });

  test("tool routes are the ones where the pill stays small on phones", () => {
    expect(isToolRoute("/es/analyzer")).toBe(true);
    expect(isToolRoute("/en/best-ai/")).toBe(true);
    expect(isToolRoute("/es")).toBe(false);
    expect(isToolRoute("/es/blog")).toBe(false);
  });
});

describe("triggers", () => {
  test("exit intent = leaving through the top edge, not while dragging, not into another element", () => {
    expect(isExitIntent({ clientY: 0, relatedTarget: null })).toBe(true);
    expect(isExitIntent({ clientY: -3, relatedTarget: null, buttons: 0 })).toBe(true);
    expect(isExitIntent({ clientY: 200, relatedTarget: null })).toBe(false); // left through a side or the bottom
    expect(isExitIntent({ clientY: 0, relatedTarget: {} })).toBe(false); // moved onto another element
    expect(isExitIntent({ clientY: 0, relatedTarget: null, buttons: 1 })).toBe(false); // dragging / selecting
  });

  test("scrollRatio is clamped and safe on short pages", () => {
    expect(scrollRatio(0, 800, 2800)).toBe(0);
    expect(scrollRatio(1000, 800, 2800)).toBeCloseTo(0.5);
    expect(scrollRatio(5000, 800, 2800)).toBe(1);
    expect(scrollRatio(10, 800, 700)).toBe(0); // page shorter than the viewport
  });

  test("touch equivalent: scrolled 60% or ~25 s of reading", () => {
    expect(readingEngaged({ ratio: MODAL_SCROLL_RATIO, dwellMs: 6_000 })).toBe(true);
    expect(readingEngaged({ ratio: 0.2, dwellMs: MODAL_READ_MS })).toBe(true);
    expect(readingEngaged({ ratio: 0.59, dwellMs: MODAL_READ_MS - 1 })).toBe(false);
  });
});
