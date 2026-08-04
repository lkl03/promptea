"use client";

// components/matcher/MatcherBox.tsx
//
// "Find the Best AI" orchestrator. Shares the prompt with the Improve mode
// through the same sessionStorage form-state (no duplicated prompt state),
// and hands off to the optimizer via the promptea:handoff contract:
// sessionStorage payload + /?handoff=1 navigation — no fragile global event.

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import PromptEditor from "@/components/analyzer/PromptEditor";
import VoiceRecorderButton from "@/components/voice/VoiceRecorderButton";
import MatcherResults from "./MatcherResults";
import { getSessionId } from "@/lib/telemetry/session";
import { trackAppEvent } from "@/lib/telemetry/appEvents.client";
import { HANDOFF_KEY, purposeForCategory, type HandoffPayload } from "@/lib/matcher/handoff";
import type { MatchResult } from "@/lib/matcher/types";
import type { UiDict } from "@/lib/uiDict";

const FORM_STATE_KEY = "promptea:form-state";

function readSharedPrompt(): string {
  try {
    const raw = sessionStorage.getItem(FORM_STATE_KEY);
    if (!raw) return "";
    const parsed = JSON.parse(raw) as { prompt?: string };
    return typeof parsed.prompt === "string" ? parsed.prompt : "";
  } catch {
    return "";
  }
}

function writeSharedPrompt(prompt: string) {
  try {
    const raw = sessionStorage.getItem(FORM_STATE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    sessionStorage.setItem(FORM_STATE_KEY, JSON.stringify({ ...parsed, prompt }));
  } catch {
    // private mode — ignore
  }
}

export default function MatcherBox({ dict, lang }: { dict: UiDict; lang: "es" | "en" }) {
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState<MatchResult | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const router = useRouter();

  // Mode opened + shared prompt restore (switching modes never loses text).
  const didInitRef = useRef(false);
  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;
    const shared = readSharedPrompt();
    if (shared.trim().length > 0) setPrompt(shared);
    trackAppEvent({ event: "mode_opened", lang, mode: "best-ai" });
  }, [lang]);

  // Persist the prompt into the SHARED form state so mode switches keep it.
  useEffect(() => {
    if (!didInitRef.current) return;
    writeSharedPrompt(prompt);
  }, [prompt]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const canSubmit = useMemo(() => prompt.trim().length > 0, [prompt]);

  async function submit() {
    if (isPending) return;
    if (!canSubmit) {
      setError(dict.matcher.emptyPrompt);
      return;
    }
    setError(null);
    setIsPending(true);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "content-type": "application/json", "x-ui-lang": lang },
        body: JSON.stringify({ prompt, lang, sessionId: getSessionId() }),
        signal: controller.signal,
      });
      const data = (await res.json()) as MatchResult & { error?: string };
      if (!res.ok) throw new Error(data?.error ?? dict.matcher.genericError);
      setResult(data);
      requestAnimationFrame(() => {
        document.getElementById("matcher-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch (e) {
      if (controller.signal.aborted) return;
      setError(e instanceof Error ? e.message : dict.matcher.genericError);
    } finally {
      if (abortRef.current === controller) setIsPending(false);
    }
  }

  function handleImprove() {
    if (!result) return;
    const payload: HandoffPayload = {
      prompt,
      target: result.primary.target,
      modelId: result.primary.modelId,
      purpose: purposeForCategory(result.detected.categories[0]?.category),
    };
    try {
      sessionStorage.setItem(HANDOFF_KEY, JSON.stringify(payload));
    } catch {
      // sessionStorage unavailable: fall back to URL prefill (short prompts).
      const params = new URLSearchParams({
        prompt: payload.prompt.slice(0, 4000),
        target: payload.target,
        purpose: payload.purpose,
        model: payload.modelId,
      });
      trackAppEvent({ event: "matcher_handoff", lang, mode: "best-ai" });
      router.push(`/${lang}/?${params.toString()}`);
      return;
    }
    trackAppEvent({ event: "matcher_handoff", lang, mode: "best-ai" });
    router.push(`/${lang}/?handoff=1`);
  }

  function editPrompt() {
    setResult(null);
    setError(null);
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <PromptEditor
        ref={textareaRef}
        dict={{ ...dict.analyzer, editorLabel: dict.matcher.editorLabel }}
        placeholder={dict.app.placeholder}
        value={prompt}
        disabled={isPending || !!result}
        onChange={setPrompt}
        onSubmit={submit}
      />

      {!result && (
        <VoiceRecorderButton
          lang={lang}
          dict={dict.voice}
          disabled={isPending}
          hasExistingText={prompt.trim().length > 0}
          onInsert={(text) => {
            setPrompt(text);
            requestAnimationFrame(() => textareaRef.current?.focus());
          }}
          onAppend={(text) => {
            setPrompt((prev) => (prev.trim().length > 0 ? `${prev.trimEnd()}\n\n${text}` : text));
            requestAnimationFrame(() => textareaRef.current?.focus());
          }}
        />
      )}

      <div className="flex justify-center gap-3">
        {!result ? (
          <button
            onClick={submit}
            disabled={!canSubmit || isPending}
            className={[
              "btn h-11 w-full sm:w-64 text-[15px]",
              canSubmit && !isPending ? "btn-primary" : "btn-primary opacity-35 cursor-not-allowed",
            ].join(" ")}
            aria-disabled={!canSubmit || isPending}
          >
            {isPending ? dict.matcher.analyzing : dict.matcher.submitCta}
          </button>
        ) : (
          <button onClick={editPrompt} className="btn btn-ghost h-10">
            {dict.results.newPrompt}
          </button>
        )}
      </div>

      {error && (
        <div role="alert" className="surface-soft border-danger/40 p-3 text-sm text-danger">
          {error}
        </div>
      )}

      <div id="matcher-results">
        {result && <MatcherResults result={result} dict={dict.matcher} onImprove={handleImprove} />}
      </div>
    </div>
  );
}
