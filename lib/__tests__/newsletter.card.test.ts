// v1.8.1 — the floating newsletter card ("Join our newsletter"): when it may open
// by itself, which variant, how it coexists with the other surfaces (one
// controller, never stacked, never over a control), and the store actions
// behind it. v1.8.7: any visitor who has not said "no" gets it at 5 s (v1.8.1:
// once per browser); closing it pauses it for 7 days; it uses the compact row
// or waits instead of covering a text box or a primary button. The subscription
// itself is never exercised against a real endpoint here.

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
  chooseVariant,
  cornerClear,
  FLOATING_SIZES,
  floatingBox,
  floatingVisible,
  obstacleSelector,
  rectsOverlap,
  parseState,
  pillEligible,
  type NudgeState,
} from "@/lib/newsletter/prompts";

const DAY = 86_400_000;
const NOW = 1_800_000_000_000;

describe("the card: when it opens by itself", () => {
  test("a new visitor (nothing stored) gets it, at 5 s", () => {
    expect(cardEligible(EMPTY_STATE, NOW)).toBe(true);
    expect(cardEligible(parseState(null), NOW)).toBe(true);
    expect(PILL_DELAY_MS).toBe(5_000);
    expect(PILL_DELAY_MS).toBeGreaterThanOrEqual(MIN_DELAY_MS);
  });

  test("v1.8.7: having seen it before is not a no — it opens again (v1.8.1 showed it once per browser)", () => {
    const seen: NudgeState = { ...EMPTY_STATE, cardShownAt: NOW - 3 * DAY };
    expect(cardEligible(seen, NOW)).toBe(true);
    // A v1.8.1–v1.8.6 record (cardShownAt only) reads the same way: the owner sees it again.
    expect(cardEligible(parseState(JSON.stringify({ subscribed: false, pillDismissedAt: 0, cardShownAt: NOW - 30 * DAY })), NOW)).toBe(true);
  });

  test("closed: the pill stays, the card does not open by itself for 7 days, then it may again", () => {
    const closed: NudgeState = { ...EMPTY_STATE, cardShownAt: NOW, cardDismissedAt: NOW };
    expect(DISMISS_DAYS).toBe(7);
    expect(cardEligible(closed, NOW + DAY)).toBe(false);
    expect(cardEligible(closed, NOW + (DISMISS_DAYS - 0.01) * DAY)).toBe(false);
    expect(pillEligible(closed, NOW + DAY)).toBe(true);
    expect(cardEligible(closed, NOW + DISMISS_DAYS * DAY)).toBe(true);
  });

  test("subscribed: never the card, never the pill", () => {
    const s: NudgeState = { ...EMPTY_STATE, subscribed: true };
    expect(cardEligible(s, NOW)).toBe(false);
    expect(cardEligible(s, NOW + 900 * DAY)).toBe(false);
    expect(pillEligible(s, NOW)).toBe(false);
  });

  test("any other recent no — pill closed, old dock bar closed, AI Daily modal seen — shares the 7-day pause", () => {
    for (const k of ["pillDismissedAt", "dockDismissedAt", "modalShownAt"] as const) {
      const s: NudgeState = { ...EMPTY_STATE, [k]: NOW - DAY };
      expect(cardEligible(s, NOW), k).toBe(false);
      expect(cardEligible(s, NOW + DISMISS_DAYS * DAY), k).toBe(true);
    }
  });

  test("the marks survive storage and corrupt values are ignored", () => {
    expect(parseState(JSON.stringify({ cardDismissedAt: 123 })).cardDismissedAt).toBe(123);
    expect(parseState(JSON.stringify({ cardDismissedAt: "yesterday" })).cardDismissedAt).toBe(0);
    expect(parseState(JSON.stringify({ cardShownAt: -5 })).cardShownAt).toBe(0);
    // A v1.8.0 record (no card fields) reads as "never shown, never closed".
    const old = parseState(JSON.stringify({ subscribed: false, pillDismissedAt: 0 }));
    expect([old.cardShownAt, old.cardDismissedAt]).toEqual([0, 0]);
  });
});

describe("the card: variant, and never over a control", () => {
  const box = (left: number, top: number, right: number, bottom: number) => ({ left, top, right, bottom });

  test("desktop with a clear corner: the full card", () => {
    expect(chooseVariant(1440, 900, [])).toBe("full");
    expect(chooseVariant(CARD_COMPACT_MAX_WIDTH + 1, 900, [])).toBe("full");
  });

  test("phones: always the compact row", () => {
    expect(chooseVariant(375, 812, [])).toBe("compact");
    expect(chooseVariant(CARD_COMPACT_MAX_WIDTH, 800, [])).toBe("compact");
  });

  test("home at 1440x900 (measured): the full card would touch the Analyze button, so the compact row opens", () => {
    // Rects measured on /es at 1440x900 (v1.8.7): the prompt box and its primary button.
    const textarea = box(357, 586, 1083, 672);
    const analyze = box(918, 684, 1083, 724);
    expect(chooseVariant(1440, 900, [textarea, analyze])).toBe("compact");
    // At 1920x1080 the same box is far from the corner: the full card.
    expect(chooseVariant(1920, 1080, [box(597, 586, 1323, 672), box(1158, 684, 1323, 724)])).toBe("full");
  });

  test("phone home at 375x812 (measured): the text box is under the row, so it waits until the visitor scrolls", () => {
    expect(chooseVariant(375, 812, [box(33, 676, 342, 774)])).toBeNull();
    // Scrolled 300 px: the prompt box went up, the corner is clear.
    expect(chooseVariant(375, 812, [box(33, 376, 342, 474), box(33, 514, 342, 554)])).toBe("compact");
  });

  test("the pill has its own, smaller corner", () => {
    expect(cornerClear(1440, 900, FLOATING_SIZES.pill, [box(1300, 600, 1400, 700)])).toBe(true);
    expect(cornerClear(1440, 900, FLOATING_SIZES.pill, [box(1300, 850, 1400, 890)])).toBe(false);
  });

  test("what it must not cover: text boxes, primary buttons, footer controls; every control on the tool pages", () => {
    const base = obstacleSelector(false);
    for (const sel of ["main textarea", "main .btn-primary", "footer a", "[data-floating-avoid]"]) expect(base).toContain(sel);
    expect(base).not.toContain("main button,");
    expect(obstacleSelector(true)).toContain("main button"); // tool pages and phones
  });
});

describe("one floating surface, never stacked", () => {
  const base = { wanted: true, modalOpen: false, inlineFormVisible: false, inTheWay: false, typing: false, userOpened: false };

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

  test("steps aside when a control is under it and for typing / the soft keyboard", () => {
    expect(floatingVisible({ ...base, inTheWay: true })).toBe(false);
    expect(floatingVisible({ ...base, typing: true })).toBe(false);
  });

  test("a card the visitor opened is not pulled from under them", () => {
    expect(floatingVisible({ ...base, userOpened: true, inlineFormVisible: true, inTheWay: true, typing: true })).toBe(true);
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

  test("markCardShown records the last appearance and does not stop the next one", async () => {
    const { getSnapshot, nudgeActions } = await import("@/lib/newsletter/promptStore");
    expect(getSnapshot().cardShownAt).toBe(0);
    nudgeActions.markCardShown(NOW);
    nudgeActions.markCardShown(NOW + 5000);
    expect(getSnapshot().cardShownAt).toBe(NOW + 5000);
    expect(JSON.parse(mem.get(STORAGE_KEY)!).cardShownAt).toBe(NOW + 5000);
    expect(cardEligible(getSnapshot(), NOW + DAY)).toBe(true);
  });

  test("dismissCard collapses the card, persists the no, and pauses it for 7 days", async () => {
    const { getSnapshot, nudgeActions } = await import("@/lib/newsletter/promptStore");
    nudgeActions.setPillFormOpen(true);
    nudgeActions.dismissCard(NOW);
    expect(getSnapshot().pillFormOpen).toBe(false);
    expect(JSON.parse(mem.get(STORAGE_KEY)!).cardDismissedAt).toBe(NOW);
    expect(cardEligible(getSnapshot(), NOW + DAY)).toBe(false);
    expect(pillEligible(getSnapshot(), NOW + DAY)).toBe(true);
    expect(cardEligible(getSnapshot(), NOW + 7 * DAY)).toBe(true);
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
    expect(cardEligible(getSnapshot(), NOW + 100 * DAY)).toBe(false);
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

  test("one controller, mounted once; in-page forms (home side card, AI Daily dock) announce themselves to it", () => {
    expect(layout.match(/<NewsletterNudges /g)).toHaveLength(1);
    expect(form).toMatch(/data-newsletter-inline=\{surface === "inline" \|\| surface === "dock" \? "" : undefined\}/);
    expect(src).toMatch(/\[data-newsletter-inline\]/);
  });

  test("v1.8.7: AI Daily gets the card too, and the modal never opens over it", () => {
    expect(src).toMatch(/kind === "public" \|\| kind === "daily" \?/);
    expect(src).toMatch(/if \(s\.pillFormOpen\) return false;/);
    // The dock's mobile bar is gone: one bottom surface on phones.
    const dock = readFileSync(join(process.cwd(), "components", "newsletter", "NewsletterDock.tsx"), "utf8");
    expect(dock).not.toMatch(/newsletter-dock-bar|role="dialog"|fixed /);
  });

  test("v1.8.7: the card's close button and Esc persist the no; the tool pages collapse it on typing", () => {
    expect(src).toMatch(/nudgeActions\.dismissCard\(\)/);
    expect(src).toMatch(/if \(!tool \|\| !typing\) return;\s*autoDone\.current = true;\s*if \(!formOpen \|\| openedBy !== "auto"\) return;/);
  });
});
