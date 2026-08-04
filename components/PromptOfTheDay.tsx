// components/PromptOfTheDay.tsx
"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { categoryLabel, getDailyPrompt, type DailyPrompt } from "@/lib/prompts/daily";

type Props = {
  lang: "es" | "en";
  // Optional, mostly for tests; defaults to "now".
  initialDate?: Date;
};

function formatDate(date: Date, lang: "es" | "en") {
  return date.toLocaleDateString(lang === "es" ? "es-AR" : "en-US", {
    month: "short",
    day: "numeric",
  });
}

export default function PromptOfTheDay({ lang, initialDate }: Props) {
  // Avoid hydration mismatch: render the date label only after mount.
  // useSyncExternalStore avoids the setState-in-effect cascade lint issue.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  // Track analyzer locked state broadcast by PromptBox so the CTA is
  // hidden while a result is shown, analysis is pending, or files are loading.
  const [analyzerLocked, setAnalyzerLocked] = useState(false);
  useEffect(() => {
    function handleLockChange(e: Event) {
      const detail = (e as CustomEvent<{ locked: boolean }>).detail;
      if (typeof detail?.locked === "boolean") setAnalyzerLocked(detail.locked);
    }
    window.addEventListener("promptea:locked-change", handleLockChange);
    return () => window.removeEventListener("promptea:locked-change", handleLockChange);
  }, []);

  const today = useMemo(() => initialDate ?? new Date(), [initialDate]);
  const daily: DailyPrompt = useMemo(() => getDailyPrompt(today), [today]);

  const heading = lang === "es" ? "Prompt del día" : "Prompt of the day";
  const tryLabel = lang === "es" ? "Probar este prompt" : "Try this prompt";
  const dateLabel = mounted ? formatDate(today, lang) : "";

  function handleTry() {
    if (typeof window === "undefined") return;
    // Extra guard: the PromptBox handler also ignores this when locked,
    // but we also hide the button so the UX is clear.
    if (analyzerLocked) return;
    const event = new CustomEvent("promptea:set-prompt", {
      detail: {
        prompt: daily.prompt[lang],
        target: daily.target,
        purpose: daily.purpose,
      },
    });
    window.dispatchEvent(event);
  }

  return (
    <details
      className="group relative w-full xl:sticky xl:top-24"
      open
      data-testid="prompt-of-the-day"
    >
      <summary
        className={[
          "list-none cursor-pointer surface p-3 sm:p-4",
          "rotate-[-0.5deg]",
          "border-accent/30 bg-accent-soft text-ink",
          "transition-transform group-open:rotate-0",
        ].join(" ")}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider opacity-80">
            <span aria-hidden>📌</span>
            <span>{heading}</span>
          </div>
          <span className="text-[11px] opacity-70" suppressHydrationWarning>
            {dateLabel}
          </span>
        </div>

        <div className="mt-2 text-sm font-medium">{daily.title[lang]}</div>
        <div className="mt-1 text-[11px] opacity-70">{categoryLabel(daily.category, lang)}</div>
      </summary>

      <div
        className={[
          "mt-2 p-3 sm:p-4 surface-soft",
          "border-accent/20",
        ].join(" ")}
      >
        <pre className="whitespace-pre-wrap text-xs leading-relaxed font-body opacity-90 max-h-72 overflow-auto">
{daily.prompt[lang]}
        </pre>

        {!analyzerLocked && (
          <div className="mt-3 flex items-center justify-end">
            <button
              type="button"
              onClick={handleTry}
              className="btn btn-primary h-9 text-xs"
              aria-label={tryLabel}
            >
              {tryLabel}
            </button>
          </div>
        )}
      </div>
    </details>
  );
}
