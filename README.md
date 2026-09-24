# Promptea

A two-mode prompt utility:

- **Improve Prompt** (`/`) — analyze your prompt, detect issues, score it, and generate a genuinely personalized improved version tailored to each AI (GPT, Claude, Gemini, Grok, Kimi, DeepSeek, Perplexity) and your goal (text, study, code, data/JSON, image, marketing, translation, summarization).
- **Find the Best AI** (`/best-ai`) — paste a prompt and get a deterministic, explainable recommendation of which AI, model, or working environment (e.g. Claude Code vs. plain chat) fits it best, with ranked alternatives and concrete adaptation advice.

Bilingual (English / Spanish) with full feature parity. Voice dictation in both modes.

## Latest update — v1.6.0 (2026-09-24)

**Current models, model-specific prompts, finished image prompts, and a working Promptea Weekly sender.** The model registry was re-verified against every provider's first-party docs (Claude Opus 5.5 is the new Claude default; GPT-6 Astra/Sol/Luna, Gemini 3.8 Flash, Grok 4.7, DeepSeek Flash, and Perplexity's Agent API presets were added; superseded models stay as legacy). Optimized prompts now follow each selected model's official prompting guidance instead of a cosmetic tip. Image requests return a finished, paste-ready image prompt. Promptea Weekly has a signed, idempotent send endpoint and a Monday routine; live delivery still needs the setup below. Details in [CHANGELOG.md](./CHANGELOG.md).

_Previous update: v1.5.3 (2026-09-24) — Three new guides (research, conversational prompting, UX design) + models index social metadata._

## How it works

```text
Improve Prompt:   prompt entry → analysis → adaptive refinement → explanation → copy/reuse → feedback
Find the Best AI: prompt entry → signal extraction → deterministic scoring → recommendation → handoff to Improve
```

1. **Deterministic engine** (`lib/engine/`) — always runs, no network. Normalizes the input, classifies the real task (even when the selected purpose is imperfect), lints for risks (missing context, format, constraints, injection-like content), scores six dimensions, and builds an optimized prompt whose SHAPE matches the request (`lib/engine/shapes.ts`): short asks stay short and natural, repo/agent tasks get objective/steps/validation structure, data prompts get schema+rules, image requests get a finished, paste-ready image prompt written by `lib/engine/imagePrompt.ts` (explicit details kept verbatim, missing art direction resolved coherently for the medium) — no fixed template, no metadata header. Since v1.6.0 the shape is also **model-specific**: the selected model's prompting profile (`lib/engine/modelProfiles.ts`, one per documented guidance difference, each citing its first-party source) decides how short prompts handle missing details, how agent/repo work is specified, where attached context goes, and model-directed closing lines. Already-strong prompts are returned with minimal or no edits. Re-analysis is idempotent by core extraction, not by a header signature.
2. **Adaptive refiner** (`lib/refine/`, optional) — when `GROQ_API_KEY` is set, the deterministic baseline is refined by an LLM using a strategy selected from the prompt itself (15 strategies: message polish, long-form writing, summarization, translation, tutoring, coding, debugging/review, agent/repo workflow, data/JSON schema, research, marketing, image generation, brainstorming, planning, general) plus the target model's prompting rules. The response must pass:
   - Zod schema validation (strict JSON contract),
   - a quality gate (protected literals preserved verbatim — URLs, paths, code spans, versions, amounts; language preserved; requested format retained; not answering the task; no leakage; bounded verbosity; image prompts free of placeholders, "specify the mood" advice, keyword spam, and contradictions; no reasoning or re-check scaffolding added for Claude Opus 5.5 / Fable 5.1),
   - with one bounded repair attempt. Any failure (timeout, rate limit, invalid key, bad JSON, schema mismatch, unsafe output…) falls back to the deterministic result with a typed reason — the analyzer can never break because an external provider did.
3. Long inputs are budgeted deliberately: the beginning, requirement-looking lines, and the ending survive; elisions are marked. The most important part of a long prompt is never silently truncated.
4. **Deterministic matcher** (`lib/matcher/`, powers Find the Best AI) — a versioned rubric of independently testable signals accumulates weighted evidence per category (coding agent, research, long context, multimodal, strict data, creative, translation…); candidates from the verified model registry are scored against that evidence with hard capability gates; confidence and ties are explicit. The ranking is 100% deterministic application code — no LLM chooses or reorders results — and every reason cites a signal actually detected in the submitted prompt. `Claude Code`/`Codex`/`Gemini CLI` are recommended as *interaction environments* when repo signals warrant it, never conflated with chat models.
5. **Voice input** (`components/voice/`, `POST /api/transcribe`) — browser MediaRecorder → server-side Groq Whisper (`whisper-large-v3-turbo` by default, `GROQ_TRANSCRIPTION_MODEL` to override). Transcripts always pass through an editable review step; audio is never stored or logged.

## AI Daily

A bilingual editorial section — one story per day about what actually happened in AI — at `/[lang]/blog` (index) and `/[lang]/blog/[slug]` (article).

**Editions and cadence.** Three editions, fixed in `lib/domain.ts` (`BLOG_EDITIONS`): `daily` (the news story, any day), `weekly-recap` (Saturday — the week in review) and `week-ahead` (Sunday — what to watch). The weekly editions carry the range they cover (`coveredFrom`/`coveredTo`, computed by `recapWindow`/`weekAheadWindow`); the recap looks back over the preceding Sunday→Saturday, the look-ahead forward over Sunday→Saturday. Document ids and idempotency keys are keyed **per edition** (`editionDocId`, `editionIdempotencyKey`, prefixes in `EDITION_KEY_PREFIX`), not by date alone — so a Saturday can carry both the weekly recap and a breaking daily story without either overwriting the other, while a re-run of the *same* edition on the same date still resolves to the same document.

**Storage and serving.** Articles live in Firestore (collection `blog_posts`), one document per editorial day *and edition*, each carrying both locales. Pages read through `lib/blog/server.ts` (server-only) and are ISR-cached (`revalidate = 300`). Every read is wrapped so a Firestore outage degrades to an empty section instead of a broken route or a failed build.

**Editorial methodology.** Each run surveys the last 24 hours of AI news, ranks candidates by importance and reader relevance, and selects at most one. Categories and importance levels are fixed in `lib/domain.ts` (`BLOG_CATEGORIES`, `BLOG_IMPORTANCE`) — the routine classifies, it does not invent taxonomy. Both locales are written from the same verified facts; the Spanish version is not a machine translation of the English one. The byline is always `Promptea Editorial` — never a fabricated human name.

**Source verification.** A story needs at least one *primary* source: the company's own announcement, paper, filing, or official documentation. Secondary sources add context and are never the sole basis for a claim. Each source is stored with title, publisher, URL, type, primary flag, and access timestamp, and is rendered on the article. A single-source story is allowed only with an explicit `singleSourceJustification`, which is shown to the reader.

**Same-day freshness.** The *event* date is tracked separately from the publication timestamp precisely so it can be checked: `eventDate` must equal today in `America/Argentina/Buenos_Aires` (`EDITORIAL_TIMEZONE`, `lib/blog/dates.ts`), and the publish endpoint rejects anything else. If the publication timestamp were the only date, a delayed or re-run publication would silently pass yesterday's news off as today's. Nothing eligible means nothing is published — an empty day is a valid outcome, not a failure. A post-dated event is refused for every edition, always.

**Backdating (the one exception, and it is disclosed).** A `daily` story about an earlier event can be published, but only deliberately: the payload must set `allowBackdate` **and** carry a non-empty `backdateReason`, and the event may be at most `MAX_BACKDATE_DAYS` (14) days old — beyond that `checkFreshness` returns `backdate_too_old`. The reason, the event date and the publication date are all rendered on the article, so a late story is never passed off as same-day news. Weekly editions cannot be backdated at all: they are dated the day they run, so their event date must be exactly today. **The automated routine must never set `allowBackdate`** — it stays a same-day publisher, and the override exists for a human deciding, on the record, that a late-surfacing story is worth running.

**Index filtering.** `lib/blog/filters.ts` is pure and Firestore-free: `parseFilters` reads the query string, `applyFilters` runs full-text search over headline, deck and tags (accent- and case-insensitive) plus company, edition, category and event-date-range filters and newest/oldest sorting, and `collectCompanies`/`collectCategories`/`paginate` build the facets and pages. The index renders it as a plain `GET` form on purpose: filter state lives entirely in the URL, so every filtered view is shareable, bookmarkable and crawlable, back/forward behaves, and the whole thing works with JavaScript disabled — none of which holds for client-side state. The trade-off is duplicate-content risk, so a request carrying any filter parameter is served `noindex, follow` with its canonical pointing at the clean index; the clean index and every article stay fully indexable.

**The automated routine.** A scheduled Claude Code routine researches, verifies, writes both locales, and `POST`s the payload to `/api/internal/blog/publish`. The request is signed with HMAC-SHA256 over the raw body together with a timestamp and a nonce; the server rejects signatures outside a ±5-minute window, replayed nonces, and oversized payloads. The Firestore document id is derived from the editorial date and edition, and creation runs in a transaction, so a retried run reports `ALREADY_PUBLISHED` instead of creating a duplicate. Every execution writes one typed outcome to `blog_runs`.

**Why the routine has no Firebase credentials.** It holds only `BLOG_PUBLISH_SECRET`, which can do exactly one thing: submit a publish payload the server validates. A leaked publish secret cannot read telemetry or app feedback, cannot delete anything, and cannot touch any other collection. `FIREBASE_SERVICE_ACCOUNT_BASE64` stays on the server only.

**Manual publish and corrections.** If the routine fails, an administrator can publish by hand: build the same payload and send a signed request (any short script that computes the HMAC with `BLOG_PUBLISH_SECRET` works — the signed endpoint is deliberately the only write path). To fix a published article, issue a correction rather than editing silently: the post moves to `corrected` and carries a `{ note, correctedAt }` block rendered on the page. To pull an article, set its status to `archived` — it leaves the index, the sitemap, and the feeds, and its URL stops resolving.

**Run outcomes** (recorded in `blog_runs`):

| Outcome | Meaning | Action |
| --- | --- | --- |
| `PUBLISHED` | Today's article was created. | None. |
| `ALREADY_PUBLISHED` | Today's article already existed; this run was a retry or duplicate. | None — the idempotency guard working as designed. |
| `NO_ELIGIBLE_STORY` | Nothing cleared the same-day and importance bar. | None. A quiet day is expected. |
| `RESEARCH_FAILED` | The research step could not gather usable candidates. | Check the routine's network and tool access, then re-run. |
| `VERIFICATION_FAILED` | A candidate was found but its sources or event date did not hold up. | Correct behaviour — inspect the run log. Publish manually only if you can verify the story yourself. |
| `PUBLICATION_FAILED` | The payload was rejected or the write failed (bad signature, clock skew, oversized payload, Firestore error). | Check that `BLOG_PUBLISH_SECRET` matches on both sides, that the routine host's clock is within ±5 minutes, and that Firestore is reachable; then re-run — retries are safe. |

## Promptea Weekly (newsletter)

A weekly email digest of AI Daily, previewed at `/[lang]/weekly`. It never researches or claims anything new: every story is a published AI Daily article, ranked by importance and date (`lib/newsletter/compose.ts`).

**Week and edition.** An edition is sent on a Monday (editorial timezone) and covers the preceding Sunday→Saturday. Its id is `promptea-weekly_<Monday>` (`lib/newsletter/dates.ts`), so every run in the same week resolves to the same edition; once stored, the edition's content never changes between retries. A week with no eligible story produces no edition and no email.

**Run endpoint.** `POST /api/internal/newsletter/run`, HMAC-SHA256-signed exactly like the AI Daily publish endpoint (`x-promptea-timestamp`, `x-promptea-nonce`, `x-promptea-signature` over `${timestamp}.${nonce}.${rawBody}`, ±5 min window, nonce replay rejected) with `NEWSLETTER_SEND_SECRET`. Body: `{"mode":"dry_run"|"test"|"live"}` (`"date":"YYYY-MM-DD"` previews another week in `dry_run`/`test`). The caller holds only that secret; Firebase and Resend credentials stay on the server.

| Mode | What it does | Needs |
| --- | --- | --- |
| `dry_run` | Builds and validates the edition, counts active subscribers per language. Stores nothing, sends nothing. | — |
| `test` | Sends a `[TEST]` copy (alternating ES/EN) to `NEWSLETTER_TEST_RECIPIENTS` only. Stores nothing. | `RESEND_API_KEY`, valid sender, test recipients |
| `live` | Stores the edition (visible on `/weekly`), sends a canary copy to the test recipients, then every active subscriber in their language. | all of the above **and** `NEWSLETTER_DELIVERY_ENABLED=true` |

**Idempotency.** Each recipient is claimed in `newsletter_deliveries/{editionId}__{subscriberId}` inside a Firestore transaction before the send, and the Resend call carries the same key as its idempotency key (Resend de-duplicates for 24 h). A retry skips everyone already sent, re-tries transient failures, never retries permanent refusals, and never re-sends a claim older than the idempotency window. Sending is time-budgeted (45 s per call); a large list finishes over several calls (`PARTIAL` → call again).

**Outcomes** (returned and recorded in `newsletter_runs`, counts only — never an address): `DRY_RUN_OK`, `TEST_SENT`, `SENT`, `PARTIAL`, `ALREADY_SENT`, `NO_CONTENT`, `NO_SUBSCRIBERS`, `DELIVERY_DISABLED`, `CONFIG_ERROR`, `CANARY_FAILED`, `INVALID_EDITION`, `STORAGE_ERROR`. Configuration problems are reported before anything is sent — never a partial send.

**Unsubscribe.** Every email carries a per-subscriber link and `List-Unsubscribe` + `List-Unsubscribe-Post: List-Unsubscribe=One-Click` headers. `GET /api/newsletter/unsubscribe?token=…` shows a confirmation page in the subscriber's language; `POST` to the same URL is the RFC 8058 one-click endpoint mail clients call.

**The routine.** Claude Code cloud routine "Promptea Weekly newsletter", cron `0 12 * * 1` (Mondays 12:00 UTC = 09:00 America/Argentina/Buenos_Aires; Argentina has no DST). It signs a `dry_run`, then `live` (repeating while `PARTIAL` makes progress), and reports the outcome. It holds only `NEWSLETTER_SEND_SECRET`; to change the time, edit the cron at https://claude.ai/code/routines.

**Setup, testing, go-live, and kill switch**
1. Vercel → Production: `NEWSLETTER_SEND_SECRET` (set), `RESEND_API_KEY` (set), `NEWSLETTER_FROM_ADDRESS` (set; must be on the Resend-verified `promptea.me` domain), **`NEWSLETTER_TEST_RECIPIENTS` (add: your own inbox)**, `NEWSLETTER_DELIVERY_ENABLED` (keep `false` until step 3). Redeploy after changing env vars.
2. Test without mailing subscribers: sign a `{"mode":"dry_run"}` call, then `{"mode":"test"}` — only the test recipients receive a `[TEST]` copy. Check both languages, links, and the unsubscribe footer.
3. Go live: set `NEWSLETTER_DELIVERY_ENABLED=true` and redeploy. The next Monday run sends; confirm with the routine's report (`STATUS: SENT`), the latest `newsletter_runs` document, and the Resend dashboard.
4. Kill switch: set `NEWSLETTER_DELIVERY_ENABLED=false` (and redeploy) — live runs return `DELIVERY_DISABLED` before sending anything. To stop the schedule itself, disable the routine at https://claude.ai/code/routines. Removing `NEWSLETTER_SEND_SECRET` makes the endpoint refuse every call (503).

## Tech

- Next.js (App Router) + React, Tailwind CSS v4
- Firebase Admin (Firestore) for telemetry + app feedback (optional in dev)
- Vitest (`npm test`) — engine, refine pipeline, matcher, registry, i18n parity, version sync, API contracts
- Themes: **Aqua** (light, macOS Liquid Glass) and **Metro** (dark, Windows 8 Metro) on a semantic token system, plus **Old version** (the pre-1.3 look). System preference maps to Aqua/Metro; legacy stored themes migrate automatically.
- Self-hosted fonts (Space Grotesk / Inter used by the Old version theme; JetBrains Mono for prompt blocks everywhere) — Aqua/Metro use their native system font stacks

## Local setup

```bash
npm ci
npm run dev        # http://localhost:3000
npm run lint       # eslint (clean)
npm run typecheck  # tsc --noEmit
npm test           # vitest
npm run build      # production build (works offline — fonts are local)
```

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `FIREBASE_SERVICE_ACCOUNT_BASE64` | prod only | Firestore telemetry/app feedback **and AI Daily articles** (server-only). Without it, writes fail gracefully and the blog renders empty. |
| `FIREBASE_PROJECT_ID` | prod only | Firestore project id. |
| `BLOG_PUBLISH_SECRET` | required to publish AI Daily | Shared secret for HMAC-SHA256 signing of `POST /api/internal/blog/publish`. Use ≥32 random characters. Set it in Vercel **and** in the publishing routine's configuration — the two must match. Never commit it. Reading the blog does not need it; without it, publishing is simply disabled. |
| `GROQ_API_KEY` | optional | Enables the adaptive refiner AND voice transcription. Never exposed to the client. |
| `GROQ_MODEL` | optional | Overrides the refiner model (default `llama-3.3-70b-versatile`). |
| `GROQ_TRANSCRIPTION_MODEL` | optional | Overrides the speech-to-text model (default `whisper-large-v3-turbo`). |
| `NEXT_PUBLIC_SITE_URL` | recommended | Canonical URLs for SEO. |
| `NEXT_PUBLIC_ENABLE_ADS`, `NEXT_PUBLIC_GOOGLE_ADS_*` | optional | Ad slots + conversion tracking. |
| `DEBUG_ANALYZE` | optional | Extra server logs for /api/analyze (operational metadata only — never prompt content). |
| `NEWSLETTER_DELIVERY_ENABLED` | optional | Set to `true` to allow LIVE Promptea Weekly sends. Default `false` (live runs return `DELIVERY_DISABLED`). `promptea.me` is verified in Resend. |
| `NEWSLETTER_SEND_SECRET` | for the weekly run | HMAC key shared with the weekly routine (≥32 random chars). Without it `POST /api/internal/newsletter/run` returns 503. Never commit it. |
| `NEWSLETTER_TEST_RECIPIENTS` | for test/live sends | Comma-separated addresses (max 5) that receive `test` sends and the canary copy of every live send. Live delivery refuses to start without at least one. |
| `RESEND_API_KEY` | for newsletter delivery | Resend API key. Needed for `test` and `live` runs. |
| `NEWSLETTER_FROM_ADDRESS` | optional | Sender address for the newsletter (default `Promptea Weekly <weekly@promptea.me>`). |

AI Daily reuses the existing `FIREBASE_SERVICE_ACCOUNT_BASE64` and `FIREBASE_PROJECT_ID`, and `NEXT_PUBLIC_SITE_URL` for canonical, `hreflang`, sitemap, and feed URLs. `BLOG_PUBLISH_SECRET` is the only required variable for AI Daily publishing. Newsletter subscriptions are stored in Firestore using the same Firebase configuration.

## Architecture map

- `lib/domain.ts` — single source of truth for languages, targets, purposes, task types, formats, refinement strategies, and fallback reasons. Zod schemas (`lib/validators.ts`) and UI options derive from it; drift is test-enforced.
- `lib/engine/` — deterministic analyzer (lint, features, scoring, builder, classifier).
- `lib/refine/` — adaptive pipeline (router, literals, language, budget, quality gate, Groq orchestrator, schema).
- `lib/models.ts` — verified model registry (see policy below).
- `lib/engine/modelProfiles.ts` — per-model prompting profiles (deterministic shaping switches + adaptive-refiner rules), each citing its first-party guide.
- `lib/engine/imagePrompt.ts` — deterministic image-prompt composer and the image quality checks shared with the adaptive gate.
- `lib/newsletter/` — Promptea Weekly: `dates.ts` (covered week), `compose.ts` (edition from AI Daily), `render.ts` (HTML/text email), `config.ts` (delivery gates), `run.ts` (dry_run/test/live orchestration), `email.ts` (Resend mailer), `server.ts` (Firestore store, ledger, subscribers); `app/api/internal/newsletter/run/` is the signed endpoint.
- `lib/blog/` — AI Daily module: `types.ts` (Zod schemas for posts, blocks, sources, publish payload), `dates.ts` (editorial timezone, freshness guard, idempotency key and document id), `render.ts` (inline markup parsing, plain-text, word count, reading time, XML escaping), `filters.ts` (pure search/filter/sort/paginate over article cards, plus facet collection), `server.ts` (server-only Firestore access: list, fetch by slug, publish, correct, run log).
- `app/[lang]/blog/` — AI Daily index and article pages (server-rendered, ISR-cached, degrade to empty when Firestore is unavailable); `app/api/internal/blog/publish/` — the HMAC-signed publish endpoint.
- `components/analyzer/`, `components/results/` — decomposed feature modules; `PromptBox`/`ResultsPanel` orchestrate.
- `app/globals.css` + `lib/themes.ts` — theme tokens (Day / Dusk / Night / Paper) and registry.
- `app/[lang]/dictionaries/` — EN/ES copy (key parity is test-enforced).

## Theme architecture

Semantic CSS custom properties per theme (`--canvas`, `--surface`, `--line`, `--ink`, `--accent`, state colors) mapped into Tailwind utilities (`bg-canvas`, `text-ink-muted`, `border-line`…). Components never reference theme names or raw palette values — adding a theme is one token block in `globals.css` plus one entry in `lib/themes.ts`. `next-themes` stamps both a class and `data-theme` on `<html>`; `dark` and `night` are dark-based (Tailwind's `dark:` variant matches both). System preference is respected and the choice persists.

## Model registry maintenance policy

1. Verify model ids **only** against official provider documentation (each entry stores `sourceUrl` + `verifiedAt`).
2. Never add a model from a blog post, social post, or memory.
3. When a model is superseded: set `status` (`legacy`/`deprecated`) + `replacementId` — don't delete (old links/telemetry keep resolving).
4. Exactly one `defaultForTarget` per target; only `stable`/`preview` entries are selectable. All of this is enforced by `lib/__tests__/models.registry.test.ts`.
5. Every selectable entry names a `promptProfile`; a new profile is added only when a provider documents a real prompting difference (`lib/__tests__/model.profiles.test.ts` keeps the guidance from drifting).

Promptea optimizes prompts *for* these models; it does not execute them.

## Privacy & telemetry

Raw prompt text and attachment content never leave the analysis request: telemetry stores only operational metadata (score, task type, finding ids, counts) through a whitelist sanitizer (`lib/telemetry/sanitize.ts`, test-enforced). Server logs contain no prompt content. The optional refiner receives prompt text transiently to produce the rewrite and nothing is persisted there.
