// lib/blog/server.ts — the two guarantees this module owns:
//   1. Idempotency: a retried publish cannot create a second article and can
//      never overwrite an already-public one.
//   2. Visibility: drafts and archived posts never escape to a public reader.
// Firestore is fully mocked, including a transaction that enforces
// reads-before-writes the way the real client does.

import { beforeEach, describe, expect, test, vi } from "vitest";

// `server-only` is a build-time guard with no runtime resolution under Vitest.
// Existing route specs avoid it by mocking the whole admin module; this suite
// imports lib/blog/server.ts directly, so the guard is stubbed here instead.
vi.mock("server-only", () => ({}));

vi.mock("firebase-admin/firestore", () => {
  class Timestamp {
    constructor(private readonly d: Date) {}
    static fromDate(d: Date) {
      return new Timestamp(d);
    }
    toDate() {
      return this.d;
    }
  }
  return {
    Timestamp,
    FieldValue: { serverTimestamp: () => "SERVER_TS" },
  };
});

type DocData = Record<string, unknown>;

/** Documents the fake Firestore currently holds, keyed by id. */
let store = new Map<string, DocData>();
let writes: Array<{ id: string; data: DocData }> = [];
let available = true;

function makeSnap(id: string) {
  const data = store.get(id);
  return { id, exists: data !== undefined, data: () => data, ref: { id } };
}

function querySnapFor(predicate: (d: DocData) => boolean) {
  const docs = [...store.entries()]
    .filter(([, d]) => predicate(d))
    .map(([id, d]) => ({ id, data: () => d, ref: { id } }));
  return { docs, empty: docs.length === 0 };
}

/** Minimal chainable query supporting the operators lib/blog/server.ts uses. */
function makeQuery(filters: Array<(d: DocData) => boolean> = [], limitN = Infinity) {
  const q = {
    where(field: string, op: string, value: unknown) {
      const f = (d: DocData) => {
        const actual = field.split(".").reduce<unknown>((acc, k) => (acc as DocData)?.[k], d);
        if (op === "in") return (value as unknown[]).includes(actual);
        if (op === "array-contains") return Array.isArray(actual) && actual.includes(value);
        if (op === "array-contains-any")
          return Array.isArray(actual) && (value as unknown[]).some((v) => actual.includes(v));
        return actual === value;
      };
      return makeQuery([...filters, f], limitN);
    },
    orderBy() {
      return q;
    },
    startAfter() {
      return q;
    },
    limit(n: number) {
      return makeQuery(filters, n);
    },
    async get() {
      const snap = querySnapFor((d) => filters.every((f) => f(d)));
      return { ...snap, docs: snap.docs.slice(0, limitN) };
    },
  };
  return q;
}

const fakeDb = {
  collection() {
    return {
      doc: (id: string) => ({
        id,
        get: async () => makeSnap(id),
        set: async (data: DocData) => {
          store.set(id, { ...(store.get(id) ?? {}), ...data });
          writes.push({ id, data });
        },
      }),
      where: (field: string, op: string, value: unknown) => makeQuery().where(field, op, value),
    };
  },
  async runTransaction<T>(fn: (tx: unknown) => Promise<T>): Promise<T> {
    let wroteAlready = false;
    const tx = {
      async get(target: { get: () => Promise<unknown> }) {
        if (wroteAlready) throw new Error("Firestore transactions require all reads before writes");
        return target.get();
      },
      set(ref: { id: string }, data: DocData) {
        wroteAlready = true;
        store.set(ref.id, data);
        writes.push({ id: ref.id, data });
      },
    };
    return fn(tx);
  },
};

vi.mock("@/lib/firebase/admin", () => ({
  getAdminFirestore: () => {
    if (!available) throw new Error("FIREBASE_SERVICE_ACCOUNT_BASE64 missing");
    return fakeDb;
  },
}));

import {
  getArticleBySlug,
  listPublishedArticles,
  publishPost,
  toPublicArticle,
} from "@/lib/blog/server";
import { dailyDocId, dailyIdempotencyKey, editorialDate } from "@/lib/blog/dates";
import type { BlogPost } from "@/lib/blog/types";

const TODAY = editorialDate();

function content(slug: string) {
  return {
    slug,
    title: "A sufficiently long headline for validation",
    deck: "A deck that comfortably clears the minimum length rule.",
    summary: "A summary that comfortably clears the minimum length requirement for this schema.",
    body: [{ type: "paragraph" as const, text: "Body text." }],
    whyItMatters: ["It changes something."],
    keyTakeaways: ["A takeaway."],
    seoTitle: "An SEO title",
    metaDescription:
      "A meta description that is comfortably longer than the fifty character minimum.",
  };
}

function payload(overrides: Record<string, unknown> = {}) {
  return {
    idempotencyKey: dailyIdempotencyKey(TODAY),
    routineRunId: "run-1",
    canonicalSlug: "a-story",
    status: "published" as const,
    eventDate: TODAY,
    importance: "P1" as const,
    category: "model-release" as const,
    tags: [],
    companies: [],
    models: [],
    locales: { en: content("a-story"), es: content("una-historia") },
    sources: [
      {
        title: "Official announcement",
        publisher: "Vendor",
        url: "https://vendor.example/post",
        sourceType: "announcement" as const,
        primary: true,
        publishedAt: TODAY,
        accessedAt: TODAY,
      },
    ],
    dryRun: false,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(overrides as any),
  };
}

function storedPost(over: Partial<Record<string, unknown>> = {}) {
  return {
    canonicalSlug: "a-story",
    slugIndex: ["a-story", "una-historia"],
    status: "published",
    eventDate: TODAY,
    importance: "P1",
    category: "model-release",
    tags: [],
    companies: [],
    models: [],
    author: "Promptea Editorial",
    editorialMethod: "ai-assisted-research-with-source-verification",
    locales: { en: content("a-story"), es: content("una-historia") },
    sources: [],
    image: null,
    digestItems: [],
    singleSourceJustification: null,
    correction: null,
    publishedAt: null,
    updatedAt: null,
    publication: { routineRunId: "run-1", idempotencyKey: "k", emailSent: false, emailSentAt: null },
    ...over,
  };
}

describe("lib/blog/server — idempotency", () => {
  beforeEach(() => {
    store = new Map();
    writes = [];
    available = true;
  });

  test("publishing uses a document id derived from the editorial date", async () => {
    const res = await publishPost(payload(), {});
    expect(res.outcome).toBe("published");
    expect(writes).toHaveLength(1);
    expect(writes[0].id).toBe(dailyDocId(TODAY));
    expect(store.has(dailyDocId(TODAY))).toBe(true);
  });

  test("a retry after a successful publish does NOT create a second article", async () => {
    await publishPost(payload(), {});
    const retry = await publishPost(payload({ routineRunId: "run-2" }), {});

    expect(retry.outcome).toBe("already_published");
    expect(store.size).toBe(1);
    // The second call must not have written anything.
    expect(writes).toHaveLength(1);
  });

  test("a retry never overwrites the published content", async () => {
    await publishPost(payload(), {});
    const before = JSON.stringify(store.get(dailyDocId(TODAY)));

    await publishPost(
      payload({ locales: { en: content("hijacked"), es: content("secuestrado") } }),
      {}
    );

    expect(JSON.stringify(store.get(dailyDocId(TODAY)))).toBe(before);
  });

  test("a draft may be upgraded to published for the same day", async () => {
    await publishPost(payload({ status: "draft" }), {});
    expect(store.get(dailyDocId(TODAY))?.status).toBe("draft");

    const res = await publishPost(payload({ status: "published" }), {});
    expect(res.outcome).toBe("published");
    expect(store.get(dailyDocId(TODAY))?.status).toBe("published");
  });

  test("a slug already used by a different article → slug_conflict, no write", async () => {
    store.set("ai-daily_2026-01-01", storedPost({ canonicalSlug: "a-story" }));
    const res = await publishPost(payload(), {});

    expect(res.outcome).toBe("slug_conflict");
    if (res.outcome === "slug_conflict") {
      expect(res.conflictingId).toBe("ai-daily_2026-01-01");
      expect(res.slug).toBe("a-story");
    }
    expect(writes).toHaveLength(0);
  });

  test("the stored document records both locale slugs for collision lookups", async () => {
    await publishPost(payload(), {});
    const doc = store.get(dailyDocId(TODAY)) as { slugIndex: string[] };
    expect(doc.slugIndex).toContain("a-story");
    expect(doc.slugIndex).toContain("una-historia");
  });

  test("email fields are stored inert — nothing in this release sends mail", async () => {
    await publishPost(payload(), {});
    const doc = store.get(dailyDocId(TODAY)) as { publication: Record<string, unknown> };
    expect(doc.publication.emailSent).toBe(false);
    expect(doc.publication.emailSentAt).toBeNull();
  });
});

describe("lib/blog/server — public visibility", () => {
  beforeEach(() => {
    store = new Map();
    writes = [];
    available = true;
  });

  test("a draft is not reachable by slug", async () => {
    store.set("ai-daily_x", storedPost({ status: "draft" }));
    expect(await getArticleBySlug("en", "a-story")).toBeNull();
  });

  test("an archived article is not reachable by slug", async () => {
    store.set("ai-daily_x", storedPost({ status: "archived" }));
    expect(await getArticleBySlug("en", "a-story")).toBeNull();
  });

  test("a published article resolves for its own locale slug only", async () => {
    store.set("ai-daily_x", storedPost({ status: "published" }));

    const en = await getArticleBySlug("en", "a-story");
    expect(en?.slug).toBe("a-story");

    // The Spanish slug must not resolve under /en/ — one URL per locale.
    expect(await getArticleBySlug("en", "una-historia")).toBeNull();

    const es = await getArticleBySlug("es", "una-historia");
    expect(es?.slug).toBe("una-historia");
    expect(await getArticleBySlug("es", "a-story")).toBeNull();
  });

  test("a corrected article stays publicly visible", async () => {
    store.set(
      "ai-daily_x",
      storedPost({
        status: "corrected",
        correction: { noteEn: "Fixed a figure.", noteEs: "Corregimos una cifra.", correctedAt: null },
      })
    );
    const article = await getArticleBySlug("en", "a-story");
    expect(article?.status).toBe("corrected");
    expect(article?.correction?.note).toBe("Fixed a figure.");
  });

  test("the feed lists only published and corrected articles", async () => {
    store.set("a", storedPost({ status: "published", canonicalSlug: "p", slugIndex: ["p"] }));
    store.set("b", storedPost({ status: "draft", canonicalSlug: "d", slugIndex: ["d"] }));
    store.set("c", storedPost({ status: "archived", canonicalSlug: "x", slugIndex: ["x"] }));
    store.set("d", storedPost({ status: "corrected", canonicalSlug: "c", slugIndex: ["c"] }));

    const { cards } = await listPublishedArticles({ lang: "en", limit: 10 });
    expect(cards).toHaveLength(2);
  });
});

describe("lib/blog/server — public projection", () => {
  const post: BlogPost = {
    id: "ai-daily_x",
    canonicalSlug: "a-story",
    status: "published",
    edition: "daily",
    eventDate: TODAY,
    coveredFrom: null,
    coveredTo: null,
    backdateReason: null,
    publishedAt: "2026-08-08T12:00:00.000Z",
    updatedAt: null,
    importance: "P1",
    category: "model-release",
    tags: ["openai"],
    companies: [],
    models: [],
    author: "Promptea Editorial",
    editorialMethod: "ai-assisted-research-with-source-verification",
    locales: { en: content("a-story"), es: content("una-historia") },
    sources: [],
    image: null,
    digestItems: [],
    singleSourceJustification: null,
    correction: null,
    readingMinutes: 0,
  };

  test("internal editorial metadata never reaches the public shape", () => {
    const article = toPublicArticle(post, "en");
    expect(article).not.toBeNull();
    const serialized = JSON.stringify(article);
    expect(serialized).not.toContain("routineRunId");
    expect(serialized).not.toContain("idempotencyKey");
    expect(serialized).not.toContain("slugIndex");
    expect(article).not.toHaveProperty("publication");
    expect(article).not.toHaveProperty("editorialMethod");
  });

  test("alternate slugs are exposed for hreflang", () => {
    const article = toPublicArticle(post, "en");
    expect(article?.alternateSlugs).toEqual({ en: "a-story", es: "una-historia" });
  });

  test("reading time is computed, never trusted from storage", () => {
    const article = toPublicArticle(post, "en");
    expect(article?.readingMinutes).toBeGreaterThanOrEqual(1);
  });

  test("a draft yields no public projection at all", () => {
    expect(toPublicArticle({ ...post, status: "draft" }, "en")).toBeNull();
    expect(toPublicArticle({ ...post, status: "archived" }, "en")).toBeNull();
  });
});
