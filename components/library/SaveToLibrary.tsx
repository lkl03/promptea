"use client";

// components/library/SaveToLibrary.tsx
//
// v1.8.0 — sits under a finished analysis: saves it to the local-first library
// (when auto-save is on, the default) and offers "Open library" and "Share
// result". Saving happens ONCE per analysis (keyed by analysisId) and only
// touches this browser's localStorage — the prompt is not sent anywhere by it.
// "before → after" uses ONLY the numbers the engine returned
// (meta.optimizedScore / meta.optimizedBreakdown); nothing is computed here.

import { useEffect, useRef, useSyncExternalStore } from "react";
import Link from "next/link";
import type { AnalyzeResponse } from "@/lib/analyzeClient";
import { MAX_TEXT } from "@/lib/library/store";
import { getLibraryServerSnapshot, getLibrarySnapshot, libraryActions, subscribeLibrary } from "@/lib/library/clientStore";
import ShareButton, { type ShareDict } from "@/components/share/ShareButton";

type ResultsDict = Record<string, string>;

export default function SaveToLibrary({
  result,
  originalPrompt,
  lang,
  dict,
  shareDict,
}: {
  result: AnalyzeResponse;
  originalPrompt: string;
  lang: "es" | "en";
  dict: ResultsDict;
  shareDict: ShareDict;
}) {
  const lib = useSyncExternalStore(subscribeLibrary, getLibrarySnapshot, getLibraryServerSnapshot);
  const savedFor = useRef<string | null>(null);
  const analysisId = String(result.meta.analysisId ?? "");

  useEffect(() => {
    if (!lib.hydrated || !analysisId || savedFor.current === analysisId) return;
    savedFor.current = analysisId;
    if (!originalPrompt.trim()) return;
    libraryActions.saveAnalysis({
      lang,
      purpose: String(result.meta.purpose ?? ""),
      target: String(result.meta.target ?? ""),
      original: originalPrompt,
      optimized: result.optimizedPrompt ?? "",
      score: result.score ?? 0,
      optimizedScore: typeof result.meta.optimizedScore === "number" ? result.meta.optimizedScore : undefined,
      breakdown: result.meta.scoreBreakdown,
      optimizedBreakdown: result.meta.optimizedBreakdown,
    });
  }, [lib.hydrated, analysisId, originalPrompt, lang, result]);

  // "Saved" is derived from the library itself, so it is true exactly when this analysis is in it.
  const purpose = String(result.meta.purpose ?? "");
  const target = String(result.meta.target ?? "");
  const original = originalPrompt.slice(0, MAX_TEXT);
  const saved = lib.hydrated && lib.autoSave && lib.entries.some((e) => e.original === original && e.purpose === purpose && e.target === target);

  const bd = result.meta.scoreBreakdown;
  const after = typeof result.meta.optimizedScore === "number" ? result.meta.optimizedScore : null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs text-ink-muted">
      <p role="status" aria-live="polite" className="min-h-4">
        {saved ? (
          <>
            {dict.savedToLibrary}{" "}
            <Link href={`/${lang}/library`} className="font-medium text-accent hover:underline">
              {dict.openLibrary} →
            </Link>
          </>
        ) : (
          <Link href={`/${lang}/library`} className="text-ink-muted underline-offset-2 hover:text-ink hover:underline">
            {dict.openLibrary}
          </Link>
        )}
      </p>
      <ShareButton
        lang={lang}
        dict={shareDict}
        label={dict.shareResult}
        compact
        input={{ score: result.score ?? 0, optimizedScore: after, breakdown: bd, purpose: String(result.meta.purpose ?? ""), target: String(result.meta.target ?? "") }}
      />
    </div>
  );
}
