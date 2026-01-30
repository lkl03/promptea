"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import ResultsPanel from "./ResultsPanel";
import { getSessionId } from "@/lib/telemetry/session";

type Dict = any;

const TARGETS = [
  { value: "gpt", label: "GPT" },
  { value: "gemini", label: "Gemini" },
  { value: "grok", label: "Grok" },
  { value: "claude", label: "Claude" },
  { value: "kimi", label: "Kimi" },
  { value: "deepseek", label: "Deepseek" },
] as const;

type TargetValue = (typeof TARGETS)[number]["value"];
type PromptPurpose = "text" | "study" | "code" | "data_json" | "image" | "marketing";

const PURPOSES: Array<{ value: PromptPurpose; label: { es: string; en: string } }> = [
  { value: "text", label: { es: "Texto", en: "Text" } },
  { value: "study", label: { es: "Estudio", en: "Study" } },
  { value: "code", label: { es: "Código", en: "Code" } },
  { value: "data_json", label: { es: "Data/JSON", en: "Data/JSON" } },
  { value: "image", label: { es: "Imagen", en: "Image" } },
  { value: "marketing", label: { es: "Marketing", en: "Marketing" } },
];

function pillClass(active: boolean) {
  const base =
    "h-8 rounded-full border px-3 text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-zinc-400/30 dark:focus:ring-zinc-500/30";
  const lightMode = active
    ? "bg-zinc-950 text-white border-zinc-900/20"
    : "bg-zinc-950/80 text-white border-zinc-900/15 hover:bg-zinc-950";
  const darkMode = active
    ? "dark:bg-white dark:text-zinc-900 dark:border-white/20"
    : "dark:bg-white/85 dark:text-zinc-900 dark:border-white/15 dark:hover:bg-white";
  return [base, lightMode, darkMode].join(" ");
}

export default function PromptBox({
  dict,
  lang,
  initialPrompt,
  initialPurpose,
  initialTarget,
}: {
  dict: Dict;
  lang: "es" | "en";
  initialPrompt?: string;
  initialPurpose?: PromptPurpose;
  initialTarget?: TargetValue;
}) {
  const [prompt, setPrompt] = useState("");
  const [target, setTarget] = useState<TargetValue>("gpt");
  const [purpose, setPurpose] = useState<PromptPurpose | null>(null);

  const [result, setResult] = useState<any>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const locked = !!result || isPending;
  const canAnalyze = useMemo(() => prompt.trim().length > 0 && !!purpose, [prompt, purpose]);

  // ✅ init from query params (solo 1 vez)
  const didInitRef = useRef(false);
  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;

    if (typeof initialTarget === "string") setTarget(initialTarget);
    if (typeof initialPurpose === "string") setPurpose(initialPurpose);

    if (typeof initialPrompt === "string" && initialPrompt.trim().length > 0) {
      setPrompt(initialPrompt);
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
  }, [initialPrompt, initialPurpose, initialTarget]);

  // ✅ session ping (DAU)
  useEffect(() => {
    const sessionId = getSessionId();
    fetch("/api/telemetry/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sessionId,
        lang,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? null,
      }),
      keepalive: true,
    }).catch(() => {});
  }, [lang]);

  function resetAll() {
    setPrompt("");
    setPurpose(null);
    setResult(null);
    setError(null);
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  function analyze() {
    if (!canAnalyze || locked) return;
    setError(null);

    startTransition(async () => {
      try {
        const sessionId = getSessionId();

        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ prompt, target, lang, purpose, sessionId }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Error");

        setResult(data);
      } catch (e: any) {
        setError(e?.message ?? "Error");
      }
    });
  }

  const purposeLabel = lang === "es" ? "¿Para qué es tu prompt?" : "What is your prompt for?";

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 2xl:max-w-6xl">
      <div className="flex items-center justify-center gap-3">
        <span className="text-sm opacity-80">{dict.app.writingFor}</span>

        <select
          aria-label={dict.app.targetModel}
          className="h-10 w-55 rounded-xl border px-3 text-sm
                     bg-white/30 dark:bg-zinc-950/25 backdrop-blur-xl
                     border-white/20 dark:border-white/10
                     focus:outline-none focus:ring-2 focus:ring-zinc-400/30 dark:focus:ring-zinc-500/30
                     disabled:opacity-50 disabled:cursor-not-allowed"
          value={target}
          onChange={(e) => setTarget(e.target.value as TargetValue)}
          disabled={locked}
        >
          {TARGETS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <textarea
        ref={textareaRef}
        className="surface min-h-45 w-full p-4 text-sm leading-relaxed
                   placeholder:text-zinc-500 dark:placeholder:text-zinc-400
                   focus:outline-none focus:ring-2 focus:ring-zinc-400/30 dark:focus:ring-zinc-500/30
                   disabled:opacity-60 disabled:cursor-not-allowed"
        placeholder={dict.app.placeholder}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        disabled={locked}
        onKeyDown={(e) => {
          if (locked) return;
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            analyze();
          }
        }}
      />

      {/* ✅ purpose pills */}
      <div className="flex flex-col items-center gap-2">
        <div className="text-xs sm:text-sm opacity-80 text-center">{purposeLabel}</div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {PURPOSES.map((p) => (
            <button
              key={p.value}
              type="button"
              className={pillClass(purpose === p.value)}
              onClick={() => setPurpose(p.value)}
              disabled={locked}
              aria-pressed={purpose === p.value}
            >
              {p.label[lang]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-center">
        <button onClick={analyze} disabled={!canAnalyze || locked} className="btn btn-primary h-10 w-full sm:w-55">
          {isPending ? dict.app.analyzing : dict.app.analyze}
        </button>
      </div>

      {error && <div className="surface-soft p-3 text-sm">{error}</div>}

      <ResultsPanel dict={dict} lang={lang} result={result} isLoading={isPending} onReset={resetAll} />
    </div>
  );
}








