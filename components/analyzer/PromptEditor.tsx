"use client";

// Step 3 — the prompt itself. The main actor of the page: generous size,
// mono-adjacent counter, one example helper, no visual competition.

import { forwardRef, useMemo } from "react";
import { approxTokens, countWords, tpl } from "./format";

type EditorDict = {
  words_one: string;
  words_other: string;
  tokensApprox: string;
  tryExample: string;
  editorLabel: string;
};

const PromptEditor = forwardRef<
  HTMLTextAreaElement,
  {
    dict: EditorDict;
    placeholder: string;
    value: string;
    disabled: boolean;
    onChange: (value: string) => void;
    onSubmit: () => void;
    onTryExample: () => void;
  }
>(function PromptEditor({ dict, placeholder, value, disabled, onChange, onSubmit, onTryExample }, ref) {
  const words = useMemo(() => countWords(value), [value]);
  const tokens = useMemo(() => (value.trim().length > 0 ? approxTokens(value) : 0), [value]);

  const counterText =
    value.trim().length > 0
      ? `${words} ${words === 1 ? dict.words_one : dict.words_other} · ${tpl(dict.tokensApprox, { n: tokens })}`
      : "";

  return (
    <div>
      <textarea
        ref={ref}
        aria-label={dict.editorLabel}
        className="field min-h-48 w-full p-4 text-sm leading-relaxed resize-y
                   placeholder:text-ink-faint
                   disabled:opacity-60 disabled:cursor-not-allowed"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSubmit();
          }
        }}
      />

      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-ink-faint tabular-nums" aria-live="polite" aria-atomic="true">
          {counterText}
        </div>
        {!disabled && (
          <button
            type="button"
            onClick={onTryExample}
            className="text-xs text-ink-muted hover:text-ink underline underline-offset-2 rounded transition-colors"
          >
            {dict.tryExample}
          </button>
        )}
      </div>
    </div>
  );
});

export default PromptEditor;
