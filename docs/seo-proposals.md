# SEO / GEO — proposals deliberately NOT implemented in v1.8.0

These two ideas came up while finishing the v1.8.0 SEO/GEO work. Both are
**designs only**: shipping either one needs a decision from the owner and, for
the first, new infrastructure. Nothing here is wired into the app.

---

## 1. A public analysis API (for agents and integrations)

### Why it would help

AI assistants and automation tools could call Promptea directly ("score this
prompt") instead of scraping the site. It is the natural next step after
`llms.txt` and the markdown twins: those let an agent *read* Promptea, this
would let it *use* it.

### Why it is not safe to ship today

`POST /api/analyze` is the app's own endpoint, not a public API:

- **No rate limit.** There is no per-IP, per-key or global throttle anywhere in
  `app/api/*` (the only limits are body size, 512 KB, and attachment shapes).
- **It can trigger paid LLM calls.** When a provider key is configured,
  `refinePromptAdaptive` calls the provider chain (`lib/llm/providers.ts`) and,
  if `PROMPT_JUDGE_ENABLED=1`, `judgePrompt` makes a second call. Each request is
  therefore a cost the owner pays, and a bot can issue thousands.
- **It writes to Firestore.** `upsertAnalysisEvent` stores telemetry metadata
  per request; unthrottled traffic is also unthrottled writes.
- **It is shaped for the UI**, not for third parties: attachments, session ids,
  UI language header, debug logging outside production, a response that is
  versioned with the engine rather than with a public contract.

Publishing it (even just by documenting it in an OpenAPI file) would invite
exactly the traffic these properties cannot absorb. So: not exposed, not
documented, not linked from `llms.txt`.

### Proposed design

A **separate** route, `POST /api/v1/analyze`, so the internal endpoint can keep
changing:

| Concern | Proposal |
| --- | --- |
| Scope | Deterministic analysis only by default: score (0–100), the six dimension scores, findings, recommendations, `optimizedPrompt` from the rules engine, before → after score. **No LLM refinement and no judge** unless the key holds the `refine` scope. The deterministic engine costs CPU, not money. |
| Auth | Anonymous tier with a very low limit, plus **optional API keys** (header `Authorization: Bearer …`, keys stored hashed in Firestore, one document per key with `scopes`, `rpm`, `dailyCap`, `createdAt`, `revokedAt`). Keys are issued by the owner by hand at first; there is no self-serve sign-up. |
| Rate limit | A token bucket per (key or IP): e.g. anonymous 10 requests/min and 200/day; keys configurable. Needs shared state across serverless instances — Upstash Redis (`@upstash/ratelimit`, sliding window) is the least code; the alternative is a Firestore counter with a short TTL, which costs reads/writes per call and is not recommended. Always answer 429 with `Retry-After` and `X-RateLimit-*` headers. |
| Cost guard | A global daily budget switch (`API_V1_ENABLED`, `API_V1_DAILY_CAP`) that returns 503 when exceeded, and a hard cap on prompt length (e.g. 8,000 characters, far below today's 512 KB body limit). |
| Contract | Versioned by URL (`/v1`). Response is a stable subset (`score`, `dimensions[]`, `findings[]`, `recommendations[]`, `optimizedPrompt`, `engineVersion`, `requestId`); no internal `meta`. Errors use RFC 9457 problem+json. |
| Telemetry | Same metadata-only policy as the app (no prompt text stored); tag events `source: "api_v1"` and the key id. |
| Docs | An **OpenAPI 3.1** file generated from the Zod schemas (`zod` is already a dependency; `zod-to-openapi` or hand-written), served at `/api/v1/openapi.json`, linked from `llms.txt` only once the API is live. |
| Abuse | CORS closed by default (server-to-server); reject requests whose `User-Agent` is empty; per-key revocation; alert on 429 spikes. |

### Risks and open questions

1. **Cost** — the main risk. Mitigated by "deterministic only by default", the
   rate limit and the daily cap; the owner should decide whether `refine` is
   ever offered publicly.
2. **Abuse as a free LLM proxy** — impossible while `optimizedPrompt` comes from
   the rules engine; becomes possible if refinement is enabled, hence the scope.
3. **Support burden** — a public contract is a promise. Version it and keep v1
   stable.
4. **Privacy** — callers will send prompts that contain private data. The
   privacy page would need a short API section (no prompt text stored).
5. **New dependency/infra** — a shared rate-limit store. That is a product
   decision (cost and ops), not something to slip into an SEO change.

### Suggested order

Rate limiter + tests → `/api/v1/analyze` (deterministic) behind
`API_V1_ENABLED=0` → OpenAPI → manual keys → announce in `llms.txt`.

---

## 2. IndexNow (instant URL submission to Bing, Yandex and others)

### What it is

IndexNow is an open protocol: when a URL is created or changed, a `GET`/`POST`
to `https://api.indexnow.org/indexnow` (or one participating engine) tells all
participants at once, so a new AI Daily story is crawled in minutes instead of
whenever the sitemap is next read. Google does not participate (it relies on
the sitemap and Search Console), but Bing and others do, and several AI search
products draw on Bing's index.

### Why it is not implemented

It is an **outward-facing, external call** that the product has never made, it
needs a secret-less but public key file and an owner decision on which events
count, and an unreviewed publisher could spam search engines with every
revalidation. It should be opt-in.

### Proposed design

- **Key**: a random 32-character hex key in `INDEXNOW_KEY`; the protocol requires
  the same key to be served at `https://promptea.me/<key>.txt` (a route handler
  that answers only when `INDEXNOW_KEY` is set, 404 otherwise).
- **Trigger**: only from the code paths that really create or change content —
  after a successful `POST /api/internal/blog/publish` (a new or corrected AI
  Daily story, both locales' URLs) and after the weekly newsletter run publishes
  an edition. **Never** from page renders, sitemap generation or `revalidate`.
- **Module**: `lib/seo/indexnow.ts` exporting `submitUrls(urls: string[])`:
  no-op unless `INDEXNOW_KEY` and `INDEXNOW_ENABLED=1` are set; filters to URLs on
  the site's own origin; batches (up to 10,000 per call, we would send 2–4);
  a 3 s timeout; **never throws** (the publish flow must not fail because a
  ping did); logs only counts and the status code.
- **Idempotence**: the publish route already knows whether the story is new
  (`published` vs `already_published`); ping only on `published` or on a
  correction.
- **Tests**: URL filtering, disabled-by-default, no ping on `already_published`,
  failure swallowed, payload shape.
- **Verification before turning it on**: submit one URL by hand and check the
  response (200/202) and Bing Webmaster Tools' IndexNow report.

### Risks

- Pinging for unchanged content gets a site throttled or ignored: hence the
  strict trigger list above.
- The key file is public by design (it only proves ownership); it is not a
  secret, but rotating it needs a deploy.
- Benefit is indirect and unmeasured for this site; treat as an experiment and
  look at Bing Webmaster Tools after a few weeks.

---

## What *was* done instead (so the gap is smaller)

- `sitemap.xml` with real `<lastmod>` dates, reciprocal `hreflang` and `x-default`.
- `llms.txt`, `llms-full.txt` and a markdown twin for every content page.
- A per-crawler policy in `robots.txt` (`lib/seo/crawlers.ts`).
- `npm run seo:check`, which audits all of the above against a running server.

## Manual follow-ups (cannot be done from the repo)

- Run Google's **Rich Results Test** and the **Schema Markup Validator** on one
  page of each type (home, guide, glossary term, model, about/methodology,
  benchmarks once it has data, an AI Daily story).
- Verify the property in **Search Console** and **Bing Webmaster Tools**, submit
  `https://promptea.me/sitemap.xml` and watch the coverage reports.
- Decide the **training-bot policy** in `lib/seo/crawlers.ts`.
- Set `NEXT_PUBLIC_X_HANDLE` / `NEXT_PUBLIC_X_URL` so `sameAs` is emitted.
