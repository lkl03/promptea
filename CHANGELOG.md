# Changelog

All notable changes to Promptea are documented here.

---

## v1.4.6 — 2026-09-03

**Three new evergreen guides + feedback input accessibility fix.** This week's update adds AI prompts for legal teams, AI prompts for finance teams, and a context engineering guide to the SEO content library. The product improvement adds an `aria-label` to the feedback text input in the results panel: the input previously had only a `placeholder` attribute, which is not treated as an accessible label by screen readers.

### Added
- **New guide: AI prompts for legal teams** (`lib/seo/content/guides.ts`, slug `ai-prompts-for-legal`) — where AI genuinely helps legal teams (contract clause drafting, document review for specific issues, case law summarization, structured data extraction from agreements), what AI cannot do in legal work and what to verify, and two templates: a contract clause first draft and a targeted contract review for a specific risk.
- **New guide: AI prompts for finance teams** (`lib/seo/content/guides.ts`, slug `ai-prompts-for-finance`) — where AI saves finance teams real time (earnings call summarization, variance commentary drafting, financial statement analysis, board deck commentary, model documentation), what AI cannot do in finance and what to verify, and two templates: an earnings call structured summary and a variance commentary draft.
- **New guide: Context engineering** (`lib/seo/content/guides.ts`, slug `context-engineering`) — what context engineering is and how it differs from prompt engineering, practical patterns for high-quality context (ordering, term definitions, separating background from instruction, negative constraints, aggressive trimming for long documents), and two templates: a structured context template for document-based tasks and a multi-document synthesis template with an explicit context budget.

### Changed
- **Feedback input `aria-label` added** (`components/results/FeedbackBar.tsx`) — the optional reason text input in the post-result feedback bar previously had only a `placeholder` attribute. Placeholder text is not announced as a label by screen readers, leaving the input unlabelled for assistive technology users. An `aria-label` matching the placeholder value is now present on the element.
- Version bumped to `v1.4.6` (`package.json`, `package-lock.json`, `lib/version.ts`).

### Validated
- `npm run typecheck` — clean
- `npm run lint` — clean on files changed in this release
- `npm test` (Vitest) — all suites pass, including version-sync and changelog-page parity checks
- `npm run build` — not run (requires env vars for Firebase/Groq); no build-breaking changes introduced

---

## v1.4.5 — 2026-08-31

**Three new evergreen guides + duplicate-slug fix.** This week's update adds AI prompts for customer support, structured output prompting, and AI prompts for HR and recruiting to the SEO content library. The product improvement fixes a duplicate slug introduced in v1.4.4: the guide "How to write better prompts for Claude" was accidentally assigned the same slug (`claude-prompt-guide`) as the earlier v1.1.4 guide, making it unreachable via its own URL. The slug is renamed to `better-prompts-for-claude`, giving it a live, accessible route for the first time.

### Added
- **New guide: AI prompts for customer support** (`lib/seo/content/guides.ts`, slug `ai-prompts-for-customer-support`) — where AI fits in support workflows (ticket replies, FAQ drafting, escalation summaries), how to keep AI replies on-brand, and two copy-paste templates: a first-response ticket reply and an escalation summary for specialist handoff.
- **New guide: Structured output prompting** (`lib/seo/content/guides.ts`, slug `structured-output-prompting`) — the five most common reasons structured output prompts fail (no schema, prose leakage, hallucinated fields, nested-structure mismatch, inconsistent date formats), the four elements of a reliable structured output prompt, and two templates: data extraction to JSON and a structured comparison table.
- **New guide: AI prompts for HR and recruiting** (`lib/seo/content/guides.ts`, slug `ai-prompts-for-hr`) — where AI saves HR teams real time (job descriptions, interview questions, evaluation summaries), what AI cannot do in hiring and what to verify, and two templates: a job description first draft and a structured interview question set.

### Fixed
- **Duplicate slug resolved** (`lib/seo/content/guides.ts`) — the guide added in v1.4.4 under the title "How to write better prompts for Claude" was stored with slug `claude-prompt-guide`, which was already in use by the v1.1.4 guide "Prompts for Claude". Because `getGuide()` uses `.find()`, the v1.4.4 guide was effectively unreachable at `/guides/claude-prompt-guide`. It is now at `better-prompts-for-claude`, which is a live, accessible route. The v1.1.4 guide at `claude-prompt-guide` is unchanged.

### Changed
- Version bumped to `v1.4.5` (`package.json`, `package-lock.json`, `lib/version.ts`).

### Validated
- `npm run typecheck` — clean
- `npm run lint` — clean on files changed in this release
- `npm test` (Vitest) — all suites pass, including version-sync and changelog-page parity checks
- `npm run build` — not run (requires env vars for Firebase/Groq); no build-breaking changes introduced

---

## v1.4.4 — 2026-08-20

**Three new evergreen guides + ARIA tab accessibility fix.** This week's update adds summarization templates, a Claude-specific prompting guide, and AI prompts for sales teams to the SEO content library, and ships a small accessibility improvement: the Improved/Original tab widget in the results panel now has complete ARIA wiring (`id` on tabs, `aria-controls` + `aria-labelledby` on the tabpanel) so screen readers correctly announce which tab is active and which panel it controls.

### Added
- **New guide: Prompt templates for summarization** (`lib/seo/content/guides.ts`, slug `prompt-templates-for-summarization`) — why most summarization prompts fail, what makes one reliable, and two copy-paste templates: a document/article summary and a structured meeting-notes summary with decision/action-item tables.
- **New guide: How to write better prompts for Claude** (`lib/seo/content/guides.ts`, slug `claude-prompt-guide`) — where Claude stands out (long context, complex instruction-following, calibrated uncertainty), how to structure requests for it, and two templates: a structured document analysis prompt and a voice-preserving editing prompt.
- **New guide: AI prompts for sales teams** (`lib/seo/content/guides.ts`, slug `ai-prompts-for-sales`) — where AI fits in a sales workflow, how to avoid generic-sounding output, and two templates: a cold outreach first-touch email and a proposal executive summary.

### Changed
- **ARIA tab wiring in the result panel** (`components/results/OptimizedPromptPanel.tsx`) — each tab button now has an `id` (`tab-improved` / `tab-original`) and `aria-controls="prompt-tabpanel"`; the tabpanel div now has `id="prompt-tabpanel"` and `aria-labelledby` pointing to the active tab. Previously the tab pattern used `role="tab"` and `aria-selected` but lacked the id/controls/labelledby wiring required for complete ARIA compliance.
- Version bumped to `v1.4.4` (`package.json`, `package-lock.json`, `lib/version.ts`).

### Validated
- `npm run typecheck` — clean
- `npm run lint` — clean on files changed in this release
- `npm test` (Vitest) — all suites pass, including version-sync and changelog-page parity checks
- `npm run build` — not run (requires env vars for Firebase/Groq); no build-breaking changes introduced

---

## v1.4.3 — 2026-08-13

**Three new evergreen guides + copy-original UX fix.** This week's update adds Perplexity prompting, a systematic prompt-debugging method, and AI prompts for product managers to the SEO content library, and ships a small UX improvement: the original-prompt view in the result panel now has a copy button so users can grab either version without switching tabs or manually selecting text.

### Added
- **New guide: Prompts for Perplexity** (`lib/seo/content/guides.ts`, slug `perplexity-prompt-guide`) — when to choose Perplexity over a static model, how to constrain source types, patterns for current-state research and competitive comparisons, and two copy-paste templates (sourced research and live comparison).
- **New guide: How to debug a prompt that gives bad output** (`lib/seo/content/guides.ts`, slug `prompt-debugging`) — the six most common prompt failure modes, a five-step debugging process, and templates for prompt self-diagnosis and output comparison.
- **New guide: AI prompts for product managers** (`lib/seo/content/guides.ts`, slug `ai-prompts-for-product-managers`) — where AI saves PMs real time (specs, synthesis, prioritization, stakeholder communication), how to get reliable structured output, and templates for lean PRD drafts and user-interview synthesis.

### Changed
- **Copy button added to the original-prompt view** (`components/results/OptimizedPromptPanel.tsx`) — previously the copy button only appeared on the improved-prompt tab; users switching to the original view to compare had no way to copy it without selecting all. The button now appears symmetrically on both tabs with independent confirmation state.
- Version bumped to `v1.4.3` (`package.json`, `package-lock.json`, `lib/version.ts`).

### Validated
- `npm run typecheck` — clean
- `npm run lint` — clean on files changed in this release
- `npm test` — `lib/__tests__/version.sync.test.ts` passes at v1.4.3; full suite see PR description
- `npm run build` — see PR description

---

## v1.4.2 — 2026-08-08

**The AI Daily index reads like a blog, not a control panel.** v1.4.1 gave the section real filtering; it also gave the index a filter panel that greeted every reader with a row of controls before a single headline. This release is a design pass over that same page: the filtering behaviour is untouched, but the search field is promoted to the top as the one obvious way in, the remaining filters step back into a compact secondary control, and the article list is rebuilt as a spacious single-column editorial read. Nothing about what you can filter by has changed — only how much of it the page puts in front of you.

### Changed
- **Search promoted to the primary control on the AI Daily index** (`/[lang]/blog`) — the filter panel is replaced by a single prominent search field styled to match the prompt input on the homepage, so the section opens with one clear action instead of a form. Company, edition, category, date-range and sorting are unchanged in behaviour and still live in the query string; they now sit behind a compact, low-profile control rather than occupying the top of the page.
- **Article listing rebuilt as a single-column editorial list** — wider measure, more vertical breathing room, and a stronger typographic hierarchy between headline, deck and metadata, replacing the denser grid-style listing. The result is a page you read down rather than scan across.
- **Featured-article treatment held back until the archive earns it** — the index simply shows the latest articles, newest first. A dedicated lead-story treatment only makes sense once there is enough published history for a "featured" pick to mean something; with an archive this young it would have singled out an article for no editorial reason. It returns when the archive is large enough to justify it.
- Version bumped to `v1.4.2` (`package.json`, `package-lock.json`, `lib/version.ts`).

### Validated
- `npx tsc --noEmit` — clean
- `npx eslint` — clean on the files changed in this release
- `npm test` — `lib/__tests__/version.sync.test.ts` passes at v1.4.2; full suite see PR description
- `npm run build` — see PR description

---

## v1.4.1 — 2026-08-08

**AI Daily grows an archive and a week.** The section shipped in v1.4.0 as a single daily story with a chronological index; three days in, that index is already something you need to search rather than scroll. This release adds reader-facing filtering built as a plain GET form — every filtered view is a real, shareable, crawlable URL that works without JavaScript — plus two weekly editions (a Saturday week-in-review and a Sunday week-ahead) alongside the daily story, and a disclosed backdate mechanism for the case the same-day rule was too strict for: a genuinely important event that surfaced late.

### Added
- **Filtering and search on the AI Daily index** (`lib/blog/filters.ts`, `/[lang]/blog`) — full-text search across headlines, decks and tags (accent- and case-insensitive), plus filters by company, edition, category and event-date range, and newest/oldest sorting. Implemented as a plain `GET` form: state lives entirely in the query string, so a filtered view is a real URL you can share, bookmark, and crawl, back/forward works, and the whole thing functions with JavaScript disabled. Filtering, faceting and pagination are pure functions over the fetched cards, unit-testable without Firestore.
- **Weekly editions** (`BLOG_EDITIONS` in `lib/domain.ts`) — alongside the `daily` story, a Saturday `weekly-recap` ("the week in review") and a Sunday `week-ahead` ("what to watch"). Each carries the range it covers (`coveredFrom`/`coveredTo`), is labelled as such on the card and the article, and is filterable as its own edition.
- **Disclosed backdating for daily stories** — a daily article about an earlier event can now be published, but only deliberately: the request must pass an explicit override *and* state a reason, the event may be at most `MAX_BACKDATE_DAYS` (14) days old, and the stated reason together with both the event date and the publication date is rendered visibly on the article. Nothing is quietly re-dated. The automated routine is not permitted to use the override — it remains a same-day publisher.

### Changed
- **Per-edition document ids and idempotency keys** (`editionDocId`, `editionIdempotencyKey`) — the id is now derived from the editorial date *and* the edition rather than the date alone, so a Saturday can legitimately carry both the weekly recap and a breaking daily story without either overwriting the other. The retry guarantee is unchanged: a re-run of the same edition on the same date still addresses the same document.
- **Freshness guard extended rather than relaxed** (`checkFreshness`) — it now takes the edition and the backdate override and returns whether the result was backdated and by how many days. Weekly editions cannot be backdated at all (they are dated the day they run), and a post-dated event is still refused for every edition, override or not.
- **Filtered views are excluded from indexing** — any `/[lang]/blog` request carrying filter parameters is marked `noindex, follow` with its canonical pointing at the clean index, so filter permutations do not compete with the section as duplicate content while the clean index and every article stay fully indexable.
- **AI Daily moved up in the header**, now sitting directly after Best AI instead of at the end of the navigation, plus a homepage promo block introducing the section.
- Version bumped to `v1.4.1` (`package.json`, `package-lock.json`, `lib/version.ts`).

### Fixed
- **Same-date edition collision** — under v1.4.0 the Firestore document id was `ai-daily_<date>`, so a second article on the same editorial date resolved to the existing document and reported `ALREADY_PUBLISHED`. With weekly editions that would have made a Saturday recap and a Saturday breaking story mutually exclusive; per-edition keys remove the collision.

### Validated
- `npx tsc --noEmit` — clean
- `npx eslint` — clean on the files changed in this release
- `npm test` — `lib/__tests__/version.sync.test.ts` passes at v1.4.1; full suite see PR description
- `npm run build` — see PR description

---

## v1.4.0 — 2026-08-08

**AI Daily**: Promptea gains a bilingual editorial section — one verified, source-backed story about AI per day, at `/en/blog` and `/es/blog`. Articles live in Firestore (collection `blog_posts`) instead of being shipped as static content, they are published through a signed internal API by an automated routine that never holds Firebase credentials, and a same-day freshness rule keeps the section from quietly going stale.

### Added
- **AI Daily section** (`/[lang]/blog`) — a bilingual, paginated index of published articles plus per-article pages at `/[lang]/blog/[slug]`. Content is read from Firestore (`blog_posts`), server-rendered and ISR-cached. If Firestore is unreachable the section renders empty; the rest of the site is unaffected and the build still succeeds.
- **Source-backed article pages** — each article shows its sources (title, publisher, link, primary/secondary), a "why this matters" block, key takeaways, estimated reading time, and a visible correction notice when one has been issued. A story with a single source must carry an explicit justification for it.
- **Publication states** — `draft`, `published`, `corrected`, `archived`. Only `published` and `corrected` are public; drafts and archived posts are excluded from listings, article routes, the sitemap, and the feeds.
- **Same-day freshness guard** — an article's verified *event* date must equal its publication date in `America/Argentina/Buenos_Aires`. The event date is stored separately from the publication timestamp, and stale stories are rejected server-side rather than merely hidden in the UI.
- **Internal publishing API** (`POST /api/internal/blog/publish`) — authenticated with HMAC-SHA256 request signing over the raw body, a ±5-minute replay window, single-use nonce rejection, and a payload-size limit. Firebase credentials stay server-side; the automated publishing routine holds only a publish-only secret.
- **Idempotent daily publication** — the Firestore document id is derived from the editorial date and creation runs inside a transaction, so a retried or duplicated run cannot create a second article for the same day.
- **Blog SEO** — per-article canonical URL with EN/ES `hreflang` alternates, `NewsArticle` and `BreadcrumbList` structured data, sitemap integration for every published article, an RSS 2.0 feed per locale, and generated OpenGraph cover images.
- **Run log** (collection `blog_runs`) — one typed outcome recorded per execution: `PUBLISHED`, `ALREADY_PUBLISHED`, `NO_ELIGIBLE_STORY`, `RESEARCH_FAILED`, `VERIFICATION_FAILED`, `PUBLICATION_FAILED`.

### Changed
- `sitemap.xml` now covers the blog index and every published article per locale, degrading to the previous static route set when Firestore is unavailable.
- README documents the AI Daily methodology, the primary/secondary source-verification policy, the manual publish and correction procedures, the run-outcome troubleshooting table, and the new `BLOG_PUBLISH_SECRET` variable.
- Version bumped to `v1.4.0` (`package.json`, `package-lock.json`, `lib/version.ts`).

### Fixed
- **Public changelog page drift** (`app/[lang]/changelog/page.tsx`): the page had fallen one release behind — its newest card was v1.3.1 while `CHANGELOG.md`, `package.json`, `package-lock.json` and `lib/version.ts` were all at v1.3.2. The missing v1.3.2 card (three new SEO guides + the sitemap completeness fix) was reconstructed from release history and inserted, and this release's card sits above it. The drift was possible because the version-sync suite checks the manifests and `CHANGELOG.md` but not the rendered changelog page.

### Validated
- `npm run typecheck` — clean
- `npm run lint` — clean on the files changed in this release
- `npm test` — `lib/__tests__/version.sync.test.ts` passes at v1.4.0; full suite see PR description
- `npm run build` — see PR description

---

## v1.3.2 — 2026-08-06

Weekly update: three new SEO guides (Kimi prompts, data analysis prompts, AI learning prompts) and a sitemap completeness fix — four public routes (`/best-ai`, `/prompts/code`, `/prompts/image`, `/prompts/marketing`) were missing from `sitemap.xml`.

### Added
- **New guide: Prompts for Kimi** (`/guides/kimi-prompt-guide`) — how to use Kimi's large context window for long-document Q&A, multi-source research synthesis, and precise document anchoring. Covers section marking, source citation, and handling conflicting sources. Templates: long-document Q&A with source anchoring, and multi-source research synthesis.
- **New guide: AI prompts for data analysis** (`/guides/data-analysis-prompts`) — prompt templates for SQL generation, trend identification, and data interpretation. Covers schema provision, constraint specification, logic verification, and avoiding hallucinated column names. Templates: SQL query from plain-English requirements, and trend analysis and interpretation.
- **New guide: AI prompts for learning** (`/guides/ai-prompts-for-learning`) — how to use AI as a calibrated tutor for explaining concepts, testing comprehension, and building study plans. Covers level calibration, the Feynman test prompt, and accuracy verification. Templates: calibrated concept explanation, and study plan for a specific topic.

### Fixed
- **Sitemap completeness** (`app/sitemap.ts`): four public routes were absent from `sitemap.xml` — `/[lang]/best-ai`, `/[lang]/prompts/code`, `/[lang]/prompts/image`, and `/[lang]/prompts/marketing`. All four are now included with appropriate `changeFrequency` and `priority` values. This is a pure SEO improvement; no routing or content was changed.

### Changed
- Version bumped to `v1.3.2` (`package.json`, `package-lock.json`, `lib/version.ts`).
- **Guides index SEO description** updated to mention Kimi, data analysis, and AI learning prompts.

### Validated
- `npm run lint` — clean (no new errors introduced)
- `npm test` — see PR description
- `npm run typecheck` — see PR description
- `npm run build` — see PR description

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
