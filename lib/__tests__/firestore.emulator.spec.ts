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
});
