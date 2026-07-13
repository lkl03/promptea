# Promptea

Analyze your prompt, detect issues, and generate an optimized version tailored to each AI (GPT, Claude, Gemini, Grok, Kimi, DeepSeek, Perplexity) and your goal (text, study, code, data/JSON, image, marketing, translation, summarization).

Bilingual (English / Spanish) with full feature parity.

## Latest update — v1.2.0 (2026-07-12)

Major release: full redesign (four themes on semantic tokens, self-hosted typography, AA contrast), an adaptive prompt-refinement engine with strategy routing and a strict quality gate, a source-verified model catalog, and a repo-wide architecture cleanup. Details in [CHANGELOG.md](./CHANGELOG.md).

## How it works

```text
User intent → prompt entry → analysis → adaptive refinement → explanation → copy/reuse → feedback
```

1. **Deterministic engine** (`lib/engine/`) — always runs, no network. Normalizes the input, classifies the real task (even when the selected purpose is imperfect), lints for risks (missing context, format, constraints, injection-like content), scores six dimensions, and builds an optimized prompt whose structure matches the request's complexity: short asks get a light natural rewrite, complex coding/agent/data tasks get full scaffolding.
2. **Adaptive refiner** (`lib/refine/`, optional) — when `GROQ_API_KEY` is set, the deterministic baseline is refined by an LLM using a strategy selected from the prompt itself (15 strategies: message polish, long-form writing, summarization, translation, tutoring, coding, debugging/review, agent/repo workflow, data/JSON schema, research, marketing, image generation, brainstorming, planning, general). The response must pass:
   - Zod schema validation (strict JSON contract),
   - a quality gate (protected literals preserved verbatim — URLs, paths, code spans, versions, amounts; language preserved; requested format retained; not answering the task; no leakage; bounded verbosity),
   - with one bounded repair attempt. Any failure (timeout, rate limit, invalid key, bad JSON, schema mismatch, unsafe output…) falls back to the deterministic result with a typed reason — the analyzer can never break because an external provider did.
3. Long inputs are budgeted deliberately: the beginning, requirement-looking lines, and the ending survive; elisions are marked. The most important part of a long prompt is never silently truncated.

## Tech

- Next.js (App Router) + React, Tailwind CSS v4
- Firebase Admin (Firestore) for telemetry + feedback (optional in dev)
- Vitest (`npm test`) — engine, refine pipeline, registry, i18n parity, version sync, API contracts
- Self-hosted fonts (Space Grotesk / Inter / JetBrains Mono via Fontsource, OFL) — no external font fetch at build or runtime

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
| `FIREBASE_SERVICE_ACCOUNT_BASE64` | prod only | Firestore telemetry/feedback (server-only). Without it, telemetry writes fail gracefully. |
| `FIREBASE_PROJECT_ID` | prod only | Firestore project id. |
| `GROQ_API_KEY` | optional | Enables the adaptive refiner. Never exposed to the client. |
| `GROQ_MODEL` | optional | Overrides the refiner model (default `llama-3.3-70b-versatile`). |
| `PROMPTEA_PROMPT_VERSION` | optional | Overrides the optimized-prompt header version (defaults to the app version). |
| `RESEND_API_KEY` / feedback vars | optional | Share-feedback email route. |
| `NEXT_PUBLIC_SITE_URL` | recommended | Canonical URLs for SEO. |
| `NEXT_PUBLIC_ENABLE_ADS`, `NEXT_PUBLIC_GOOGLE_ADS_*` | optional | Ad slots + conversion tracking. |
| `DEBUG_ANALYZE` | optional | Extra server logs for /api/analyze (operational metadata only — never prompt content). |

## Architecture map

- `lib/domain.ts` — single source of truth for languages, targets, purposes, task types, formats, refinement strategies, and fallback reasons. Zod schemas (`lib/validators.ts`) and UI options derive from it; drift is test-enforced.
- `lib/engine/` — deterministic analyzer (lint, features, scoring, builder, classifier).
- `lib/refine/` — adaptive pipeline (router, literals, language, budget, quality gate, Groq orchestrator, schema).
- `lib/models.ts` — verified model registry (see policy below).
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

Promptea optimizes prompts *for* these models; it does not execute them.

## Privacy & telemetry

Raw prompt text and attachment content never leave the analysis request: telemetry stores only operational metadata (score, task type, finding ids, counts) through a whitelist sanitizer (`lib/telemetry/sanitize.ts`, test-enforced). Server logs contain no prompt content. The optional refiner receives prompt text transiently to produce the rewrite and nothing is persisted there.
