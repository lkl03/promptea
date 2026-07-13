"use client";

// Step 2 — what the prompt is for. Pills derive from the canonical purpose
// list; selection state is communicated with aria-pressed.

import type { Lang, PromptPurpose } from "@/lib/domain";
import { purposeOptions } from "@/lib/purposes";

export default function PurposePicker({
  label,
  lang,
  purpose,
  disabled,
  onChange,
}: {
  label: string;
  lang: Lang;
  purpose: PromptPurpose | null;
  disabled: boolean;
  onChange: (purpose: PromptPurpose) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-xs sm:text-sm text-ink-muted text-center">{label}</div>
      <div className="flex flex-wrap items-center justify-center gap-2" role="group" aria-label={label}>
        {purposeOptions(lang).map((p) => (
          <button
            key={p.value}
            type="button"
            className="pill"
            onClick={() => onChange(p.value)}
            disabled={disabled}
            aria-pressed={purpose === p.value}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
