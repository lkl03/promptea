# Find the Best AI — matcher methodology (v1.3.0)

The matcher (`lib/matcher/`) answers one question deterministically: **given this
prompt, which AI, model, or working environment fits it best — and why?**

## Pipeline

```
prompt (+ attachment metadata)
  → featureExtractor: run every rubric signal → weighted evidence per category
  → scorer: score registry candidates against the evidence → ranked list
  → confidence/tie rules
  → explanations: bilingual templates citing detected signals
```

No LLM participates anywhere in this path. Same input ⇒ same signals, scores,
ranking, confidence, and explanations. (Optional LLM naturalization of the
explanation text was deliberately left out of v1.3.0: the deterministic
templates already cite concrete evidence, and skipping the extra provider hop
keeps the matcher fully functional with zero external dependencies.)

## Rubric (`lib/matcher/rubric.ts`)

- `RUBRIC_VERSION` is bumped whenever a signal, weight, or threshold changes,
  and is stored with every telemetry event so generations are comparable.
- Each signal is a pure, independently testable detector (regex/threshold)
  contributing weighted evidence to one or more of the 15 `MATCH_CATEGORIES`
  (chat, coding, codingAgent, research, longContext, multimodal,
  dataExtraction, creativeWriting, marketing, translation, summarization,
  tutoring, imagePrompts, complexReasoning, fastLightweight).
- Every prompt receives a small `chat` baseline so general assistants stay in
  the race when nothing specialized is detected.
- Interaction profile: threshold rules over evidence pick `codingAgent`,
  `researchAssistant`, `multimodalAssistant`, `codeSpecialist`, or `chat`.
  **Claude Code / Codex / Gemini CLI are environments, not models** — they are
  recommended via the profile + the provider's `interactionProfiles`, and the
  product label (e.g. "Claude Code") comes from that pairing.

## Scoring (`lib/matcher/scorer.ts`)

```
score(model) = Σ over evidenced categories ( evidence[cat] × fit(model, cat) )
matchScore   = round(100 × score / Σ ( evidence[cat] × 3 ))   // vs. a perfect-fit model
```

- `fit` comes from the registry's verified `capabilities.taskFit` (0–3),
  with **hard capability gates**: `codingAgent` fit is capped by
  `codingAgentFit`; models without `nativeSearch` are capped at 1 for
  `research`; models without image input score 0 for `multimodal`; models
  without structured output are capped at 1 for `dataExtraction`.
- Only `getMatcherCandidates()` entries can be ranked: selectable,
  stable/preview, with capability data — deprecated or legacy models can never
  be recommended by construction.
- The ranking keeps the best model per target so results read as "which AI",
  and tie-breaks deterministically (profile alignment → provider default →
  registry order). No randomness anywhere.

## Confidence and ties (`CONFIDENCE_RULES`)

- total evidence < 3 or high ambiguity → **low** (the UI says the prompt gives
  few signals instead of faking certainty).
- total ≥ 6, top-2 margin ≥ 8, low ambiguity → **high**.
- otherwise **medium**. Top-2 margin ≤ 3 points → **tie**, and the result
  includes the deciding factor between the two.

## Explanations (`lib/matcher/explanations.ts`)

Reasons, trade-offs, adaptation advice, and switching advice are assembled
from templates parameterized by the detected signals, the evidence ranking,
and the winning model's registry capabilities (including its per-model
`promptGuidance`). Advice must cite something observed in the prompt — e.g.
a missing acceptance-criteria signal on a coding-agent prompt — never generic
filler.

## Data maintenance

Capability data lives in `lib/models.ts` under the same policy as the rest of
the registry: values only from official provider documentation, `verifiedAt` +
`sourceUrl` on every entry, deprecated models retained non-selectable with a
replacement chain. Registry invariants (one default per target, resolvable
replacements, capability data on selectable entries) are test-enforced.
