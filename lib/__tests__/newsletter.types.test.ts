// lib/__tests__/newsletter.types.test.ts
//
// v1.5.0 — the newsletter contract.
//
// The newsletter schemas are the boundary between what the weekly digest
// generator produces and what Promptea stores or sends. Three schemas are
// tested here:
//
//   1. SubscribeRequestSchema — the public-facing input from the subscribe
//      form. Consent must be explicit and true, the email is normalised
//      (trimmed, lowercased), and only `en`/`es` are valid languages.
//   2. NewsletterEditionSchema — the full weekly edition document. The
//      editionId must follow `promptea-weekly_YYYY-MM-DD`, and locale
//      content must carry at least 4 top stories and 3 tools.
//   3. NewsletterStorySchema — a single digest item. Source URLs must be
//      https and headlines must be non-empty.

import { describe, expect, test } from "vitest";
import {
  NewsletterEditionSchema,
  NewsletterStorySchema,
  SubscribeRequestSchema,
} from "@/lib/newsletter/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type ParseResult<T extends { safeParse: (input: unknown) => unknown }> = ReturnType<
  T["safeParse"]
>;

function issuePaths(result: ParseResult<typeof SubscribeRequestSchema>): string[] {
  return (result as { success: false; error: { issues: Array<{ path: (string | number)[] }> } })
    .success
    ? []
    : (result as { success: false; error: { issues: Array<{ path: (string | number)[] }> } })
        .error.issues.map((i) => i.path.join("."));
}

// ---------------------------------------------------------------------------
// Locale content factory — produces a minimal valid locale block.
// ---------------------------------------------------------------------------

function makeLocaleContent() {
  const story = {
    articleSlug: "test-story-slug",
    headline: "A headline that is long enough to pass",
    summary: "A summary paragraph that comfortably clears the minimum length.",
    whyItMatters: "It changes a fundamental dynamic in the industry.",
    sourceUrl: "https://example.com/source",
    category: "model-release",
  };
  const tool = {
    title: "A Tool Title",
    description: "A description that is long enough to pass the minimum.",
    url: "https://example.com/tool",
  };
  return {
    subject: "Promptea Weekly -- best of AI this week",
    preheader: "Five verified AI stories from the week.",
    heroHeadline: "The biggest AI story this week",
    heroDeck: "A hero deck that is comfortably above the minimum length.",
    topStories: [story, story, story, story],
    tools: [tool, tool, tool],
    editorialTitle: null,
    editorialBody: null,
  };
}

function makeEdition(overrides: Record<string, unknown> = {}) {
  return {
    editionId: "promptea-weekly_2026-09-14",
    weekStart: "2026-09-07",
    weekEnd: "2026-09-13",
    status: "draft" as const,
    locales: { en: makeLocaleContent(), es: makeLocaleContent() },
    sponsor: null,
    generatedAt: new Date().toISOString(),
    publishedAt: null,
    sentAt: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// SubscribeRequestSchema
// ---------------------------------------------------------------------------

describe("SubscribeRequestSchema — subscribe form input", () => {
  test("a valid request with email, lang, consent=true passes", () => {
    const result = SubscribeRequestSchema.safeParse({
      email: "reader@example.com",
      lang: "en",
      consent: true,
    });
    expect(result.success).toBe(true);
  });

  test("missing consent fails", () => {
    const result = SubscribeRequestSchema.safeParse({
      email: "reader@example.com",
      lang: "en",
    });
    expect(result.success).toBe(false);
  });

  test("consent=false fails", () => {
    const result = SubscribeRequestSchema.safeParse({
      email: "reader@example.com",
      lang: "en",
      consent: false,
    });
    expect(result.success).toBe(false);
  });

  test("invalid email fails", () => {
    const result = SubscribeRequestSchema.safeParse({
      email: "not-an-email",
      lang: "en",
      consent: true,
    });
    expect(result.success).toBe(false);
    expect(issuePaths(result)).toContain("email");
  });

  test("missing lang fails", () => {
    const result = SubscribeRequestSchema.safeParse({
      email: "reader@example.com",
      consent: true,
    });
    expect(result.success).toBe(false);
  });

  test("invalid lang fails (not en or es)", () => {
    const result = SubscribeRequestSchema.safeParse({
      email: "reader@example.com",
      lang: "fr",
      consent: true,
    });
    expect(result.success).toBe(false);
    expect(issuePaths(result)).toContain("lang");
  });

  test("email is trimmed by the schema (lowercasing happens server-side)", () => {
    const result = SubscribeRequestSchema.safeParse({
      email: "  Reader@Example.COM  ",
      lang: "es",
      consent: true,
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    // The schema trims whitespace; lowercasing is in addSubscriber, not here.
    expect(result.data.email).toBe("Reader@Example.COM");
    expect(result.data.email).not.toMatch(/^\s/);
    expect(result.data.email).not.toMatch(/\s$/);
  });
});

// ---------------------------------------------------------------------------
// NewsletterEditionSchema
// ---------------------------------------------------------------------------

describe("NewsletterEditionSchema — full edition document", () => {
  test("a valid edition passes", () => {
    const result = NewsletterEditionSchema.safeParse(makeEdition());
    if (!result.success) {
      throw new Error(
        `expected valid edition, got: ${JSON.stringify(result.error.issues.map((i) => i.path.join(".")))}`
      );
    }
    expect(result.success).toBe(true);
  });

  test("invalid editionId format fails (must be promptea-weekly_YYYY-MM-DD)", () => {
    const result = NewsletterEditionSchema.safeParse(
      makeEdition({ editionId: "weekly-2026-09-14" })
    );
    expect(result.success).toBe(false);
  });

  test("missing locales fails", () => {
    const result = NewsletterEditionSchema.safeParse(
      makeEdition({ locales: {} })
    );
    expect(result.success).toBe(false);
  });

  test("topStories with fewer than 4 items fails", () => {
    const locale = makeLocaleContent();
    locale.topStories = locale.topStories.slice(0, 3);
    const result = NewsletterEditionSchema.safeParse(
      makeEdition({ locales: { en: locale, es: makeLocaleContent() } })
    );
    expect(result.success).toBe(false);
  });

  test("tools with fewer than 3 items fails", () => {
    const locale = makeLocaleContent();
    locale.tools = locale.tools.slice(0, 2);
    const result = NewsletterEditionSchema.safeParse(
      makeEdition({ locales: { en: locale, es: makeLocaleContent() } })
    );
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// NewsletterStorySchema
// ---------------------------------------------------------------------------

describe("NewsletterStorySchema — single digest item", () => {
  const validStory = {
    articleSlug: "test-story-slug",
    headline: "A headline that is long enough to pass",
    summary: "A summary paragraph that comfortably clears the minimum length.",
    whyItMatters: "It changes a fundamental dynamic in the industry.",
    sourceUrl: "https://example.com/source",
    category: "model-release",
  };

  test("a valid story passes", () => {
    const result = NewsletterStorySchema.safeParse(validStory);
    expect(result.success).toBe(true);
  });

  test("non-https sourceUrl fails", () => {
    const result = NewsletterStorySchema.safeParse({
      ...validStory,
      sourceUrl: "http://example.com/source",
    });
    expect(result.success).toBe(false);
  });

  test("empty headline fails", () => {
    const result = NewsletterStorySchema.safeParse({
      ...validStory,
      headline: "",
    });
    expect(result.success).toBe(false);
  });
});
