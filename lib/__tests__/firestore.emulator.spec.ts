// v1.8.8 — the firebase-admin upgrade check: the site's real Firestore code
// against the Firestore emulator.
//
//   npm run test:firestore
//   (= firebase emulators:exec --only firestore --project demo-promptea "vitest run lib/__tests__/firestore.emulator.spec.ts")
//
// Skipped unless FIRESTORE_EMULATOR_HOST is set, so `npm test` never needs
// Java or the emulator. It exercises every Firestore feature Promptea uses:
// add/set/update/create, merge writes, serverTimestamp, Timestamp round-trips,
// transactions (create-if-absent and the delivery-ledger claim), `in`,
// `array-contains`, `array-contains-any`, orderBy on a field and on the
// document id, startAfter, limit, count() aggregation, and the ALREADY_EXISTS
// error code that the ops alert relies on.

import { beforeAll, describe, expect, test, vi } from "vitest";
import { generateKeyPairSync } from "node:crypto";

vi.mock("server-only", () => ({}));

const EMULATOR = process.env.FIRESTORE_EMULATOR_HOST;

describe.skipIf(!EMULATOR)("Firestore through firebase-admin (emulator)", () => {
  // Real modules, loaded after the fake credentials are in place.
  let newsletter: typeof import("@/lib/newsletter/server");
  let blog: typeof import("@/lib/blog/server");
  let admin: typeof import("@/lib/firebase/admin");
  let fixtures: typeof import("./blog.fixtures");

  beforeAll(async () => {
    // A throwaway service account: the emulator ignores credentials, but
    // cert() still parses them exactly as in production.
    const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const sa = {
      type: "service_account",
      project_id: "demo-promptea",
      private_key_id: "emulator",
      private_key: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
      client_email: "emulator@demo-promptea.iam.gserviceaccount.com",
      client_id: "1",
    };
    process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 = Buffer.from(JSON.stringify(sa)).toString("base64");
    process.env.FIREBASE_PROJECT_ID = "demo-promptea";
    await fetch(`http://${EMULATOR}/emulator/v1/projects/demo-promptea/databases/(default)/documents`, { method: "DELETE" });
    admin = await import("@/lib/firebase/admin");
    newsletter = await import("@/lib/newsletter/server");
    blog = await import("@/lib/blog/server");
    fixtures = await import("./blog.fixtures");
  });

  test("the SDK in use", async () => {
    const { SDK_VERSION } = await import("firebase-admin");
    console.log(`[firestore-emulator] firebase-admin ${SDK_VERSION}`);
    expect(SDK_VERSION).toMatch(/^\d+\.\d+\.\d+/);
  });

  test("subscribers: add, dedupe by hash, count(), paginated active list, unsubscribe by token", async () => {
    expect(await newsletter.addSubscriber({ email: "Ana@Example.com", lang: "es" })).toEqual({ outcome: "subscribed" });
    expect(await newsletter.addSubscriber({ email: "ana@example.com ", lang: "es" })).toEqual({ outcome: "already_subscribed" });
    expect(await newsletter.addSubscriber({ email: "bob@example.com", lang: "en", uiLang: "zh" })).toEqual({ outcome: "subscribed" });
    expect(await newsletter.getSubscriberCount()).toBe(2);
    const active = await newsletter.listActiveSubscribers(1); // page size 1 → exercises startAfter
    expect(active.map((s) => s.email).sort()).toEqual(["ana@example.com", "bob@example.com"]);
    expect(await newsletter.removeSubscriber(active[0].unsubscribeToken)).toMatchObject({ ok: true });
    expect(await newsletter.getSubscriberCount()).toBe(1);
  });

  test("editions and the delivery ledger: transactions, merge writes, ascending document-id order", async () => {
    const store = newsletter.firestoreNewsletterStore();
    const edition = { editionId: "promptea-weekly_2026-11-16" } as Parameters<typeof store.createEditionIfAbsent>[0];
    const stored = await store.createEditionIfAbsent({ ...edition, status: "draft", publishedAt: null, sentAt: null } as never);
    expect(stored.editionId).toBe("promptea-weekly_2026-11-16");
    const again = await store.createEditionIfAbsent({ ...edition, status: "sent" } as never);
    expect((again as { status: string }).status).toBe("draft"); // create-once
    await store.updateEdition("promptea-weekly_2026-11-16", { status: "published", publishedAt: "2026-11-16T12:03:30.000Z" });

    const now = new Date("2026-11-16T12:03:40.000Z");
    expect(await store.claimDelivery("promptea-weekly_2026-11-16", "sub_1", now)).toBe("claimed");
    expect(await store.claimDelivery("promptea-weekly_2026-11-16", "sub_1", now)).toBe("in_flight");
    await store.completeDelivery("promptea-weekly_2026-11-16", "sub_1", { status: "sent", providerId: "em_1" }, now);
    expect(await store.claimDelivery("promptea-weekly_2026-11-16", "sub_1", now)).toBe("already_sent");
    await store.recordRun({ outcome: "SENT" } as never);
    await store.updateEdition("promptea-weekly_2026-11-16", { status: "sent", sentAt: "2026-11-16T12:03:49.000Z" });

    const snap = await admin.getAdminFirestore().collection("newsletter_editions").doc("promptea-weekly_2026-11-16").get();
    expect(snap.get("sentAt")).toBe("2026-11-16T12:03:49.000Z");
    expect(snap.get("updatedAt")).toBeTruthy(); // serverTimestamp resolved
  });

  test("AI Daily: publish (transaction + Timestamp), slug lookups, status `in` + orderBy publishedAt, run log", async () => {
    const payload = fixtures.makePayload({ status: "published" });
    const out = await blog.publishPost(payload, { publishedAtDate: new Date("2026-11-19T15:14:51.000Z") });
    expect(out).toMatchObject({ outcome: "published" });
    const again = await blog.publishPost(payload, { publishedAtDate: new Date() });
    expect(again).toMatchObject({ outcome: "already_published" });

    const slug = payload.locales.en.slug;
    const article = await blog.getArticleBySlug("en", slug);
    expect(article?.publishedAt).toBe("2026-11-19T15:14:51.000Z");
    const page = await blog.listPublishedArticles({ lang: "en", limit: 5 });
    expect(page.cards.map((c) => c.slug)).toContain(slug);
    const all = await blog.listAllPublishedArticles("es", 10);
    expect(all).toHaveLength(1);
    await expect(blog.recordRun({ runId: "emulator-run", status: "PUBLISHED" })).resolves.toEqual({ ok: true });
  });

  test("create() on an existing document fails with ALREADY_EXISTS (code 6)", async () => {
    const db = admin.getAdminFirestore();
    const ref = db.collection("ops_alerts").doc("routine-health_2026-11-20");
    await ref.create({ day: "2026-11-20" });
    await expect(ref.create({ day: "2026-11-20" })).rejects.toMatchObject({ code: 6 });
  });

  // v1.8.9 — the Claude spend ledger (lib/ai/budgetStore.ts) on real Firestore transactions.
  test("AI ledger: reserve the worst case, settle to the real cost, refuse past the cap", async () => {
    const { createFirestoreBudgetStore } = await import("@/lib/ai/budgetStore");
    const { budgetLimits } = await import("@/lib/ai/budget");
    const store = createFirestoreBudgetStore();
    const now = new Date("2026-11-22T12:00:00Z");
    const limits = budgetLimits({ AI_MONTHLY_BUDGET_USD: "0.01", AI_BUDGET_SAFETY_RATIO: "1", AI_DAILY_BUDGET_USD: "0.01" }); // 10,000 µ$
    const r1 = await store.reserve({ feature: "flow", model: "claude-haiku-5-5", worstMicros: 4000, userKey: "abc", now }, limits);
    expect(r1.ok).toBe(true);
    if (r1.ok) await store.settle(r1.ticket, 1500, { inputTokens: 100, outputTokens: 2000, cacheReadTokens: 900, cacheWriteTokens: 0 });
    let s = await store.snapshot(now);
    expect(s.monthSpentMicros).toBe(1500);
    expect(s.daySpentMicros).toBe(1500);
    expect(s.byFeature.flow).toEqual({ spentMicros: 1500, requests: 1 });
    expect(s.tokens).toEqual({ inputTokens: 100, outputTokens: 2000, cacheReadTokens: 900, cacheWriteTokens: 0 });
    // 1,500 spent: 8,500 left → two 4,000 reservations fit, the third does not.
    const results = [];
    for (let i = 0; i < 3; i++) results.push(await store.reserve({ feature: "refine", model: "claude-haiku-5-5", worstMicros: 4000, userKey: null, now }, limits));
    expect(results.map((r) => r.ok)).toEqual([true, true, false]);
    expect(results[2]).toEqual({ ok: false, reason: "budget_month" });
    // A timeout keeps the reservation as the charge.
    if (results[0]!.ok) await store.settle(results[0]!.ticket, null);
    s = await store.snapshot(now);
    expect(s.monthSpentMicros).toBe(1500 + 4000 + 4000);
    const quota = await admin.getAdminFirestore().collection("ai_quota").doc("2026-11-22_flow_abc").get();
    expect(quota.get("count")).toBe(1);
    expect(quota.get("expiresAt")?.toDate().toISOString()).toBe("2026-11-24T00:00:00.000Z");
  });

  test("AI ledger: concurrent reservations never cross the cap (transactions)", async () => {
    const { createFirestoreBudgetStore } = await import("@/lib/ai/budgetStore");
    const { budgetLimits } = await import("@/lib/ai/budget");
    const store = createFirestoreBudgetStore();
    const now = new Date("2026-12-03T12:00:00Z"); // a fresh month
    const limits = budgetLimits({ AI_MONTHLY_BUDGET_USD: "0.01", AI_BUDGET_SAFETY_RATIO: "1", AI_DAILY_BUDGET_USD: "0.01" });
    const results = await Promise.all(
      Array.from({ length: 6 }, () => store.reserve({ feature: "flow", model: "claude-haiku-5-5", worstMicros: 3000, userKey: null, now }, limits))
    );
    // The invariant: whatever the contention, at most 3 × 3,000 ≤ 10,000 go through and the
    // ledger holds exactly what was granted. A transaction that gives up under contention
    // fails CLOSED (store_unavailable → no Claude call), never open.
    const granted = results.filter((r) => r.ok).length;
    expect(granted).toBeGreaterThanOrEqual(1);
    expect(granted).toBeLessThanOrEqual(3);
    for (const r of results) if (!r.ok) expect(["budget_month", "budget_day", "store_unavailable"]).toContain(r.reason);
    expect((await store.snapshot(now)).monthSpentMicros).toBe(granted * 3000);
  }, 60_000);
  test("v1.9.0 Agent-Ready: sessions (create-once, Timestamp expiry, transactional update) and the scan quota", async () => {
    const { createFirestoreAuditStore, SCAN_QUOTA } = await import("@/lib/agentReady/store");
    const { createSession } = await import("@/lib/agentReady/session");
    const store = createFirestoreAuditStore();
    expect(store.available()).toBe(true);

    const audit = {
      schema: 1, requestedUrl: "https://shop.example.com/", pageUrl: "https://shop.example.com/", origin: "https://shop.example.com", scannedAt: "2026-11-27T12:00:00.000Z",
      stack: "next-app", score: 50, level: "readable", categories: [{ category: "bots", points: 5, max: 10, score: 50 }],
      checks: [{ id: "bots.signals", category: "bots", status: "fail", weight: 3, points: 0, code: "no_signals", evidence: { lines: 0, named: ["GPTBot"], ok: false } }],
      agentView: { title: "t", description: "d", lang: "en", words: 1, htmlBytes: 1, textBytes: 1, htmlTokens: 1, textTokens: 1, markdownTokens: null, headings: [{ level: 1, text: "h" }], jsonLdTypes: [], links: 0, text: "x", markdown: null },
      humanView: { frameable: true, scripts: 0, images: 0, imagesWithAlt: 0, forms: 0, landmarks: [], textRatio: 0.1 },
      requests: 11, durationMs: 5,
    } as never;
    const now = new Date("2026-11-27T12:00:00Z");
    const session = createSession(audit, now);
    await store.save(session);
    await expect(store.save(session)).rejects.toMatchObject({ code: 6 }); // an id is never overwritten

    const read = await store.get(session.id, now);
    expect(read).toEqual(session);
    const raw = await admin.getAdminFirestore().collection("agent_audits").doc(session.id).get();
    expect(raw.get("expiresAt").toDate().toISOString()).toBe(session.expiresAt); // a Timestamp, for the TTL policy

    const updated = await store.update(session.id, (s) => ({ ...s, plan: ["bots.signals"], id: "hijacked", expiresAt: "2999-01-01T00:00:00.000Z" }) as never, now);
    expect(updated).toMatchObject({ id: session.id, expiresAt: session.expiresAt, plan: ["bots.signals"] });
    expect(await store.get(session.id, new Date("2026-12-12T00:00:00Z"))).toBeNull(); // expired on read, policy or not
    expect(await store.update(session.id, (s) => s, new Date("2026-12-12T00:00:00Z"))).toBeNull();
    expect(await store.get("a".repeat(22), now)).toBeNull();

    const results = await Promise.all(Array.from({ length: SCAN_QUOTA.perClientPerDay + 5 }, () => store.reserveScan("client-hash", now)));
    expect(results.filter((r) => r.ok)).toHaveLength(SCAN_QUOTA.perClientPerDay); // concurrent reservations never cross the cap
    expect(await store.reserveScan("other-client", now)).toEqual({ ok: true });
  }, 60_000);
});
