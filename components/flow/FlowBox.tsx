"use client";

// components/flow/FlowBox.tsx
//
// v1.8.9 — Prompt flow: the main-task editor, the call to /api/flow and the
// tree. The task is shared with the other modes through the same
// sessionStorage form state (switching modes never loses text), and the last
// flow is kept in sessionStorage so "Improve in the analyzer" and back does not
// lose it. Nothing is sent before the visitor presses the button.

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import PromptEditor from "@/components/analyzer/PromptEditor";
import FlowTree from "./FlowTree";
import { trackAppEvent } from "@/lib/telemetry/appEvents.client";
import { trackProductEvent } from "@/lib/analytics/productEvents";
import { HANDOFF_KEY, type HandoffPayload } from "@/lib/matcher/handoff";
import { flowToMarkdown } from "@/lib/flow/markdown";
import { FLOW_LIMITS, type FlowPlan, type FlowStep } from "@/lib/flow/types";
import type { FlowDict, UiDict } from "@/lib/uiDict";
import type { Lang } from "@/lib/domain";

const FORM_STATE_KEY = "promptea:form-state";
const FLOW_STATE_KEY = "promptea:flow-state";

type Saved = { plan: FlowPlan; done: number[] };

function readJson<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeSharedPrompt(prompt: string) {
  try {
    const parsed = readJson<Record<string, unknown>>(FORM_STATE_KEY) ?? {};
    sessionStorage.setItem(FORM_STATE_KEY, JSON.stringify({ ...parsed, prompt }));
  } catch {
    // private mode — ignore
  }
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function PlanningSkeleton({ dict, task }: { dict: FlowDict; task: string }) {
  return (
    <div className="flow-tree" aria-busy="true">
      <div className="flow-root surface mx-auto max-w-3xl p-4 sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">{dict.rootLabel}</p>
        <p className="mt-3 line-clamp-3 whitespace-pre-wrap break-words font-title text-lg font-semibold leading-snug">{task}</p>
        <p className="mt-2 text-sm text-ink-muted" role="status">
          {dict.planning}
        </p>
      </div>
      <ol className="flow-levels" aria-hidden="true">
        <li className="flow-level">
          <ul className="flow-row" style={{ ["--flow-cols" as string]: 1 }}>
            <li className="flow-node-wrap">
              <div className="surface-soft h-28 motion-safe:animate-pulse" />
            </li>
          </ul>
        </li>
        <li className="flow-level">
          <ul className="flow-row" data-parallel="true" style={{ ["--flow-cols" as string]: 2 }}>
            <li className="flow-node-wrap">
              <div className="surface-soft h-28 motion-safe:animate-pulse" />
            </li>
            <li className="flow-node-wrap">
              <div className="surface-soft h-28 motion-safe:animate-pulse" />
            </li>
          </ul>
        </li>
      </ol>
    </div>
  );
}

export default function FlowBox({ dict, lang }: { dict: UiDict & { flow: FlowDict }; lang: Lang }) {
  const t = dict.flow;
  const [task, setTask] = useState("");
  const [plan, setPlan] = useState<FlowPlan | null>(null);
  const [done, setDone] = useState<Set<number>>(new Set());
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const router = useRouter();

  // Restore the last flow (same tab) or the shared prompt, once, after hydration.
  const didInitRef = useRef(false);
  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;
    const saved = readJson<Saved>(FLOW_STATE_KEY);
    const shared = readJson<{ prompt?: string }>(FORM_STATE_KEY)?.prompt;
    /* eslint-disable react-hooks/set-state-in-effect -- one-time restore from sessionStorage, not readable during SSR. */
    if (saved?.plan && saved.plan.lang === lang && Array.isArray(saved.plan.steps)) {
      setPlan(saved.plan);
      setTask(saved.plan.task);
      setDone(new Set(saved.done ?? []));
    } else if (typeof shared === "string" && shared.trim().length > 0) {
      setTask(shared);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
    trackAppEvent({ event: "mode_opened", lang, mode: "flow" });
  }, [lang]);

  useEffect(() => {
    if (!didInitRef.current) return;
    writeSharedPrompt(task);
  }, [task]);

  useEffect(() => {
    if (!didInitRef.current) return;
    try {
      if (plan) sessionStorage.setItem(FLOW_STATE_KEY, JSON.stringify({ plan, done: [...done] } satisfies Saved));
      else sessionStorage.removeItem(FLOW_STATE_KEY);
    } catch {
      // private mode — ignore
    }
  }, [plan, done]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const canSubmit = useMemo(() => task.trim().length > 0, [task]);

  async function submit() {
    if (isPending) return;
    if (task.trim().length < FLOW_LIMITS.minTaskChars) {
      setError(t.tooShort);
      return;
    }
    setError(null);
    setIsPending(true);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/flow", {
        method: "POST",
        headers: { "content-type": "application/json", "x-ui-lang": lang },
        body: JSON.stringify({ task: task.slice(0, FLOW_LIMITS.maxTaskChars), lang }),
        signal: controller.signal,
      });
      if (res.status === 429) {
        setError(t.rateLimited);
        return;
      }
      const data = (await res.json().catch(() => null)) as FlowPlan | null;
      if (!res.ok || !data || !Array.isArray(data.steps) || data.steps.length === 0) {
        setError(t.genericError);
        return;
      }
      setDone(new Set());
      setPlan(data);
      trackProductEvent({ name: "Flow Created", lang, source: data.source });
      requestAnimationFrame(() => {
        document.getElementById("flow-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch {
      if (controller.signal.aborted) return;
      setError(t.genericError);
    } finally {
      if (abortRef.current === controller) setIsPending(false);
    }
  }

  function toggleDone(id: number) {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function copyStep(step: FlowStep) {
    const ok = await copyText(step.prompt);
    if (ok) trackProductEvent({ name: "Template Copied", lang, source: "flow" });
    return ok;
  }

  async function copyAll() {
    if (!plan) return false;
    return copyText(flowToMarkdown(plan, t));
  }

  function improveStep(step: FlowStep) {
    const payload: HandoffPayload = {
      prompt: step.prompt,
      target: step.route.target,
      modelId: step.route.modelId,
      purpose: step.route.purpose,
    };
    try {
      sessionStorage.setItem(HANDOFF_KEY, JSON.stringify(payload));
      router.push(`/${lang}/analyzer?handoff=1`);
    } catch {
      const params = new URLSearchParams({ prompt: payload.prompt.slice(0, 4000), target: payload.target, purpose: payload.purpose, model: payload.modelId });
      router.push(`/${lang}/analyzer?${params.toString()}`);
    }
  }

  function editTask() {
    setPlan(null);
    setError(null);
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  function newTask() {
    setPlan(null);
    setTask("");
    setError(null);
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  return (
    <div className="mx-auto w-full space-y-5">
      {!plan && !isPending ? (
        <div className="mx-auto w-full max-w-3xl space-y-4">
          <PromptEditor
            ref={textareaRef}
            dict={{ ...dict.analyzer, editorLabel: t.editorLabel }}
            placeholder={t.placeholder}
            value={task}
            disabled={isPending}
            onChange={setTask}
            onSubmit={submit}
          />

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-ink-faint">{t.examplesLabel}</span>
            {t.examples.map((example) => (
              <button
                key={example}
                type="button"
                className="pill h-auto min-h-8 py-1 text-left"
                onClick={() => {
                  setTask(example);
                  setError(null);
                  requestAnimationFrame(() => textareaRef.current?.focus());
                }}
              >
                {example}
              </button>
            ))}
          </div>

          <div className="flex justify-center">
            <button
              type="button"
              onClick={submit}
              disabled={!canSubmit}
              aria-disabled={!canSubmit}
              className={["btn h-11 w-full text-[15px] sm:w-64", canSubmit ? "btn-primary" : "btn-primary cursor-not-allowed opacity-35"].join(" ")}
            >
              {t.submitCta}
            </button>
          </div>
        </div>
      ) : null}

      {error ? (
        <div role="alert" className="surface-soft mx-auto max-w-3xl border-danger/40 p-3 text-sm text-danger">
          {error}
        </div>
      ) : null}

      <div id="flow-results" className="scroll-mt-24">
        {isPending ? <PlanningSkeleton dict={t} task={task} /> : null}

        {plan && !isPending ? (
          <div className="space-y-4">
            {plan.source === "basic" && plan.notice ? (
              <div role="status" className="surface-soft mx-auto max-w-3xl border-warning/40 p-3 text-sm leading-relaxed text-ink-muted">
                {t.notices[plan.notice]}
              </div>
            ) : null}
            <FlowTree
              plan={plan}
              dict={t}
              lang={lang}
              done={done}
              onToggleDone={toggleDone}
              onCopyStep={copyStep}
              onImproveStep={improveStep}
              onCopyAll={copyAll}
              onEditTask={editTask}
              onNewTask={newTask}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
