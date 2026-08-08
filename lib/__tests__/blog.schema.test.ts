// lib/__tests__/blog.schema.test.ts
//
// v1.4.0 — the publication contract.
//
// PublishPayloadSchema is the only boundary between "whatever the editorial
// routine produced" and "what Promptea stores and renders". Two properties are
// asserted here:
//
//   1. The schema rejects structurally or editorially unsound payloads —
//      non-https sources, thin sourcing on a published article, diverging
//      locales, a digest that quietly mixes in another day's stories.
//   2. The schema does NOT, and cannot, enforce freshness: it has no notion of
//      "now". The freshness gate is a separate runtime check, and the last
//      block proves it catches what the schema lets through — including the
//      case where a source published today reports yesterday's event.

import { describe, expect, test } from "vitest";
import { checkFreshness } from "@/lib/blog/dates";
import {
  MAX_BLOCK_TEXT,
  MAX_BLOCKS,
  PublishPayloadSchema,
  type Block,
} from "@/lib/blog/types";
import {
  allSchemaValidPayloads,
  ambiguousRumorPayload,
  digestPayload,
  FIXED_INSTANT,
  freshSourceStaleEventPayload,
  futureStoryPayload,
  makePayload,
  makeSource,
  modelLaunchPayload,
  staleStoryPayload,
  TODAY,
  weekOldStoryPayload,
  YESTERDAY,
} from "@/lib/__tests__/blog.fixtures";

type ParseResult = ReturnType<typeof PublishPayloadSchema.safeParse>;

/** Dotted issue paths, e.g. `sources.0.url`. */
function issuePaths(result: ParseResult): string[] {
  return result.success ? [] : result.error.issues.map((i) => i.path.join("."));
}

function expectRejected(input: unknown, expectedPath: string): ParseResult {
  const result = PublishPayloadSchema.safeParse(input);
  expect(result.success).toBe(false);
  expect(issuePaths(result)).toContain(expectedPath);
  return result;
}

// ---------------------------------------------------------------------------

describe("PublishPayloadSchema — the fixtures are structurally valid", () => {
  test.each(allSchemaValidPayloads)("%s parses", (_name, payload) => {
    const result = PublishPayloadSchema.safeParse(payload);
    if (!result.success) {
      throw new Error(`expected valid payload, got: ${JSON.stringify(issuePaths(result))}`);
    }
    expect(result.success).toBe(true);
  });

  test("parsing preserves the editorial fields the pages read", () => {
    const result = PublishPayloadSchema.safeParse(modelLaunchPayload);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.canonicalSlug).toBe("example-labs-launches-orion");
    expect(result.data.locales.es.slug).toBe("example-labs-lanza-orion");
    expect(result.data.eventDate).toBe(TODAY);
    expect(result.data.dryRun).toBe(false);
  });
});

describe("locales — both languages are mandatory", () => {
  test("a payload missing the EN locale fails", () => {
    const noEn = { ...modelLaunchPayload, locales: { es: modelLaunchPayload.locales.es } };
    const result = PublishPayloadSchema.safeParse(noEn);
    expect(result.success).toBe(false);
    expect(issuePaths(result).some((p) => p.startsWith("locales.en"))).toBe(true);
  });

  test("a payload missing the ES locale fails", () => {
    const noEs = { ...modelLaunchPayload, locales: { en: modelLaunchPayload.locales.en } };
    const result = PublishPayloadSchema.safeParse(noEs);
    expect(result.success).toBe(false);
    expect(issuePaths(result).some((p) => p.startsWith("locales.es"))).toBe(true);
  });

  test("an empty locales object fails for both languages", () => {
    const result = PublishPayloadSchema.safeParse({ ...modelLaunchPayload, locales: {} });
    expect(result.success).toBe(false);
    const paths = issuePaths(result);
    expect(paths.some((p) => p.startsWith("locales.en"))).toBe(true);
    expect(paths.some((p) => p.startsWith("locales.es"))).toBe(true);
  });
});

describe("locales — the two languages must describe the same story", () => {
  test("mismatched keyTakeaways counts fail", () => {
    const payload = makePayload({
      locales: {
        en: modelLaunchPayload.locales.en,
        es: {
          ...modelLaunchPayload.locales.es,
          keyTakeaways: modelLaunchPayload.locales.es.keyTakeaways.slice(0, 2),
        },
      },
    });
    const result = expectRejected(payload, "locales");
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.some((i) => i.message.includes("key takeaways"))).toBe(true);
  });

  test("mismatched whyItMatters counts fail", () => {
    const payload = makePayload({
      locales: {
        en: modelLaunchPayload.locales.en,
        es: {
          ...modelLaunchPayload.locales.es,
          whyItMatters: modelLaunchPayload.locales.es.whyItMatters.slice(0, 1),
        },
      },
    });
    const result = expectRejected(payload, "locales");
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.some((i) => i.message.includes("why it matters"))).toBe(true);
  });

  test("equal counts with different wording are fine — this is a translation, not a clone", () => {
    const result = PublishPayloadSchema.safeParse(modelLaunchPayload);
    expect(result.success).toBe(true);
    expect(modelLaunchPayload.locales.en.title).not.toBe(modelLaunchPayload.locales.es.title);
    expect(modelLaunchPayload.locales.en.slug).not.toBe(modelLaunchPayload.locales.es.slug);
  });
});

describe("source URLs — https only", () => {
  test.each([
    ["http", "http://example.com/orion"],
    ["javascript", "javascript:alert(1)"],
    ["data", "data:text/html;base64,PHNjcmlwdD4="],
    ["file", "file:///etc/passwd"],
    ["protocol-relative", "//example.com/orion"],
    ["relative path", "/orion"],
    ["not a url at all", "example.com/orion"],
  ])("a %s source URL is rejected", (_label, url) => {
    const payload = makePayload({ sources: [makeSource({ url }), makeSource({ primary: false })] });
    expectRejected(payload, "sources.0.url");
  });

  test("an https URL is accepted", () => {
    const payload = makePayload({
      sources: [
        makeSource({ url: "https://example.com/labs/orion" }),
        makeSource({ primary: false }),
      ],
    });
    expect(PublishPayloadSchema.safeParse(payload).success).toBe(true);
  });
});

describe("slugs — lowercase kebab only", () => {
  test.each([
    ["spaces and capitals", "Not A Slug"],
    ["trailing hyphen", "trailing-"],
    ["leading hyphen", "-leading"],
    ["double hyphen", "--double"],
    ["internal double hyphen", "a--b"],
    ["underscores", "snake_case_slug"],
    ["unicode", "lanzamiento-de-órion"],
    ["too short", "ab"],
    ["a full url", "https://example.com/orion"],
  ])("a canonicalSlug with %s is rejected", (_label, slug) => {
    expectRejected(makePayload({ canonicalSlug: slug }), "canonicalSlug");
  });

  test("a locale slug is held to the same rule", () => {
    const payload = makePayload({
      locales: {
        en: { ...modelLaunchPayload.locales.en, slug: "Not A Slug" },
        es: modelLaunchPayload.locales.es,
      },
    });
    expectRejected(payload, "locales.en.slug");
  });
});

describe("idempotencyKey — must be derived from the event date", () => {
  test("a key for a different day is rejected on the idempotencyKey path", () => {
    const payload = makePayload({ idempotencyKey: "ai-daily:2020-01-01" });
    const result = expectRejected(payload, "idempotencyKey");
    if (result.success) return;
    const issue = result.error.issues.find((i) => i.path.join(".") === "idempotencyKey");
    expect(issue?.message).toContain(`ai-daily:${TODAY}`);
  });

  test("a key with the wrong prefix is rejected", () => {
    expectRejected(makePayload({ idempotencyKey: `daily-ai:${TODAY}` }), "idempotencyKey");
  });

  test("the doc-id form (underscore) is not accepted as the key", () => {
    expectRejected(makePayload({ idempotencyKey: `ai-daily_${TODAY}` }), "idempotencyKey");
  });

  test("the derived key is accepted", () => {
    const payload = makePayload({ idempotencyKey: `ai-daily:${TODAY}` });
    expect(PublishPayloadSchema.safeParse(payload).success).toBe(true);
  });
});

describe("sourcing rules — stricter for published than for draft", () => {
  test("published with zero primary sources fails", () => {
    const payload = makePayload({
      status: "published",
      sources: [
        makeSource({ primary: false }),
        makeSource({ url: "https://example.com/wire/orion", primary: false }),
      ],
    });
    const result = expectRejected(payload, "sources");
    if (result.success) return;
    expect(result.error.issues.some((i) => i.message.includes("primary source"))).toBe(true);
  });

  test("published with exactly one source and no justification fails", () => {
    const payload = makePayload({
      status: "published",
      sources: [makeSource()],
      singleSourceJustification: null,
    });
    const result = expectRejected(payload, "sources");
    if (result.success) return;
    expect(
      result.error.issues.some((i) => i.message.includes("singleSourceJustification"))
    ).toBe(true);
  });

  test("the same payload WITH singleSourceJustification passes", () => {
    const payload = makePayload({
      status: "published",
      sources: [makeSource()],
      singleSourceJustification:
        "Only the vendor's own model card exists so far; no independent outlet has confirmed the pricing table yet.",
    });
    const result = PublishPayloadSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  test("a too-short justification is rejected as boilerplate", () => {
    const payload = makePayload({
      status: "published",
      sources: [makeSource()],
      singleSourceJustification: "only source",
    });
    const result = PublishPayloadSchema.safeParse(payload);
    expect(result.success).toBe(false);
    expect(issuePaths(result)).toContain("singleSourceJustification");
  });

  test("draft with a single non-primary source passes — draft rules are looser", () => {
    expect(ambiguousRumorPayload.status).toBe("draft");
    expect(ambiguousRumorPayload.sources).toHaveLength(1);
    expect(ambiguousRumorPayload.sources.every((s) => !s.primary)).toBe(true);
    expect(ambiguousRumorPayload.singleSourceJustification).toBeNull();

    expect(PublishPayloadSchema.safeParse(ambiguousRumorPayload).success).toBe(true);
  });

  test("that same rumour published instead of drafted is rejected twice over", () => {
    const promoted = { ...ambiguousRumorPayload, status: "published" as const };
    const result = PublishPayloadSchema.safeParse(promoted);
    expect(result.success).toBe(false);
    // Both the missing-primary rule and the thin-sourcing rule fire.
    expect(issuePaths(result).filter((p) => p === "sources")).toHaveLength(2);
  });

  test("at least one source is always required", () => {
    expectRejected(makePayload({ sources: [] }), "sources");
  });
});

describe("digest items — every item must be the same editorial day", () => {
  test("a matching digest passes", () => {
    expect(PublishPayloadSchema.safeParse(digestPayload).success).toBe(true);
  });

  test("an item from another day is rejected, with the issue on that item", () => {
    const payload = makePayload({
      category: "digest",
      digestItems: [
        { titleEn: "Same-day item", titleEs: "Ítem del día", eventDate: TODAY },
        { titleEn: "Yesterday's item", titleEs: "Ítem de ayer", eventDate: YESTERDAY },
      ],
    });
    const result = expectRejected(payload, "digestItems.1.eventDate");
    if (result.success) return;
    const issue = result.error.issues.find(
      (i) => i.path.join(".") === "digestItems.1.eventDate"
    );
    expect(issue?.message).toContain(YESTERDAY);
    expect(issue?.message).toContain(TODAY);
    // The same-day item is not flagged.
    expect(issuePaths(result)).not.toContain("digestItems.0.eventDate");
  });

  test("an item with a malformed date is rejected by the date schema", () => {
    const payload = makePayload({
      category: "digest",
      digestItems: [{ titleEn: "Bad date", titleEs: "Fecha mala", eventDate: "2026-02-30" }],
    });
    expectRejected(payload, "digestItems.0.eventDate");
  });
});

describe("size ceilings — oversized input is a 400, not an OOM", () => {
  test(`a body with more than MAX_BLOCKS (${MAX_BLOCKS}) blocks is rejected`, () => {
    const tooManyBlocks: Block[] = Array.from({ length: MAX_BLOCKS + 1 }, (_, i) => ({
      type: "paragraph",
      text: `Paragraph number ${i} of an over-long body.`,
    }));
    const payload = makePayload({
      locales: {
        en: { ...modelLaunchPayload.locales.en, body: tooManyBlocks },
        es: modelLaunchPayload.locales.es,
      },
    });
    expectRejected(payload, "locales.en.body");
  });

  test(`exactly MAX_BLOCKS (${MAX_BLOCKS}) blocks is still accepted`, () => {
    const atLimit: Block[] = Array.from({ length: MAX_BLOCKS }, (_, i) => ({
      type: "paragraph",
      text: `Paragraph number ${i} of a long but legal body.`,
    }));
    const payload = makePayload({
      locales: {
        en: { ...modelLaunchPayload.locales.en, body: atLimit },
        es: { ...modelLaunchPayload.locales.es, body: atLimit },
      },
    });
    expect(PublishPayloadSchema.safeParse(payload).success).toBe(true);
  });

  test(`a paragraph longer than MAX_BLOCK_TEXT (${MAX_BLOCK_TEXT}) is rejected`, () => {
    const payload = makePayload({
      locales: {
        en: {
          ...modelLaunchPayload.locales.en,
          body: [{ type: "paragraph", text: "x".repeat(MAX_BLOCK_TEXT + 1) }],
        },
        es: modelLaunchPayload.locales.es,
      },
    });
    expectRejected(payload, "locales.en.body.0.text");
  });

  test("an empty body is rejected", () => {
    const payload = makePayload({
      locales: {
        en: { ...modelLaunchPayload.locales.en, body: [] },
        es: modelLaunchPayload.locales.es,
      },
    });
    expectRejected(payload, "locales.en.body");
  });

  test("a heading below h2 or above h3 is rejected — the h1 belongs to the page", () => {
    const payload = makePayload({
      locales: {
        en: {
          ...modelLaunchPayload.locales.en,
          body: [{ type: "heading", level: 1, text: "Not allowed" } as unknown as Block],
        },
        es: modelLaunchPayload.locales.es,
      },
    });
    expect(PublishPayloadSchema.safeParse(payload).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// THE FRESHNESS GATE
// ---------------------------------------------------------------------------

describe("freshness gate — what the schema cannot see", () => {
  test("today's story passes the gate", () => {
    expect(checkFreshness(modelLaunchPayload.eventDate, FIXED_INSTANT)).toEqual({
      ok: true,
      today: TODAY,
      backdated: false,
      daysStale: 0,
    });
  });

  test("staleStoryPayload parses cleanly but FAILS the freshness gate", () => {
    // The schema has no clock, so it must accept this payload...
    expect(PublishPayloadSchema.safeParse(staleStoryPayload).success).toBe(true);

    // ...and the runtime gate is what stops it.
    const verdict = checkFreshness(staleStoryPayload.eventDate, FIXED_INSTANT);
    expect(verdict.ok).toBe(false);
    if (verdict.ok) throw new Error("expected staleStoryPayload to be rejected as stale");
    expect(verdict.reason).toBe("stale_event");
    expect(verdict).toMatchObject({ reason: "stale_event", today: TODAY, daysStale: 1 });
  });

  test("a fresh SOURCE date cannot smuggle in a stale EVENT", () => {
    // Every source in this fixture was published TODAY...
    expect(freshSourceStaleEventPayload.sources.length).toBeGreaterThan(0);
    for (const source of freshSourceStaleEventPayload.sources) {
      expect(source.publishedAt).toBe(TODAY);
    }

    // ...but the event they report happened YESTERDAY.
    expect(freshSourceStaleEventPayload.eventDate).toBe(YESTERDAY);

    // The schema is satisfied — nothing here is structurally wrong.
    expect(PublishPayloadSchema.safeParse(freshSourceStaleEventPayload).success).toBe(true);

    // The gate looks at eventDate, not at the sources, and rejects it.
    const verdict = checkFreshness(freshSourceStaleEventPayload.eventDate, FIXED_INSTANT);
    expect(verdict).toEqual({
      ok: false,
      reason: "stale_event",
      today: TODAY,
      daysStale: 1,
    });
  });

  test("a week-old event reports its full staleness", () => {
    expect(checkFreshness(weekOldStoryPayload.eventDate, FIXED_INSTANT)).toEqual({
      ok: false,
      reason: "stale_event",
      today: TODAY,
      daysStale: 7,
    });
  });

  test("a future-dated event is rejected too", () => {
    expect(PublishPayloadSchema.safeParse(futureStoryPayload).success).toBe(true);
    expect(checkFreshness(futureStoryPayload.eventDate, FIXED_INSTANT)).toEqual({
      ok: false,
      reason: "future_event",
      today: TODAY,
      daysAhead: 1,
    });
  });

  test("the digest's own items are each same-day, so the gate agrees with the schema", () => {
    for (const item of digestPayload.digestItems ?? []) {
      expect(checkFreshness(item.eventDate, FIXED_INSTANT)).toEqual({
        ok: true,
        today: TODAY,
        backdated: false,
        daysStale: 0,
      });
    }
  });
});
