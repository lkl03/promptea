"use client";

// Step 1 — pick the target AI family and (optionally) the concrete model.
// Options derive from the verified model registry; only selectable models
// are offered.

import { useMemo } from "react";
import type { Lang, TargetAI } from "@/lib/domain";
import { defaultModelIdForTarget, getModelsForTarget, TARGET_GROUPS } from "@/lib/models";

type AnalyzerDict = {
  providerPlaceholder: string;
  modelHelper: string;
  modelLabel: string;
  modelPlaceholderDisabled: string;
  modelPlaceholderEnabled: string;
};

export default function TargetPicker({
  dict,
  targetModelLabel,
  writingForLabel,
  target,
  modelId,
  disabled,
  onTargetChange,
  onModelChange,
}: {
  dict: AnalyzerDict;
  targetModelLabel: string;
  writingForLabel: string;
  lang: Lang;
  target: TargetAI | null;
  modelId: string;
  disabled: boolean;
  onTargetChange: (target: TargetAI | null, defaultModelId: string) => void;
  onModelChange: (modelId: string) => void;
}) {
  const models = useMemo(() => (target ? getModelsForTarget(target) : []), [target]);

  const selectClass =
    "field h-10 w-44 sm:w-52 px-3 disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-2 sm:gap-x-3">
      <span className="w-full text-center text-sm text-ink-muted sm:w-auto">{writingForLabel}</span>

      <select
        aria-label={targetModelLabel}
        className={selectClass}
        value={target ?? ""}
        onChange={(e) => {
          const v = e.target.value as TargetAI | "";
          if (!v) {
            onTargetChange(null, "");
            return;
          }
          onTargetChange(v, defaultModelIdForTarget(v));
        }}
        disabled={disabled}
      >
        <option value="" disabled>
          {dict.providerPlaceholder}
        </option>
        {TARGET_GROUPS.map((t) => (
          <option key={t.target} value={t.target}>
            {t.label}
          </option>
        ))}
      </select>

      <span className="text-sm text-ink-faint" aria-hidden>
        {dict.modelHelper}
      </span>

      <select
        aria-label={dict.modelLabel}
        className={selectClass}
        value={modelId}
        onChange={(e) => onModelChange(e.target.value)}
        disabled={disabled || !target}
      >
        <option value="" disabled>
          {target ? dict.modelPlaceholderEnabled : dict.modelPlaceholderDisabled}
        </option>
        {models.map((m) => (
          <option key={m.id} value={m.id}>
            {m.label}
            {m.status === "preview" ? " (preview)" : ""}
          </option>
        ))}
      </select>
    </div>
  );
}
