// v1.6.0 — Promptea Weekly HTTP surface and Firestore ledger.
//
//   POST /api/internal/newsletter/run  — HMAC-signed, fails closed
//   GET  /api/newsletter/unsubscribe   — footer link (HTML)
//   POST /api/newsletter/unsubscribe   — RFC 8058 one-click (JSON)
//   firestoreNewsletterStore           — delivery-ledger claim rules

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { createHmac } from "node:crypto";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

// ---------------------------------------------------------------------------
// Fake Firestore (enough for lib/newsletter/server.ts)
// ---------------------------------------------------------------------------

type Doc = Record<string, unknown>;
const collections = new Map<string, Map<string, Doc>>();
let idSeq = 0;
const col = (name: string) => {
  if (!collections.has(name)) collections.set(name, new Map());
  return collections.get(name)!;
};

function docRef(name: string, id: string) {
  return {
    id,
    __col: name,
    async get() {
      const d = col(name).get(id);
      return { id, exists: d !== undefined, data: () => d };
    },
    async set(data: Doc, opts?: { merge?: boolean }) {
      const prev = col(name).get(id) ?? {};
      col(name).set(id, opts?.merge ? { ...prev, ...data } : { ...data });
    },
    async update(data: Doc) {
      const prev = col(name).get(id);
      if (!prev) throw new Error("NOT_FOUND");
      col(name).set(id, { ...prev, ...data });
    },
  };
}

function query(name: string, filters: Array<(d: Doc) => boolean> = [], order: "asc" | "desc" = "asc", lim = Infinity, after: string | null = null) {
  return {
    where(field: string, _op: string, value: unknown) {
      return query(name, [...filters, (d) => d[field] === value], order, lim, after);
    },
    orderBy(_f: unknown, dir: "asc" | "desc" = "asc") {
      return query(name, filters, dir, lim, after);
    },
    limit(n: number) {
      return query(name, filters, order, n, after);
    },
    startAfter(id: string) {
      return query(name, filters, order, lim, id);
    },
    count() {
      return { get: async () => ({ data: () => ({ count: [...col(name).values()].filter((d) => filters.every((f) => f(d))).length }) }) };
    },
    async get() {
      let entries = [...col(name).entries()].filter(([, d]) => filters.every((f) => f(d)));
      entries.sort(([a], [b]) => (order === "asc" ? a.localeCompare(b) : b.localeCompare(a)));
      if (after) entries = entries.filter(([id]) => (order === "asc" ? id > after : id < after));
      const docs = entries.slice(0, lim).map(([id, d]) => ({ id, data: () => d, ref: docRef(name, id) }));
      return { docs, empty: docs.length === 0 };
    },
  };
}

const fakeDb = {
  collection(name: string) {
    return {
      doc: (id: string) => docRef(name, id),
      add: async (data: Doc) => {
        const id = `auto_${++idSeq}`;
        col(name).set(id, data);
        return { id };
      },
      ...query(name),
    };
  },
  async runTransaction<T>(fn: (tx: unknown) => Promise<T>): Promise<T> {
    const tx = {
      get: (ref: ReturnType<typeof docRef>) => ref.get(),
      create: (ref: ReturnType<typeof docRef>, data: Doc) => {
        if (col(ref.__col).has(ref.id)) throw new Error("ALREADY_EXISTS");
        col(ref.__col).set(ref.id, data);
      },
      update: (ref: ReturnType<typeof docRef>, data: Doc) => {
        col(ref.__col).set(ref.id, { ...(col(ref.__col).get(ref.id) ?? {}), ...data });
      },
      set: (ref: ReturnType<typeof docRef>, data: Doc) => col(ref.__col).set(ref.id, data),
    };
    return fn(tx);
  },
};

vi.mock("@/lib/firebase/admin", () => ({ getAdminFirestore: () => fakeDb }));
vi.mock("firebase-admin/firestore", () => ({
  FieldValue: { serverTimestamp: () => "SERVER_TS" },
  FieldPath: { documentId: () => "__name__" },
}));
vi.mock("@/lib/blog/server", () => ({
  listAllPublishedArticles: vi.fn(async () => []),
}));

const { firestoreNewsletterStore, removeSubscriber, getLatestEdition, listActiveSubscribers } = await import("@/lib/newsletter/server");
const unsubscribeRoute = await import("@/app/api/newsletter/unsubscribe/route");
const runRoute = await import("@/app/api/internal/newsletter/run/route");

beforeEach(() => {
  collections.clear();
  idSeq = 0;
});

// ---------------------------------------------------------------------------
// Signed run endpoint
// ---------------------------------------------------------------------------

const SECRET = "s".repeat(40);

function signedRequest(body: unknown, opts: { secret?: string; ts?: number; nonce?: string } = {}) {
  const raw = JSON.stringify(body);
  const ts = String(opts.ts ?? Math.floor(Date.now() / 1000));
  const nonce = opts.nonce ?? `n-${Math.random().toString(36).slice(2)}`;
  const sig = createHmac("sha256", opts.secret ?? SECRET).update(`${ts}.${nonce}.${raw}`).digest("hex");
  return new NextRequest("https://www.promptea.me/api/internal/newsletter/run", {
    method: "POST",
    headers: { "content-type": "application/json", "x-promptea-timestamp": ts, "x-promptea-nonce": nonce, "x-promptea-signature": sig },
    body: raw,
  });
}

describe("POST /api/internal/newsletter/run", () => {
  const saved = { ...process.env };
  beforeEach(() => {
    process.env.NEWSLETTER_SEND_SECRET = SECRET;
    delete process.env.NEWSLETTER_DELIVERY_ENABLED;
    delete process.env.RESEND_API_KEY;
    delete process.env.NEWSLETTER_TEST_RECIPIENTS;
  });
  afterEach(() => {
    process.env = { ...saved };
  });

  test("fails closed without a configured secret", async () => {
    delete process.env.NEWSLETTER_SEND_SECRET;
    const res = await runRoute.POST(signedRequest({ mode: "dry_run" }));
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe("newsletter_runner_disabled");
  });

  test("rejects a wrong signature and a stale timestamp", async () => {
    expect((await runRoute.POST(signedRequest({ mode: "dry_run" }, { secret: "x".repeat(40) }))).status).toBe(401);
    expect((await runRoute.POST(signedRequest({ mode: "dry_run" }, { ts: Math.floor(Date.now() / 1000) - 3600 }))).status).toBe(401);
  });

  test("rejects replayed nonces and unknown fields", async () => {
    const first = await runRoute.POST(signedRequest({ mode: "dry_run" }, { nonce: "fixed-nonce-123" }));
    expect(first.status).toBe(200);
    const replay = await runRoute.POST(signedRequest({ mode: "dry_run" }, { nonce: "fixed-nonce-123" }));
    expect(replay.status).toBe(409);
    expect((await runRoute.POST(signedRequest({ mode: "live", to: "someone@example.com" }))).status).toBe(400);
  });

  test("a custom date is only accepted for previews, never for live", async () => {
    expect((await runRoute.POST(signedRequest({ mode: "live", date: "2026-09-28" }))).status).toBe(400);
    expect((await runRoute.POST(signedRequest({ mode: "dry_run", date: "2026-09-28" }))).status).toBe(200);
  });

  test("a signed live call with delivery switched off sends nothing and says why", async () => {
    const res = await runRoute.POST(signedRequest({ mode: "live" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.outcome).toBe("DELIVERY_DISABLED");
    expect(body.ok).toBe(false);
    // The run is recorded without any address.
    const runs = [...col("newsletter_runs").values()];
    expect(runs).toHaveLength(1);
    expect(runs[0].outcome).toBe("DELIVERY_DISABLED");
  });

  test("a signed dry run reports NO_CONTENT for an empty archive", async () => {
    const res = await runRoute.POST(signedRequest({ mode: "dry_run" }));
    const body = await res.json();
    expect(body.outcome).toBe("NO_CONTENT");
    expect(body.config.resendKeyPresent).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Unsubscribe
// ---------------------------------------------------------------------------

const TOKEN = "f".repeat(64);

function seedSubscriber(status = "active", lang = "es") {
  col("newsletter_subscribers").set("sub_1", { email: "ana@example.com", lang, status, unsubscribeToken: TOKEN, emailHash: "h" });
}

describe("unsubscribe", () => {
  test("GET with a valid token unsubscribes and answers in the subscriber's language", async () => {
    seedSubscriber("active", "es");
    const res = await unsubscribeRoute.GET(new NextRequest(`https://www.promptea.me/api/newsletter/unsubscribe?token=${TOKEN}`));
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('<html lang="es">');
    expect(html).toContain("Te desuscribiste");
    expect(col("newsletter_subscribers").get("sub_1")?.status).toBe("unsubscribed");
  });

  test("GET is idempotent for an already-unsubscribed token", async () => {
    seedSubscriber("unsubscribed", "en");
    const res = await unsubscribeRoute.GET(new NextRequest(`https://www.promptea.me/api/newsletter/unsubscribe?token=${TOKEN}`));
    expect(res.status).toBe(200);
  });

  test("GET with a malformed or unknown token shows the invalid-link page (v1.5 claimed success)", async () => {
    const bad = await unsubscribeRoute.GET(new NextRequest("https://www.promptea.me/api/newsletter/unsubscribe?token=nope"));
    expect(bad.status).toBe(400);
    const unknown = await unsubscribeRoute.GET(new NextRequest(`https://www.promptea.me/api/newsletter/unsubscribe?token=${"0".repeat(64)}`));
    expect(unknown.status).toBe(400);
    expect(await unknown.text()).toMatch(/Invalid unsubscribe link|Enlace de desuscripción inválido/);
  });

  test("POST implements RFC 8058 one-click unsubscribe", async () => {
    seedSubscriber("active", "en");
    const res = await unsubscribeRoute.POST(
      new NextRequest(`https://www.promptea.me/api/newsletter/unsubscribe?token=${TOKEN}`, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: "List-Unsubscribe=One-Click",
      })
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(col("newsletter_subscribers").get("sub_1")?.status).toBe("unsubscribed");
  });

  test("removeSubscriber never needs the address", async () => {
    seedSubscriber();
    const r = await removeSubscriber(TOKEN);
    expect(r).toEqual({ ok: true, lang: "es" });
  });
});

// ---------------------------------------------------------------------------
// Firestore store: subscriber filtering, latest edition, delivery ledger
// ---------------------------------------------------------------------------

describe("firestoreNewsletterStore", () => {
  test("only active subscribers with a valid token are listed (paginated)", async () => {
    for (let i = 0; i < 7; i++) {
      col("newsletter_subscribers").set(`s${i}`, { email: `u${i}@example.com`, lang: i % 2 ? "en" : "es", status: i === 3 ? "unsubscribed" : "active", unsubscribeToken: String(i).repeat(64).slice(0, 64).replace(/[^a-f0-9]/g, "a") });
    }
    col("newsletter_subscribers").set("broken", { email: "b@example.com", lang: "en", status: "active", unsubscribeToken: "short" });
    const list = await listActiveSubscribers(2);
    expect(list.map((s) => s.id)).toEqual(["s0", "s1", "s2", "s4", "s5", "s6"]);
  });

  test("getLatestEdition returns the newest published or sent edition by date-keyed id", async () => {
    col("newsletter_editions").set("promptea-weekly_2026-09-21", { editionId: "promptea-weekly_2026-09-21", status: "sent" });
    col("newsletter_editions").set("promptea-weekly_2026-09-28", { editionId: "promptea-weekly_2026-09-28", status: "draft" });
    expect((await getLatestEdition())?.editionId).toBe("promptea-weekly_2026-09-21");
  });

  test("delivery claims: first claim wins, sent is final, fresh in-flight is left alone, stale retries stay inside the idempotency window", async () => {
    const store = firestoreNewsletterStore();
    const t0 = new Date("2026-09-28T12:00:00.000Z");
    const at = (min: number) => new Date(t0.getTime() + min * 60_000);
    const ed = "promptea-weekly_2026-09-28";

    expect(await store.claimDelivery(ed, "sub_a", t0)).toBe("claimed");
    expect(await store.claimDelivery(ed, "sub_a", at(1))).toBe("in_flight");
    // A crashed run: after the in-flight window the claim can be retried …
    expect(await store.claimDelivery(ed, "sub_a", at(15))).toBe("claimed");
    await store.completeDelivery(ed, "sub_a", { status: "sent", providerId: "re_1" }, at(16));
    expect(await store.claimDelivery(ed, "sub_a", at(20))).toBe("already_sent");

    // … but never once Resend's 24 h idempotency window has passed.
    expect(await store.claimDelivery(ed, "sub_b", t0)).toBe("claimed");
    await store.completeDelivery(ed, "sub_b", { status: "failed", error: "rate_limit_exceeded" }, at(1));
    expect(await store.claimDelivery(ed, "sub_b", at(24 * 60))).toBe("unknown");

    // Permanent refusals are not retried.
    expect(await store.claimDelivery(ed, "sub_c", t0)).toBe("claimed");
    await store.completeDelivery(ed, "sub_c", { status: "rejected", error: "validation_error" }, at(1));
    expect(await store.claimDelivery(ed, "sub_c", at(2))).toBe("rejected");

    // Ledger documents never contain an address.
    expect(JSON.stringify([...col("newsletter_deliveries").entries()])).not.toMatch(/@/);
  });

  test("an edition is created once; later calls return the stored one", async () => {
    const store = firestoreNewsletterStore();
    const edition = { editionId: "promptea-weekly_2026-09-28", status: "published" } as never;
    await store.createEditionIfAbsent(edition);
    const again = await store.createEditionIfAbsent({ editionId: "promptea-weekly_2026-09-28", status: "draft" } as never);
    expect((again as { status: string }).status).toBe("published");
  });
});
