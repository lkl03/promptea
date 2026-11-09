import { describe, expect, it } from "vitest";

import { CONTENT_UPDATED, formatDay, isIsoDay, modelsVerifiedAt, newest, toDate, toDay } from "@/lib/seo/dates";
import { MODEL_REGISTRY } from "@/lib/models";

describe("editorial dates", () => {
  it("every CONTENT_UPDATED entry is a real calendar day, not in the future", () => {
    for (const [k, v] of Object.entries(CONTENT_UPDATED)) {
      expect(isIsoDay(v), k).toBe(true);
      expect(new Date(`${v}T00:00:00Z`).getTime(), k).toBeLessThanOrEqual(Date.now() + 24 * 3600 * 1000);
    }
  });

  it("isIsoDay rejects non-days and impossible dates", () => {
    expect(isIsoDay("2026-02-30")).toBe(false);
    expect(isIsoDay("2026-13-01")).toBe(false);
    expect(isIsoDay("2026-1-1")).toBe(false);
    expect(isIsoDay("2026-11-08T10:00:00Z")).toBe(false);
    expect(isIsoDay("2026-11-08")).toBe(true);
  });

  it("newest picks the latest valid date and ignores junk", () => {
    expect(newest("2026-01-01", "2026-03-01T10:00:00Z", undefined, null, "nope", "2026-02-01")).toBe("2026-03-01T10:00:00Z");
    expect(newest()).toBeUndefined();
    expect(newest("garbage")).toBeUndefined();
  });

  it("toDate parses days (as UTC) and instants, and falls back on garbage", () => {
    const fb = new Date(0);
    expect(toDate("2026-11-08", fb).toISOString()).toBe("2026-11-08T00:00:00.000Z");
    expect(toDate("2026-11-08T10:30:00Z", fb).toISOString()).toBe("2026-11-08T10:30:00.000Z");
    expect(toDate("not a date", fb)).toBe(fb);
    expect(toDate(null, fb)).toBe(fb);
    expect(toDate(undefined, fb)).toBe(fb);
  });

  it("formatDay is UTC-stable and localised", () => {
    expect(formatDay("2026-11-08", "en")).toBe("November 8, 2026");
    expect(formatDay("2026-11-08", "es")).toBe("8 de noviembre de 2026");
    expect(formatDay("2026-11-08T23:59:59Z", "en")).toBe("November 8, 2026");
    expect(formatDay("junk", "en")).toBe("junk");
  });

  it("toDay keeps the calendar day of an instant", () => {
    expect(toDay("2026-11-08T23:59:59.000Z")).toBe("2026-11-08");
  });

  it("models take the newest verifiedAt in the registry", () => {
    const max = [...MODEL_REGISTRY.filter((m) => m.selectable).map((m) => m.verifiedAt)].sort().at(-1);
    expect(modelsVerifiedAt()).toBe(max);
    expect(isIsoDay(modelsVerifiedAt())).toBe(true);
  });
});
