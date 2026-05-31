"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import ResultsPanel from "./ResultsPanel";
import FormatExplainModal from "./FormatExplainModal";
import HowItWorks from "./HowItWorks";
import { useToast } from "./ToastProvider";
import { getSessionId } from "@/lib/telemetry/session";
import {
  ATTACHMENT_ACCEPT,
  fileToAttachmentInput,
  isPurposeAttachmentEnabled,
  MAX_ATTACHMENTS,
  MAX_ATTACHMENT_SIZE_BYTES,
  MAX_TOTAL_ATTACHMENT_SIZE_BYTES,
  type AttachmentInput,
} from "@/lib/attachments";
import {
  defaultModelIdForTarget,
  getModelsForTarget,
  TARGET_GROUPS,
} from "@/lib/models";

type Dict = any;

const TARGETS = TARGET_GROUPS.map((g) => ({ value: g.target, label: g.label })) as ReadonlyArray<{
  value: "gpt" | "gemini" | "grok" | "claude" | "kimi" | "deepseek";
  label: string;
}>;

type TargetValue = (typeof TARGETS)[number]["value"];

type FormatChoice = "checklist" | "json";
type PromptPurpose =
  | "text"
  | "study"
  | "code"
  | "data"
  | "image"
  | "marketing"
  | "translation"
  | "summarization";

const PURPOSES: Array<{ value: PromptPurpose; label: { es: string; en: string } }> = [
  { value: "text", label: { es: "Texto", en: "Text" } },
  { value: "study", label: { es: "Estudio", en: "Study" } },
  { value: "code", label: { es: "Código", en: "Code" } },
  { value: "data", label: { es: "Data/JSON", en: "Data/JSON" } },
  { value: "image", label: { es: "Imagen", en: "Image" } },
  { value: "marketing", label: { es: "Marketing", en: "Marketing" } },
  { value: "translation", label: { es: "Traducción", en: "Translation" } },
  { value: "summarization", label: { es: "Resumen", en: "Summary" } },
];

/** Example prompt for each locale used by "Try an example" helper */
const EXAMPLE_PROMPT: Record<"es" | "en", { prompt: string; purpose: PromptPurpose; target: TargetValue }> = {
  es: {
    prompt: `Sos un experto en programación. Tengo el siguiente error en Next.js 14:

Error: "Cannot read properties of undefined (reading 'map')"

Se produce en el componente ProductList cuando el prop products no viene del servidor.

Necesito:
1. Por qué ocurre exactamente
2. Cómo prevenirlo (valor por defecto, guard clause o Suspense)
3. Snippet con el fix aplicado`,
    purpose: "code",
    target: "claude",
  },
  en: {
    prompt: `You are a senior software engineer. I'm getting this error in Next.js 14:

Error: "Cannot read properties of undefined (reading 'map')"

It happens in the ProductList component when the products prop is not passed from the server.

I need:
1. Exactly why this happens
2. How to prevent it (default value, guard clause, or Suspense)
3. A snippet showing the applied fix`,
    purpose: "code",
    target: "claude",
  },
};

/** sessionStorage key for persisting analyzer form state across locale navigation */
const SESSION_KEY = "promptea:form-state";

function readSessionState(): {
  prompt?: string;
  purpose?: PromptPurpose;
  target?: TargetValue;
  format?: FormatChoice;
} {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function writeSessionState(state: {
  prompt: string;
  purpose: PromptPurpose | null;
  target: TargetValue | null;
  format: FormatChoice;
}) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
  } catch {
    // quota exceeded or private mode — ignore
  }
}

function pillClass(active: boolean) {
  const base =
    "h-8 rounded-full border px-3 text-xs font-medium transition " +
    "focus:outline-none focus:ring-2 focus:ring-zinc-400/30 dark:focus:ring-zinc-500/30";

  if (active) {
    // High-contrast selected state: solid background with contrasting text + thicker border
    return [
      base,
      "bg-zinc-900 text-white border-zinc-900 font-semibold",
      "dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100",
    ].join(" ");
  }

  // Idle state: subtle, clearly not selected
  return [
    base,
    "bg-white/40 text-zinc-700 border-zinc-300/60",
    "hover:bg-white/70 hover:border-zinc-400/80 hover:text-zinc-900",
    "dark:bg-zinc-800/40 dark:text-zinc-300 dark:border-zinc-600/50",
    "dark:hover:bg-zinc-700/60 dark:hover:border-zinc-500 dark:hover:text-zinc-100",
  ].join(" ");
}

function paperclipLabel(lang: "es" | "en") {
  return lang === "es" ? "Adjuntar archivos" : "Upload files";
}

function formatBytes(bytes: number, lang: "es" | "en") {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb >= 100 ? 0 : 1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} ${lang === "es" ? "MB" : "MB"}`;
}

/** Approximate token count using a simple heuristic (chars / 4, minimum 1) */
function approxTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

function countWords(text: string): number {
  return text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
}

const GOOGLE_SEND_TO = process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_SEND_TO;
const GOOGLE_VALUE = Number(process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_VALUE ?? "1.0");
const GOOGLE_CURRENCY = process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_CURRENCY ?? "ARS";

function trackGoogleAnalyzeSuccess() {
  if (!GOOGLE_SEND_TO) return;
  try {
    const gtag = (window as any).gtag as undefined | ((...args: any[]) => void);
    if (!gtag) return;
    gtag("event", "conversion", {
      send_to: GOOGLE_SEND_TO,
      value: GOOGLE_VALUE,
      currency: GOOGLE_CURRENCY,
    });
  } catch {
    // ignore
  }
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M7 7a5 5 0 0 1 10 0v7.5a3.5 3.5 0 1 1-7 0V8.75a2.25 2.25 0 1 1 4.5 0V14a1 1 0 1 1-2 0V9a1 1 0 1 0-2 0v5a3 3 0 0 0 6 0V8.5a1 1 0 1 1 2 0V14a5 5 0 1 1-10 0V7Z"
      />
    </svg>
  );
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
  const [target, setTarget] = useState<TargetValue | null>(null);
  const [modelId, setModelId] = useState<string>("");
  const [purpose, setPurpose] = useState<PromptPurpose | null>(null);
  const [attachments, setAttachments] = useState<AttachmentInput[]>([]);
  const [format, setFormat] = useState<FormatChoice>("checklist");

  const toast = useToast();

  const [result, setResult] = useState<any>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isReadingFiles, setIsReadingFiles] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const locked = !!result || isPending || isReadingFiles;
  const canAnalyze = useMemo(
    () => prompt.trim().length > 0 && !!purpose && !!target,
    [prompt, purpose, target]
  );
  const attachmentsEnabled = isPurposeAttachmentEnabled(purpose);
  const totalAttachmentBytes = attachments.reduce((acc, file) => acc + file.size, 0);

  // Word / token counter
  const wordCount = useMemo(() => countWords(prompt), [prompt]);
  const tokenCount = useMemo(() => (prompt.trim().length > 0 ? approxTokens(prompt) : 0), [prompt]);

  const didInitRef = useRef(false);
  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;

    // URL params take priority over sessionStorage
    if (typeof initialPrompt === "string" && initialPrompt.trim().length > 0) {
      if (typeof initialTarget === "string") {
        setTarget(initialTarget);
        setModelId(defaultModelIdForTarget(initialTarget));
      }
      if (typeof initialPurpose === "string") setPurpose(initialPurpose);
      setPrompt(initialPrompt);
      requestAnimationFrame(() => textareaRef.current?.focus());
      return;
    }

    // Restore from sessionStorage (language switch persistence)
    const saved = readSessionState();
    if (saved.prompt && saved.prompt.trim().length > 0) {
      setPrompt(saved.prompt);
      if (saved.target) {
        setTarget(saved.target);
        setModelId(defaultModelIdForTarget(saved.target));
      }
      if (saved.purpose) setPurpose(saved.purpose);
      if (saved.format) setFormat(saved.format);
      return;
    }

    // Fall back to URL params with no prompt
    if (typeof initialTarget === "string") {
      setTarget(initialTarget);
      setModelId(defaultModelIdForTarget(initialTarget));
    }
    if (typeof initialPurpose === "string") setPurpose(initialPurpose);
  }, [initialPrompt, initialPurpose, initialTarget]);

  // Persist form state to sessionStorage on every change (except when locked/analyzing)
  useEffect(() => {
    if (locked) return;
    writeSessionState({ prompt, purpose, target, format });
  }, [prompt, purpose, target, format, locked]);

  const submodels = useMemo(
    () => (target ? getModelsForTarget(target) : []),
    [target]
  );
  useEffect(() => {
    if (!target) {
      if (modelId !== "") setModelId("");
      return;
    }
    if (!submodels.some((m) => m.id === modelId)) {
      setModelId(defaultModelIdForTarget(target));
    }
  }, [target, modelId, submodels]);

  // Listen for external "load this prompt" requests (e.g. Prompt of the Day).
  useEffect(() => {
    type Detail = { prompt?: string; target?: TargetValue; purpose?: PromptPurpose };
    function handler(event: Event) {
      const detail = (event as CustomEvent<Detail>).detail ?? {};
      setResult(null);
      setError(null);
      setIsReadingFiles(false);

      if (typeof detail.prompt === "string") setPrompt(detail.prompt);
      if (detail.target) {
        setTarget(detail.target);
        setModelId(defaultModelIdForTarget(detail.target));
      }
      if (detail.purpose) setPurpose(detail.purpose);

      requestAnimationFrame(() => {
        textareaRef.current?.focus();
        textareaRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      });

      const msg = lang === "es" ? "Prompt cargado" : "Prompt loaded";
      try {
        toast.show(msg, "success");
      } catch {
        // ignore
      }
    }

    window.addEventListener("promptea:set-prompt", handler);
    return () => window.removeEventListener("promptea:set-prompt", handler);
  }, [lang, toast]);

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

  useEffect(() => {
    if (purpose && !isPurposeAttachmentEnabled(purpose) && attachments.length > 0) {
      setAttachments([]);
    }
  }, [purpose, attachments.length]);

  function resetAll() {
    setPrompt("");
    setPurpose(null);
    setTarget(null);
    setModelId("");
    setAttachments([]);
    setResult(null);
    setError(null);
    setFormat("checklist");
    if (fileInputRef.current) fileInputRef.current.value = "";
    // Clear persisted state on explicit reset
    try { sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  function removeAttachment(name: string) {
    setAttachments((prev) => prev.filter((item) => item.name !== name));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleFileSelection(files: FileList | null) {
    if (!files?.length) return;
    if (!attachmentsEnabled) return;

    setError(null);
    setIsReadingFiles(true);

    try {
      const incoming = Array.from(files);
      const currentCount = attachments.length;
      if (currentCount + incoming.length > MAX_ATTACHMENTS) {
        throw new Error(
          lang === "es"
            ? `Podés adjuntar hasta ${MAX_ATTACHMENTS} archivos.`
            : `You can attach up to ${MAX_ATTACHMENTS} files.`
        );
      }

      const tooLarge = incoming.find((file) => file.size > MAX_ATTACHMENT_SIZE_BYTES);
      if (tooLarge) {
        throw new Error(
          lang === "es"
            ? `${tooLarge.name} supera el límite de ${formatBytes(MAX_ATTACHMENT_SIZE_BYTES, lang)}.`
            : `${tooLarge.name} exceeds the ${formatBytes(MAX_ATTACHMENT_SIZE_BYTES, lang)} limit.`
        );
      }

      const nextTotalBytes = totalAttachmentBytes + incoming.reduce((acc, file) => acc + file.size, 0);
      if (nextTotalBytes > MAX_TOTAL_ATTACHMENT_SIZE_BYTES) {
        throw new Error(
          lang === "es"
            ? `El total de adjuntos supera ${formatBytes(MAX_TOTAL_ATTACHMENT_SIZE_BYTES, lang)}.`
            : `Total attachments exceed ${formatBytes(MAX_TOTAL_ATTACHMENT_SIZE_BYTES, lang)}.`
        );
      }

      const next = await Promise.all(incoming.map((file) => fileToAttachmentInput(file)));
      setAttachments((prev) => {
        const existing = new Map(prev.map((item) => [item.name, item]));
        for (const item of next) existing.set(item.name, item);
        return Array.from(existing.values()).slice(0, MAX_ATTACHMENTS);
      });
    } catch (e: any) {
      setError(e?.message ?? (lang === "es" ? "No se pudieron leer los archivos." : "Could not read the selected files."));
    } finally {
      setIsReadingFiles(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function analyze() {
    if (!canAnalyze || locked || !target) return;
    setError(null);

    startTransition(async () => {
      try {
        const sessionId = getSessionId();

        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "content-type": "application/json", "x-ui-lang": lang },
          body: JSON.stringify({
            prompt,
            target,
            lang,
            purpose,
            sessionId,
            attachments,
            format,
            modelId: modelId || undefined,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Error");

        setResult(data);
        trackGoogleAnalyzeSuccess();
      } catch (e: any) {
        setError(e?.message ?? "Error");
      }
    });
  }

  function loadExample() {
    if (locked) return;
    const ex = EXAMPLE_PROMPT[lang];
    if (prompt.trim().length > 0) {
      // Don't overwrite existing content without a soft confirmation
      const confirmMsg =
        lang === "es"
          ? "¿Reemplazar el texto actual con el ejemplo?"
          : "Replace current text with the example?";
      if (!window.confirm(confirmMsg)) return;
    }
    setPrompt(ex.prompt);
    setPurpose(ex.purpose);
    setTarget(ex.target);
    setModelId(defaultModelIdForTarget(ex.target));
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  }

  const purposeLabel = lang === "es" ? "¿Para qué es tu prompt?" : "What is your prompt for?";
  const uploadHint = !purpose
    ? lang === "es"
      ? "Elegí un tipo de prompt para habilitar adjuntos."
      : "Choose a prompt type to enable attachments."
    : purpose === "image"
    ? lang === "es"
      ? "Los adjuntos están disponibles para prompts de texto, datos, código, marketing, estudio, traducción y resumen."
      : "Attachments are available for text, data, code, marketing, study, translation, and summarization prompts."
    : lang === "es"
    ? `Aceptamos archivos textuales (JSON, CSV, logs, Markdown, código). Hasta ${MAX_ATTACHMENTS} archivos · ${formatBytes(MAX_ATTACHMENT_SIZE_BYTES, lang)} c/u.`
    : `Text-based files supported (JSON, CSV, logs, Markdown, code). Up to ${MAX_ATTACHMENTS} files · ${formatBytes(MAX_ATTACHMENT_SIZE_BYTES, lang)} each.`;

  const formatLabel = lang === "es" ? "Formato del prompt optimizado" : "Optimized prompt format";
  const checklistLabel = lang === "es" ? "Checklist" : "Checklist";
  const jsonLabel = "JSON";
  const submodelLabel = lang === "es" ? "Modelo" : "Model";

  const providerPlaceholder = lang === "es" ? "Elegí una IA" : "Choose an AI";
  const modelHelperText = lang === "es" ? "con este modelo…" : "with this model…";
  const modelDisabledPlaceholder = lang === "es" ? "Primero elegí una IA" : "First choose an AI";
  const modelEnabledPlaceholder = lang === "es" ? "Elegí un modelo" : "Choose a model";

  const counterText =
    prompt.trim().length > 0
      ? lang === "es"
        ? `${wordCount} ${wordCount === 1 ? "palabra" : "palabras"} · ~${tokenCount} tokens`
        : `${wordCount} ${wordCount === 1 ? "word" : "words"} · ~${tokenCount} tokens`
      : "";

  const tryExampleLabel = lang === "es" ? "Probar un ejemplo →" : "Try an example →";

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 2xl:max-w-6xl">
      {/* Step 1: Choose AI/model */}
      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-2 sm:gap-x-3">
        <span className="w-full text-center text-sm opacity-80 sm:w-auto">{dict.app.writingFor}</span>

        <select
          aria-label={dict.app.targetModel}
          className="h-10 w-44 sm:w-52 rounded-xl border px-3 text-sm
                     bg-white/30 dark:bg-zinc-950/25 backdrop-blur-xl
                     border-zinc-300/60 dark:border-white/10
                     text-zinc-900 dark:text-zinc-100
                     focus:outline-none focus:ring-2 focus:ring-zinc-400/30 dark:focus:ring-zinc-500/30
                     disabled:opacity-50 disabled:cursor-not-allowed"
          value={target ?? ""}
          onChange={(e) => {
            const v = e.target.value;
            if (!v) {
              setTarget(null);
              setModelId("");
              return;
            }
            const next = v as TargetValue;
            setTarget(next);
            setModelId(defaultModelIdForTarget(next));
          }}
          disabled={locked}
        >
          <option value="" disabled>
            {providerPlaceholder}
          </option>
          {TARGETS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>

        <span className="text-sm opacity-70" aria-hidden>
          {modelHelperText}
        </span>

        <select
          aria-label={submodelLabel}
          className="h-10 w-44 sm:w-52 rounded-xl border px-3 text-sm
                     bg-white/30 dark:bg-zinc-950/25 backdrop-blur-xl
                     border-zinc-300/60 dark:border-white/10
                     text-zinc-900 dark:text-zinc-100
                     focus:outline-none focus:ring-2 focus:ring-zinc-400/30 dark:focus:ring-zinc-500/30
                     disabled:opacity-50 disabled:cursor-not-allowed"
          value={modelId}
          onChange={(e) => setModelId(e.target.value)}
          disabled={locked || !target}
        >
          <option value="" disabled>
            {target ? modelEnabledPlaceholder : modelDisabledPlaceholder}
          </option>
          {submodels.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      {/* Step 2: Choose prompt type */}
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

      {/* Step 3: Write/paste prompt */}
      <div className="relative">
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
      </div>

      {/* Counter + example helper */}
      <div className="flex flex-wrap items-center justify-between gap-2 -mt-2">
        <div className="text-xs opacity-55 tabular-nums" aria-live="polite" aria-atomic="true">
          {counterText}
        </div>
        {!locked && (
          <button
            type="button"
            onClick={loadExample}
            className="text-xs opacity-60 hover:opacity-100 underline underline-offset-2
                       focus:outline-none focus:ring-2 focus:ring-zinc-400/30 rounded transition-opacity"
          >
            {tryExampleLabel}
          </button>
        )}
      </div>

      {/* Step 4: Attach files */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs opacity-75">{uploadHint}</div>

        <div className="flex items-center gap-2 sm:justify-end">
          <input
            ref={fileInputRef}
            type="file"
            accept={ATTACHMENT_ACCEPT}
            multiple
            className="hidden"
            onChange={(e) => void handleFileSelection(e.target.files)}
            disabled={!attachmentsEnabled || locked}
          />

          <button
            type="button"
            className="btn btn-ghost h-9 px-3 disabled:opacity-45 disabled:cursor-not-allowed"
            disabled={!attachmentsEnabled || locked}
            onClick={() => fileInputRef.current?.click()}
            aria-disabled={!attachmentsEnabled || locked}
            title={uploadHint}
          >
            <UploadIcon className="h-4 w-4" />
            <span>{paperclipLabel(lang)}</span>
          </button>
        </div>
      </div>

      {attachments.length > 0 && (
        <div className="surface-soft p-3 space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-xs opacity-75">
            <span>
              {lang === "es"
                ? `${attachments.length}/${MAX_ATTACHMENTS} adjuntos · ${formatBytes(totalAttachmentBytes, lang)}`
                : `${attachments.length}/${MAX_ATTACHMENTS} attachments · ${formatBytes(totalAttachmentBytes, lang)}`}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {attachments.map((file) => (
              <div key={file.name} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs">
                <span className="truncate max-w-[220px]">{file.name}</span>
                <span className="opacity-60">{formatBytes(file.size, lang)}</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(file.name)}
                  className="opacity-75 hover:opacity-100"
                  aria-label={lang === "es" ? `Quitar ${file.name}` : `Remove ${file.name}`}
                  disabled={locked}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 5: Choose optimized output format */}
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-2 text-xs sm:text-sm opacity-80">
          <span>{formatLabel}</span>
          <FormatExplainModal lang={lang} />
        </div>
        <div
          role="radiogroup"
          aria-label={formatLabel}
          className="inline-flex items-center rounded-full border border-white/15 bg-white/20 dark:bg-zinc-950/25 backdrop-blur-md p-1"
        >
          <button
            type="button"
            role="radio"
            aria-checked={format === "checklist"}
            disabled={locked}
            onClick={() => setFormat("checklist")}
            className={[
              "h-8 rounded-full px-3 text-xs font-medium transition",
              format === "checklist"
                ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-900 font-semibold"
                : "opacity-70 hover:opacity-100",
            ].join(" ")}
          >
            {checklistLabel}
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={format === "json"}
            disabled={locked}
            onClick={() => setFormat("json")}
            className={[
              "h-8 rounded-full px-3 text-xs font-medium transition",
              format === "json"
                ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-900 font-semibold"
                : "opacity-70 hover:opacity-100",
            ].join(" ")}
          >
            {jsonLabel}
          </button>
        </div>
      </div>

      {/* How this works — discoverable for new users */}
      <div className="flex items-center justify-center gap-3">
        <HowItWorks lang={lang} />
      </div>

      {/* Step 6: Analyze */}
      <div className="flex justify-center">
        <button
          onClick={analyze}
          disabled={!canAnalyze || locked}
          className={[
            "btn h-10 w-full sm:w-55 transition-all",
            canAnalyze && !locked
              ? "bg-zinc-900 text-white border-zinc-900 hover:bg-transparent hover:text-zinc-900 hover:border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100 dark:hover:bg-transparent dark:hover:text-zinc-100 dark:hover:border-zinc-100"
              : "opacity-35 cursor-not-allowed bg-zinc-900/50 text-white border-zinc-900/50 dark:bg-zinc-100/50 dark:text-zinc-900 dark:border-zinc-100/50",
          ].join(" ")}
          aria-disabled={!canAnalyze || locked}
        >
          {isPending || isReadingFiles ? dict.app.analyzing : dict.app.analyze}
        </button>
      </div>

      {error && <div className="surface-soft p-3 text-sm">{error}</div>}

      <ResultsPanel dict={dict} lang={lang} result={result} isLoading={isPending} onReset={resetAll} />
    </div>
  );
}
