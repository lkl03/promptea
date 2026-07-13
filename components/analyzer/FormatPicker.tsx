"use client";

// Step 5 — output format of the optimized prompt (checklist vs strict JSON).

import type { FormatChoice, Lang } from "@/lib/domain";
import FormatExplainModal from "@/components/FormatExplainModal";

export default function FormatPicker({
  label,
  checklistLabel,
  jsonLabel,
  lang,
  value,
  disabled,
  onChange,
}: {
  label: string;
  checklistLabel: string;
  jsonLabel: string;
  lang: Lang;
  value: FormatChoice;
  disabled: boolean;
  onChange: (value: FormatChoice) => void;
}) {
  const options: Array<{ value: FormatChoice; label: string }> = [
    { value: "checklist", label: checklistLabel },
    { value: "json", label: jsonLabel },
  ];

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-2 text-xs sm:text-sm text-ink-muted">
        <span>{label}</span>
        <FormatExplainModal lang={lang} />
      </div>
      <div role="radiogroup" aria-label={label} className="surface-soft inline-flex items-center rounded-full p-1">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={value === opt.value}
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={[
              "h-8 rounded-full px-3.5 text-xs font-medium transition-colors",
              value === opt.value
                ? "bg-ink text-canvas font-semibold"
                : "text-ink-muted hover:text-ink",
            ].join(" ")}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
