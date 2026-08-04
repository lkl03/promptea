# Changelog

All notable changes to Promptea are documented here.

---

## v1.3.1 — 2026-08-04

Post-release polish for v1.3.0: the public changelog page catches up, and the two features new users hit first (voice dictation and the Best-AI mode) explain themselves better.

### Added
- **Changelog page catch-up** (`/[lang]/changelog`): the page had stopped at v1.2.0 — it now documents v1.2.1, v1.2.2, v1.2.3, v1.3.0, and this release, fully bilingual (EN/ES) and consistent with `CHANGELOG.md`.
- **Voice recorder explainer**: an idle-state hint next to the mic button ("Prefer talking? Dictate your prompt with the mic…" / "¿Preferís hablar? Dictá tu prompt con el micrófono…") so the feature is self-describing in both modes. New `voice.hint` dictionary key (EN/ES parity test-enforced).
- **"New? See how it works →" on Find the Best AI**: the help modal now also exists on `/[lang]/best-ai` with mode-specific steps — paste/dictate, signal detection, deterministic comparison, recommendation with confidence/ties, and the one-click handoff to Improve Prompt. `HowItWorks` gained a `mode` prop ("improve" | "best-ai") with per-mode bilingual copy.

### Improved
- Analyzer help modal copy: step 2 now mentions voice dictation, and the intro's step count is correct ("Five quick steps" — it said three while listing five).

### Changed
- Version bumped to `v1.3.1` (`package.json`, `package-lock.json`, `lib/version.ts`).

---

## v1.3.0 — 2026-08-04

Major release: Promptea becomes a two-mode prompt utility — **Improve Prompt** (the evolved analyzer) and **Find the Best AI** (a new deterministic AI/model matcher) — with voice input in both modes, a fully personalized shape-preserving refinement engine (no more fixed `PROMPTEA:` template), a complete visual redesign around the **Aqua** (light) and **Metro** (dark) themes plus an **Old version** theme for users who prefer the previous look, and general app feedback stored in Firestore instead of opening an email client.

### Added
- **Find the Best AI mode** (`/[lang]/best-ai`) — paste a prompt and get a deterministic, explainable recommendation of which AI fits it best. Route-addressable (refresh, deep links, back/forward, and locale switches preserve the mode), with a prominent keyboard-accessible mode switcher shared by both experiences.
- **Deterministic matcher engine** (`lib/matcher/`) — versioned rubric (`RUBRIC_VERSION`) of 24 independently testable signals (repo paths, shell commands, git workflow, citations, recency, strict JSON, multimodal references, creative writing, translation…) feeding weighted evidence into 15 match categories; scoring against verified per-model capability data with hard capability gates (e.g. models without native search cannot win research prompts); high/medium/low confidence plus explicit tie handling with a deciding-factor explanation. Interaction profiles distinguish **Claude Code and other repo coding agents from plain chat** — an agent environment is never treated as just another model. An LLM never chooses or reorders the ranking; explanations are deterministic bilingual templates that cite the detected signals.
- **Matcher → optimizer handoff** — "Improve my prompt for this AI" transfers the full prompt with the recommended target, model, and detected purpose preselected via a sessionStorage contract (`promptea:handoff`) with a URL-prefill fallback; no copy-paste, no length limits.
- **Voice input in both modes** (`components/voice/`, `POST /api/transcribe`) — MediaRecorder capture with recording timer, cancel, 2-minute cap and automatic media-track cleanup; server-side transcription through Groq `whisper-large-v3-turbo` (override with `GROQ_TRANSCRIPTION_MODEL`); mime/size validation, typed bilingual errors for every failure class, and a mandatory review step — transcripts are editable and nothing is analyzed until the user decides. Audio is never stored or logged.
- **General app feedback → Firestore** (`POST /api/app-feedback`, collection `app_feedback`) — modal with optional category (bug/suggestion/design/result quality/other), Zod validation, client+server cooldowns, success/error states. Stores message, category, locale, page/mode, app version, theme, anonymous session hash, and coarse UA class — never the user's prompt, never an email address.
- **Model registry capability data** (`lib/models.ts`) — every selectable entry now carries verified `capabilities` (modalities, context window, latency class, structured-output/tool-use/native-search flags, reasoning tier, coding-agent fit, 15-category task-fit scores, per-model prompt guidance in ES+EN) and `interactionProfiles`; re-verified against official provider docs on 2026-08-03 (new entries incl. `claude-opus-5`, `gemini-3.6-flash`, `kimi-k3`; `gpt-o3` marked deprecated per OpenAI's shutdown schedule).
- **Privacy-safe operational telemetry** (`POST /api/telemetry/app` + match events in `/api/match`) — mode opened, matcher submitted/recommendation category, handoff, voice started/succeeded/failed by typed reason. No prompt content, no transcripts, no audio, ever.

### Changed
- **The optimized prompt no longer starts with the `PROMPTEA: vX / MODEL / PURPOSE / TASK_TYPE` header.** Version, model, purpose, strategy, and engine metadata are returned as structured result metadata and shown in the UI — never inserted into the text you copy. The JSON output format keeps `promptea_version` as machine-readable data.
- **Shape-preserving personalization** (`lib/engine/shapes.ts`) — each refinement strategy now produces its own output shape gated by complexity: short natural messages stay short (light path with a single guarded clarifier line), repo/agent tasks get objective/steps/validation structure, data prompts get schema+rules+output, image prompts get visual attributes, translations get preserve rules, and already-strong prompts are returned with minimal or no edits (`already_optimized`). Idempotency no longer depends on a header: re-analysis extracts the core from the shape's registered headings and rebuilds byte-identically; v1.2-era headers are stripped and migrated into the new shapes.
- **Adaptive refiner** rewritten around shape mirroring (format, formality, and voice of the original preserved; sections only when the task needs them) with the quality gate now rejecting metadata headers instead of requiring them. All existing protections remain: protected literals, language preservation, format retention, no task-answering, bounded growth, one bounded repair, typed fallback reasons.
- **Themes: Aqua, Metro, Old version.** Aqua (light) faithfully ports pro-all-in-one's macOS Liquid Glass system — layered radial wash, saturate(200%)+blur(32px) glass cards with inset hairlines, Apple accent palette, SF-stack typography. Metro (dark) ports the Windows 8 Metro system — flat `#1A1A1A` tiles, azure `#0078D7`, Segoe UI light type ramp, azure focus rectangles, and the universal no-radius/no-shadow rule. "Old version" (Versión anterior) preserves the previous Día/Atardecer look (system-preference aware) with the previous fonts, as a gift for users who prefer it. System preference maps to Aqua (light) / Metro (dark); legacy stored themes migrate automatically (`light`/`paper`→Aqua, `dark`/`night`→Metro) before first paint; the semantic token architecture is unchanged, and the last hardcoded palette classes were migrated to tokens.
- Footer/results copy updated for the header-free output; analyzer page gains the mode switcher; top navigation links both modes.

### Removed
- The `mailto:` general-feedback flow and the dead `/api/share-feedback` Resend route (unreferenced since v1.2.0 and non-functional in production — `RESEND_API_KEY` was never configured). Result-level helpfulness feedback (`/api/feedback`) is unchanged.
- The `PROMPTEA_PROMPT_VERSION` env override (it only versioned the removed header). The Day/Dusk/Night/Paper theme registry (replaced as described above; stored values migrate).

### Validated
- See the v1.3.0 PR description for the full validation matrix (lint, typecheck, tests, build, and the manual QA matrix across themes × modes × locales × viewports).

---

## v1.2.3 — 2026-07-30

Weekly update: three new SEO guides (zero-shot prompting, GPT prompt guide, and AI brainstorming prompts) and a copy localization fix — the "Templates" section heading on guide pages now correctly reads "Plantillas" in Spanish.

### Added
- **New guide: Zero-shot prompting** (`/guides/zero-shot-prompting`) — when zero-shot works vs. when to switch to few-shot, how to fix inconsistent zero-shot results without adding examples, and the constraints (format, length, edge-case rules) that make instruction-only prompts reliable. Templates: zero-shot task with format and constraints, and zero-shot classification with decision rules.
- **New guide: Prompts for GPT** (`/guides/gpt-prompt-guide`) — how to write prompts optimized for GPT and ChatGPT models, including labeled format templates, constraint block patterns, instruction placement for long documents, and self-verification requests. Templates: structured task with a labeled format template, and constrained data extraction.
- **New guide: AI brainstorming prompts** (`/guides/brainstorming-prompts`) — why AI brainstorming defaults to generic ideas, and the techniques that produce better output: banning obvious categories, forced diversity angles, cross-domain combinations, and separating generation from evaluation. Templates: divergent idea generation with forced diversity, and idea evaluation and filtering.

### Improved
- **Guide detail pages: "Templates" section heading now localized** (`app/[lang]/guides/[slug]/page.tsx`). The heading was hardcoded as "Templates" for both English and Spanish. It now reads "Plantillas" in Spanish — a small copy clarity fix consistent with the rest of the Spanish UI.
- **Guides index SEO description** updated to mention zero-shot prompting, GPT, and brainstorming alongside the existing catalog.

### Changed
- Version bumped to `v1.2.3`. `package.json`, `package-lock.json`, and `lib/version.ts` updated consistently. Optimized prompt header will carry `PROMPTEA: v1.2.3`.

### Validated
- `npm run lint` — clean (no output, no errors introduced by this update; pre-existing `ERR_MODULE_NOT_FOUND` only appears without `npm ci`)
- `npm test` — 159/159 tests pass across 16 test files; all 33 `dataset.calibration.test.ts` tests pass; version sync tests pass at v1.2.3
- `npm run typecheck` — clean (no output)
- `npm run build` — see PR description

---

## v1.2.2 — 2026-07-23

Weekly update: three SEO guides covering prompt chaining, AI writing prompts, and multimodal prompts; plus guide-page Open Graph and Twitter Card metadata.

### Added
- **New guide: Prompt chaining** (`/guides/prompt-chaining`) — how to decompose complex tasks into sequential AI steps. Covers the three core chaining patterns (sequential, branching, looping), when chaining is worth the overhead, and common failure modes including unvalidated intermediate outputs and missing stop conditions. Templates: data extraction pipeline (extract → validate → format) and a research-to-report chain.
- **New guide: AI writing prompts** (`/guides/ai-writing-prompts`) — writing prompts that produce structured, on-brand content for blogs, emails, and creative pieces. Covers the five elements a writing prompt needs beyond the topic (audience, tone, format, length, avoidance list), tone and voice control techniques, and common writing prompt mistakes. Templates: blog post outline with audience and tone, and a professional email from bullet notes.
- **New guide: Multimodal prompts** (`/guides/multimodal-prompts`) — how to write prompts when the input includes images, screenshots, or PDFs. Covers what multimodal models can and cannot do reliably, how to direct AI attention with spatial anchors and context descriptions, and common mistakes like missing output format constraints. Templates: visual data extraction to JSON, and document Q&A with source citation.

### Improved
- **Guide detail pages now emit page-specific Open Graph and Twitter Card metadata** (`app/[lang]/guides/[slug]/page.tsx`). Previously, guide detail pages set only `title`, `description`, and `canonical` — the `openGraph` and `twitter` blocks were inherited from the root layout, meaning social sharing previews showed the generic Promptea title and description instead of the guide's own. Each guide detail page now explicitly sets `openGraph.title`, `openGraph.description`, `openGraph.type: "article"`, `openGraph.locale`, `twitter.card`, `twitter.title`, and `twitter.description`. This improves click-through rates from social shares.
- **Guides index SEO description** updated to mention prompt chaining, AI writing prompts, and multimodal prompts alongside the existing catalog.

### Changed
- Version bumped to `v1.2.2`. `package.json`, `package-lock.json`, and `lib/version.ts` updated consistently. Optimized prompt header will carry `PROMPTEA: v1.2.2`.

### Validated
- `npm run lint` — pre-existing errors in other files (none introduced by this update)
- `npm test` — header invariant tests auto-resolve to v1.2.2 via `APP_VERSION`; 14 `dataset.calibration.test.ts` score-range failures are pre-existing (confirmed on base branch)
- `npm run typecheck` — see PR description
- `npm run build` — see PR description

---

## v1.2.1 — 2026-07-16

Weekly update: three SEO guides and a structured-data improvement.

### Added
- **New guide: System prompts** (`/guides/system-prompts`) — how to write persistent instructions for ChatGPT, Claude, and Gemini that shape every response without repeating yourself. Covers persona, scope, format defaults, escalation rules, and common mistakes. Templates: customer support assistant system prompt and writing assistant with style constraints.
- **New guide: AI translation prompts** (`/guides/translation-prompts`) — templates for translating content with AI that preserve meaning, tone, and register. Covers register guidance, domain glossaries, format preservation, and length drift prevention. Templates: document translation with register and glossary, and UI strings batch translation.
- **New guide: Image generation prompts** (`/guides/image-generation-prompts`) — how to write image prompts for DALL-E, Gemini Imagen, and similar models with consistent, intentional results. Covers subject, style, composition, lighting, color palette, and negative constraints. Templates: photorealistic product image and illustrated explainer diagram.

### Improved
- **BreadcrumbList JSON-LD on guide pages**: each guide detail page (`/[lang]/guides/[slug]`) now emits a `BreadcrumbList` structured data block alongside the existing `FAQPage` block. This enables breadcrumb paths in Google search result snippets, improving click-through rates and contextual visibility for guide pages.
- **Guides index SEO description** updated to mention system prompts, translation, and image generation guides alongside the existing catalog.

### Changed
- Version bumped to `v1.2.1`. `package.json`, `package-lock.json`, and `lib/version.ts` updated consistently. Optimized prompt header will carry `PROMPTEA: v1.2.1`.

### Validated
- `npm run lint` — pre-existing errors in other files (none introduced by this update)
- `npm test` — header invariant tests updated to v1.2.1 and pass; 14 `dataset.calibration.test.ts` score-range failures are pre-existing (confirmed on base branch)
- `npm run typecheck` — see PR description
- `npm run build` — see PR description

---

## v1.2.0 — 2026-07-12

Major product-quality release: full redesign, adaptive prompt-refinement engine, and a verified model catalog.

### Added
- **Adaptive refinement pipeline** (`lib/refine/`): strategy router (15 strategies — from `message_polish` to `agent_workflow` and `data_schema`), complexity classifier, protected-literal extraction, es/en language detection, deliberate input budgeting for long prompts (head + explicit requirements + tail are preserved; never blind truncation), Zod-validated LLM contract, post-generation quality gate, one bounded repair attempt, and typed fallback reasons for every external failure class.
- **Theme system** with four themes — Day, Dusk, Night, Paper — built on semantic CSS tokens (`canvas/surface/line/ink/accent/state`) adapted from an internal reference architecture. System preference respected; selection persists; no hydration flash; WCAG AA contrast verified per theme.
- **Improved/Original comparison** on the result panel, plus a concise "What changed" summary with key improvements, assumptions, and follow-up questions when the adaptive engine ran.
- **Verified model registry**: every entry carries `status` (stable/preview/legacy/deprecated), `verifiedAt` (2026-07-12), `sourceUrl` (official provider docs), `apiModelId`, `replacementId`, and a single explicit default per target. New: GPT-5.6 (Sol/Terra/Luna), Claude Sonnet 5 + Haiku 4.5, Gemini 3.1 Pro + 3.1 Flash-Lite, Grok 4.5, Kimi K2.6, Sonar + Sonar Deep Research.
- **Golden evaluation dataset** (17 EN/ES cases) asserting structural invariants: strategy routing, protected-literal & language preservation, non-bloat growth caps, idempotency.
- Version-consistency and EN/ES dictionary-parity test suites; `npm run typecheck` script.

### Changed
- **Full redesign**: self-hosted typography (Space Grotesk / Inter / JetBrains Mono — no Google Fonts fetch at build), calm theme-aware ambient background (the neon orbs are gone), semantic-token component primitives, monospace prompt blocks, staggered result reveal, and meaningful processing states instead of a static spinner.
- **Simple prompts no longer receive the full GOAL/OUTPUT/CONSTRAINTS scaffold** — the deterministic builder is complexity-aware and keeps short requests natural (header + guidance + task).
- The engine detects the real task even under the default "text" purpose (a JSON-extraction or debugging prompt typed as "text" is scored and structured as what it is).
- `PromptBox` and `ResultsPanel` decomposed into focused feature modules (`components/analyzer/*`, `components/results/*`); analyze requests are supersede-safe (in-flight fetch aborted on reset/resubmit) and prompt text survives recoverable errors.
- Legacy model aliases (GPT-4o, Claude Sonnet/Opus/Haiku generics, Gemini Pro/Flash generics, Grok legacy, `deepseek-chat`, `kimi`, Llama 3 70B) are retained but no longer selectable; DeepSeek deprecates `deepseek-chat` on 2026-07-24.

### Fixed
- **Scoring under-rated well-formed prompts** (14 calibration cases failing since v1.1.x): the extractor stripped OUTPUT FORMAT/CONSTRAINTS sections before feature detection, `texto:`/`text:` input markers never matched due to a dead word-boundary after `:`, the classifier matched `go` inside "Goal:", and verifiability over-weighted conversational tasks. All 14 cases now pass without loosening the dataset.
- Five `*.spec.ts` test suites existed but were never executed (vitest include pattern); they now run, and the empty telemetry spec is a real sanitization suite.
- URL prefill silently dropped `translation`/`summarization` purposes; Perplexity was missing from the SEO prefill target type.

### Accessibility
- Full keyboard navigation with a single consistent focus treatment; menus close on Escape and restore focus; screen-reader announcements for analysis completion and copy confirmation; `prefers-reduced-motion` drops movement while keeping opacity cues; AA contrast validated across all four themes.

### Performance
- No backdrop blur on nested soft surfaces (the single most expensive compositing cost); GPU-only animations (transform/opacity); fonts subset and self-hosted (~172 KB total).

### Developer experience
- Single domain module (`lib/domain.ts`) for languages, targets, purposes, task types, formats, strategies, and fallback reasons — Zod schemas and UI options derive from it. Lint is now clean repo-wide (was 78 errors). API routes fully typed.

### Migration / environment notes
- No new required environment variables. `GROQ_API_KEY` (optional) enables the adaptive refiner; without it Promptea uses the deterministic engine, now clearly indicated in the UI. `GROQ_MODEL` still overrides the refiner model.

---

## v1.1.6 — 2026-07-09

### Added
- New guide: **Prompts for DeepSeek** (`/guides/deepseek-prompt-guide`) — how to get precise output for code tasks with strict constraints, JSON extraction with schema adherence, and multi-step analytical reasoning. Templates: code task with constraints and analytical reasoning with explicit steps.
- New guide: **Few-shot prompting** (`/guides/few-shot-prompting`) — when examples outperform verbal instructions, how to format input/output pairs effectively, diversity requirements, and delimiter conventions. Templates: text classification with examples and style rewriting with examples.
- New guide: **Prompt quality scoring** (`/guides/prompt-quality-scoring`) — five-dimension self-evaluation framework (goal clarity, context completeness, output format, constraint coverage, edge case handling), common patterns that lower scores. Templates: self-review checklist prompt and rapid prompt debug.

### Improved
- **Changelog page SEO metadata**: added `generateMetadata` export to `app/[lang]/changelog/page.tsx` — the page now has its own localized title ("Changelog" / "Historial de versiones"), description, and canonical URL instead of inheriting the generic app title. Minor but improves discoverability in search.
- **Guides index page SEO description** updated to mention DeepSeek, few-shot prompting, and prompt scoring alongside the existing catalog entries.
- Optimized prompt header updated to `PROMPTEA: v1.1.6`.

### Validated
- `npm run lint` — pre-existing errors in other files (none introduced by this update)
- `npm test` — header invariant tests updated to v1.1.6 and pass; 14 `dataset.calibration.test.ts` score-range failures are pre-existing (confirmed on base branch)
- `npm run build` — see PR description

---

## v1.1.5 — 2026-07-02

### Added
- New guide: **Prompts for Gemini** (`/guides/gemini-prompt-guide`) — format control with visible output templates, grounded Q&A (source-only answers), and how to prevent verbosity. Two ready-to-use templates: structured analysis with format template, and grounded Q&A.
- New guide: **Prompts for Grok** (`/guides/grok-prompt-guide`) — how to get direct, high-signal responses, using real-time context awareness, and quick structured comparisons. Two templates: direct opinion with trade-offs, and structured comparison.
- New guide: **AI prompt templates for business** (`/guides/ai-prompt-templates-for-business`) — ready-to-use templates for project status reports and decision memos with criteria, covering audience framing, format constraints, and tone guidance for business workflows.

### Improved
- **Guides index page SEO description** updated to reflect the full current guide catalog — now mentions ChatGPT, Claude, Gemini, Grok, role prompting, and business workflows (previously listed only 3 categories from the initial release).
- Optimized prompt header updated to `PROMPTEA: v1.1.5`.

### Validated
- `npm run lint` — pre-existing errors in other files (none introduced by this update)
- `npm test` — header invariant tests updated to v1.1.5 and pass; 14 `dataset.calibration.test.ts` score-range failures are pre-existing (confirmed on base branch)
- `npm run build` — see PR description

---

## v1.1.4 — 2026-06-24

### Added
- New guide: **Role prompting** (`/guides/role-prompting`) — how to assign expert personas for better AI outputs. Covers when roles help, how to structure them, and includes two templates: a domain expert advisor and a rigorous peer reviewer.
- New guide: **ChatGPT prompts for work** (`/guides/chatgpt-prompts-for-work`) — reusable templates for professional email drafts and executive report summaries. Includes format constraints and tone guidance.
- New guide: **Prompts for Claude** (`/guides/claude-prompt-guide`) — how to take advantage of Claude's XML tag support, extended context window, and structured reasoning. Templates for document Q&A with citations and competing-viewpoints analysis.

### Fixed
- **Guides index page localization**: the "Start here" section heading was hardcoded in English for both locales; it now reads "Por dónde empezar" in Spanish.

### Improved
- Optimized prompt header updated to `PROMPTEA: v1.1.4`.

### Validated
- `npm run lint` — pre-existing errors in other files (none introduced by this update)
- `npm test` — 61/75 tests pass; 14 `dataset.calibration.test.ts` score-range failures are pre-existing (confirmed on base branch); header invariant tests updated to v1.1.4 and pass
- `npm run build` — see PR description

---

## v1.1.3 — 2026-06-17

### Added
- Updated model registry with the latest frontier models from OpenRouter:
  - **OpenAI**: GPT-5.5, GPT-5.5 Pro (added alongside existing GPT-4.1, GPT-4o, o3)
  - **Anthropic**: Claude Fable 5, Claude Opus 4.8 (added alongside existing Sonnet, Opus, Haiku)
  - **Google**: Gemini 3.5 Flash (added alongside existing Gemini Pro, Flash)
  - **xAI**: Grok 4.3, Grok Build 0.1 (added alongside existing Grok)
  - **DeepSeek**: DeepSeek V4 Pro, DeepSeek V4 Flash (added alongside existing DeepSeek Chat)
  - **Perplexity** *(new provider)*: Sonar Pro, Sonar Reasoning Pro — with full target support, engine hints, and UI grouping
- Added `openRouterId` field to `ModelEntry` for new models to make OpenRouter IDs explicit
- Added `"search"` strength tag for search-augmented models (Perplexity Sonar)
- Groq adaptive prompt layer: when `GROQ_API_KEY` is set server-side, the `/api/analyze` endpoint refines the deterministic optimized prompt using Groq LLM. The Promptea header (`PROMPTEA: v1.1.3 / MODEL / PURPOSE / TASK_TYPE`) is always preserved and repaired if Groq removes it. Falls back transparently to the deterministic prompt on any error, timeout, invalid JSON, or missing key — no user-facing crash.
- Optimized prompt header now uses `v1.1.3` (`PROMPTEA: v1.1.3`)
- New env variables: `GROQ_API_KEY` (server-only, enables adaptive layer) and optional `GROQ_MODEL` (override inference model, defaults to `llama-3.3-70b-versatile`)

### Fixed
- **"Probar este prompt" / "Try this prompt" locked-state bug**: the `promptea:set-prompt` event handler in `PromptBox` now uses a `lockedRef` to guard against stale closures. The handler silently ignores the event while a result is shown, analysis is pending, or files are being read — preventing `setResult(null)` from resetting state unexpectedly. `PromptOfTheDay` now also hides its CTA button while the analyzer is locked, via a new `promptea:locked-change` broadcast event from `PromptBox`.

### Improved
- Engine version bumped to reflect new prompt scaffold version (`PROMPTEA: v1.1.3`)
- Adaptive prompt metadata (`adaptiveEngine`, `adaptiveFallback`, `adaptiveReason`) included in analyze response for observability

### Validated
- `npm run lint` — passes
- `npm run build` — passes
- `npm test` — all existing tests pass; new tests added for model registry, header invariant, and Groq fallback behavior

---

## v1.1.2 — 2026-05-31

### Fixed
- Removed an internal SEO/developer note ("To speed up indexing") from the public Guides page; moved into a code comment.
- Improved modal and popover accessibility: all dialogs now trap Tab/Shift+Tab focus, return focus to the trigger on close, and Escape closes them reliably.
- Fixed unclear enabled/disabled visual states in the analyzer form — the Analyze button now shows clearly reduced opacity when incomplete and full contrast when ready.
- Improved selected prompt type contrast in both light and dark themes; active pill now uses a solid filled background with contrasting text.
- Improved footer accessibility: removed literal `|` pipe separators (now replaced with CSS gap), added a proper `<nav>` landmark, and fixed copyright to read naturally (© year · designed and developed by eterlab).

### Improved
- Added a persistent Promptea wordmark and top navigation header across all public pages, with links to Analyzer, Prompts, Guides, Models, and Glossary. Existing language and theme toggles preserved.
- Reordered the analyzer form flow so prompt type is selected before writing or attaching files (1. Choose AI → 2. Choose type → 3. Write prompt → 4. Attach files → 5. Choose format → 6. Analyze).
- Made "How this works" more discoverable: trigger is now a visible badge/pill with copy "New? See how it works →" / "¿Nuevo? Mirá cómo funciona →".
- Moved analysis helpfulness feedback (Yes/No) below the full result content — after score, issues, recommendations, and optimized prompt — so users have seen the result before rating it.
- Added a live word and approximate token counter near the textarea that updates as users type.
- Added a "Try an example →" helper button near the textarea that prefills a useful example prompt with compatible type and model, guarding against overwriting existing text.
- Preserved analyzer form state (prompt, type, model, format) across language switches using sessionStorage.
- Added prompt count badges (e.g. "6 prompts") to prompt pack category cards.
- Added an "Open Analyzer →" / "Abrir analizador →" CTA near the breadcrumb on all prompt pack subpages.
- Improved optimized prompt output: added an explanatory note about header lines, increased max height, and added a temporary "Copied!" / "¡Copiado!" confirmation with checkmark icon on the copy button.
- Added qualitative score labels next to the quality ring: Weak/Débil (0–30), Fair/Regular (31–60), Good/Bueno (61–85), Excellent/Excelente (86–100).
- Improved Checklist/JSON segmented control: selected state uses `font-semibold` for additional non-color contrast cue; Escape/outside-click close behavior on the format explain popover improved via shared focus trap hook.
- Updated visible version from v1.1.1 to v1.1.2.

---

## v1.1.1

Previous release. See git history for details.
