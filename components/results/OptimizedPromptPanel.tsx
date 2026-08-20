"use client";

// The improved prompt: Improved/Original comparison toggle, refinement
// explanation (summary + key improvements + assumptions + questions), engine
// badge (adaptive vs deterministic — only surfaced when useful), and an
// immediate, clearly confirmed copy action.

import { useRef, useState } from "react";
import type { AnalyzeResponse } from "@/lib/analyzeClient";
import { useToast } from "@/components/ToastProvider";

type ResultsDict = Record<string, string>;

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M8 7a3 3 0 0 1 3-3h7a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3h-7a3 3 0 0 1-3-3V7Zm3-1a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-7ZM4 8a1 1 0 0 1 2 0v10a1 1 0 0 0 1 1h9a1 1 0 1 1 0 2H7a3 3 0 0 1-3-3V8Z"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="currentColor" d="M20.7 5.3a1 1 0 0 1 0 1.4l-11 11a1 1 0 0 1-1.4 0l-5-5a1 1 0 1 1 1.4-1.4L9 15.59l10.3-10.3a1 1 0 0 1 1.4 0Z" />
    </svg>
  );
}

function SparkIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v3M12 18v3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M3 12h3M18 12h3M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
    </svg>
  );
}

export default function OptimizedPromptPanel({
  dict,
  result,
  originalPrompt,
}: {
  dict: ResultsDict;
  result: AnalyzeResponse;
  originalPrompt: string;
}) {
  const toast = useToast();
  const [view, setView] = useState<"improved" | "original">("improved");
  const [copied, setCopied] = useState(false);
  const [copiedOriginal, setCopiedOriginal] = useState(false);
  const copyTimerRef = useRef<number | null>(null);
  const copyOriginalTimerRef = useRef<number | null>(null);

  const refinement = result.meta.refinement;
  const isAdaptive = refinement?.execution.engine === "adaptive";
  const formatChoice = (result.meta.formatChoice ?? "checklist") as "checklist" | "json";
  const hasOriginal = originalPrompt.trim().length > 0;

  async function handleCopy() {
    if (!result.optimizedPrompt) return;
    await navigator.clipboard.writeText(result.optimizedPrompt);
    setCopied(true);
    if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
    copyTimerRef.current = window.setTimeout(() => setCopied(false), 2200);
    toast.show(dict.copied, "success");
  }

  async function handleCopyOriginal() {
    if (!originalPrompt.trim()) return;
    await navigator.clipboard.writeText(originalPrompt);
    setCopiedOriginal(true);
    if (copyOriginalTimerRef.current) window.clearTimeout(copyOriginalTimerRef.current);
    copyOriginalTimerRef.current = window.setTimeout(() => setCopiedOriginal(false), 2200);
    toast.show(dict.copied, "success");
  }

  const keyImprovements = refinement?.keyImprovements ?? [];
  const assumptions = refinement?.assumptions ?? [];
  const questions = refinement?.followUpQuestions ?? [];

  return (
    <div className="surface-soft p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{dict.optimizedTitle}</h3>

        <div className="flex items-center gap-2">
          {isAdaptive ? (
            <span className="badge badge-accent inline-flex items-center gap-1" title={refinement?.execution.model ?? ""}>
              <SparkIcon className="h-3 w-3" />
              {dict.refinedByAI}
            </span>
          ) : (
            refinement?.execution.fallbackReason &&
            refinement.execution.fallbackReason !== "disabled" && (
              <span className="badge badge-neutral" title={dict.refinedDeterministicHint}>
                {dict.refinedDeterministic}
              </span>
            )
          )}
          <span className={["badge", formatChoice === "json" ? "badge-info" : "badge-neutral"].join(" ")}>
            {formatChoice === "json" ? "JSON" : "Checklist"}
          </span>
        </div>
      </div>

      {/* Refinement explanation — concise, only what the user gains from. */}
      {isAdaptive && refinement?.summary && (
        <div className="rounded-lg border border-line bg-accent-soft/60 p-3 space-y-2">
          <p className="text-sm leading-relaxed">
            <span className="font-medium">{dict.refinementSummaryTitle}: </span>
            {refinement.summary}
          </p>
          {keyImprovements.length > 0 && (
            <ul className="space-y-1 text-sm text-ink-muted">
              {keyImprovements.slice(0, 4).map((k) => (
                <li key={k} className="flex items-start gap-2">
                  <span aria-hidden className="mt-0.5 text-accent">＋</span>
                  <span>{k}</span>
                </li>
              ))}
            </ul>
          )}
          {(assumptions.length > 0 || questions.length > 0) && (
            <div className="grid gap-2 sm:grid-cols-2 pt-1">
              {assumptions.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-ink-muted">{dict.assumptionsTitle}</div>
                  <ul className="mt-1 space-y-0.5 text-xs text-ink-faint list-disc pl-4">
                    {assumptions.slice(0, 3).map((a) => (
                      <li key={a}>{a}</li>
                    ))}
                  </ul>
                </div>
              )}
              {questions.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-ink-muted">{dict.questionsTitle}</div>
                  <ul className="mt-1 space-y-0.5 text-xs text-ink-faint list-disc pl-4">
                    {questions.slice(0, 3).map((q) => (
                      <li key={q}>{q}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-ink-faint leading-relaxed">{dict.optimizedNote}</p>

      {/* Improved / Original comparison */}
      {hasOriginal && (
        <div role="tablist" aria-label={dict.compareLabel} className="inline-flex items-center rounded-full border border-line bg-surface-soft p-0.5">
          {(["improved", "original"] as const).map((v) => (
            <button
              key={v}
              id={`tab-${v}`}
              role="tab"
              aria-selected={view === v}
              aria-controls="prompt-tabpanel"
              type="button"
              onClick={() => setView(v)}
              className={[
                "h-7 rounded-full px-3 text-xs font-medium transition-colors",
                view === v ? "bg-ink text-canvas font-semibold" : "text-ink-muted hover:text-ink",
              ].join(" ")}
            >
              {v === "improved" ? dict.compareImproved : dict.compareOriginal}
            </button>
          ))}
        </div>
      )}

      <div
        id="prompt-tabpanel"
        className={[
          "relative field p-4 whitespace-pre-wrap overflow-auto max-h-120 min-[1920px]:max-h-160",
          "prompt-block",
          view === "original" ? "opacity-80" : "",
        ].join(" ")}
        role="tabpanel"
        aria-labelledby={hasOriginal ? `tab-${view}` : undefined}
      >
        {view === "improved" ? result.optimizedPrompt : originalPrompt}
        {view === "improved" ? (
          <button
            type="button"
            className="btn-icon absolute bottom-3 right-3 h-9 w-9 bg-surface-raised"
            aria-label={copied ? dict.copied : dict.copy}
            title={copied ? dict.copied : dict.copy}
            onClick={handleCopy}
          >
            {copied ? <CheckIcon className="h-4 w-4 text-success" /> : <CopyIcon className="h-4 w-4" />}
          </button>
        ) : (
          <button
            type="button"
            className="btn-icon absolute bottom-3 right-3 h-9 w-9 bg-surface-raised"
            aria-label={copiedOriginal ? dict.copied : dict.copy}
            title={copiedOriginal ? dict.copied : dict.copy}
            onClick={handleCopyOriginal}
          >
            {copiedOriginal ? <CheckIcon className="h-4 w-4 text-success" /> : <CopyIcon className="h-4 w-4" />}
          </button>
        )}
      </div>
    </div>
  );
}
