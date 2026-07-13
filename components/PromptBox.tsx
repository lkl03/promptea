"use client";

// Analyzer orchestrator (v1.2.0).
//
// Owns form state, persistence, and the analyze request lifecycle; all
// presentation lives in components/analyzer/*. Requests are supersede-safe
// (in-flight fetch aborted on re-submit or reset) and the prompt text is
// always preserved through recoverable errors.

import { useEffect, useMemo, useRef, useState } from "react";
import ResultsPanel from "./ResultsPanel";
import HowItWorks from "./HowItWorks";
import { useToast } from "./ToastProvider";
import { getSessionId } from "@/lib/telemetry/session";
import { isPurposeAttachmentEnabled, type AttachmentInput } from "@/lib/attachments";
import { defaultModelIdForTarget, getModelsForTarget } from "@/lib/models";
import type { FormatChoice, PromptPurpose, TargetAI } from "@/lib/domain";
import type { AnalyzeResponse } from "@/lib/analyzeClient";
import TargetPicker from "./analyzer/TargetPicker";
import PurposePicker from "./analyzer/PurposePicker";
import PromptEditor from "./analyzer/PromptEditor";
import AttachmentsPanel from "./analyzer/AttachmentsPanel";
import FormatPicker from "./analyzer/FormatPicker";

import type { UiDict } from "@/lib/uiDict";

type Dict = UiDict;

/** Example prompt for each locale used by the "Try an example" helper */
const EXAMPLE_PROMPT: Record<"es" | "en", { prompt: string; purpose: PromptPurpose; target: TargetAI }> = {
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

/** sessionStorage key for persisting analyzer form state across navigation */
const SESSION_KEY = "promptea:form-state";

type SavedState = {
  prompt?: string;
  purpose?: PromptPurpose;
  target?: TargetAI;
  format?: FormatChoice;
};

function readSessionState(): SavedState {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as SavedState) : {};
  } catch {
    return {};
  }
}

function writeSessionState(state: {
  prompt: string;
  purpose: PromptPurpose | null;
  target: TargetAI | null;
  format: FormatChoice;
}) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
  } catch {
    // quota exceeded or private mode — ignore
  }
}

const GOOGLE_SEND_TO = process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_SEND_TO;
const GOOGLE_VALUE = Number(process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_VALUE ?? "1.0");
const GOOGLE_CURRENCY = process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_CURRENCY ?? "ARS";

function trackGoogleAnalyzeSuccess() {
  if (!GOOGLE_SEND_TO) return;
  try {
    const gtag = (window as { gtag?: (...args: unknown[]) => void }).gtag;
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

/** Cycles through friendly processing-state messages while analyzing. */
function AnalyzingSteps({ steps }: { steps: string[] }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((i) => Math.min(i + 1, steps.length - 1));
    }, 900);
    return () => window.clearInterval(id);
  }, [steps.length]);
  return (
    <span aria-live="polite" className="inline-flex items-center gap-2">
      <span className="progress-sweep inline-block h-1 w-10 rounded-full bg-surface-soft" aria-hidden />
      {steps[index]}
    </span>
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
  initialTarget?: TargetAI;
}) {
  const [prompt, setPrompt] = useState("");
  const [target, setTarget] = useState<TargetAI | null>(null);
  const [modelId, setModelId] = useState<string>("");
  const [purpose, setPurpose] = useState<PromptPurpose | null>(null);
  const [attachments, setAttachments] = useState<AttachmentInput[]>([]);
  const [format, setFormat] = useState<FormatChoice>("checklist");

  const toast = useToast();

  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const lockedRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  const locked = !!result || isPending;

  useEffect(() => {
    lockedRef.current = locked;
  }, [locked]);

  // Broadcast locked-state changes so sibling components (e.g. PromptOfTheDay)
  // can disable their CTA buttons without prop-drilling.
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent("promptea:locked-change", { detail: { locked } }));
  }, [locked]);

  const canAnalyze = useMemo(
    () => prompt.trim().length > 0 && !!purpose && !!target,
    [prompt, purpose, target]
  );
  const attachmentsEnabled = isPurposeAttachmentEnabled(purpose);

  const didInitRef = useRef(false);
  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;

    // URL params take priority over sessionStorage
    if (typeof initialPrompt === "string" && initialPrompt.trim().length > 0) {
      if (initialTarget) {
        setTarget(initialTarget);
        setModelId(defaultModelIdForTarget(initialTarget));
      }
      if (initialPurpose) setPurpose(initialPurpose);
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

    if (initialTarget) {
      setTarget(initialTarget);
      setModelId(defaultModelIdForTarget(initialTarget));
    }
    if (initialPurpose) setPurpose(initialPurpose);
  }, [initialPrompt, initialPurpose, initialTarget]);

  // Persist form state on every change (except while locked)
  useEffect(() => {
    if (locked) return;
    writeSessionState({ prompt, purpose, target, format });
  }, [prompt, purpose, target, format, locked]);

  // Keep modelId valid for the chosen target
  useEffect(() => {
    if (!target) {
      if (modelId !== "") setModelId("");
      return;
    }
    const models = getModelsForTarget(target);
    if (!models.some((m) => m.id === modelId)) {
      setModelId(defaultModelIdForTarget(target));
    }
  }, [target, modelId]);

  // Listen for external "load this prompt" requests (e.g. Prompt of the Day).
  useEffect(() => {
    type Detail = { prompt?: string; target?: TargetAI; purpose?: PromptPurpose };
    function handler(event: Event) {
      if (lockedRef.current) return;
      const detail = (event as CustomEvent<Detail>).detail ?? {};
      setResult(null);
      setError(null);

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

      try {
        toast.show(dict.analyzer.promptLoaded, "success");
      } catch {
        // ignore
      }
    }

    window.addEventListener("promptea:set-prompt", handler);
    return () => window.removeEventListener("promptea:set-prompt", handler);
  }, [dict.analyzer.promptLoaded, toast]);

  // Telemetry session ping
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

  // Drop attachments when the purpose no longer supports them
  useEffect(() => {
    if (purpose && !isPurposeAttachmentEnabled(purpose) && attachments.length > 0) {
      setAttachments([]);
    }
  }, [purpose, attachments.length]);

  // Abort any in-flight request on unmount
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  function resetAll() {
    abortRef.current?.abort();
    setPrompt("");
    setPurpose(null);
    setTarget(null);
    setModelId("");
    setAttachments([]);
    setResult(null);
    setError(null);
    setFormat("checklist");
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      // ignore
    }
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  async function analyze() {
    if (!canAnalyze || isPending || result || !target) return;
    setError(null);
    setIsPending(true);

    // Supersede any previous request.
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

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
        signal: controller.signal,
      });

      const data = (await res.json()) as AnalyzeResponse & { error?: string };
      if (!res.ok) throw new Error(data?.error ?? dict.analyzer.genericError);

      setResult(data);
      trackGoogleAnalyzeSuccess();
    } catch (e) {
      if (controller.signal.aborted) return; // superseded or reset — keep quiet
      setError(e instanceof Error ? e.message : dict.analyzer.genericError);
    } finally {
      if (abortRef.current === controller) setIsPending(false);
    }
  }

  function loadExample() {
    if (locked) return;
    const ex = EXAMPLE_PROMPT[lang];
    if (prompt.trim().length > 0) {
      if (!window.confirm(dict.analyzer.confirmReplaceExample)) return;
    }
    setPrompt(ex.prompt);
    setPurpose(ex.purpose);
    setTarget(ex.target);
    setModelId(defaultModelIdForTarget(ex.target));
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 2xl:max-w-6xl">
      <TargetPicker
        dict={dict.analyzer}
        targetModelLabel={dict.app.targetModel}
        writingForLabel={dict.app.writingFor}
        lang={lang}
        target={target}
        modelId={modelId}
        disabled={locked}
        onTargetChange={(next, nextModelId) => {
          setTarget(next);
          setModelId(nextModelId);
        }}
        onModelChange={setModelId}
      />

      <PurposePicker
        label={dict.analyzer.purposeLabel}
        lang={lang}
        purpose={purpose}
        disabled={locked}
        onChange={setPurpose}
      />

      <PromptEditor
        ref={textareaRef}
        dict={dict.analyzer}
        placeholder={dict.app.placeholder}
        value={prompt}
        disabled={locked}
        onChange={setPrompt}
        onSubmit={analyze}
        onTryExample={loadExample}
      />

      <AttachmentsPanel
        dict={dict.analyzer}
        hasPurpose={!!purpose}
        attachmentsEnabled={attachmentsEnabled}
        attachments={attachments}
        disabled={locked}
        onChange={setAttachments}
        onError={setError}
      />

      <FormatPicker
        label={dict.analyzer.formatLabel}
        checklistLabel={dict.analyzer.formatChecklist}
        jsonLabel={dict.analyzer.formatJson}
        lang={lang}
        value={format}
        disabled={locked}
        onChange={setFormat}
      />

      <div className="flex items-center justify-center gap-3">
        <HowItWorks lang={lang} />
      </div>

      <div className="flex justify-center">
        <button
          onClick={analyze}
          disabled={!canAnalyze || locked}
          className={[
            "btn h-11 w-full sm:w-64 text-[15px]",
            canAnalyze && !locked ? "btn-primary" : "btn-primary opacity-35 cursor-not-allowed",
          ].join(" ")}
          aria-disabled={!canAnalyze || locked}
        >
          {isPending ? <AnalyzingSteps steps={dict.analyzer.analyzingSteps} /> : dict.app.analyze}
        </button>
      </div>

      {error && (
        <div role="alert" className="surface-soft border-danger/40 p-3 text-sm text-danger">
          {error}
        </div>
      )}

      <ResultsPanel
        dict={dict}
        lang={lang}
        result={result}
        originalPrompt={prompt}
        isLoading={isPending}
        onReset={resetAll}
      />
    </div>
  );
}
