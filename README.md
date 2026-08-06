# Promptea

A two-mode prompt utility:

- **Improve Prompt** (`/`) — analyze your prompt, detect issues, score it, and generate a genuinely personalized improved version tailored to each AI (GPT, Claude, Gemini, Grok, Kimi, DeepSeek, Perplexity) and your goal (text, study, code, data/JSON, image, marketing, translation, summarization).
- **Find the Best AI** (`/best-ai`) — paste a prompt and get a deterministic, explainable recommendation of which AI, model, or working environment (e.g. Claude Code vs. plain chat) fits it best, with ranked alternatives and concrete adaptation advice.

Bilingual (English / Spanish) with full feature parity. Voice dictation in both modes.

## Latest update — v1.3.2 (2026-08-06)

Three new SEO guides: [Prompts for Kimi](/en/guides/kimi-prompt-guide) (long context, document analysis, multi-source research), [AI prompts for data analysis](/en/guides/data-analysis-prompts) (SQL generation, trend interpretation), and [AI prompts for learning](/en/guides/ai-prompts-for-learning) (calibrated tutoring, study plans). Also fixed a sitemap gap — `/best-ai`, `/prompts/code`, `/prompts/image`, and `/prompts/marketing` were missing from `sitemap.xml`. Changes are in the [weekly update PR](./CHANGELOG.md).

_Previous update: v1.3.1 (2026-08-04) — changelog page catch-up, voice recorder idle hint, and "New? See how it works →" on Find the Best AI._

## How it works

```text
Improve Prompt:   prompt entry → analysis → adaptive refinement → explanation → copy/reuse → feedback
Find the Best AI: prompt entry → signal extraction → deterministic scoring → recommendation → handoff to Improve
```

1. **Deterministic engine** (`lib/engine/`) — always runs, no network. Normalizes the input, classifies the real task (even when the selected purpose is imperfect), lints for risks (missing context, format, constraints, injection-like content), scores six dimensions, and builds an optimized prompt whose SHAPE matches the request (`lib/engine/shapes.ts`): short asks stay short and natural, repo/agent tasks get objective/steps/validation structure, data prompts get schema+rules, image prompts get visual attributes — no fixed template, no metadata header. Already-strong prompts are returned with minimal or no edits. Re-analysis is idempotent by core extraction, not by a header signature.
2. **Adaptive refiner** (`lib/refine/`, optional) — when `GROQ_API_KEY` is set, the deterministic baseline is refined by an LLM using a strategy selected from the prompt itself (15 strategies: message polish, long-form writing, summarization, translation, tutoring, coding, debugging/review, agent/repo workflow, data/JSON schema, research, marketing, image generation, brainstorming, planning, general). The response must pass:
   - Zod schema validation (strict JSON contract),
   - a quality gate (protected literals preserved verbatim — URLs, paths, code spans, versions, amounts; language preserved; requested format retained; not answering the task; no leakage; bounded verbosity),
   - with one bounded repair attempt. Any failure (timeout, rate limit, invalid key, bad JSON, schema mismatch, unsafe output…) falls back to the deterministic result with a typed reason — the analyzer can never break because an external provider did.
3. Long inputs are budgeted deliberately: the beginning, requirement-looking lines, and the ending survive; elisions are marked. The most important part of a long prompt is never silently truncated.
4. **Deterministic matcher** (`lib/matcher/`, powers Find the Best AI) — a versioned rubric of independently testable signals accumulates weighted evidence per category (coding agent, research, long context, multimodal, strict data, creative, translation…); candidates from the verified model registry are scored against that evidence with hard capability gates; confidence and ties are explicit. The ranking is 100% deterministic application code — no LLM chooses or reorders results — and every reason cites a signal actually detected in the submitted prompt. `Claude Code`/`Codex`/`Gemini CLI` are recommended as *interaction environments* when repo signals warrant it, never conflated with chat models.
5. **Voice input** (`components/voice/`, `POST /api/transcribe`) — browser MediaRecorder → server-side Groq Whisper (`whisper-large-v3-turbo` by default, `GROQ_TRANSCRIPTION_MODEL` to override). Transcripts always pass through an editable review step; audio is never stored or logged.

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
| `FIREBASE_SERVICE_ACCOUNT_BASE64` | prod only | Firestore telemetry/app feedback (server-only). Without it, writes fail gracefully. |
| `FIREBASE_PROJECT_ID` | prod only | Firestore project id. |
| `GROQ_API_KEY` | optional | Enables the adaptive refiner AND voice transcription. Never exposed to the client. |
| `GROQ_MODEL` | optional | Overrides the refiner model (default `llama-3.3-70b-versatile`). |
| `GROQ_TRANSCRIPTION_MODEL` | optional | Overrides the speech-to-text model (default `whisper-large-v3-turbo`). |
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
