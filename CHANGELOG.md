# Changelog

All notable changes to Promptea are documented here.

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
