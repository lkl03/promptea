// v1.6.0 — Promptea Weekly: generation, rendering, gates, delivery, and
// idempotency. Storage and mail are in-memory fakes; the flow under test is
// the same lib/newsletter/run.ts the signed endpoint calls.

import { describe, expect, test } from "vitest";
import type { PublicArticle } from "@/lib/blog/types";
import type { Lang } from "@/lib/domain";
import { editionWindowFor, mondayOnOrBefore } from "@/lib/newsletter/dates";
import { buildEdition, rankArticles } from "@/lib/newsletter/compose";
import { configBlockers, readDeliveryConfig } from "@/lib/newsletter/config";
import { renderNewsletterHtml, renderNewsletterText, unsubscribeHeaders, unsubscribeUrlFor } from "@/lib/newsletter/render";
import {
  runWeeklyNewsletter,
  testRecipientKey,
  type ClaimResult,
  type NewsletterRunRecord,
  type NewsletterStore,
  type SubscriberRecord,
} from "@/lib/newsletter/run";
import type { Mailer, OutgoingEmail, SendOutcome } from "@/lib/newsletter/email";
import type { NewsletterEdition } from "@/lib/newsletter/types";
import { NewsletterEditionSchema } from "@/lib/newsletter/types";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MONDAY = new Date("2026-09-28T12:00:00.000Z"); // 09:00 ART, Monday
const WINDOW = editionWindowFor("2026-09-28");

function article(o: Partial<PublicArticle> & { slug: string; eventDate: string }, lang: Lang = "en"): PublicArticle {
  return {
    canonicalSlug: o.slug,
    slug: o.slug,
    lang,
    status: "published",
    title: o.title ?? `Headline for ${o.slug} that is long enough`,
    deck: o.deck ?? `A deck for ${o.slug} that comfortably clears the minimum length of the schema.`,
    summary: "Summary.",
    body: [],
    whyItMatters: o.whyItMatters ?? [`Why ${o.slug} matters to people who build with AI.`],
    keyTakeaways: [],
    seoTitle: "t",
    metaDescription: "d",
    edition: o.edition ?? "daily",
    eventDate: o.eventDate,
    coveredFrom: null,
    coveredTo: null,
    backdateReason: null,
    publishedAt: `${o.eventDate}T23:00:00.000Z`,
    updatedAt: null,
    category: o.category ?? "model-release",
    importance: o.importance ?? "P1",
    tags: [],
    companies: [],
    models: [],
    author: "Promptea Editorial",
    sources: o.sources ?? [
      { title: "Primary", publisher: "Lab", url: `https://example.com/${o.slug}`, sourceType: "announcement", primary: true, accessedAt: "2026-09-21T00:00:00.000Z" } as never,
    ],
    image: null,
    digestItems: [],
    singleSourceJustification: null,
    correction: null,
    readingMinutes: 3,
    alternateSlugs: {},
  } as unknown as PublicArticle;
}

const WEEK_ARTICLES = [
  article({ slug: "p1-launch", eventDate: "2026-09-22", importance: "P1" }),
  article({ slug: "p0-breaking", eventDate: "2026-09-21", importance: "P0" }),
  article({ slug: "p2-tool", eventDate: "2026-09-25", importance: "P2", category: "developer-tools" }),
  article({ slug: "p2-agents", eventDate: "2026-09-26", importance: "P2", category: "agents" }),
  article({ slug: "p1-policy", eventDate: "2026-09-23", importance: "P1", category: "policy" }),
  article({ slug: "p2-research", eventDate: "2026-09-24", importance: "P2", category: "research" }),
  article({ slug: "p2-extra-tool", eventDate: "2026-09-20", importance: "P2", category: "open-source" }),
  // Out of window or not a daily story — must be ignored.
  article({ slug: "too-old", eventDate: "2026-09-19", importance: "P0" }),
  article({ slug: "too-new", eventDate: "2026-09-27", importance: "P0" }),
  article({ slug: "recap", eventDate: "2026-09-26", importance: "P0", edition: "weekly-recap" }),
];

const esOf = (list: PublicArticle[]) => list.map((a) => ({ ...a, lang: "es" as const, slug: `${a.slug}-es`, title: `Titular ${a.slug} suficientemente largo` }));

const SUBSCRIBERS: Array<SubscriberRecord & { status: "active" | "unsubscribed" }> = [
  { id: "sub_a", email: "ana@example.com", lang: "es", unsubscribeToken: "a".repeat(64), status: "active" },
  { id: "sub_b", email: "bob@example.com", lang: "en", unsubscribeToken: "b".repeat(64), status: "active" },
  { id: "sub_c", email: "cam@example.com", lang: "en", unsubscribeToken: "c".repeat(64), status: "active" },
  { id: "sub_x", email: "gone@example.com", lang: "en", unsubscribeToken: "d".repeat(64), status: "unsubscribed" },
];

class MemoryStore implements NewsletterStore {
  editions = new Map<string, NewsletterEdition>();
  ledger = new Map<string, { status: string; claimedAt: number; firstClaimedAt: number }>();
  runs: NewsletterRunRecord[] = [];
  failStorage = false;
  constructor(public subscribers = SUBSCRIBERS) {}
  async getEdition(id: string) {
    if (this.failStorage) throw new Error("down");
    return this.editions.get(id) ?? null;
  }
  async createEditionIfAbsent(e: NewsletterEdition) {
    const existing = this.editions.get(e.editionId);
    if (existing) return existing;
    this.editions.set(e.editionId, e);
    return e;
  }
  async updateEdition(id: string, patch: Partial<NewsletterEdition>) {
    const e = this.editions.get(id);
    if (e) this.editions.set(id, { ...e, ...patch });
  }
  async listActiveSubscribers() {
    return this.subscribers.filter((s) => s.status === "active").map(({ status: _s, ...rest }) => (void _s, rest));
  }
  async claimDelivery(editionId: string, key: string, now: Date): Promise<ClaimResult> {
    const k = `${editionId}__${key}`;
    const row = this.ledger.get(k);
    const t = now.getTime();
    if (!row) {
      this.ledger.set(k, { status: "sending", claimedAt: t, firstClaimedAt: t });
      return "claimed";
    }
    if (row.status === "sent") return "already_sent";
    if (row.status === "rejected") return "rejected";
    if (row.status === "sending" && t - row.claimedAt < 10 * 60_000) return "in_flight";
    if (t - row.firstClaimedAt > 23 * 3_600_000) return "unknown";
    this.ledger.set(k, { ...row, status: "sending", claimedAt: t });
    return "claimed";
  }
  async completeDelivery(editionId: string, key: string, result: { status: string }) {
    const k = `${editionId}__${key}`;
    const row = this.ledger.get(k)!;
    this.ledger.set(k, { ...row, status: result.status });
  }
  async recordRun(run: NewsletterRunRecord) {
    this.runs.push(run);
  }
}

class FakeMailer implements Mailer {
  sent: OutgoingEmail[] = [];
  failFor = new Set<string>();
  rejectFor = new Set<string>();
  async send(m: OutgoingEmail): Promise<SendOutcome> {
    if (this.failFor.has(m.to)) return { ok: false, error: "rate_limit_exceeded", retryable: true };
    if (this.rejectFor.has(m.to)) return { ok: false, error: "validation_error", retryable: false };
    this.sent.push(m);
    return { ok: true, id: `re_${this.sent.length}` };
  }
}

const LIVE_ENV = {
  NEWSLETTER_DELIVERY_ENABLED: "true",
  RESEND_API_KEY: "re_test_key_123456",
  NEWSLETTER_FROM_ADDRESS: "Promptea Weekly <weekly@promptea.me>",
  NEWSLETTER_TEST_RECIPIENTS: "owner@example.com",
  NEXT_PUBLIC_SITE_URL: "https://www.promptea.me",
};

function deps(opts: { env?: Record<string, string>; store?: MemoryStore; mailer?: FakeMailer | null; articles?: PublicArticle[]; clock?: () => Date; budgetMs?: number } = {}) {
  const store = opts.store ?? new MemoryStore();
  const mailer = opts.mailer === undefined ? new FakeMailer() : opts.mailer;
  const articles = opts.articles ?? WEEK_ARTICLES;
  const logs: Array<{ event: string; meta: Record<string, unknown> }> = [];
  return {
    store,
    mailer,
    logs,
    deps: {
      store,
      mailer,
      loadArticles: async (lang: Lang) => (lang === "es" ? esOf(articles) : articles),
      config: readDeliveryConfig(opts.env ?? LIVE_ENV),
      now: opts.clock ?? (() => MONDAY),
      sleep: async () => {},
      budgetMs: opts.budgetMs,
      throttleMs: 0,
      log: (event: string, meta: Record<string, unknown>) => logs.push({ event, meta }),
    },
  };
}

// ---------------------------------------------------------------------------
// Week window
// ---------------------------------------------------------------------------

describe("edition window (fixes the v1.5 day-of-month bug)", () => {
  test("a Monday send covers the previous Sunday→Saturday", () => {
    expect(editionWindowFor("2026-09-28")).toEqual({
      editionId: "promptea-weekly_2026-09-28",
      monday: "2026-09-28",
      weekStart: "2026-09-20",
      weekEnd: "2026-09-26",
    });
  });

  test("any day of the week resolves to that week's Monday edition (retries are stable)", () => {
    for (const d of ["2026-09-28", "2026-09-29", "2026-10-01", "2026-10-04"]) {
      expect(editionWindowFor(d).editionId, d).toBe("promptea-weekly_2026-09-28");
    }
    expect(mondayOnOrBefore("2026-09-27")).toBe("2026-09-21");
    // v1.5 used `day % 7`: on the 14th it pointed at the 7th, a Monday.
    expect(editionWindowFor("2026-09-14").weekEnd).toBe("2026-09-12");
  });
});

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

describe("generation from the AI Daily archive", () => {
  test("only in-window daily stories, ranked by importance then date, tools never repeat stories", () => {
    const e = buildEdition({ window: WINDOW, en: WEEK_ARTICLES, es: esOf(WEEK_ARTICLES), now: MONDAY, siteUrl: "https://www.promptea.me" })!;
    expect(NewsletterEditionSchema.safeParse(e).success).toBe(true);
    const slugs = e.locales.en.topStories.map((s) => s.articleSlug);
    expect(slugs[0]).toBe("p0-breaking");
    expect(slugs).not.toContain("too-old");
    expect(slugs).not.toContain("too-new");
    expect(slugs).not.toContain("recap");
    expect(slugs.length).toBe(6);
    const toolTitles = e.locales.en.tools.map((t) => t.title);
    for (const s of e.locales.en.topStories) expect(toolTitles).not.toContain(s.headline);
    expect(e.locales.en.subject).toMatch(/^Promptea Weekly — /);
    expect(e.locales.es.subject).toMatch(/^Promptea Semanal — Titular p0-breaking/);
    expect(e.editionId).toBe("promptea-weekly_2026-09-28");
  });

  test("a quiet week is sent as it is — no placeholder stories", () => {
    const one = [article({ slug: "only-story", eventDate: "2026-09-23" })];
    const e = buildEdition({ window: WINDOW, en: one, es: esOf(one), now: MONDAY, siteUrl: "https://www.promptea.me" })!;
    expect(e.locales.en.topStories.map((s) => s.articleSlug)).toEqual(["only-story"]);
    expect(e.locales.en.tools).toEqual([]);
    expect(JSON.stringify(e)).not.toContain("placeholder");
    expect(e.locales.en.preheader).toMatch(/^1 verified AI story/);
  });

  test("no eligible story means no edition", () => {
    expect(buildEdition({ window: WINDOW, en: [], es: [], now: MONDAY, siteUrl: "https://x.dev" })).toBeNull();
  });

  test("ranking is deterministic", () => {
    const shuffled = [...WEEK_ARTICLES].reverse();
    expect(rankArticles(shuffled).map((a) => a.slug)).toEqual(rankArticles(WEEK_ARTICLES).map((a) => a.slug));
  });
});

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

describe("email rendering", () => {
  const edition = buildEdition({ window: WINDOW, en: WEEK_ARTICLES, es: esOf(WEEK_ARTICLES), now: MONDAY, siteUrl: "https://www.promptea.me" })!;

  test("HTML carries the subscriber's working unsubscribe link, article links, and the right language", () => {
    const url = unsubscribeUrlFor("a".repeat(64), "https://www.promptea.me/");
    expect(url).toBe(`https://www.promptea.me/api/newsletter/unsubscribe?token=${"a".repeat(64)}`);
    const html = renderNewsletterHtml(edition, "es", { unsubscribeUrl: url, siteUrl: "https://www.promptea.me" });
    expect(html).toContain('<html lang="es">');
    expect(html).toContain(url);
    expect(html).toContain("Desuscribirme");
    expect(html).toContain("https://www.promptea.me/es/blog/p0-breaking-es");
    expect(html).toContain("Promptea Semanal");
  });

  test("user-derived text is escaped", () => {
    const evil = buildEdition({
      window: WINDOW,
      en: [article({ slug: "xss", eventDate: "2026-09-23", title: 'Break <script>alert("x")</script> out' })],
      es: [],
      now: MONDAY,
      siteUrl: "https://www.promptea.me",
    })!;
    const html = renderNewsletterHtml(evil, "en", { unsubscribeUrl: "https://www.promptea.me/api/newsletter/unsubscribe?token=t" });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  test("plain-text alternative and one-click headers", () => {
    const url = "https://www.promptea.me/api/newsletter/unsubscribe?token=abc";
    const text = renderNewsletterText(edition, "en", { unsubscribeUrl: url });
    expect(text).toContain("THIS WEEK IN AI");
    expect(text).toContain(`Unsubscribe: ${url}`);
    expect(unsubscribeHeaders(url)).toEqual({ "List-Unsubscribe": `<${url}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" });
  });

  test("a week without tools omits the tools section", () => {
    const one = buildEdition({ window: WINDOW, en: [article({ slug: "solo", eventDate: "2026-09-23" })], es: [], now: MONDAY, siteUrl: "https://www.promptea.me" })!;
    expect(renderNewsletterHtml(one, "en")).not.toContain("Tools and launches");
  });
});

// ---------------------------------------------------------------------------
// Delivery gate + configuration
// ---------------------------------------------------------------------------

describe("delivery configuration gates", () => {
  test("dry run never needs anything; test and live list what is missing", () => {
    const empty = readDeliveryConfig({});
    expect(configBlockers(empty, "dry_run")).toEqual([]);
    expect(configBlockers(empty, "test").join(" ")).toMatch(/RESEND_API_KEY.*NEWSLETTER_TEST_RECIPIENTS/);
    expect(configBlockers(empty, "live").join(" ")).toMatch(/NEWSLETTER_DELIVERY_ENABLED/);
    expect(empty.from).toBe("Promptea Weekly <weekly@promptea.me>");
    expect(empty.deliveryEnabled).toBe(false);
  });

  test("only the literal string true enables delivery", () => {
    expect(readDeliveryConfig({ NEWSLETTER_DELIVERY_ENABLED: "1" }).deliveryEnabled).toBe(false);
    expect(readDeliveryConfig({ NEWSLETTER_DELIVERY_ENABLED: "yes" }).deliveryEnabled).toBe(false);
    expect(readDeliveryConfig({ NEWSLETTER_DELIVERY_ENABLED: " TRUE " }).deliveryEnabled).toBe(true);
  });

  test("invalid test recipients and senders are reported", () => {
    const cfg = readDeliveryConfig({ ...LIVE_ENV, NEWSLETTER_TEST_RECIPIENTS: "ok@example.com, not-an-email", NEWSLETTER_FROM_ADDRESS: "weekly at promptea" });
    expect(cfg.testRecipients).toEqual(["ok@example.com"]);
    expect(configBlockers(cfg, "test").join(" ")).toMatch(/invalid entry.*|NEWSLETTER_FROM_ADDRESS/);
  });
});

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

describe("runWeeklyNewsletter", () => {
  test("dry run: builds and validates, stores nothing, sends nothing, records the run", async () => {
    const { deps: d, store, mailer } = deps({ env: {} });
    const r = await runWeeklyNewsletter("dry_run", d);
    expect(r.outcome).toBe("DRY_RUN_OK");
    expect(r.editionId).toBe("promptea-weekly_2026-09-28");
    expect(r.counts.subscribers).toBe(3);
    expect(r.counts.byLang).toEqual({ en: 2, es: 1 });
    expect(r.preview?.en.stories).toBe(6);
    expect(mailer!.sent).toHaveLength(0);
    expect(store.editions.size).toBe(0);
    expect(store.runs.map((x) => x.outcome)).toEqual(["DRY_RUN_OK"]);
  });

  test("test mode: only the test recipients get a [TEST] copy — delivery switch not required", async () => {
    const env = { ...LIVE_ENV, NEWSLETTER_DELIVERY_ENABLED: "false", NEWSLETTER_TEST_RECIPIENTS: "owner@example.com,second@example.com" };
    const { deps: d, mailer, store } = deps({ env });
    const r = await runWeeklyNewsletter("test", d);
    expect(r.outcome).toBe("TEST_SENT");
    expect(mailer!.sent.map((m) => m.to)).toEqual(["owner@example.com", "second@example.com"]);
    expect(mailer!.sent.every((m) => m.subject.startsWith("[TEST] "))).toBe(true);
    expect(mailer!.sent.map((m) => m.subject)).toEqual([expect.stringMatching(/Semanal/), expect.stringMatching(/Weekly/)]);
    expect(store.editions.size).toBe(0);
    expect(store.ledger.size).toBe(0);
  });

  test("live is refused while NEWSLETTER_DELIVERY_ENABLED is not true", async () => {
    const { deps: d, mailer } = deps({ env: { ...LIVE_ENV, NEWSLETTER_DELIVERY_ENABLED: "false" } });
    const r = await runWeeklyNewsletter("live", d);
    expect(r.outcome).toBe("DELIVERY_DISABLED");
    expect(r.ok).toBe(false);
    expect(mailer!.sent).toHaveLength(0);
  });

  test("incomplete configuration stops the run before any send (no partial sends)", async () => {
    for (const env of [
      { ...LIVE_ENV, RESEND_API_KEY: "" },
      { ...LIVE_ENV, NEWSLETTER_TEST_RECIPIENTS: "" },
      { ...LIVE_ENV, NEWSLETTER_FROM_ADDRESS: "nope" },
    ]) {
      const { deps: d, mailer } = deps({ env });
      const r = await runWeeklyNewsletter("live", d);
      expect(r.outcome).toBe("CONFIG_ERROR");
      expect(r.blockers.length).toBeGreaterThan(0);
      expect(mailer!.sent).toHaveLength(0);
    }
  });

  test("live: canary first, then every active subscriber once, in their language, with their own unsubscribe link", async () => {
    const { deps: d, mailer, store } = deps();
    const r = await runWeeklyNewsletter("live", d);
    expect(r.outcome).toBe("SENT");
    expect(r.counts).toMatchObject({ sent: 3, canarySent: 1, failed: 0, remaining: 0 });
    expect(mailer!.sent.map((m) => m.to)).toEqual(["owner@example.com", "ana@example.com", "bob@example.com", "cam@example.com"]);
    const ana = mailer!.sent[1];
    expect(ana.subject).toMatch(/^Promptea Semanal/);
    expect(ana.html).toContain(`token=${"a".repeat(64)}`);
    expect(ana.headers["List-Unsubscribe"]).toContain(`token=${"a".repeat(64)}`);
    expect(ana.idempotencyKey).toBe("promptea-weekly/promptea-weekly_2026-09-28/sub_a");
    expect(mailer!.sent[2].subject).toMatch(/^Promptea Weekly/);
    // Unsubscribed people are never contacted.
    expect(mailer!.sent.map((m) => m.to)).not.toContain("gone@example.com");
    // The edition is published and then marked sent.
    expect(store.editions.get("promptea-weekly_2026-09-28")?.status).toBe("sent");
  });

  test("idempotent: a retried run sends nothing twice", async () => {
    const { deps: d, mailer } = deps();
    await runWeeklyNewsletter("live", d);
    const again = await runWeeklyNewsletter("live", d);
    expect(again.outcome).toBe("ALREADY_SENT");
    expect(mailer!.sent).toHaveLength(4);
  });

  test("a run cut short by the time budget resumes without duplicates", async () => {
    let t = MONDAY.getTime();
    const clock = () => new Date((t += 20_000)); // every call advances 20 s
    const store = new MemoryStore();
    const mailer = new FakeMailer();
    const first = await runWeeklyNewsletter("live", deps({ store, mailer, clock, budgetMs: 90_000 }).deps);
    expect(first.outcome).toBe("PARTIAL");
    expect(first.counts.remaining).toBeGreaterThan(0);
    const second = await runWeeklyNewsletter("live", deps({ store, mailer, clock: () => new Date((t += 1_000)) }).deps);
    expect(second.outcome).toBe("SENT");
    const recipients = mailer.sent.map((m) => m.to);
    expect(new Set(recipients).size).toBe(recipients.length); // nobody twice
    expect(recipients.filter((x) => x !== "owner@example.com").sort()).toEqual(["ana@example.com", "bob@example.com", "cam@example.com"]);
  });

  test("a transient failure is retried on the next run; a permanent refusal is not", async () => {
    const store = new MemoryStore();
    const mailer = new FakeMailer();
    mailer.failFor.add("bob@example.com");
    mailer.rejectFor.add("cam@example.com");
    let t = MONDAY.getTime();
    const first = await runWeeklyNewsletter("live", deps({ store, mailer, clock: () => new Date((t += 1_000)) }).deps);
    expect(first.outcome).toBe("PARTIAL");
    expect(first.counts).toMatchObject({ sent: 1, failed: 1, rejected: 1 });

    mailer.failFor.clear();
    // A failed (not in-flight) claim is retryable on the very next run.
    const second = await runWeeklyNewsletter("live", deps({ store, mailer, clock: () => new Date((t += 1_000)) }).deps);
    expect(second.outcome).toBe("SENT");
    expect(second.counts).toMatchObject({ sent: 1, alreadySent: 1, rejected: 1 });
    expect(mailer.sent.filter((m) => m.to === "bob@example.com")).toHaveLength(1);
    expect(mailer.sent.filter((m) => m.to === "cam@example.com")).toHaveLength(0);
  });

  test("a failed canary stops the run before any subscriber is contacted", async () => {
    const mailer = new FakeMailer();
    mailer.failFor.add("owner@example.com");
    const { deps: d } = deps({ mailer });
    const r = await runWeeklyNewsletter("live", d);
    expect(r.outcome).toBe("CANARY_FAILED");
    expect(mailer.sent).toHaveLength(0);
  });

  test("the same week's stored edition is reused (content never changes between retries)", async () => {
    const store = new MemoryStore();
    const first = await runWeeklyNewsletter("live", deps({ store }).deps);
    expect(first.outcome).toBe("SENT");
    const stored = store.editions.get("promptea-weekly_2026-09-28")!;
    // New articles appearing later cannot alter the stored edition.
    const r = await runWeeklyNewsletter("dry_run", deps({ store, articles: [article({ slug: "late", eventDate: "2026-09-24", importance: "P0" })] }).deps);
    expect(r.preview?.en.subject).toBe(stored.locales.en.subject);
  });

  test("no content and no subscribers are clean outcomes", async () => {
    const none = await runWeeklyNewsletter("live", deps({ articles: [] }).deps);
    expect(none.outcome).toBe("NO_CONTENT");
    const store = new MemoryStore([]);
    const nobody = await runWeeklyNewsletter("live", deps({ store }).deps);
    expect(nobody.outcome).toBe("NO_SUBSCRIBERS");
    expect(store.editions.get("promptea-weekly_2026-09-28")?.status).toBe("published");
  });

  test("storage failures are reported, not thrown", async () => {
    const store = new MemoryStore();
    store.failStorage = true;
    const r = await runWeeklyNewsletter("live", deps({ store }).deps);
    expect(r.outcome).toBe("STORAGE_ERROR");
  });

  test("no subscriber address ever appears in results, logs, run records, or ledger keys", async () => {
    const { deps: d, store, logs } = deps();
    const result = await runWeeklyNewsletter("live", d);
    const serialized = JSON.stringify({ result, logs, runs: store.runs, ledger: [...store.ledger.keys()] });
    for (const s of SUBSCRIBERS) expect(serialized).not.toContain(s.email);
    expect(serialized).not.toContain("owner@example.com");
    expect([...store.ledger.keys()]).toContain(`promptea-weekly_2026-09-28__${testRecipientKey("owner@example.com")}`);
  });
});
