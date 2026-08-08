// POST /api/internal/blog/publish — authentication, replay protection, the
// same-day freshness guard, idempotency outcomes, and the secret-safety
// contract. lib/blog/server.ts is fully mocked, so no Firestore is touched.

import { beforeEach, describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";
import { createHmac, randomUUID } from "crypto";

const publishPostMock = vi.fn();
const recordRunMock = vi.fn().mockResolvedValue({ ok: true });

vi.mock("@/lib/blog/server", () => ({
  publishPost: (...args: unknown[]) => publishPostMock(...args),
  recordRun: (...args: unknown[]) => recordRunMock(...args),
}));

import { POST } from "@/app/api/internal/blog/publish/route";
import { dailyIdempotencyKey, editorialDate } from "@/lib/blog/dates";

const SECRET = "a".repeat(48);
const ENDPOINT = "http://localhost/api/internal/blog/publish";

function localeContent(slug: string, lang: "en" | "es") {
  const es = lang === "es";
  return {
    slug,
    title: es
      ? "OpenAI presenta un nuevo modelo de razonamiento para desarrolladores"
      : "OpenAI ships a new reasoning model aimed at developers",
    deck: es
      ? "La compañía publicó la tarjeta del modelo y habilitó el acceso por API el mismo día."
      : "The company published a model card and enabled API access on the same day.",
    summary: es
      ? "OpenAI anunció un modelo de razonamiento con acceso inmediato por API. La documentación oficial confirma los límites de contexto y el precio por token."
      : "OpenAI announced a reasoning model with immediate API access. Official documentation confirms the context limits and per-token pricing.",
    body: [
      { type: "paragraph" as const, text: es ? "La empresa publicó el anuncio hoy." : "The company published the announcement today." },
      { type: "heading" as const, level: 2 as const, text: es ? "Qué cambia" : "What changes" },
      { type: "list" as const, ordered: false, items: [es ? "Acceso por API" : "API access"] },
    ],
    whyItMatters: [es ? "Cambia el costo por token para tareas de razonamiento." : "It changes per-token cost for reasoning tasks."],
    keyTakeaways: [es ? "Disponible hoy por API." : "Available today via API."],
    seoTitle: es ? "Nuevo modelo de razonamiento" : "New reasoning model",
    metaDescription: es
      ? "Qué anunció la compañía, qué está confirmado oficialmente y qué falta verificar de forma independiente."
      : "What the company announced, what is officially confirmed, and what still needs independent verification.",
  };
}

function makePayload(overrides: Record<string, unknown> = {}) {
  const today = editorialDate();
  return {
    idempotencyKey: dailyIdempotencyKey(today),
    routineRunId: "run-test-0001",
    canonicalSlug: "openai-reasoning-model-launch",
    status: "published",
    eventDate: today,
    importance: "P1",
    category: "model-release",
    tags: ["openai"],
    companies: ["OpenAI"],
    models: ["o-series"],
    locales: {
      en: localeContent("openai-reasoning-model-launch", "en"),
      es: localeContent("openai-modelo-razonamiento-lanzamiento", "es"),
    },
    sources: [
      {
        title: "Introducing the new reasoning model",
        publisher: "OpenAI",
        url: "https://openai.com/index/new-reasoning-model",
        sourceType: "announcement",
        primary: true,
        publishedAt: today,
        accessedAt: today,
      },
      {
        title: "OpenAI launches reasoning model with same-day API access",
        publisher: "Independent Outlet",
        url: "https://example.com/openai-reasoning-model",
        sourceType: "reporting",
        primary: false,
        publishedAt: today,
        accessedAt: today,
      },
    ],
    ...overrides,
  };
}

/** Build a correctly signed request. `tamperBody` signs one body but sends another. */
function signedRequest(
  payload: unknown,
  opts: {
    secret?: string;
    nonce?: string;
    timestamp?: number;
    signature?: string;
    tamperBody?: unknown;
    contentType?: string;
  } = {}
): NextRequest {
  const body = JSON.stringify(payload);
  const timestamp = String(opts.timestamp ?? Math.floor(Date.now() / 1000));
  const nonce = opts.nonce ?? randomUUID();
  const signature =
    opts.signature ??
    createHmac("sha256", opts.secret ?? SECRET)
      .update(`${timestamp}.${nonce}.${body}`)
      .digest("hex");

  return new NextRequest(ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": opts.contentType ?? "application/json",
      "x-promptea-timestamp": timestamp,
      "x-promptea-nonce": nonce,
      "x-promptea-signature": signature,
    },
    body: opts.tamperBody !== undefined ? JSON.stringify(opts.tamperBody) : body,
  });
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return editorialDate(d);
}

describe("API /api/internal/blog/publish", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.BLOG_PUBLISH_SECRET = SECRET;
    publishPostMock.mockResolvedValue({
      outcome: "published",
      id: "ai-daily_2026-08-08",
      canonicalSlug: "openai-reasoning-model-launch",
    });
    recordRunMock.mockResolvedValue({ ok: true });
  });

  // --- authentication -------------------------------------------------------

  test("missing auth headers → 401 and nothing is written", async () => {
    const res = await POST(
      new NextRequest(ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(makePayload()),
      })
    );
    expect(res.status).toBe(401);
    expect(((await res.json()) as { error: string }).error).toBe("unauthorized");
    expect(publishPostMock).not.toHaveBeenCalled();
  });

  test("wrong secret → 401 invalid_signature", async () => {
    const res = await POST(signedRequest(makePayload(), { secret: "b".repeat(48) }));
    expect(res.status).toBe(401);
    expect(((await res.json()) as { error: string }).error).toBe("invalid_signature");
    expect(publishPostMock).not.toHaveBeenCalled();
  });

  test("garbage signature of the wrong length → 401, does not throw", async () => {
    const res = await POST(signedRequest(makePayload(), { signature: "abcd" }));
    expect(res.status).toBe(401);
    expect(((await res.json()) as { error: string }).error).toBe("invalid_signature");
  });

  test("tampered body with a valid signature over different content → 401", async () => {
    const honest = makePayload();
    const malicious = makePayload({ canonicalSlug: "attacker-controlled-slug" });
    const res = await POST(signedRequest(honest, { tamperBody: malicious }));
    expect(res.status).toBe(401);
    expect(((await res.json()) as { error: string }).error).toBe("invalid_signature");
    expect(publishPostMock).not.toHaveBeenCalled();
  });

  test("timestamp outside the replay window → 401 stale_timestamp", async () => {
    const old = Math.floor(Date.now() / 1000) - 600;
    const res = await POST(signedRequest(makePayload(), { timestamp: old }));
    expect(res.status).toBe(401);
    expect(((await res.json()) as { error: string }).error).toBe("stale_timestamp");
  });

  test("replaying the same nonce → 409 replay_detected, published only once", async () => {
    const nonce = randomUUID();
    const payload = makePayload();
    const first = await POST(signedRequest(payload, { nonce }));
    expect(first.status).toBe(201);

    const second = await POST(signedRequest(payload, { nonce }));
    expect(second.status).toBe(409);
    expect(((await second.json()) as { error: string }).error).toBe("replay_detected");
    expect(publishPostMock).toHaveBeenCalledTimes(1);
  });

  test("unset secret → 503 publishing_disabled, never 401 and never open", async () => {
    delete process.env.BLOG_PUBLISH_SECRET;
    const res = await POST(signedRequest(makePayload()));
    expect(res.status).toBe(503);
    expect(((await res.json()) as { error: string }).error).toBe("publishing_disabled");
    expect(publishPostMock).not.toHaveBeenCalled();
  });

  test("a too-short secret is treated as misconfiguration, not a weak key", async () => {
    process.env.BLOG_PUBLISH_SECRET = "short";
    const res = await POST(signedRequest(makePayload(), { secret: "short" }));
    expect(res.status).toBe(503);
  });

  // --- transport hygiene ----------------------------------------------------

  test("non-JSON content type → 415", async () => {
    const res = await POST(signedRequest(makePayload(), { contentType: "text/plain" }));
    expect(res.status).toBe(415);
  });

  test("oversized declared body → 413", async () => {
    const req = new NextRequest(ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-length": String(2 * 1024 * 1024),
        "x-promptea-timestamp": String(Math.floor(Date.now() / 1000)),
        "x-promptea-nonce": randomUUID(),
        "x-promptea-signature": "00",
      },
      body: JSON.stringify(makePayload()),
    });
    const res = await POST(req);
    expect(res.status).toBe(413);
  });

  // --- payload validation ---------------------------------------------------

  test("malformed payload → 400 validation", async () => {
    const res = await POST(signedRequest({ nope: true }));
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: string }).error).toBe("validation");
    expect(publishPostMock).not.toHaveBeenCalled();
  });

  // --- the same-day freshness guard ----------------------------------------

  test("yesterday's event → 422 stale_event, refused server-side", async () => {
    const yesterday = daysAgo(1);
    const res = await POST(
      signedRequest(
        makePayload({ eventDate: yesterday, idempotencyKey: dailyIdempotencyKey(yesterday) })
      )
    );
    expect(res.status).toBe(422);
    const data = (await res.json()) as { error: string; eventDate: string; today: string };
    expect(data.error).toBe("stale_event");
    expect(data.eventDate).toBe(yesterday);
    expect(data.today).toBe(editorialDate());
    expect(publishPostMock).not.toHaveBeenCalled();
  });

  test("a source published today cannot smuggle in yesterday's event", async () => {
    const today = editorialDate();
    const yesterday = daysAgo(1);
    // Sources are all dated today; only the EVENT is stale. Must still refuse.
    const payload = makePayload({
      eventDate: yesterday,
      idempotencyKey: dailyIdempotencyKey(yesterday),
    }) as Record<string, unknown> & { sources: Array<{ publishedAt: string; accessedAt: string }> };
    payload.sources = payload.sources.map((s) => ({ ...s, publishedAt: today, accessedAt: today }));

    const res = await POST(signedRequest(payload));
    expect(res.status).toBe(422);
    expect(((await res.json()) as { error: string }).error).toBe("stale_event");
    expect(publishPostMock).not.toHaveBeenCalled();
  });

  test("a post-dated event → 422 future_event", async () => {
    const tomorrow = editorialDate(new Date(Date.now() + 36 * 60 * 60 * 1000));
    const res = await POST(
      signedRequest(makePayload({ eventDate: tomorrow, idempotencyKey: dailyIdempotencyKey(tomorrow) }))
    );
    expect(res.status).toBe(422);
    expect(((await res.json()) as { error: string }).error).toBe("future_event");
  });

  test("a backdated DRAFT is allowed — only publication is date-gated", async () => {
    const yesterday = daysAgo(1);
    publishPostMock.mockResolvedValue({
      outcome: "published",
      id: `ai-daily_${yesterday}`,
      canonicalSlug: "openai-reasoning-model-launch",
    });
    const res = await POST(
      signedRequest(
        makePayload({
          status: "draft",
          eventDate: yesterday,
          idempotencyKey: dailyIdempotencyKey(yesterday),
        })
      )
    );
    expect(res.status).toBe(201);
    expect(publishPostMock).toHaveBeenCalledTimes(1);
  });

  // --- idempotency outcomes -------------------------------------------------

  test("valid same-day story → 201 with both locale URLs", async () => {
    const res = await POST(signedRequest(makePayload()));
    expect(res.status).toBe(201);
    const data = (await res.json()) as {
      ok: boolean;
      outcome: string;
      urls: { en: string; es: string };
    };
    expect(data.ok).toBe(true);
    expect(data.outcome).toBe("published");
    expect(data.urls.en).toBe("/en/blog/openai-reasoning-model-launch");
    expect(data.urls.es).toBe("/es/blog/openai-modelo-razonamiento-lanzamiento");
  });

  test("a retry after a successful publish → 200 already_published, no duplicate", async () => {
    publishPostMock.mockResolvedValue({
      outcome: "already_published",
      id: "ai-daily_2026-08-08",
      canonicalSlug: "openai-reasoning-model-launch",
    });
    const res = await POST(signedRequest(makePayload()));
    expect(res.status).toBe(200);
    expect(((await res.json()) as { outcome: string }).outcome).toBe("already_published");
  });

  test("slug collision → 409 slug_conflict", async () => {
    publishPostMock.mockResolvedValue({
      outcome: "slug_conflict",
      conflictingId: "ai-daily_2026-08-01",
      slug: "openai-reasoning-model-launch",
    });
    const res = await POST(signedRequest(makePayload()));
    expect(res.status).toBe(409);
    expect(((await res.json()) as { error: string }).error).toBe("slug_conflict");
  });

  test("dryRun validates without writing", async () => {
    const res = await POST(signedRequest(makePayload({ dryRun: true })));
    expect(res.status).toBe(200);
    const data = (await res.json()) as { dryRun: boolean; primarySourceCount: number };
    expect(data.dryRun).toBe(true);
    expect(data.primarySourceCount).toBe(1);
    expect(publishPostMock).not.toHaveBeenCalled();
  });

  test("Firestore failure → 503 unavailable, no crash", async () => {
    publishPostMock.mockRejectedValue(new Error("firestore down"));
    const res = await POST(signedRequest(makePayload()));
    expect(res.status).toBe(503);
    expect(((await res.json()) as { error: string }).error).toBe("unavailable");
  });

  // --- secret safety --------------------------------------------------------

  test("no response ever echoes the publishing secret", async () => {
    const cases = [
      await POST(signedRequest(makePayload())),
      await POST(signedRequest(makePayload(), { secret: "b".repeat(48) })),
      await POST(signedRequest({ nope: true })),
    ];
    for (const res of cases) {
      const text = await res.text();
      expect(text).not.toContain(SECRET);
      expect(text.toLowerCase()).not.toContain("blog_publish_secret");
    }
  });
});
