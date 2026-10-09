// v1.7.0 — the public Weekly archive: visibility rules and paths.

import { describe, expect, test } from "vitest";
import { sortEditionsNewestFirst, stripEditionMeta, summarizeEdition, toPublicEdition } from "@/lib/newsletter/archive";
import { editionIdForMonday, editionMonday, weeklyArchivePath, weeklyEditionPath } from "@/lib/newsletter/paths";
import type { NewsletterEdition } from "@/lib/newsletter/types";

function locale(h: string) {
  return {
    subject: `Promptea Weekly: ${h}`,
    preheader: "Two verified AI stories from the week.",
    heroHeadline: h,
    heroDeck: "A deck that comfortably clears the schema minimum.",
    topStories: [
      {
        articleSlug: "some-story",
        headline: "A headline long enough",
        summary: "A summary that is longer than twenty characters.",
        whyItMatters: "Why it matters to builders.",
        sourceUrl: "https://example.com/a",
        category: "model-release",
      },
    ],
    tools: [],
    editorialTitle: null,
    editorialBody: null,
  };
}

function edition(monday: string, status: NewsletterEdition["status"]): Record<string, unknown> {
  return {
    editionId: `promptea-weekly_${monday}`,
    weekStart: "2026-09-20",
    weekEnd: "2026-09-26",
    status,
    locales: { en: locale(`EN ${monday}`), es: locale(`ES ${monday}`) },
    sponsor: null,
    generatedAt: "2026-09-28T12:00:00.000Z",
    publishedAt: status === "draft" ? null : "2026-09-28T12:00:00.000Z",
    sentAt: status === "sent" ? "2026-09-28T12:01:00.000Z" : null,
    // Firestore bookkeeping that must never reach a page.
    updatedAt: { _seconds: 1, _nanoseconds: 0 },
    createdAt: { _seconds: 1, _nanoseconds: 0 },
  };
}

describe("weekly archive visibility", () => {
  test("published and sent editions are public; drafts and malformed documents are not", () => {
    expect(toPublicEdition(edition("2026-09-28", "sent"))?.status).toBe("sent");
    expect(toPublicEdition(edition("2026-10-05", "published"))?.status).toBe("published");
    expect(toPublicEdition(edition("2026-10-12", "draft"))).toBeNull();
    expect(toPublicEdition({ editionId: "promptea-weekly_2026-09-28", status: "sent" })).toBeNull();
  });

  test("Firestore bookkeeping fields are stripped", () => {
    const e = toPublicEdition(edition("2026-09-28", "sent"))!;
    expect(e).not.toHaveProperty("updatedAt");
    expect(e).not.toHaveProperty("createdAt");
    expect(stripEditionMeta({ a: 1, updatedAt: 2, createdAt: 3 })).toEqual({ a: 1 });
  });

  test("newest first, regardless of read order", () => {
    const list = ["2026-09-28", "2026-10-05", "2026-09-21"].map((m) => toPublicEdition(edition(m, "sent"))!);
    expect(sortEditionsNewestFirst(list).map((e) => e.editionId)).toEqual([
      "promptea-weekly_2026-10-05",
      "promptea-weekly_2026-09-28",
      "promptea-weekly_2026-09-21",
    ]);
  });

  test("summary carries both locales and counts", () => {
    const s = summarizeEdition(toPublicEdition(edition("2026-10-05", "sent"))!);
    expect(s.monday).toBe("2026-10-05");
    expect(s.headline).toEqual({ en: "EN 2026-10-05", es: "ES 2026-10-05" });
    expect(s.stories).toEqual({ en: 1, es: 1 });
  });
});

describe("weekly paths", () => {
  test("archive and shareable edition pages live inside AI Daily", () => {
    expect(weeklyArchivePath("es")).toBe("/es/blog/weekly");
    expect(weeklyEditionPath("en", "promptea-weekly_2026-10-05")).toBe("/en/blog/weekly/2026-10-05");
    expect(weeklyEditionPath("en", "garbage")).toBe("/en/blog/weekly");
  });

  test("Monday and edition id round-trip; bad input is rejected", () => {
    expect(editionMonday("promptea-weekly_2026-10-05")).toBe("2026-10-05");
    expect(editionIdForMonday("2026-10-05")).toBe("promptea-weekly_2026-10-05");
    expect(editionIdForMonday("2026-13-45")).toBeNull();
    expect(editionIdForMonday("../etc")).toBeNull();
    expect(editionMonday("promptea-weekly_2026-02-31")).toBeNull();
  });
});
