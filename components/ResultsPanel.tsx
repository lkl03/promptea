"use client";

// Results orchestrator (v1.2.0). Composition only — score, findings,
// insights, optimized prompt, and feedback live in components/results/*.
// Announces completion for screen readers and staggers section entrances.

import { useEffect, useRef, useState } from "react";
import type { AnalyzeResponse } from "@/lib/analyzeClient";
import ScoreCard from "./results/ScoreCard";
import FindingsSection from "./results/FindingsSection";
import InsightsSection from "./results/InsightsSection";
import OptimizedPromptPanel from "./results/OptimizedPromptPanel";
import FeedbackBar from "./results/FeedbackBar";

import type { UiDict } from "@/lib/uiDict";

type Dict = UiDict;

function SkeletonPanel() {
  return (
    <div className="surface p-4 sm:p-5 space-y-4 animate-panel-in" aria-hidden>
      <div className="surface-soft p-3 flex items-center justify-between gap-3">
        <div className="h-4 w-64 skeleton" />
        <div className="h-10 w-44 skeleton" />
      </div>

      <div className="flex flex-col gap-4 xl:grid xl:grid-cols-2">
        <div className="surface-soft p-4 space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-33 w-33 rounded-full skeleton" />
            <div className="space-y-2 flex-1">
              <div className="h-4 w-3/4 skeleton" />
              <div className="h-3 w-1/3 skeleton" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-4 w-40 skeleton" />
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="h-28 w-full skeleton" />
              <div className="h-28 w-full skeleton" />
            </div>
          </div>
        </div>
        <div className="surface-soft p-4 space-y-2">
          <div className="h-4 w-40 skeleton" />
          <div className="h-105 w-full skeleton rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

export default function ResultsPanel({
  dict,
  lang,
  result,
  originalPrompt,
  isLoading,
  onReset,
}: {
  dict: Dict;
  lang: "es" | "en";
  result: AnalyzeResponse | null;
  originalPrompt: string;
  isLoading: boolean;
  onReset: () => void;
}) {
  const [visibleResult, setVisibleResult] = useState<AnalyzeResponse | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const closeTokenRef = useRef(0);
  const closeTimerRef = useRef<number | null>(null);

  // Adopt a newly-arrived result and cancel any close animation. Deferred a
  // tick so state updates never run synchronously inside the effect body.
  useEffect(() => {
    if (!result) return;
    const t = window.setTimeout(() => {
      setVisibleResult(result);
      setIsClosing(false);
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    }, 0);
    return () => window.clearTimeout(t);
  }, [result]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    };
  }, []);

  const data = visibleResult ?? result;

  function handleResetClick() {
    if (!data) return;
    setIsClosing(true);
    const token = ++closeTokenRef.current;
    onReset();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        closeTimerRef.current = window.setTimeout(() => {
          if (closeTokenRef.current !== token) return;
          setVisibleResult(null);
          setIsClosing(false);
        }, 300);
      });
    });
  }

  if (isLoading && !data) return <SkeletonPanel />;
  if (!data) return null;

  const analysisId = String(data.meta.analysisId ?? "");
  const r = dict.results;

  return (
    <div
      className={[
        "surface p-4 sm:p-5 space-y-4",
        isClosing ? "animate-panel-out pointer-events-none" : "animate-panel-in",
      ].join(" ")}
    >
      {/* Screen-reader announcement of completion */}
      <div className="sr-only" role="status" aria-live="polite">
        {r.analysisReady}
      </div>

      <div className="surface-soft p-3 items-center justify-between gap-3 hidden sm:flex">
        <p className="text-xs text-ink-muted">{r.lockedNotice}</p>
        <button type="button" className="btn btn-primary h-10" onClick={handleResetClick}>
          {r.newPrompt}
        </button>
      </div>

      <div className="flex flex-col gap-4 xl:grid xl:grid-cols-2 xl:items-start">
        {/* LEFT — analysis */}
        <div className="surface-soft p-4 space-y-5">
          <div className="stagger-item">
            <ScoreCard dict={r} lang={lang} result={data} />
          </div>
          <div className="stagger-item space-y-5">
            <FindingsSection dict={r} result={data} />
          </div>
          <div className="stagger-item space-y-2">
            <InsightsSection dict={r} result={data} />
          </div>
        </div>

        {/* RIGHT — the improved prompt (primary actor) */}
        <div className="stagger-item">
          <OptimizedPromptPanel dict={r} result={data} originalPrompt={originalPrompt} />
        </div>
      </div>

      <FeedbackBar dict={r} analysisId={analysisId} />

      <div className="flex justify-center sm:hidden">
        <button type="button" className="btn btn-primary h-11 w-full" onClick={handleResetClick}>
          {r.newPrompt}
        </button>
      </div>
    </div>
  );
}
