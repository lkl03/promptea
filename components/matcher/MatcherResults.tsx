"use client";

// components/matcher/MatcherResults.tsx
//
// Presentation for a deterministic match result: primary recommendation,
// ranked alternatives with trade-offs, detected signals, and prompt
// adaptation advice. All strings come from the server result (already in
// the UI language) or the matcher dictionary.

import type { MatchResult } from "@/lib/matcher/types";
import type { MatcherDict } from "@/lib/uiDict";

function confidenceLabel(dict: MatcherDict, confidence: MatchResult["confidence"]): string {
  if (confidence === "high") return dict.confidenceHigh;
  if (confidence === "medium") return dict.confidenceMedium;
  return dict.confidenceLow;
}

function confidenceBadgeClass(confidence: MatchResult["confidence"]): string {
  if (confidence === "high") return "badge badge-success";
  if (confidence === "medium") return "badge badge-info";
  return "badge badge-warning";
}

export default function MatcherResults({
  result,
  dict,
  onImprove,
}: {
  result: MatchResult;
  dict: MatcherDict;
  onImprove: () => void;
}) {
  const { primary, alternatives } = result;

  return (
    <div className="space-y-5" aria-live="polite">
      {/* Primary recommendation */}
      <section className="surface p-5 sm:p-6 animate-panel-in">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-xs font-medium uppercase tracking-wider text-ink-faint">
              {dict.bestFit}
            </div>
            <h2 className="mt-1 text-2xl font-semibold text-ink sm:text-3xl">{primary.productLabel}</h2>
            <div className="mt-1 text-sm text-ink-muted">
              {dict.recommendedModel}: <span className="font-medium text-ink">{primary.modelLabel}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <div className="text-right">
              <span className="text-3xl font-semibold tabular-nums text-accent">{primary.score}</span>
              <span className="text-sm text-ink-faint">/100</span>
            </div>
            <span className={confidenceBadgeClass(result.confidence)}>
              {dict.confidenceLabel}: {confidenceLabel(dict, result.confidence)}
            </span>
            {result.isTie && <span className="badge badge-neutral">{dict.tieNote}</span>}
          </div>
        </div>

        {result.isTie && result.tieBreaker && (
          <p className="mt-3 text-sm text-ink-muted">{result.tieBreaker}</p>
        )}
        {result.confidence === "low" && (
          <p className="mt-3 text-sm text-ink-muted">{dict.lowConfidenceHint}</p>
        )}

        <div className="mt-4">
          <h3 className="text-sm font-medium text-ink">{dict.reasonsTitle}</h3>
          <ul className="mt-2 space-y-1.5 text-sm text-ink-muted">
            {primary.reasons.map((reason, i) => (
              <li key={i} className="flex gap-2">
                <span aria-hidden className="text-accent">•</span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>

        {result.detected.signals.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-medium text-ink">{dict.signalsTitle}</h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {result.detected.signals.map((signal) => (
                <span key={signal.id} className="badge badge-neutral">
                  {signal.label}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-5 flex justify-center sm:justify-start">
          <button type="button" className="btn btn-primary h-11 px-6 text-[15px]" onClick={onImprove}>
            {dict.improveCta}
          </button>
        </div>
      </section>

      {/* Adaptation + switching advice */}
      {(result.advice.adaptation.length > 0 || result.advice.switching.length > 0) && (
        <section className="grid gap-4 sm:grid-cols-2">
          {result.advice.adaptation.length > 0 && (
            <div className="surface-soft p-4 stagger-item">
              <h3 className="text-sm font-medium text-ink">{dict.adaptationTitle}</h3>
              <ul className="mt-2 space-y-1.5 text-sm text-ink-muted">
                {result.advice.adaptation.map((tip, i) => (
                  <li key={i} className="flex gap-2">
                    <span aria-hidden className="text-success">✓</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {result.advice.switching.length > 0 && (
            <div className="surface-soft p-4 stagger-item">
              <h3 className="text-sm font-medium text-ink">{dict.switchingTitle}</h3>
              <ul className="mt-2 space-y-1.5 text-sm text-ink-muted">
                {result.advice.switching.map((tip, i) => (
                  <li key={i} className="flex gap-2">
                    <span aria-hidden className="text-info">→</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* Ranked alternatives */}
      {alternatives.length > 0 && (
        <section>
          <h3 className="text-sm font-medium text-ink">{dict.alternativesTitle}</h3>
          <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {alternatives.map((alt) => (
              <div key={alt.modelId} className="surface-soft p-4 stagger-item">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="font-medium text-ink">{alt.productLabel}</div>
                  <div className="shrink-0 text-sm tabular-nums text-ink-muted">
                    {alt.score}
                    <span className="text-ink-faint">/100</span>
                  </div>
                </div>
                <div className="mt-0.5 text-xs text-ink-faint">{alt.modelLabel}</div>
                {alt.bestAt && (
                  <p className="mt-2 text-xs text-ink-muted">
                    <span className="font-medium text-success">{dict.bestAtLabel}</span> {alt.bestAt}
                  </p>
                )}
                {alt.tradeoff && (
                  <p className="mt-1 text-xs text-ink-muted">
                    <span className="font-medium text-warning">{dict.tradeoffLabel}</span> {alt.tradeoff}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
