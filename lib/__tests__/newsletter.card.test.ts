// v1.8.1 — the first-visit newsletter card: when it may open by itself, what a
// later visit gets, how it coexists with the other surfaces (one controller,
// never stacked), and the store actions behind it. The subscription itself is
// never exercised against a real endpoint here.

import { beforeEach, describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CARD_COMPACT_MAX_WIDTH,
  DISMISS_DAYS,
  EMPTY_STATE,
  MIN_DELAY_MS,
  PILL_DELAY_MS,
  STORAGE_KEY,
  cardEligible,
  cardVariant,
  FLOATING_SIZES,
  floatingBox,
  floatingVisible,
  rectsOverlap,
  parseState,
  pillEligible,
  type NudgeState,
} from "@/lib/newsletter/prompts";

const DAY = 86_400_000;
const NOW = 1_800_000_000_000;

describe("first-visit card: eligibility", () => {
  test("a first visit (nothing stored) gets the card, at the same 5 s as before", () => {
    expect(cardEligible(EMPTY_STATE)).toBe(true);
    expect(cardEligible(parseState(null))).toBe(true);
    expect(PILL_DELAY_MS).toBe(5_000);
    expect(PILL_DELAY_MS).toBeGreaterThanOrEqual(MIN_DELAY_MS);
  });

  test("it opens by itself once per browser: later visits get only the pill", () => {
    const seen: NudgeState = { ...EMPTY_STATE, cardShownAt: NOW - 1 };
    // Whatever the date: the card is a first-visit thing, not a recurring one.
    expect(cardEligible(seen)).toBe(false);
    expect(pillEligible(seen, NOW)).toBe(true);
    expect(pillEligible(seen, NOW + 900 * DAY)).toBe(true);
  });

  test("subscribed: never the card, never the pill", () => {
    const s: NudgeState = { ...EMPTY_STATE, subscribed: true };
    expect(cardEligible(s)).toBe(false);
    expect(pillEligible(s, NOW)).toBe(false);
  });

  test("someone who closed the pill is not a first-time visitor (and stays quiet for N days)", () => {
    const s: NudgeState = { ...EMPTY_STATE, pillDismissedAt: NOW - DAY };
    expect(cardEligible(s)).toBe(false);
    expect(pillEligible(s, NOW)).toBe(false);
    // After the cap the pill may return, but the card never opens by itself for them.
    expect(pillEligible(s, NOW + DISMISS_DAYS * DAY)).toBe(true);
    expect(cardEligible(s)).toBe(false);
  });

  test("any stored mark (dock closed, modal seen) means it is not a first visit", () => {
    expect(cardEligible({ ...EMPTY_STATE, dockDismissedAt: NOW })).toBe(false);
    expect(cardEligible({ ...EMPTY_STATE, modalShownAt: NOW })).toBe(false);
  });

  test("the mark survives storage and corrupt values are ignored", () => {
    expect(parseState(JSON.stringify({ cardShownAt: 123 })).cardShownAt).toBe(123);
    expect(parseState(JSON.stringify({ cardShownAt: "yesterday" })).cardShownAt).toBe(0);
    expect(parseState(JSON.stringify({ cardShownAt: -5 })).cardShownAt).toBe(0);
    // A v1.8.0 record (no cardShownAt) reads as "never shown".
    expect(parseState(JSON.stringify({ subscribed: false, pillDismissedAt: 0 })).cardShownAt).toBe(0);
  });
});

describe("first-visit card: variant by viewport and route", () => {
  test("desktop and tablet get the full card everywhere", () => {
    expect(cardVariant("/en", 1440)).toBe("full");
    expect(cardVariant("/es/analyzer", 768)).toBe("full");
    expect(cardVariant("/en", CARD_COMPACT_MAX_WIDTH + 1)).toBe("full");
  });

  test("phones get the compact row, and nothing on the tool pages", () => {
    expect(cardVariant("/en", 375)).toBe("compact");
    expect(cardVariant("/es/prompts", CARD_COMPACT_MAX_WIDTH)).toBe("compact");
    expect(cardVariant("/es/analyzer", 375)).toBe("none");
    expect(cardVariant("/en/best-ai/", 375)).toBe("none");
  });
});

describe("one floating surface, never stacked", () => {
  const base = { wanted: true, modalOpen: false, inlineFormVisible: false, footerVisible: false, typing: false, userOpened: false };

  test("shown when wanted and nothing is in the way", () => {
    expect(floatingVisible(base)).toBe(true);
    expect(floatingVisible({ ...base, wanted: false })).toBe(false);
  });

  test("never together with the AI Daily modal, even if the visitor opened the card", () => {
    expect(floatingVisible({ ...base, modalOpen: true })).toBe(false);
    expect(floatingVisible({ ...base, modalOpen: true, userOpened: true })).toBe(false);
  });

  test("not shown while an in-page subscription form is on screen", () => {
    expect(floatingVisible({ ...base, inlineFormVisible: true })).toBe(false);
  });

  test("steps aside for the footer and for typing / the soft keyboard", () => {
    expect(floatingVisible({ ...base, footerVisible: true })).toBe(false);
    expect(floatingVisible({ ...base, typing: true })).toBe(false);
  });

  test("a card the visitor opened is not pulled from under them", () => {
    expect(floatingVisible({ ...base, userOpened: true, inlineFormVisible: true, footerVisible: true, typing: true })).toBe(true);
  });
});

describe("stepping aside for the footer is measured, not assumed", () => {
  const link = (left: number, top: number, w = 80, h = 20) => ({ left, top, right: left + w, bottom: top + h });

  test("the box sits in the bottom-right corner and never exceeds the viewport", () => {
    expect(floatingBox(1440, 900, 380, 330)).toEqual({ left: 1060, top: 570, right: 1440, bottom: 900 });
    expect(floatingBox(375, 812, FLOATING_SIZES.compact.width, FLOATING_SIZES.compact.height)).toEqual({ left: 0, top: 724, right: 375, bottom: 812 });
  });

  test("wide screen, short page: centred footer links are clear of the corner, so the card may show", () => {
    const card = floatingBox(1440, 900, FLOATING_SIZES.card.width, FLOATING_SIZES.card.height);
    // The right-most footer link of a centred row ends well before the card starts.
    expect(rectsOverlap(link(940, 780), card)).toBe(false);
  });

  test("phone: the footer links are under the row, so it steps aside", () => {
    const row = floatingBox(375, 812, FLOATING_SIZES.compact.width, FLOATING_SIZES.compact.height);
    expect(rectsOverlap(link(150, 760), row)).toBe(true);
    // …but not while the footer is still below the row.
    expect(rectsOverlap(link(150, 900), row)).toBe(false);
  });

  test("touching edges and empty boxes do not count as overlap", () => {
    const box = { left: 100, top: 100, right: 200, bottom: 200 };
    expect(rectsOverlap({ left: 0, top: 100, right: 100, bottom: 200 }, box)).toBe(false);
    expect(rectsOverlap({ left: 150, top: 150, right: 150, bottom: 150 }, box)).toBe(false);
    expect(rectsOverlap({ left: 199, top: 199, right: 260, bottom: 260 }, box)).toBe(true);
  });
});

describe("store actions", () => {
  // The store touches window.localStorage: give it a minimal in-memory one.
  const mem = new Map<string, string>();
  beforeEach(async () => {
    mem.clear();
    const storage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) };
    (globalThis as unknown as { window: unknown }).window = { localStorage: storage, sessionStorage: storage, addEventListener: () => {} };
    const { __resetStoreForTests } = await import("@/lib/newsletter/promptStore");
    __resetStoreForTests();
  });

  test("markCardShown persists once and keeps the first timestamp", async () => {
    const { getSnapshot, nudgeActions } = await import("@/lib/newsletter/promptStore");
    expect(getSnapshot().cardShownAt).toBe(0);
    nudgeActions.markCardShown(NOW);
    nudgeActions.markCardShown(NOW + 5000);
    expect(getSnapshot().cardShownAt).toBe(NOW);
    expect(JSON.parse(mem.get(STORAGE_KEY)!).cardShownAt).toBe(NOW);
    expect(cardEligible(getSnapshot())).toBe(false);
    expect(pillEligible(getSnapshot(), NOW + 1)).toBe(true);
  });

  test("opening and collapsing the card is session state: it is never written to storage", async () => {
    const { getSnapshot, nudgeActions } = await import("@/lib/newsletter/promptStore");
    nudgeActions.setPillFormOpen(true);
    expect(getSnapshot().pillFormOpen).toBe(true);
    nudgeActions.setPillFormOpen(false);
    expect(mem.has(STORAGE_KEY)).toBe(false);
  });

  test("closing the pill persists; subscribing wins over everything", async () => {
    const { getSnapshot, nudgeActions } = await import("@/lib/newsletter/promptStore");
    nudgeActions.markCardShown(NOW);
    nudgeActions.dismissPill(NOW);
    expect(pillEligible(getSnapshot(), NOW + DAY)).toBe(false);
    nudgeActions.markSubscribed();
    const stored = JSON.parse(mem.get(STORAGE_KEY)!);
    expect(stored.subscribed).toBe(true);
    expect(pillEligible(getSnapshot(), NOW + 100 * DAY)).toBe(false);
    expect(cardEligible(getSnapshot())).toBe(false);
  });

  test("blocked storage degrades to memory and never throws", async () => {
    (globalThis as unknown as { window: unknown }).window = {
      get localStorage() {
        throw new Error("SecurityError");
      },
      get sessionStorage() {
        throw new Error("SecurityError");
      },
      addEventListener: () => {},
    };
    const { __resetStoreForTests, getSnapshot, nudgeActions } = await import("@/lib/newsletter/promptStore");
    __resetStoreForTests();
    expect(() => nudgeActions.markCardShown(NOW)).not.toThrow();
    expect(getSnapshot().cardShownAt).toBe(NOW);
  });
});

describe("the controller keeps its accessibility and coordination contract", () => {
  const src = readFileSync(join(process.cwd(), "components", "newsletter", "NewsletterNudges.tsx"), "utf8");
  const form = readFileSync(join(process.cwd(), "components", "newsletter", "SubscribeForm.tsx"), "utf8");
  const layout = readFileSync(join(process.cwd(), "app", "[lang]", "layout.tsx"), "utf8");

  test("the card is a non-modal dialog: no aria-modal=true, no backdrop, focus only on request", () => {
    const card = src.slice(src.indexOf("{showCard ? ("), src.indexOf('{snap.modalOpen && kind === "daily"'));
    expect(card).toMatch(/role="dialog"/);
    expect(card).toMatch(/aria-modal="false"/);
    expect(card).not.toMatch(/bg-black/);
    expect(card).toMatch(/autoFocus=\{openedBy === "user"\}/);
  });

  test("Esc collapses it, and the close button has an accessible name", () => {
    expect(src).toMatch(/e\.key !== "Escape"/);
    expect(src).toMatch(/aria-label=\{dict\.close\}/);
  });

  test("one controller, mounted once; in-page forms announce themselves to it", () => {
    expect(layout.match(/<NewsletterNudges /g)).toHaveLength(1);
    expect(form).toMatch(/data-newsletter-inline=\{surface === "inline" \? "" : undefined\}/);
    expect(src).toMatch(/\[data-newsletter-inline\]/);
  });
});
